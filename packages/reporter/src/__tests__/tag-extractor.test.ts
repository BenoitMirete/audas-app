import { describe, it, expect } from 'vitest';
import { extractTags } from '../tag-extractor.js';

describe('extractTags', () => {
  it('returns empty array when tags is empty', () => {
    expect(extractTags([])).toEqual([]);
  });

  it('strips the @ prefix from tags', () => {
    expect(extractTags(['@smoke', '@auth'])).toEqual(['smoke', 'auth']);
  });

  it('handles tags without @ prefix gracefully', () => {
    // some older Playwright versions or manual test.tag() usage may omit @
    expect(extractTags(['smoke', '@regression'])).toEqual(['smoke', 'regression']);
  });

  it('deduplicates tags', () => {
    expect(extractTags(['@smoke', '@smoke', '@auth'])).toEqual(['smoke', 'auth']);
  });

  it('filters out empty strings after stripping', () => {
    expect(extractTags(['@', '@smoke'])).toEqual(['smoke']);
  });
});
