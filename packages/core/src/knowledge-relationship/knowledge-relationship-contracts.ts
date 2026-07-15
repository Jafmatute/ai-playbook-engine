import type { KnowledgeItemId, PlaybookVersionId, WorkspaceId } from '../identifiers.js';
import type { Instant } from '../instant.js';
import type { SourceReference } from '../knowledge-item/index.js';
import type { KnowledgeRelationshipType } from './knowledge-relationship-type.js';

export interface CreateKnowledgeRelationshipInput {
  readonly workspaceId: WorkspaceId;
  readonly playbookVersionId: PlaybookVersionId;
  readonly sourceKnowledgeItemId: KnowledgeItemId;
  readonly targetKnowledgeItemId: KnowledgeItemId;
  readonly type: KnowledgeRelationshipType;
  readonly sourceReference: SourceReference | null;
  readonly createdAt: Instant;
}

export interface KnowledgeRelationshipState {
  readonly workspaceId: WorkspaceId;
  readonly playbookVersionId: PlaybookVersionId;
  readonly sourceKnowledgeItemId: KnowledgeItemId;
  readonly targetKnowledgeItemId: KnowledgeItemId;
  readonly type: KnowledgeRelationshipType;
  readonly sourceReference: SourceReference | null;
  readonly createdAt: Instant;
}
