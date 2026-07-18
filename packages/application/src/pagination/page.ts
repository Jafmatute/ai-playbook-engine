export interface Page<T> {
  readonly items: readonly T[];
  readonly offset: number;
  readonly limit: number;
  readonly hasMore: boolean;
  readonly totalCount?: number;
}
