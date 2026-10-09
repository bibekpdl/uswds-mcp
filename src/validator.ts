import * as cheerio from "cheerio";
import type { Cheerio } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { bemBlock, stripVariantPrefix, suggestClasses } from "./classes.js";

export interface ValidationFinding {
  severity: "error" | "warning" | "info";
  rule: string;
  message: string;
  selector?: string;
  /** Short excerpt of the offending element so the fix can be located without re-parsing. */
  snippet?: string;
  suggestion?: string;
  /** Component whose canonical markup (`get_component_markup`) shows the correct structure. */
  component?: string;
  docUrl?: string;
}

export interface ValidateOptions {
  /** Every class defined by the USWDS stylesheet. Enables unknown-class detection. */
  knownClasses?: Set<string>;
  /** `auto` treats input containing <html>/<body>/<!doctype> as a full page. */
  mode?: "auto" | "document" | "fragment";
}

type Ctx = ReturnType<typeof createContext>;
type Selection = Cheerio<Element>;

const DOCS = "https://designsystem.digital.gov/components";

const interactiveComponents = /usa-(accordion|banner|modal|nav\b|menu-btn|tooltip|file-input|date-picker|date-range-picker|combo-box|time-picker|character-count|input-mask|in-page-navigation|language-selector|header)/;
const genericLinkText = /^(click here|here|read more|more|learn more|link|this link|click)$/i;
const nonLabelledInputTypes = new Set(["hidden", "submit", "button", "reset", "image"]);
const textLikeTypes = new Set(["text", "email", "tel", "password", "number", "search", "url", "date", "time"]);
const utilityPrefix =
  /^(margin|padding|font|text|bg|border|radius|display|flex|grid|width|height|maxw|minw|maxh|minh|measure|position|z|shadow|line-height|order|opacity|overflow|cursor|pin|float|circle|add-aspect|square|bottom|left|right|top|tablet|mobile|desktop|widescreen|hover|focus)(-|:|$)/;

function createContext(html: string, options: ValidateOptions) {
  const isDocument = options.mode === "document" || (options.mode !== "fragment" && /<!doctype|<html[\s>]|<body[\s>]/i.test(html));
  const $ = isDocument ? cheerio.load(html) : cheerio.load(html, null, false);
  const findings: ValidationFinding[] = [];
  return { $, isDocument, findings, known: options.knownClasses };
}

function selectorFor(el: Element): string {
  const parts: string[] = [];
  let node: AnyNode | null = el;
  while (node && node.type === "tag" && parts.length < 3) {
    const element = node as Element;
    const id = element.attribs?.id;
    const cls = (element.attribs?.class ?? "").split(/\s+/).filter(Boolean).slice(0, 2).join(".");
    parts.unshift(`${element.name}${id ? `#${id}` : ""}${cls ? `.${cls}` : ""}`);
    if (id) break;
    node = element.parent as AnyNode | null;
  }
  return parts.join(" > ");
}

function excerpt($: cheerio.CheerioAPI, el: Element): string {
  const clone = $(el).clone();
  clone.children().remove();
  const open = $.html(clone).replace(/<\/[^>]+>$/, "");
  return open.length > 140 ? `${open.slice(0, 137)}...` : open;
}

function add(ctx: Ctx, el: Element | undefined, finding: ValidationFinding): void {
  const enriched: ValidationFinding = { ...finding };
  if (el) {
    enriched.selector ??= selectorFor(el);
    enriched.snippet ??= excerpt(ctx.$, el);
  }
  if (finding.component) enriched.docUrl ??= `${DOCS}/${finding.component}/`;
  ctx.findings.push(enriched);
}

function tag(el: Element): string {
  return el.name.toLowerCase();
}

function hasClass(el: Element, name: string): boolean {
  return (el.attribs?.class ?? "").split(/\s+/).includes(name);
}

function accessibleName($: cheerio.CheerioAPI, el: Element): string {
  const node = $(el);
  const aria = node.attr("aria-label")?.trim();
  if (aria) return aria;
  if (node.attr("aria-labelledby")) return "labelled";
  if (node.find("img[alt]").filter((_, img) => ($(img).attr("alt") ?? "").trim() !== "").length > 0) return "img-alt";
  if (node.find("svg title, svg[aria-label]").length > 0) return "svg";
  return node.text().replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Document-level rules
// ---------------------------------------------------------------------------

function documentRules(ctx: Ctx): void {
  const { $ } = ctx;
  if (!ctx.isDocument) return;

  const html = $("html").first();
  if (!html.attr("lang")) {
    add(ctx, html.get(0), { severity: "error", rule: "doc-lang", message: "The <html> element needs a lang attribute.", suggestion: '<html lang="en">' });
  }
  if ($("head > title").text().trim() === "") {
    add(ctx, undefined, { severity: "error", rule: "doc-title", message: "The page needs a non-empty <title>.", suggestion: "Add <title>Page name | Agency</title> in <head>." });
  }
  if ($('meta[name="viewport"]').length === 0) {
    add(ctx, undefined, {
      severity: "warning",
      rule: "doc-viewport",
      message: "Missing responsive viewport meta tag.",
      suggestion: '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    });
  }

  const mains = $("main, [role='main']");
  if (mains.length === 0) {
    add(ctx, undefined, { severity: "error", rule: "main-landmark", message: "The page needs exactly one <main> landmark.", suggestion: '<main id="main-content">…</main>' });
  } else if (mains.length > 1) {
    add(ctx, mains.get(1), { severity: "error", rule: "main-landmark", message: "The page has more than one <main> landmark." });
  }

  if ($(".usa-skipnav").length === 0) {
    add(ctx, undefined, {
      severity: "warning",
      rule: "skipnav",
      message: "Page markup should include a USWDS skipnav link near the top of the body.",
      suggestion: 'Add <a class="usa-skipnav" href="#main-content">Skip to main content</a>.',
      component: "skipnav",
    });
  }

  if ($(".usa-banner").length === 0) {
    add(ctx, undefined, {
      severity: "info",
      rule: "official-banner",
      message: "Most federal public sites should include the USWDS official government banner.",
      suggestion: "Use the USWDS banner component unless the project context intentionally omits it.",
      component: "banner",
    });
  }

  const hasCss = $('link[rel="stylesheet"]').toArray().some((link) => /uswds|styles/i.test($(link).attr("href") ?? ""));
  if (!hasCss) {
    add(ctx, undefined, { severity: "warning", rule: "uswds-css-missing", message: "No USWDS stylesheet link was found.", suggestion: 'Link uswds.min.css (see get_uswds_integration_recipe).' });
  }

  const scripts = $("script[src]").toArray().map((s) => $(s).attr("src") ?? "");
  const interactive = interactiveComponents.test($.html());
  if (interactive) {
    if (!scripts.some((src) => /uswds-init/.test(src))) {
      add(ctx, undefined, { severity: "warning", rule: "uswds-init-js-missing", message: "Interactive USWDS components are present but uswds-init.min.js is not loaded.", suggestion: "Load uswds-init.min.js in <head>." });
    }
    if (!scripts.some((src) => /uswds(\.min)?\.js/.test(src))) {
      add(ctx, undefined, { severity: "warning", rule: "uswds-js-missing", message: "Interactive USWDS components are present but uswds.min.js is not loaded.", suggestion: "Load uswds.min.js before </body>." });
    }
  }

  if ($(".usa-nav").length > 0 && $(".usa-overlay").length === 0) {
    add(ctx, $(".usa-nav").get(0), {
      severity: "error",
      rule: "header-overlay",
      message: "USWDS headers with navigation need <div class=\"usa-overlay\"></div> before the header for the mobile menu.",
      suggestion: 'Add <div class="usa-overlay"></div> immediately before <header class="usa-header">.',
      component: "header",
    });
  }
}

// ---------------------------------------------------------------------------
// Generic HTML / accessibility rules
// ---------------------------------------------------------------------------

function genericRules(ctx: Ctx): void {
  const { $ } = ctx;
  const severityForRefs: ValidationFinding["severity"] = ctx.isDocument ? "error" : "warning";

  // Duplicate ids
  const seen = new Map<string, Element>();
  $("[id]").each((_, node) => {
    const el = node as Element;
    const id = el.attribs.id;
    if (!id) return;
    if (seen.has(id)) add(ctx, el, { severity: "error", rule: "duplicate-id", message: `Duplicate id "${id}".`, suggestion: "ids must be unique; they back labels, aria-* references and USWDS JavaScript." });
    else seen.set(id, el);
  });

  // ARIA / label reference targets
  const idExists = (id: string) => seen.has(id);
  for (const attr of ["aria-controls", "aria-labelledby", "aria-describedby"]) {
    $(`[${attr}]`).each((_, node) => {
      const el = node as Element;
      for (const id of (el.attribs[attr] ?? "").split(/\s+/).filter(Boolean)) {
        if (!idExists(id)) {
          add(ctx, el, { severity: severityForRefs, rule: "broken-reference", message: `${attr} references "#${id}" which does not exist${ctx.isDocument ? "" : " in this snippet"}.` });
        }
      }
    });
  }
  $("a[href^='#']").each((_, node) => {
    const el = node as Element;
    const id = el.attribs.href.slice(1);
    if (id && !idExists(id) && ctx.isDocument) {
      add(ctx, el, { severity: hasClass(el, "usa-skipnav") ? "error" : "warning", rule: "broken-anchor", message: `Link target "#${id}" does not exist on the page.` });
    }
  });

  // Headings
  const headings = $("h1,h2,h3,h4,h5,h6").toArray() as Element[];
  const h1s = headings.filter((h) => tag(h) === "h1");
  if (h1s.length > 1) add(ctx, h1s[1], { severity: "error", rule: "single-h1", message: "More than one <h1> on the page." });
  if (ctx.isDocument && h1s.length === 0) add(ctx, undefined, { severity: "warning", rule: "single-h1", message: "The page has no <h1>." });
  let previous = 0;
  for (const heading of headings) {
    const level = Number(tag(heading)[1]);
    if (previous && level > previous + 1) {
      add(ctx, heading, { severity: "warning", rule: "heading-order", message: `Heading level skips from h${previous} to h${level}.`, suggestion: "Keep heading levels sequential for the document outline." });
    }
    if ($(heading).text().trim() === "" && $(heading).find("img[alt],svg").length === 0) {
      add(ctx, heading, { severity: "error", rule: "empty-heading", message: "Empty heading." });
    }
    previous = level;
  }

  // Images
  $("img").each((_, node) => {
    const el = node as Element;
    if (el.attribs.alt === undefined && el.attribs.role !== "presentation") {
      add(ctx, el, { severity: "error", rule: "img-alt", message: "Images need an alt attribute (use alt=\"\" for decorative images).", suggestion: 'Add alt="Meaningful description" or alt="" if decorative.' });
    }
  });

  // Links
  $("a").each((_, node) => {
    const el = node as Element;
    const name = accessibleName($, el);
    if (el.attribs.href !== undefined && !name) {
      add(ctx, el, { severity: "error", rule: "link-name", message: "Link has no accessible name.", suggestion: "Add link text, aria-label, or an image with alt text." });
    } else if (genericLinkText.test(name)) {
      add(ctx, el, { severity: "warning", rule: "link-text", message: `Link text "${name}" is not descriptive out of context.`, suggestion: "Describe the destination, e.g. \"Read the filing instructions\"." });
    }
    if (el.attribs.target === "_blank" && !/noopener|noreferrer/.test(el.attribs.rel ?? "")) {
      add(ctx, el, { severity: "warning", rule: "link-target-blank", message: 'target="_blank" links should set rel="noopener noreferrer".' });
    }
    if (hasClass(el, "usa-button") && el.attribs.href === undefined) {
      add(ctx, el, { severity: "warning", rule: "button-link-href", message: "A link styled as a button needs an href; use <button> for actions.", component: "button" });
    }
  });

  // Buttons
  $("button").each((_, node) => {
    const el = node as Element;
    if (!accessibleName($, el)) add(ctx, el, { severity: "error", rule: "button-name", message: "Button has no accessible name.", suggestion: "Add visible text or aria-label." });
  });
  $(".usa-button").each((_, node) => {
    const el = node as Element;
    if (tag(el) === "button" && !el.attribs.type) {
      add(ctx, el, { severity: "warning", rule: "button-type", message: "Buttons should declare type to avoid accidental submit behavior.", suggestion: 'Use type="button" for actions or type="submit" for form submission.', component: "button" });
    }
    if (!["button", "a", "input"].includes(tag(el))) {
      add(ctx, el, { severity: "error", rule: "button-element", message: `.usa-button on a <${tag(el)}> is not keyboard accessible.`, suggestion: "Use <button> or <a href>.", component: "button" });
    }
  });

  // Focus
  $("[tabindex]").each((_, node) => {
    const el = node as Element;
    if (Number(el.attribs.tabindex) > 0) add(ctx, el, { severity: "error", rule: "tabindex-positive", message: "Positive tabindex values break natural focus order." });
  });

  // Multiple nav landmarks need distinct labels
  const navs = $("nav").toArray() as Element[];
  if (navs.length > 1) {
    const labels = navs.map((nav) => (nav.attribs["aria-label"] ?? nav.attribs["aria-labelledby"] ?? "").trim());
    navs.forEach((nav, index) => {
      if (!labels[index] || labels.indexOf(labels[index]) !== index) {
        add(ctx, nav, { severity: "warning", rule: "nav-label", message: "Multiple <nav> landmarks need unique aria-label values." });
      }
    });
  }

  // Inline visual styles drift from tokens
  $("[style]").each((_, node) => {
    const el = node as Element;
    if (/(#[0-9a-f]{3,8}|rgb\(|hsl\(|font-size\s*:|margin|padding)/i.test(el.attribs.style ?? "")) {
      add(ctx, el, { severity: "warning", rule: "token-drift", message: "Inline visual styles can drift from USWDS tokens and utilities.", suggestion: "Prefer USWDS utilities, Sass settings, or design tokens." });
    }
  });
}

// ---------------------------------------------------------------------------
// Class vocabulary + BEM structure
// ---------------------------------------------------------------------------

function classRules(ctx: Ctx): void {
  const { $, known } = ctx;

  $("[class]").each((_, node) => {
    const el = node as Element;
    const names = (el.attribs.class ?? "").split(/\s+/).filter(Boolean);

    for (const name of names) {
      const bare = stripVariantPrefix(name);
      const prefixed = /^(usa-|uswds-)/.test(bare);

      if (known && known.size > 0 && !known.has(name)) {
        if (prefixed) {
          const suggestions = suggestClasses(name, known);
          add(ctx, el, {
            severity: "error",
            rule: "unknown-class",
            message: `"${name}" is not a class defined by USWDS.`,
            suggestion: suggestions.length ? `Did you mean ${suggestions.map((s) => `"${s}"`).join(", ")}?` : "Use get_component_markup or find_uswds_classes to find the real class name.",
          });
        } else if (utilityPrefix.test(bare) || name.includes(":")) {
          const suggestions = suggestClasses(name, known);
          add(ctx, el, {
            severity: "warning",
            rule: "unknown-utility",
            message: `"${name}" looks like a USWDS utility but is not defined.`,
            suggestion: suggestions.length ? `Did you mean ${suggestions.map((s) => `"${s}"`).join(", ")}?` : "Use find_uswds_classes to look up utility classes.",
          });
        }
      }

      if (prefixed && !name.includes(":")) {
        const block = bemBlock(name);
        if (!block) continue;
        const startsWithBlock = (cls: string) => cls === block || cls.startsWith(`${block}-`) || cls.startsWith(`${block}__`) || cls.startsWith(`${block}--`);
        if (name.includes("__")) {
          const onSelf = names.some(startsWithBlock);
          const onAncestor = $(el)
            .parents()
            .toArray()
            .some((parent) => ((parent as Element).attribs?.class ?? "").split(/\s+/).some(startsWithBlock));
          if (!onSelf && !onAncestor && !elementBlockExemptions(block, name)) {
            add(ctx, el, {
              severity: "warning",
              rule: "bem-element-orphan",
              message: `"${name}" is a child element of .${block} but no .${block} ancestor was found.`,
              suggestion: `Wrap it in an element with class "${block}" (see get_component_markup).`,
              component: block.replace(/^usa-/, ""),
            });
          }
        } else if (name.includes("--")) {
          // modifier: needs its block on the same element or an ancestor (when the block is a real USWDS class)
          const blockIsRealClass = !known || known.size === 0 || known.has(block);
          const containerVariant = names.some((cls) => cls.startsWith(`${block}-`) && !cls.startsWith(`${block}--`));
          const blockOnAncestor = $(el).closest(`.${block}`).length > 0;
          if (blockIsRealClass && !names.includes(block) && !containerVariant && !blockOnAncestor && block !== "usa-table-container" && name !== "usa-label--required") {
            add(ctx, el, {
              severity: "error",
              rule: "bem-modifier-orphan",
              message: `"${name}" is a modifier and must be used together with "${block}" (on the same element or an ancestor).`,
              suggestion: `Add class "${block}".`,
              component: block.replace(/^usa-/, ""),
            });
          }
        }
      }
    }
  });

  // Responsive grid columns belong in a grid row
  $("[class]").each((_, node) => {
    const el = node as Element;
    const isCol = (el.attribs.class ?? "").split(/\s+/).some((c) => /^(?:[a-z-]+:)?grid-col(-|$)/.test(c) && !/grid-col-(auto|fill)$/.test(c));
    if (!isCol) return;
    const parent = el.parent as Element | null;
    const parentClass = parent?.attribs?.class ?? "";
    if (parent && parent.type === "tag" && !/(^|\s)grid-row(\s|$)/.test(parentClass) && !/usa-/.test(parentClass)) {
      add(ctx, el, { severity: "warning", rule: "grid-orphan", message: "grid-col-* should be a direct child of .grid-row.", suggestion: 'Wrap columns in <div class="grid-row grid-gap">.' });
    }
  });
}

function elementBlockExemptions(block: string, name: string): boolean {
  // The official banner reuses media-block and accordion elements without the block wrapper.
  return block === "usa-media-block" || (block === "usa-accordion" && /banner/.test(name)) || block === "usa-nav";
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

function formRules(ctx: Ctx): void {
  const { $ } = ctx;
  const labelFor = new Map<string, number>();
  $("label[for]").each((_, node) => {
    const id = (node as Element).attribs.for;
    labelFor.set(id, (labelFor.get(id) ?? 0) + 1);
  });

  $("input, select, textarea").each((_, node) => {
    const el = node as Element;
    const type = (el.attribs.type ?? "text").toLowerCase();
    if (nonLabelledInputTypes.has(type)) {
      if ((type === "submit" || type === "button" || type === "reset") && !el.attribs.value && !el.attribs["aria-label"]) {
        add(ctx, el, { severity: "error", rule: "button-name", message: `<input type="${type}"> needs a value or aria-label.` });
      }
      return;
    }
    const id = el.attribs.id;
    const labelled =
      (id && labelFor.has(id)) ||
      $(el).closest("label").length > 0 ||
      (el.attribs["aria-label"] ?? "").trim() !== "" ||
      (el.attribs["aria-labelledby"] ?? "").trim() !== "";
    if (!labelled) {
      add(ctx, el, {
        severity: "error",
        rule: "form-label",
        message: "Every visible form control needs an associated label or accessible name.",
        suggestion: "Add <label class=\"usa-label\" for=\"…\">, a .usa-sr-only label, aria-label, or aria-labelledby.",
        component: "text-input",
      });
    }

    // Component classes
    if (tag(el) === "input" && textLikeTypes.has(type) && !/(usa-input|usa-file-input|usa-combo-box|usa-range)/.test(el.attribs.class ?? "") && !$(el).closest(".usa-date-picker, .usa-time-picker, .usa-combo-box").length) {
      add(ctx, el, { severity: "warning", rule: "form-control-class", message: 'Text inputs should use class="usa-input".', suggestion: 'Add class "usa-input".', component: "text-input" });
    }
    if (tag(el) === "select" && !hasClass(el, "usa-select") && !hasClass(el, "usa-combo-box__select")) {
      add(ctx, el, { severity: "warning", rule: "form-control-class", message: 'Selects should use class="usa-select".', suggestion: 'Add class "usa-select".', component: "select" });
    }
    if (tag(el) === "textarea" && !hasClass(el, "usa-textarea")) {
      add(ctx, el, { severity: "warning", rule: "form-control-class", message: 'Textareas should use class="usa-textarea".', suggestion: 'Add class "usa-textarea".', component: "text-input" });
    }
    if (type === "radio" || type === "checkbox") {
      const kind = type === "radio" ? "radio" : "checkbox";
      const label = id ? $(`label`).filter((__, l) => (l as Element).attribs.for === id).first() : $(el).closest("label");
      if (!hasClass(el, `usa-${kind}__input`) || !label.hasClass(`usa-${kind}__label`) || $(el).closest(`.usa-${kind}`).length === 0) {
        add(ctx, el, {
          severity: "error",
          rule: `${kind}-structure`,
          message: `USWDS ${kind} controls need <div class="usa-${kind}"><input class="usa-${kind}__input"> <label class="usa-${kind}__label">.`,
          suggestion: `Use get_component_markup with component "${kind}".`,
          component: type === "radio" ? "radio-buttons" : "checkbox",
        });
      }
    }
  });

  $("label").each((_, node) => {
    const el = node as Element;
    if (!/usa-(label|sr-only|radio__label|checkbox__label|file-input|checklist)/.test(el.attribs.class ?? "") && !/usa-(radio|checkbox)/.test(($(el).parent().attr("class") ?? ""))) {
      add(ctx, el, { severity: "warning", rule: "label-class", message: 'Form labels should use class="usa-label".', suggestion: 'Add class "usa-label".', component: "text-input" });
    }
  });

  $("fieldset").each((_, node) => {
    const el = node as Element;
    if ($(el).children("legend").length === 0) {
      add(ctx, el, { severity: "error", rule: "fieldset-legend", message: "Related form controls inside a fieldset need a legend.", component: "form" });
    }
  });
  $("legend").each((_, node) => {
    const el = node as Element;
    if (!hasClass(el, "usa-legend")) add(ctx, el, { severity: "warning", rule: "legend-class", message: 'Legends should use class="usa-legend".', component: "form" });
  });

  $("form").each((_, node) => {
    const el = node as Element;
    if ($(el).find("button[type='submit'], input[type='submit'], button:not([type])").length === 0 && $(el).find("input,select,textarea").length > 0) {
      add(ctx, el, { severity: "info", rule: "form-submit", message: "Form has controls but no submit button." });
    }
  });

  $(".usa-search").each((_, node) => {
    const el = node as Element;
    const search = $(el);
    if (el.attribs.role !== "search" && search.find('form[role="search"]').length === 0 && !(tag(el) === "form" && el.attribs.role === "search")) {
      add(ctx, el, { severity: "warning", rule: "search-role", message: 'USWDS search should expose role="search" on the form or search region.', component: "search" });
    }
  });
}

// ---------------------------------------------------------------------------
// Component structure rules (derived from the canonical USWDS markup)
// ---------------------------------------------------------------------------

function componentRules(ctx: Ctx): void {
  const { $ } = ctx;
  const each = (selector: string, fn: (el: Element, node: Selection) => void) =>
    $(selector).each((_, node) => fn(node as Element, $(node) as Selection));

  // Accordion
  each(".usa-accordion__button", (el, button) => {
    if (tag(el) !== "button") add(ctx, el, { severity: "error", rule: "accordion-button-element", message: "Accordion controls should be button elements.", suggestion: 'Use <button type="button" class="usa-accordion__button" ...>.', component: "accordion" });
    if (el.attribs.type !== "button") add(ctx, el, { severity: "error", rule: "accordion-button-type", message: 'Accordion buttons need type="button" to avoid accidental form submission.', suggestion: 'Add type="button".', component: "accordion" });
    if (!el.attribs["aria-controls"]) add(ctx, el, { severity: "error", rule: "accordion-aria-controls", message: "Accordion buttons should reference their content region with aria-controls.", component: "accordion" });
    if (el.attribs["aria-expanded"] === undefined) add(ctx, el, { severity: "error", rule: "accordion-aria-expanded", message: 'Accordion buttons need aria-expanded="true|false".', component: "accordion" });
    const isBanner = hasClass(el, "usa-banner__button") || hasClass(el, "usa-nav__link");
    if (!isBanner && button.closest(".usa-accordion__heading").length === 0) {
      add(ctx, el, { severity: "warning", rule: "accordion-heading", message: "Accordion buttons belong inside a heading (<h2 class=\"usa-accordion__heading\">) to keep the document outline.", component: "accordion" });
    }
    const target = el.attribs["aria-controls"] ? $(`[id="${el.attribs["aria-controls"]}"]`).first() : undefined;
    if (!isBanner && target && target.length && !target.hasClass("usa-accordion__content")) {
      add(ctx, target.get(0), { severity: "error", rule: "accordion-content-class", message: 'The region controlled by an accordion button needs class="usa-accordion__content".', component: "accordion" });
    }
  });

  // Alerts
  each(".usa-alert", (el, alert) => {
    if (alert.children(".usa-alert__body").length === 0) add(ctx, el, { severity: "error", rule: "alert-body", message: "Alerts need a .usa-alert__body wrapper.", component: "alert" });
  });
  each(".usa-site-alert", (el, node) => {
    if (node.find(".usa-alert").length === 0) add(ctx, el, { severity: "error", rule: "site-alert-structure", message: "Site alerts wrap a .usa-alert.", component: "site-alert" });
  });

  // Banner
  each(".usa-banner", (el, banner) => {
    if (!el.attribs["aria-label"]) add(ctx, el, { severity: "error", rule: "banner-label", message: 'The banner needs aria-label="Official website of the United States government".', component: "banner" });
    if (banner.find(".usa-banner__button").length === 0) add(ctx, el, { severity: "error", rule: "banner-structure", message: "The banner is missing its .usa-banner__button toggle.", component: "banner" });
    if (banner.find(".usa-banner__content").length === 0) add(ctx, el, { severity: "error", rule: "banner-structure", message: "The banner is missing its .usa-banner__content region.", component: "banner" });
  });

  // Header / navigation
  each(".usa-header", (el, header) => {
    if (header.find(".usa-nav").length > 0 && header.find(".usa-menu-btn").length === 0) {
      add(ctx, el, { severity: "error", rule: "header-menu-button", message: "Headers with navigation need a .usa-menu-btn for mobile.", component: "header" });
    }
    if (tag(el) !== "header") add(ctx, el, { severity: "warning", rule: "header-element", message: "Use the <header> element for .usa-header.", component: "header" });
  });
  each(".usa-nav", (el) => {
    if (tag(el) !== "nav") add(ctx, el, { severity: "warning", rule: "nav-element", message: "Use the <nav> element for .usa-nav.", component: "header" });
    if (!el.attribs["aria-label"] && !el.attribs["aria-labelledby"]) add(ctx, el, { severity: "warning", rule: "nav-label", message: "Navigation landmarks need an aria-label.", component: "header" });
  });

  // Footer
  each(".usa-footer", (el) => {
    if (tag(el) !== "footer") add(ctx, el, { severity: "warning", rule: "footer-element", message: "Use the <footer> element for .usa-footer.", component: "footer" });
  });

  // Skipnav
  each(".usa-skipnav", (el) => {
    if (tag(el) !== "a" || !el.attribs.href?.startsWith("#")) add(ctx, el, { severity: "error", rule: "skipnav-link", message: "The skipnav must be an <a> with an in-page href (#main-content).", component: "skipnav" });
  });

  // Cards
  each(".usa-card", (el, card) => {
    if (card.children(".usa-card__container").length === 0) add(ctx, el, { severity: "error", rule: "card-container", message: "Cards need a .usa-card__container child.", component: "card" });
    if (card.find(".usa-card__body").length === 0) add(ctx, el, { severity: "warning", rule: "card-body", message: "Cards should have a .usa-card__body.", component: "card" });
    if (tag(el) === "li" && card.closest("ul.usa-card-group").length === 0) add(ctx, el, { severity: "warning", rule: "card-group", message: "Card <li> elements belong in <ul class=\"usa-card-group\">.", component: "card" });
  });

  // Summary box
  each(".usa-summary-box", (el, box) => {
    if (box.find(".usa-summary-box__body").length === 0) add(ctx, el, { severity: "error", rule: "summary-box-body", message: "Summary boxes need a .usa-summary-box__body.", component: "summary-box" });
    if (!el.attribs["aria-labelledby"]) add(ctx, el, { severity: "warning", rule: "summary-box-label", message: "Summary boxes should be labelled by their heading (aria-labelledby).", component: "summary-box" });
  });

  // Process list
  each(".usa-process-list__item", (el) => {
    const parent = el.parent as Element | null;
    if (!parent || !hasClass(parent, "usa-process-list")) add(ctx, el, { severity: "error", rule: "process-list-structure", message: "Process list items belong directly inside .usa-process-list (<ol>).", component: "process-list" });
  });

  // Step indicator
  each(".usa-step-indicator", (el, node) => {
    if (node.find(".usa-step-indicator__segments").length === 0) add(ctx, el, { severity: "error", rule: "step-indicator-structure", message: "Step indicators need .usa-step-indicator__segments.", component: "step-indicator" });
  });

  // Tables
  each("table", (el, table) => {
    if (!hasClass(el, "usa-table") && table.closest(".usa-prose, .usa-table-container--scrollable").length === 0) add(ctx, el, { severity: "warning", rule: "table-class", message: 'Tables should use class="usa-table".', component: "table" });
    if (table.children("caption").length === 0) add(ctx, el, { severity: "warning", rule: "table-caption", message: "Data tables need a <caption>.", component: "table" });
    table.find("th").each((_, th) => {
      const node = th as Element;
      if (!node.attribs.scope && !node.attribs.id && !node.attribs.headers) {
        add(ctx, node, { severity: "warning", rule: "table-scope", message: 'Header cells need scope="col" or scope="row".', component: "table" });
      }
    });
    if (table.find("th").length === 0) add(ctx, el, { severity: "warning", rule: "table-headers", message: "Data tables need <th> header cells.", component: "table" });
  });

  // Modal
  each(".usa-modal", (el) => {
    if (!el.attribs["aria-labelledby"] || !el.attribs["aria-describedby"]) {
      add(ctx, el, { severity: "error", rule: "modal-aria", message: "Modals need aria-labelledby and aria-describedby.", component: "modal" });
    }
  });
  each("[data-open-modal]", (el) => {
    if (!el.attribs["aria-controls"]) add(ctx, el, { severity: "error", rule: "modal-trigger", message: "Modal triggers need aria-controls pointing at the modal id.", component: "modal" });
  });

  // Breadcrumb / pagination / sidenav
  each(".usa-breadcrumb", (el, node) => {
    if (!el.attribs["aria-label"]) add(ctx, el, { severity: "warning", rule: "breadcrumb-label", message: 'Breadcrumbs need aria-label="Breadcrumbs".', component: "breadcrumb" });
    if (node.find(".usa-breadcrumb__list").length === 0) add(ctx, el, { severity: "error", rule: "breadcrumb-structure", message: "Breadcrumbs need an ol.usa-breadcrumb__list.", component: "breadcrumb" });
  });
  each(".usa-pagination", (el) => {
    if (!el.attribs["aria-label"]) add(ctx, el, { severity: "warning", rule: "pagination-label", message: 'Pagination needs aria-label="Pagination".', component: "pagination" });
  });

  // Combo box / date picker / file input
  each(".usa-combo-box", (el, node) => {
    if (node.find("select").length === 0) add(ctx, el, { severity: "error", rule: "combo-box-structure", message: "Combo boxes enhance a <select class=\"usa-select\"> inside .usa-combo-box.", component: "combo-box" });
  });
  each(".usa-date-picker", (el, node) => {
    if (node.find("input").length === 0) add(ctx, el, { severity: "error", rule: "date-picker-structure", message: "Date pickers wrap an input inside .usa-date-picker.", component: "date-picker" });
  });
  each(".usa-file-input", (el) => {
    if (tag(el) !== "input" && $(el).find("input[type=file]").length === 0) add(ctx, el, { severity: "error", rule: "file-input-structure", message: "File inputs use <input type=\"file\" class=\"usa-file-input\">.", component: "file-input" });
  });
}

// ---------------------------------------------------------------------------

export function validateUswdsMarkup(html: string, options: ValidateOptions = {}): ValidationFinding[] {
  const ctx = createContext(html, options);
  documentRules(ctx);
  genericRules(ctx);
  classRules(ctx);
  formRules(ctx);
  componentRules(ctx);

  const order = { error: 0, warning: 1, info: 2 } as const;
  return ctx.findings.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function summarizeValidation(findings: ValidationFinding[]): string {
  if (findings.length === 0) return "No USWDS markup issues found by the static validator.";
  const errors = findings.filter((finding) => finding.severity === "error").length;
  const warnings = findings.filter((finding) => finding.severity === "warning").length;
  const info = findings.filter((finding) => finding.severity === "info").length;
  return `${findings.length} finding(s): ${errors} error(s), ${warnings} warning(s), ${info} info.`;
}
