import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { manifestPath, packagedRecordsPath, recordsPath } from "./paths.js";
import { IndexBundle, Manifest, UswdsRecord, UswdsRecordType } from "./types.js";
import { slugify } from "./text.js";

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

export function resetIndexCache(): void {
  cached = undefined;
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
