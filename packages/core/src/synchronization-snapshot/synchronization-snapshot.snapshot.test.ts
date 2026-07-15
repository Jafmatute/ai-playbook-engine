import { describe, expect, it } from 'vitest';

import {
  parsePlaybookSourceId,
  parseSynchronizationRunId,
  parseSynchronizationSnapshotId,
  parseWorkspaceId,
} from '../identifiers.js';
import { Instant } from '../instant.js';
import { ContentChecksum } from '../content-checksum.js';
import { StorageReference } from '../storage-reference.js';
import { SourceSchemaVersion } from '../source-schema-version.js';
import { ParserCompatibilityVersion } from '../parser-compatibility-version.js';
import {
  SynchronizationSnapshot,
  type CreateSynchronizationSnapshotInput,
  type RestoreSynchronizationSnapshotInput,
} from '../index.js';

const hex64 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function parsedSnapshotId(value: string) {
  const result = parseSynchronizationSnapshotId(value);
  if (!result.success) throw new Error('Invalid SynchronizationSnapshotId fixture.');
  return result.value;
}

function parsedWsId(value: string) {
  const result = parseWorkspaceId(value);
  if (!result.success) throw new Error('Invalid WorkspaceId fixture.');
  return result.value;
}

function parsedPsId(value: string) {
  const result = parsePlaybookSourceId(value);
  if (!result.success) throw new Error('Invalid PlaybookSourceId fixture.');
  return result.value;
}

function parsedRunId(value: string) {
  const result = parseSynchronizationRunId(value);
  if (!result.success) throw new Error('Invalid SynchronizationRunId fixture.');
  return result.value;
}

function instant(value: string): Instant {
  const result = Instant.parse(value);
  if (!result.success) throw new Error('Invalid Instant fixture.');
  return result.value;
}

function contentChecksum(): ContentChecksum {
  const result = ContentChecksum.create(`sha256:${hex64}`);
  if (!result.success) throw new Error('Invalid ContentChecksum fixture.');
  return result.value;
}

function storageReference(): StorageReference {
  const result = StorageReference.create('snapshots/sync-run-001.json');
  if (!result.success) throw new Error('Invalid StorageReference fixture.');
  return result.value;
}

function sourceSchemaVersion(): SourceSchemaVersion {
  const result = SourceSchemaVersion.create('notion-source-v3');
  if (!result.success) throw new Error('Invalid SourceSchemaVersion fixture.');
  return result.value;
}

function parserCompatibilityVersion(): ParserCompatibilityVersion {
  const result = ParserCompatibilityVersion.create('notion-parser-v2');
  if (!result.success) throw new Error('Invalid ParserCompatibilityVersion fixture.');
  return result.value;
}

const fixtureSnapshotId = parsedSnapshotId('11111111-2222-3333-4444-555555555555');
const fixtureSnapshotIdStr = fixtureSnapshotId;
const fixtureWsId = parsedWsId('de305d54-75b4-431b-adb2-eb6b9e546014');
const fixtureWsIdStr = fixtureWsId;
const fixturePsId = parsedPsId('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
const fixturePsIdStr = fixturePsId;
const fixtureRunId = parsedRunId('bbbbbbbb-cccc-dddd-eeee-ffffffffffff');
const fixtureRunIdStr = fixtureRunId;
const fixtureChecksum = contentChecksum();
const fixtureStorageRef = storageReference();
const fixtureCreatedAt = instant('2026-07-12T10:00:00Z');
const fixtureSourceSchemaVersion = sourceSchemaVersion();
const fixtureParserCompatibilityVersion = parserCompatibilityVersion();

function createInput(
  overrides?: Partial<CreateSynchronizationSnapshotInput>,
): CreateSynchronizationSnapshotInput {
  return {
    synchronizationSnapshotId: fixtureSnapshotId,
    workspaceId: fixtureWsId,
    playbookSourceId: fixturePsId,
    synchronizationRunId: fixtureRunId,
    contentChecksum: fixtureChecksum,
    storageReference: fixtureStorageRef,
    storageFormat: 'json',
    sourceSchemaVersion: fixtureSourceSchemaVersion,
    parserCompatibilityVersion: fixtureParserCompatibilityVersion,
    createdAt: fixtureCreatedAt,
    ...overrides,
  };
}

function restoreInput(
  overrides?: Partial<RestoreSynchronizationSnapshotInput>,
): RestoreSynchronizationSnapshotInput {
  return {
    synchronizationSnapshotId: fixtureSnapshotId,
    workspaceId: fixtureWsId,
    playbookSourceId: fixturePsId,
    synchronizationRunId: fixtureRunId,
    contentChecksum: fixtureChecksum,
    storageReference: fixtureStorageRef,
    storageFormat: 'json',
    sourceSchemaVersion: fixtureSourceSchemaVersion,
    parserCompatibilityVersion: fixtureParserCompatibilityVersion,
    createdAt: fixtureCreatedAt,
    ...overrides,
  };
}

describe('SynchronizationSnapshot.toSnapshot — from created', () => {
  const aggregate = SynchronizationSnapshot.create(createInput());
  const snapshot = aggregate.toSnapshot();

  it('returns frozen object', () => {
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it('serializes synchronizationSnapshotId as string', () => {
    expect(typeof snapshot.synchronizationSnapshotId).toBe('string');
    expect(snapshot.synchronizationSnapshotId).toBe(fixtureSnapshotIdStr);
  });

  it('serializes workspaceId as string', () => {
    expect(typeof snapshot.workspaceId).toBe('string');
    expect(snapshot.workspaceId).toBe(fixtureWsIdStr);
  });

  it('serializes playbookSourceId as string', () => {
    expect(typeof snapshot.playbookSourceId).toBe('string');
    expect(snapshot.playbookSourceId).toBe(fixturePsIdStr);
  });

  it('serializes synchronizationRunId as string', () => {
    expect(typeof snapshot.synchronizationRunId).toBe('string');
    expect(snapshot.synchronizationRunId).toBe(fixtureRunIdStr);
  });

  it('serializes contentChecksum as full canonical string', () => {
    expect(typeof snapshot.contentChecksum).toBe('string');
    expect(snapshot.contentChecksum).toBe(`sha256:${hex64}`);
  });

  it('serializes storageReference as string', () => {
    expect(typeof snapshot.storageReference).toBe('string');
    expect(snapshot.storageReference).toBe('snapshots/sync-run-001.json');
  });

  it('serializes storageFormat as json', () => {
    expect(snapshot.storageFormat).toBe('json');
  });

  it('serializes sourceSchemaVersion as string', () => {
    expect(typeof snapshot.sourceSchemaVersion).toBe('string');
    expect(snapshot.sourceSchemaVersion).toBe('notion-source-v3');
  });

  it('serializes parserCompatibilityVersion as string', () => {
    expect(typeof snapshot.parserCompatibilityVersion).toBe('string');
    expect(snapshot.parserCompatibilityVersion).toBe('notion-parser-v2');
  });

  it('serializes createdAt as ISO string', () => {
    expect(typeof snapshot.createdAt).toBe('string');
    expect(snapshot.createdAt).toBe('2026-07-12T10:00:00.000Z');
  });
});

describe('SynchronizationSnapshot.toSnapshot — from restored', () => {
  const result = SynchronizationSnapshot.restore(restoreInput());
  if (!result.success) throw new Error('Expected successful restore.');

  const snapshot = result.value.toSnapshot();

  it('serializes all fields correctly', () => {
    expect(snapshot.synchronizationSnapshotId).toBe(fixtureSnapshotIdStr);
    expect(snapshot.workspaceId).toBe(fixtureWsIdStr);
    expect(snapshot.playbookSourceId).toBe(fixturePsIdStr);
    expect(snapshot.synchronizationRunId).toBe(fixtureRunIdStr);
    expect(snapshot.contentChecksum).toBe(`sha256:${hex64}`);
    expect(snapshot.storageReference).toBe('snapshots/sync-run-001.json');
    expect(snapshot.storageFormat).toBe('json');
    expect(snapshot.sourceSchemaVersion).toBe('notion-source-v3');
    expect(snapshot.parserCompatibilityVersion).toBe('notion-parser-v2');
    expect(snapshot.createdAt).toBe('2026-07-12T10:00:00.000Z');
  });
});

describe('SynchronizationSnapshot.toSnapshot — new instance each call', () => {
  const aggregate = SynchronizationSnapshot.create(createInput());

  it('returns different references for equivalent snapshots', () => {
    const first = aggregate.toSnapshot();
    const second = aggregate.toSnapshot();

    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });
});

describe('SynchronizationSnapshot.toSnapshot — preserves aggregate', () => {
  it('getters return same instances before and after toSnapshot', () => {
    const aggregate = SynchronizationSnapshot.create(createInput());

    const beforeChecksum = aggregate.contentChecksum;
    const beforeStorageRef = aggregate.storageReference;
    const beforeSourceVersion = aggregate.sourceSchemaVersion;
    const beforeParserVersion = aggregate.parserCompatibilityVersion;
    const beforeCreatedAt = aggregate.createdAt;

    aggregate.toSnapshot();

    expect(aggregate.contentChecksum).toBe(beforeChecksum);
    expect(aggregate.storageReference).toBe(beforeStorageRef);
    expect(aggregate.sourceSchemaVersion).toBe(beforeSourceVersion);
    expect(aggregate.parserCompatibilityVersion).toBe(beforeParserVersion);
    expect(aggregate.createdAt).toBe(beforeCreatedAt);
  });
});

describe('SynchronizationSnapshot.toSnapshot — JSON serializable', () => {
  const aggregate = SynchronizationSnapshot.create(createInput());
  const snapshot = aggregate.toSnapshot();

  it('stringifies without throwing', () => {
    expect(() => JSON.stringify(snapshot)).not.toThrow();
  });

  it('parses back to equivalent object', () => {
    const json = JSON.stringify(snapshot);
    const parsed = JSON.parse(json);

    expect(parsed).toEqual(snapshot);
  });
});
