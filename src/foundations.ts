import { extractClasses } from "./classes.js";
import { MarkupSnippet } from "./types.js";

/**
 * Form and layout primitives that the official package documents but does not ship as twig
 * templates. Hand-maintained; `foundations.test.ts` verifies every class against the real
 * USWDS stylesheet and the validator, so drift is caught on upgrade.
 */

const required = '<abbr title="required" class="usa-hint usa-hint--required">*</abbr>';

const entries: Array<{ component: string; variant: string; html: string; requiresJavascript?: boolean }> = [
  {
    component: "form",
    variant: "default",
    html: `<form class="usa-form" action="#" method="post">
  <fieldset class="usa-fieldset">
    <legend class="usa-legend usa-legend--large">Sign up for updates</legend>
    <p>Required fields are marked with an asterisk (${required}).</p>
    <label class="usa-label" for="full-name">Full name ${required}</label>
    <input class="usa-input" id="full-name" name="full-name" type="text" autocomplete="name" required />
    <label class="usa-label" for="email">Email address ${required}</label>
    <div class="usa-hint" id="email-hint">We only use this to send you updates.</div>
    <input class="usa-input" id="email" name="email" type="email" autocomplete="email" aria-describedby="email-hint" required />
  </fieldset>
  <button class="usa-button" type="submit">Submit</button>
</form>`,
  },
  {
    component: "input",
    variant: "hint",
    html: `<label class="usa-label" for="input-hint">Date of birth</label>
<div class="usa-hint" id="input-hint-text">For example: 04 28 1986</div>
<input class="usa-input" id="input-hint" name="input-hint" type="text" aria-describedby="input-hint-text" />`,
  },
  {
    component: "input",
    variant: "error",
    html: `<div class="usa-form-group usa-form-group--error">
  <label class="usa-label usa-label--error" for="input-error">Social Security number</label>
  <div class="usa-hint" id="input-error-hint">For example, 123-45-6789</div>
  <span class="usa-error-message" id="input-error-message" role="alert">Enter a valid Social Security number</span>
  <input class="usa-input usa-input--error" id="input-error" name="input-error" type="text" aria-describedby="input-error-hint input-error-message" />
</div>`,
  },
  {
    component: "input",
    variant: "required",
    html: `<label class="usa-label" for="input-required">Email address ${required}</label>
<input class="usa-input" id="input-required" name="input-required" type="email" autocomplete="email" required />`,
  },
  {
    component: "input",
    variant: "widths",
    html: `<label class="usa-label" for="input-zip">ZIP code</label>
<input class="usa-input usa-input--medium" id="input-zip" name="input-zip" type="text" inputmode="numeric" autocomplete="postal-code" />`,
  },
  {
    component: "layout-grid",
    variant: "default",
    html: `<div class="grid-container">
  <div class="grid-row grid-gap">
    <div class="tablet:grid-col-8">
      <p>Main content</p>
    </div>
    <div class="tablet:grid-col-4">
      <p>Supporting content</p>
    </div>
  </div>
</div>`,
  },
  {
    component: "layout-grid",
    variant: "three-up",
    html: `<div class="grid-container">
  <div class="grid-row grid-gap">
    <div class="tablet:grid-col-4"><p>One</p></div>
    <div class="tablet:grid-col-4"><p>Two</p></div>
    <div class="tablet:grid-col-4"><p>Three</p></div>
  </div>
</div>`,
  },
];

export const curatedSnippets: MarkupSnippet[] = entries.map((entry) => ({
  id: `component:${entry.component}:${entry.variant}`,
  kind: "component",
  component: entry.component,
  variant: entry.variant,
  html: entry.html,
  classes: [...extractClasses(entry.html)].sort(),
  requiresJavascript: entry.requiresJavascript ?? false,
  sourcePath: "src/foundations.ts",
  origin: "curated",
}));
