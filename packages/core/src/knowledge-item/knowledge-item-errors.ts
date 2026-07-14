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

export type KnowledgeItemRestorationInvalidField = 'attributes' | 'validationState';

export type KnowledgeItemRestorationInvalidReason =
  'invalid_attributes' | 'attributes_type_mismatch' | 'unknown_validation_state';

export interface KnowledgeItemRestorationStateInvalidError {
  readonly code: 'KNOWLEDGE_ITEM_RESTORATION_STATE_INVALID';
  readonly message: string;
  readonly details: {
    readonly field: KnowledgeItemRestorationInvalidField;
    readonly reason: KnowledgeItemRestorationInvalidReason;
    readonly knowledgeType?: KnowledgeType;
    readonly attributesType?: KnowledgeType;
    readonly currentValue?: string;
  };
}

export type KnowledgeItemRestorationError = KnowledgeItemRestorationStateInvalidError;

export function restorationStateInvalid(
  details: KnowledgeItemRestorationStateInvalidError['details'],
): KnowledgeItemRestorationStateInvalidError {
  return Object.freeze({
    code: 'KNOWLEDGE_ITEM_RESTORATION_STATE_INVALID' as const,
    message: 'The restored knowledge item state is invalid.',
    details: Object.freeze({ ...details }),
  });
}
