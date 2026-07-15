import type { KnowledgeItemId } from '../identifiers.js';
import type { KnowledgeRelationshipType } from './knowledge-relationship-type.js';

export interface KnowledgeRelationshipSelfReferenceError {
  readonly code: 'KNOWLEDGE_RELATIONSHIP_SELF_REFERENCE';
  readonly message: string;
  readonly details: {
    readonly knowledgeItemId: KnowledgeItemId;
    readonly relationshipType: KnowledgeRelationshipType;
  };
}

export type KnowledgeRelationshipCreationError = KnowledgeRelationshipSelfReferenceError;

export function selfReference(
  details: KnowledgeRelationshipSelfReferenceError['details'],
): KnowledgeRelationshipSelfReferenceError {
  return Object.freeze({
    code: 'KNOWLEDGE_RELATIONSHIP_SELF_REFERENCE' as const,
    message: 'A knowledge relationship cannot reference the same item as source and target.',
    details: Object.freeze({ ...details }),
  });
}

export type KnowledgeRelationshipRestorationInvalidField =
  'type' | 'sourceKnowledgeItemId' | 'targetKnowledgeItemId';

export type KnowledgeRelationshipRestorationInvalidReason =
  'unknown_relationship_type' | 'self_reference';

export interface KnowledgeRelationshipRestorationStateInvalidError {
  readonly code: 'KNOWLEDGE_RELATIONSHIP_RESTORATION_STATE_INVALID';
  readonly message: string;
  readonly details: {
    readonly field: KnowledgeRelationshipRestorationInvalidField;
    readonly reason: KnowledgeRelationshipRestorationInvalidReason;
    readonly currentValue?: string;
    readonly knowledgeItemId?: KnowledgeItemId;
    readonly relationshipType?: KnowledgeRelationshipType;
  };
}

export type KnowledgeRelationshipRestorationError =
  KnowledgeRelationshipRestorationStateInvalidError;

export function restorationStateInvalid(
  details: KnowledgeRelationshipRestorationStateInvalidError['details'],
): KnowledgeRelationshipRestorationStateInvalidError {
  return Object.freeze({
    code: 'KNOWLEDGE_RELATIONSHIP_RESTORATION_STATE_INVALID' as const,
    message: 'The restored knowledge relationship state is invalid.',
    details: Object.freeze({ ...details }),
  });
}
