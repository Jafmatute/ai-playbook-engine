import type { KnowledgeType } from './knowledge-type.js';

export interface KnowledgeItemAttributesTypeMismatchError {
  readonly code: 'KNOWLEDGE_ITEM_ATTRIBUTES_TYPE_MISMATCH';
  readonly message: string;
  readonly details: {
    readonly knowledgeType: KnowledgeType;
    readonly attributesType: KnowledgeType;
  };
}

export type KnowledgeItemCreationError = KnowledgeItemAttributesTypeMismatchError;

export function attributesTypeMismatch(
  details: KnowledgeItemAttributesTypeMismatchError['details'],
): KnowledgeItemAttributesTypeMismatchError {
  return Object.freeze({
    code: 'KNOWLEDGE_ITEM_ATTRIBUTES_TYPE_MISMATCH' as const,
    message: 'The knowledge item attributes do not match the knowledge type.',
    details: Object.freeze({ ...details }),
  });
}
