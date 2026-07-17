export const PERSISTENCE_OPERATION_FAILED = 'PERSISTENCE_OPERATION_FAILED' as const;

export type PersistenceOperation =
  | 'workspace.findById'
  | 'workspace.hasAnyWorkspace'
  | 'playbook.findById'
  | 'playbookSource.findById'
  | 'synchronizationRun.findById'
  | 'playbookVersion.findById'
  | 'synchronizationSnapshot.findById'
  | 'normalizationAttempt.findById'
  | 'knowledgeItem.findById'
  | 'validationAttempt.findById'
  | 'playbookSource.findEnabledByPlaybookId'
  | 'playbook.findByNormalizedName'
  | 'synchronizationRun.findActiveByPlaybookSourceId'
  | 'synchronizationSnapshot.findBySynchronizationRunId'
  | 'synchronizationSnapshot.findLatestByPlaybookSourceId'
  | 'playbookVersion.findBySequence'
  | 'playbookVersion.findLatestByPlaybookId'
  | 'normalizationAttempt.findLatestByPlaybookVersionId';

export interface PersistenceOperationFailedError {
  readonly code: typeof PERSISTENCE_OPERATION_FAILED;
  readonly message: string;
  readonly details: Readonly<{
    readonly operation: PersistenceOperation;
  }>;
}

export function persistenceOperationFailed(
  operation: PersistenceOperation,
): PersistenceOperationFailedError {
  return Object.freeze({
    code: PERSISTENCE_OPERATION_FAILED,
    message: 'Persistence operation failed.',
    details: Object.freeze({
      operation,
    }),
  });
}
