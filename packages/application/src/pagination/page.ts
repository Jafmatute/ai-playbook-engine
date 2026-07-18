export interface Page<T> {
  readonly items: readonly T[];
  readonly offset: number;
  readonly limit: number;
  readonly hasMore: boolean;
  readonly totalCount?: number;
}

export function createPage<T>(input: {
  readonly items: readonly T[];
  readonly offset: number;
  readonly limit: number;
  readonly hasMore: boolean;
  readonly totalCount?: number;
}): Page<T> {
  const page: Page<T> = Object.freeze({
    items: Object.freeze([...input.items]),
    offset: input.offset,
    limit: input.limit,
    hasMore: input.hasMore,
    ...(input.totalCount !== undefined ? { totalCount: input.totalCount } : {}),
  });

  return page;
}
