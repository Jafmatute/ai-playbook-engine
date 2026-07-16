import type { KnowledgeItem, KnowledgeItemId, WorkspaceId } from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { PersistenceOperationFailedError } from '../../persistence/index.js';

export interface KnowledgeItemRepository {
  findById(
    workspaceId: WorkspaceId,
    knowledgeItemId: KnowledgeItemId,
  ): Promise<Result<KnowledgeItem | null, PersistenceOperationFailedError>>;
}
