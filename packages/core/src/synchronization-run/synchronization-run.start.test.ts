import { describe, expect, it } from 'vitest';

import {
  parsePlaybookId,
  parsePlaybookSourceId,
  parseSynchronizationRunId,
  parseWorkspaceId,
} from '../identifiers.js';
import { Instant } from '../instant.js';
import { SynchronizationRun, type CreateSynchronizationRunInput } from '../index.js';

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

// ---------------------------------------------------------------------------
// Transición válida
// ---------------------------------------------------------------------------

describe('SynchronizationRun.start — valid transition', () => {
  it('starts from pending', () => {
    const run = SynchronizationRun.create(createInput());
    const result = run.start({ startedAt: fixtureStartedAt });

    expect(result.success).toBe(true);
  });

  it('changes status to running', () => {
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });

    expect(run.status).toBe('running');
  });

  it('preserves startedAt exactly', () => {
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });

    expect(run.startedAt).toBe(fixtureStartedAt);
  });

  it('keeps completedAt null', () => {
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });

    expect(run.completedAt).toBeNull();
  });

  it('keeps synchronizationSnapshotId null', () => {
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });

    expect(run.synchronizationSnapshotId).toBeNull();
  });

  it('keeps failure null', () => {
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });

    expect(run.failure).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Timestamp igual
// ---------------------------------------------------------------------------

describe('SynchronizationRun.start — timestamp equal to createdAt', () => {
  it('accepts startedAt equal to createdAt', () => {
    const run = SynchronizationRun.create(createInput());
    const result = run.start({ startedAt: fixtureCreatedAt });

    expect(result.success).toBe(true);
    expect(run.startedAt).toBe(fixtureCreatedAt);
  });
});

// ---------------------------------------------------------------------------
// Timestamp posterior
// ---------------------------------------------------------------------------

describe('SynchronizationRun.start — timestamp after createdAt', () => {
  it('accepts a timestamp after createdAt', () => {
    const later = instant('2026-07-12T15:00:00Z');
    const run = SynchronizationRun.create(createInput());
    const result = run.start({ startedAt: later });

    expect(result.success).toBe(true);
    expect(run.startedAt).toBe(later);
  });
});

// ---------------------------------------------------------------------------
// Timestamp anterior
// ---------------------------------------------------------------------------

describe('SynchronizationRun.start — timestamp before createdAt', () => {
  it('rejects a timestamp before createdAt', () => {
    const earlier = instant('2026-07-11T23:00:00Z');
    const run = SynchronizationRun.create(createInput());
    const result = run.start({ startedAt: earlier });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'SYNCHRONIZATION_RUN_TIMESTAMP_INVALID',
        details: {
          operation: 'start',
          field: 'startedAt',
          reason: 'timestamp_before_created',
        },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Segunda llamada
// ---------------------------------------------------------------------------

describe('SynchronizationRun.start — second call', () => {
  it('rejects a second start call', () => {
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });
    const second = run.start({ startedAt: instant('2026-07-12T10:10:00Z') });

    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.error).toMatchObject({
        code: 'SYNCHRONIZATION_RUN_TRANSITION_NOT_ALLOWED',
        details: {
          operation: 'start',
          currentStatus: 'running',
          expectedStatus: 'pending',
        },
      });
    }
  });

  it('preserves the first startedAt after a failed second call', () => {
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });
    run.start({ startedAt: instant('2026-07-12T10:10:00Z') });

    expect(run.startedAt).toBe(fixtureStartedAt);
  });
});

// ---------------------------------------------------------------------------
// Prioridad
// ---------------------------------------------------------------------------

describe('SynchronizationRun.start — validation priority', () => {
  it('returns transition_not_allowed before timestamp error', () => {
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });
    const earlier = instant('2026-07-11T23:00:00Z');
    const second = run.start({ startedAt: earlier });

    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.error).toMatchObject({
        code: 'SYNCHRONIZATION_RUN_TRANSITION_NOT_ALLOWED',
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Atomicidad
// ---------------------------------------------------------------------------

describe('SynchronizationRun.start — atomicity', () => {
  it('does not change status after invalid timestamp', () => {
    const earlier = instant('2026-07-11T23:00:00Z');
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: earlier });

    expect(run.status).toBe('pending');
    expect(run.startedAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Ownership e identidad
// ---------------------------------------------------------------------------

describe('SynchronizationRun.start — identity and ownership preserved', () => {
  it('preserves id', () => {
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });

    expect(run.id).toBe(fixtureRunId);
  });

  it('preserves workspaceId', () => {
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });

    expect(run.workspaceId).toBe(fixtureWsId);
  });

  it('preserves playbookId', () => {
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });

    expect(run.playbookId).toBe(fixturePbId);
  });

  it('preserves playbookSourceId', () => {
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });

    expect(run.playbookSourceId).toBe(fixturePsId);
  });

  it('preserves createdAt', () => {
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });

    expect(run.createdAt.equals(fixtureCreatedAt)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad
// ---------------------------------------------------------------------------

describe('SynchronizationRun.start — immutability', () => {
  it('entity is frozen before start', () => {
    const run = SynchronizationRun.create(createInput());

    expect(Object.isFrozen(run)).toBe(true);
  });

  it('entity is frozen after start', () => {
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });

    expect(Object.isFrozen(run)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Errores congelados
// ---------------------------------------------------------------------------

describe('SynchronizationRun.start — error immutability', () => {
  it('error root is frozen for transition_not_allowed', () => {
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });
    const second = run.start({ startedAt: instant('2026-07-12T10:10:00Z') });

    if (!second.success) {
      expect(Object.isFrozen(second.error)).toBe(true);
    }
  });

  it('error details are frozen for transition_not_allowed', () => {
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });
    const second = run.start({ startedAt: instant('2026-07-12T10:10:00Z') });

    if (!second.success) {
      expect(Object.isFrozen(second.error.details)).toBe(true);
    }
  });

  it('error root is frozen for timestamp_invalid', () => {
    const earlier = instant('2026-07-11T23:00:00Z');
    const run = SynchronizationRun.create(createInput());
    const result = run.start({ startedAt: earlier });

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen for timestamp_invalid', () => {
    const earlier = instant('2026-07-11T23:00:00Z');
    const run = SynchronizationRun.create(createInput());
    const result = run.start({ startedAt: earlier });

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
