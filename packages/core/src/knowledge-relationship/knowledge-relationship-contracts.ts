import type { KnowledgeItemId, PlaybookVersionId, WorkspaceId } from '../identifiers.js';
import type { Instant } from '../instant.js';
import type { SourceReference, SourceReferenceSnapshot } from '../knowledge-item/index.js';
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

export interface RestoreKnowledgeRelationshipInput {
  readonly workspaceId: WorkspaceId;
  readonly playbookVersionId: PlaybookVersionId;
  readonly sourceKnowledgeItemId: KnowledgeItemId;
  readonly targetKnowledgeItemId: KnowledgeItemId;
  readonly type: string;
  readonly sourceReference: SourceReference | null;
  readonly createdAt: Instant;
}

export interface KnowledgeRelationshipSnapshot {
  readonly workspaceId: string;
  readonly playbookVersionId: string;
  readonly sourceKnowledgeItemId: string;
  readonly targetKnowledgeItemId: string;
  readonly type: KnowledgeRelationshipType;
  readonly sourceReference: SourceReferenceSnapshot | null;
  readonly createdAt: string;
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
