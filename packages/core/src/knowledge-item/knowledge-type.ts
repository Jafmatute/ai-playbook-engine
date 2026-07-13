export type KnowledgeType =
  | 'section'
  | 'methodology'
  | 'workflow'
  | 'prompt_definition'
  | 'criterion'
  | 'decision_matrix'
  | 'audit_definition'
  | 'reference_document';

const VALID_KNOWLEDGE_TYPES: ReadonlySet<string> = new Set([
  'section',
  'methodology',
  'workflow',
  'prompt_definition',
  'criterion',
  'decision_matrix',
  'audit_definition',
  'reference_document',
]);

export function isKnowledgeType(value: string): value is KnowledgeType {
  return VALID_KNOWLEDGE_TYPES.has(value);
}
