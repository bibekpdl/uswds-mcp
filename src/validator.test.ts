import { describe, expect, it } from "vitest";
import { validateUswdsMarkup } from "./validator.js";

describe("validateUswdsMarkup", () => {
  it("flags accordion buttons missing type", () => {
    const findings = validateUswdsMarkup(`
      <button class="usa-accordion__button" aria-controls="a1">Section</button>
      <div id="a1">Content</div>
    `);
    expect(findings.some((finding) => finding.rule === "accordion-button-type")).toBe(true);
  });

  it("flags unlabeled form controls", () => {
    const findings = validateUswdsMarkup('<input class="usa-input" id="email" type="email" />');
    expect(findings.some((finding) => finding.rule === "form-label")).toBe(true);
  });

  it("accepts a basic labeled input without form-label errors", () => {
    const findings = validateUswdsMarkup(`
      <label class="usa-label" for="email">Email</label>
      <input class="usa-input" id="email" type="email" />
    `);
    expect(findings.some((finding) => finding.rule === "form-label")).toBe(false);
  });
});
