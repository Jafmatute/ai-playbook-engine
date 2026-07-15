import { describe, expect, it } from 'vitest';

import {
  parsePlaybookId,
  parsePlaybookSourceId,
  parseSynchronizationRunId,
  parseWorkspaceId,
} from '../identifiers.js';
import { Instant } from '../instant.js';
import {
  SynchronizationRun,
  SynchronizationFailure,
  type CreateSynchronizationRunInput,
} from '../index.js';

function parsedRunId(value: string) {
  const result = parseSynchronizationRunId(value);
  if (!result.success) throw new Error('Invalid SynchronizationRunId fixture.');
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

function parsedPsId(value: string) {
  const result = parsePlaybookSourceId(value);
  if (!result.success) throw new Error('Invalid PlaybookSourceId fixture.');
  return result.value;
}

function instant(value: string): Instant {
  const result = Instant.parse(value);
  if (!result.success) throw new Error('Invalid Instant fixture.');
  return result.value;
}

const fixtureRunId = parsedRunId('11111111-2222-3333-4444-555555555555');
const fixtureWsId = parsedWsId('de305d54-75b4-431b-adb2-eb6b9e546014');
const fixturePbId = parsedPbId('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
const fixturePsId = parsedPsId('bbbbbbbb-cccc-dddd-eeee-ffffffffffff');
const fixtureCreatedAt = instant('2026-07-12T10:00:00Z');
const fixtureStartedAt = instant('2026-07-12T10:05:00Z');

function createInput(
  overrides?: Partial<CreateSynchronizationRunInput>,
): CreateSynchronizationRunInput {
  return {
    synchronizationRunId: fixtureRunId,
    workspaceId: fixtureWsId,
    playbookId: fixturePbId,
    playbookSourceId: fixturePsId,
    createdAt: fixtureCreatedAt,
    ...overrides,
  };
}

function makeFailure() {
  const result = SynchronizationFailure.create({
    code: 'SOURCE_UNAVAILABLE',
    message: 'The source is not reachable.',
    stage: 'retrieval',
    retryable: true,
    externalReference: 'http-status:503',
  });
  if (!result.success) throw new Error('Invalid failure fixture.');
  return result.value;
}

function makeOtherFailure() {
  const result = SynchronizationFailure.create({
    code: 'AUTHENTICATION_FAILED',
    message: 'Authentication token expired.',
    stage: 'authentication',
    retryable: false,
    externalReference: null,
  });
  if (!result.success) throw new Error('Invalid failure fixture.');
  return result.value;
}

function startedRun(): SynchronizationRun {
  const run = SynchronizationRun.create(createInput());
  run.start({ startedAt: fixtureStartedAt });
  return run;
}

// ---------------------------------------------------------------------------
// Fallo exitoso
// ---------------------------------------------------------------------------

describe('SynchronizationRun.fail — successful', () => {
  it('fails from running', () => {
    const run = startedRun();
    const failure = makeFailure();
    const failedAt = instant('2026-07-12T10:10:00Z');
    const result = run.fail({ failedAt, failure });

    expect(result.success).toBe(true);
  });

  it('changes status to failed', () => {
    const run = startedRun();
    const failure = makeFailure();
    run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure });

    expect(run.status).toBe('failed');
  });

  it('stores completedAt as failedAt', () => {
    const run = startedRun();
    const failure = makeFailure();
    const failedAt = instant('2026-07-12T10:10:00Z');
    run.fail({ failedAt, failure });

    expect(run.completedAt).toBe(failedAt);
  });

  it('stores the failure value object', () => {
    const run = startedRun();
    const failure = makeFailure();
    run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure });

    expect(run.failure).toBe(failure);
  });

  it('stores failure that equals the original', () => {
    const run = startedRun();
    const failure = makeFailure();
    run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure });

    expect(run.failure!.equals(failure)).toBe(true);
  });

  it('sets synchronizationSnapshotId to null', () => {
    const run = startedRun();
    const failure = makeFailure();
    run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure });

    expect(run.synchronizationSnapshotId).toBeNull();
  });

  it('preserves startedAt', () => {
    const run = startedRun();
    const failure = makeFailure();
    run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure });

    expect(run.startedAt).toBe(fixtureStartedAt);
  });

  it('preserves id', () => {
    const run = startedRun();
    const failure = makeFailure();
    run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure });

    expect(run.id).toBe(fixtureRunId);
  });

  it('preserves workspaceId', () => {
    const run = startedRun();
    const failure = makeFailure();
    run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure });

    expect(run.workspaceId).toBe(fixtureWsId);
  });

  it('preserves playbookId', () => {
    const run = startedRun();
    const failure = makeFailure();
    run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure });

    expect(run.playbookId).toBe(fixturePbId);
  });

  it('preserves playbookSourceId', () => {
    const run = startedRun();
    const failure = makeFailure();
    run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure });

    expect(run.playbookSourceId).toBe(fixturePsId);
  });

  it('preserves createdAt', () => {
    const run = startedRun();
    const failure = makeFailure();
    run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure });

    expect(run.createdAt.equals(fixtureCreatedAt)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Igualdad temporal
// ---------------------------------------------------------------------------

describe('SynchronizationRun.fail — timestamp equality', () => {
  it('accepts failedAt equal to startedAt', () => {
    const run = startedRun();
    const failure = makeFailure();
    const result = run.fail({ failedAt: fixtureStartedAt, failure });

    expect(result.success).toBe(true);
    expect(run.completedAt).toBe(fixtureStartedAt);
  });
});

// ---------------------------------------------------------------------------
// Timestamp anterior al inicio
// ---------------------------------------------------------------------------

describe('SynchronizationRun.fail — timestamp before startedAt', () => {
  it('rejects failedAt before startedAt', () => {
    const run = startedRun();
    const failure = makeFailure();
    const earlier = instant('2026-07-12T10:00:00Z');
    const result = run.fail({ failedAt: earlier, failure });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'SYNCHRONIZATION_RUN_TIMESTAMP_INVALID',
        details: {
          operation: 'fail',
          field: 'failedAt',
          reason: 'timestamp_before_started',
        },
      });
    }
  });

  it('does not change status after invalid timestamp', () => {
    const run = startedRun();
    const failure = makeFailure();
    const earlier = instant('2026-07-12T10:00:00Z');
    run.fail({ failedAt: earlier, failure });

    expect(run.status).toBe('running');
    expect(run.completedAt).toBeNull();
    expect(run.failure).toBeNull();
    expect(run.startedAt).toBe(fixtureStartedAt);
  });
});

// ---------------------------------------------------------------------------
// Fallo desde pending
// ---------------------------------------------------------------------------

describe('SynchronizationRun.fail — from pending', () => {
  it('rejects fail from pending', () => {
    const run = SynchronizationRun.create(createInput());
    const failure = makeFailure();
    const result = run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'SYNCHRONIZATION_RUN_TRANSITION_NOT_ALLOWED',
        details: {
          operation: 'fail',
          currentStatus: 'pending',
          expectedStatus: 'running',
        },
      });
    }
  });

  it('preserves initial state after rejected fail', () => {
    const run = SynchronizationRun.create(createInput());
    const failure = makeFailure();
    run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure });

    expect(run.status).toBe('pending');
    expect(run.startedAt).toBeNull();
    expect(run.completedAt).toBeNull();
    expect(run.failure).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Segundo fallo
// ---------------------------------------------------------------------------

describe('SynchronizationRun.fail — second call', () => {
  it('rejects a second fail', () => {
    const run = startedRun();
    const failure = makeFailure();
    const firstFailedAt = instant('2026-07-12T10:10:00Z');
    run.fail({ failedAt: firstFailedAt, failure });

    const otherFailure = makeOtherFailure();
    const second = run.fail({ failedAt: instant('2026-07-12T10:15:00Z'), failure: otherFailure });

    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.error).toMatchObject({
        code: 'SYNCHRONIZATION_RUN_TRANSITION_NOT_ALLOWED',
        details: {
          operation: 'fail',
          currentStatus: 'failed',
          expectedStatus: 'running',
        },
      });
    }
  });

  it('preserves first completedAt after rejected second fail', () => {
    const run = startedRun();
    const failure = makeFailure();
    const firstFailedAt = instant('2026-07-12T10:10:00Z');
    run.fail({ failedAt: firstFailedAt, failure });

    const otherFailure = makeOtherFailure();
    run.fail({ failedAt: instant('2026-07-12T10:15:00Z'), failure: otherFailure });

    expect(run.failure).toBe(failure);
    expect(run.completedAt).toBe(firstFailedAt);
    expect(run.status).toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// Prioridad
// ---------------------------------------------------------------------------

describe('SynchronizationRun.fail — validation priority', () => {
  it('returns transition_not_allowed before timestamp error on second call', () => {
    const run = startedRun();
    const failure = makeFailure();
    run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure });

    const earlier = instant('2026-07-12T10:00:00Z');
    const otherFailure = makeOtherFailure();
    const second = run.fail({ failedAt: earlier, failure: otherFailure });

    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.error).toMatchObject({
        code: 'SYNCHRONIZATION_RUN_TRANSITION_NOT_ALLOWED',
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad de la entidad
// ---------------------------------------------------------------------------

describe('SynchronizationRun.fail — entity immutability', () => {
  it('entity is frozen before fail', () => {
    const run = startedRun();

    expect(Object.isFrozen(run)).toBe(true);
  });

  it('entity is frozen after fail', () => {
    const run = startedRun();
    const failure = makeFailure();
    run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure });

    expect(Object.isFrozen(run)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Errores congelados
// ---------------------------------------------------------------------------

describe('SynchronizationRun.fail — error immutability', () => {
  it('error root is frozen for transition_not_allowed', () => {
    const run = SynchronizationRun.create(createInput());
    const failure = makeFailure();
    const result = run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure });

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen for transition_not_allowed', () => {
    const run = SynchronizationRun.create(createInput());
    const failure = makeFailure();
    const result = run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure });

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });

  it('error root is frozen for timestamp_invalid', () => {
    const run = startedRun();
    const failure = makeFailure();
    const earlier = instant('2026-07-12T10:00:00Z');
    const result = run.fail({ failedAt: earlier, failure });

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen for timestamp_invalid', () => {
    const run = startedRun();
    const failure = makeFailure();
    const earlier = instant('2026-07-12T10:00:00Z');
    const result = run.fail({ failedAt: earlier, failure });

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
