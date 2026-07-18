import { describe, expect, it } from 'vitest';

import type { PlaybookStatus } from '@ai-playbook-engine/core';

import type { PlaybookListFilter } from '../index.js';

describe('PlaybookListFilter', () => {
  it('holds an empty filter (all properties absent)', () => {
    const filter: PlaybookListFilter = Object.freeze({});

    expect('status' in filter).toBe(false);
    expect('normalizedNamePrefix' in filter).toBe(false);
    expect('hasActiveVersion' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('holds a filter by status', () => {
    const filter: PlaybookListFilter = Object.freeze({
      status: 'active',
    });

    expect(filter.status).toBe('active');
    expect('normalizedNamePrefix' in filter).toBe(false);
    expect('hasActiveVersion' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);

    const status: PlaybookStatus | undefined = filter.status;
    void status;
  });

  it('holds a filter by normalizedNamePrefix', () => {
    const normalizedNamePrefix = 'ai engineering';

    const filter: PlaybookListFilter = Object.freeze({
      normalizedNamePrefix,
    });

    expect(filter.normalizedNamePrefix).toBe(normalizedNamePrefix);
    expect('status' in filter).toBe(false);
    expect('hasActiveVersion' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('holds a filter with hasActiveVersion: true', () => {
    const filter: PlaybookListFilter = Object.freeze({
      hasActiveVersion: true,
    });

    expect('hasActiveVersion' in filter).toBe(true);
    expect(filter.hasActiveVersion).toBe(true);
    expect('status' in filter).toBe(false);
    expect('normalizedNamePrefix' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('holds a filter with hasActiveVersion: false', () => {
    const filter: PlaybookListFilter = Object.freeze({
      hasActiveVersion: false,
    });

    expect('hasActiveVersion' in filter).toBe(true);
    expect(filter.hasActiveVersion).toBe(false);
    expect('status' in filter).toBe(false);
    expect('normalizedNamePrefix' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('holds a combined filter with all fields', () => {
    const normalizedNamePrefix = 'ai engineering';

    const filter: PlaybookListFilter = Object.freeze({
      status: 'active',
      normalizedNamePrefix,
      hasActiveVersion: true,
    });

    expect(filter.status).toBe('active');
    expect(filter.normalizedNamePrefix).toBe(normalizedNamePrefix);
    expect(filter.hasActiveVersion).toBe(true);
    expect('status' in filter).toBe(true);
    expect('normalizedNamePrefix' in filter).toBe(true);
    expect('hasActiveVersion' in filter).toBe(true);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('preserves the PlaybookListFilter type', () => {
    const filter: PlaybookListFilter = Object.freeze({
      status: 'archived',
      normalizedNamePrefix: 'legacy',
      hasActiveVersion: false,
    });

    const _acceptsTypedFilter: PlaybookListFilter = filter;

    const status: PlaybookListFilter['status'] = _acceptsTypedFilter.status;
    const normalizedNamePrefix: PlaybookListFilter['normalizedNamePrefix'] =
      _acceptsTypedFilter.normalizedNamePrefix;
    const hasActiveVersion: PlaybookListFilter['hasActiveVersion'] =
      _acceptsTypedFilter.hasActiveVersion;

    void status;
    void normalizedNamePrefix;
    void hasActiveVersion;
  });
});
