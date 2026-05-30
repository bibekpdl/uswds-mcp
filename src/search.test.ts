import { describe, expect, it } from "vitest";
import { searchRecords } from "./search.js";
import { UswdsRecord } from "./types.js";

const records: UswdsRecord[] = [
  {
    id: "component:accordion",
    type: "component",
    slug: "accordion",
    title: "Accordion",
    summary: "Hide and reveal related content.",
    body: "Accordion buttons use aria-controls and type button.",
    sections: [{ heading: "Accessibility guidance", content: "Use aria-controls." }],
    package: { name: "usa-accordion", dependencies: ["usa-icon"], hasJavascript: true, hasSass: true, hasTwig: true },
  },
  {
    id: "template:documentation",
    type: "template",
    slug: "documentation",
    title: "Documentation template",
    summary: "Long-form content template.",
    body: "Use sidenav and headings.",
    sections: [],
  },
];

describe("searchRecords", () => {
  it("ranks matching component records and returns matched sections", () => {
    const results = searchRecords(records, "accordion aria controls", { limit: 3 });
    expect(results[0].record.slug).toBe("accordion");
    expect(results[0].matchedSections).toContain("Accessibility guidance");
  });

  it("filters by record type", () => {
    const results = searchRecords(records, "documentation", { types: ["template"] });
    expect(results).toHaveLength(1);
    expect(results[0].record.type).toBe("template");
  });
});
