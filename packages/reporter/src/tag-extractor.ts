/**
 * Extracts clean tag names from a Playwright TestCase.tags array.
 * Playwright prefixes tags with '@' (e.g. '@smoke'). This function strips
 * that prefix, deduplicates, and filters out blanks.
 */
export function extractTags(tags: string[]): string[] {
  const cleaned = tags.map((tag) => (tag.startsWith('@') ? tag.slice(1) : tag));
  const deduped = [...new Set(cleaned)];
  return deduped.filter((tag) => tag.length > 0);
}
