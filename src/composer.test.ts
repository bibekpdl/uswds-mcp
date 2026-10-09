import { describe, expect, it } from "vitest";
import axe from "axe-core";
import { JSDOM } from "jsdom";
import { composePage, PageSpec } from "./composer.js";
import { validateUswdsMarkup } from "./validator.js";
import { knownClasses } from "./testing.js";

const everything: PageSpec = {
  title: "Renew your fishing permit",
  agency: "Department of Fish and Wildlife",
  nav_links: [
    { label: "Home", href: "/" },
    { label: "Permits", href: "/permits" },
  ],
  breadcrumbs: [{ label: "Home", href: "/" }, { label: "Permits", href: "/permits" }, { label: "Renew" }],
  contact: { phone: "(800) 555-0199", email: "permits@example.gov" },
  sections: [
    { type: "alert", variant: "warning", heading: "Fee change", text: "Fees change on January 1." },
    { type: "content", heading: "Overview", paragraphs: ["Renew online in about ten minutes."], bullets: ["Have your permit number ready", "Pay by card"] },
    { type: "summary_box", heading: "Key information", items: ["Renew before March 31", "Bring your ID"] },
    { type: "step_indicator", steps: ["Details", "Review", "Pay"], current: 2 },
    { type: "process_list", heading: "How it works", steps: [{ heading: "Sign in", text: "Use your account." }, { heading: "Pay", text: "Pay the fee." }] },
    { type: "table", heading: "Fees", caption: "Permit fees", headers: ["Permit", "Fee"], rows: [["Resident", "$25"], ["Visitor", "$60"]], striped: true },
    { type: "accordion", heading: "Questions", items: [{ title: "Can I renew late?", content: "Yes, with a surcharge." }, { title: "Refunds?", content: "No." }] },
    { type: "card_group", heading: "Related", cards: [{ heading: "Licenses", text: "Hunting licenses.", link: { label: "View licenses", href: "/licenses" } }] },
    {
      type: "form",
      legend: "Renewal details",
      fields: [
        { type: "text", label: "Permit number", required: true, hint: "Found on your card" },
        { type: "email", label: "Email", required: true },
        { type: "tel", label: "Phone" },
        { type: "select", label: "County", options: ["Adams", "Baker"] },
        { type: "radio", label: "Residency", options: ["Resident", "Visitor"], required: true },
        { type: "checkbox", label: "Notifications", options: ["Email", "Text"] },
        { type: "date", label: "Start date" },
        { type: "textarea", label: "Comments" },
      ],
      submit_label: "Renew",
    },
    { type: "contact", lines: ["Phone: (800) 555-0199", "Email: permits@example.gov"] },
  ],
};

describe("composePage", () => {
  const { html, placeholders } = composePage(everything);

  it("produces a page that passes the validator with zero findings", () => {
    const findings = validateUswdsMarkup(html, { knownClasses });
    expect(findings.filter((f) => f.severity !== "info").map((f) => `${f.rule}: ${f.message}`)).toEqual([]);
  });

  it("includes the structural pieces USWDS requires", () => {
    expect(html).toContain('<div class="usa-overlay"></div>');
    expect(html).toContain('lang="en"');
    expect(html).toContain("uswds-init.min.js");
    expect(html).toContain("uswds.min.js");
    expect(html).toContain('<main id="main-content">');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it("uses only real USWDS classes", () => {
    const classes = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)));
    for (const name of classes) expect(knownClasses.has(name), name).toBe(true);
  });

  it("has no duplicate ids", () => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("reports what the caller still has to fill in", () => {
    expect(placeholders.some((p) => /Identifier/.test(p))).toBe(true);
    expect(placeholders.some((p) => /contact/i.test(p))).toBe(false); // contact was provided
    const bare = composePage({ title: "T", agency: "A", sections: [] });
    expect(bare.placeholders.join(" ")).toMatch(/navigation/i);
  });

  it("respects a custom asset path", () => {
    const custom = composePage({ title: "T", agency: "A", asset_path: "/static/vendor/uswds/", sections: [] });
    expect(custom.html).toContain('href="/static/vendor/uswds/css/uswds.min.css"');
  });

  it("uses the hero heading as the single h1 when a hero is present", () => {
    const page = composePage({ title: "Landing", agency: "A", sections: [{ type: "hero", heading: "Welcome", text: "Hi", cta: { label: "Start", href: "/start" } }] });
    expect(page.html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(page.html).toContain("usa-hero__heading");
  });
});

describe("composePage safety", () => {
  it("escapes content and neutralizes unsafe hrefs", () => {
    const page = composePage({
      title: 'Hello <script>alert("x")</script>',
      agency: "A&B",
      nav_links: [{ label: "Bad", href: "javascript:alert(1)" }],
      sections: [{ type: "content", paragraphs: ["<img src=x onerror=alert(1)>"] }],
    });
    expect(page.html).not.toContain("<script>alert");
    expect(page.html).not.toContain("<img src=x");
    expect(page.html).not.toContain("javascript:alert");
  });
});

describe("accessibility (axe-core)", () => {
  it("has no axe violations on the composed page", async () => {
    const { html } = composePage(everything);
    const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
    dom.window.eval(axe.source);
    const results = await (dom.window as unknown as { axe: typeof axe }).axe.run(dom.window.document.documentElement, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: true } },
    });
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});
