import { describe, expect, it } from 'vitest';

import { parseValidationAttemptId, parsePlaybookVersionId } from '../identifiers.js';
import { Instant } from '../instant.js';
import { ContentChecksum } from '../playbook-version/content-checksum.js';
import { ValidatorVersion } from '../playbook-version/validator-version.js';
import { ValidationSummary } from '../playbook-version/validation-summary.js';
import { ValidationAttempt } from '../index.js';

function parsedValidationAttemptId(value: string) {
  const result = parseValidationAttemptId(value);
  if (!result.success) throw new Error(`Invalid validation attempt ID: ${value}`);
  return result.value;
}

function parsedPlaybookVersionId(value: string) {
  const result = parsePlaybookVersionId(value);
  if (!result.success) throw new Error(`Invalid playbook version ID: ${value}`);
  return result.value;
}

const fixtureValidationAttemptId = parsedValidationAttemptId(
  'dddddddd-1111-2222-3333-444444444444',
);

const fixturePlaybookVersionId = parsedPlaybookVersionId('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

function instant(value: string): Instant {
  const result = Instant.parse(value);
  if (!result.success) throw new Error(`Invalid instant: ${value}`);
  return result.value;
}

const startedAt = instant('2026-07-12T10:00:00Z');

function contentChecksum(
  value = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
): ContentChecksum {
  const result = ContentChecksum.create(`sha256:${value}`);
  if (!result.success) throw new Error('Invalid content checksum fixture.');
  return result.value;
}

function validatorVersion(value = 'validator/v1'): ValidatorVersion {
  const result = ValidatorVersion.create(value);
  if (!result.success) throw new Error('Invalid validator version fixture.');
  return result.value;
}

function summaryFor(
  overrides: {
    validationAttemptId?: string;
    completedAt?: Instant;
    blockingFindingCount?: number;
  } = {},
): ValidationSummary {
  const id = overrides.validationAttemptId ?? 'dddddddd-1111-2222-3333-444444444444';
  const parsedId = parseValidationAttemptId(id);
  if (!parsedId.success) throw new Error('Invalid validation attempt ID in fixture.');

  const blocking = overrides.blockingFindingCount ?? 0;

  const result = ValidationSummary.create({
    validationAttemptId: parsedId.value,
    validatorVersion: validatorVersion(),
    completedAt: overrides.completedAt ?? instant('2026-07-12T12:00:00Z'),
    validatedContentChecksum: contentChecksum(),
    errorCount: blocking,
    warningCount: 0,
    informationCount: 0,
    blockingFindingCount: blocking,
  });
  if (!result.success) throw new Error('Invalid validation summary fixture.');
  return result.value;
}

function createAttempt(): ValidationAttempt {
  const result = ValidationAttempt.create({
    validationAttemptId: fixtureValidationAttemptId,
    playbookVersionId: fixturePlaybookVersionId,
    startedAt,
  });
  if (!result.success) throw new Error('Unexpected creation failure');
  return result.value;
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe('ValidationAttempt.create', () => {
  it('returns a successful Result', () => {
    const result = ValidationAttempt.create({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      startedAt,
    });
    expect(result.success).toBe(true);
  });

  it('preserves validationAttemptId', () => {
    const attempt = createAttempt();
    expect(attempt.id).toBe(fixtureValidationAttemptId);
  });

  it('preserves playbookVersionId', () => {
    const attempt = createAttempt();
    expect(attempt.playbookVersionId).toBe(fixturePlaybookVersionId);
  });

  it('preserves startedAt', () => {
    const attempt = createAttempt();
    expect(attempt.startedAt.equals(startedAt)).toBe(true);
  });

  it('sets status to running', () => {
    const attempt = createAttempt();
    expect(attempt.status).toBe('running');
  });

  it('sets validationSummary to null', () => {
    const attempt = createAttempt();
    expect(attempt.validationSummary).toBeNull();
  });

  it('snapshot represents initial state', () => {
    const attempt = createAttempt();
    const snapshot = attempt.toSnapshot();

    expect(snapshot.status).toBe('running');
    expect(snapshot.startedAt).toBe('2026-07-12T10:00:00.000Z');
    expect(snapshot.validationSummary).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// restore — running
// ---------------------------------------------------------------------------

describe('ValidationAttempt.restore — running', () => {
  it('restores a valid running state without summary', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'running',
      startedAt,
      validationSummary: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.status).toBe('running');
      expect(result.value.validationSummary).toBeNull();
    }
  });

  it('rejects running with summary', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'running',
      startedAt,
      validationSummary: summaryFor({
        validationAttemptId: 'dddddddd-1111-2222-3333-444444444444',
      }),
    });
    expect(result.success).toBe(false);
  });

  it('returns VALIDATION_ATTEMPT_STATE_INVALID with reason unexpected_summary', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'running',
      startedAt,
      validationSummary: summaryFor(),
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ATTEMPT_STATE_INVALID',
        details: { reason: 'unexpected_summary' },
      },
    });
  });
});

// ---------------------------------------------------------------------------
// restore — validated
// ---------------------------------------------------------------------------

describe('ValidationAttempt.restore — validated', () => {
  const completedAt = instant('2026-07-12T12:00:00Z');

  it('restores a validated state with eligible summary', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'validated',
      startedAt,
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 0 }),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.status).toBe('validated');
      expect(result.value.validationSummary).not.toBeNull();
    }
  });

  it('accepts completedAt equal to startedAt', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'validated',
      startedAt,
      validationSummary: summaryFor({ completedAt: startedAt, blockingFindingCount: 0 }),
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing summary', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'validated',
      startedAt,
      validationSummary: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-eligible summary', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'validated',
      startedAt,
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 1 }),
    });
    expect(result.success).toBe(false);
  });

  it('rejects summary belonging to another attempt', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'validated',
      startedAt,
      validationSummary: summaryFor({
        validationAttemptId: 'eeeeeeee-1111-2222-3333-444444444444',
        completedAt,
        blockingFindingCount: 0,
      }),
    });
    expect(result.success).toBe(false);
  });

  it('rejects summary completed before startedAt', () => {
    const beforeStarted = instant('2026-07-12T09:00:00Z');
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'validated',
      startedAt,
      validationSummary: summaryFor({ completedAt: beforeStarted, blockingFindingCount: 0 }),
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// restore — invalid
// ---------------------------------------------------------------------------

describe('ValidationAttempt.restore — invalid', () => {
  const completedAt = instant('2026-07-12T12:00:00Z');

  it('restores an invalid state with non-eligible summary', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'invalid',
      startedAt,
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 3 }),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.status).toBe('invalid');
      expect(result.value.validationSummary).not.toBeNull();
    }
  });

  it('accepts completedAt equal to startedAt', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'invalid',
      startedAt,
      validationSummary: summaryFor({ completedAt: startedAt, blockingFindingCount: 3 }),
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing summary', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'invalid',
      startedAt,
      validationSummary: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects eligible summary', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'invalid',
      startedAt,
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 0 }),
    });
    expect(result.success).toBe(false);
  });

  it('rejects summary belonging to another attempt', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'invalid',
      startedAt,
      validationSummary: summaryFor({
        validationAttemptId: 'eeeeeeee-1111-2222-3333-444444444444',
        completedAt,
        blockingFindingCount: 3,
      }),
    });
    expect(result.success).toBe(false);
  });

  it('rejects summary completed before startedAt', () => {
    const beforeStarted = instant('2026-07-12T09:00:00Z');
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'invalid',
      startedAt,
      validationSummary: summaryFor({ completedAt: beforeStarted, blockingFindingCount: 3 }),
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Unknown status
// ---------------------------------------------------------------------------

describe('ValidationAttempt.restore — unknown status', () => {
  it('rejects pending', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'pending',
      startedAt,
      validationSummary: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects validating', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'validating',
      startedAt,
      validationSummary: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown string', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'bogus',
      startedAt,
      validationSummary: null,
    });
    expect(result.success).toBe(false);
  });

  it('returns reason unknown_status', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'pending',
      startedAt,
      validationSummary: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ATTEMPT_STATE_INVALID',
        details: { reason: 'unknown_status' },
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Validation order
// ---------------------------------------------------------------------------

describe('ValidationAttempt.restore — validation order', () => {
  it('returns summary_attempt_mismatch before summary_result_mismatch', () => {
    const foreignAttemptId = 'eeeeeeee-1111-2222-3333-444444444444';
    const completedAt = instant('2026-07-12T12:00:00Z');

    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'validated',
      startedAt,
      validationSummary: summaryFor({
        validationAttemptId: foreignAttemptId,
        completedAt,
        blockingFindingCount: 1,
      }),
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        details: { reason: 'summary_attempt_mismatch' },
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

describe('ValidationAttempt snapshot', () => {
  it('serializes a running attempt', () => {
    const attempt = createAttempt();
    const snapshot = attempt.toSnapshot();

    expect(snapshot.validationAttemptId).toBe(fixtureValidationAttemptId);
    expect(snapshot.playbookVersionId).toBe(fixturePlaybookVersionId);
    expect(snapshot.status).toBe('running');
    expect(snapshot.startedAt).toBe('2026-07-12T10:00:00.000Z');
    expect(snapshot.validationSummary).toBeNull();
  });

  it('serializes a validated attempt with summary snapshot', () => {
    const completedAt = instant('2026-07-12T12:00:00Z');
    const summary = summaryFor({ completedAt, blockingFindingCount: 0 });
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'validated',
      startedAt,
      validationSummary: summary,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const snapshot = result.value.toSnapshot();
      expect(snapshot.status).toBe('validated');
      expect(snapshot.validationSummary).not.toBeNull();
      expect(snapshot.validationSummary?.publicationEligible).toBe(true);
    }
  });

  it('root object is frozen', () => {
    const attempt = createAttempt();
    const snapshot = attempt.toSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Error immutability
// ---------------------------------------------------------------------------

describe('ValidationAttempt errors — immutability', () => {
  it('error root object is frozen', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'pending',
      startedAt,
      validationSummary: null,
    });
    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const result = ValidationAttempt.restore({
      validationAttemptId: fixtureValidationAttemptId,
      playbookVersionId: fixturePlaybookVersionId,
      status: 'pending',
      startedAt,
      validationSummary: null,
    });
    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
