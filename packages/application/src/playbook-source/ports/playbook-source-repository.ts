import type {
  PlaybookId,
  PlaybookSource,
  PlaybookSourceId,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { Page, PaginationRequest } from '../../pagination/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';

export interface PlaybookSourceRepository {
  findById(
    workspaceId: WorkspaceId,
    playbookSourceId: PlaybookSourceId,
  ): Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>>;

  findEnabledByPlaybookId(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
  ): Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>>;

  listByPlaybookId(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
    pagination: PaginationRequest,
  ): Promise<Result<Page<PlaybookSource>, PersistenceOperationFailedError>>;
}
