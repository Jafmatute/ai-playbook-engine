import type {
  KnowledgeItemId,
  PlaybookId,
  PlaybookVersionId,
  WorkspaceId,
} from '../identifiers.js';
import type { Instant } from '../instant.js';
import type { ContentChecksum } from '../playbook-version/index.js';
import type { DisplayOrder } from './display-order.js';
import type { KnowledgeItemAttributes } from './knowledge-item-attributes.js';
import type { KnowledgeItemValidationState } from './knowledge-item-validation-state.js';
import type { KnowledgeSlug } from './knowledge-slug.js';
import type { KnowledgeTitle } from './knowledge-title.js';
import type { KnowledgeType } from './knowledge-type.js';
import type { NormalizedContent } from './normalized-content.js';
import type { SourceReference } from './source-reference.js';
import type { SourceStableKey } from './source-stable-key.js';

export interface KnowledgeItemState {
  readonly knowledgeItemId: KnowledgeItemId;
  readonly workspaceId: WorkspaceId;
  readonly playbookId: PlaybookId;
  readonly playbookVersionId: PlaybookVersionId;
  readonly type: KnowledgeType;
  readonly sourceStableKey: SourceStableKey;
  readonly title: KnowledgeTitle;
  readonly slug: KnowledgeSlug | null;
  readonly content: NormalizedContent;
  readonly attributes: KnowledgeItemAttributes;
  readonly sourceReference: SourceReference;
  readonly parentKnowledgeItemId: KnowledgeItemId | null;
  readonly displayOrder: DisplayOrder;
  readonly contentChecksum: ContentChecksum;
  readonly validationState: KnowledgeItemValidationState;
  readonly createdAt: Instant;
}

export interface CreateKnowledgeItemInput {
  readonly knowledgeItemId: KnowledgeItemId;
  readonly workspaceId: WorkspaceId;
  readonly playbookId: PlaybookId;
  readonly playbookVersionId: PlaybookVersionId;
  readonly type: KnowledgeType;
  readonly sourceStableKey: SourceStableKey;
  readonly title: KnowledgeTitle;
  readonly slug: KnowledgeSlug | null;
  readonly content: NormalizedContent;
  readonly attributes: KnowledgeItemAttributes;
  readonly sourceReference: SourceReference;
  readonly parentKnowledgeItemId: KnowledgeItemId | null;
  readonly displayOrder: DisplayOrder;
  readonly contentChecksum: ContentChecksum;
  readonly createdAt: Instant;
}
