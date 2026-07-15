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

function validInput(
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
// Creación
// ---------------------------------------------------------------------------

describe('SynchronizationRun.create', () => {
  it('creates an instance of SynchronizationRun', () => {
    const run = SynchronizationRun.create(validInput());

    expect(run).toBeInstanceOf(SynchronizationRun);
  });

  it('returns the instance directly, not a Result', () => {
    const run = SynchronizationRun.create(validInput());

    expect(run).toBeInstanceOf(SynchronizationRun);
  });
});

// ---------------------------------------------------------------------------
// Identidad y ownership
// ---------------------------------------------------------------------------

describe('SynchronizationRun — identity and ownership', () => {
  const run = SynchronizationRun.create(validInput());

  it('returns id', () => {
    expect(run.id).toBe(fixtureRunId);
  });

  it('returns workspaceId', () => {
    expect(run.workspaceId).toBe(fixtureWsId);
  });

  it('returns playbookId', () => {
    expect(run.playbookId).toBe(fixturePbId);
  });

  it('returns playbookSourceId', () => {
    expect(run.playbookSourceId).toBe(fixturePsId);
  });
});

// ---------------------------------------------------------------------------
// Estado inicial
// ---------------------------------------------------------------------------

describe('SynchronizationRun — initial state', () => {
  const run = SynchronizationRun.create(validInput());

  it('starts with status pending', () => {
    expect(run.status).toBe('pending');
  });

  it('starts with startedAt null', () => {
    expect(run.startedAt).toBeNull();
  });

  it('starts with completedAt null', () => {
    expect(run.completedAt).toBeNull();
  });

  it('starts with synchronizationSnapshotId null', () => {
    expect(run.synchronizationSnapshotId).toBeNull();
  });

  it('starts with failure null', () => {
    expect(run.failure).toBeNull();
  });

  it('preserves createdAt', () => {
    expect(run.createdAt.equals(fixtureCreatedAt)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad
// ---------------------------------------------------------------------------

describe('SynchronizationRun — immutability', () => {
  it('entity is frozen', () => {
    const run = SynchronizationRun.create(validInput());

    expect(Object.isFrozen(run)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Ausencia de API prematura
// ---------------------------------------------------------------------------

describe('SynchronizationRun — no premature API', () => {
  it('does not expose complete', () => {
    const run = SynchronizationRun.create(validInput());

    expect((run as unknown as Record<string, unknown>).complete).toBeUndefined();
  });

  it('does not expose restore', () => {
    expect((SynchronizationRun as unknown as Record<string, unknown>).restore).toBeUndefined();
  });

  it('does not expose toSnapshot', () => {
    const run = SynchronizationRun.create(validInput());

    expect((run as unknown as Record<string, unknown>).toSnapshot).toBeUndefined();
  });
});
