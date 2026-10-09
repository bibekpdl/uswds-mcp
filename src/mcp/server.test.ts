import { beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./server.js";
import { version } from "../version.js";

let client: Client;

async function call(name: string, args: Record<string, unknown> = {}) {
  const result = await client.callTool({ name, arguments: args });
  return result.structuredContent as Record<string, any>;
}

beforeAll(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([createServer().connect(serverTransport), client.connect(clientTransport)]);
});

describe("createServer", () => {
  it("reports the package version", async () => {
    expect(client.getServerVersion()?.version).toBe(version);
  });

  it("exposes every tool, all marked read-only", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name);
    for (const expected of [
      "search_uswds",
      "get_component",
      "get_component_markup",
      "compose_uswds_page",
      "generate_uswds_page",
      "validate_uswds_markup",
      "find_uswds_classes",
      "get_uswds_integration_recipe",
      "validate_uswds_project_setup",
    ]) {
      expect(names).toContain(expected);
    }
    expect(tools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
  });
});

describe("get_component_markup", () => {
  it("returns canonical accordion HTML with the asset path applied", async () => {
    const result = await call("get_component_markup", { component: "accordion" });
    expect(result.snippets[0].html).toContain("usa-accordion__button");
    expect(result.snippets[0].requiresJavascript).toBe(true);
    expect(result.availableVariants).toContain("bordered");
  });

  it("resolves everyday names and variants", async () => {
    const result = await call("get_component_markup", { component: "dropdown" });
    expect(result.component).toBe("select");
    const slim = await call("get_component_markup", { component: "footer", variant: "slim" });
    expect(slim.snippets[0].html).toContain("usa-footer--slim");
    const banner = await call("get_component_markup", { component: "banner", asset_path: "/static/uswds" });
    expect(banner.snippets[0].html).toContain("/static/uswds/img/us_flag_small.png");
  });

  it("suggests alternatives for unknown components and lists the catalogue", async () => {
    const missing = await call("get_component_markup", { component: "carousel" });
    expect(missing.error).toContain("carousel");
    expect(missing.available.length).toBeGreaterThan(30);
    const catalogue = await call("get_component_markup");
    expect(catalogue.components.length).toBeGreaterThan(30);
  });

  it("is included in get_component", async () => {
    const result = await call("get_component", { slug_or_name: "button" });
    expect(result.canonicalMarkup.html).toContain("usa-button");
  });
});

describe("validation loop", () => {
  it("fails invented markup with actionable findings, then passes the fixed version", async () => {
    const bad = await call("validate_uswds_markup", { html: '<div class="usa-alrt"><p>Hi</p></div>' });
    expect(bad.passed).toBe(false);
    expect(JSON.stringify(bad.findings)).toContain("usa-alert");

    const good = await call("validate_uswds_markup", {
      html: '<div class="usa-alert usa-alert--info"><div class="usa-alert__body"><p class="usa-alert__text">Hi</p></div></div>',
    });
    expect(good.passed).toBe(true);
  });

  it("composes a page that passes its own validation", async () => {
    const page = await call("compose_uswds_page", {
      title: "Check eligibility",
      agency: "Example Agency",
      sections: [{ type: "content", heading: "Overview", paragraphs: ["Answer a few questions."] }],
    });
    expect(page.html).toContain("usa-overlay");
    expect(page.validation.findings.filter((f: any) => f.severity === "error")).toEqual([]);
  });

  it("generates a validated page from free text", async () => {
    const page = await call("generate_uswds_page", {
      page_type: "Renew a fishing permit",
      agency_context: "Fish Agency",
      content_requirements: "fees table, steps",
    });
    expect(page.html).toContain("usa-table");
    expect(page.validation.findings.filter((f: any) => f.severity !== "info")).toEqual([]);
  });
});

describe("find_uswds_classes", () => {
  it("finds utilities and reports existence", async () => {
    const result = await call("find_uswds_classes", { query: "margin top 2" });
    expect(result.classes).toContain("margin-top-2");
    expect((await call("find_uswds_classes", { query: "usa-button" })).exists).toBe(true);
  });
});

describe("search", () => {
  it("finds components via everyday vocabulary", async () => {
    const result = await call("search_uswds", { query: "dropdown", types: ["component"] });
    expect(result.results.map((r: any) => r.slug)).toEqual(expect.arrayContaining(["select"]));
  });
});
