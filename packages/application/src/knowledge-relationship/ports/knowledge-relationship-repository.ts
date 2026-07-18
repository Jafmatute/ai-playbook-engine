import type {
  KnowledgeItemId,
  KnowledgeRelationship,
  PlaybookVersionId,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { PersistenceOperationFailedError } from '../../persistence/index.js';

export interface KnowledgeRelationshipRepository {
  listBySourceItem(
    workspaceId: WorkspaceId,
    playbookVersionId: PlaybookVersionId,
    sourceKnowledgeItemId: KnowledgeItemId,
  ): Promise<Result<readonly KnowledgeRelationship[], PersistenceOperationFailedError>>;
}
