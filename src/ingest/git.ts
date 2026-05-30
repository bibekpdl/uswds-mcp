import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

export interface SourceRepo {
  name: "uswds-site" | "uswds";
  url: string;
}

export const sourceRepos: SourceRepo[] = [
  { name: "uswds-site", url: "https://github.com/uswds/uswds-site" },
  { name: "uswds", url: "https://github.com/uswds/uswds" },
];

function run(command: string, args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`${command} ${args.join(" ")} failed (${code}): ${stderr.trim()}`));
    });
  });
}

export async function cloneOrUpdateSources(baseDir: string): Promise<Record<string, string>> {
  await mkdir(baseDir, { recursive: true });
  const commits: Record<string, string> = {};

  for (const repo of sourceRepos) {
    const target = path.join(baseDir, repo.name);
    try {
      await run("git", ["-C", target, "rev-parse", "--is-inside-work-tree"]);
      await run("git", ["-C", target, "fetch", "--depth", "1", "origin"]);
      await run("git", ["-C", target, "checkout", "FETCH_HEAD"]);
    } catch {
      await run("git", ["clone", "--depth", "1", repo.url, target]);
    }
    commits[repo.name] = await run("git", ["-C", target, "rev-parse", "HEAD"]);
  }

  return commits;
}
