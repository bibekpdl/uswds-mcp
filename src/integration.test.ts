import { describe, expect, it } from "vitest";
import { getIntegrationRecipe, validateProjectUswdsSetup } from "./integration.js";

describe("USWDS integration recipes", () => {
  it("returns Next.js guidance with the public CSS package export", () => {
    const recipe = getIntegrationRecipe({
      framework: "Next.js app router",
      no_cdn: true,
      migration_scope: "single-page",
    });

    expect(recipe.framework).toBe("Next.js App Router");
    expect(recipe.css.join(" ")).toContain('@uswds/uswds/css/uswds.min.css');
    expect(recipe.css.join(" ")).toContain("Do not import");
    expect(recipe.componentStrategy.join(" ")).toContain("React component libraries");
    expect(recipe.notes.join(" ")).toContain("No-CDN mode");
    expect(recipe.migrationNotes.join(" ")).toContain("global CSS");
  });
});

describe("validateProjectUswdsSetup", () => {
  it("flags the internal USWDS dist CSS import path", () => {
    const findings = validateProjectUswdsSetup({
      framework: "Next.js",
      package_json: JSON.stringify({ dependencies: { "@uswds/uswds": "^3.13.0" } }),
      files: {
        "app/layout.tsx": 'import "@uswds/uswds/dist/css/uswds.min.css";',
      },
    });

    expect(findings.some((finding) => finding.rule === "wrong-css-import" && finding.severity === "error")).toBe(true);
  });

  it("flags missing USWDS JavaScript when interactive markup is present", () => {
    const findings = validateProjectUswdsSetup({
      framework: "Vite React",
      package_json: JSON.stringify({ dependencies: { "@uswds/uswds": "^3.13.0" } }),
      files: {
        "src/App.tsx": '<button className="usa-accordion__button" type="button" aria-controls="a1">Open</button>',
      },
    });

    expect(findings.some((finding) => finding.rule === "missing-uswds-init-js")).toBe(true);
    expect(findings.some((finding) => finding.rule === "missing-uswds-js")).toBe(true);
  });

  it("accepts a minimal Next.js setup with correct CSS and scripts", () => {
    const findings = validateProjectUswdsSetup({
      framework: "Next.js",
      package_json: JSON.stringify({ dependencies: { "@uswds/uswds": "^3.13.0" } }),
      files: {
        "app/layout.tsx": `
          import "@uswds/uswds/css/uswds.min.css";
          import Script from "next/script";
          export default function RootLayout({ children }) {
            return <html><head><Script src="/uswds/js/uswds-init.min.js" /></head><body>{children}<Script src="/uswds/js/uswds.min.js" /></body></html>;
          }
        `,
        "app/page.tsx": '<section className="usa-banner"></section>',
      },
    });

    expect(findings.some((finding) => finding.severity === "error")).toBe(false);
    expect(findings.some((finding) => finding.rule === "wrong-css-import")).toBe(false);
    expect(findings.some((finding) => finding.rule === "missing-uswds-js")).toBe(false);
  });

  it("flags copied USWDS dist assets", () => {
    const findings = validateProjectUswdsSetup({
      file_paths: ["public/uswds/dist/img/us_flag_small.png"],
    });

    expect(findings.some((finding) => finding.rule === "full-dist-copy")).toBe(true);
  });

});
