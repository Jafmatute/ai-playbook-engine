import { describe, expect, it } from 'vitest';

import { parseNormalizationAttemptId, parsePlaybookVersionId } from '../identifiers.js';
import { Instant } from '../instant.js';
import { NormalizationAttempt } from '../index.js';

function parsedNormalizationAttemptId(value: string) {
  const result = parseNormalizationAttemptId(value);
  if (!result.success) throw new Error(`Invalid normalization attempt ID: ${value}`);
  return result.value;
}

function parsedPlaybookVersionId(value: string) {
  const result = parsePlaybookVersionId(value);
  if (!result.success) throw new Error(`Invalid playbook version ID: ${value}`);
  return result.value;
}

const fixtureNormalizationAttemptId = parsedNormalizationAttemptId(
  '22222222-3333-4444-5555-666666666666',
);

const fixturePlaybookVersionId = parsedPlaybookVersionId('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

function instant(value: string): Instant {
  const result = Instant.parse(value);
  if (!result.success) throw new Error(`Invalid instant: ${value}`);
  return result.value;
}

const startedAt = instant('2026-07-12T10:00:00Z');

function createAttempt(): NormalizationAttempt {
  const result = NormalizationAttempt.create({
    normalizationAttemptId: fixtureNormalizationAttemptId,
    playbookVersionId: fixturePlaybookVersionId,
    startedAt,
  });
  if (!result.success) throw new Error('Unexpected creation failure');
  return result.value;
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe('NormalizationAttempt.create', () => {
  it('creates an attempt in running status', () => {
    const attempt = createAttempt();
    expect(attempt.status).toBe('running');
  });

  it('preserves normalizationAttemptId', () => {
    const attempt = createAttempt();
    expect(attempt.id).toBe(fixtureNormalizationAttemptId);
  });

  it('preserves playbookVersionId', () => {
    const attempt = createAttempt();
    expect(attempt.playbookVersionId).toBe(fixturePlaybookVersionId);
  });

  it('preserves startedAt', () => {
    const attempt = createAttempt();
    expect(attempt.startedAt.equals(startedAt)).toBe(true);
  });

  it('sets completedAt to null', () => {
    const attempt = createAttempt();
    expect(attempt.completedAt).toBeNull();
  });

  it('sets failedAt to null', () => {
    const attempt = createAttempt();
    expect(attempt.failedAt).toBeNull();
  });

  it('returns a successful Result', () => {
    const result = NormalizationAttempt.create({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      startedAt,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// restore — running
// ---------------------------------------------------------------------------

describe('NormalizationAttempt.restore — running', () => {
  it('restores a valid running state', () => {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'running',
      startedAt,
      completedAt: null,
      failedAt: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.status).toBe('running');
    }
  });

  it('rejects running with completedAt', () => {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'running',
      startedAt,
      completedAt: startedAt,
      failedAt: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects running with failedAt', () => {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'running',
      startedAt,
      completedAt: null,
      failedAt: startedAt,
    });
    expect(result.success).toBe(false);
  });

  it('rejects running with both timestamps', () => {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'running',
      startedAt,
      completedAt: startedAt,
      failedAt: startedAt,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// restore — completed
// ---------------------------------------------------------------------------

describe('NormalizationAttempt.restore — completed', () => {
  const completedAt = instant('2026-07-12T10:05:00Z');

  it('restores a valid completed state', () => {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'completed',
      startedAt,
      completedAt,
      failedAt: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.status).toBe('completed');
      expect(result.value.completedAt?.equals(completedAt)).toBe(true);
    }
  });

  it('accepts completedAt equal to startedAt', () => {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'completed',
      startedAt,
      completedAt: startedAt,
      failedAt: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing completedAt', () => {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'completed',
      startedAt,
      completedAt: null,
      failedAt: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects presence of failedAt', () => {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'completed',
      startedAt,
      completedAt,
      failedAt: completedAt,
    });
    expect(result.success).toBe(false);
  });

  it('rejects completedAt before startedAt', () => {
    const beforeStarted = instant('2026-07-12T09:00:00Z');
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'completed',
      startedAt,
      completedAt: beforeStarted,
      failedAt: null,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// restore — failed
// ---------------------------------------------------------------------------

describe('NormalizationAttempt.restore — failed', () => {
  const failedAt = instant('2026-07-12T10:05:00Z');

  it('restores a valid failed state', () => {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'failed',
      startedAt,
      completedAt: null,
      failedAt,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.status).toBe('failed');
      expect(result.value.failedAt?.equals(failedAt)).toBe(true);
    }
  });

  it('accepts failedAt equal to startedAt', () => {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'failed',
      startedAt,
      completedAt: null,
      failedAt: startedAt,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing failedAt', () => {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'failed',
      startedAt,
      completedAt: null,
      failedAt: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects presence of completedAt', () => {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'failed',
      startedAt,
      completedAt: startedAt,
      failedAt,
    });
    expect(result.success).toBe(false);
  });

  it('rejects failedAt before startedAt', () => {
    const beforeStarted = instant('2026-07-12T09:00:00Z');
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'failed',
      startedAt,
      completedAt: null,
      failedAt: beforeStarted,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Unknown status
// ---------------------------------------------------------------------------

describe('NormalizationAttempt.restore — unknown status', () => {
  it('rejects pending', () => {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'pending',
      startedAt,
      completedAt: null,
      failedAt: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown string', () => {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'bogus',
      startedAt,
      completedAt: null,
      failedAt: null,
    });
    expect(result.success).toBe(false);
  });

  it('returns NORMALIZATION_ATTEMPT_STATE_INVALID', () => {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'pending',
      startedAt,
      completedAt: null,
      failedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'NORMALIZATION_ATTEMPT_STATE_INVALID' },
    });
  });

  it('returns reason unknown_status', () => {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'pending',
      startedAt,
      completedAt: null,
      failedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        details: { reason: 'unknown_status' },
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

describe('NormalizationAttempt snapshot', () => {
  it('serializes a running attempt without timestamps', () => {
    const attempt = createAttempt();
    const snapshot = attempt.toSnapshot();

    expect(snapshot.status).toBe('running');
    expect(snapshot.startedAt).toBe('2026-07-12T10:00:00.000Z');
    expect(snapshot.completedAt).toBeNull();
    expect(snapshot.failedAt).toBeNull();
  });

  it('serializes a completed attempt', () => {
    const completedAt = instant('2026-07-12T10:05:00Z');
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'completed',
      startedAt,
      completedAt,
      failedAt: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const snapshot = result.value.toSnapshot();
      expect(snapshot.status).toBe('completed');
      expect(snapshot.completedAt).toBe('2026-07-12T10:05:00.000Z');
      expect(snapshot.failedAt).toBeNull();
    }
  });

  it('serializes a failed attempt', () => {
    const failedAt = instant('2026-07-12T10:05:00Z');
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'failed',
      startedAt,
      completedAt: null,
      failedAt,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const snapshot = result.value.toSnapshot();
      expect(snapshot.status).toBe('failed');
      expect(snapshot.failedAt).toBe('2026-07-12T10:05:00.000Z');
      expect(snapshot.completedAt).toBeNull();
    }
  });

  it('preserves identifiers in snapshot', () => {
    const attempt = createAttempt();
    const snapshot = attempt.toSnapshot();

    expect(snapshot.normalizationAttemptId).toBe(fixtureNormalizationAttemptId);
    expect(snapshot.playbookVersionId).toBe(fixturePlaybookVersionId);
  });

  it('root object is frozen', () => {
    const attempt = createAttempt();
    const snapshot = attempt.toSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// complete
// ---------------------------------------------------------------------------

describe('NormalizationAttempt.complete', () => {
  const completedAt = instant('2026-07-12T10:05:00Z');

  it('completes a running attempt', () => {
    const attempt = createAttempt();
    const result = attempt.complete({ completedAt });

    expect(result.success).toBe(true);
  });

  it('changes status to completed', () => {
    const attempt = createAttempt();
    attempt.complete({ completedAt });

    expect(attempt.status).toBe('completed');
  });

  it('sets completedAt', () => {
    const attempt = createAttempt();
    attempt.complete({ completedAt });

    expect(attempt.completedAt?.equals(completedAt)).toBe(true);
  });

  it('keeps failedAt as null', () => {
    const attempt = createAttempt();
    attempt.complete({ completedAt });

    expect(attempt.failedAt).toBeNull();
  });

  it('accepts completedAt equal to startedAt', () => {
    const attempt = createAttempt();
    const result = attempt.complete({ completedAt: startedAt });

    expect(result.success).toBe(true);
    expect(attempt.completedAt?.equals(startedAt)).toBe(true);
  });

  it('snapshot reflects completed state', () => {
    const attempt = createAttempt();
    attempt.complete({ completedAt });
    const snapshot = attempt.toSnapshot();

    expect(snapshot.status).toBe('completed');
    expect(snapshot.completedAt).toBe('2026-07-12T10:05:00.000Z');
    expect(snapshot.failedAt).toBeNull();
  });
});

describe('NormalizationAttempt.complete — timestamp invalid', () => {
  const beforeStarted = instant('2026-07-12T09:00:00Z');

  it('rejects completedAt before startedAt', () => {
    const attempt = createAttempt();
    const result = attempt.complete({ completedAt: beforeStarted });

    expect(result.success).toBe(false);
  });

  it('returns NORMALIZATION_ATTEMPT_TIMESTAMP_INVALID', () => {
    const attempt = createAttempt();
    const result = attempt.complete({ completedAt: beforeStarted });

    expect(result).toMatchObject({
      success: false,
      error: { code: 'NORMALIZATION_ATTEMPT_TIMESTAMP_INVALID' },
    });
  });

  it('returns operation, field and reason', () => {
    const attempt = createAttempt();
    const result = attempt.complete({ completedAt: beforeStarted });

    expect(result).toMatchObject({
      success: false,
      error: {
        details: {
          operation: 'complete',
          field: 'completedAt',
          reason: 'timestamp_before_started',
        },
      },
    });
  });

  it('preserves running status on invalid timestamp', () => {
    const attempt = createAttempt();
    attempt.complete({ completedAt: beforeStarted });

    expect(attempt.status).toBe('running');
  });

  it('preserves completedAt as null on invalid timestamp', () => {
    const attempt = createAttempt();
    attempt.complete({ completedAt: beforeStarted });

    expect(attempt.completedAt).toBeNull();
  });

  it('preserves failedAt as null on invalid timestamp', () => {
    const attempt = createAttempt();
    attempt.complete({ completedAt: beforeStarted });

    expect(attempt.failedAt).toBeNull();
  });
});

describe('NormalizationAttempt.complete — already completed', () => {
  const completedAt = instant('2026-07-12T10:05:00Z');
  const laterCompleted = instant('2026-07-12T10:10:00Z');

  it('rejects a second call to complete', () => {
    const attempt = createAttempt();
    attempt.complete({ completedAt });
    const result = attempt.complete({ completedAt: laterCompleted });

    expect(result.success).toBe(false);
  });

  it('returns NORMALIZATION_ATTEMPT_NOT_RUNNING', () => {
    const attempt = createAttempt();
    attempt.complete({ completedAt });
    const result = attempt.complete({ completedAt: laterCompleted });

    expect(result).toMatchObject({
      success: false,
      error: { code: 'NORMALIZATION_ATTEMPT_NOT_RUNNING' },
    });
  });

  it('reports currentStatus completed', () => {
    const attempt = createAttempt();
    attempt.complete({ completedAt });
    const result = attempt.complete({ completedAt: laterCompleted });

    expect(result).toMatchObject({
      success: false,
      error: {
        details: { operation: 'complete', currentStatus: 'completed' },
      },
    });
  });

  it('does not replace the original completedAt', () => {
    const attempt = createAttempt();
    attempt.complete({ completedAt });
    attempt.complete({ completedAt: laterCompleted });

    expect(attempt.completedAt?.equals(completedAt)).toBe(true);
  });
});

describe('NormalizationAttempt.complete — failed attempt', () => {
  const failedAt = instant('2026-07-12T10:05:00Z');
  const completedAt = instant('2026-07-12T10:10:00Z');

  function restoreFailed(): NormalizationAttempt {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'failed',
      startedAt,
      completedAt: null,
      failedAt,
    });
    if (!result.success) throw new Error('Unexpected restore failure');
    return result.value;
  }

  it('rejects complete on failed attempt', () => {
    const attempt = restoreFailed();
    const result = attempt.complete({ completedAt });

    expect(result.success).toBe(false);
  });

  it('returns NORMALIZATION_ATTEMPT_NOT_RUNNING', () => {
    const attempt = restoreFailed();
    const result = attempt.complete({ completedAt });

    expect(result).toMatchObject({
      success: false,
      error: { code: 'NORMALIZATION_ATTEMPT_NOT_RUNNING' },
    });
  });

  it('reports currentStatus failed', () => {
    const attempt = restoreFailed();
    const result = attempt.complete({ completedAt });

    expect(result).toMatchObject({
      success: false,
      error: {
        details: { operation: 'complete', currentStatus: 'failed' },
      },
    });
  });

  it('preserves failed status', () => {
    const attempt = restoreFailed();
    attempt.complete({ completedAt });

    expect(attempt.status).toBe('failed');
  });

  it('preserves failedAt', () => {
    const attempt = restoreFailed();
    attempt.complete({ completedAt });

    expect(attempt.failedAt?.equals(failedAt)).toBe(true);
  });

  it('keeps completedAt as null', () => {
    const attempt = restoreFailed();
    attempt.complete({ completedAt });

    expect(attempt.completedAt).toBeNull();
  });
});

describe('NormalizationAttempt.complete — error immutability', () => {
  it('error root object is frozen', () => {
    const attempt = createAttempt();
    const beforeStarted = instant('2026-07-12T09:00:00Z');
    const result = attempt.complete({ completedAt: beforeStarted });

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const attempt = createAttempt();
    const beforeStarted = instant('2026-07-12T09:00:00Z');
    const result = attempt.complete({ completedAt: beforeStarted });

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// fail
// ---------------------------------------------------------------------------

describe('NormalizationAttempt.fail', () => {
  const failedAt = instant('2026-07-12T10:05:00Z');

  it('fails a running attempt', () => {
    const attempt = createAttempt();
    const result = attempt.fail({ failedAt });

    expect(result.success).toBe(true);
  });

  it('changes status to failed', () => {
    const attempt = createAttempt();
    attempt.fail({ failedAt });

    expect(attempt.status).toBe('failed');
  });

  it('sets failedAt', () => {
    const attempt = createAttempt();
    attempt.fail({ failedAt });

    expect(attempt.failedAt?.equals(failedAt)).toBe(true);
  });

  it('keeps completedAt as null', () => {
    const attempt = createAttempt();
    attempt.fail({ failedAt });

    expect(attempt.completedAt).toBeNull();
  });

  it('accepts failedAt equal to startedAt', () => {
    const attempt = createAttempt();
    const result = attempt.fail({ failedAt: startedAt });

    expect(result.success).toBe(true);
    expect(attempt.failedAt?.equals(startedAt)).toBe(true);
  });

  it('snapshot reflects failed state', () => {
    const attempt = createAttempt();
    attempt.fail({ failedAt });
    const snapshot = attempt.toSnapshot();

    expect(snapshot.status).toBe('failed');
    expect(snapshot.failedAt).toBe('2026-07-12T10:05:00.000Z');
    expect(snapshot.completedAt).toBeNull();
  });
});

describe('NormalizationAttempt.fail — timestamp invalid', () => {
  const beforeStarted = instant('2026-07-12T09:00:00Z');

  it('rejects failedAt before startedAt', () => {
    const attempt = createAttempt();
    const result = attempt.fail({ failedAt: beforeStarted });

    expect(result.success).toBe(false);
  });

  it('returns NORMALIZATION_ATTEMPT_TIMESTAMP_INVALID', () => {
    const attempt = createAttempt();
    const result = attempt.fail({ failedAt: beforeStarted });

    expect(result).toMatchObject({
      success: false,
      error: { code: 'NORMALIZATION_ATTEMPT_TIMESTAMP_INVALID' },
    });
  });

  it('returns operation, field and reason', () => {
    const attempt = createAttempt();
    const result = attempt.fail({ failedAt: beforeStarted });

    expect(result).toMatchObject({
      success: false,
      error: {
        details: {
          operation: 'fail',
          field: 'failedAt',
          reason: 'timestamp_before_started',
        },
      },
    });
  });

  it('preserves running status on invalid timestamp', () => {
    const attempt = createAttempt();
    attempt.fail({ failedAt: beforeStarted });

    expect(attempt.status).toBe('running');
  });

  it('preserves failedAt as null on invalid timestamp', () => {
    const attempt = createAttempt();
    attempt.fail({ failedAt: beforeStarted });

    expect(attempt.failedAt).toBeNull();
  });

  it('preserves completedAt as null on invalid timestamp', () => {
    const attempt = createAttempt();
    attempt.fail({ failedAt: beforeStarted });

    expect(attempt.completedAt).toBeNull();
  });
});

describe('NormalizationAttempt.fail — already failed', () => {
  const failedAt = instant('2026-07-12T10:05:00Z');
  const laterFailed = instant('2026-07-12T10:10:00Z');

  it('rejects a second call to fail', () => {
    const attempt = createAttempt();
    attempt.fail({ failedAt });
    const result = attempt.fail({ failedAt: laterFailed });

    expect(result.success).toBe(false);
  });

  it('returns NORMALIZATION_ATTEMPT_NOT_RUNNING', () => {
    const attempt = createAttempt();
    attempt.fail({ failedAt });
    const result = attempt.fail({ failedAt: laterFailed });

    expect(result).toMatchObject({
      success: false,
      error: { code: 'NORMALIZATION_ATTEMPT_NOT_RUNNING' },
    });
  });

  it('reports currentStatus failed', () => {
    const attempt = createAttempt();
    attempt.fail({ failedAt });
    const result = attempt.fail({ failedAt: laterFailed });

    expect(result).toMatchObject({
      success: false,
      error: {
        details: { operation: 'fail', currentStatus: 'failed' },
      },
    });
  });

  it('does not replace the original failedAt', () => {
    const attempt = createAttempt();
    attempt.fail({ failedAt });
    attempt.fail({ failedAt: laterFailed });

    expect(attempt.failedAt?.equals(failedAt)).toBe(true);
  });
});

describe('NormalizationAttempt.fail — completed attempt', () => {
  const completedAt = instant('2026-07-12T10:05:00Z');
  const failedAt = instant('2026-07-12T10:10:00Z');

  function restoreCompleted(): NormalizationAttempt {
    const result = NormalizationAttempt.restore({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'completed',
      startedAt,
      completedAt,
      failedAt: null,
    });
    if (!result.success) throw new Error('Unexpected restore failure');
    return result.value;
  }

  it('rejects fail on completed attempt', () => {
    const attempt = restoreCompleted();
    const result = attempt.fail({ failedAt });

    expect(result.success).toBe(false);
  });

  it('returns NORMALIZATION_ATTEMPT_NOT_RUNNING', () => {
    const attempt = restoreCompleted();
    const result = attempt.fail({ failedAt });

    expect(result).toMatchObject({
      success: false,
      error: { code: 'NORMALIZATION_ATTEMPT_NOT_RUNNING' },
    });
  });

  it('reports currentStatus completed', () => {
    const attempt = restoreCompleted();
    const result = attempt.fail({ failedAt });

    expect(result).toMatchObject({
      success: false,
      error: {
        details: { operation: 'fail', currentStatus: 'completed' },
      },
    });
  });

  it('preserves completed status', () => {
    const attempt = restoreCompleted();
    attempt.fail({ failedAt });

    expect(attempt.status).toBe('completed');
  });

  it('preserves completedAt', () => {
    const attempt = restoreCompleted();
    attempt.fail({ failedAt });

    expect(attempt.completedAt?.equals(completedAt)).toBe(true);
  });

  it('keeps failedAt as null', () => {
    const attempt = restoreCompleted();
    attempt.fail({ failedAt });

    expect(attempt.failedAt).toBeNull();
  });
});

describe('NormalizationAttempt.fail — validation order', () => {
  it('returns NOT_RUNNING before TIMESTAMP_INVALID on terminal attempt', () => {
    const attempt = createAttempt();
    const completedAt = instant('2026-07-12T10:05:00Z');
    const beforeStarted = instant('2026-07-12T09:00:00Z');
    attempt.complete({ completedAt });

    const result = attempt.fail({ failedAt: beforeStarted });

    expect(result).toMatchObject({
      success: false,
      error: { code: 'NORMALIZATION_ATTEMPT_NOT_RUNNING' },
    });
  });
});

describe('NormalizationAttempt.fail — error immutability', () => {
  it('error root object is frozen', () => {
    const attempt = createAttempt();
    const beforeStarted = instant('2026-07-12T09:00:00Z');
    const result = attempt.fail({ failedAt: beforeStarted });

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const attempt = createAttempt();
    const beforeStarted = instant('2026-07-12T09:00:00Z');
    const result = attempt.fail({ failedAt: beforeStarted });

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
