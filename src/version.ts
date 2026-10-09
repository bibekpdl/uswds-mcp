import { readFileSync } from "node:fs";
import { fromRoot } from "./paths.js";

function readVersion(): string {
  try {
    return (JSON.parse(readFileSync(fromRoot("package.json"), "utf8")) as { version: string }).version;
  } catch {
    return "0.0.0";
  }
}

/** Single source of truth: package.json. */
export const version = readVersion();
