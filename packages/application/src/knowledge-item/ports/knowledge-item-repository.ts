import type {
  KnowledgeItem,
  KnowledgeItemId,
  PlaybookVersionId,
  SourceStableKey,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { PersistenceOperationFailedError } from '../../persistence/index.js';

export interface KnowledgeItemRepository {
  findById(
    workspaceId: WorkspaceId,
    knowledgeItemId: KnowledgeItemId,
  ): Promise<Result<KnowledgeItem | null, PersistenceOperationFailedError>>;

  findBySourceStableKey(
    workspaceId: WorkspaceId,
    playbookVersionId: PlaybookVersionId,
    sourceStableKey: SourceStableKey,
  ): Promise<Result<KnowledgeItem | null, PersistenceOperationFailedError>>;
}
