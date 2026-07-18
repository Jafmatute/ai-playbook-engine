import { describe, expect, it } from 'vitest';

import { Instant, parseSynchronizationSnapshotId, VersionSequence } from '@ai-playbook-engine/core';

import type { PlaybookVersionListFilter } from '../index.js';

describe('PlaybookVersionListFilter', () => {
  it('holds an empty filter (all properties absent)', () => {
    const filter: PlaybookVersionListFilter = Object.freeze({});

    expect('status' in filter).toBe(false);
    expect('versionSequenceFrom' in filter).toBe(false);
    expect('versionSequenceTo' in filter).toBe(false);
    expect('publishedAtFrom' in filter).toBe(false);
    expect('publishedAtTo' in filter).toBe(false);
    expect('synchronizationSnapshotId' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('holds a filter by status', () => {
    const filter: PlaybookVersionListFilter = Object.freeze({
      status: 'published',
    });

    expect(filter.status).toBe('published');
    expect('versionSequenceFrom' in filter).toBe(false);
    expect('versionSequenceTo' in filter).toBe(false);
    expect('publishedAtFrom' in filter).toBe(false);
    expect('publishedAtTo' in filter).toBe(false);
    expect('synchronizationSnapshotId' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);

    const status: PlaybookVersionListFilter['status'] = filter.status;
    void status;
  });

  it('holds a filter by version sequence range', () => {
    const versionSequenceFromResult = VersionSequence.create(3);
    if (!versionSequenceFromResult.success) {
      throw new Error('Expected a valid version sequence fixture.');
    }

    const versionSequenceToResult = VersionSequence.create(8);
    if (!versionSequenceToResult.success) {
      throw new Error('Expected a valid version sequence fixture.');
    }

    expect(versionSequenceFromResult.value.compare(versionSequenceToResult.value)).toBeLessThan(0);

    const filter: PlaybookVersionListFilter = Object.freeze({
      versionSequenceFrom: versionSequenceFromResult.value,
      versionSequenceTo: versionSequenceToResult.value,
    });

    expect(filter.versionSequenceFrom).toBe(versionSequenceFromResult.value);
    expect(filter.versionSequenceTo).toBe(versionSequenceToResult.value);
    expect('status' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('holds a filter by published-at range', () => {
    const publishedAtFromResult = Instant.parse('2026-07-15T00:00:00.000Z');
    if (!publishedAtFromResult.success) {
      throw new Error('Expected a valid instant fixture.');
    }

    const publishedAtToResult = Instant.parse('2026-07-16T00:00:00.000Z');
    if (!publishedAtToResult.success) {
      throw new Error('Expected a valid instant fixture.');
    }

    expect(publishedAtFromResult.value.compare(publishedAtToResult.value)).toBeLessThan(0);

    const filter: PlaybookVersionListFilter = Object.freeze({
      publishedAtFrom: publishedAtFromResult.value,
      publishedAtTo: publishedAtToResult.value,
    });

    expect(filter.publishedAtFrom).toBe(publishedAtFromResult.value);
    expect(filter.publishedAtTo).toBe(publishedAtToResult.value);
    expect('status' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('holds a filter by synchronization snapshot ID', () => {
    const synchronizationSnapshotIdResult = parseSynchronizationSnapshotId(
      '00000000-0000-0000-0000-000000000006',
    );
    if (!synchronizationSnapshotIdResult.success) {
      throw new Error('Expected a valid synchronization snapshot ID fixture.');
    }

    const filter: PlaybookVersionListFilter = Object.freeze({
      synchronizationSnapshotId: synchronizationSnapshotIdResult.value,
    });

    expect(filter.synchronizationSnapshotId).toBe(synchronizationSnapshotIdResult.value);
    expect('status' in filter).toBe(false);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('holds a combined filter with all fields', () => {
    const versionSequenceFromResult = VersionSequence.create(3);
    if (!versionSequenceFromResult.success) {
      throw new Error('Expected a valid version sequence fixture.');
    }

    const versionSequenceToResult = VersionSequence.create(8);
    if (!versionSequenceToResult.success) {
      throw new Error('Expected a valid version sequence fixture.');
    }

    const publishedAtFromResult = Instant.parse('2026-07-15T00:00:00.000Z');
    if (!publishedAtFromResult.success) {
      throw new Error('Expected a valid instant fixture.');
    }

    const publishedAtToResult = Instant.parse('2026-07-16T00:00:00.000Z');
    if (!publishedAtToResult.success) {
      throw new Error('Expected a valid instant fixture.');
    }

    const synchronizationSnapshotIdResult = parseSynchronizationSnapshotId(
      '00000000-0000-0000-0000-000000000006',
    );
    if (!synchronizationSnapshotIdResult.success) {
      throw new Error('Expected a valid synchronization snapshot ID fixture.');
    }

    const filter: PlaybookVersionListFilter = Object.freeze({
      status: 'archived',
      versionSequenceFrom: versionSequenceFromResult.value,
      versionSequenceTo: versionSequenceToResult.value,
      publishedAtFrom: publishedAtFromResult.value,
      publishedAtTo: publishedAtToResult.value,
      synchronizationSnapshotId: synchronizationSnapshotIdResult.value,
    });

    expect(filter.status).toBe('archived');
    expect(filter.versionSequenceFrom).toBe(versionSequenceFromResult.value);
    expect(filter.versionSequenceTo).toBe(versionSequenceToResult.value);
    expect(filter.publishedAtFrom).toBe(publishedAtFromResult.value);
    expect(filter.publishedAtTo).toBe(publishedAtToResult.value);
    expect(filter.synchronizationSnapshotId).toBe(synchronizationSnapshotIdResult.value);
    expect(Object.isFrozen(filter)).toBe(true);
  });

  it('preserves the PlaybookVersionListFilter type', () => {
    const filter: PlaybookVersionListFilter = Object.freeze({
      status: 'validated',
    });

    const _acceptsTypedFilter: PlaybookVersionListFilter = filter;

    const status: PlaybookVersionListFilter['status'] | undefined = _acceptsTypedFilter.status;

    void status;
  });
});
