import { readFileSync } from "node:fs";
import { classesPath, markupPath } from "./paths.js";
import { MarkupSnippet } from "./types.js";

/** Test helpers: load the generated index synchronously. */
export const markup: MarkupSnippet[] = JSON.parse(readFileSync(markupPath, "utf8"));
export const knownClasses = new Set<string>((JSON.parse(readFileSync(classesPath, "utf8")) as { classes: string[] }).classes);
