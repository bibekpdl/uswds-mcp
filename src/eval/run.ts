import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import axe from "axe-core";
import { generatePage } from "../generator.js";
import { classesPath } from "../paths.js";
import { validateUswdsMarkup } from "../validator.js";

/**
 * `npm run eval` — generate pages for realistic scenarios and score them:
 * unknown classes, validator errors/warnings, and axe-core violations.
 */

const known = new Set<string>((JSON.parse(readFileSync(classesPath, "utf8")) as { classes: string[] }).classes);

const scenarios = [
  { page_type: "Apply for housing assistance", content_requirements: "eligibility, steps, FAQ, contact, application form" },
  { page_type: "Renew a fishing permit", content_requirements: "fees table, steps, FAQ accordion, contact" },
  { page_type: "Report a safety incident", content_requirements: "form to report an incident, alert about emergencies" },
  { page_type: "Grant program overview", content_requirements: "eligibility, deadlines, related programs cards, contact" },
  { page_type: "Service outage notice", content_requirements: "outage alert, status, contact" },
  { page_type: "Request public records", content_requirements: "steps, fee schedule table, request form" },
  { page_type: "Park information", content_requirements: "hours table, resources cards, FAQ" },
  { page_type: "Landing page", content_requirements: "services cards, key information" },
];

async function axeViolations(html: string): Promise<number> {
  const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
  dom.window.eval(axe.source);
  const results = await (dom.window as unknown as { axe: typeof axe }).axe.run(dom.window.document.documentElement, { rules: { "color-contrast": { enabled: false } } });
  return results.violations.length;
}

const rows: Array<Record<string, string | number>> = [];
for (const scenario of scenarios) {
  const { html } = generatePage({ ...scenario, agency_context: "Example Agency" }, { knownClasses: known });
  const findings = validateUswdsMarkup(html, { knownClasses: known });
  rows.push({
    scenario: scenario.page_type,
    "unknown classes": findings.filter((f) => f.rule === "unknown-class").length,
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warning").length,
    "axe violations": await axeViolations(html),
  });
}
console.table(rows);
const failed = rows.some((row) => row["unknown classes"] || row.errors || row.warnings || row["axe violations"]);
process.exit(failed ? 1 : 0);
