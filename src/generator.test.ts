import { describe, expect, it } from "vitest";
import { generatePage, recommendStructure } from "./generator.js";
import { validateUswdsMarkup } from "./validator.js";

describe("USWDS generation", () => {
  it("recommends form patterns for benefit application workflows", () => {
    const result = recommendStructure({
      agency_type: "benefits agency",
      service_goal: "apply for benefits",
      audience: "residents",
    });
    expect(result.primaryTemplate).toBe("Form templates");
    expect(result.recommendedComponents.join(" ")).toContain("fieldset");
  });

  it("generates service form markup with fieldset, legend, and labels", () => {
    const result = generatePage({
      page_type: "Apply for benefits",
      agency_context: "Example Benefits Agency",
      content_requirements: "Collect applicant name and email.",
    });
    expect(result.html).toContain("usa-fieldset");
    expect(result.html).toContain("usa-legend");
    expect(result.html).toContain('for="email"');
    expect(validateUswdsMarkup(result.html).some((finding) => finding.severity === "error")).toBe(false);
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
});
