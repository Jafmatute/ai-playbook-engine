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
import { SynchronizationSnapshot, type CreateSynchronizationSnapshotInput } from '../index.js';

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
const fixtureWsId = parsedWsId('de305d54-75b4-431b-adb2-eb6b9e546014');
const fixturePsId = parsedPsId('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
const fixtureRunId = parsedRunId('bbbbbbbb-cccc-dddd-eeee-ffffffffffff');
const fixtureChecksum = contentChecksum();
const fixtureStorageRef = storageReference();
const fixtureCreatedAt = instant('2026-07-12T10:00:00Z');
const fixtureSourceSchemaVersion = sourceSchemaVersion();
const fixtureParserCompatibilityVersion = parserCompatibilityVersion();

function validInput(
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

describe('SynchronizationSnapshot.create', () => {
  it('creates an instance of SynchronizationSnapshot', () => {
    const snapshot = SynchronizationSnapshot.create(validInput());

    expect(snapshot).toBeInstanceOf(SynchronizationSnapshot);
  });
});

describe('SynchronizationSnapshot — identity and ownership', () => {
  const snapshot = SynchronizationSnapshot.create(validInput());

  it('returns id', () => {
    expect(snapshot.id).toBe(fixtureSnapshotId);
  });

  it('returns workspaceId', () => {
    expect(snapshot.workspaceId).toBe(fixtureWsId);
  });

  it('returns playbookSourceId', () => {
    expect(snapshot.playbookSourceId).toBe(fixturePsId);
  });

  it('returns synchronizationRunId', () => {
    expect(snapshot.synchronizationRunId).toBe(fixtureRunId);
  });
});

describe('SynchronizationSnapshot — content checksum', () => {
  const snapshot = SynchronizationSnapshot.create(validInput());

  it('returns contentChecksum as the exact instance', () => {
    expect(snapshot.contentChecksum).toBe(fixtureChecksum);
  });
});

describe('SynchronizationSnapshot — storage', () => {
  const snapshot = SynchronizationSnapshot.create(validInput());

  it('returns storageReference as the exact instance', () => {
    expect(snapshot.storageReference).toBe(fixtureStorageRef);
  });

  it('returns storageFormat as json', () => {
    expect(snapshot.storageFormat).toBe('json');
  });
});

describe('SynchronizationSnapshot — versions', () => {
  const schemaSnapshot = SynchronizationSnapshot.create(
    validInput({ sourceSchemaVersion: fixtureSourceSchemaVersion }),
  );
  const parserSnapshot = SynchronizationSnapshot.create(
    validInput({ parserCompatibilityVersion: fixtureParserCompatibilityVersion }),
  );

  it('returns sourceSchemaVersion as the exact instance', () => {
    expect(schemaSnapshot.sourceSchemaVersion).toBe(fixtureSourceSchemaVersion);
  });

  it('returns parserCompatibilityVersion as the exact instance', () => {
    expect(parserSnapshot.parserCompatibilityVersion).toBe(fixtureParserCompatibilityVersion);
  });

  it('source schema and parser compatibility can have different values', () => {
    expect(fixtureSourceSchemaVersion.value).toBe('notion-source-v3');
    expect(fixtureParserCompatibilityVersion.value).toBe('notion-parser-v2');
  });
});

describe('SynchronizationSnapshot — timestamp', () => {
  const snapshot = SynchronizationSnapshot.create(validInput());

  it('returns createdAt as the exact instance', () => {
    expect(snapshot.createdAt).toBe(fixtureCreatedAt);
  });
});

describe('SynchronizationSnapshot — immutability', () => {
  it('aggregate is frozen', () => {
    const snapshot = SynchronizationSnapshot.create(validInput());

    expect(Object.isFrozen(snapshot)).toBe(true);
  });
});

describe('SynchronizationSnapshot — independent instances', () => {
  const secondId = parsedSnapshotId('22222222-3333-4444-5555-666666666666');

  const first = SynchronizationSnapshot.create(validInput());
  const second = SynchronizationSnapshot.create(
    validInput({ synchronizationSnapshotId: secondId }),
  );

  it('are different references', () => {
    expect(first).not.toBe(second);
  });

  it('have different ids', () => {
    expect(first.id).not.toBe(second.id);
  });
});

describe('SynchronizationSnapshot — no cloning of Value Objects', () => {
  it('preserves exact references for all Value Objects', () => {
    const snapshot = SynchronizationSnapshot.create(validInput());

    expect(snapshot.contentChecksum).toBe(fixtureChecksum);
    expect(snapshot.storageReference).toBe(fixtureStorageRef);
    expect(snapshot.sourceSchemaVersion).toBe(fixtureSourceSchemaVersion);
    expect(snapshot.parserCompatibilityVersion).toBe(fixtureParserCompatibilityVersion);
    expect(snapshot.createdAt).toBe(fixtureCreatedAt);
  });
});

describe('SynchronizationSnapshot — API mínima', () => {
  it('does not have toSnapshot yet', () => {
    const snapshot = SynchronizationSnapshot.create(validInput());

    expect((snapshot as unknown as Record<string, unknown>).toSnapshot).toBeUndefined();
  });

  it('does not have updateStorageReference yet', () => {
    const snapshot = SynchronizationSnapshot.create(validInput());

    expect((snapshot as unknown as Record<string, unknown>).updateStorageReference).toBeUndefined();
  });

  it('does not have verifyChecksum yet', () => {
    const snapshot = SynchronizationSnapshot.create(validInput());

    expect((snapshot as unknown as Record<string, unknown>).verifyChecksum).toBeUndefined();
  });

  it('does not have equals', () => {
    const snapshot = SynchronizationSnapshot.create(validInput());

    expect((snapshot as unknown as Record<string, unknown>).equals).toBeUndefined();
  });
});
