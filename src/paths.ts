import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

function findPackageRoot(start: string): string {
  let current = start;
  while (current !== path.dirname(current)) {
    if (existsSync(path.join(current, "package.json"))) return current;
    current = path.dirname(current);
  }
  return process.cwd();
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = findPackageRoot(moduleDir);
export const runtimeCacheRoot = process.env.USWDS_MCP_CACHE_DIR ?? path.join(repoRoot, ".cache");
export const cacheDir = runtimeCacheRoot;
export const sourceDir = path.join(cacheDir, "sources");
export const indexDir = path.join(cacheDir, "index");
export const dataDir = path.join(repoRoot, "data");
export const manifestPath = path.join(dataDir, "manifest.json");
export const packagedRecordsPath = path.join(dataDir, "records.json");
export const recordsPath = path.join(indexDir, "records.json");

export function fromRoot(...parts: string[]): string {
  return path.join(repoRoot, ...parts);
}
