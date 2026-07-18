import type {
  KnowledgeItem,
  KnowledgeItemId,
  PlaybookVersionId,
  SourceStableKey,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { Page, PaginationRequest } from '../../pagination/index.js';
import type { KnowledgeItemListFilter } from '../knowledge-item-list-filter.js';
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

  countByVersion(
    workspaceId: WorkspaceId,
    playbookVersionId: PlaybookVersionId,
  ): Promise<Result<number, PersistenceOperationFailedError>>;

  listByVersion(
    workspaceId: WorkspaceId,
    playbookVersionId: PlaybookVersionId,
    filter: KnowledgeItemListFilter,
    pagination: PaginationRequest,
  ): Promise<Result<Page<KnowledgeItem>, PersistenceOperationFailedError>>;
}
