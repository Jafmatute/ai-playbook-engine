import { describe, expect, it } from 'vitest';

import { isKnowledgeRelationshipType } from '../index.js';

describe('KnowledgeRelationshipType', () => {
  const validTypes: readonly string[] = [
    'contains',
    'references',
    'implements',
    'uses',
    'evaluates',
    'supports',
    'related_to',
  ];

  it.each(validTypes)('accepts %s', (type) => {
    expect(isKnowledgeRelationshipType(type)).toBe(true);
  });

  it.each([
    ['empty string', ''],
    ['uppercase Contains', 'Contains'],
    ['all uppercase REFERENCES', 'REFERENCES'],
    ['leading whitespace', ' contains'],
    ['trailing whitespace', 'contains '],
    ['truncated contain', 'contain'],
    ['singular reference', 'reference'],
    ['hyphen variant', 'implemented_by'],
    ['hyphen variant used_by', 'used_by'],
    ['truncated related', 'related'],
    ['hyphen variant', 'related-to'],
    ['camelCase variant', 'relatedTo'],
    ['unknown', 'unknown'],
  ])('rejects %s', (_label, value) => {
    expect(isKnowledgeRelationshipType(value)).toBe(false);
  });

  it('narrows string to KnowledgeRelationshipType', () => {
    const values: string[] = ['contains', 'references', 'bogus'];
    const typed = values.filter(isKnowledgeRelationshipType);

    expect(typed.length).toBe(2);
  });
});
