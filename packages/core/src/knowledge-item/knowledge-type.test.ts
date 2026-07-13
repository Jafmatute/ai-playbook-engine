import { describe, expect, it } from 'vitest';

import { isKnowledgeType } from '../index.js';

describe('KnowledgeType', () => {
  const validTypes = [
    'section',
    'methodology',
    'workflow',
    'prompt_definition',
    'criterion',
    'decision_matrix',
    'audit_definition',
    'reference_document',
  ] as const;

  it.each(validTypes)('accepts %s', (type) => {
    expect(isKnowledgeType(type)).toBe(true);
  });

  it.each([
    ['empty string', ''],
    ['uppercase Section', 'Section'],
    ['leading whitespace', ' section'],
    ['trailing whitespace', 'section '],
    ['plural', 'sections'],
    ['hyphen variant', 'prompt-definition'],
    ['camelCase variant', 'promptDefinition'],
    ['hyphen variant decision', 'decision-matrix'],
    ['truncated', 'audit'],
    ['partial', 'reference'],
    ['unknown', 'unknown'],
  ])('rejects %s', (_label, value) => {
    expect(isKnowledgeType(value)).toBe(false);
  });

  it('narrows string to KnowledgeType', () => {
    const values: string[] = ['section', 'methodology'];
    const typed = values.filter(isKnowledgeType);

    expect(typed.length).toBe(2);
  });
});
