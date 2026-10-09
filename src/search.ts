import { SearchResult, UswdsRecord, UswdsRecordType } from "./types.js";
import { tokenize } from "./text.js";

/** Everyday words people (and LLMs) use mapped to the USWDS vocabulary. */
const synonyms: Record<string, string[]> = {
  dropdown: ["select", "combo", "box"],
  autocomplete: ["combo", "box"],
  typeahead: ["combo", "box"],
  toast: ["alert", "site"],
  notification: ["alert"],
  notice: ["alert", "site"],
  popup: ["modal"],
  dialog: ["modal"],
  overlay: ["modal"],
  menu: ["header", "nav", "navigation"],
  navbar: ["header", "navigation"],
  nav: ["navigation", "header"],
  sidebar: ["sidenav"],
  tabs: ["navigation", "sidenav"],
  wizard: ["step", "indicator"],
  stepper: ["step", "indicator"],
  progress: ["step", "indicator"],
  upload: ["file", "input"],
  textbox: ["text", "input"],
  textfield: ["text", "input"],
  field: ["input", "text"],
  faq: ["accordion"],
  collapse: ["accordion"],
  expand: ["accordion"],
  tiles: ["card"],
  pager: ["pagination"],
  datepicker: ["date", "picker"],
  calendar: ["date", "picker"],
  radios: ["radio", "buttons"],
  cta: ["button"],
  searchbar: ["search"],
  sitemap: ["footer"],
  spacing: ["margin", "padding", "utilities"],
  columns: ["grid", "layout"],
  responsive: ["grid", "layout", "utilities"],
  colour: ["color", "tokens"],
  color: ["tokens", "utilities"],
  font: ["typography", "tokens"],
  typography: ["font", "tokens"],
};

function expandQuery(tokens: string[]): Array<{ token: string; weight: number }> {
  const weights = new Map<string, number>();
  for (const token of tokens) weights.set(token, 1);
  for (const token of tokens) {
    for (const extra of synonyms[token] ?? []) if (!weights.has(extra)) weights.set(extra, 0.6);
  }
  return [...weights].map(([token, weight]) => ({ token, weight }));
}

function recordText(record: UswdsRecord): string {
  return [
    record.title,
    record.slug,
    record.summary,
    record.body,
    record.package?.name,
    ...(record.relatedPackages ?? []),
    ...(record.variants ?? []),
    ...(record.settings ?? []),
    ...(record.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

export function searchRecords(
  records: UswdsRecord[],
  query: string,
  options: { types?: UswdsRecordType[]; limit?: number } = {}
): SearchResult[] {
  const baseTokens = tokenize(query);
  if (baseTokens.length === 0) return [];
  const expanded = expandQuery(baseTokens);
  const queryTokens = expanded.map((entry) => entry.token);
  const weightOf = new Map(expanded.map((entry) => [entry.token, entry.weight]));
  const filtered = options.types?.length ? records.filter((record) => options.types?.includes(record.type)) : records;
  const docs = filtered.map((record) => ({ record, tokens: tokenize(recordText(record)) }));
  const docFrequency = new Map<string, number>();

  for (const token of new Set(queryTokens)) {
    docFrequency.set(token, docs.filter((doc) => doc.tokens.includes(token)).length);
  }

  const results = docs
    .map(({ record, tokens }) => {
      const tokenCounts = new Map<string, number>();
      for (const token of tokens) tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
      const titleTokens = new Set(tokenize(record.title));
      const slugTokens = new Set(tokenize(record.slug));
      let score = 0;

      for (const queryToken of queryTokens) {
        const tf = tokenCounts.get(queryToken) ?? 0;
        if (!tf) continue;
        const idf = Math.log((docs.length + 1) / ((docFrequency.get(queryToken) ?? 0) + 1)) + 1;
        const weight = weightOf.get(queryToken) ?? 1;
        score += weight * ((1 + Math.log(tf)) * idf);
        if (titleTokens.has(queryToken)) score += 4 * weight;
        if (slugTokens.has(queryToken)) score += 3 * weight;
        if (record.package?.name.includes(queryToken)) score += 2 * weight;
      }

      const matchedSections = record.sections
        .filter((section) => queryTokens.some((token) => tokenize(`${section.heading} ${section.content}`).includes(token)))
        .map((section) => section.heading)
        .slice(0, 5);

      return { record, score, matchedSections };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title));

  return results.slice(0, Math.max(1, Math.min(options.limit ?? 10, 25)));
}

/** Look up real USWDS class names ("margin top 2" -> margin-top-2, "tablet grid col 6"). */
export function findClasses(known: Iterable<string>, query: string, limit = 25): string[] {
  const tokens = tokenize(query.replace(/[:_]/g, " ")).concat(query.match(/\b\d+\b/g)?.filter((n) => n.length === 1) ?? []);
  const wanted = [...new Set(tokens)];
  if (wanted.length === 0) return [];
  const joined = query.trim().toLowerCase().replace(/\s+/g, "-");
  const scored: Array<[string, number]> = [];
  for (const name of known) {
    if (name === joined || name === query.trim()) {
      scored.push([name, -1000]);
      continue;
    }
    const parts = new Set(name.split(/[-:_]+/));
    if (!wanted.every((token) => parts.has(token) || name.includes(token))) continue;
    const extra = parts.size - wanted.length;
    scored.push([name, (name.startsWith(joined) ? -50 : 0) + Math.abs(extra) * 2 + name.length / 100]);
  }
  return scored
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .slice(0, Math.max(1, Math.min(limit, 100)))
    .map(([name]) => name);
}
