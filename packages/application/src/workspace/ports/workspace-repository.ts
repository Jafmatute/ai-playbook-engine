import type { Workspace, WorkspaceId } from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import type { WorkspaceAlreadyInitializedError } from '../../errors/index.js';

export interface WorkspaceRepository {
  findById(
    workspaceId: WorkspaceId,
  ): Promise<Result<Workspace | null, PersistenceOperationFailedError>>;

  hasAnyWorkspace(): Promise<Result<boolean, PersistenceOperationFailedError>>;

  insert(
    workspace: Workspace,
  ): Promise<Result<void, WorkspaceAlreadyInitializedError | PersistenceOperationFailedError>>;
}
