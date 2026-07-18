export const PAGINATION_INVALID = 'PAGINATION_INVALID' as const;

export interface PaginationInvalidError {
  readonly code: typeof PAGINATION_INVALID;
  readonly message: string;
  readonly details: {
    readonly reason: string;
  };
}

export function paginationInvalid(reason: string): PaginationInvalidError {
  return Object.freeze({
    code: PAGINATION_INVALID,
    message: 'The pagination parameters are invalid.',
    details: Object.freeze({ reason }),
  });
}
