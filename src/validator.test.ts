import { describe, expect, it } from "vitest";
import { validateUswdsMarkup } from "./validator.js";
import { knownClasses } from "./testing.js";

const rules = (html: string, mode?: "document" | "fragment") => validateUswdsMarkup(html, { knownClasses, mode }).map((f) => f.rule);
const errors = (html: string) => validateUswdsMarkup(html, { knownClasses }).filter((f) => f.severity === "error").map((f) => f.rule);

describe("validateUswdsMarkup (legacy behaviour)", () => {
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

describe("fragment awareness (no false positives)", () => {
  it("does not demand skipnav/banner/main for a fragment", () => {
    expect(rules('<a class="usa-button" href="/x">Go</a>')).toEqual([]);
  });

  it("does not require a label on submit/button inputs", () => {
    expect(rules('<form><input class="usa-button" type="submit" value="Go"></form>')).not.toContain("form-label");
  });

  it("accepts wrapping labels", () => {
    expect(rules('<label class="usa-label">Name <input class="usa-input" type="text"></label>')).not.toContain("form-label");
  });
});

describe("document rules", () => {
  it("requires lang, title, main and skipnav for full pages", () => {
    const found = rules("<!doctype html><html><head></head><body><h1>x</h1></body></html>");
    expect(found).toEqual(expect.arrayContaining(["doc-lang", "doc-title", "main-landmark", "skipnav", "uswds-css-missing"]));
  });

  it("requires the header overlay when navigation is present", () => {
    const html = '<header class="usa-header"><nav aria-label="Primary" class="usa-nav"></nav></header>';
    expect(rules(html, "document")).toContain("header-overlay");
  });

  it("flags interactive components without the USWDS scripts", () => {
    const html = '<!doctype html><html lang="en"><head><title>t</title><link rel="stylesheet" href="/uswds/css/uswds.min.css"></head><body><main><h1>a</h1><div class="usa-accordion"></div></main></body></html>';
    expect(rules(html)).toEqual(expect.arrayContaining(["uswds-init-js-missing", "uswds-js-missing"]));
  });
});

describe("class vocabulary", () => {
  it("catches typos in usa-* classes with a suggestion", () => {
    const findings = validateUswdsMarkup('<div class="usa-alrt usa-alert--eror"><p>x</p></div>', { knownClasses });
    const unknown = findings.filter((f) => f.rule === "unknown-class");
    expect(unknown.map((f) => f.message).join(" ")).toContain("usa-alrt");
    expect(unknown.some((f) => f.suggestion?.includes("usa-alert"))).toBe(true);
  });

  it("accepts real utilities and responsive variants, warns on invented utilities", () => {
    expect(rules('<div class="grid-row grid-gap tablet:grid-col-6 margin-top-2 bg-primary-lighter"></div>')).not.toContain("unknown-utility");
    expect(rules('<div class="margin-top-99 tablet:grid-col-13"></div>')).toContain("unknown-utility");
  });

  it("ignores non-USWDS project classes", () => {
    expect(rules('<div class="my-widget"></div>')).toEqual([]);
  });

  it("requires BEM modifiers to sit on their block", () => {
    expect(errors('<div class="usa-button--big">x</div>')).toContain("bem-modifier-orphan");
    expect(errors('<a class="usa-button usa-button--big" href="#">x</a>')).not.toContain("bem-modifier-orphan");
  });
});

describe("component structure", () => {
  it("checks accordion wiring", () => {
    const html = '<div class="usa-accordion"><button type="button" class="usa-accordion__button" aria-controls="nope" aria-expanded="false">A</button></div>';
    expect(rules(html)).toEqual(expect.arrayContaining(["broken-reference", "accordion-heading"]));
  });

  it("checks radio and checkbox structure", () => {
    const html = '<fieldset class="usa-fieldset"><legend class="usa-legend">Q</legend><input type="radio" id="r" name="r"><label for="r">Yes</label></fieldset>';
    expect(errors(html)).toContain("radio-structure");
  });

  it("checks tables, modals and cards", () => {
    expect(rules("<table><tr><td>1</td></tr></table>")).toEqual(expect.arrayContaining(["table-class", "table-caption", "table-headers"]));
    expect(errors('<div class="usa-modal"><div>hi</div></div>')).toContain("modal-aria");
    expect(errors('<ul class="usa-card-group"><li class="usa-card"><p>x</p></li></ul>')).toContain("card-container");
  });
});

describe("generic accessibility", () => {
  it("flags duplicate ids, extra h1s, missing alt, vague links and empty buttons", () => {
    const html = '<h1 id="a">x</h1><h1 id="a">y</h1><img src="a.png"><a href="#top">click here</a><button type="button"></button>';
    expect(rules(html)).toEqual(expect.arrayContaining(["duplicate-id", "single-h1", "img-alt", "link-text", "button-name"]));
  });

  it("flags skipped heading levels", () => {
    expect(rules("<h2>a</h2><h4>b</h4>")).toContain("heading-order");
  });

  it("includes selectors, snippets and doc links in findings", () => {
    const [finding] = validateUswdsMarkup('<table class="usa-table"><tr><td>1</td></tr></table>', { knownClasses }).filter((f) => f.rule === "table-caption");
    expect(finding.selector).toContain("table");
    expect(finding.snippet).toContain("<table");
    expect(finding.docUrl).toContain("/components/table/");
  });
});
