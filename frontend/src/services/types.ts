/** DRF paginated list envelope: { count, next, previous, results }. */
export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
