import { z } from "zod";
import { DEFAULT_ASSET_PATH } from "./markup.js";

/**
 * Compose a full USWDS page from structured sections. Every builder mirrors the canonical
 * markup rendered from the official USWDS twig templates (see `get_component_markup`), and
 * the test-suite verifies the output against the validator and the real USWDS class list.
 */

const link = z.object({ label: z.string().min(1), href: z.string().default("#") });

const field = z.object({
  type: z.enum(["text", "email", "tel", "textarea", "select", "radio", "checkbox", "date"]),
  label: z.string().min(1),
  name: z.string().optional(),
  required: z.boolean().optional(),
  hint: z.string().optional(),
  options: z.array(z.string()).optional(),
});

export const sectionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hero"), heading: z.string(), text: z.string().optional(), cta: link.optional() }),
  z.object({ type: z.literal("content"), heading: z.string().optional(), paragraphs: z.array(z.string()).default([]), bullets: z.array(z.string()).optional() }),
  z.object({ type: z.literal("alert"), variant: z.enum(["info", "warning", "error", "success", "emergency"]).default("info"), heading: z.string().optional(), text: z.string() }),
  z.object({ type: z.literal("summary_box"), heading: z.string(), items: z.array(z.string()).min(1) }),
  z.object({
    type: z.literal("card_group"),
    heading: z.string().optional(),
    cards: z.array(z.object({ heading: z.string(), text: z.string(), link: link.optional() })).min(1),
  }),
  z.object({ type: z.literal("process_list"), heading: z.string().optional(), steps: z.array(z.object({ heading: z.string(), text: z.string() })).min(1) }),
  z.object({ type: z.literal("step_indicator"), heading: z.string().optional(), steps: z.array(z.string()).min(2), current: z.number().int().min(1) }),
  z.object({
    type: z.literal("accordion"),
    heading: z.string().optional(),
    bordered: z.boolean().optional(),
    items: z.array(z.object({ title: z.string(), content: z.string() })).min(1),
  }),
  z.object({
    type: z.literal("table"),
    heading: z.string().optional(),
    caption: z.string(),
    headers: z.array(z.string()).min(1),
    rows: z.array(z.array(z.string())).min(1),
    striped: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("form"),
    legend: z.string(),
    fields: z.array(field).min(1),
    submit_label: z.string().default("Continue"),
    action: z.string().optional(),
  }),
  z.object({ type: z.literal("contact"), heading: z.string().default("Contact us"), lines: z.array(z.string()).min(1) }),
]);

export type Section = z.infer<typeof sectionSchema>;

export const pageSpecSchema = z.object({
  title: z.string().min(1),
  agency: z.string().min(1),
  lang: z.string().default("en"),
  asset_path: z.string().default(DEFAULT_ASSET_PATH),
  nav_links: z.array(link).optional(),
  breadcrumbs: z.array(z.object({ label: z.string(), href: z.string().optional() })).optional(),
  contact: z.object({ phone: z.string().optional(), email: z.string().optional() }).optional(),
  include_identifier: z.boolean().default(true),
  parent_agency: z.string().optional(),
  sections: z.array(sectionSchema).default([]),
});

export type PageSpec = z.input<typeof pageSpecSchema>;

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function safeHref(href: string | undefined): string {
  const value = (href ?? "").trim();
  if (!value) return "#";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return escapeHtml(value);
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return "#";
  return escapeHtml(value);
}

function paragraph(text: string): string {
  return `<p>${escapeHtml(text)}</p>`;
}

function indent(html: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return html
    .split("\n")
    .map((line) => (line ? pad + line : line))
    .join("\n");
}

class Builder {
  placeholders: string[] = [];
  /** Level of the nearest preceding section heading; child headings use level + 1. */
  level = 1;
  private counter = 0;

  child(): number {
    return Math.min(this.level + 1, 6);
  }

  uid(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${this.counter}`;
  }

  placeholder(note: string): void {
    if (!this.placeholders.includes(note)) this.placeholders.push(note);
  }
}

function sectionWrapper(b: Builder, heading: string | undefined, body: string): string {
  if (!heading) return `<section class="usa-section">\n  <div class="grid-container">\n${indent(body, 4)}\n  </div>\n</section>`;
  const id = b.uid("section-heading");
  return `<section class="usa-section" aria-labelledby="${id}">\n  <div class="grid-container">\n    <h2 id="${id}">${escapeHtml(heading)}</h2>\n${indent(body, 4)}\n  </div>\n</section>`;
}

function buildHero(section: Extract<Section, { type: "hero" }>): string {
  const cta = section.cta ? `\n      <a class="usa-button" href="${safeHref(section.cta.href)}">${escapeHtml(section.cta.label)}</a>` : "";
  const text = section.text ? `\n      ${paragraph(section.text)}` : "";
  return `<section class="usa-hero" aria-label="Introduction">
  <div class="grid-container">
    <div class="usa-hero__callout">
      <h1 class="usa-hero__heading">${escapeHtml(section.heading)}</h1>${text}${cta}
    </div>
  </div>
</section>`;
}

function buildContent(b: Builder, section: Extract<Section, { type: "content" }>): string {
  const paragraphs = section.paragraphs.map(paragraph).join("\n");
  const bullets = section.bullets?.length ? `\n<ul class="usa-list">\n${section.bullets.map((item) => `  <li>${escapeHtml(item)}</li>`).join("\n")}\n</ul>` : "";
  return sectionWrapper(b, section.heading, `<div class="usa-prose">\n${indent(`${paragraphs}${bullets}`.trim(), 2)}\n</div>`);
}

function buildAlert(b: Builder, section: Extract<Section, { type: "alert" }>): string {
  const heading = section.heading ? `\n      <h${b.child()} class="usa-alert__heading">${escapeHtml(section.heading)}</h${b.child()}>` : "";
  const role = section.variant === "error" || section.variant === "emergency" ? ' role="alert"' : "";
  return `<section class="usa-section">
  <div class="grid-container">
    <div class="usa-alert usa-alert--${section.variant}"${role}>
      <div class="usa-alert__body">${heading}
        <p class="usa-alert__text">${escapeHtml(section.text)}</p>
      </div>
    </div>
  </div>
</section>`;
}

function buildSummaryBox(b: Builder, section: Extract<Section, { type: "summary_box" }>): string {
  const id = b.uid("summary-box-heading");
  const items = section.items.map((item) => `        <li>${escapeHtml(item)}</li>`).join("\n");
  return sectionWrapper(
    b,
    undefined,
    `<div class="usa-summary-box" role="region" aria-labelledby="${id}">
  <div class="usa-summary-box__body">
    <h2 class="usa-summary-box__heading" id="${id}">${escapeHtml(section.heading)}</h2>
    <div class="usa-summary-box__text">
      <ul class="usa-list">
${items}
      </ul>
    </div>
  </div>
</div>`
  );
}

function buildCards(b: Builder, section: Extract<Section, { type: "card_group" }>): string {
  const cards = section.cards
    .map((card) => {
      const footer = card.link
        ? `\n      <div class="usa-card__footer">\n        <a class="usa-button" href="${safeHref(card.link.href)}">${escapeHtml(card.link.label)}</a>\n      </div>`
        : "";
      return `  <li class="usa-card tablet:grid-col-4">
    <div class="usa-card__container">
      <div class="usa-card__header">
        <h${b.child()} class="usa-card__heading">${escapeHtml(card.heading)}</h${b.child()}>
      </div>
      <div class="usa-card__body">
        ${paragraph(card.text)}
      </div>${footer}
    </div>
  </li>`;
    })
    .join("\n");
  return sectionWrapper(b, section.heading, `<ul class="usa-card-group">\n${cards}\n</ul>`);
}

function buildProcessList(b: Builder, section: Extract<Section, { type: "process_list" }>): string {
  const steps = section.steps
    .map((step) => `  <li class="usa-process-list__item">\n    <h${b.child()} class="usa-process-list__heading">${escapeHtml(step.heading)}</h${b.child()}>\n    ${paragraph(step.text)}\n  </li>`)
    .join("\n");
  return sectionWrapper(b, section.heading, `<ol class="usa-process-list">\n${steps}\n</ol>`);
}

function buildStepIndicator(section: Extract<Section, { type: "step_indicator" }>): string {
  const total = section.steps.length;
  const current = Math.min(section.current, total);
  const segments = section.steps
    .map((label, index) => {
      const position = index + 1;
      const state = position < current ? " usa-step-indicator__segment--complete" : position === current ? " usa-step-indicator__segment--current" : "";
      const aria = position === current ? ' aria-current="true"' : "";
      const sr = position < current ? ' <span class="usa-sr-only">completed</span>' : position > current ? ' <span class="usa-sr-only">not completed</span>' : "";
      return `      <li class="usa-step-indicator__segment${state}"${aria}>\n        <span class="usa-step-indicator__segment-label">${escapeHtml(label)}${sr}</span>\n      </li>`;
    })
    .join("\n");
  return `<section class="usa-section">
  <div class="grid-container">
    <div class="usa-step-indicator" aria-label="progress">
      <ol class="usa-step-indicator__segments">
${segments}
      </ol>
      <div class="usa-step-indicator__header">
        <h2 class="usa-step-indicator__heading">
          <span class="usa-step-indicator__heading-counter">
            <span class="usa-sr-only">Step</span>
            <span class="usa-step-indicator__current-step">${current}</span>
            <span class="usa-step-indicator__total-steps">of ${total}</span>
          </span>
          <span class="usa-step-indicator__heading-text">${escapeHtml(section.steps[current - 1])}</span>
        </h2>
      </div>
    </div>
  </div>
</section>`;
}

function buildAccordion(b: Builder, section: Extract<Section, { type: "accordion" }>): string {
  const prefix = b.uid("accordion");
  const items = section.items
    .map((item, index) => {
      const id = `${prefix}-item-${index + 1}`;
      return `  <h${b.child()} class="usa-accordion__heading">
    <button type="button" class="usa-accordion__button" aria-expanded="false" aria-controls="${id}">${escapeHtml(item.title)}</button>
  </h${b.child()}>
  <div id="${id}" class="usa-accordion__content usa-prose">
    ${paragraph(item.content)}
  </div>`;
    })
    .join("\n");
  const modifier = section.bordered ? " usa-accordion--bordered" : "";
  return sectionWrapper(b, section.heading, `<div class="usa-accordion${modifier}">\n${items}\n</div>`);
}

function buildTable(b: Builder, section: Extract<Section, { type: "table" }>): string {
  const head = section.headers.map((header) => `        <th scope="col">${escapeHtml(header)}</th>`).join("\n");
  const rows = section.rows
    .map((row) => {
      const cells = row
        .map((cell, index) => (index === 0 ? `        <th scope="row">${escapeHtml(cell)}</th>` : `        <td>${escapeHtml(cell)}</td>`))
        .join("\n");
      return `      <tr>\n${cells}\n      </tr>`;
    })
    .join("\n");
  const striped = section.striped ? " usa-table--striped" : "";
  return sectionWrapper(
    b,
    section.heading,
    `<div class="usa-table-container--scrollable" tabindex="0">
  <table class="usa-table${striped}">
    <caption>${escapeHtml(section.caption)}</caption>
    <thead>
      <tr>
${head}
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</div>`
  );
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "field";
}

function buildForm(b: Builder, section: Extract<Section, { type: "form" }>): string {
  const required = (f: { required?: boolean }) => (f.required ? ' <abbr title="required" class="usa-hint usa-hint--required">*</abbr>' : "");
  const anyRequired = section.fields.some((f) => f.required);
  const controls = section.fields
    .map((f) => {
      const name = f.name ? slug(f.name) : slug(f.label);
      const id = b.uid(name);
      const hintId = `${id}-hint`;
      const hint = f.hint ? `\n<div class="usa-hint" id="${hintId}">${escapeHtml(f.hint)}</div>` : "";
      const describedBy = f.hint ? ` aria-describedby="${hintId}"` : "";
      const req = f.required ? " required" : "";
      const label = `<label class="usa-label" for="${id}">${escapeHtml(f.label)}${required(f)}</label>`;
      switch (f.type) {
        case "textarea":
          return `${label}${hint}\n<textarea class="usa-textarea" id="${id}" name="${name}"${describedBy}${req}></textarea>`;
        case "select": {
          const options = (f.options ?? ["Option 1", "Option 2"]).map((o) => `  <option value="${escapeHtml(slug(o))}">${escapeHtml(o)}</option>`).join("\n");
          if (!f.options) b.placeholder(`Select options for "${f.label}"`);
          return `${label}${hint}\n<select class="usa-select" id="${id}" name="${name}"${describedBy}${req}>\n  <option value>- Select -</option>\n${options}\n</select>`;
        }
        case "radio":
        case "checkbox": {
          const kind = f.type;
          const options = f.options ?? ["Option 1", "Option 2"];
          if (!f.options) b.placeholder(`Choices for "${f.label}"`);
          const items = options
            .map((o, index) => {
              const optionId = `${id}-${index + 1}`;
              return `  <div class="usa-${kind}">\n    <input class="usa-${kind}__input" id="${optionId}" type="${kind}" name="${name}" value="${escapeHtml(slug(o))}"${index === 0 && kind === "radio" ? req : ""} />\n    <label class="usa-${kind}__label" for="${optionId}">${escapeHtml(o)}</label>\n  </div>`;
            })
            .join("\n");
          return `<fieldset class="usa-fieldset">\n  <legend class="usa-legend">${escapeHtml(f.label)}${required(f)}</legend>${f.hint ? `\n  <div class="usa-hint">${escapeHtml(f.hint)}</div>` : ""}\n${items}\n</fieldset>`;
        }
        case "date":
          return `${label.replace('class="usa-label"', `class="usa-label" id="${id}-label"`)}\n<div class="usa-hint" id="${hintId}">${f.hint ? escapeHtml(f.hint) : "mm/dd/yyyy"}</div>\n<div class="usa-date-picker">\n  <input class="usa-input" id="${id}" name="${name}" aria-describedby="${id}-label ${hintId}" type="text"${req} />\n</div>`;
        default: {
          const type = f.type;
          const autocomplete = type === "email" ? ' autocomplete="email"' : type === "tel" ? ' autocomplete="tel"' : "";
          return `${label}${hint}\n<input class="usa-input" id="${id}" name="${name}" type="${type}"${autocomplete}${describedBy}${req} />`;
        }
      }
    })
    .join("\n");
  const intro = anyRequired ? `\n    <p>Required fields are marked with an asterisk (<abbr title="required" class="usa-hint usa-hint--required">*</abbr>).</p>` : "";
  return sectionWrapper(
    b,
    undefined,
    `<form class="usa-form usa-form--large" action="${safeHref(section.action)}" method="post">
  <fieldset class="usa-fieldset">
    <legend class="usa-legend usa-legend--large">${escapeHtml(section.legend)}</legend>${intro}
${indent(controls, 4)}
  </fieldset>
  <button class="usa-button" type="submit">${escapeHtml(section.submit_label)}</button>
</form>`
  );
}

function buildContact(b: Builder, section: Extract<Section, { type: "contact" }>): string {
  const lines = section.lines.map((line) => `  <li>${escapeHtml(line)}</li>`).join("\n");
  return sectionWrapper(b, section.heading, `<ul class="usa-list usa-list--unstyled">\n${lines}\n</ul>`);
}

function buildSection(b: Builder, section: Section): string {
  const hasOwnHeading = "heading" in section && Boolean(section.heading);
  if (section.type !== "alert" && section.type !== "hero" && (hasOwnHeading || section.type === "summary_box" || section.type === "step_indicator")) b.level = 2;
  switch (section.type) {
    case "hero":
      return buildHero(section);
    case "content":
      return buildContent(b, section);
    case "alert":
      return buildAlert(b, section);
    case "summary_box":
      return buildSummaryBox(b, section);
    case "card_group":
      return buildCards(b, section);
    case "process_list":
      return buildProcessList(b, section);
    case "step_indicator":
      return buildStepIndicator(section);
    case "accordion":
      return buildAccordion(b, section);
    case "table":
      return buildTable(b, section);
    case "form":
      return buildForm(b, section);
    case "contact":
      return buildContact(b, section);
  }
}

function buildBanner(assets: string): string {
  return `<section class="usa-banner" aria-label="Official website of the United States government">
  <div class="usa-accordion">
    <header class="usa-banner__header">
      <div class="usa-banner__inner">
        <div class="grid-col-auto">
          <img aria-hidden="true" class="usa-banner__header-flag" src="${assets}/img/us_flag_small.png" alt="" />
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
          <img class="usa-banner__icon usa-media-block__img" src="${assets}/img/icon-dot-gov.svg" role="img" alt="" aria-hidden="true" />
          <div class="usa-media-block__body">
            <p><strong>Official websites use .gov</strong><br />A <strong>.gov</strong> website belongs to an official government organization in the United States.</p>
          </div>
        </div>
        <div class="usa-banner__guidance tablet:grid-col-6">
          <img class="usa-banner__icon usa-media-block__img" src="${assets}/img/icon-https.svg" role="img" alt="" aria-hidden="true" />
          <div class="usa-media-block__body">
            <p><strong>Secure .gov websites use HTTPS</strong><br />A <strong>lock</strong> (<span class="icon-lock"><svg xmlns="http://www.w3.org/2000/svg" width="52" height="64" viewBox="0 0 52 64" class="usa-banner__lock-image" role="img" aria-labelledby="banner-lock-description" focusable="false"><title id="banner-lock-title">Lock</title><desc id="banner-lock-description">Locked padlock icon</desc><path fill="#000000" fill-rule="evenodd" d="M26 0c10.493 0 19 8.507 19 19v9h3a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V32a4 4 0 0 1 4-4h3v-9C7 8.507 15.507 0 26 0zm0 8c-5.979 0-10.843 4.77-10.996 10.712L15 19v9h22v-9c0-6.075-4.925-11-11-11z"/></svg></span>) or <strong>https://</strong> means you’ve safely connected to the .gov website. Share sensitive information only on official, secure websites.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

function buildHeader(agency: string, links: Array<{ label: string; href: string }>, assets: string): string {
  const items = links
    .map((item, index) => `        <li class="usa-nav__primary-item">\n          <a href="${safeHref(item.href)}" class="usa-nav__link${index === 0 ? " usa-current" : ""}"><span>${escapeHtml(item.label)}</span></a>\n        </li>`)
    .join("\n");
  return `<div class="usa-overlay"></div>
<header class="usa-header usa-header--basic">
  <div class="usa-nav-container">
    <div class="usa-navbar">
      <div class="usa-logo">
        <em class="usa-logo__text"><a href="/" title="${escapeHtml(agency)}">${escapeHtml(agency)}</a></em>
      </div>
      <button type="button" class="usa-menu-btn">Menu</button>
    </div>
    <nav aria-label="Primary navigation" class="usa-nav">
      <button type="button" class="usa-nav__close">
        <img src="${assets}/img/usa-icons/close.svg" role="img" alt="Close" />
      </button>
      <ul class="usa-nav__primary usa-accordion">
${items}
      </ul>
    </nav>
  </div>
</header>`;
}

function buildFooter(agency: string, links: Array<{ label: string; href: string }>, contact: { phone?: string; email?: string } | undefined): string {
  const items = links
    .map((item) => `          <li class="mobile-lg:grid-col-6 desktop:grid-col-auto usa-footer__primary-content">\n            <a class="usa-footer__primary-link" href="${safeHref(item.href)}">${escapeHtml(item.label)}</a>\n          </li>`)
    .join("\n");
  const contactLines = [
    contact?.phone ? `<a href="tel:${escapeHtml(contact.phone.replace(/[^\d+]/g, ""))}">${escapeHtml(contact.phone)}</a>` : "",
    contact?.email ? `<a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a>` : "",
  ].filter(Boolean);
  const address = contactLines.length
    ? `
        <div class="mobile-lg:grid-col-4">
          <address class="usa-footer__address">
            <div class="grid-row grid-gap">
${contactLines
  .map((line) => `              <div class="grid-col-auto mobile-lg:grid-col-12 desktop:grid-col-auto">\n                <div class="usa-footer__contact-info">${line}</div>\n              </div>`)
  .join("\n")}
            </div>
          </address>
        </div>`
    : "";
  return `<footer class="usa-footer usa-footer--slim">
  <div class="grid-container usa-footer__return-to-top">
    <a href="#main-content">Return to top</a>
  </div>
  <div class="usa-footer__primary-section">
    <div class="usa-footer__primary-container grid-row">
      <div class="${contactLines.length ? "mobile-lg:grid-col-8" : "grid-col-12"}">
        <nav class="usa-footer__nav" aria-label="Footer navigation">
          <ul class="grid-row grid-gap">
${items}
          </ul>
        </nav>
      </div>${address}
    </div>
  </div>
  <div class="usa-footer__secondary-section">
    <div class="grid-container">
      <div class="usa-footer__logo grid-row grid-gap-2">
        <div class="grid-col-auto">
          <p class="usa-footer__logo-heading">${escapeHtml(agency)}</p>
        </div>
      </div>
    </div>
  </div>
</footer>`;
}

function buildIdentifier(agency: string, parent: string): string {
  const required = ["About " + agency, "Accessibility statement", "FOIA requests", "No FEAR Act data", "Office of the Inspector General", "Performance reports", "Privacy policy"];
  const items = required
    .map((label) => `          <li class="usa-identifier__required-links-item">\n            <a href="#" class="usa-identifier__required-link usa-link">${escapeHtml(label)}</a>\n          </li>`)
    .join("\n");
  return `<div class="usa-identifier">
  <section class="usa-identifier__section usa-identifier__section--masthead" aria-label="Agency identifier">
    <div class="usa-identifier__container">
      <section class="usa-identifier__identity" aria-label="Agency description">
        <p class="usa-identifier__identity-domain">agency.gov</p>
        <p class="usa-identifier__identity-disclaimer">An official website of the <a href="#">${escapeHtml(parent)}</a></p>
      </section>
    </div>
  </section>
  <nav class="usa-identifier__section usa-identifier__section--required-links" aria-label="Important links">
    <div class="usa-identifier__container">
      <ul class="usa-identifier__required-links-list">
${items}
      </ul>
    </div>
  </nav>
  <section class="usa-identifier__section usa-identifier__section--usagov" aria-label="U.S. government information and services">
    <div class="usa-identifier__container">
      <div class="usa-identifier__usagov-description">Looking for U.S. government information and services?</div>
      <a href="https://www.usa.gov/" class="usa-link">Visit USA.gov</a>
    </div>
  </section>
</div>`;
}

function buildBreadcrumbs(items: Array<{ label: string; href?: string }>): string {
  const list = items
    .map((item, index) => {
      const last = index === items.length - 1;
      if (last) return `      <li class="usa-breadcrumb__list-item usa-current" aria-current="page">\n        <span>${escapeHtml(item.label)}</span>\n      </li>`;
      return `      <li class="usa-breadcrumb__list-item">\n        <a href="${safeHref(item.href)}" class="usa-breadcrumb__link"><span>${escapeHtml(item.label)}</span></a>\n      </li>`;
    })
    .join("\n");
  return `<div class="grid-container">
  <nav class="usa-breadcrumb" aria-label="Breadcrumbs">
    <ol class="usa-breadcrumb__list">
${list}
    </ol>
  </nav>
</div>`;
}

export interface ComposedPage {
  html: string;
  placeholders: string[];
  assetPath: string;
}

export function composePage(input: PageSpec): ComposedPage {
  const spec = pageSpecSchema.parse(input);
  const b = new Builder();
  const assets = spec.asset_path.replace(/\/+$/, "");

  const navLinks = spec.nav_links?.length
    ? spec.nav_links.map((l) => ({ label: l.label, href: l.href }))
    : (b.placeholder("Primary navigation links (header and footer)"), [{ label: "Home", href: "/" }, { label: "Services", href: "#" }, { label: "Contact", href: "#" }]);

  const hasHero = spec.sections.some((s) => s.type === "hero");
  const body = spec.sections.map((section) => buildSection(b, section)).join("\n");
  const titleBlock = hasHero ? "" : `<div class="grid-container usa-section"><h1>${escapeHtml(spec.title)}</h1></div>\n`;
  const breadcrumbs = spec.breadcrumbs?.length ? `${buildBreadcrumbs(spec.breadcrumbs)}\n` : "";

  if (spec.include_identifier) b.placeholder("Identifier: agency domain, parent agency, and required links");
  if (!spec.contact) b.placeholder("Footer contact details");

  const html = `<!doctype html>
<html lang="${escapeHtml(spec.lang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(spec.title)} | ${escapeHtml(spec.agency)}</title>
    <script src="${assets}/js/uswds-init.min.js"></script>
    <link rel="stylesheet" href="${assets}/css/uswds.min.css" />
  </head>
  <body>
    <a class="usa-skipnav" href="#main-content">Skip to main content</a>
${indent(buildBanner(assets), 4)}
${indent(buildHeader(spec.agency, navLinks, assets), 4)}
    <main id="main-content">
${indent(`${breadcrumbs}${titleBlock}${body}`.trim(), 6)}
    </main>
${indent(buildFooter(spec.agency, navLinks, spec.contact), 4)}
${spec.include_identifier ? `${indent(buildIdentifier(spec.agency, spec.parent_agency ?? spec.agency), 4)}\n` : ""}    <script src="${assets}/js/uswds.min.js"></script>
  </body>
</html>
`;

  return { html, placeholders: b.placeholders, assetPath: assets };
}
