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

import { findClasses } from "./search.js";
import { knownClasses } from "./testing.js";

describe("synonym expansion", () => {
  const docs: UswdsRecord[] = [
    { id: "component:select", type: "component", slug: "select", title: "Select", summary: "Dropdown list of options.", body: "A select lets users choose one option.", sections: [] },
    { id: "component:card", type: "component", slug: "card", title: "Card", summary: "Cards contain content.", body: "Card groups.", sections: [] },
  ];
  it("maps everyday words to USWDS vocabulary", () => {
    expect(searchRecords(docs, "tiles")[0].record.slug).toBe("card");
    expect(searchRecords(docs, "dropdown menu")[0].record.slug).toBe("select");
  });
});

describe("findClasses", () => {
  it("resolves utility phrases to real class names", () => {
    expect(findClasses(knownClasses, "margin top 2")).toContain("margin-top-2");
    expect(findClasses(knownClasses, "tablet grid col 6")).toContain("tablet:grid-col-6");
  });
  it("returns exact matches first", () => {
    expect(findClasses(knownClasses, "usa-button--big")[0]).toBe("usa-button--big");
  });
});
