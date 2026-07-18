import type {
  KnowledgeItemId,
  KnowledgeTitle,
  KnowledgeType,
  SourceStableKey,
} from '@ai-playbook-engine/core';

export interface KnowledgeItemListFilter {
  readonly type?: KnowledgeType;
  readonly parentKnowledgeItemId?: KnowledgeItemId | null;
  readonly title?: KnowledgeTitle;
  readonly sourceStableKey?: SourceStableKey;
}
