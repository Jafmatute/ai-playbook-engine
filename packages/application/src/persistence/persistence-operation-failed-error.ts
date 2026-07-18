export const PERSISTENCE_OPERATION_FAILED = 'PERSISTENCE_OPERATION_FAILED' as const;

export type PersistenceOperation =
  | 'workspace.findById'
  | 'workspace.hasAnyWorkspace'
  | 'workspace.insert'
  | 'playbook.findById'
  | 'playbook.list'
  | 'playbook.insert'
  | 'playbook.update'
  | 'playbook.findByNormalizedName'
  | 'playbookSource.findById'
  | 'playbookSource.findEnabledByPlaybookId'
  | 'playbookSource.listByPlaybookId'
  | 'synchronizationRun.findById'
  | 'synchronizationRun.findActiveByPlaybookSourceId'
  | 'synchronizationRun.findLatestCompletedByPlaybookSourceId'
  | 'synchronizationRun.findStaleRunning'
  | 'synchronizationRun.listByPlaybookSourceId'
  | 'playbookVersion.findById'
  | 'playbookVersion.findBySequence'
  | 'playbookVersion.findLatestByPlaybookId'
  | 'playbookVersion.listByPlaybookId'
  | 'synchronizationSnapshot.findById'
  | 'synchronizationSnapshot.findBySynchronizationRunId'
  | 'synchronizationSnapshot.findLatestByPlaybookSourceId'
  | 'synchronizationSnapshot.findLatestByChecksum'
  | 'normalizationAttempt.findById'
  | 'normalizationAttempt.findLatestByPlaybookVersionId'
  | 'normalizationAttempt.listByPlaybookVersionId'
  | 'knowledgeItem.findById'
  | 'knowledgeItem.findBySourceStableKey'
  | 'knowledgeItem.countByVersion'
  | 'knowledgeItem.listByVersion'
  | 'validationAttempt.findById'
  | 'validationAttempt.findByPlaybookVersionId'
  | 'knowledgeRelationship.listBySourceItem'
  | 'knowledgeRelationship.listByTargetItem';

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
