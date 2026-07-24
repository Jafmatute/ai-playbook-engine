import type {
  PlaybookId,
  PlaybookSource,
  PlaybookSourceId,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { Page, PaginationRequest } from '../../pagination/index.js';
import type {
  PersistenceOperationFailedError,
  PersistedAggregate,
  PersistenceRevision,
  PersistenceRevisionConflictError,
} from '../../persistence/index.js';
import type { EnabledPlaybookSourceConflictError } from '../../errors/index.js';
import type { PlaybookSourceNotFoundError } from '../../errors/index.js';
export type PlaybookSourceRepositoryInsertError =
  EnabledPlaybookSourceConflictError | PersistenceOperationFailedError;

export type PlaybookSourceRepositoryUpdateError =
  | PlaybookSourceNotFoundError
  | EnabledPlaybookSourceConflictError
  | PersistenceRevisionConflictError
  | PersistenceOperationFailedError;

export interface PlaybookSourceRepository {
  insert(
    source: PlaybookSource,
  ): Promise<Result<PersistenceRevision, PlaybookSourceRepositoryInsertError>>;

  findById(
    workspaceId: WorkspaceId,
    playbookSourceId: PlaybookSourceId,
  ): Promise<Result<PersistedAggregate<PlaybookSource> | null, PersistenceOperationFailedError>>;

  findEnabledByPlaybookId(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
  ): Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>>;

  listByPlaybookId(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
    pagination: PaginationRequest,
  ): Promise<Result<Page<PlaybookSource>, PersistenceOperationFailedError>>;

  update(
    source: PlaybookSource,
    expectedRevision: PersistenceRevision,
  ): Promise<Result<PersistenceRevision, PlaybookSourceRepositoryUpdateError>>;
}
