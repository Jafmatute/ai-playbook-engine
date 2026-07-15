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
const fixtureWsId = parsedWsId('de305d54-75b4-431b-adb2-eb6b9e546014');
const fixturePsId = parsedPsId('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
const fixtureRunId = parsedRunId('bbbbbbbb-cccc-dddd-eeee-ffffffffffff');
const fixtureChecksum = contentChecksum();
const fixtureStorageRef = storageReference();
const fixtureCreatedAt = instant('2026-07-12T10:00:00Z');
const fixtureSourceSchemaVersion = sourceSchemaVersion();
const fixtureParserCompatibilityVersion = parserCompatibilityVersion();

function validRestoreInput(
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

describe('SynchronizationSnapshot.restore', () => {
  it('restaura un snapshot válido', () => {
    const result = SynchronizationSnapshot.restore(validRestoreInput());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBeInstanceOf(SynchronizationSnapshot);
    }
  });
});

describe('SynchronizationSnapshot.restore — identity and ownership', () => {
  const result = SynchronizationSnapshot.restore(validRestoreInput());

  if (!result.success) throw new Error('Expected successful restore.');

  it('returns id', () => {
    expect(result.value.id).toBe(fixtureSnapshotId);
  });

  it('returns workspaceId', () => {
    expect(result.value.workspaceId).toBe(fixtureWsId);
  });

  it('returns playbookSourceId', () => {
    expect(result.value.playbookSourceId).toBe(fixturePsId);
  });

  it('returns synchronizationRunId', () => {
    expect(result.value.synchronizationRunId).toBe(fixtureRunId);
  });
});

describe('SynchronizationSnapshot.restore — preserves Value Objects', () => {
  const result = SynchronizationSnapshot.restore(validRestoreInput());

  if (!result.success) throw new Error('Expected successful restore.');

  it('preserves contentChecksum', () => {
    expect(result.value.contentChecksum).toBe(fixtureChecksum);
  });

  it('preserves storageReference', () => {
    expect(result.value.storageReference).toBe(fixtureStorageRef);
  });

  it('preserves sourceSchemaVersion', () => {
    expect(result.value.sourceSchemaVersion).toBe(fixtureSourceSchemaVersion);
  });

  it('preserves parserCompatibilityVersion', () => {
    expect(result.value.parserCompatibilityVersion).toBe(fixtureParserCompatibilityVersion);
  });

  it('preserves createdAt', () => {
    expect(result.value.createdAt).toBe(fixtureCreatedAt);
  });
});

describe('SynchronizationSnapshot.restore — format', () => {
  const result = SynchronizationSnapshot.restore(validRestoreInput());

  if (!result.success) throw new Error('Expected successful restore.');

  it('storageFormat is json', () => {
    expect(result.value.storageFormat).toBe('json');
  });
});

describe('SynchronizationSnapshot.restore — unknown format', () => {
  it('rechaza formato desconocido', () => {
    const result = SynchronizationSnapshot.restore(
      validRestoreInput({ storageFormat: 'yaml' as never }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('SYNCHRONIZATION_SNAPSHOT_STATE_INVALID');
      expect(result.error.message).toBe('The synchronization snapshot state is invalid.');
      expect(result.error.details.reason).toBe('UNKNOWN_STORAGE_FORMAT');
    }
  });
});

describe('SynchronizationSnapshot.restore — error immutability', () => {
  it('error and details are frozen', () => {
    const result = SynchronizationSnapshot.restore(
      validRestoreInput({ storageFormat: 'yaml' as never }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});

describe('SynchronizationSnapshot.restore — aggregate immutability', () => {
  it('restored aggregate is frozen', () => {
    const result = SynchronizationSnapshot.restore(validRestoreInput());

    if (!result.success) throw new Error('Expected successful restore.');
    expect(Object.isFrozen(result.value)).toBe(true);
  });
});

describe('SynchronizationSnapshot.restore — atomicity', () => {
  it('unknown format does not return a partial aggregate', () => {
    const result = SynchronizationSnapshot.restore(
      validRestoreInput({ storageFormat: 'yaml' as never }),
    );

    expect(result.success).toBe(false);
  });
});

describe('SynchronizationSnapshot.restore — API continuity', () => {
  const created = SynchronizationSnapshot.create(
    validRestoreInput() as unknown as CreateSynchronizationSnapshotInput,
  );
  const result = SynchronizationSnapshot.restore(validRestoreInput());

  if (!result.success) throw new Error('Expected successful restore.');
  const restored = result.value;

  it('created and restored expose the same getters', () => {
    expect(typeof created.id).toBe(typeof restored.id);
    expect(typeof created.workspaceId).toBe(typeof restored.workspaceId);
    expect(typeof created.playbookSourceId).toBe(typeof restored.playbookSourceId);
    expect(typeof created.synchronizationRunId).toBe(typeof restored.synchronizationRunId);
    expect(typeof created.contentChecksum).toBe(typeof restored.contentChecksum);
    expect(typeof created.storageReference).toBe(typeof restored.storageReference);
    expect(typeof created.storageFormat).toBe(typeof restored.storageFormat);
    expect(typeof created.sourceSchemaVersion).toBe(typeof restored.sourceSchemaVersion);
    expect(typeof created.parserCompatibilityVersion).toBe(
      typeof restored.parserCompatibilityVersion,
    );
    expect(typeof created.createdAt).toBe(typeof restored.createdAt);
  });
});
