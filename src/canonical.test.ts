import { describe, expect, it } from "vitest";
import { curatedSnippets } from "./foundations.js";
import { validateUswdsMarkup } from "./validator.js";
import { knownClasses, markup } from "./testing.js";

/**
 * Self-consistency: the official USWDS markup is the ground truth, so the validator must
 * accept it. If this fails after a USWDS upgrade, the rule (not the markup) needs attention.
 */

// Upstream fixtures that are demo scaffolding rather than production markup.
const fixtureQuirks = new Set(["table-headers", "table-scope", "single-h1", "nav-label", "legend-class", "empty-heading", "label-class", "form-label"]);
const demoOnly = /^component:(icon|fonts|input-mask|type-setting|type-spacing|type-line-length|add-aspect|prose)\b/;

describe("official USWDS markup", () => {
  it("has broad coverage", () => {
    expect(markup.length).toBeGreaterThan(150);
    const components = new Set(markup.map((snippet) => snippet.component));
    for (const required of ["accordion", "alert", "banner", "button", "card", "footer", "header", "modal", "radio", "search", "table", "skipnav"]) {
      expect(components.has(required), `missing ${required}`).toBe(true);
    }
  });

  it("contains no unresolved template artifacts", () => {
    for (const snippet of markup) {
      expect(snippet.html, snippet.id).not.toMatch(/\{\{(?!USWDS_ASSET_PATH)|\{%|\bundefined\b/);
      expect(snippet.html, snippet.id).not.toMatch(/href="javascript:/);
    }
  });

  it.each(markup.filter((snippet) => !demoOnly.test(snippet.id)).map((snippet) => [snippet.id, snippet] as const))("validates cleanly: %s", (_id, snippet) => {
    const findings = validateUswdsMarkup(snippet.html.replaceAll("{{USWDS_ASSET_PATH}}", "/uswds"), { knownClasses, mode: "fragment" }).filter(
      (finding) => finding.severity !== "info" && !fixtureQuirks.has(finding.rule)
    );
    expect(findings.map((f) => `${f.rule}: ${f.message}`)).toEqual([]);
  });

  it("only uses classes that exist in the USWDS stylesheet", () => {
    for (const snippet of markup) {
      for (const name of snippet.classes) expect(knownClasses.has(name), `${snippet.id}: ${name}`).toBe(true);
    }
  });
});

describe("curated foundation snippets", () => {
  it("only use real USWDS classes (checked against the stylesheet, not the snippets)", () => {
    for (const snippet of curatedSnippets) {
      for (const name of snippet.classes) expect(knownClasses.has(name), `${snippet.id}: ${name}`).toBe(true);
    }
  });

  it.each(curatedSnippets.map((snippet) => [snippet.id, snippet] as const))("validate cleanly: %s", (_id, snippet) => {
    const findings = validateUswdsMarkup(snippet.html, { knownClasses, mode: "fragment" }).filter((finding) => finding.severity !== "info");
    expect(findings.map((f) => `${f.rule}: ${f.message}`)).toEqual([]);
  });
});

describe("index consistency", () => {
  it("renders markup from the same USWDS version the docs were indexed from", async () => {
    const { readFileSync } = await import("node:fs");
    const { manifestPath } = await import("./paths.js");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      sources: Array<{ name: string; version?: string }>;
      markupSource?: { version?: string };
    };
    const docsVersion = manifest.sources.find((source) => source.name === "uswds")?.version;
    expect(manifest.markupSource?.version).toBe(docsVersion);
  });
});
