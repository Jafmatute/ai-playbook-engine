import { describe, expect, it } from 'vitest';

import {
  parsePlaybookId,
  parsePlaybookSourceId,
  parseSynchronizationRunId,
  parseSynchronizationSnapshotId,
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

function parsedSsId(value: string) {
  const result = parseSynchronizationSnapshotId(value);
  if (!result.success) throw new Error('Invalid SynchronizationSnapshotId fixture.');
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
const fixtureSsId = parsedSsId('33333333-4444-5555-6666-777777777777');

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

function startedRun(): SynchronizationRun {
  const run = SynchronizationRun.create(createInput());
  run.start({ startedAt: fixtureStartedAt });
  return run;
}

function failedRun(): SynchronizationRun {
  const run = startedRun();
  const failureResult = SynchronizationFailure.create({
    code: 'SOURCE_UNAVAILABLE',
    message: 'The source is not reachable.',
    stage: 'retrieval',
    retryable: true,
    externalReference: null,
  });
  if (!failureResult.success) throw new Error('Invalid failure fixture.');
  run.fail({ failedAt: instant('2026-07-12T10:10:00Z'), failure: failureResult.value });
  return run;
}

// ---------------------------------------------------------------------------
// Transición exitosa
// ---------------------------------------------------------------------------

describe('SynchronizationRun.complete — successful', () => {
  it('completes from running', () => {
    const run = startedRun();
    const completedAt = instant('2026-07-12T10:10:00Z');
    const result = run.complete({ completedAt, synchronizationSnapshotId: fixtureSsId });

    expect(result.success).toBe(true);
  });

  it('changes status to completed', () => {
    const run = startedRun();
    run.complete({
      completedAt: instant('2026-07-12T10:10:00Z'),
      synchronizationSnapshotId: fixtureSsId,
    });

    expect(run.status).toBe('completed');
  });

  it('stores completedAt', () => {
    const run = startedRun();
    const completedAt = instant('2026-07-12T10:10:00Z');
    run.complete({ completedAt, synchronizationSnapshotId: fixtureSsId });

    expect(run.completedAt).toBe(completedAt);
  });

  it('stores synchronizationSnapshotId', () => {
    const run = startedRun();
    run.complete({
      completedAt: instant('2026-07-12T10:10:00Z'),
      synchronizationSnapshotId: fixtureSsId,
    });

    expect(run.synchronizationSnapshotId).toBe(fixtureSsId);
  });

  it('sets failure to null', () => {
    const run = startedRun();
    run.complete({
      completedAt: instant('2026-07-12T10:10:00Z'),
      synchronizationSnapshotId: fixtureSsId,
    });

    expect(run.failure).toBeNull();
  });

  it('preserves startedAt', () => {
    const run = startedRun();
    run.complete({
      completedAt: instant('2026-07-12T10:10:00Z'),
      synchronizationSnapshotId: fixtureSsId,
    });

    expect(run.startedAt).toBe(fixtureStartedAt);
  });

  it('preserves id', () => {
    const run = startedRun();
    run.complete({
      completedAt: instant('2026-07-12T10:10:00Z'),
      synchronizationSnapshotId: fixtureSsId,
    });

    expect(run.id).toBe(fixtureRunId);
  });

  it('preserves workspaceId', () => {
    const run = startedRun();
    run.complete({
      completedAt: instant('2026-07-12T10:10:00Z'),
      synchronizationSnapshotId: fixtureSsId,
    });

    expect(run.workspaceId).toBe(fixtureWsId);
  });

  it('preserves playbookId', () => {
    const run = startedRun();
    run.complete({
      completedAt: instant('2026-07-12T10:10:00Z'),
      synchronizationSnapshotId: fixtureSsId,
    });

    expect(run.playbookId).toBe(fixturePbId);
  });

  it('preserves playbookSourceId', () => {
    const run = startedRun();
    run.complete({
      completedAt: instant('2026-07-12T10:10:00Z'),
      synchronizationSnapshotId: fixtureSsId,
    });

    expect(run.playbookSourceId).toBe(fixturePsId);
  });

  it('preserves createdAt', () => {
    const run = startedRun();
    run.complete({
      completedAt: instant('2026-07-12T10:10:00Z'),
      synchronizationSnapshotId: fixtureSsId,
    });

    expect(run.createdAt.equals(fixtureCreatedAt)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Igualdad temporal
// ---------------------------------------------------------------------------

describe('SynchronizationRun.complete — timestamp equality', () => {
  it('accepts completedAt equal to startedAt', () => {
    const run = startedRun();
    const result = run.complete({
      completedAt: fixtureStartedAt,
      synchronizationSnapshotId: fixtureSsId,
    });

    expect(result.success).toBe(true);
    expect(run.completedAt).toBe(fixtureStartedAt);
  });
});

// ---------------------------------------------------------------------------
// Timestamp inválido
// ---------------------------------------------------------------------------

describe('SynchronizationRun.complete — timestamp before startedAt', () => {
  it('rejects completedAt before startedAt', () => {
    const run = startedRun();
    const earlier = instant('2026-07-12T10:00:00Z');
    const result = run.complete({ completedAt: earlier, synchronizationSnapshotId: fixtureSsId });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'SYNCHRONIZATION_RUN_TIMESTAMP_INVALID',
        details: {
          operation: 'complete',
          field: 'completedAt',
          reason: 'timestamp_before_started',
        },
      });
    }
  });

  it('does not change state after invalid timestamp', () => {
    const run = startedRun();
    const earlier = instant('2026-07-12T10:00:00Z');
    run.complete({ completedAt: earlier, synchronizationSnapshotId: fixtureSsId });

    expect(run.status).toBe('running');
    expect(run.completedAt).toBeNull();
    expect(run.synchronizationSnapshotId).toBeNull();
    expect(run.failure).toBeNull();
    expect(run.startedAt).toBe(fixtureStartedAt);
  });
});

// ---------------------------------------------------------------------------
// Desde pending
// ---------------------------------------------------------------------------

describe('SynchronizationRun.complete — from pending', () => {
  it('rejects complete from pending', () => {
    const run = SynchronizationRun.create(createInput());
    const result = run.complete({
      completedAt: instant('2026-07-12T10:10:00Z'),
      synchronizationSnapshotId: fixtureSsId,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'SYNCHRONIZATION_RUN_TRANSITION_NOT_ALLOWED',
        details: {
          operation: 'complete',
          currentStatus: 'pending',
          expectedStatus: 'running',
        },
      });
    }
  });

  it('preserves initial state after rejected complete', () => {
    const run = SynchronizationRun.create(createInput());
    run.complete({
      completedAt: instant('2026-07-12T10:10:00Z'),
      synchronizationSnapshotId: fixtureSsId,
    });

    expect(run.status).toBe('pending');
    expect(run.startedAt).toBeNull();
    expect(run.completedAt).toBeNull();
    expect(run.synchronizationSnapshotId).toBeNull();
    expect(run.failure).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Segunda llamada
// ---------------------------------------------------------------------------

describe('SynchronizationRun.complete — second call', () => {
  it('rejects a second complete', () => {
    const run = startedRun();
    const firstCompletedAt = instant('2026-07-12T10:10:00Z');
    run.complete({ completedAt: firstCompletedAt, synchronizationSnapshotId: fixtureSsId });

    const otherSsId = parsedSsId('44444444-5555-6666-7777-888888888888');
    const second = run.complete({
      completedAt: instant('2026-07-12T10:15:00Z'),
      synchronizationSnapshotId: otherSsId,
    });

    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.error).toMatchObject({
        code: 'SYNCHRONIZATION_RUN_TRANSITION_NOT_ALLOWED',
        details: {
          operation: 'complete',
          currentStatus: 'completed',
          expectedStatus: 'running',
        },
      });
    }
  });

  it('preserves first completedAt after rejected second complete', () => {
    const run = startedRun();
    const firstCompletedAt = instant('2026-07-12T10:10:00Z');
    run.complete({ completedAt: firstCompletedAt, synchronizationSnapshotId: fixtureSsId });

    const otherSsId = parsedSsId('44444444-5555-6666-7777-888888888888');
    run.complete({
      completedAt: instant('2026-07-12T10:15:00Z'),
      synchronizationSnapshotId: otherSsId,
    });

    expect(run.completedAt).toBe(firstCompletedAt);
    expect(run.synchronizationSnapshotId).toBe(fixtureSsId);
    expect(run.status).toBe('completed');
    expect(run.failure).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Desde failed
// ---------------------------------------------------------------------------

describe('SynchronizationRun.complete — from failed', () => {
  it('rejects complete from failed', () => {
    const run = failedRun();
    const result = run.complete({
      completedAt: instant('2026-07-12T10:15:00Z'),
      synchronizationSnapshotId: fixtureSsId,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'SYNCHRONIZATION_RUN_TRANSITION_NOT_ALLOWED',
        details: {
          operation: 'complete',
          currentStatus: 'failed',
          expectedStatus: 'running',
        },
      });
    }
  });

  it('preserves failed state after rejected complete', () => {
    const run = failedRun();
    run.complete({
      completedAt: instant('2026-07-12T10:15:00Z'),
      synchronizationSnapshotId: fixtureSsId,
    });

    expect(run.status).toBe('failed');
    expect(run.failure).not.toBeNull();
    expect(run.synchronizationSnapshotId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Prioridad
// ---------------------------------------------------------------------------

describe('SynchronizationRun.complete — validation priority', () => {
  it('returns transition_not_allowed before timestamp error on completed', () => {
    const run = startedRun();
    const firstCompletedAt = instant('2026-07-12T10:10:00Z');
    run.complete({ completedAt: firstCompletedAt, synchronizationSnapshotId: fixtureSsId });

    const earlier = instant('2026-07-12T10:00:00Z');
    const otherSsId = parsedSsId('44444444-5555-6666-7777-888888888888');
    const second = run.complete({ completedAt: earlier, synchronizationSnapshotId: otherSsId });

    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.error).toMatchObject({
        code: 'SYNCHRONIZATION_RUN_TRANSITION_NOT_ALLOWED',
      });
    }
  });

  it('returns transition_not_allowed before timestamp error on failed', () => {
    const run = failedRun();
    const earlier = instant('2026-07-12T10:00:00Z');
    const result = run.complete({ completedAt: earlier, synchronizationSnapshotId: fixtureSsId });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'SYNCHRONIZATION_RUN_TRANSITION_NOT_ALLOWED',
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad de errores
// ---------------------------------------------------------------------------

describe('SynchronizationRun.complete — error immutability', () => {
  it('error root is frozen for transition_not_allowed', () => {
    const run = SynchronizationRun.create(createInput());
    const result = run.complete({
      completedAt: instant('2026-07-12T10:10:00Z'),
      synchronizationSnapshotId: fixtureSsId,
    });

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen for transition_not_allowed', () => {
    const run = SynchronizationRun.create(createInput());
    const result = run.complete({
      completedAt: instant('2026-07-12T10:10:00Z'),
      synchronizationSnapshotId: fixtureSsId,
    });

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });

  it('error root is frozen for timestamp_invalid', () => {
    const run = startedRun();
    const earlier = instant('2026-07-12T10:00:00Z');
    const result = run.complete({ completedAt: earlier, synchronizationSnapshotId: fixtureSsId });

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen for timestamp_invalid', () => {
    const run = startedRun();
    const earlier = instant('2026-07-12T10:00:00Z');
    const result = run.complete({ completedAt: earlier, synchronizationSnapshotId: fixtureSsId });

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
