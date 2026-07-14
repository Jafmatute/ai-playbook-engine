import { describe, expect, it } from 'vitest';

import {
  createKnowledgeItemAttributes,
  isKnowledgeItemAttributes,
  knowledgeItemAttributesMatchType,
  type KnowledgeItemAttributes,
} from '../index.js';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

describe('createKnowledgeItemAttributes', () => {
  const knowledgeTypes = [
    'section',
    'methodology',
    'workflow',
    'prompt_definition',
    'criterion',
    'decision_matrix',
    'audit_definition',
    'reference_document',
  ] as const;

  it.each(knowledgeTypes)('produces the correct discriminant for %s', (type) => {
    const attributes = createKnowledgeItemAttributes(type);

    expect(attributes.type).toBe(type);
  });

  it.each(knowledgeTypes)('returns a frozen object for %s', (type) => {
    const attributes = createKnowledgeItemAttributes(type);

    expect(Object.isFrozen(attributes)).toBe(true);
  });

  it.each(knowledgeTypes)('has no additional properties for %s', (type) => {
    const attributes = createKnowledgeItemAttributes(type) as unknown as Record<string, unknown>;

    expect(Object.keys(attributes)).toEqual(['type']);
  });
});

// ---------------------------------------------------------------------------
// Compatibility
// ---------------------------------------------------------------------------

describe('knowledgeItemAttributesMatchType', () => {
  const knowledgeTypes = [
    'section',
    'methodology',
    'workflow',
    'prompt_definition',
    'criterion',
    'decision_matrix',
    'audit_definition',
    'reference_document',
  ] as const;

  it.each(knowledgeTypes)('returns true when attributes match %s', (type) => {
    const attributes = createKnowledgeItemAttributes(type);

    expect(knowledgeItemAttributesMatchType(attributes, type)).toBe(true);
  });

  it('returns false when types differ', () => {
    const attributes = createKnowledgeItemAttributes('workflow');

    expect(knowledgeItemAttributesMatchType(attributes, 'methodology')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Guard — valid
// ---------------------------------------------------------------------------

describe('isKnowledgeItemAttributes — valid', () => {
  const knowledgeTypes = [
    'section',
    'methodology',
    'workflow',
    'prompt_definition',
    'criterion',
    'decision_matrix',
    'audit_definition',
    'reference_document',
  ] as const;

  it.each(knowledgeTypes)('accepts %s attributes', (type) => {
    const attributes = createKnowledgeItemAttributes(type);

    expect(isKnowledgeItemAttributes(attributes)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Guard — invalid
// ---------------------------------------------------------------------------

describe('isKnowledgeItemAttributes — invalid', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty array', []],
    ['empty object', {}],
    ['type is empty string', { type: '' }],
    ['type is unknown', { type: 'unknown' }],
    ['type is Workflow', { type: 'Workflow' }],
    ['type has leading space', { type: ' workflow' }],
    ['type has trailing space', { type: 'workflow ' }],
    ['extra property steps', { type: 'workflow', steps: [] }],
    ['extra property metadata', { type: 'criterion', metadata: {} }],
  ])('rejects %s', (_label, value) => {
    expect(isKnowledgeItemAttributes(value)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Narrowing
// ---------------------------------------------------------------------------

describe('isKnowledgeItemAttributes — narrowing', () => {
  it('narrows unknown to KnowledgeItemAttributes', () => {
    const value: unknown = { type: 'workflow' };

    if (isKnowledgeItemAttributes(value)) {
      const typed: KnowledgeItemAttributes = value;

      expect(typed.type).toBe('workflow');
    }
  });
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

describe('KnowledgeItemAttributes — public API', () => {
  it('exports createKnowledgeItemAttributes', () => {
    expect(createKnowledgeItemAttributes).toBeDefined();
  });

  it('exports isKnowledgeItemAttributes', () => {
    expect(isKnowledgeItemAttributes).toBeDefined();
  });

  it('exports knowledgeItemAttributesMatchType', () => {
    expect(knowledgeItemAttributesMatchType).toBeDefined();
  });
});
