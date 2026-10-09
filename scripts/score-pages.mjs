// Score generated pages: node scripts/score-pages.mjs <dir>
// <dir> contains <condition>/<task>/page.html (e.g. without/ and with/). Run `npm run build` first.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import axe from "axe-core";
import { validateUswdsMarkup } from "../dist/src/validator.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const known = new Set(JSON.parse(fs.readFileSync(path.join(root, "data/classes.json"), "utf8")).classes);
const dir = process.argv[2];
if (!dir) throw new Error("usage: node scripts/score-pages.mjs <dir>");

const totals = {};
const rows = [];
for (const condition of fs.readdirSync(dir)) {
  const conditionDir = path.join(dir, condition);
  if (!fs.statSync(conditionDir).isDirectory()) continue;
  for (const task of fs.readdirSync(conditionDir)) {
    const file = path.join(conditionDir, task, "page.html");
    if (!fs.existsSync(file)) {
      rows.push({ condition, task, status: "no file" });
      continue;
    }
    const html = fs.readFileSync(file, "utf8");
    const findings = validateUswdsMarkup(html, { knownClasses: known });
    const window = new JSDOM(html, { runScripts: "outside-only" }).window;
    window.eval(axe.source);
    const axeResult = await window.axe.run(window.document.documentElement, { rules: { "color-contrast": { enabled: false } } });
    const row = {
      condition,
      task,
      unknownClasses: findings.filter((f) => f.rule === "unknown-class").length,
      errors: findings.filter((f) => f.severity === "error").length,
      warnings: findings.filter((f) => f.severity === "warning").length,
      axeViolations: axeResult.violations.length,
    };
    rows.push(row);
    const t = (totals[condition] ??= { pages: 0, zeroErrorPages: 0, unknownClasses: 0, errors: 0, warnings: 0, axeViolations: 0 });
    t.pages += 1;
    t.zeroErrorPages += row.errors === 0 ? 1 : 0;
    for (const key of ["unknownClasses", "errors", "warnings", "axeViolations"]) t[key] += row[key];
  }
}
console.table(rows);
console.table(totals);
process.exit(0);
