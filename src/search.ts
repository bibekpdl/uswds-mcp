import { SearchResult, UswdsRecord, UswdsRecordType } from "./types.js";
import { tokenize } from "./text.js";

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
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];
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
        score += (1 + Math.log(tf)) * idf;
        if (titleTokens.has(queryToken)) score += 4;
        if (slugTokens.has(queryToken)) score += 3;
        if (record.package?.name.includes(queryToken)) score += 2;
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
