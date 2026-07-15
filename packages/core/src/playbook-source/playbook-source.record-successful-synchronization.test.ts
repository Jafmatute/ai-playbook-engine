import { describe, expect, it } from 'vitest';

import { parsePlaybookId, parsePlaybookSourceId, parseSynchronizationRunId, parseWorkspaceId } from '../identifiers.js';
import { Instant } from '../instant.js';
import {
  PlaybookSource,
  PlaybookSourceExternalRootReference,
  PlaybookSourceConfigurationReference,
  type RestorePlaybookSourceInput,
} from '../index.js';

function parsedPsId(value: string) {
  const result = parsePlaybookSourceId(value);
  if (!result.success) throw new Error('Invalid PlaybookSourceId fixture.');
  return result.value;
}

function parsedWsId(value: string) {
  const result = parseWorkspaceId(value);
  if (!result.success) throw new Error('Invalid WorkspaceId fixture.');
  return result.value;
}

function parsedPbId(value: string) {
  const result = parsePlaybookId(value);
  if (!result.success) throw new Error('Invalid PlaybookId fixture.');
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

function externalRootReference(value = 'root-page'): PlaybookSourceExternalRootReference {
  const result = PlaybookSourceExternalRootReference.create(value);
  if (!result.success) throw new Error('Invalid external root reference fixture.');
  return result.value;
}

function configurationReference(value = 'config/main'): PlaybookSourceConfigurationReference {
  const result = PlaybookSourceConfigurationReference.create(value);
  if (!result.success) throw new Error('Invalid configuration reference fixture.');
  return result.value;
}

const fixturePsId = parsedPsId('11111111-2222-3333-4444-555555555555');
const fixtureWsId = parsedWsId('de305d54-75b4-431b-adb2-eb6b9e546014');
const fixturePbId = parsedPbId('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
const fixtureCreatedAt = instant('2026-07-12T10:00:00Z');
const fixtureRootRef = externalRootReference();
const fixtureConfigRef = configurationReference();
const fixtureRunA = parsedRunId('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
const fixtureRunB = parsedRunId('bbbbbbbb-cccc-dddd-eeee-ffffffffffff');
const fixtureT1 = instant('2026-07-12T11:00:00Z');
const fixtureT2 = instant('2026-07-12T12:00:00Z');

function createSource(): PlaybookSource {
  return PlaybookSource.create({
    playbookSourceId: fixturePsId,
    workspaceId: fixtureWsId,
    playbookId: fixturePbId,
    type: 'notion',
    externalRootReference: fixtureRootRef,
    configurationReference: fixtureConfigRef,
    createdAt: fixtureCreatedAt,
  });
}

function restoreInput(overrides?: Partial<RestorePlaybookSourceInput>): RestorePlaybookSourceInput {
  return {
    playbookSourceId: fixturePsId,
    workspaceId: fixtureWsId,
    playbookId: fixturePbId,
    type: 'notion',
    status: 'enabled',
    externalRootReference: fixtureRootRef,
    configurationReference: fixtureConfigRef,
    createdAt: fixtureCreatedAt,
    lastSuccessfulSynchronizationRunId: null,
    lastSuccessfulSynchronizationAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Estado inicial
// ---------------------------------------------------------------------------

describe('PlaybookSource — initial synchronization metadata', () => {
  it('has null run id after create', () => {
    const source = createSource();

    expect(source.lastSuccessfulSynchronizationRunId).toBeNull();
  });

  it('has null timestamp after create', () => {
    const source = createSource();

    expect(source.lastSuccessfulSynchronizationAt).toBeNull();
  });

  it('snapshot reflects null values', () => {
    const source = createSource();
    const snapshot = source.toSnapshot();

    expect(snapshot.lastSuccessfulSynchronizationRunId).toBeNull();
    expect(snapshot.lastSuccessfulSynchronizationAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Registro exitoso desde enabled
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordSuccessfulSynchronization — from enabled', () => {
  it('returns success', () => {
    const source = createSource();
    const result = source.recordSuccessfulSynchronization({
      synchronizationRunId: fixtureRunA,
      succeededAt: fixtureT1,
    });

    expect(result.success).toBe(true);
  });

  it('stores the run id', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({
      synchronizationRunId: fixtureRunA,
      succeededAt: fixtureT1,
    });

    expect(source.lastSuccessfulSynchronizationRunId).toBe(fixtureRunA);
  });

  it('stores the timestamp', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({
      synchronizationRunId: fixtureRunA,
      succeededAt: fixtureT1,
    });

    expect(source.lastSuccessfulSynchronizationAt).toBe(fixtureT1);
  });
});

// ---------------------------------------------------------------------------
// Registro exitoso desde disabled
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordSuccessfulSynchronization — from disabled', () => {
  it('returns success when disabled', () => {
    const source = createSource();
    source.disable();
    const result = source.recordSuccessfulSynchronization({
      synchronizationRunId: fixtureRunA,
      succeededAt: fixtureT1,
    });

    expect(result.success).toBe(true);
  });

  it('preserves disabled status', () => {
    const source = createSource();
    source.disable();
    source.recordSuccessfulSynchronization({
      synchronizationRunId: fixtureRunA,
      succeededAt: fixtureT1,
    });

    expect(source.status).toBe('disabled');
  });
});

// ---------------------------------------------------------------------------
// Reemplazo por un éxito posterior
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordSuccessfulSynchronization — replacement', () => {
  it('replaces with a later run', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunB, succeededAt: fixtureT2 });

    expect(source.lastSuccessfulSynchronizationRunId).toBe(fixtureRunB);
    expect(source.lastSuccessfulSynchronizationAt).toBe(fixtureT2);
  });
});

// ---------------------------------------------------------------------------
// Igualdad temporal con distinto run
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordSuccessfulSynchronization — same timestamp, different run', () => {
  it('accepts a different run at the same instant', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });
    const result = source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunB, succeededAt: fixtureT1 });

    expect(result.success).toBe(true);
    expect(source.lastSuccessfulSynchronizationRunId).toBe(fixtureRunB);
    expect(source.lastSuccessfulSynchronizationAt).toBe(fixtureT1);
  });
});

// ---------------------------------------------------------------------------
// Timestamp anterior a createdAt
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordSuccessfulSynchronization — timestamp before createdAt', () => {
  it('rejects succeededAt before createdAt', () => {
    const source = createSource();
    const earlyTime = instant('2026-07-12T09:00:00Z');
    const result = source.recordSuccessfulSynchronization({
      synchronizationRunId: fixtureRunA,
      succeededAt: earlyTime,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_SYNCHRONIZATION_METADATA_INVALID',
        details: {
          field: 'lastSuccessfulSynchronization',
          reason: 'timestamp_before_created',
        },
      });
    }
  });

  it('leaves metadata null after rejection', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({
      synchronizationRunId: fixtureRunA,
      succeededAt: instant('2026-07-12T09:00:00Z'),
    });

    expect(source.lastSuccessfulSynchronizationRunId).toBeNull();
    expect(source.lastSuccessfulSynchronizationAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Timestamp anterior al último éxito
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordSuccessfulSynchronization — timestamp before last success', () => {
  it('rejects succeededAt before lastSuccessfulSynchronizationAt', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT2 });
    const result = source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunB, succeededAt: fixtureT1 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_SYNCHRONIZATION_METADATA_INVALID',
        details: {
          field: 'lastSuccessfulSynchronization',
          reason: 'timestamp_before_last_success',
        },
      });
    }
  });

  it('preserves previous metadata after rejection', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT2 });
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunB, succeededAt: fixtureT1 });

    expect(source.lastSuccessfulSynchronizationRunId).toBe(fixtureRunA);
    expect(source.lastSuccessfulSynchronizationAt).toBe(fixtureT2);
  });
});

// ---------------------------------------------------------------------------
// Mismo run y mismo timestamp
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordSuccessfulSynchronization — unchanged', () => {
  it('rejects the same run and timestamp', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });
    const result = source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_SYNCHRONIZATION_METADATA_INVALID',
        details: {
          field: 'lastSuccessfulSynchronization',
          reason: 'unchanged',
        },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Mismo run y timestamp diferente
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordSuccessfulSynchronization — run_timestamp_conflict', () => {
  it('rejects the same run with a different timestamp', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });
    const result = source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT2 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_SYNCHRONIZATION_METADATA_INVALID',
        details: {
          field: 'lastSuccessfulSynchronization',
          reason: 'run_timestamp_conflict',
        },
      });
    }
  });

  it('preserves original metadata after conflict', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT2 });

    expect(source.lastSuccessfulSynchronizationRunId).toBe(fixtureRunA);
    expect(source.lastSuccessfulSynchronizationAt).toBe(fixtureT1);
  });
});

// ---------------------------------------------------------------------------
// Conservación del Aggregate
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordSuccessfulSynchronization — preserves aggregate', () => {
  it('preserves id', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });

    expect(source.id).toBe(fixturePsId);
  });

  it('preserves workspaceId', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });

    expect(source.workspaceId).toBe(fixtureWsId);
  });

  it('preserves playbookId', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });

    expect(source.playbookId).toBe(fixturePbId);
  });

  it('preserves type', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });

    expect(source.type).toBe('notion');
  });

  it('preserves status', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });

    expect(source.status).toBe('enabled');
  });

  it('preserves externalRootReference', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });

    expect(source.externalRootReference).toBe(fixtureRootRef);
  });

  it('preserves configurationReference', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });

    expect(source.configurationReference).toBe(fixtureConfigRef);
  });

  it('preserves createdAt', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });

    expect(source.createdAt).toBe(fixtureCreatedAt);
  });
});

// ---------------------------------------------------------------------------
// Restauración válida
// ---------------------------------------------------------------------------

describe('PlaybookSource.restore — synchronization metadata', () => {
  it('restores without metadata', () => {
    const input = restoreInput({
      lastSuccessfulSynchronizationRunId: null,
      lastSuccessfulSynchronizationAt: null,
    });
    const result = PlaybookSource.restore(input);
    if (!result.success) throw new Error('Fixture must be valid.');

    expect(result.value.lastSuccessfulSynchronizationRunId).toBeNull();
    expect(result.value.lastSuccessfulSynchronizationAt).toBeNull();
  });

  it('restores with valid metadata', () => {
    const input = restoreInput({
      status: 'disabled',
      lastSuccessfulSynchronizationRunId: fixtureRunA,
      lastSuccessfulSynchronizationAt: fixtureT1,
    });
    const result = PlaybookSource.restore(input);
    if (!result.success) throw new Error('Fixture must be valid.');

    expect(result.value.lastSuccessfulSynchronizationRunId).toBe(fixtureRunA);
    expect(result.value.lastSuccessfulSynchronizationAt).toBe(fixtureT1);
    expect(result.value.status).toBe('disabled');
  });

  it('snapshot reflects restored metadata', () => {
    const input = restoreInput({
      lastSuccessfulSynchronizationRunId: fixtureRunA,
      lastSuccessfulSynchronizationAt: fixtureT1,
    });
    const result = PlaybookSource.restore(input);
    if (!result.success) throw new Error('Fixture must be valid.');

    const snapshot = result.value.toSnapshot();
    expect(snapshot.lastSuccessfulSynchronizationRunId).toBe(fixtureRunA);
    expect(snapshot.lastSuccessfulSynchronizationAt).toBe('2026-07-12T11:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// Restauración inválida
// ---------------------------------------------------------------------------

describe('PlaybookSource.restore — invalid synchronization metadata', () => {
  it('rejects run id without timestamp', () => {
    const input = restoreInput({
      lastSuccessfulSynchronizationRunId: fixtureRunA,
      lastSuccessfulSynchronizationAt: null,
    });
    const result = PlaybookSource.restore(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_SOURCE_STATE_INVALID');
      expect(result.error.details.reason).toBe('SUCCESSFUL_RUN_ID_REQUIRES_TIMESTAMP');
    }
  });

  it('rejects timestamp without run id', () => {
    const input = restoreInput({
      lastSuccessfulSynchronizationRunId: null,
      lastSuccessfulSynchronizationAt: fixtureT1,
    });
    const result = PlaybookSource.restore(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_SOURCE_STATE_INVALID');
      expect(result.error.details.reason).toBe('SUCCESSFUL_TIMESTAMP_REQUIRES_RUN_ID');
    }
  });

  it('rejects timestamp before createdAt', () => {
    const earlyTime = instant('2026-07-12T09:00:00Z');
    const input = restoreInput({
      lastSuccessfulSynchronizationRunId: fixtureRunA,
      lastSuccessfulSynchronizationAt: earlyTime,
    });
    const result = PlaybookSource.restore(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_SOURCE_STATE_INVALID');
      expect(result.error.details.reason).toBe('SUCCESSFUL_TIMESTAMP_BEFORE_CREATED_AT');
    }
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordSuccessfulSynchronization — immutability', () => {
  it('entity is frozen after recording', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });

    expect(Object.isFrozen(source)).toBe(true);
  });

  it('error root is frozen', () => {
    const source = createSource();
    const result = source.recordSuccessfulSynchronization({
      synchronizationRunId: fixtureRunA,
      succeededAt: instant('2026-07-12T09:00:00Z'),
    });

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const source = createSource();
    const result = source.recordSuccessfulSynchronization({
      synchronizationRunId: fixtureRunA,
      succeededAt: instant('2026-07-12T09:00:00Z'),
    });

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });

  it('snapshot is frozen', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });
    const snapshot = source.toSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Snapshot actualizado
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordSuccessfulSynchronization — snapshot updated', () => {
  it('serializes run id as string', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });
    const snapshot = source.toSnapshot();

    expect(snapshot.lastSuccessfulSynchronizationRunId).toBe(fixtureRunA);
  });

  it('serializes timestamp as ISO string', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({ synchronizationRunId: fixtureRunA, succeededAt: fixtureT1 });
    const snapshot = source.toSnapshot();

    expect(snapshot.lastSuccessfulSynchronizationAt).toBe('2026-07-12T11:00:00.000Z');
  });
});
