import type {
  Instant,
  PlaybookSourceId,
  SynchronizationRun,
  SynchronizationRunId,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { Page, PaginationRequest } from '../../pagination/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';

export interface SynchronizationRunRepository {
  findById(
    workspaceId: WorkspaceId,
    synchronizationRunId: SynchronizationRunId,
  ): Promise<Result<SynchronizationRun | null, PersistenceOperationFailedError>>;

  findActiveByPlaybookSourceId(
    workspaceId: WorkspaceId,
    playbookSourceId: PlaybookSourceId,
  ): Promise<Result<SynchronizationRun | null, PersistenceOperationFailedError>>;

  findLatestCompletedByPlaybookSourceId(
    workspaceId: WorkspaceId,
    playbookSourceId: PlaybookSourceId,
  ): Promise<Result<SynchronizationRun | null, PersistenceOperationFailedError>>;

  findStaleRunning(
    workspaceId: WorkspaceId,
    olderThan: Instant,
    pagination: PaginationRequest,
  ): Promise<Result<Page<SynchronizationRun>, PersistenceOperationFailedError>>;
}
