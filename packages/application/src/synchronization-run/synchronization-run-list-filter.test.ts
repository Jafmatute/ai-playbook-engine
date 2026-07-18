import { describe, expect, it } from 'vitest';

import { Instant } from '@ai-playbook-engine/core';

import type { SynchronizationRunListFilter } from '../index.js';

describe('SynchronizationRunListFilter', () => {
  it('holds an empty filter (all properties absent)', () => {
    const filter: SynchronizationRunListFilter = Object.freeze({});

    expect('status' in filter).toBe(false);
    expect('createdAtFrom' in filter).toBe(false);
    expect('createdAtTo' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('holds a filter by status', () => {
    const filter: SynchronizationRunListFilter = Object.freeze({
      status: 'running',
    });

    expect(filter.status).toBe('running');
    expect('createdAtFrom' in filter).toBe(false);
    expect('createdAtTo' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);

    const status: SynchronizationRunListFilter['status'] = filter.status;
    void status;
  });

  it('holds a filter by creation range', () => {
    const createdAtFromResult = Instant.parse('2026-07-15T00:00:00.000Z');
    if (!createdAtFromResult.success) {
      throw new Error('Expected a valid instant fixture.');
    }

    const createdAtToResult = Instant.parse('2026-07-16T00:00:00.000Z');
    if (!createdAtToResult.success) {
      throw new Error('Expected a valid instant fixture.');
    }

    expect(createdAtFromResult.value.compare(createdAtToResult.value)).toBeLessThan(0);

    const filter: SynchronizationRunListFilter = Object.freeze({
      createdAtFrom: createdAtFromResult.value,
      createdAtTo: createdAtToResult.value,
    });

    expect(filter.createdAtFrom).toBe(createdAtFromResult.value);
    expect(filter.createdAtTo).toBe(createdAtToResult.value);
    expect('status' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('holds a combined filter with status and creation range', () => {
    const createdAtFromResult = Instant.parse('2026-07-15T00:00:00.000Z');
    if (!createdAtFromResult.success) {
      throw new Error('Expected a valid instant fixture.');
    }

    const createdAtToResult = Instant.parse('2026-07-16T00:00:00.000Z');
    if (!createdAtToResult.success) {
      throw new Error('Expected a valid instant fixture.');
    }

    const filter: SynchronizationRunListFilter = Object.freeze({
      status: 'failed',
      createdAtFrom: createdAtFromResult.value,
      createdAtTo: createdAtToResult.value,
    });

    expect(filter.status).toBe('failed');
    expect(filter.createdAtFrom).toBe(createdAtFromResult.value);
    expect(filter.createdAtTo).toBe(createdAtToResult.value);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('preserves the SynchronizationRunListFilter type', () => {
    const filter: SynchronizationRunListFilter = Object.freeze({
      status: 'completed',
    });

    const _acceptsTypedFilter: SynchronizationRunListFilter = filter;

    const status: SynchronizationRunListFilter['status'] | undefined = _acceptsTypedFilter.status;

    void status;
  });
});
