import { describe, expect, it } from 'vitest';

import { isKnowledgeItemValidationState } from '../index.js';

describe('KnowledgeItemValidationState', () => {
  it.each(['pending', 'valid', 'invalid'])('accepts %s', (state) => {
    expect(isKnowledgeItemValidationState(state)).toBe(true);
  });

  it.each([
    ['empty string', ''],
    ['uppercase Pending', 'Pending'],
    ['uppercase VALID', 'VALID'],
    ['leading whitespace', ' pending'],
    ['trailing whitespace', 'pending '],
    ['validated', 'validated'],
    ['validation_failed', 'validation_failed'],
    ['failed', 'failed'],
    ['unknown', 'unknown'],
  ])('rejects %s', (_label, value) => {
    expect(isKnowledgeItemValidationState(value)).toBe(false);
  });

  it('narrows string to KnowledgeItemValidationState', () => {
    const values: string[] = ['pending', 'valid'];
    const typed = values.filter(isKnowledgeItemValidationState);

    expect(typed.length).toBe(2);
  });
});
