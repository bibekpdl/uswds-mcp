export interface StructureRecommendationInput {
  agency_type: string;
  service_goal: string;
  audience: string;
  framework?: string;
  constraints?: string;
}

export interface PageGenerationInput {
  page_type: string;
  agency_context: string;
  content_requirements: string;
  framework?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function frameworkNotes(framework?: string): string[] {
  const normalized = framework?.toLowerCase();
  const base = [
    "Install official USWDS assets with @uswds/uswds where the project uses npm.",
    "Keep official USWDS HTML structure and classes as the canonical implementation.",
    "Use uswds-init.min.js in the head and uswds.min.js before the closing body tag when interactive components are present.",
  ];
  if (!normalized) return base;
  if (normalized.includes("react") || normalized.includes("next")) {
    return [...base, "In React/Next.js, convert class to className and preserve ARIA, id, and data attributes exactly."];
  }
  if (normalized.includes("angular")) {
    return [...base, "In Angular, wrap USWDS markup in components only after preserving the documented DOM shape."];
  }
  if (normalized.includes("rails")) {
    return [...base, "In Rails, render USWDS sections as partials or ViewComponents while keeping official class names."];
  }
  if (normalized.includes("drupal")) {
    return [...base, "In Drupal, map templates to Twig while preserving USWDS component structure and assets."];
  }
  return [...base, `For ${framework}, adapt templates without replacing USWDS classes or accessibility attributes.`];
}

export function recommendStructure(input: StructureRecommendationInput) {
  const isForm = /form|apply|application|register|claim|benefit|permit|renew/i.test(input.service_goal);
  const isDocs = /document|policy|guidance|manual|standard|resource/i.test(input.service_goal);
  const primaryTemplate = isForm ? "Form templates" : isDocs ? "Documentation template" : "Landing page or service page template";
  const components = [
    "skipnav",
    "official government banner",
    "header",
    "footer",
    "layout grid",
    isForm ? "form, fieldset, legend, label, input, button, validation, alert" : "card, collection, summary box, button",
    isDocs ? "sidenav, table, process list" : "identifier when required by site policy",
  ];

  return {
    agencyType: input.agency_type,
    serviceGoal: input.service_goal,
    audience: input.audience,
    primaryTemplate,
    recommendedComponents: components,
    pageStructure: [
      "Skipnav",
      "Official government banner",
      "Header with clear agency/service navigation",
      "Main region with one h1 describing the user task",
      isForm ? "Vertical form sections using fieldset and legend for related controls" : "Task-focused content sections using grid and cards/collections",
      "Contextual alerts only for actionable status or warnings",
      "Footer with required agency/service links",
    ],
    accessibilityNotes: [
      "Use semantic heading order and a single h1.",
      "Keep visual order and DOM order aligned.",
      "Use labels for all controls and legends for grouped form questions.",
      "Validate the final implementation in the project context; USWDS component status does not guarantee full Section 508 compliance.",
    ],
    implementationNotes: frameworkNotes(input.framework),
    constraints: input.constraints,
  };
}

export function generatePage(input: PageGenerationInput) {
  const isForm = /form|apply|application|register|claim|benefit|permit|renew/i.test(
    `${input.page_type} ${input.content_requirements}`
  );
  const title = escapeHtml(input.page_type || "Service page");
  const agencyContext = escapeHtml(input.agency_context || "Agency");
  const contentRequirements = escapeHtml(input.content_requirements || "");
  const formSection = isForm
    ? `<form class="usa-form usa-form--large">
  <fieldset class="usa-fieldset">
    <legend class="usa-legend usa-legend--large">Applicant information</legend>
    <p>A red asterisk (<abbr title="required" class="usa-hint usa-hint--required">*</abbr>) indicates a required field.</p>
    <label class="usa-label" for="full-name">Full name <abbr title="required" class="usa-hint usa-hint--required">*</abbr></label>
    <input class="usa-input" id="full-name" name="full-name" type="text" required />
    <label class="usa-label" for="email">Email <abbr title="required" class="usa-hint usa-hint--required">*</abbr></label>
    <input class="usa-input" id="email" name="email" type="email" autocomplete="email" required />
  </fieldset>
  <button class="usa-button" type="submit">Continue</button>
</form>`
    : `<div class="grid-row grid-gap">
  <div class="tablet:grid-col-8">
    <p class="usa-intro">${contentRequirements}</p>
    <a class="usa-button" href="#next-step">Start now</a>
  </div>
  <aside class="tablet:grid-col-4">
    <div class="usa-summary-box" role="region" aria-labelledby="summary-box-key-info">
      <div class="usa-summary-box__body">
        <h2 class="usa-summary-box__heading" id="summary-box-key-info">Key information</h2>
        <div class="usa-summary-box__text">Use this section for eligibility, deadlines, or required documents.</div>
      </div>
    </div>
  </aside>
</div>`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <script src="/assets/uswds/dist/js/uswds-init.min.js"></script>
    <link rel="stylesheet" href="/assets/uswds/dist/css/uswds.min.css" />
  </head>
  <body>
    <a class="usa-skipnav" href="#main-content">Skip to main content</a>
    <section class="usa-banner" aria-label="Official website of the United States government">
      <div class="usa-accordion">
        <header class="usa-banner__header">
          <div class="usa-banner__inner">
            <div class="grid-col-auto">
              <img class="usa-banner__header-flag" src="/assets/uswds/dist/img/us_flag_small.png" alt="" aria-hidden="true" />
            </div>
            <div class="grid-col-fill tablet:grid-col-auto" aria-hidden="true">
              <p class="usa-banner__header-text">An official website of the United States government</p>
              <p class="usa-banner__header-action">Here’s how you know</p>
            </div>
            <button type="button" class="usa-accordion__button usa-banner__button" aria-expanded="false" aria-controls="gov-banner">
              <span class="usa-banner__button-text">Here’s how you know</span>
            </button>
          </div>
        </header>
        <div class="usa-banner__content usa-accordion__content" id="gov-banner">
          <div class="grid-row grid-gap-lg">
            <div class="usa-banner__guidance tablet:grid-col-6">
              <img class="usa-banner__icon usa-media-block__img" src="/assets/uswds/dist/img/icon-dot-gov.svg" alt="" aria-hidden="true" />
              <div class="usa-media-block__body">
                <p><strong>Official websites use .gov</strong><br />A .gov website belongs to an official government organization in the United States.</p>
              </div>
            </div>
            <div class="usa-banner__guidance tablet:grid-col-6">
              <img class="usa-banner__icon usa-media-block__img" src="/assets/uswds/dist/img/icon-https.svg" alt="" aria-hidden="true" />
              <div class="usa-media-block__body">
                <p><strong>Secure .gov websites use HTTPS</strong><br />A lock or https:// means you’ve safely connected to the .gov website.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <header class="usa-header usa-header--basic">
      <div class="usa-nav-container">
        <div class="usa-navbar">
          <div class="usa-logo">
            <em class="usa-logo__text"><a href="/" title="${agencyContext}">${agencyContext}</a></em>
          </div>
          <button type="button" class="usa-menu-btn">Menu</button>
        </div>
        <nav aria-label="Primary navigation" class="usa-nav">
          <button type="button" class="usa-nav__close">
            <img src="/assets/uswds/dist/img/usa-icons/close.svg" role="img" alt="Close" />
          </button>
          <ul class="usa-nav__primary usa-accordion">
            <li class="usa-nav__primary-item"><a href="#main-content" class="usa-nav__link usa-current"><span>Home</span></a></li>
            <li class="usa-nav__primary-item"><a href="#next-step" class="usa-nav__link"><span>Start</span></a></li>
          </ul>
        </nav>
      </div>
    </header>
    <main id="main-content" class="grid-container usa-section">
      <h1>${title}</h1>
      ${formSection}
    </main>
    <footer class="usa-footer">
      <div class="grid-container usa-footer__return-to-top"><a href="#">Return to top</a></div>
      <div class="usa-footer__primary-section">
        <nav class="usa-footer__nav" aria-label="Footer navigation">
          <ul class="grid-row grid-gap">
            <li class="mobile-lg:grid-col-4 usa-footer__primary-content"><a class="usa-footer__primary-link" href="#main-content">Overview</a></li>
            <li class="mobile-lg:grid-col-4 usa-footer__primary-content"><a class="usa-footer__primary-link" href="#next-step">Start</a></li>
            <li class="mobile-lg:grid-col-4 usa-footer__primary-content"><a class="usa-footer__primary-link" href="/">Agency home</a></li>
          </ul>
        </nav>
      </div>
      <div class="usa-footer__secondary-section">
        <div class="grid-container">
          <div class="usa-footer__logo grid-row grid-gap-2">
            <div class="grid-col-auto">
              <p class="usa-footer__logo-heading">${agencyContext}</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
    <script src="/assets/uswds/dist/js/uswds.min.js"></script>
  </body>
</html>`;

  return {
    html,
    implementationNotes: frameworkNotes(input.framework),
    accessibilityNotes: [
      "Review banner, header, and footer links against the agency's information architecture before production.",
      "Run project-specific accessibility tests after adding real content and routes.",
    ],
  };
}
