export type SynchronizationRunStatus = 'pending' | 'running' | 'completed' | 'failed';

const VALID_SYNCHRONIZATION_RUN_STATUSES: ReadonlySet<string> = new Set([
  'pending',
  'running',
  'completed',
  'failed',
]);

export function isSynchronizationRunStatus(value: string): value is SynchronizationRunStatus {
  return VALID_SYNCHRONIZATION_RUN_STATUSES.has(value);
}
