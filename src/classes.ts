import * as cheerio from "cheerio";

/** Class names found in an HTML string (fragment-safe). */
export function extractClasses(html: string): Set<string> {
  const $ = cheerio.load(html, null, false);
  const classes = new Set<string>();
  $("[class]").each((_, element) => {
    for (const name of ($(element).attr("class") ?? "").split(/\s+/)) {
      if (name) classes.add(name);
    }
  });
  return classes;
}

/** Every class selector defined by the USWDS stylesheet, with CSS escapes resolved. */
export function extractClassesFromCss(css: string): string[] {
  const classes = new Set<string>();
  for (const match of css.matchAll(/\.(-?[_a-zA-Z](?:[\w-]|\\.)*)/g)) {
    classes.add(match[1].replace(/\\(.)/g, "$1"));
  }
  return [...classes].sort();
}

const bemElement = /^(.+?)__.+$/;
const bemModifier = /^(.+?)--.+$/;

/** `usa-card__body` -> `usa-card`; `usa-button--big` -> `usa-button`; otherwise undefined. */
export function bemBlock(className: string): string | undefined {
  const name = className.includes(":") ? className.slice(className.lastIndexOf(":") + 1) : className;
  return bemElement.exec(name)?.[1] ?? bemModifier.exec(name)?.[1] ?? undefined;
}

export function stripVariantPrefix(className: string): string {
  return className.includes(":") ? className.slice(className.lastIndexOf(":") + 1) : className;
}

function editDistance(a: string, b: string, limit = 4): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

/** Closest known classes to an unknown one (typos, missing/extra modifiers). */
export function suggestClasses(unknown: string, known: Iterable<string>, max = 3): string[] {
  const scored: Array<[string, number]> = [];
  for (const candidate of known) {
    const distance = editDistance(unknown, candidate);
    if (distance <= Math.max(2, Math.floor(unknown.length / 6))) scored.push([candidate, distance]);
  }
  return scored
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([name]) => name);
}

/**
 * Responsive/state variants USWDS emits for utilities: `tablet:grid-col-6`, `hover:bg-primary`.
 * Classes that are only valid as `usa-*` components never take these prefixes.
 */
export const variantPrefixes = [
  "mobile",
  "mobile-lg",
  "tablet",
  "tablet-lg",
  "desktop",
  "desktop-lg",
  "widescreen",
  "hover",
  "focus",
  "active",
  "visited",
  "disabled",
  "print",
];
