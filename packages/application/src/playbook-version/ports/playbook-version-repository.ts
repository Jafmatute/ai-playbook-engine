import type {
  PlaybookId,
  PlaybookVersion,
  PlaybookVersionId,
  VersionSequence,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { PersistenceOperationFailedError } from '../../persistence/index.js';

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
}
