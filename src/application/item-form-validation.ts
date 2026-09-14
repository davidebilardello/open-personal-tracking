/** Presentation checks only; the archive domain still validates every save. */
export type ItemFormDraft = {
  title: string;
  rating: string;
  category: string;
  seasons: Array<{
    id: string;
    title: string;
    episodes: Array<{ id: string; title: string }>;
  }>;
};

export function validateItemForm(
  draft: ItemFormDraft,
  ratingBadInput = false,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.title.trim()) errors.fTitle = 'Enter a title.';
  const rating = draft.rating.trim() ? Number(draft.rating) : undefined;
  if (
    ratingBadInput ||
    (rating !== undefined &&
      (!Number.isFinite(rating) || rating < 0 || rating > 5))
  ) {
    errors.fRating =
      'Enter a number between 0 and 5, or leave the rating blank.';
  }
  if (draft.category === 'Series') {
    for (const season of draft.seasons) {
      if (!season.title.trim()) {
        errors[`season-title-${season.id}`] = 'Enter a season title.';
      }
      if (season.episodes.length === 0) {
        errors[`season-add-episode-${season.id}`] =
          'Add at least one episode, or remove this season.';
      }
      for (const episode of season.episodes) {
        if (!episode.title.trim()) {
          errors[`episode-title-${episode.id}`] = 'Enter an episode title.';
        }
      }
    }
  }
  return errors;
}
