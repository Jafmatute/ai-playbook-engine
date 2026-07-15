export type KnowledgeRelationshipType =
  'contains' | 'references' | 'implements' | 'uses' | 'evaluates' | 'supports' | 'related_to';

const VALID_KNOWLEDGE_RELATIONSHIP_TYPES: ReadonlySet<string> = new Set([
  'contains',
  'references',
  'implements',
  'uses',
  'evaluates',
  'supports',
  'related_to',
]);

export function isKnowledgeRelationshipType(value: string): value is KnowledgeRelationshipType {
  return VALID_KNOWLEDGE_RELATIONSHIP_TYPES.has(value);
}
