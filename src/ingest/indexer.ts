import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { classesPath, dataDir, fromRoot, indexDir, manifestPath, markupPath, packagedRecordsPath, recordsPath, sourceDir } from "../paths.js";
import { IndexBundle, Manifest, UswdsRecord } from "../types.js";
import { extractClassesFromCss } from "../classes.js";
import { buildMarkupSnippets } from "./markup.js";
import { cloneOrUpdateSources, readSourceCommits, sourceRepos } from "./git.js";
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

  const commits = options.updateSources === false ? await readSourceCommits(sourceDir) : await cloneOrUpdateSources(sourceDir);
  const siteRoot = path.join(sourceDir, "uswds-site");
  const uswdsRoot = path.join(sourceDir, "uswds");

  const [siteRecords, packageRecords, uswdsVersion] = await Promise.all([
    parseSiteRecords(siteRoot),
    parsePackageRecords(uswdsRoot),
    readPackageVersion(uswdsRoot),
  ]);
  const npmRoot = fromRoot("node_modules", "@uswds", "uswds");
  const npmVersion = await readPackageVersion(npmRoot);
  const snippets = await buildMarkupSnippets(npmRoot);
  const css = await readFile(path.join(npmRoot, "dist", "css", "uswds.css"), "utf8");
  // Official markup also uses structural hook classes that have no CSS rule of their own.
  const classes = [...new Set([...extractClassesFromCss(css), ...snippets.flatMap((snippet) => snippet.classes)])].sort();
  const records = mergePackageInfo([...siteRecords, ...packageRecords]).sort((a, b) => a.id.localeCompare(b.id));

  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    sources: sourceRepos.map((repo) => ({
      name: repo.name,
      url: repo.url,
      commit: commits[repo.name],
      version: repo.name === "uswds" ? uswdsVersion : undefined,
    })),
    recordCounts: { ...countByType(records), markup_snippet: snippets.length, css_class: classes.length },
    markupSource: { package: "@uswds/uswds", version: npmVersion },
  };

  await writeFile(recordsPath, JSON.stringify(records, null, 2));
  await writeFile(packagedRecordsPath, JSON.stringify(records, null, 2));
  await writeFile(markupPath, JSON.stringify(snippets, null, 1));
  await writeFile(classesPath, JSON.stringify({ uswdsVersion: npmVersion, classes }));
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  return { records, manifest };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildIndex({ updateSources: !process.argv.includes("--offline") })
    .then(({ records, manifest }) => {
      process.stderr.write(`Indexed ${records.length} USWDS records at ${manifest.generatedAt}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
      process.exit(1);
    });
}
