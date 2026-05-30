import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataDir, indexDir, manifestPath, packagedRecordsPath, recordsPath, sourceDir } from "../paths.js";
import { IndexBundle, Manifest, UswdsRecord } from "../types.js";
import { cloneOrUpdateSources, sourceRepos } from "./git.js";
import { mergePackageInfo, parsePackageRecords, parseSiteRecords } from "./parser.js";

function countByType(records: UswdsRecord[]): Record<string, number> {
  return records.reduce<Record<string, number>>((counts, record) => {
    counts[record.type] = (counts[record.type] ?? 0) + 1;
    return counts;
  }, {});
}

async function readPackageVersion(uswdsRoot: string): Promise<string | undefined> {
  try {
    const raw = await readFile(path.join(uswdsRoot, "package.json"), "utf8");
    return JSON.parse(raw).version;
  } catch {
    return undefined;
  }
}

export async function buildIndex(options: { updateSources?: boolean } = {}): Promise<IndexBundle> {
  await mkdir(indexDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });

  const commits = options.updateSources === false ? {} : await cloneOrUpdateSources(sourceDir);
  const siteRoot = path.join(sourceDir, "uswds-site");
  const uswdsRoot = path.join(sourceDir, "uswds");

  const [siteRecords, packageRecords, uswdsVersion] = await Promise.all([
    parseSiteRecords(siteRoot),
    parsePackageRecords(uswdsRoot),
    readPackageVersion(uswdsRoot),
  ]);
  const records = mergePackageInfo([...siteRecords, ...packageRecords]).sort((a, b) => a.id.localeCompare(b.id));

  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    sources: sourceRepos.map((repo) => ({
      name: repo.name,
      url: repo.url,
      commit: commits[repo.name],
      version: repo.name === "uswds" ? uswdsVersion : undefined,
    })),
    recordCounts: countByType(records),
  };

  await writeFile(recordsPath, JSON.stringify(records, null, 2));
  await writeFile(packagedRecordsPath, JSON.stringify(records, null, 2));
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  return { records, manifest };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildIndex()
    .then(({ records, manifest }) => {
      process.stderr.write(`Indexed ${records.length} USWDS records at ${manifest.generatedAt}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
      process.exit(1);
    });
}
