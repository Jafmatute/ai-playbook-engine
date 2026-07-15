export {
  isKnowledgeRelationshipType,
  type KnowledgeRelationshipType,
} from './knowledge-relationship-type.js';
export { KnowledgeRelationship } from './knowledge-relationship.js';
export type {
  CreateKnowledgeRelationshipInput,
  RestoreKnowledgeRelationshipInput,
} from './knowledge-relationship-contracts.js';
export type {
  KnowledgeRelationshipCreationError,
  KnowledgeRelationshipSelfReferenceError,
  KnowledgeRelationshipRestorationError,
  KnowledgeRelationshipRestorationInvalidField,
  KnowledgeRelationshipRestorationInvalidReason,
  KnowledgeRelationshipRestorationStateInvalidError,
} from './knowledge-relationship-errors.js';
