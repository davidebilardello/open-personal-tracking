export const LIBRARY_PAGE_SIZE = 20;

export const getPageCount = (totalItems: number, pageSize: number): number => {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('Page size must be a positive integer');
  }

  return Math.max(1, Math.ceil(Math.max(0, totalItems) / pageSize));
};

export const clampPage = (
  page: number,
  totalItems: number,
  pageSize: number,
): number => Math.min(Math.max(1, page), getPageCount(totalItems, pageSize));

export const paginate = <Entry>(
  entries: readonly Entry[],
  page: number,
  pageSize: number,
): Entry[] => {
  const currentPage = clampPage(page, entries.length, pageSize);
  const start = (currentPage - 1) * pageSize;

  return entries.slice(start, start + pageSize);
};

export const getPageRangeLabel = (
  totalItems: number,
  page: number,
  pageSize: number,
): string => {
  if (totalItems === 0) return 'No results';

  const currentPage = clampPage(page, totalItems, pageSize);
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalItems);

  return `Showing ${start}\u2013${end} of ${totalItems}`;
};
