import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { classesPath, manifestPath, markupPath, packagedRecordsPath, recordsPath } from "./paths.js";
import { ClassIndex, IndexBundle, Manifest, MarkupSnippet, UswdsRecord, UswdsRecordType } from "./types.js";
import { slugify } from "./text.js";
import { curatedSnippets } from "./foundations.js";

let cached: IndexBundle | undefined;

const emptyManifest: Manifest = {
  generatedAt: null,
  sources: [],
  recordCounts: {},
};

export async function loadIndex(): Promise<IndexBundle> {
  if (cached) return cached;
  const readableRecordsPath = existsSync(packagedRecordsPath) ? packagedRecordsPath : recordsPath;
  if (!existsSync(readableRecordsPath)) {
    cached = { records: [], manifest: emptyManifest };
    return cached;
  }
  const [recordsRaw, manifestRaw] = await Promise.all([
    readFile(readableRecordsPath, "utf8"),
    existsSync(manifestPath) ? readFile(manifestPath, "utf8") : Promise.resolve(JSON.stringify(emptyManifest)),
  ]);
  cached = {
    records: JSON.parse(recordsRaw) as UswdsRecord[],
    manifest: JSON.parse(manifestRaw) as Manifest,
  };
  return cached;
}

let cachedMarkup: MarkupSnippet[] | undefined;
let cachedClasses: { index: ClassIndex; set: Set<string> } | undefined;

export async function loadMarkup(): Promise<MarkupSnippet[]> {
  if (cachedMarkup) return cachedMarkup;
  const generated = existsSync(markupPath) ? (JSON.parse(await readFile(markupPath, "utf8")) as MarkupSnippet[]) : [];
  const taken = new Set(generated.map((snippet) => snippet.id));
  cachedMarkup = [...generated, ...curatedSnippets.filter((snippet) => !taken.has(snippet.id))];
  return cachedMarkup;
}

export async function loadClassIndex(): Promise<{ index: ClassIndex; set: Set<string> }> {
  if (cachedClasses) return cachedClasses;
  const index: ClassIndex = existsSync(classesPath)
    ? (JSON.parse(await readFile(classesPath, "utf8")) as ClassIndex)
    : { classes: [] };
  cachedClasses = { index, set: new Set(index.classes) };
  return cachedClasses;
}

export function resetIndexCache(): void {
  cached = undefined;
  cachedMarkup = undefined;
  cachedClasses = undefined;
}

export async function getRecord(type: UswdsRecordType, slugOrName: string): Promise<UswdsRecord | undefined> {
  const { records } = await loadIndex();
  const normalized = slugify(slugOrName);
  return records.find(
    (record) =>
      record.type === type &&
      (record.slug === normalized ||
        slugify(record.title) === normalized ||
        record.package?.name === slugOrName ||
        record.package?.name === normalized)
  );
}

export async function getResourceRecord(kind: string, value: string): Promise<UswdsRecord | undefined> {
  const typeMap: Record<string, UswdsRecordType> = {
    component: "component",
    pattern: "pattern",
    template: "template",
    token: "token",
    package: "package",
  };
  const type = typeMap[kind];
  if (!type) return undefined;
  return getRecord(type, value);
}
