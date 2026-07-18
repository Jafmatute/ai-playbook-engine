import type {
  PlaybookId,
  PlaybookVersion,
  PlaybookVersionId,
  VersionSequence,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { Page, PaginationRequest } from '../../pagination/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import type { PlaybookVersionListFilter } from '../playbook-version-list-filter.js';

export interface PlaybookVersionRepository {
  findById(
    workspaceId: WorkspaceId,
    playbookVersionId: PlaybookVersionId,
  ): Promise<Result<PlaybookVersion | null, PersistenceOperationFailedError>>;

  findBySequence(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
    versionSequence: VersionSequence,
  ): Promise<Result<PlaybookVersion | null, PersistenceOperationFailedError>>;

  findLatestByPlaybookId(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
  ): Promise<Result<PlaybookVersion | null, PersistenceOperationFailedError>>;

  listByPlaybookId(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
    filter: PlaybookVersionListFilter,
    pagination: PaginationRequest,
  ): Promise<Result<Page<PlaybookVersion>, PersistenceOperationFailedError>>;
}
