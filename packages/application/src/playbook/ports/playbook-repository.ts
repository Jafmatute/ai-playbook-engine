import type { Playbook, PlaybookId, WorkspaceId } from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { PersistenceOperationFailedError } from '../../persistence/index.js';

export interface PlaybookRepository {
  findById(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
  ): Promise<Result<Playbook | null, PersistenceOperationFailedError>>;
}
