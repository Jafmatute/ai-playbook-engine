export type NormalizationAttemptStatus = 'running' | 'completed' | 'failed';

const VALID_STATUSES: ReadonlySet<string> = new Set(['running', 'completed', 'failed']);

export function isNormalizationAttemptStatus(value: string): value is NormalizationAttemptStatus {
  return VALID_STATUSES.has(value);
}
