import { describe, expect, it } from "vitest";
import { validateUswdsMarkup } from "../validator.js";
import { knownClasses } from "../testing.js";

/**
 * Realistic mistakes LLMs make when writing USWDS markup from memory.
 * Each must be caught with the named rule; this guards validator recall.
 */
const mistakes: Array<{ name: string; html: string; rule: string; mode?: "document" | "fragment" }> = [
  { name: "invented button class", html: '<a class="usa-btn" href="/x">Go</a>', rule: "unknown-class" },
  { name: "invented modifier", html: '<a class="usa-button usa-button--primary" href="/x">Go</a>', rule: "unknown-class" },
  { name: "invented component", html: '<div class="usa-hero-banner"></div>', rule: "unknown-class" },
  { name: "bootstrap-style grid on usa classes", html: '<div class="usa-row usa-col-6"></div>', rule: "unknown-class" },
  { name: "invented spacing utility", html: '<div class="margin-top-99"></div>', rule: "unknown-utility" },
  { name: "modifier without block", html: '<button type="button" class="usa-button--outline">Go</button>', rule: "bem-modifier-orphan" },
  { name: "card without container", html: '<ul class="usa-card-group"><li class="usa-card"><h3 class="usa-card__heading">x</h3></li></ul>', rule: "card-container" },
  { name: "alert without body", html: '<div class="usa-alert usa-alert--info"><p>Hello</p></div>', rule: "alert-body" },
  { name: "div used as button", html: '<div class="usa-button">Submit</div>', rule: "button-element" },
  { name: "accordion with div trigger", html: '<div class="usa-accordion"><div class="usa-accordion__button" aria-controls="a">Q</div><div id="a" class="usa-accordion__content">A</div></div>', rule: "accordion-button-element" },
  { name: "accordion pointing nowhere", html: '<div class="usa-accordion"><h4 class="usa-accordion__heading"><button type="button" class="usa-accordion__button" aria-expanded="false" aria-controls="missing">Q</button></h4></div>', rule: "broken-reference" },
  { name: "unstyled radio", html: '<fieldset class="usa-fieldset"><legend class="usa-legend">Q</legend><input type="radio" id="a" name="q"><label for="a">A</label></fieldset>', rule: "radio-structure" },
  { name: "unstyled checkbox", html: '<input type="checkbox" id="a" name="q"><label for="a">A</label>', rule: "checkbox-structure" },
  { name: "input without label", html: '<input class="usa-input" type="text" placeholder="Name">', rule: "form-label" },
  { name: "text input without usa-input", html: '<label class="usa-label" for="n">Name</label><input id="n" type="text">', rule: "form-control-class" },
  { name: "fieldset without legend", html: '<fieldset class="usa-fieldset"><label class="usa-label" for="a">A</label><input class="usa-input" id="a"></fieldset>', rule: "fieldset-legend" },
  { name: "bare table", html: "<table><tr><th>A</th></tr><tr><td>1</td></tr></table>", rule: "table-class" },
  { name: "modal without aria", html: '<div class="usa-modal" id="m"><div class="usa-modal__content"></div></div>', rule: "modal-aria" },
  { name: "nav as div", html: '<div class="usa-nav"><ul class="usa-nav__primary"></ul></div>', rule: "nav-element" },
  { name: "column outside a row", html: '<div class="grid-container"><div class="tablet:grid-col-6">x</div></div>', rule: "grid-orphan" },
  { name: "image without alt", html: '<img class="usa-banner__header-flag" src="flag.png">', rule: "img-alt" },
  { name: "vague link text", html: '<a class="usa-link" href="/doc">click here</a>', rule: "link-text" },
  { name: "skipped heading level", html: "<h2>One</h2><h4>Two</h4>", rule: "heading-order" },
  { name: "duplicate ids", html: '<div id="x"></div><div id="x"></div>', rule: "duplicate-id" },
  { name: "header nav without overlay", html: '<header class="usa-header usa-header--basic"><nav aria-label="Primary navigation" class="usa-nav"></nav></header>', rule: "header-overlay", mode: "document" },
  { name: "page without lang/main", html: "<!doctype html><html><head><title>x</title></head><body><h1>x</h1></body></html>", rule: "doc-lang" },
  { name: "page without main", html: '<!doctype html><html lang="en"><head><title>x</title></head><body><h1>x</h1></body></html>', rule: "main-landmark" },
  { name: "interactive page without scripts", html: '<!doctype html><html lang="en"><head><title>x</title><link rel="stylesheet" href="uswds.min.css"></head><body><main><h1>x</h1><div class="usa-accordion"></div></main></body></html>', rule: "uswds-js-missing" },
  { name: "banner without toggle", html: '<section class="usa-banner" aria-label="Official website of the United States government"><div class="usa-banner__content"></div></section>', rule: "banner-structure" },
  { name: "positive tabindex", html: '<a class="usa-link" href="/x" tabindex="3">Policy</a>', rule: "tabindex-positive" },
];

describe("validator recall on typical LLM mistakes", () => {
  it.each(mistakes.map((m) => [m.name, m] as const))("catches: %s", (_name, mistake) => {
    const rules = validateUswdsMarkup(mistake.html, { knownClasses, mode: mistake.mode }).map((f) => f.rule);
    expect(rules).toContain(mistake.rule);
  });
});
