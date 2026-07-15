import { describe, expect, it } from 'vitest';

import {
  parsePlaybookId,
  parsePlaybookSourceId,
  parseSynchronizationRunId,
  parseWorkspaceId,
} from '../identifiers.js';
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
const fixtureRunC = parsedRunId('cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa');
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
    lastFailedSynchronizationRunId: null,
    lastFailedSynchronizationAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Estado inicial
// ---------------------------------------------------------------------------

describe('PlaybookSource — initial failure metadata', () => {
  it('has null run id after create', () => {
    const source = createSource();

    expect(source.lastFailedSynchronizationRunId).toBeNull();
  });

  it('has null timestamp after create', () => {
    const source = createSource();

    expect(source.lastFailedSynchronizationAt).toBeNull();
  });

  it('snapshot reflects null values', () => {
    const source = createSource();
    const snapshot = source.toSnapshot();

    expect(snapshot.lastFailedSynchronizationRunId).toBeNull();
    expect(snapshot.lastFailedSynchronizationAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Registro desde enabled
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordFailedSynchronization — from enabled', () => {
  it('returns success', () => {
    const source = createSource();
    const result = source.recordFailedSynchronization({
      synchronizationRunId: fixtureRunA,
      failedAt: fixtureT1,
    });

    expect(result.success).toBe(true);
  });

  it('stores the run id', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });

    expect(source.lastFailedSynchronizationRunId).toBe(fixtureRunA);
  });

  it('stores the timestamp', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });

    expect(source.lastFailedSynchronizationAt).toBe(fixtureT1);
  });
});

// ---------------------------------------------------------------------------
// Registro desde disabled
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordFailedSynchronization — from disabled', () => {
  it('returns success when disabled', () => {
    const source = createSource();
    source.disable();
    const result = source.recordFailedSynchronization({
      synchronizationRunId: fixtureRunA,
      failedAt: fixtureT1,
    });

    expect(result.success).toBe(true);
  });

  it('preserves disabled status', () => {
    const source = createSource();
    source.disable();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });

    expect(source.status).toBe('disabled');
  });
});

// ---------------------------------------------------------------------------
// Reemplazo por fallo posterior
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordFailedSynchronization — replacement', () => {
  it('replaces with a later failure', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunB, failedAt: fixtureT2 });

    expect(source.lastFailedSynchronizationRunId).toBe(fixtureRunB);
    expect(source.lastFailedSynchronizationAt).toBe(fixtureT2);
  });
});

// ---------------------------------------------------------------------------
// Distinto run en el mismo instante
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordFailedSynchronization — same timestamp, different run', () => {
  it('accepts a different run at the same instant', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });
    const result = source.recordFailedSynchronization({
      synchronizationRunId: fixtureRunB,
      failedAt: fixtureT1,
    });

    expect(result.success).toBe(true);
    expect(source.lastFailedSynchronizationRunId).toBe(fixtureRunB);
  });
});

// ---------------------------------------------------------------------------
// Timestamp anterior a creación
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordFailedSynchronization — timestamp before createdAt', () => {
  it('rejects failedAt before createdAt', () => {
    const source = createSource();
    const earlyTime = instant('2026-07-12T09:00:00Z');
    const result = source.recordFailedSynchronization({
      synchronizationRunId: fixtureRunA,
      failedAt: earlyTime,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_SYNCHRONIZATION_METADATA_INVALID',
        details: {
          field: 'lastFailedSynchronization',
          reason: 'timestamp_before_created',
        },
      });
    }
  });

  it('leaves metadata null after rejection', () => {
    const source = createSource();
    source.recordFailedSynchronization({
      synchronizationRunId: fixtureRunA,
      failedAt: instant('2026-07-12T09:00:00Z'),
    });

    expect(source.lastFailedSynchronizationRunId).toBeNull();
    expect(source.lastFailedSynchronizationAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Timestamp anterior al último fallo
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordFailedSynchronization — timestamp before last failure', () => {
  it('rejects failedAt before lastFailedSynchronizationAt', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT2 });
    const result = source.recordFailedSynchronization({
      synchronizationRunId: fixtureRunB,
      failedAt: fixtureT1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_SYNCHRONIZATION_METADATA_INVALID',
        details: {
          field: 'lastFailedSynchronization',
          reason: 'timestamp_before_last_failure',
        },
      });
    }
  });

  it('preserves previous failure metadata', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT2 });
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunB, failedAt: fixtureT1 });

    expect(source.lastFailedSynchronizationRunId).toBe(fixtureRunA);
    expect(source.lastFailedSynchronizationAt).toBe(fixtureT2);
  });
});

// ---------------------------------------------------------------------------
// Mismo run y mismo timestamp
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordFailedSynchronization — unchanged', () => {
  it('rejects the same run and timestamp', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });
    const result = source.recordFailedSynchronization({
      synchronizationRunId: fixtureRunA,
      failedAt: fixtureT1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_SYNCHRONIZATION_METADATA_INVALID',
        details: {
          field: 'lastFailedSynchronization',
          reason: 'unchanged',
        },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Mismo run y timestamp diferente
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordFailedSynchronization — run_timestamp_conflict', () => {
  it('rejects the same run with a different timestamp', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });
    const result = source.recordFailedSynchronization({
      synchronizationRunId: fixtureRunA,
      failedAt: fixtureT2,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_SYNCHRONIZATION_METADATA_INVALID',
        details: {
          field: 'lastFailedSynchronization',
          reason: 'run_timestamp_conflict',
        },
      });
    }
  });

  it('preserves original failure metadata', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT2 });

    expect(source.lastFailedSynchronizationRunId).toBe(fixtureRunA);
    expect(source.lastFailedSynchronizationAt).toBe(fixtureT1);
  });
});

// ---------------------------------------------------------------------------
// Conflicto con éxito
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordFailedSynchronization — run_outcome_conflict with success', () => {
  it('rejects recording a failure for a run already recorded as success', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({
      synchronizationRunId: fixtureRunA,
      succeededAt: fixtureT1,
    });
    const result = source.recordFailedSynchronization({
      synchronizationRunId: fixtureRunA,
      failedAt: fixtureT2,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_SYNCHRONIZATION_METADATA_INVALID',
        details: {
          field: 'lastFailedSynchronization',
          reason: 'run_outcome_conflict',
        },
      });
    }
  });

  it('preserves successful metadata after conflict', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({
      synchronizationRunId: fixtureRunA,
      succeededAt: fixtureT1,
    });
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT2 });

    expect(source.lastSuccessfulSynchronizationRunId).toBe(fixtureRunA);
    expect(source.lastFailedSynchronizationRunId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Éxito y fallo independientes
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordFailedSynchronization — independent success and failure', () => {
  it('allows different runs for success and failure', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({
      synchronizationRunId: fixtureRunA,
      succeededAt: fixtureT2,
    });
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunB, failedAt: fixtureT1 });

    expect(source.lastSuccessfulSynchronizationRunId).toBe(fixtureRunA);
    expect(source.lastSuccessfulSynchronizationAt).toBe(fixtureT2);
    expect(source.lastFailedSynchronizationRunId).toBe(fixtureRunB);
    expect(source.lastFailedSynchronizationAt).toBe(fixtureT1);
  });
});

// ---------------------------------------------------------------------------
// Simetría: éxito rechaza run fallido
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordSuccessfulSynchronization — run_outcome_conflict with failure', () => {
  it('rejects recording success for a run already recorded as failure', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });
    const result = source.recordSuccessfulSynchronization({
      synchronizationRunId: fixtureRunA,
      succeededAt: fixtureT2,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_SYNCHRONIZATION_METADATA_INVALID',
        details: {
          field: 'lastSuccessfulSynchronization',
          reason: 'run_outcome_conflict',
        },
      });
    }
  });

  it('preserves failed metadata after conflict', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });
    source.recordSuccessfulSynchronization({
      synchronizationRunId: fixtureRunA,
      succeededAt: fixtureT2,
    });

    expect(source.lastFailedSynchronizationRunId).toBe(fixtureRunA);
    expect(source.lastSuccessfulSynchronizationRunId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Conservación del Aggregate
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordFailedSynchronization — preserves aggregate', () => {
  it('preserves id', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });

    expect(source.id).toBe(fixturePsId);
  });

  it('preserves workspaceId', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });

    expect(source.workspaceId).toBe(fixtureWsId);
  });

  it('preserves playbookId', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });

    expect(source.playbookId).toBe(fixturePbId);
  });

  it('preserves type', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });

    expect(source.type).toBe('notion');
  });

  it('preserves status', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });

    expect(source.status).toBe('enabled');
  });

  it('preserves externalRootReference', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });

    expect(source.externalRootReference).toBe(fixtureRootRef);
  });

  it('preserves configurationReference', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });

    expect(source.configurationReference).toBe(fixtureConfigRef);
  });

  it('preserves createdAt', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });

    expect(source.createdAt).toBe(fixtureCreatedAt);
  });

  it('preserves successful metadata', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({
      synchronizationRunId: fixtureRunC,
      succeededAt: fixtureT1,
    });
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT2 });

    expect(source.lastSuccessfulSynchronizationRunId).toBe(fixtureRunC);
  });
});

// ---------------------------------------------------------------------------
// Restauración válida
// ---------------------------------------------------------------------------

describe('PlaybookSource.restore — failure metadata', () => {
  it('restores without failure metadata', () => {
    const input = restoreInput();
    const result = PlaybookSource.restore(input);
    if (!result.success) throw new Error('Fixture must be valid.');

    expect(result.value.lastFailedSynchronizationRunId).toBeNull();
    expect(result.value.lastFailedSynchronizationAt).toBeNull();
  });

  it('restores with only failure metadata', () => {
    const input = restoreInput({
      lastFailedSynchronizationRunId: fixtureRunA,
      lastFailedSynchronizationAt: fixtureT1,
    });
    const result = PlaybookSource.restore(input);
    if (!result.success) throw new Error('Fixture must be valid.');

    expect(result.value.lastFailedSynchronizationRunId).toBe(fixtureRunA);
    expect(result.value.lastFailedSynchronizationAt).toBe(fixtureT1);
  });

  it('restores with both success and failure metadata', () => {
    const input = restoreInput({
      lastSuccessfulSynchronizationRunId: fixtureRunA,
      lastSuccessfulSynchronizationAt: fixtureT1,
      lastFailedSynchronizationRunId: fixtureRunB,
      lastFailedSynchronizationAt: fixtureT2,
    });
    const result = PlaybookSource.restore(input);
    if (!result.success) throw new Error('Fixture must be valid.');

    expect(result.value.lastSuccessfulSynchronizationRunId).toBe(fixtureRunA);
    expect(result.value.lastFailedSynchronizationRunId).toBe(fixtureRunB);
  });

  it('snapshot reflects restored failure metadata', () => {
    const input = restoreInput({
      lastFailedSynchronizationRunId: fixtureRunA,
      lastFailedSynchronizationAt: fixtureT1,
    });
    const result = PlaybookSource.restore(input);
    if (!result.success) throw new Error('Fixture must be valid.');

    const snapshot = result.value.toSnapshot();
    expect(snapshot.lastFailedSynchronizationRunId).toBe(fixtureRunA);
    expect(snapshot.lastFailedSynchronizationAt).toBe('2026-07-12T11:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// Restauración inválida
// ---------------------------------------------------------------------------

describe('PlaybookSource.restore — invalid failure metadata', () => {
  it('rejects run id without timestamp', () => {
    const input = restoreInput({
      lastFailedSynchronizationRunId: fixtureRunA,
      lastFailedSynchronizationAt: null,
    });
    const result = PlaybookSource.restore(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_SOURCE_STATE_INVALID');
      expect(result.error.details.reason).toBe('FAILED_RUN_ID_REQUIRES_TIMESTAMP');
    }
  });

  it('rejects timestamp without run id', () => {
    const input = restoreInput({
      lastFailedSynchronizationRunId: null,
      lastFailedSynchronizationAt: fixtureT1,
    });
    const result = PlaybookSource.restore(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_SOURCE_STATE_INVALID');
      expect(result.error.details.reason).toBe('FAILED_TIMESTAMP_REQUIRES_RUN_ID');
    }
  });

  it('rejects timestamp before createdAt', () => {
    const earlyTime = instant('2026-07-12T09:00:00Z');
    const input = restoreInput({
      lastFailedSynchronizationRunId: fixtureRunA,
      lastFailedSynchronizationAt: earlyTime,
    });
    const result = PlaybookSource.restore(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_SOURCE_STATE_INVALID');
      expect(result.error.details.reason).toBe('FAILED_TIMESTAMP_BEFORE_CREATED_AT');
    }
  });

  it('rejects same run recorded as success and failure', () => {
    const input = restoreInput({
      lastSuccessfulSynchronizationRunId: fixtureRunA,
      lastSuccessfulSynchronizationAt: fixtureT1,
      lastFailedSynchronizationRunId: fixtureRunA,
      lastFailedSynchronizationAt: fixtureT2,
    });
    const result = PlaybookSource.restore(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_SOURCE_STATE_INVALID');
      expect(result.error.details.reason).toBe('SAME_RUN_RECORDED_AS_SUCCESS_AND_FAILURE');
    }
  });
});

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordFailedSynchronization — snapshot', () => {
  it('serializes all metadata fields as primitives', () => {
    const source = createSource();
    source.recordSuccessfulSynchronization({
      synchronizationRunId: fixtureRunA,
      succeededAt: fixtureT1,
    });
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunB, failedAt: fixtureT2 });

    const snapshot = source.toSnapshot();
    expect(snapshot.lastSuccessfulSynchronizationRunId).toBe(fixtureRunA);
    expect(snapshot.lastSuccessfulSynchronizationAt).toBe('2026-07-12T11:00:00.000Z');
    expect(snapshot.lastFailedSynchronizationRunId).toBe(fixtureRunB);
    expect(snapshot.lastFailedSynchronizationAt).toBe('2026-07-12T12:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordFailedSynchronization — immutability', () => {
  it('entity is frozen after recording', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });

    expect(Object.isFrozen(source)).toBe(true);
  });

  it('error root is frozen', () => {
    const source = createSource();
    const result = source.recordFailedSynchronization({
      synchronizationRunId: fixtureRunA,
      failedAt: instant('2026-07-12T09:00:00Z'),
    });

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const source = createSource();
    const result = source.recordFailedSynchronization({
      synchronizationRunId: fixtureRunA,
      failedAt: instant('2026-07-12T09:00:00Z'),
    });

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });

  it('snapshot is frozen', () => {
    const source = createSource();
    source.recordFailedSynchronization({ synchronizationRunId: fixtureRunA, failedAt: fixtureT1 });
    const snapshot = source.toSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Atomicidad
// ---------------------------------------------------------------------------

describe('PlaybookSource.recordFailedSynchronization — atomicity', () => {
  it('does not change any property after rejected timestamp_before_created', () => {
    const source = createSource();

    source.recordFailedSynchronization({
      synchronizationRunId: fixtureRunA,
      failedAt: instant('2026-07-12T09:00:00Z'),
    });

    expect(source.lastFailedSynchronizationRunId).toBeNull();
    expect(source.lastFailedSynchronizationAt).toBeNull();
    expect(source.id).toBe(fixturePsId);
    expect(source.status).toBe('enabled');
    expect(source.externalRootReference).toBe(fixtureRootRef);
    expect(source.configurationReference).toBe(fixtureConfigRef);
  });
});
