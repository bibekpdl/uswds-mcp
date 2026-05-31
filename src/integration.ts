export interface IntegrationRecipeInput {
  framework: string;
  no_cdn?: boolean;
  migration_scope?: "new-project" | "single-page" | "full-site";
}

export interface ProjectSetupValidationInput {
  framework?: string;
  package_json?: string;
  files?: Record<string, string>;
  file_paths?: string[];
  no_cdn?: boolean;
  migration_scope?: "new-project" | "single-page" | "full-site";
}

export interface ProjectSetupFinding {
  severity: "error" | "warning" | "info";
  rule: string;
  message: string;
  file?: string;
  suggestion?: string;
}

interface Recipe {
  framework: string;
  packageInstall: string[];
  componentStrategy: string[];
  css: string[];
  javascript: string[];
  assets: string[];
  fileStructure: string[];
  migrationNotes: string[];
  validationChecklist: string[];
}

function normalizeFramework(framework: string): string {
  const value = framework.toLowerCase();
  if (value.includes("next")) return "nextjs";
  if (value.includes("vite") || value.includes("react")) return "vite-react";
  if (value.includes("rails")) return "rails";
  if (value.includes("drupal")) return "drupal";
  if (value.includes("html") || value.includes("static")) return "static-html";
  return "generic";
}

const commonChecklist = [
  "Verify skipnav, banner, header, main, and footer are present where required by the page context.",
  "Run validate_uswds_markup against generated HTML before final delivery.",
  "Run project-specific accessibility tests; USWDS component usage does not certify Section 508 compliance.",
  "Confirm fonts, images, icons, and interactive component JavaScript load from the deployed asset paths.",
];

const recipes: Record<string, Recipe> = {
  nextjs: {
    framework: "Next.js App Router",
    packageInstall: ["npm install @uswds/uswds"],
    componentStrategy: [
      "Start from official USWDS HTML/classes, then wrap repeated sections in local React components.",
      "Use third-party React component libraries only when the project intentionally adopts that library as an adapter.",
      "Treat React component libraries as optional adapters; still validate generated output against USWDS markup and project accessibility requirements.",
    ],
    css: [
      'Import the packaged CSS from app/layout.tsx: import "@uswds/uswds/css/uswds.min.css";',
      'Do not import "@uswds/uswds/dist/css/uswds.min.css"; that path is not part of the public package exports in modern bundlers.',
      "Keep custom CSS small and route/component-owned. Prefer USWDS utilities, tokens, and Sass settings for visual adjustments.",
    ],
    javascript: [
      'Copy only needed USWDS JavaScript assets to public/uswds/js, then load init early with next/script: src="/uswds/js/uswds-init.min.js".',
      'Load the main script after interactivity is needed: src="/uswds/js/uswds.min.js".',
      "Use the USWDS scripts for interactive components such as accordion, banner, modal, navigation, tooltip, and file input.",
    ],
    assets: [
      "Prefer the npm package as the source of truth; do not copy the entire USWDS dist directory unless the deployment requires static vendoring.",
      "Copy only assets referenced by the implemented components, such as banner flag and icon files.",
      "Document any asset-copy script so future USWDS upgrades are repeatable.",
    ],
    fileStructure: [
      "app/layout.tsx: global USWDS CSS import and shared shell.",
      "components/uswds/GovBanner.tsx: official banner DOM with className and preserved ARIA.",
      "components/uswds/FederalHeader.tsx: agency header and navigation.",
      "components/uswds/FederalFooter.tsx: footer and required links.",
      "app/[route]/page.tsx: page-specific content and USWDS layout classes.",
    ],
    migrationNotes: [
      "For one-page adoption, check the global CSS impact on existing routes before importing USWDS in the root layout.",
      "If global CSS changes unrelated pages, isolate the USWDS route in a route group with its own layout where the framework allows it.",
      "Convert class to className, but preserve USWDS ids, ARIA attributes, data attributes, and DOM ordering.",
    ],
    validationChecklist: commonChecklist,
  },
  "vite-react": {
    framework: "Vite React",
    packageInstall: ["npm install @uswds/uswds"],
    componentStrategy: [
      "Use official USWDS HTML as the baseline and create local React components for repeated patterns.",
      "A USWDS-based React component library can be considered when the project wants typed component APIs, Storybook-oriented workflow, and reusable components.",
      "When using any adapter, install and configure USWDS first; do not treat the adapter as a replacement for USWDS guidance.",
    ],
    css: [
      'Import the packaged CSS once in src/main.tsx or src/App.tsx: import "@uswds/uswds/css/uswds.min.css";',
      'Do not import "@uswds/uswds/dist/css/uswds.min.css"; use the package export path.',
    ],
    javascript: [
      "Copy needed USWDS scripts from node_modules/@uswds/uswds/dist/js to public/uswds/js.",
      'Reference scripts from index.html using /uswds/js/uswds-init.min.js and /uswds/js/uswds.min.js when interactive components are present.',
    ],
    assets: [
      "Copy only required images/icons to public/uswds/img or let the bundler resolve assets imported by CSS.",
      "Avoid vendoring the whole dist folder for a small page.",
    ],
    fileStructure: [
      "src/main.tsx: USWDS CSS import.",
      "src/components/uswds/: reusable banner, header, footer, and form components.",
      "src/routes or src/pages: page-level USWDS composition.",
    ],
    migrationNotes: [
      "Keep official USWDS HTML as the reference, then convert class to className.",
      "Check global CSS effects if the app already uses another design system or Tailwind.",
    ],
    validationChecklist: commonChecklist,
  },
  "static-html": {
    framework: "Static HTML",
    packageInstall: ["npm install @uswds/uswds"],
    componentStrategy: ["Use official USWDS HTML snippets directly; React component adapters are not relevant for static-only builds."],
    css: ['Reference a local copy of uswds.min.css from @uswds/uswds/dist/css; avoid CDN for production unless policy allows it.'],
    javascript: [
      "Load uswds-init.min.js in the head.",
      "Load uswds.min.js before the closing body tag when interactive components are present.",
    ],
    assets: ["Copy the required dist/img, dist/fonts, and dist/js assets to the published static directory."],
    fileStructure: ["index.html", "assets/uswds/css/", "assets/uswds/js/", "assets/uswds/img/", "assets/uswds/fonts/"],
    migrationNotes: ["Keep USWDS HTML snippets close to the official examples and validate the final page."],
    validationChecklist: commonChecklist,
  },
  rails: {
    framework: "Rails",
    packageInstall: ["npm install @uswds/uswds"],
    componentStrategy: ["Use Rails partials or ViewComponents around official USWDS markup rather than React component adapters."],
    css: ["Import @uswds/uswds/css/uswds.min.css through the app's JavaScript/CSS bundling pipeline."],
    javascript: ["Serve USWDS JavaScript from the asset pipeline or public assets and load it on pages with interactive components."],
    assets: ["Copy only required USWDS image, icon, font, and script assets into the Rails asset pipeline or public directory."],
    fileStructure: [
      "app/views/layouts/application.html.erb: skipnav, banner, CSS/JS hooks.",
      "app/components or app/views/shared: reusable USWDS partials.",
      "app/assets or public/uswds: managed USWDS assets.",
    ],
    migrationNotes: ["Use partials or ViewComponents to preserve the official DOM while avoiding repeated markup."],
    validationChecklist: commonChecklist,
  },
  drupal: {
    framework: "Drupal",
    packageInstall: ["npm install @uswds/uswds"],
    componentStrategy: ["Use Drupal theme libraries and Twig templates around official USWDS markup rather than React component adapters."],
    css: ["Add USWDS CSS through the theme library definition."],
    javascript: ["Add USWDS init and main scripts through the theme library for pages with interactive components."],
    assets: ["Keep USWDS assets in the custom theme or a documented build artifact directory."],
    fileStructure: [
      "themes/custom/[theme]/[theme].libraries.yml: USWDS assets.",
      "themes/custom/[theme]/templates/: Twig templates preserving USWDS DOM.",
      "themes/custom/[theme]/components/: reusable USWDS component templates.",
    ],
    migrationNotes: ["Map official HTML examples to Twig while preserving classes, ids, ARIA, and data attributes."],
    validationChecklist: commonChecklist,
  },
  generic: {
    framework: "Generic web project",
    packageInstall: ["npm install @uswds/uswds"],
    componentStrategy: [
      "Prefer official USWDS markup first.",
      "Choose an adapter only when it matches the project's framework, maintenance model, and accessibility review process.",
    ],
    css: ['Use @uswds/uswds/css/uswds.min.css for npm/bundler projects or a local dist/css copy for static builds.'],
    javascript: ["Load USWDS init and main scripts when using interactive components."],
    assets: ["Use the npm package as the source of truth and copy only required production assets."],
    fileStructure: ["Create reusable banner, header, footer, form, and layout modules around official USWDS markup."],
    migrationNotes: ["Adopt USWDS one workflow at a time and check global CSS impact before site-wide rollout."],
    validationChecklist: commonChecklist,
  },
};

export function getIntegrationRecipe(input: IntegrationRecipeInput): Recipe & { notes: string[] } {
  const key = normalizeFramework(input.framework);
  const recipe = recipes[key] ?? recipes.generic;
  const notes = [
    input.no_cdn
      ? "No-CDN mode: serve USWDS CSS, JavaScript, fonts, images, and icons from the application or build artifact."
      : "CDN may be acceptable for prototypes, but production projects should follow the agency's asset hosting policy.",
    input.migration_scope === "single-page"
      ? "Single-page migration: validate that global USWDS CSS does not unintentionally alter existing pages."
      : "Use official USWDS markup as the canonical reference before framework adaptation.",
  ];
  return { ...recipe, notes };
}

function parsePackageJson(value?: string): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function collectText(input: ProjectSetupValidationInput): Array<{ file: string; text: string }> {
  const files = input.files ?? {};
  return Object.entries(files).map(([file, text]) => ({ file, text }));
}

function hasPackageDependency(packageJson: Record<string, unknown> | undefined, name: string): boolean {
  const dependencyGroups = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
  return dependencyGroups.some((group) => {
    const deps = packageJson?.[group];
    return !!deps && typeof deps === "object" && name in deps;
  });
}

function usesInteractiveComponents(text: string): boolean {
  return /usa-(accordion|banner|modal|nav|tooltip|file-input|date-picker|combo-box)/.test(text);
}

export function validateProjectUswdsSetup(input: ProjectSetupValidationInput): ProjectSetupFinding[] {
  const findings: ProjectSetupFinding[] = [];
  const packageJson = parsePackageJson(input.package_json);
  const files = collectText(input);
  const filePaths = input.file_paths ?? [];
  const framework = normalizeFramework(input.framework ?? "");
  const allText = files.map((file) => file.text).join("\n");

  if (input.package_json && !packageJson) {
    findings.push({
      severity: "error",
      rule: "package-json-parse",
      message: "package_json is not valid JSON.",
      suggestion: "Pass the exact package.json contents so dependency checks can run.",
    });
  }

  if ((framework === "nextjs" || framework === "vite-react" || framework === "generic") && packageJson) {
    if (!hasPackageDependency(packageJson, "@uswds/uswds")) {
      findings.push({
        severity: "warning",
        rule: "missing-uswds-package",
        message: "package.json does not include @uswds/uswds.",
        suggestion: "Install the official package with npm install @uswds/uswds.",
      });
    }
  }

  for (const file of files) {
    if (/(?:import|@import)\s+["']@uswds\/uswds\/dist\/css\/uswds\.min\.css["']/.test(file.text)) {
      findings.push({
        severity: "error",
        rule: "wrong-css-import",
        message: "USWDS CSS is imported from the internal dist path, which can fail package export checks.",
        file: file.file,
        suggestion: 'Use import "@uswds/uswds/css/uswds.min.css"; for npm/bundler projects.',
      });
    }
    if (/https?:\/\/[^"']*(unpkg|jsdelivr|cdnjs|designsystem\.digital\.gov)[^"']*uswds/i.test(file.text) && input.no_cdn) {
      findings.push({
        severity: "warning",
        rule: "cdn-asset",
        message: "USWDS assets are loaded from a CDN while no_cdn is enabled.",
        file: file.file,
        suggestion: "Serve USWDS assets from the application or approved agency asset host.",
      });
    }
    if (/style=\{?\{?[^}\n]*(#[0-9a-f]{3,8}|rgb\(|hsl\(|fontSize|margin|padding)/i.test(file.text)) {
      findings.push({
        severity: "warning",
        rule: "custom-style-drift",
        message: "Inline visual styles can drift from USWDS tokens and utilities.",
        file: file.file,
        suggestion: "Prefer USWDS utility classes, Sass settings, or design tokens.",
      });
    }
  }

  if (framework === "nextjs") {
    const layoutFiles = files.filter((file) => /(^|\/)app\/layout\.(tsx|ts|jsx|js)$/.test(file.file));
    const hasCorrectCssImport = files.some((file) => file.text.includes("@uswds/uswds/css/uswds.min.css"));
    if (!hasCorrectCssImport) {
      findings.push({
        severity: "warning",
        rule: "missing-css-import",
        message: "No Next.js file imports the public USWDS CSS package path.",
        suggestion: 'Import "@uswds/uswds/css/uswds.min.css" from app/layout.tsx or a USWDS route layout.',
      });
    }
    if (layoutFiles.length > 0 && input.migration_scope === "single-page") {
      findings.push({
        severity: "info",
        rule: "global-css-scope",
        message: "USWDS CSS in app/layout applies globally and may affect non-USWDS routes.",
        file: layoutFiles[0].file,
        suggestion: "For progressive migration, test unrelated routes or isolate USWDS routes in a route group layout when practical.",
      });
    }
  }

  if (usesInteractiveComponents(allText)) {
    const hasMainScript = /uswds(\.min)?\.js/.test(allText);
    const hasInitScript = /uswds-init(\.min)?\.js/.test(allText);
    if (!hasInitScript) {
      findings.push({
        severity: "warning",
        rule: "missing-uswds-init-js",
        message: "Interactive USWDS markup is present but uswds-init JavaScript was not detected.",
        suggestion: "Load uswds-init.min.js early for interactive USWDS components.",
      });
    }
    if (!hasMainScript) {
      findings.push({
        severity: "warning",
        rule: "missing-uswds-js",
        message: "Interactive USWDS markup is present but the main USWDS JavaScript was not detected.",
        suggestion: "Load uswds.min.js on pages that use interactive components.",
      });
    }
  }

  if (filePaths.some((path) => /(?:public|assets)\/.*uswds\/dist(?:\/|$)/.test(path))) {
    findings.push({
      severity: "info",
      rule: "full-dist-copy",
      message: "The project appears to include a copied USWDS dist directory.",
      suggestion: "Prefer a documented asset-copy step that copies only required production assets.",
    });
  }

  if (findings.length === 0) {
    findings.push({
      severity: "info",
      rule: "setup-check",
      message: "No USWDS project setup issues were detected from the provided files.",
    });
  }

  return findings;
}
