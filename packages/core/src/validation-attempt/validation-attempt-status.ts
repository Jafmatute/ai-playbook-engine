export type ValidationAttemptStatus = 'running' | 'validated' | 'invalid';

const VALID_STATUSES: ReadonlySet<string> = new Set(['running', 'validated', 'invalid']);

export function isValidationAttemptStatus(value: string): value is ValidationAttemptStatus {
  return VALID_STATUSES.has(value);
}
