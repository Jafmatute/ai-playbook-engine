export type SynchronizationFailureStage =
  | 'initialization'
  | 'authentication'
  | 'retrieval'
  | 'pagination'
  | 'normalization'
  | 'snapshot_creation';

const VALID_SYNCHRONIZATION_FAILURE_STAGES: ReadonlySet<string> = new Set([
  'initialization',
  'authentication',
  'retrieval',
  'pagination',
  'normalization',
  'snapshot_creation',
]);

export function isSynchronizationFailureStage(value: string): value is SynchronizationFailureStage {
  return VALID_SYNCHRONIZATION_FAILURE_STAGES.has(value);
}
