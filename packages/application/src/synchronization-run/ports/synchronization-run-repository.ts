import type {
  PlaybookSourceId,
  SynchronizationRun,
  SynchronizationRunId,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

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
}
