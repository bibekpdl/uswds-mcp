import * as cheerio from "cheerio";

export interface ValidationFinding {
  severity: "error" | "warning" | "info";
  rule: string;
  message: string;
  selector?: string;
  suggestion?: string;
}

export function validateUswdsMarkup(html: string): ValidationFinding[] {
  const $ = cheerio.load(html);
  const findings: ValidationFinding[] = [];

  if ($(".usa-skipnav").length === 0 && $("body").length > 0) {
    findings.push({
      severity: "warning",
      rule: "skipnav",
      message: "Page markup should include a USWDS skipnav link near the top of the body.",
      suggestion: 'Add <a class="usa-skipnav" href="#main-content">Skip to main content</a>.',
    });
  }

  $(".usa-accordion__button").each((index, element) => {
    const button = $(element);
    if (button.prop("tagName")?.toLowerCase() !== "button") {
      findings.push({
        severity: "error",
        rule: "accordion-button-element",
        message: "Accordion controls should be button elements.",
        selector: `.usa-accordion__button:eq(${index})`,
        suggestion: 'Use <button type="button" class="usa-accordion__button" ...>.',
      });
    }
    if (button.attr("type") !== "button") {
      findings.push({
        severity: "error",
        rule: "accordion-button-type",
        message: 'Accordion buttons need type="button" to avoid accidental form submission.',
        selector: `.usa-accordion__button:eq(${index})`,
        suggestion: 'Add type="button".',
      });
    }
    if (!button.attr("aria-controls")) {
      findings.push({
        severity: "error",
        rule: "accordion-aria-controls",
        message: "Accordion buttons should reference their content region with aria-controls.",
        selector: `.usa-accordion__button:eq(${index})`,
      });
    }
  });

  $("input, select, textarea").each((index, element) => {
    const control = $(element);
    const id = control.attr("id");
    const ariaLabel = control.attr("aria-label");
    const ariaLabelledBy = control.attr("aria-labelledby");
    const hasLabel = id ? $(`label[for="${id}"]`).length > 0 : false;
    if (!hasLabel && !ariaLabel && !ariaLabelledBy && control.attr("type") !== "hidden") {
      findings.push({
        severity: "error",
        rule: "form-label",
        message: "Every visible form control needs an associated label or accessible name.",
        selector: `${control.prop("tagName")?.toLowerCase()}:eq(${index})`,
        suggestion: "Add a visible label, .usa-sr-only label, aria-label, or aria-labelledby.",
      });
    }
  });

  $(".usa-search").each((index, element) => {
    const search = $(element);
    if (search.attr("role") !== "search" && search.find('form[role="search"]').length === 0) {
      findings.push({
        severity: "warning",
        rule: "search-role",
        message: 'USWDS search should expose role="search" on the form or search region.',
        selector: `.usa-search:eq(${index})`,
      });
    }
  });

  $("fieldset").each((index, element) => {
    if ($(element).children("legend").length === 0) {
      findings.push({
        severity: "error",
        rule: "fieldset-legend",
        message: "Related form controls inside a fieldset need a legend.",
        selector: `fieldset:eq(${index})`,
      });
    }
  });

  $("[style]").each((index, element) => {
    const style = $(element).attr("style") ?? "";
    if (/(#[0-9a-f]{3,8}|rgb\(|hsl\(|font-size\s*:|margin|padding)/i.test(style)) {
      findings.push({
        severity: "warning",
        rule: "token-drift",
        message: "Inline visual styles can drift from USWDS tokens and utilities.",
        selector: `[style]:eq(${index})`,
        suggestion: "Prefer USWDS utilities, Sass settings, or design tokens.",
      });
    }
  });

  $(".usa-button").each((index, element) => {
    const button = $(element);
    if (button.prop("tagName")?.toLowerCase() === "button" && !button.attr("type")) {
      findings.push({
        severity: "warning",
        rule: "button-type",
        message: "Buttons should declare type to avoid accidental submit behavior.",
        selector: `.usa-button:eq(${index})`,
        suggestion: 'Use type="button" for actions or type="submit" for form submission.',
      });
    }
  });

  if ($(".usa-banner").length === 0 && $("body").length > 0) {
    findings.push({
      severity: "info",
      rule: "official-banner",
      message: "Most federal public sites should include the USWDS official government banner.",
      suggestion: "Use the USWDS banner component unless the project context intentionally omits it.",
    });
  }

  return findings;
}

export function summarizeValidation(findings: ValidationFinding[]): string {
  if (findings.length === 0) return "No USWDS markup issues found by the static validator.";
  const errors = findings.filter((finding) => finding.severity === "error").length;
  const warnings = findings.filter((finding) => finding.severity === "warning").length;
  const info = findings.filter((finding) => finding.severity === "info").length;
  return `${findings.length} finding(s): ${errors} error(s), ${warnings} warning(s), ${info} info.`;
}
