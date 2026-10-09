import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import Twig from "twig";
import { MarkupSnippet } from "../types.js";
import { extractClasses } from "../classes.js";

/**
 * Renders the official USWDS twig templates (shipped in @uswds/uswds/packages) with the
 * official JSON fixtures, producing verified, canonical HTML for every component variant.
 */

const ASSET_PLACEHOLDER = "{{USWDS_ASSET_PATH}}";

function normalizeHtml(html: string): string {
  return html
    .replace(/\r/g, "")
    .replace(/class="([^"]*)"/g, (_m, value: string) => `class="${value.replace(/\s+/g, " ").trim()}"`)
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{2,}/g, "\n")
    // Twig artifacts: trailing commas in aria-labels, unescaped placeholder attributes, dead hrefs.
    .replace(/(aria-label="[^"]*?),+"/g, '$1"')
    .replace(/="<([^">]*)>"/g, '="&lt;$1&gt;"')
    .replace(/href="(?:javascript:void\([^)]*\);?)?"/g, 'href="#"')
    // Fixture artifacts: untyped buttons and icon-only close buttons with empty alt text.
    .replace(/(<button\b[^>]*?)\btype=""/g, '$1type="button"')
    .replace(/(class="usa-nav__close">\s*<img[^>]*?)alt=""/g, '$1alt="Close"')
    .replace(/(src|href)="(?:\.{0,2}\/)*(?:assets\/)?(img|fonts|js|css)\//g, `$1="${ASSET_PLACEHOLDER}/$2/`)
    .trim();
}

function readJson(file: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function variantFromNames(twigBase: string, jsonBase: string): string {
  const parts: string[] = [];
  const twigMod = /--(.+)$/.exec(twigBase)?.[1];
  if (twigMod) parts.push(twigMod);
  const jsonMod = /~(.+)$/.exec(jsonBase)?.[1];
  if (jsonMod) parts.push(jsonMod);
  return parts.length ? parts.join("+") : "default";
}

function candidateJson(dir: string, base: string, packageBase: string): string[] {
  const found = fg.sync([`${base}.json`, `${base}~*.json`, `content/${base}.json`, `content/${base}~*.json`], { cwd: dir, absolute: true });
  if (found.length) return found.sort();
  // Variant templates (e.g. usa-footer--slim) fall back to the package's default content.
  const parent = path.dirname(dir);
  const fallback = fg.sync([`${packageBase}.json`, `content/${packageBase}.json`, `../content/${packageBase}.json`], { cwd: dir, absolute: true });
  if (fallback.length) return fallback.sort();
  return fg.sync([`${packageBase}.json`, `content/${packageBase}.json`], { cwd: parent, absolute: true }).sort();
}

export async function buildMarkupSnippets(uswdsRoot: string): Promise<MarkupSnippet[]> {
  const packagesDir = path.join(uswdsRoot, "packages");
  const namespaces = { components: packagesDir, templates: path.join(packagesDir, "templates") };
  Twig.cache(false);

  const twigFiles = await fg(["usa-*/src/**/*.twig", "templates/**/*.twig"], {
    cwd: packagesDir,
    absolute: true,
    ignore: ["**/test/**", "**/_*.twig", "**/_includes/**", "**/includes/**"],
  });

  const snippets: MarkupSnippet[] = [];
  const seen = new Set<string>();

  for (const file of twigFiles.sort()) {
    const rel = path.relative(packagesDir, file).split(path.sep);
    const isTemplate = rel[0] === "templates";
    const base = path.basename(file, ".twig");
    const dir = path.dirname(file);
    const packageName = isTemplate ? base : rel[0];
    const packageBase = isTemplate ? base : packageName;
    const component = (isTemplate ? base : base.replace(/--.*$/, "")).replace(/^usa-/, "");

    const jsonFiles = candidateJson(dir, base, packageBase);
    const inputs = jsonFiles.length ? jsonFiles : [undefined];

    for (const jsonFile of inputs) {
      let html: string;
      try {
        const template = Twig.twig({ path: file, async: false, rethrow: true, namespaces } as unknown as Parameters<typeof Twig.twig>[0]);
        html = normalizeHtml(String(template.render(jsonFile ? readJson(jsonFile) : {})));
      } catch {
        continue;
      }
      if (!html || html.length < 20) continue;

      const jsonBase = jsonFile ? path.basename(jsonFile, ".json") : base;
      const variant = variantFromNames(base, jsonBase);
      const id = `${isTemplate ? "template" : "component"}:${component}:${variant}`;
      if (seen.has(id)) continue;
      seen.add(id);

      const hasJavascript = !isTemplate && existsSync(path.join(packagesDir, packageName, "src", "index.js"));
      snippets.push({
        id,
        kind: isTemplate ? "page-template" : "component",
        component,
        variant,
        package: isTemplate ? undefined : packageName,
        html,
        classes: [...extractClasses(html)].sort(),
        requiresJavascript: hasJavascript,
        sourcePath: path.join("packages", ...rel),
        origin: "uswds",
      });
    }
  }

  return snippets.sort((a, b) => a.id.localeCompare(b.id));
}
