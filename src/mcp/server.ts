import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { composePage, pageSpecSchema } from "../composer.js";
import { generatePage, recommendStructure } from "../generator.js";
import { getIntegrationRecipe, validateProjectUswdsSetup } from "../integration.js";
import { applyAssetPath, DEFAULT_ASSET_PATH, findSnippets, listMarkupComponents, resolveComponentName } from "../markup.js";
import { findClasses, searchRecords } from "../search.js";
import { getRecord, getResourceRecord, loadClassIndex, loadIndex, loadMarkup } from "../store.js";
import { UswdsRecordType } from "../types.js";
import { summarizeValidation, validateUswdsMarkup } from "../validator.js";
import { version } from "../version.js";

const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

const recordTypeSchema = z.enum([
  "component",
  "pattern",
  "template",
  "utility",
  "token",
  "setting",
  "package",
  "accessibility_test",
  "implementation_reference",
]);

function jsonResult(value: unknown) {
  const text = JSON.stringify(value, null, 2);
  const structuredContent =
    value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : { value };
  return {
    content: [{ type: "text" as const, text }],
    structuredContent,
  };
}

function firstParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

async function requireIndexedRecords() {
  const bundle = await loadIndex();
  if (bundle.records.length === 0) {
    return {
      error: "USWDS index is empty. Run `npm run ingest` before using documentation-backed MCP tools.",
      manifest: bundle.manifest,
    };
  }
  return undefined;
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "uswds-mcp",
    version,
  });

  server.registerTool(
    "search_uswds",
    {
      title: "Search USWDS",
      annotations: readOnly,
      description: "Search structured USWDS docs and implementation records.",
      inputSchema: {
        query: z.string().min(1),
        types: z.array(recordTypeSchema).optional(),
        limit: z.number().int().min(1).max(25).optional(),
      },
    },
    async ({ query, types, limit }) => {
      const { records, manifest } = await loadIndex();
      const results = searchRecords(records, query, { types: types as UswdsRecordType[] | undefined, limit }).map(
        ({ record, score, matchedSections }) => ({
          id: record.id,
          type: record.type,
          slug: record.slug,
          title: record.title,
          summary: record.summary,
          score,
          matchedSections,
          docUrl: record.docUrl,
          sourceUrl: record.sourceUrl,
        })
      );
      return jsonResult({ results, manifest });
    }
  );

  server.registerTool(
    "get_component",
    {
      title: "Get USWDS Component",
      description:
        "Return component guidance (usage, accessibility, variants) plus the official canonical HTML for the default variant. Call this before writing any component markup.",
      annotations: readOnly,
      inputSchema: { slug_or_name: z.string().min(1) },
    },
    async ({ slug_or_name }) => {
      const empty = await requireIndexedRecords();
      if (empty) return jsonResult(empty);
      const record = await getRecord("component", slug_or_name);
      if (!record) return jsonResult({ error: `Component not found: ${slug_or_name}` });
      const snippets = findSnippets(await loadMarkup(), record.slug);
      const defaultSnippet = snippets.find((snippet) => snippet.variant === "default") ?? snippets[0];
      return jsonResult({
        ...record,
        canonicalMarkup: defaultSnippet
          ? {
              note: "Official USWDS markup. Copy this structure; do not invent class names. Call get_component_markup for other variants.",
              variant: defaultSnippet.variant,
              html: applyAssetPath(defaultSnippet.html),
              requiresJavascript: defaultSnippet.requiresJavascript,
              availableVariants: snippets.map((snippet) => snippet.variant),
            }
          : { note: "No canonical markup indexed for this component; see docUrl." },
      });
    }
  );

  server.registerTool(
    "get_pattern",
    {
      title: "Get USWDS Pattern",
      annotations: readOnly,
      description: "Return structured pattern guidance and related implementation notes.",
      inputSchema: { slug_or_name: z.string().min(1) },
    },
    async ({ slug_or_name }) => {
      const empty = await requireIndexedRecords();
      if (empty) return jsonResult(empty);
      const record = await getRecord("pattern", slug_or_name);
      return jsonResult(record ?? { error: `Pattern not found: ${slug_or_name}` });
    }
  );

  server.registerTool(
    "get_template",
    {
      title: "Get USWDS Template",
      annotations: readOnly,
      description: "Return structured template guidance and markup references.",
      inputSchema: { slug_or_name: z.string().min(1) },
    },
    async ({ slug_or_name }) => {
      const empty = await requireIndexedRecords();
      if (empty) return jsonResult(empty);
      const record = await getRecord("template", slug_or_name);
      return jsonResult(record ?? { error: `Template not found: ${slug_or_name}` });
    }
  );

  server.registerTool(
    "recommend_uswds_structure",
    {
      title: "Recommend USWDS Structure",
      annotations: readOnly,
      description: "Recommend a USWDS-first page or site structure for an agency service.",
      inputSchema: {
        agency_type: z.string().min(1),
        service_goal: z.string().min(1),
        audience: z.string().min(1),
        framework: z.string().optional(),
        constraints: z.string().optional(),
      },
    },
    async (input) => jsonResult(recommendStructure(input))
  );

  server.registerTool(
    "generate_uswds_page",
    {
      title: "Generate USWDS Page",
      description:
        "Quick starting point: infer sections from free-text requirements and generate a validated USWDS page with [bracketed] placeholders. For real content prefer compose_uswds_page.",
      annotations: readOnly,
      inputSchema: {
        page_type: z.string().min(1),
        agency_context: z.string().min(1),
        content_requirements: z.string().min(1),
        framework: z.string().optional(),
        asset_path: z.string().optional().describe(`URL prefix where USWDS dist assets are served (default ${DEFAULT_ASSET_PATH})`),
      },
    },
    async ({ asset_path, ...input }) => {
      const { set } = await loadClassIndex();
      return jsonResult(generatePage(input, { knownClasses: set, assetPath: asset_path }));
    }
  );

  server.registerTool(
    "validate_uswds_markup",
    {
      title: "Validate USWDS Markup",
      description:
        "Validate HTML against real USWDS class names, component structure (BEM, required children, ARIA wiring), forms, and accessibility basics. Fragment-aware. Fix every error before finalizing.",
      annotations: readOnly,
      inputSchema: {
        html: z.string().min(1),
        page_context: z.string().optional(),
        mode: z.enum(["auto", "document", "fragment"]).optional().describe("auto detects full pages vs fragments"),
      },
    },
    async ({ html, page_context, mode }) => {
      const { set } = await loadClassIndex();
      const findings = validateUswdsMarkup(html, { knownClasses: set, mode });
      const components = [...new Set(findings.map((finding) => finding.component).filter(Boolean))] as string[];
      return jsonResult({
        summary: summarizeValidation(findings),
        pageContext: page_context,
        passed: !findings.some((finding) => finding.severity === "error"),
        findings,
        howToFix: components.length
          ? `Call get_component_markup for: ${components.join(", ")} to see the canonical structure.`
          : undefined,
      });
    }
  );

  server.registerTool(
    "get_component_markup",
    {
      title: "Get Canonical USWDS Markup",
      description:
        "Return the official, verified USWDS HTML for a component or page template (rendered from the official @uswds/uswds templates). Use this instead of writing usa-* markup from memory. Call with no arguments to list everything available.",
      annotations: readOnly,
      inputSchema: {
        component: z.string().optional().describe("Component or page-template name, e.g. accordion, button, footer, sign-in"),
        variant: z.string().optional().describe("Variant such as bordered, slim, big, outline, error"),
        all_variants: z.boolean().optional(),
        asset_path: z.string().optional().describe(`URL prefix where USWDS dist assets are served (default ${DEFAULT_ASSET_PATH})`),
      },
    },
    async ({ component, variant, all_variants, asset_path }) => {
      const snippets = await loadMarkup();
      if (!component) {
        return jsonResult({
          note: "Pass `component` to get HTML.",
          components: listMarkupComponents(snippets),
        });
      }
      const matches = findSnippets(snippets, component, variant);
      if (matches.length === 0) {
        const resolved = resolveComponentName(component);
        const available = listMarkupComponents(snippets).map((entry) => entry.component);
        const near = available.filter((name) => name.includes(resolved) || resolved.includes(name)).slice(0, 8);
        return jsonResult({
          error: `No canonical markup for "${component}"${variant ? ` (variant "${variant}")` : ""}.`,
          didYouMean: near,
          available,
        });
      }
      const chosen = all_variants ? matches.slice(0, 12) : [matches.find((snippet) => snippet.variant === "default") ?? matches[0]];
      return jsonResult({
        component: chosen[0].component,
        kind: chosen[0].kind,
        snippets: chosen.map((snippet) => ({
          variant: snippet.variant,
          html: applyAssetPath(snippet.html, asset_path),
          classes: snippet.classes,
          requiresJavascript: snippet.requiresJavascript,
          origin: snippet.origin ?? "uswds",
          sourcePath: snippet.sourcePath,
        })),
        availableVariants: matches.map((snippet) => snippet.variant),
        usage: [
          "Keep the DOM structure, class names, ids/ARIA wiring and attribute values; replace only the text content, hrefs and ids that must be unique.",
          "Components with requiresJavascript need uswds-init.min.js in <head> and uswds.min.js before </body>.",
          "Text in &lt;angle brackets&gt; is placeholder content from the official fixtures.",
        ],
      });
    }
  );

  server.registerTool(
    "compose_uswds_page",
    {
      title: "Compose USWDS Page",
      description:
        "Build a complete, accessible USWDS page from structured sections (hero, content, alert, summary_box, card_group, process_list, step_indicator, accordion, table, form, contact). Output mirrors official markup and is validated automatically.",
      annotations: readOnly,
      inputSchema: pageSpecSchema.shape,
    },
    async (input) => {
      const composed = composePage(input);
      const { set } = await loadClassIndex();
      const findings = validateUswdsMarkup(composed.html, { knownClasses: set });
      return jsonResult({
        html: composed.html,
        placeholders: composed.placeholders,
        assetPath: composed.assetPath,
        validation: { summary: summarizeValidation(findings), findings },
      });
    }
  );

  server.registerTool(
    "find_uswds_classes",
    {
      title: "Find USWDS Classes",
      description:
        "Look up real USWDS class names, including utilities and responsive variants (e.g. \"margin top 2\", \"tablet grid col 6\", \"bg primary lighter\"). Prevents invented class names.",
      annotations: readOnly,
      inputSchema: { query: z.string().min(1), limit: z.number().int().min(1).max(100).optional() },
    },
    async ({ query, limit }) => {
      const { index, set } = await loadClassIndex();
      const classes = findClasses(set, query, limit ?? 25);
      return jsonResult({ query, uswdsVersion: index.uswdsVersion, classes, exists: set.has(query.trim()) });
    }
  );

  server.registerTool(
    "get_uswds_integration_recipe",
    {
      title: "Get USWDS Integration Recipe",
      annotations: readOnly,
      description: "Return framework-specific USWDS setup guidance for npm, assets, JavaScript, CSS, and migration.",
      inputSchema: {
        framework: z.string().min(1),
        no_cdn: z.boolean().optional(),
        migration_scope: z.enum(["new-project", "single-page", "full-site"]).optional(),
      },
    },
    async (input) => jsonResult(getIntegrationRecipe(input))
  );

  server.registerTool(
    "validate_uswds_project_setup",
    {
      title: "Validate USWDS Project Setup",
      annotations: readOnly,
      description:
        "Check provided project files for common USWDS framework integration issues such as import paths, assets, scripts, CDN usage, and global CSS risk.",
      inputSchema: {
        framework: z.string().optional(),
        package_json: z.string().optional(),
        files: z.record(z.string()).optional(),
        file_paths: z.array(z.string()).optional(),
        no_cdn: z.boolean().optional(),
        migration_scope: z.enum(["new-project", "single-page", "full-site"]).optional(),
      },
    },
    async (input) => {
      const findings = validateProjectUswdsSetup(input);
      return jsonResult({
        summary: summarizeValidation(findings),
        findings,
      });
    }
  );

  for (const [kind, title] of [
    ["component", "USWDS Component"],
    ["pattern", "USWDS Pattern"],
    ["template", "USWDS Template"],
    ["token", "USWDS Token"],
    ["package", "USWDS Package"],
  ] as const) {
    server.registerResource(
      `uswds-${kind}`,
      new ResourceTemplate(`uswds://${kind}/{slug}`, {
        list: async () => {
          const { records } = await loadIndex();
          return {
            resources: records
              .filter((record) => record.type === kind)
              .slice(0, 200)
              .map((record) => ({
                uri: `uswds://${kind}/${record.slug}`,
                name: record.title,
                description: record.summary,
                mimeType: "application/json",
              })),
          };
        },
      }),
      {
        title,
        description: `Read a structured ${kind} record from the local USWDS index.`,
        mimeType: "application/json",
      },
      async (uri, params) => {
        const slug = firstParam(params.slug);
        const record = await getResourceRecord(kind, slug);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(record ?? { error: `${kind} not found: ${slug}` }, null, 2),
            },
          ],
        };
      }
    );
  }

  server.registerPrompt(
    "build_agency_website",
    {
      title: "Build Agency Website",
      description: "Plan and build a USWDS-first agency website.",
      argsSchema: {
        agency: z.string(),
        goal: z.string(),
        audience: z.string(),
        framework: z.string().optional(),
      },
    },
    ({ agency, goal, audience, framework }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Use the USWDS MCP tools to design a government website for ${agency}. Goal: ${goal}. Audience: ${audience}. Framework: ${framework ?? "framework-neutral HTML first"}. Workflow: recommend_uswds_structure, then get_component_markup for every component you use (never write usa-* markup from memory), assemble with compose_uswds_page, and finish with validate_uswds_markup until there are no errors.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "build_service_page",
    {
      title: "Build Service Page",
      description: "Create a task-focused USWDS service page.",
      argsSchema: {
        service: z.string(),
        audience: z.string(),
        requirements: z.string(),
      },
    },
    ({ service, audience, requirements }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Build a USWDS service page for ${service}. Audience: ${audience}. Requirements: ${requirements}. Use recommend_uswds_structure, get_component_markup, compose_uswds_page, and validate_uswds_markup (fix every error) before finalizing.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "audit_uswds_page",
    {
      title: "Audit USWDS Page",
      description: "Audit markup for USWDS usage and accessibility risks.",
      argsSchema: { html: z.string() },
    },
    ({ html }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Audit this page with validate_uswds_markup, then search relevant USWDS docs for each important finding:\n\n${html}`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "convert_page_to_uswds",
    {
      title: "Convert Page to USWDS",
      description: "Convert non-USWDS markup into USWDS-first markup.",
      argsSchema: {
        html: z.string(),
        target_framework: z.string().optional(),
      },
    },
    ({ html, target_framework }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Convert this page to USWDS-first markup for ${target_framework ?? "framework-neutral HTML"}. Look up each target component with get_component_markup, preserve semantic content, and run validate_uswds_markup until it reports no errors:\n\n${html}`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "integrate_uswds_in_project",
    {
      title: "Integrate USWDS in Project",
      description: "Plan framework-specific USWDS package, asset, CSS, and JavaScript integration.",
      argsSchema: {
        framework: z.string(),
        migration_scope: z.enum(["new-project", "single-page", "full-site"]).optional(),
        no_cdn: z.boolean().optional(),
      },
    },
    ({ framework, migration_scope, no_cdn }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Use get_uswds_integration_recipe for ${framework}, then inspect relevant project files and run validate_uswds_project_setup before changing code. Migration scope: ${migration_scope ?? "not specified"}. No CDN: ${no_cdn ?? false}. Preserve official USWDS markup and validate final HTML.`,
          },
        },
      ],
    })
  );

  return server;
}
