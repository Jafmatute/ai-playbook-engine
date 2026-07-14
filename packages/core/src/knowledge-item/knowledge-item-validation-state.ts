export type KnowledgeItemValidationState = 'pending' | 'valid' | 'invalid';

const VALID_KNOWLEDGE_ITEM_VALIDATION_STATES: ReadonlySet<string> = new Set([
  'pending',
  'valid',
  'invalid',
]);

export function isKnowledgeItemValidationState(
  value: string,
): value is KnowledgeItemValidationState {
  return VALID_KNOWLEDGE_ITEM_VALIDATION_STATES.has(value);
}
