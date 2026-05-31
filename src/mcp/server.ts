import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generatePage, recommendStructure } from "../generator.js";
import { getIntegrationRecipe, validateProjectUswdsSetup } from "../integration.js";
import { searchRecords } from "../search.js";
import { getRecord, getResourceRecord, loadIndex } from "../store.js";
import { UswdsRecordType } from "../types.js";
import { summarizeValidation, validateUswdsMarkup } from "../validator.js";

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
    version: "0.1.4",
  });

  server.registerTool(
    "search_uswds",
    {
      title: "Search USWDS",
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
      description: "Return structured component guidance, package metadata, accessibility guidance, examples, and source links.",
      inputSchema: { slug_or_name: z.string().min(1) },
    },
    async ({ slug_or_name }) => {
      const empty = await requireIndexedRecords();
      if (empty) return jsonResult(empty);
      const record = await getRecord("component", slug_or_name);
      return jsonResult(record ?? { error: `Component not found: ${slug_or_name}` });
    }
  );

  server.registerTool(
    "get_pattern",
    {
      title: "Get USWDS Pattern",
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
      description: "Generate framework-neutral USWDS HTML and framework adaptation notes.",
      inputSchema: {
        page_type: z.string().min(1),
        agency_context: z.string().min(1),
        content_requirements: z.string().min(1),
        framework: z.string().optional(),
      },
    },
    async (input) => jsonResult(generatePage(input))
  );

  server.registerTool(
    "validate_uswds_markup",
    {
      title: "Validate USWDS Markup",
      description: "Static validation for common USWDS markup, accessibility, and token-usage issues.",
      inputSchema: {
        html: z.string().min(1),
        page_context: z.string().optional(),
      },
    },
    async ({ html, page_context }) => {
      const findings = validateUswdsMarkup(html);
      return jsonResult({
        summary: summarizeValidation(findings),
        pageContext: page_context,
        findings,
      });
    }
  );

  server.registerTool(
    "get_uswds_integration_recipe",
    {
      title: "Get USWDS Integration Recipe",
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
            text: `Use the USWDS MCP tools to design a government website for ${agency}. Goal: ${goal}. Audience: ${audience}. Framework: ${framework ?? "framework-neutral HTML first"}. Query templates, patterns, components, generate a structure, then validate produced markup.`,
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
            text: `Build a USWDS service page for ${service}. Audience: ${audience}. Requirements: ${requirements}. Use recommend_uswds_structure, generate_uswds_page, and validate_uswds_markup before finalizing.`,
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
            text: `Convert this page to USWDS-first markup for ${target_framework ?? "framework-neutral HTML"}. Search components and patterns before rewriting, preserve semantic content, and validate the result:\n\n${html}`,
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
