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

const fixtureRunId = parsedRunId('11111111-2222-3333-4444-555555555555');
const fixtureWsId = parsedWsId('de305d54-75b4-431b-adb2-eb6b9e546014');
const fixturePbId = parsedPbId('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
const fixturePsId = parsedPsId('bbbbbbbb-cccc-dddd-eeee-ffffffffffff');
const fixtureCreatedAt = instant('2026-07-12T10:00:00Z');
const fixtureStartedAt = instant('2026-07-12T10:05:00Z');
const fixtureCompletedAt = instant('2026-07-12T10:10:00Z');
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

// ---------------------------------------------------------------------------
// Snapshot pending
// ---------------------------------------------------------------------------

describe('SynchronizationRun.toSnapshot — pending', () => {
  const run = SynchronizationRun.create(createInput());
  const snapshot = run.toSnapshot();

  it('serializes IDs as strings', () => {
    expect(snapshot.synchronizationRunId).toBe(fixtureRunId);
    expect(snapshot.workspaceId).toBe(fixtureWsId);
    expect(snapshot.playbookId).toBe(fixturePbId);
    expect(snapshot.playbookSourceId).toBe(fixturePsId);
  });

  it('serializes status', () => {
    expect(snapshot.status).toBe('pending');
  });

  it('serializes createdAt', () => {
    expect(snapshot.createdAt).toBe('2026-07-12T10:00:00.000Z');
  });

  it('serializes nullable fields as null', () => {
    expect(snapshot.startedAt).toBeNull();
    expect(snapshot.completedAt).toBeNull();
    expect(snapshot.synchronizationSnapshotId).toBeNull();
    expect(snapshot.failure).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Snapshot running
// ---------------------------------------------------------------------------

describe('SynchronizationRun.toSnapshot — running', () => {
  const run = SynchronizationRun.create(createInput());
  run.start({ startedAt: fixtureStartedAt });
  const snapshot = run.toSnapshot();

  it('serializes status', () => {
    expect(snapshot.status).toBe('running');
  });

  it('serializes startedAt', () => {
    expect(snapshot.startedAt).toBe('2026-07-12T10:05:00.000Z');
  });

  it('keeps terminal fields null', () => {
    expect(snapshot.completedAt).toBeNull();
    expect(snapshot.synchronizationSnapshotId).toBeNull();
    expect(snapshot.failure).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Snapshot completed
// ---------------------------------------------------------------------------

describe('SynchronizationRun.toSnapshot — completed', () => {
  const run = SynchronizationRun.create(createInput());
  run.start({ startedAt: fixtureStartedAt });
  run.complete({ completedAt: fixtureCompletedAt, synchronizationSnapshotId: fixtureSsId });
  const snapshot = run.toSnapshot();

  it('serializes status', () => {
    expect(snapshot.status).toBe('completed');
  });

  it('serializes completedAt', () => {
    expect(snapshot.completedAt).toBe('2026-07-12T10:10:00.000Z');
  });

  it('serializes synchronizationSnapshotId', () => {
    expect(snapshot.synchronizationSnapshotId).toBe(fixtureSsId);
  });

  it('keeps failure null', () => {
    expect(snapshot.failure).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Snapshot failed
// ---------------------------------------------------------------------------

describe('SynchronizationRun.toSnapshot — failed', () => {
  const failure = makeFailure();
  const run = SynchronizationRun.create(createInput());
  run.start({ startedAt: fixtureStartedAt });
  run.fail({ failedAt: fixtureCompletedAt, failure });
  const snapshot = run.toSnapshot();

  it('serializes status', () => {
    expect(snapshot.status).toBe('failed');
  });

  it('serializes failure fields', () => {
    expect(snapshot.failure).toEqual({
      code: 'SOURCE_UNAVAILABLE',
      message: 'The source is not reachable.',
      stage: 'retrieval',
      retryable: true,
      externalReference: 'http-status:503',
    });
  });
});

// ---------------------------------------------------------------------------
// Entidad restaurada
// ---------------------------------------------------------------------------

describe('SynchronizationRun.toSnapshot — from restored entity', () => {
  const failure = makeFailure();

  const result = SynchronizationRun.restore({
    synchronizationRunId: fixtureRunId,
    workspaceId: fixtureWsId,
    playbookId: fixturePbId,
    playbookSourceId: fixturePsId,
    status: 'failed',
    createdAt: fixtureCreatedAt,
    startedAt: fixtureStartedAt,
    completedAt: fixtureCompletedAt,
    synchronizationSnapshotId: null,
    failure,
  });

  if (!result.success) throw new Error('Fixture must be valid.');
  const snapshot = result.value.toSnapshot();

  it('reflects restored failed state', () => {
    expect(snapshot.status).toBe('failed');
    expect(snapshot.synchronizationRunId).toBe(fixtureRunId);
    expect(snapshot.startedAt).toBe('2026-07-12T10:05:00.000Z');
    expect(snapshot.completedAt).toBe('2026-07-12T10:10:00.000Z');
    expect(snapshot.synchronizationSnapshotId).toBeNull();
    expect(snapshot.failure!.code).toBe('SOURCE_UNAVAILABLE');
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad
// ---------------------------------------------------------------------------

describe('SynchronizationRun.toSnapshot — immutability', () => {
  it('freezes the snapshot root', () => {
    const run = SynchronizationRun.create(createInput());
    expect(Object.isFrozen(run.toSnapshot())).toBe(true);
  });

  it('freezes the failure snapshot when present', () => {
    const failure = makeFailure();
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });
    run.fail({ failedAt: fixtureCompletedAt, failure });
    expect(Object.isFrozen(run.toSnapshot().failure)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Nuevas instancias
// ---------------------------------------------------------------------------

describe('SynchronizationRun.toSnapshot — new instances', () => {
  it('returns a new root object on each call', () => {
    const run = SynchronizationRun.create(createInput());
    const first = run.toSnapshot();
    const second = run.toSnapshot();
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });

  it('returns a new failure snapshot on each call', () => {
    const failure = makeFailure();
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });
    run.fail({ failedAt: fixtureCompletedAt, failure });
    const first = run.toSnapshot();
    const second = run.toSnapshot();
    expect(first.failure).not.toBe(second.failure);
    expect(first.failure).toEqual(second.failure);
  });

  it('does not return the SynchronizationFailure instance', () => {
    const failure = makeFailure();
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });
    run.fail({ failedAt: fixtureCompletedAt, failure });
    expect(run.toSnapshot().failure).not.toBe(failure);
  });
});

// ---------------------------------------------------------------------------
// Ausencia de objetos de dominio
// ---------------------------------------------------------------------------

describe('SynchronizationRun.toSnapshot — primitive representations', () => {
  it('contains only strings and plain objects', () => {
    const failure = makeFailure();
    const run = SynchronizationRun.create(createInput());
    run.start({ startedAt: fixtureStartedAt });
    run.fail({ failedAt: fixtureCompletedAt, failure });
    const snapshot = run.toSnapshot();

    expect(typeof snapshot.synchronizationRunId).toBe('string');
    expect(typeof snapshot.workspaceId).toBe('string');
    expect(typeof snapshot.playbookId).toBe('string');
    expect(typeof snapshot.playbookSourceId).toBe('string');
    expect(typeof snapshot.status).toBe('string');
    expect(typeof snapshot.createdAt).toBe('string');
    expect(typeof snapshot.startedAt).toBe('string');
    expect(typeof snapshot.completedAt).toBe('string');
    expect(snapshot.synchronizationSnapshotId).toBeNull();
    expect(typeof snapshot.failure!.code).toBe('string');
    expect(typeof snapshot.failure!.message).toBe('string');
    expect(typeof snapshot.failure!.stage).toBe('string');
    expect(typeof snapshot.failure!.retryable).toBe('boolean');
    expect(snapshot.failure!.externalReference).toBeTypeOf('string');
  });
});
