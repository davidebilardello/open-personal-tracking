import { describe, expect, it, vi } from 'vitest';
import {
  validateItemForm,
  type ItemFormDraft,
} from '../src/application/item-form-validation.js';
import { ArchiveApplication } from '../src/application/archive-application.js';
import { createEmptyArchive } from '../src/domain/archive.js';

const draft: ItemFormDraft = {
  title: 'Fixture',
  rating: '',
  category: 'Book',
  seasons: [],
};

describe('item form feedback', () => {
  it.each(['', '   ', '\n'])('identifies a missing title (%j)', (title) => {
    expect(validateItemForm({ ...draft, title }).fTitle).toBeDefined();
  });
  it.each(['', '  ', '0', '5', '4.2'])(
    'accepts an optional rating or in-range decimal (%j)',
    (rating) => {
      expect(validateItemForm({ ...draft, rating })).toEqual({});
    },
  );
  it.each(['-0.1', '5.1', 'Infinity', 'NaN', 'e'])(
    'rejects an invalid rating (%j)',
    (rating) => {
      expect(validateItemForm({ ...draft, rating }).fRating).toBeDefined();
    },
  );
  it('distinguishes native bad input from an intentionally blank rating', () => {
    expect(validateItemForm(draft, true).fRating).toBeDefined();
    expect(validateItemForm(draft, false)).toEqual({});
  });
  it('checks only active series structure and allows a series without tracking', () => {
    const series = { ...draft, category: 'Series' };
    expect(validateItemForm(series)).toEqual({});
    const seasons = [
      { id: 's', title: ' ', episodes: [{ id: 'e', title: '' }] },
    ];
    expect(Object.keys(validateItemForm({ ...series, seasons }))).toEqual([
      'season-title-s',
      'episode-title-e',
    ]);
    expect(validateItemForm({ ...draft, seasons })).toEqual({});
    expect(
      validateItemForm({
        ...series,
        seasons: [{ id: 's', title: 'Season', episodes: [] }],
      })['season-add-episode-s'],
    ).toBeDefined();
  });
});

describe('authoritative archive validation', () => {
  it.each([-1, 6, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid rating %s before persistence',
    async (rating) => {
      const persistence = { load: vi.fn(), save: vi.fn(), clear: vi.fn() };
      const application = new ArchiveApplication(persistence);
      const archive = createEmptyArchive();
      const before = structuredClone(archive);
      await expect(
        application.createItem(archive, {
          title: 'Invalid',
          category: 'Book',
          progress: { current: 0, unit: 'pages' },
          rating,
        }),
      ).rejects.toThrow();
      expect(persistence.save).not.toHaveBeenCalled();
      expect(archive).toEqual(before);
    },
  );
});
