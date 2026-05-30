import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";
import { UswdsRecord, UswdsRecordType, Section, PackageInfo } from "../types.js";
import { cleanWhitespace, slugify, stripLiquid, summarize, titleFromSlug, toPlainText, unique } from "../text.js";

const collectionTypes: Array<[RegExp, UswdsRecordType]> = [
  [/[/\\]_components[/\\]/, "component"],
  [/[/\\]_patterns[/\\]/, "pattern"],
  [/[/\\]_templates[/\\]/, "template"],
  [/[/\\]_utilities[/\\]/, "utility"],
  [/[/\\]design-tokens[/\\]/, "token"],
  [/[/\\]documentation[/\\]settings[/\\]/, "setting"],
];

const collectionDirs: Record<UswdsRecordType, string> = {
  component: "_components",
  pattern: "_patterns",
  template: "_templates",
  utility: "_utilities",
  token: "design-tokens",
  setting: "documentation/settings",
  package: "",
  accessibility_test: "",
  implementation_reference: "",
};

export function inferRecordType(filePath: string): UswdsRecordType | undefined {
  return collectionTypes.find(([pattern]) => pattern.test(filePath))?.[1];
}

function parseMatterSafe(raw: string): { data: Record<string, unknown>; content: string } {
  try {
    const parsed = matter(raw);
    return { data: parsed.data as Record<string, unknown>, content: parsed.content };
  } catch {
    const match = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/m.exec(raw);
    if (!match) return { data: {}, content: raw };
    const data: Record<string, unknown> = {};
    for (const line of match[1].split(/\r?\n/)) {
      const pair = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
      if (!pair || data[pair[1]] !== undefined) continue;
      data[pair[1]] = pair[2].replace(/^["']|["']$/g, "");
    }
    return { data, content: match[2] };
  }
}

function nestedString(data: Record<string, unknown>, pathParts: string[]): string | undefined {
  let value: unknown = data;
  for (const part of pathParts) {
    if (!value || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return typeof value === "string" ? value : undefined;
}

function frontmatterList(data: Record<string, unknown>, key: string): string[] {
  const value = data[key];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const object = item as Record<string, unknown>;
        return [object.variant, object.description].filter((part) => typeof part === "string").join(" - ");
      }
      return "";
    })
    .filter(Boolean);
}

function collectionSlug(relative: string, type: UswdsRecordType, data: Record<string, unknown>): string {
  const explicit = typeof data.slug === "string" ? data.slug : undefined;
  if (explicit) return slugify(explicit);

  const normalized = relative.split(path.sep).join("/");
  const collectionDir = collectionDirs[type];
  if (collectionDir && normalized.startsWith(`${collectionDir}/`)) {
    const remainder = normalized.slice(collectionDir.length + 1).split("/");
    if (type === "component") return slugify(remainder[0]);
    if (type === "pattern") return slugify(remainder[0]);
    if (type === "template" && remainder[0] === "form-templates") return slugify(remainder[0]);
    if (type === "template" && remainder[0] === "page-templates" && remainder[1]) return slugify(remainder[1]);
    if (remainder[0]) return slugify(remainder[0].replace(/\.(md|html)$/, ""));
  }

  return slugify(path.basename(relative).replace(/\.(md|html)$/, ""));
}

function isPrimaryCollectionPage(relative: string, type: UswdsRecordType, slug: string): boolean {
  const normalized = relative.split(path.sep).join("/");
  const base = path.basename(normalized).replace(/\.(md|html)$/, "");
  if (base === slug || base === "index") return true;
  if (type === "template" && ["form-templates", "overview", "documentation", "landing"].includes(base)) return true;
  return false;
}

function mergeRecords(records: UswdsRecord[]): UswdsRecord[] {
  const byId = new Map<string, UswdsRecord>();
  for (const record of records) {
    const existing = byId.get(record.id);
    if (!existing) {
      byId.set(record.id, record);
      continue;
    }

    const primary = record.tags?.includes("primary") ? record : existing;
    const secondary = primary === record ? existing : record;
    byId.set(record.id, {
      ...primary,
      summary: primary.summary || secondary.summary,
      body: [primary.body, secondary.body].filter(Boolean).join("\n\n"),
      sections: [...primary.sections, ...secondary.sections],
      sourcePath: primary.sourcePath,
      sourceUrl: primary.sourceUrl,
      package: primary.package ?? secondary.package,
      relatedPackages: unique([...(primary.relatedPackages ?? []), ...(secondary.relatedPackages ?? [])]),
      variants: unique([...(primary.variants ?? []), ...(secondary.variants ?? [])]),
      settings: unique([...(primary.settings ?? []), ...(secondary.settings ?? [])]),
      whenToUse: unique([...(primary.whenToUse ?? []), ...(secondary.whenToUse ?? [])]),
      whenNotToUse: unique([...(primary.whenNotToUse ?? []), ...(secondary.whenNotToUse ?? [])]),
      usabilityGuidance: unique([...(primary.usabilityGuidance ?? []), ...(secondary.usabilityGuidance ?? [])]),
      accessibilityGuidance: unique([...(primary.accessibilityGuidance ?? []), ...(secondary.accessibilityGuidance ?? [])]),
      latestUpdates: [...(primary.latestUpdates ?? []), ...(secondary.latestUpdates ?? [])],
      examples: unique([...(primary.examples ?? []), ...(secondary.examples ?? [])]).slice(0, 10),
      tags: unique([...(primary.tags ?? []), ...(secondary.tags ?? [])]).filter((tag) => tag !== "primary"),
    });
  }
  return [...byId.values()];
}

function extractSections(content: string): Section[] {
  const lines = stripLiquid(content).split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | undefined;

  for (const line of lines) {
    const match = /^(#{2,4})\s+(.+?)\s*$/.exec(line);
    if (match) {
      if (current) sections.push({ ...current, content: cleanWhitespace(current.content) });
      current = { heading: cleanWhitespace(match[2].replace(/#+$/, "")), content: "" };
    } else if (current) {
      current.content += `${line}\n`;
    }
  }

  if (current) sections.push({ ...current, content: cleanWhitespace(current.content) });
  return sections.filter((section) => section.content.length > 0);
}

function bulletsFromSection(sections: Section[], headingPattern: RegExp): string[] {
  const section = sections.find((item) => headingPattern.test(item.heading));
  if (!section) return [];
  return unique(
    section.content
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => /^[-*]\s+/.test(line))
      .map((line) => toPlainText(line.replace(/^[-*]\s+/, "")))
      .filter(Boolean)
  );
}

function bulletsFromMarkdown(content: string): string[] {
  return unique(
    content
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => /^[-*]\s+/.test(line))
      .map((line) => toPlainText(line.replace(/^[-*]\s+/, "")))
      .filter(Boolean)
  );
}

function guidanceBullets(relative: string, guidanceName: string, body: string): string[] {
  const normalized = relative.split(path.sep).join("/");
  return normalized.includes(`/guidance/${guidanceName}.`) ? bulletsFromMarkdown(body) : [];
}

function tableValuesFromSection(sections: Section[], headingPattern: RegExp, firstColumnPrefix = ""): string[] {
  const section = sections.find((item) => headingPattern.test(item.heading));
  if (!section) return [];
  return unique(
    section.content
      .split(/\n/)
      .filter((line) => line.includes("|") && !/^[-|\s]+$/.test(line))
      .map((line) => line.split("|").map((part) => toPlainText(part.trim())).filter(Boolean))
      .filter((cells) => cells.length > 0 && !/^(variant|variable|date|name)$/i.test(cells[0]))
      .map((cells) => (firstColumnPrefix ? `${firstColumnPrefix}${cells[0]}: ${cells.slice(1).join(" - ")}` : cells.join(" - ")))
  );
}

function extractCodeExamples(content: string): string[] {
  return unique([...content.matchAll(/```(?:html|markup|twig)?\s*([\s\S]*?)```/gi)].map((match) => match[1].trim()).filter(Boolean)).slice(0, 5);
}

function packageFromSections(sections: Section[]): Pick<PackageInfo, "usage" | "dependencies"> {
  const packageSection = sections.find((item) => /^package$/i.test(item.heading));
  const text = packageSection?.content ?? "";
  const usage = /Package usage:\s*`([^`]+)`/i.exec(text)?.[1];
  const depsLine = /Dependencies:\s*([^\n]+)/i.exec(text)?.[1] ?? "";
  const dependencies = unique([...depsLine.matchAll(/`([^`]+)`/g)].map((match) => match[1]));
  return { usage, dependencies };
}

function latestUpdates(sections: Section[]) {
  const updates = tableValuesFromSection(sections, /^latest updates$/i);
  return updates.map((description) => ({ description }));
}

function docUrlFromPermalink(data: Record<string, unknown>, type: UswdsRecordType, slug: string): string | undefined {
  const permalink = typeof data.permalink === "string" ? data.permalink : undefined;
  if (permalink) return new URL(permalink, "https://designsystem.digital.gov").href;
  if (type === "component") return `https://designsystem.digital.gov/components/${slug}/`;
  if (type === "pattern") return `https://designsystem.digital.gov/patterns/${slug}/`;
  if (type === "template") return `https://designsystem.digital.gov/templates/${slug}/`;
  if (type === "token") return `https://designsystem.digital.gov/design-tokens/${slug}/`;
  return undefined;
}

export async function parseSiteRecords(siteRoot: string): Promise<UswdsRecord[]> {
  const files = await fg(["**/*.{md,html}"], {
    cwd: siteRoot,
    absolute: true,
    ignore: ["_site/**", "node_modules/**", ".git/**", "vendor/**"],
  });

  const records: UswdsRecord[] = [];
  for (const file of files) {
    const type = inferRecordType(file);
    if (!type) continue;

    const raw = await readFile(file, "utf8");
    const parsed = parseMatterSafe(raw);
    const data = parsed.data;
    const relative = path.relative(siteRoot, file);
    const slug = collectionSlug(relative, type, data);
    const isPrimary = isPrimaryCollectionPage(relative, type, slug);
    const title = String(data.title ?? data.name ?? titleFromSlug(slug));
    const body = cleanWhitespace(parsed.content);
    const sections = extractSections(body);
    const packageInfo = packageFromSections(sections);
    const componentPackage = nestedString(data, ["component", "package"]);
    const componentDependencies = Array.isArray((data.component as Record<string, unknown> | undefined)?.dependencies)
      ? ((data.component as Record<string, unknown>).dependencies as unknown[]).filter((item): item is string => typeof item === "string")
      : [];

    const whenToUse = unique([...bulletsFromSection(sections, /^when to use/i), ...guidanceBullets(relative, "when-to-use", body)]);
    const whenNotToUse = unique([
      ...bulletsFromSection(sections, /^when to consider/i),
      ...guidanceBullets(relative, "when-to-consider-something-else", body),
    ]);
    const usabilityGuidance = unique([
      ...bulletsFromSection(sections, /^usability guidance$/i),
      ...guidanceBullets(relative, "usability", body),
    ]);
    const accessibilityGuidance = unique([
      ...bulletsFromSection(sections, /^accessibility guidance$/i),
      ...guidanceBullets(relative, "accessibility", body),
    ]);

    records.push({
      id: `${type}:${slug}`,
      type,
      slug,
      title,
      summary: summarize(String(data.description ?? data.lede ?? body)),
      body: toPlainText(body),
      sections,
      docUrl: docUrlFromPermalink(data, type, slug),
      sourcePath: relative,
      sourceUrl: `https://github.com/uswds/uswds-site/blob/develop/${relative}`,
      package: type === "component" ? { name: componentPackage ?? `usa-${slug}`, dependencies: unique([...packageInfo.dependencies, ...componentDependencies]), usage: packageInfo.usage, hasJavascript: false, hasSass: false, hasTwig: false } : undefined,
      relatedPackages: unique([...packageInfo.dependencies, ...componentDependencies]),
      variants: unique([...frontmatterList(data, "variants"), ...tableValuesFromSection(sections, /variants$/i, "")]),
      settings: tableValuesFromSection(sections, /settings$/i, ""),
      whenToUse,
      whenNotToUse,
      usabilityGuidance,
      accessibilityGuidance,
      latestUpdates: latestUpdates(sections),
      examples: extractCodeExamples(body),
      tags: unique([type, slug, ...(isPrimary ? ["primary"] : []), ...(packageInfo.dependencies ?? []), ...componentDependencies]),
    });
  }

  return mergeRecords(records);
}

export async function parsePackageRecords(uswdsRoot: string): Promise<UswdsRecord[]> {
  const packageDirs = await fg(["packages/*"], { cwd: uswdsRoot, onlyDirectories: true, absolute: true });
  const records: UswdsRecord[] = [];

  for (const dir of packageDirs) {
    const name = path.basename(dir);
    const relative = path.relative(uswdsRoot, dir);
    const files = await fg(["**/*"], { cwd: dir, onlyFiles: true, dot: false });
    const readme = files.find((file) => /^readme\.md$/i.test(file));
    const readmeBody = readme ? await readFile(path.join(dir, readme), "utf8") : "";
    const hasJavascript = files.some((file) => /src[/\\]index\.js$/.test(file));
    const hasSass = files.some((file) => /(_index|index|component)\.scss$/.test(file) || /src[/\\]styles[/\\].+\.scss$/.test(file));
    const hasTwig = files.some((file) => file.endsWith(".twig"));
    const dependencies = unique(
      files
        .filter((file) => file.endsWith(".scss"))
        .flatMap((file) => file.match(/usa-[a-z0-9-]+|uswds-[a-z0-9-]+/g) ?? [])
        .filter((dep) => dep !== name)
    );

    records.push({
      id: `package:${name}`,
      type: "package",
      slug: name,
      title: name,
      summary: readmeBody ? summarize(readmeBody) : `USWDS package ${name}.`,
      body: readmeBody ? toPlainText(readmeBody) : files.join("\n"),
      sections: readmeBody ? extractSections(readmeBody) : [],
      sourcePath: relative,
      sourceUrl: `https://github.com/uswds/uswds/blob/develop/${relative}`,
      package: {
        name,
        usage: `@forward "${name}";`,
        dependencies,
        hasJavascript,
        hasSass,
        hasTwig,
        sourcePath: relative,
      },
      relatedPackages: dependencies,
      tags: unique(["package", name, ...dependencies]),
    });
  }

  return records;
}

export function mergePackageInfo(records: UswdsRecord[]): UswdsRecord[] {
  const packageMap = new Map(records.filter((record) => record.type === "package").map((record) => [record.slug, record]));
  return records.map((record) => {
    if (record.type !== "component") return record;
    const candidateNames = [record.package?.name, `usa-${record.slug}`, record.slug].filter(Boolean) as string[];
    const matched = candidateNames.map((name) => packageMap.get(name)).find(Boolean);
    if (!matched?.package) return record;
    return {
      ...record,
      package: {
        ...matched.package,
        usage: record.package?.usage ?? matched.package.usage,
        dependencies: unique([...(record.package?.dependencies ?? []), ...matched.package.dependencies]),
      },
      relatedPackages: unique([...(record.relatedPackages ?? []), ...matched.package.dependencies]),
    };
  });
}
