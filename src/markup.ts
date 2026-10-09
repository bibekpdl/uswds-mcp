import { MarkupSnippet } from "./types.js";
import { slugify } from "./text.js";

export const DEFAULT_ASSET_PATH = "/uswds";

/** Site doc slugs that differ from the USWDS package names. */
const componentAliases: Record<string, string> = {
  "text-input": "input",
  textarea: "input",
  label: "input",
  hint: "input",
  "error-message": "input",
  "text-field": "input",
  textbox: "input",
  grid: "layout-grid",
  layout: "layout-grid",
  "grid-layout": "layout-grid",
  "input-prefix-suffix": "input-prefix",
  "sign-in-page": "sign-in",
  login: "sign-in",
  "radio-buttons": "radio",
  "range-slider": "range",
  "date-picker": "date-picker",
  "site-alert": "site-alert",
  "sidenav": "sidenav",
  "side-navigation": "sidenav",
  "footer": "footer",
  "navigation": "nav",
  "dropdown": "select",
  "toast": "alert",
  "hero-section": "hero",
  "banner": "banner",
  "government-banner": "banner",
  "skip-nav": "skipnav",
  "skip-navigation": "skipnav",
  "accordions": "accordion",
  "buttons": "button",
  "cards": "card",
  "tables": "table",
  "alerts": "alert",
  "modals": "modal",
  "tags": "tag",
  "links": "link",
  "lists": "list",
  "forms": "form",
  "file-upload": "file-input",
  "progress": "step-indicator",
  "stepper": "step-indicator",
  "steps": "process-list",
  "breadcrumbs": "breadcrumb",
};

export function resolveComponentName(name: string): string {
  const slug = slugify(name).replace(/^usa-/, "");
  return componentAliases[slug] ?? slug;
}

export function applyAssetPath(html: string, assetPath = DEFAULT_ASSET_PATH): string {
  return html.replaceAll("{{USWDS_ASSET_PATH}}", assetPath.replace(/\/+$/, ""));
}

export function findSnippets(snippets: MarkupSnippet[], name: string, variant?: string): MarkupSnippet[] {
  const component = resolveComponentName(name);
  const matches = snippets.filter((snippet) => snippet.component === component);
  if (!variant) return matches;
  const wanted = slugify(variant);
  return matches.filter((snippet) => snippet.variant === wanted || snippet.variant.split("+").includes(wanted));
}

export function listMarkupComponents(snippets: MarkupSnippet[]): Array<{ component: string; kind: string; variants: string[] }> {
  const byComponent = new Map<string, { component: string; kind: string; variants: string[] }>();
  for (const snippet of snippets) {
    const entry = byComponent.get(`${snippet.kind}:${snippet.component}`) ?? { component: snippet.component, kind: snippet.kind, variants: [] };
    entry.variants.push(snippet.variant);
    byComponent.set(`${snippet.kind}:${snippet.component}`, entry);
  }
  return [...byComponent.values()].sort((a, b) => a.component.localeCompare(b.component));
}
