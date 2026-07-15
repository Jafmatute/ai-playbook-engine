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
