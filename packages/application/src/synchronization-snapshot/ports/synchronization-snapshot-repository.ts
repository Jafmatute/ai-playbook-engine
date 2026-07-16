import type {
  SynchronizationSnapshot,
  SynchronizationSnapshotId,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { PersistenceOperationFailedError } from '../../persistence/index.js';

export interface SynchronizationSnapshotRepository {
  findById(
    workspaceId: WorkspaceId,
    synchronizationSnapshotId: SynchronizationSnapshotId,
  ): Promise<Result<SynchronizationSnapshot | null, PersistenceOperationFailedError>>;
}
