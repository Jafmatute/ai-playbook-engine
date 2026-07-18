import { describe, expect, it } from 'vitest';

import { KnowledgeTitle, parseKnowledgeItemId, SourceStableKey } from '@ai-playbook-engine/core';

import type { KnowledgeItemListFilter } from '../index.js';

describe('KnowledgeItemListFilter', () => {
  it('holds an empty filter (all properties absent)', () => {
    const filter: KnowledgeItemListFilter = Object.freeze({});

    expect('type' in filter).toBe(false);
    expect('parentKnowledgeItemId' in filter).toBe(false);
    expect('title' in filter).toBe(false);
    expect('sourceStableKey' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('holds a filter by type', () => {
    const filter: KnowledgeItemListFilter = Object.freeze({
      type: 'workflow',
    });

    expect(filter.type).toBe('workflow');
    expect('parentKnowledgeItemId' in filter).toBe(false);
    expect('title' in filter).toBe(false);
    expect('sourceStableKey' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);

    const type: KnowledgeItemListFilter['type'] = filter.type;
    void type;
  });

  it('holds a filter by parent knowledge item ID', () => {
    const parentKnowledgeItemIdResult = parseKnowledgeItemId(
      '00000000-0000-0000-0000-000000000006',
    );
    if (!parentKnowledgeItemIdResult.success) {
      throw new Error('Expected a valid knowledge item ID fixture.');
    }

    const filter: KnowledgeItemListFilter = Object.freeze({
      parentKnowledgeItemId: parentKnowledgeItemIdResult.value,
    });

    expect('parentKnowledgeItemId' in filter).toBe(true);
    expect(filter.parentKnowledgeItemId).toBe(parentKnowledgeItemIdResult.value);
    expect('type' in filter).toBe(false);
    expect('title' in filter).toBe(false);
    expect('sourceStableKey' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('holds a filter for root items (parentKnowledgeItemId: null)', () => {
    const filter: KnowledgeItemListFilter = Object.freeze({
      parentKnowledgeItemId: null,
    });

    expect('parentKnowledgeItemId' in filter).toBe(true);
    expect(filter.parentKnowledgeItemId).toBeNull();
    expect('type' in filter).toBe(false);
    expect('title' in filter).toBe(false);
    expect('sourceStableKey' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('holds a filter by title', () => {
    const titleResult = KnowledgeTitle.create('Prompt Review Workflow');
    if (!titleResult.success) {
      throw new Error('Expected a valid knowledge title fixture.');
    }

    const filter: KnowledgeItemListFilter = Object.freeze({
      title: titleResult.value,
    });

    expect(filter.title).toBe(titleResult.value);
    expect('type' in filter).toBe(false);
    expect('parentKnowledgeItemId' in filter).toBe(false);
    expect('sourceStableKey' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('holds a filter by source stable key', () => {
    const sourceStableKeyResult = SourceStableKey.create('notion:block:workflow-review');
    if (!sourceStableKeyResult.success) {
      throw new Error('Expected a valid source stable key fixture.');
    }

    const filter: KnowledgeItemListFilter = Object.freeze({
      sourceStableKey: sourceStableKeyResult.value,
    });

    expect(filter.sourceStableKey).toBe(sourceStableKeyResult.value);
    expect('type' in filter).toBe(false);
    expect('parentKnowledgeItemId' in filter).toBe(false);
    expect('title' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('holds a combined filter with all fields', () => {
    const parentKnowledgeItemIdResult = parseKnowledgeItemId(
      '00000000-0000-0000-0000-000000000006',
    );
    if (!parentKnowledgeItemIdResult.success) {
      throw new Error('Expected a valid knowledge item ID fixture.');
    }

    const titleResult = KnowledgeTitle.create('Prompt Review Workflow');
    if (!titleResult.success) {
      throw new Error('Expected a valid knowledge title fixture.');
    }

    const sourceStableKeyResult = SourceStableKey.create('notion:block:workflow-review');
    if (!sourceStableKeyResult.success) {
      throw new Error('Expected a valid source stable key fixture.');
    }

    const filter: KnowledgeItemListFilter = Object.freeze({
      type: 'workflow',
      parentKnowledgeItemId: parentKnowledgeItemIdResult.value,
      title: titleResult.value,
      sourceStableKey: sourceStableKeyResult.value,
    });

    expect(filter.type).toBe('workflow');
    expect(filter.parentKnowledgeItemId).toBe(parentKnowledgeItemIdResult.value);
    expect(filter.title).toBe(titleResult.value);
    expect(filter.sourceStableKey).toBe(sourceStableKeyResult.value);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('preserves the KnowledgeItemListFilter type', () => {
    const filter: KnowledgeItemListFilter = Object.freeze({
      type: 'criterion',
      parentKnowledgeItemId: null,
    });

    const _acceptsTypedFilter: KnowledgeItemListFilter = filter;

    const type: KnowledgeItemListFilter['type'] | undefined = _acceptsTypedFilter.type;

    const parentKnowledgeItemId: KnowledgeItemListFilter['parentKnowledgeItemId'] =
      _acceptsTypedFilter.parentKnowledgeItemId;

    void type;
    void parentKnowledgeItemId;
  });
});
