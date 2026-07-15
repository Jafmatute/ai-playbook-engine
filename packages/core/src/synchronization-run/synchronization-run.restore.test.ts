import { describe, expect, it } from 'vitest';

import {
  parsePlaybookId,
  parsePlaybookSourceId,
  parseSynchronizationRunId,
  parseSynchronizationSnapshotId,
  parseWorkspaceId,
} from '../identifiers.js';
import { Instant } from '../instant.js';
import { SynchronizationRun, SynchronizationFailure } from '../index.js';

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
    externalReference: null,
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
const fixtureFailure = makeFailure();

// ---------------------------------------------------------------------------
// Restauraciones válidas
// ---------------------------------------------------------------------------

describe('SynchronizationRun.restore — valid states', () => {
  it('restores pending', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'pending',
      createdAt: fixtureCreatedAt,
      startedAt: null,
      completedAt: null,
      synchronizationSnapshotId: null,
      failure: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.status).toBe('pending');
      expect(result.value.startedAt).toBeNull();
      expect(result.value.completedAt).toBeNull();
      expect(result.value.synchronizationSnapshotId).toBeNull();
      expect(result.value.failure).toBeNull();
    }
  });

  it('restores running', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'running',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureStartedAt,
      completedAt: null,
      synchronizationSnapshotId: null,
      failure: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.status).toBe('running');
      expect(result.value.startedAt).toBe(fixtureStartedAt);
      expect(result.value.completedAt).toBeNull();
      expect(result.value.synchronizationSnapshotId).toBeNull();
      expect(result.value.failure).toBeNull();
    }
  });

  it('restores completed', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'completed',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureStartedAt,
      completedAt: fixtureCompletedAt,
      synchronizationSnapshotId: fixtureSsId,
      failure: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.status).toBe('completed');
      expect(result.value.startedAt).toBe(fixtureStartedAt);
      expect(result.value.completedAt).toBe(fixtureCompletedAt);
      expect(result.value.synchronizationSnapshotId).toBe(fixtureSsId);
      expect(result.value.failure).toBeNull();
    }
  });

  it('restores failed', () => {
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
      failure: fixtureFailure,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.status).toBe('failed');
      expect(result.value.startedAt).toBe(fixtureStartedAt);
      expect(result.value.completedAt).toBe(fixtureCompletedAt);
      expect(result.value.synchronizationSnapshotId).toBeNull();
      expect(result.value.failure).toBe(fixtureFailure);
    }
  });
});

// ---------------------------------------------------------------------------
// Igualdad temporal
// ---------------------------------------------------------------------------

describe('SynchronizationRun.restore — timestamp equality', () => {
  it('accepts startedAt equal to createdAt for running', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'running',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureCreatedAt,
      completedAt: null,
      synchronizationSnapshotId: null,
      failure: null,
    });

    expect(result.success).toBe(true);
  });

  it('accepts completedAt equal to startedAt for completed', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'completed',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureStartedAt,
      completedAt: fixtureStartedAt,
      synchronizationSnapshotId: fixtureSsId,
      failure: null,
    });

    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Invariantes pending
// ---------------------------------------------------------------------------

describe('SynchronizationRun.restore — pending invariants', () => {
  it('rejects startedAt set', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'pending',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureStartedAt,
      completedAt: null,
      synchronizationSnapshotId: null,
      failure: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('PENDING_RUN_CANNOT_HAVE_STARTED_AT');
    }
  });

  it('rejects completedAt set', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'pending',
      createdAt: fixtureCreatedAt,
      startedAt: null,
      completedAt: fixtureCompletedAt,
      synchronizationSnapshotId: null,
      failure: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('PENDING_RUN_CANNOT_HAVE_COMPLETED_AT');
    }
  });

  it('rejects snapshot set', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'pending',
      createdAt: fixtureCreatedAt,
      startedAt: null,
      completedAt: null,
      synchronizationSnapshotId: fixtureSsId,
      failure: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('PENDING_RUN_CANNOT_HAVE_SNAPSHOT');
    }
  });

  it('rejects failure set', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'pending',
      createdAt: fixtureCreatedAt,
      startedAt: null,
      completedAt: null,
      synchronizationSnapshotId: null,
      failure: fixtureFailure,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('PENDING_RUN_CANNOT_HAVE_FAILURE');
    }
  });
});

// ---------------------------------------------------------------------------
// Invariantes running
// ---------------------------------------------------------------------------

describe('SynchronizationRun.restore — running invariants', () => {
  it('rejects missing startedAt', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'running',
      createdAt: fixtureCreatedAt,
      startedAt: null,
      completedAt: null,
      synchronizationSnapshotId: null,
      failure: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('RUNNING_RUN_REQUIRES_STARTED_AT');
    }
  });

  it('rejects completedAt set', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'running',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureStartedAt,
      completedAt: fixtureCompletedAt,
      synchronizationSnapshotId: null,
      failure: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('RUNNING_RUN_CANNOT_HAVE_COMPLETED_AT');
    }
  });

  it('rejects snapshot set', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'running',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureStartedAt,
      completedAt: null,
      synchronizationSnapshotId: fixtureSsId,
      failure: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('RUNNING_RUN_CANNOT_HAVE_SNAPSHOT');
    }
  });

  it('rejects failure set', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'running',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureStartedAt,
      completedAt: null,
      synchronizationSnapshotId: null,
      failure: fixtureFailure,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('RUNNING_RUN_CANNOT_HAVE_FAILURE');
    }
  });

  it('rejects startedAt before createdAt', () => {
    const early = instant('2026-07-11T23:00:00Z');
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'running',
      createdAt: fixtureCreatedAt,
      startedAt: early,
      completedAt: null,
      synchronizationSnapshotId: null,
      failure: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('STARTED_AT_BEFORE_CREATED_AT');
    }
  });
});

// ---------------------------------------------------------------------------
// Invariantes completed
// ---------------------------------------------------------------------------

describe('SynchronizationRun.restore — completed invariants', () => {
  it('rejects missing startedAt', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'completed',
      createdAt: fixtureCreatedAt,
      startedAt: null,
      completedAt: fixtureCompletedAt,
      synchronizationSnapshotId: fixtureSsId,
      failure: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('COMPLETED_RUN_REQUIRES_STARTED_AT');
    }
  });

  it('rejects missing completedAt', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'completed',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureStartedAt,
      completedAt: null,
      synchronizationSnapshotId: fixtureSsId,
      failure: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('COMPLETED_RUN_REQUIRES_COMPLETED_AT');
    }
  });

  it('rejects missing snapshot', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'completed',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureStartedAt,
      completedAt: fixtureCompletedAt,
      synchronizationSnapshotId: null,
      failure: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('COMPLETED_RUN_REQUIRES_SNAPSHOT');
    }
  });

  it('rejects failure set', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'completed',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureStartedAt,
      completedAt: fixtureCompletedAt,
      synchronizationSnapshotId: fixtureSsId,
      failure: fixtureFailure,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('COMPLETED_RUN_CANNOT_HAVE_FAILURE');
    }
  });

  it('rejects startedAt before createdAt', () => {
    const early = instant('2026-07-11T23:00:00Z');
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'completed',
      createdAt: fixtureCreatedAt,
      startedAt: early,
      completedAt: fixtureCompletedAt,
      synchronizationSnapshotId: fixtureSsId,
      failure: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('STARTED_AT_BEFORE_CREATED_AT');
    }
  });

  it('rejects completedAt before startedAt', () => {
    const early = instant('2026-07-12T10:00:00Z');
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'completed',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureStartedAt,
      completedAt: early,
      synchronizationSnapshotId: fixtureSsId,
      failure: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('COMPLETED_AT_BEFORE_STARTED_AT');
    }
  });
});

// ---------------------------------------------------------------------------
// Invariantes failed
// ---------------------------------------------------------------------------

describe('SynchronizationRun.restore — failed invariants', () => {
  it('rejects missing startedAt', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'failed',
      createdAt: fixtureCreatedAt,
      startedAt: null,
      completedAt: fixtureCompletedAt,
      synchronizationSnapshotId: null,
      failure: fixtureFailure,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('FAILED_RUN_REQUIRES_STARTED_AT');
    }
  });

  it('rejects missing completedAt', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'failed',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureStartedAt,
      completedAt: null,
      synchronizationSnapshotId: null,
      failure: fixtureFailure,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('FAILED_RUN_REQUIRES_COMPLETED_AT');
    }
  });

  it('rejects snapshot set', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'failed',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureStartedAt,
      completedAt: fixtureCompletedAt,
      synchronizationSnapshotId: fixtureSsId,
      failure: fixtureFailure,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('FAILED_RUN_CANNOT_HAVE_SNAPSHOT');
    }
  });

  it('rejects missing failure', () => {
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
      failure: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('FAILED_RUN_REQUIRES_FAILURE');
    }
  });

  it('rejects startedAt before createdAt', () => {
    const early = instant('2026-07-11T23:00:00Z');
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'failed',
      createdAt: fixtureCreatedAt,
      startedAt: early,
      completedAt: fixtureCompletedAt,
      synchronizationSnapshotId: null,
      failure: fixtureFailure,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('STARTED_AT_BEFORE_CREATED_AT');
    }
  });

  it('rejects completedAt before startedAt', () => {
    const early = instant('2026-07-12T10:00:00Z');
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'failed',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureStartedAt,
      completedAt: early,
      synchronizationSnapshotId: null,
      failure: fixtureFailure,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('COMPLETED_AT_BEFORE_STARTED_AT');
    }
  });
});

// ---------------------------------------------------------------------------
// Prioridad de errores
// ---------------------------------------------------------------------------

describe('SynchronizationRun.restore — error priority', () => {
  it('returns startedAt before completedAt for completed with both missing', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'completed',
      createdAt: fixtureCreatedAt,
      startedAt: null,
      completedAt: null,
      synchronizationSnapshotId: fixtureSsId,
      failure: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('COMPLETED_RUN_REQUIRES_STARTED_AT');
    }
  });

  it('returns startedAt before completedAt for failed with both missing', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'failed',
      createdAt: fixtureCreatedAt,
      startedAt: null,
      completedAt: null,
      synchronizationSnapshotId: null,
      failure: fixtureFailure,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('FAILED_RUN_REQUIRES_STARTED_AT');
    }
  });

  it('returns missing startedAt before completedAt set for running', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'running',
      createdAt: fixtureCreatedAt,
      startedAt: null,
      completedAt: fixtureCompletedAt,
      synchronizationSnapshotId: null,
      failure: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('RUNNING_RUN_REQUIRES_STARTED_AT');
    }
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad
// ---------------------------------------------------------------------------

describe('SynchronizationRun.restore — error immutability', () => {
  it('error root is frozen', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'pending',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureStartedAt,
      completedAt: null,
      synchronizationSnapshotId: null,
      failure: null,
    });

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const result = SynchronizationRun.restore({
      synchronizationRunId: fixtureRunId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      playbookSourceId: fixturePsId,
      status: 'pending',
      createdAt: fixtureCreatedAt,
      startedAt: fixtureStartedAt,
      completedAt: null,
      synchronizationSnapshotId: null,
      failure: null,
    });

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
