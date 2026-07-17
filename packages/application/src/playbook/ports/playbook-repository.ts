import type { Playbook, PlaybookId, WorkspaceId } from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { PersistenceOperationFailedError } from '../../persistence/index.js';

export interface FindPlaybookByNormalizedNameOptions {
  readonly includeArchived: boolean;
}

export interface PlaybookRepository {
  findById(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
  ): Promise<Result<Playbook | null, PersistenceOperationFailedError>>;

  findByNormalizedName(
    workspaceId: WorkspaceId,
    normalizedName: string,
    options: FindPlaybookByNormalizedNameOptions,
  ): Promise<Result<Playbook | null, PersistenceOperationFailedError>>;
}
