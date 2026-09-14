import { describe, expect, it } from 'vitest';

import {
  clampPage,
  getPageCount,
  getPageRangeLabel,
  paginate,
} from '../src/domain/pagination.js';

describe('pagination', () => {
  it('creates bounded pages and labels their result range', () => {
    const entries = Array.from({ length: 43 }, (_, index) => index + 1);

    expect(getPageCount(entries.length, 20)).toBe(3);
    expect(paginate(entries, 2, 20)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 21),
    );
    expect(getPageRangeLabel(entries.length, 3, 20)).toBe(
      'Showing 41\u201343 of 43',
    );
  });

  it('reconciles an unavailable page after filters reduce the result set', () => {
    expect(clampPage(4, 21, 20)).toBe(2);
    expect(paginate([1, 2, 3], 4, 20)).toEqual([1, 2, 3]);
  });

  it('keeps empty results explicit and rejects invalid page sizes', () => {
    expect(getPageRangeLabel(0, 1, 20)).toBe('No results');
    expect(() => getPageCount(10, 0)).toThrow(
      'Page size must be a positive integer',
    );
  });
});
