export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function stripLiquid(value: string): string {
  return value
    .replace(/\{%\s*(?:raw|endraw).*?%\}/g, "")
    .replace(/\{#[\s\S]*?#\}/g, "")
    .replace(/\{%[\s\S]*?%\}/g, " ")
    .replace(/\{\{[\s\S]*?\}\}/g, " ");
}

export function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

export function cleanWhitespace(value: string): string {
  return value.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function toPlainText(value: string): string {
  return cleanWhitespace(
    stripHtml(stripLiquid(value))
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^#+\s*/gm, "")
      .replace(/^[-*]\s+/gm, "")
      .replace(/\|/g, " ")
  );
}

export function summarize(value: string, max = 280): string {
  const text = toPlainText(value);
  if (text.length <= max) return text;
  const clipped = text.slice(0, max);
  return `${clipped.slice(0, Math.max(clipped.lastIndexOf(" "), 120)).trim()}...`;
}

export function unique<T>(values: T[]): T[] {
  return [...new Set(values.filter(Boolean))];
}

export function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}
