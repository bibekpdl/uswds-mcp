import { composePage, PageSpec, Section } from "./composer.js";
import { summarizeValidation, validateUswdsMarkup } from "./validator.js";

export interface StructureRecommendationInput {
  agency_type: string;
  service_goal: string;
  audience: string;
  framework?: string;
  constraints?: string;
}

export interface PageGenerationInput {
  page_type: string;
  agency_context: string;
  content_requirements: string;
  framework?: string;
}

export function frameworkNotes(framework?: string): string[] {
  const normalized = framework?.toLowerCase();
  const base = [
    "Install official USWDS assets with @uswds/uswds where the project uses npm.",
    'For npm/bundler projects, import CSS from @uswds/uswds/css/uswds.min.css rather than the internal dist path.',
    "Keep official USWDS HTML structure and classes as the canonical implementation.",
    "Use uswds-init.min.js in the head and uswds.min.js before the closing body tag when interactive components are present.",
    "Use get_uswds_integration_recipe for framework-specific package, asset, and migration guidance.",
  ];
  if (!normalized) return base;
  if (normalized.includes("react") || normalized.includes("next")) {
    return [...base, "In React/Next.js, convert class to className and preserve ARIA, id, and data attributes exactly."];
  }
  if (normalized.includes("angular")) {
    return [...base, "In Angular, wrap USWDS markup in components only after preserving the documented DOM shape."];
  }
  if (normalized.includes("rails")) {
    return [...base, "In Rails, render USWDS sections as partials or ViewComponents while keeping official class names."];
  }
  if (normalized.includes("drupal")) {
    return [...base, "In Drupal, map templates to Twig while preserving USWDS component structure and assets."];
  }
  return [...base, `For ${framework}, adapt templates without replacing USWDS classes or accessibility attributes.`];
}

const formIntent = /\b(form|apply|application|register|registration|sign[- ]?up|enrol(?:l|lment)|claim|submit|request|intake|questionnaire)\b/i;
const docsIntent = /\b(document|policy|guidance|manual|standard|resource|handbook|regulation)\b/i;

export function recommendStructure(input: StructureRecommendationInput) {
  const isForm = formIntent.test(input.service_goal);
  const isDocs = docsIntent.test(input.service_goal);
  const primaryTemplate = isForm ? "Form templates" : isDocs ? "Documentation template" : "Landing page or service page template";
  const components = [
    "skipnav",
    "official government banner",
    "header",
    "footer",
    "identifier",
    "layout grid",
    isForm ? "form, fieldset, legend, label, input, button, step indicator, validation, alert" : "card, collection, summary box, process list, button",
    isDocs ? "sidenav, in-page navigation, table, breadcrumb" : "accordion for FAQs, table for fees or schedules",
  ];

  return {
    agencyType: input.agency_type,
    serviceGoal: input.service_goal,
    audience: input.audience,
    primaryTemplate,
    recommendedComponents: components,
    pageStructure: [
      "Skipnav",
      "Official government banner",
      "Header with clear agency/service navigation",
      "Main region with one h1 describing the user task",
      isForm ? "Step indicator (multi-step) and vertical form sections using fieldset and legend for related controls" : "Task-focused content sections using grid and cards/process list/summary box",
      "Contextual alerts only for actionable status or warnings",
      "Footer with required agency/service links",
      "Identifier with required agency links",
    ],
    accessibilityNotes: [
      "Use semantic heading order and a single h1.",
      "Keep visual order and DOM order aligned.",
      "Use labels for all controls and legends for grouped form questions.",
      "Validate the final implementation in the project context; USWDS component status does not guarantee full Section 508 compliance.",
    ],
    nextSteps: [
      "Call get_component_markup for each component above to get the official HTML.",
      "Call compose_uswds_page with real content (preferred) or generate_uswds_page for a starting point.",
      "Run validate_uswds_markup on the final HTML and fix every error.",
    ],
    implementationNotes: frameworkNotes(input.framework),
    constraints: input.constraints,
  };
}

function splitRequirements(text: string): string[] {
  return text
    .split(/[\n;]+|,\s*(?![^()]*\))|\band\b/gi)
    .map((part) => part.trim().replace(/^[-*•\d.\s]+/, ""))
    .filter((part) => part.length > 2);
}

function titleCase(value: string): string {
  const trimmed = value.trim().replace(/[.:]+$/, "");
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Map free-text requirements to structured sections. Unknown content stays visibly placeholder. */
export function inferSections(input: PageGenerationInput): { sections: Section[]; notes: string[] } {
  const sections: Section[] = [];
  const notes: string[] = [];
  const parts = splitRequirements(input.content_requirements);
  const wantsForm = formIntent.test(input.page_type) || parts.some((part) => formIntent.test(part));
  const intro = parts.find((part) => !/(fee|cost|price|step|process|faq|question|contact|phone|eligib|requirement|deadline|alert|notice|warning|card|link|form|apply)/i.test(part));

  sections.push({
    type: "content",
    paragraphs: [intro ? titleCase(intro) + "." : `[Introduce ${input.page_type} in one or two plain-language sentences.]`],
  });

  const used = new Set<string>();
  const add = (kind: string, section: Section) => {
    if (used.has(kind)) return;
    used.add(kind);
    sections.push(section);
  };

  for (const part of parts) {
    if (/(alert|notice|warning|outage|maintenance|emergency)/i.test(part)) {
      add("alert", { type: "alert", variant: /emergency|outage/i.test(part) ? "emergency" : "warning", text: `[${titleCase(part)}: write the notice text.]` });
    }
    if (/(eligib|requirement|deadline|document|bring|need)/i.test(part)) {
      add("summary", { type: "summary_box", heading: "Key information", items: [`[${titleCase(part)}]`, "[Add deadlines, eligibility, or required documents.]"] });
    }
    if (/(fee|cost|price|rate|schedule|timeline)/i.test(part)) {
      add("table", {
        type: "table",
        heading: titleCase(part),
        caption: titleCase(part),
        headers: ["Item", "Details", "Amount"],
        rows: [["[Item]", "[Details]", "[Amount]"]],
        striped: true,
      });
    }
    if (/(step|process|how to|procedure|stages?)/i.test(part)) {
      add("process", {
        type: "process_list",
        heading: "How it works",
        steps: [
          { heading: "[First step]", text: "[Describe what the person does first.]" },
          { heading: "[Second step]", text: "[Describe what happens next.]" },
          { heading: "[Final step]", text: "[Describe the outcome.]" },
        ],
      });
    }
    if (/(faq|question|answers?)/i.test(part)) {
      add("faq", {
        type: "accordion",
        heading: "Frequently asked questions",
        items: [
          { title: "[Question 1]", content: "[Answer 1]" },
          { title: "[Question 2]", content: "[Answer 2]" },
        ],
      });
    }
    if (/(card|resources?|related|links?|programs?|services?)/i.test(part)) {
      add("cards", {
        type: "card_group",
        heading: "Related services",
        cards: [
          { heading: "[Service one]", text: "[Short description.]", link: { label: "[Action label]", href: "#" } },
          { heading: "[Service two]", text: "[Short description.]", link: { label: "[Action label]", href: "#" } },
          { heading: "[Service three]", text: "[Short description.]", link: { label: "[Action label]", href: "#" } },
        ],
      });
    }
    if (/(contact|phone|email|support|help|hours)/i.test(part)) {
      add("contact", { type: "contact", heading: "Contact us", lines: ["[Phone number and hours]", "[Email address]"] });
    }
  }

  if (wantsForm) {
    add("form", {
      type: "form",
      legend: titleCase(input.page_type),
      fields: [
        { type: "text", label: "Full name", required: true },
        { type: "email", label: "Email address", required: true, hint: "We use this only to send updates about your request." },
      ],
      submit_label: "Continue",
    });
    notes.push("Form fields are a minimal starting set; replace them with the real questions (one question per field, labels in plain language).");
  }
  if (!wantsForm && used.size === 0) {
    sections.push({
      type: "card_group",
      heading: "Get started",
      cards: [{ heading: "[Primary task]", text: "[Describe the main task users come here to complete.]", link: { label: "[Start]", href: "#" } }],
    });
    notes.push("No specific components could be inferred from the requirements; call compose_uswds_page with explicit sections for better results.");
  }
  return { sections, notes };
}

export interface GenerationOptions {
  knownClasses?: Set<string>;
  assetPath?: string;
}

export function generatePage(input: PageGenerationInput, options: GenerationOptions = {}) {
  const { sections, notes } = inferSections(input);
  const spec: PageSpec = {
    title: titleCase(input.page_type || "Service page"),
    agency: input.agency_context || "Agency",
    asset_path: options.assetPath,
    sections,
  };
  const composed = composePage(spec);
  const findings = validateUswdsMarkup(composed.html, { knownClasses: options.knownClasses });

  return {
    html: composed.html,
    spec,
    placeholders: composed.placeholders,
    validation: { summary: summarizeValidation(findings), findings },
    assetPath: composed.assetPath,
    implementationNotes: [
      ...frameworkNotes(input.framework),
      `Serve the USWDS dist assets from ${composed.assetPath}/ (css/, js/, img/, fonts/); see get_uswds_integration_recipe.`,
    ],
    accessibilityNotes: [
      "Replace every [bracketed] placeholder with real content before publishing.",
      "Review banner, header, footer, and identifier links against the agency's information architecture.",
      "Run project-specific accessibility tests (axe, manual keyboard and screen reader checks) after adding real content and routes.",
      ...notes,
    ],
    nextStep: "For fully custom pages call compose_uswds_page with explicit sections and real content, then validate_uswds_markup.",
  };
}
