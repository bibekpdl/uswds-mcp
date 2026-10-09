import { describe, expect, it } from "vitest";
import { generatePage, inferSections, recommendStructure } from "./generator.js";
import { validateUswdsMarkup } from "./validator.js";
import { knownClasses } from "./testing.js";

describe("USWDS generation", () => {
  it("recommends form patterns for benefit application workflows", () => {
    const result = recommendStructure({
      agency_type: "benefits agency",
      service_goal: "apply for benefits",
      audience: "residents",
    });
    expect(result.primaryTemplate).toBe("Form templates");
    expect(result.recommendedComponents.join(" ")).toContain("fieldset");
    expect(result.nextSteps.join(" ")).toContain("get_component_markup");
  });

  it("generates service form markup with fieldset, legend, and labels", () => {
    const result = generatePage({
      page_type: "Apply for benefits",
      agency_context: "Example Benefits Agency",
      content_requirements: "Collect applicant name and email.",
    });
    expect(result.html).toContain("usa-fieldset");
    expect(result.html).toContain("usa-legend");
    expect(result.html).toMatch(/<label class="usa-label" for="email-address-\d+"/);
    expect(validateUswdsMarkup(result.html, { knownClasses }).some((finding) => finding.severity === "error")).toBe(false);
  });

  it("adds framework-specific notes without changing canonical USWDS classes", () => {
    const result = generatePage({
      page_type: "Renew permit",
      agency_context: "Example Transportation Agency",
      content_requirements: "Permit renewal form",
      framework: "Next.js",
    });
    expect(result.implementationNotes.join(" ")).toContain("className");
    expect(result.html).toContain("usa-button");
  });

  it("honours the requested content instead of collapsing to a stock form (regression)", () => {
    const result = generatePage({
      page_type: "Renew a fishing permit",
      agency_context: "Department of Fish and Wildlife",
      content_requirements: "Explain eligibility, show fees table, steps, FAQ accordion, contact card",
    });
    expect(result.html).toContain("usa-summary-box");
    expect(result.html).toContain("usa-table");
    expect(result.html).toContain("usa-process-list");
    expect(result.html).toContain("usa-accordion");
    expect(result.html).not.toContain("Applicant information");
    expect(result.html).toContain("<h1>Renew a fishing permit</h1>");
  });

  it("returns a self-validation that is clean for every inferred layout", () => {
    for (const content_requirements of [
      "Outage notice, eligibility, fees, steps, FAQ, related services, contact",
      "Landing page for a grants program",
      "Apply online: collect name and email",
    ]) {
      const result = generatePage({ page_type: "Service page", agency_context: "Agency", content_requirements }, { knownClasses });
      expect(result.validation.findings.filter((f) => f.severity !== "info")).toEqual([]);
    }
  });

  it("returns an editable spec so callers can swap placeholders for real content", () => {
    const { sections } = inferSections({ page_type: "Permit", agency_context: "A", content_requirements: "fees table" });
    expect(sections.some((s) => s.type === "table")).toBe(true);
  });
});
