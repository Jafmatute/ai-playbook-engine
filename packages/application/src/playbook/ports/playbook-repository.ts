import type { Playbook, PlaybookId, WorkspaceId } from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { Page, PaginationRequest } from '../../pagination/index.js';
import type { PlaybookListFilter } from '../playbook-list-filter.js';
import type {
  PersistenceOperationFailedError,
  PersistedAggregate,
  PersistenceRevision,
  PersistenceRevisionConflictError,
} from '../../persistence/index.js';
import type { PlaybookNameConflictError, PlaybookNotFoundError } from '../../errors/index.js';

export type PlaybookRepositoryUpdateError =
  | PlaybookNotFoundError
  | PlaybookNameConflictError
  | PersistenceRevisionConflictError
  | PersistenceOperationFailedError;

export interface FindPlaybookByNormalizedNameOptions {
  readonly includeArchived: boolean;
}

export interface PlaybookRepository {
  findById(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
  ): Promise<Result<PersistedAggregate<Playbook> | null, PersistenceOperationFailedError>>;

  findByNormalizedName(
    workspaceId: WorkspaceId,
    normalizedName: string,
    options: FindPlaybookByNormalizedNameOptions,
  ): Promise<Result<Playbook | null, PersistenceOperationFailedError>>;

  list(
    workspaceId: WorkspaceId,
    filter: PlaybookListFilter,
    pagination: PaginationRequest,
  ): Promise<Result<Page<Playbook>, PersistenceOperationFailedError>>;

  insert(
    playbook: Playbook,
  ): Promise<
    Result<PersistenceRevision, PlaybookNameConflictError | PersistenceOperationFailedError>
  >;

  update(
    playbook: Playbook,
    expectedRevision: PersistenceRevision,
  ): Promise<Result<PersistenceRevision, PlaybookRepositoryUpdateError>>;
}
