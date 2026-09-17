export type PaginationItem = number | 'ellipsis';

export function getTotalPages(totalItems: number, pageSize = 9): number {
  if (!Number.isFinite(totalItems) || totalItems < 0) throw new RangeError('totalItems 必須是非負數。');
  if (!Number.isInteger(pageSize) || pageSize <= 0) throw new RangeError('pageSize 必須是正整數。');
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  const lastPage = Math.max(1, Math.trunc(totalPages));
  const current = Math.min(Math.max(1, Math.trunc(currentPage)), lastPage);
  if (lastPage <= 7) return Array.from({ length: lastPage }, (_, index) => index + 1);

  const pages = new Set([1, lastPage]);
  for (let page = current - 2; page <= current + 2; page += 1) {
    if (page > 1 && page < lastPage) pages.add(page);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items: PaginationItem[] = [];
  for (const page of sorted) {
    const previous = items.at(-1);
    if (typeof previous === 'number' && page - previous === 2) items.push(previous + 1);
    else if (typeof previous === 'number' && page - previous > 2) items.push('ellipsis');
    items.push(page);
  }
  return items;
}
