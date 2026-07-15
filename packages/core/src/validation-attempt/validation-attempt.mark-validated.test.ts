import { describe, expect, it } from 'vitest';

import { parseValidationAttemptId, parsePlaybookVersionId } from '../identifiers.js';
import { Instant } from '../instant.js';
import { ContentChecksum } from '../playbook-version/content-checksum.js';
import { ValidatorVersion } from '../playbook-version/validator-version.js';
import { ValidationSummary } from '../playbook-version/validation-summary.js';
import { ValidationAttempt } from '../index.js';

function parsedAttemptId(value: string) {
  const result = parseValidationAttemptId(value);
  if (!result.success) throw new Error('Unexpected parse failure');
  return result.value;
}

function parsedPvId(value: string) {
  const result = parsePlaybookVersionId(value);
  if (!result.success) throw new Error('Unexpected parse failure');
  return result.value;
}

const attemptId = parsedAttemptId('dddddddd-1111-2222-3333-444444444444');
const otherAttemptId = parsedAttemptId('eeeeeeee-1111-2222-3333-444444444444');
const fixturePvId = parsedPvId('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

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
    validationAttemptId?: typeof attemptId;
    completedAt?: Instant;
    blockingFindingCount?: number;
  } = {},
): ValidationSummary {
  const id = overrides.validationAttemptId ?? attemptId;
  const blocking = overrides.blockingFindingCount ?? 0;

  const result = ValidationSummary.create({
    validationAttemptId: id,
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
    validationAttemptId: attemptId,
    playbookVersionId: fixturePvId,
    startedAt,
  });
  if (!result.success) throw new Error('Unexpected creation failure');
  return result.value;
}

// ---------------------------------------------------------------------------
// markValidated — success
// ---------------------------------------------------------------------------

describe('ValidationAttempt.markValidated', () => {
  const completedAt = instant('2026-07-12T12:00:00Z');

  it('marks a running attempt as validated', () => {
    const attempt = createAttempt();
    const result = attempt.markValidated({
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 0 }),
    });

    expect(result.success).toBe(true);
  });

  it('changes status to validated', () => {
    const attempt = createAttempt();
    attempt.markValidated({
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 0 }),
    });

    expect(attempt.status).toBe('validated');
  });

  it('preserves the validation summary instance', () => {
    const attempt = createAttempt();
    const summary = summaryFor({ completedAt, blockingFindingCount: 0 });
    attempt.markValidated({ validationSummary: summary });

    expect(attempt.validationSummary).toBe(summary);
  });

  it('accepts completedAt equal to startedAt', () => {
    const attempt = createAttempt();
    const result = attempt.markValidated({
      validationSummary: summaryFor({ completedAt: startedAt, blockingFindingCount: 0 }),
    });

    expect(result.success).toBe(true);
  });

  it('snapshot reflects validated state', () => {
    const attempt = createAttempt();
    attempt.markValidated({
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 0 }),
    });
    const snapshot = attempt.toSnapshot();

    expect(snapshot.status).toBe('validated');
    expect(snapshot.validationSummary).not.toBeNull();
    expect(snapshot.validationSummary?.publicationEligible).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// markValidated — summary attempt mismatch
// ---------------------------------------------------------------------------

describe('ValidationAttempt.markValidated — summary attempt mismatch', () => {
  const completedAt = instant('2026-07-12T12:00:00Z');

  it('rejects summary belonging to another attempt', () => {
    const attempt = createAttempt();
    const result = attempt.markValidated({
      validationSummary: summaryFor({
        validationAttemptId: otherAttemptId,
        completedAt,
        blockingFindingCount: 0,
      }),
    });

    expect(result.success).toBe(false);
  });

  it('returns VALIDATION_ATTEMPT_SUMMARY_INVALID with reason summary_attempt_mismatch', () => {
    const attempt = createAttempt();
    const result = attempt.markValidated({
      validationSummary: summaryFor({
        validationAttemptId: otherAttemptId,
        completedAt,
        blockingFindingCount: 0,
      }),
    });

    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ATTEMPT_SUMMARY_INVALID',
        details: {
          operation: 'markValidated',
          field: 'validationSummary',
          reason: 'summary_attempt_mismatch',
        },
      },
    });
  });

  it('preserves running status', () => {
    const attempt = createAttempt();
    attempt.markValidated({
      validationSummary: summaryFor({
        validationAttemptId: otherAttemptId,
        completedAt,
        blockingFindingCount: 0,
      }),
    });

    expect(attempt.status).toBe('running');
  });

  it('preserves validationSummary as null', () => {
    const attempt = createAttempt();
    attempt.markValidated({
      validationSummary: summaryFor({
        validationAttemptId: otherAttemptId,
        completedAt,
        blockingFindingCount: 0,
      }),
    });

    expect(attempt.validationSummary).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// markValidated — timestamp before started
// ---------------------------------------------------------------------------

describe('ValidationAttempt.markValidated — timestamp before started', () => {
  const beforeStarted = instant('2026-07-12T09:00:00Z');

  it('rejects summary completed before startedAt', () => {
    const attempt = createAttempt();
    const result = attempt.markValidated({
      validationSummary: summaryFor({ completedAt: beforeStarted, blockingFindingCount: 0 }),
    });

    expect(result.success).toBe(false);
  });

  it('returns reason summary_completed_before_started', () => {
    const attempt = createAttempt();
    const result = attempt.markValidated({
      validationSummary: summaryFor({ completedAt: beforeStarted, blockingFindingCount: 0 }),
    });

    expect(result).toMatchObject({
      success: false,
      error: {
        details: { reason: 'summary_completed_before_started' },
      },
    });
  });

  it('preserves running status', () => {
    const attempt = createAttempt();
    attempt.markValidated({
      validationSummary: summaryFor({ completedAt: beforeStarted, blockingFindingCount: 0 }),
    });

    expect(attempt.status).toBe('running');
  });

  it('preserves validationSummary as null', () => {
    const attempt = createAttempt();
    attempt.markValidated({
      validationSummary: summaryFor({ completedAt: beforeStarted, blockingFindingCount: 0 }),
    });

    expect(attempt.validationSummary).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// markValidated — not publication eligible
// ---------------------------------------------------------------------------

describe('ValidationAttempt.markValidated — not publication eligible', () => {
  const completedAt = instant('2026-07-12T12:00:00Z');

  it('rejects summary with blocking findings', () => {
    const attempt = createAttempt();
    const result = attempt.markValidated({
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 3 }),
    });

    expect(result.success).toBe(false);
  });

  it('returns reason summary_not_publication_eligible', () => {
    const attempt = createAttempt();
    const result = attempt.markValidated({
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 3 }),
    });

    expect(result).toMatchObject({
      success: false,
      error: {
        details: { reason: 'summary_not_publication_eligible' },
      },
    });
  });

  it('preserves running status', () => {
    const attempt = createAttempt();
    attempt.markValidated({
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 3 }),
    });

    expect(attempt.status).toBe('running');
  });

  it('preserves validationSummary as null', () => {
    const attempt = createAttempt();
    attempt.markValidated({
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 3 }),
    });

    expect(attempt.validationSummary).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// markValidated — already validated
// ---------------------------------------------------------------------------

describe('ValidationAttempt.markValidated — already validated', () => {
  const completedAt = instant('2026-07-12T12:00:00Z');
  const laterCompleted = instant('2026-07-12T13:00:00Z');

  it('rejects a second call', () => {
    const attempt = createAttempt();
    attempt.markValidated({
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 0 }),
    });
    const result = attempt.markValidated({
      validationSummary: summaryFor({ completedAt: laterCompleted, blockingFindingCount: 0 }),
    });

    expect(result.success).toBe(false);
  });

  it('returns VALIDATION_ATTEMPT_NOT_RUNNING', () => {
    const attempt = createAttempt();
    attempt.markValidated({
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 0 }),
    });
    const result = attempt.markValidated({
      validationSummary: summaryFor({ completedAt: laterCompleted, blockingFindingCount: 0 }),
    });

    expect(result).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ATTEMPT_NOT_RUNNING' },
    });
  });

  it('reports currentStatus validated', () => {
    const attempt = createAttempt();
    attempt.markValidated({
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 0 }),
    });
    const result = attempt.markValidated({
      validationSummary: summaryFor({ completedAt: laterCompleted, blockingFindingCount: 0 }),
    });

    expect(result).toMatchObject({
      success: false,
      error: {
        details: { operation: 'markValidated', currentStatus: 'validated' },
      },
    });
  });

  it('preserves the original summary', () => {
    const attempt = createAttempt();
    const firstSummary = summaryFor({ completedAt, blockingFindingCount: 0 });
    attempt.markValidated({ validationSummary: firstSummary });
    attempt.markValidated({
      validationSummary: summaryFor({ completedAt: laterCompleted, blockingFindingCount: 0 }),
    });

    expect(attempt.validationSummary).toBe(firstSummary);
  });
});

// ---------------------------------------------------------------------------
// markValidated — invalid attempt
// ---------------------------------------------------------------------------

describe('ValidationAttempt.markValidated — invalid attempt', () => {
  const completedAt = instant('2026-07-12T12:00:00Z');

  function restoreInvalid(): ValidationAttempt {
    const result = ValidationAttempt.restore({
      validationAttemptId: attemptId,
      playbookVersionId: fixturePvId,
      status: 'invalid',
      startedAt,
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 3 }),
    });
    if (!result.success) throw new Error('Unexpected restore failure');
    return result.value;
  }

  it('rejects markValidated on invalid attempt', () => {
    const attempt = restoreInvalid();
    const result = attempt.markValidated({
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 0 }),
    });

    expect(result.success).toBe(false);
  });

  it('returns VALIDATION_ATTEMPT_NOT_RUNNING', () => {
    const attempt = restoreInvalid();
    const result = attempt.markValidated({
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 0 }),
    });

    expect(result).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ATTEMPT_NOT_RUNNING' },
    });
  });

  it('reports currentStatus invalid', () => {
    const attempt = restoreInvalid();
    const result = attempt.markValidated({
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 0 }),
    });

    expect(result).toMatchObject({
      success: false,
      error: {
        details: { operation: 'markValidated', currentStatus: 'invalid' },
      },
    });
  });

  it('preserves invalid status', () => {
    const attempt = restoreInvalid();
    attempt.markValidated({
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 0 }),
    });

    expect(attempt.status).toBe('invalid');
  });

  it('preserves the original summary', () => {
    const attempt = restoreInvalid();
    const originalSummary = attempt.validationSummary;
    attempt.markValidated({
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 0 }),
    });

    expect(attempt.validationSummary).toBe(originalSummary);
  });
});

// ---------------------------------------------------------------------------
// markValidated — validation order
// ---------------------------------------------------------------------------

describe('ValidationAttempt.markValidated — validation order', () => {
  const completedAt = instant('2026-07-12T12:00:00Z');

  it('returns NOT_RUNNING before SUMMARY_INVALID on terminal attempt', () => {
    const attempt = createAttempt();
    attempt.markValidated({
      validationSummary: summaryFor({ completedAt, blockingFindingCount: 0 }),
    });

    const result = attempt.markValidated({
      validationSummary: summaryFor({
        validationAttemptId: otherAttemptId,
        completedAt,
        blockingFindingCount: 0,
      }),
    });

    expect(result).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ATTEMPT_NOT_RUNNING' },
    });
  });

  it('returns summary_attempt_mismatch before summary_not_publication_eligible', () => {
    const attempt = createAttempt();
    const result = attempt.markValidated({
      validationSummary: summaryFor({
        validationAttemptId: otherAttemptId,
        completedAt,
        blockingFindingCount: 3,
      }),
    });

    expect(result).toMatchObject({
      success: false,
      error: {
        details: { reason: 'summary_attempt_mismatch' },
      },
    });
  });

  it('returns summary_completed_before_started before summary_not_publication_eligible', () => {
    const attempt = createAttempt();
    const beforeStarted = instant('2026-07-12T09:00:00Z');
    const result = attempt.markValidated({
      validationSummary: summaryFor({
        completedAt: beforeStarted,
        blockingFindingCount: 3,
      }),
    });

    expect(result).toMatchObject({
      success: false,
      error: {
        details: { reason: 'summary_completed_before_started' },
      },
    });
  });
});

// ---------------------------------------------------------------------------
// markValidated — error immutability
// ---------------------------------------------------------------------------

describe('ValidationAttempt.markValidated — error immutability', () => {
  it('error root object is frozen', () => {
    const attempt = createAttempt();
    const beforeStarted = instant('2026-07-12T09:00:00Z');
    const result = attempt.markValidated({
      validationSummary: summaryFor({ completedAt: beforeStarted, blockingFindingCount: 0 }),
    });

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const attempt = createAttempt();
    const beforeStarted = instant('2026-07-12T09:00:00Z');
    const result = attempt.markValidated({
      validationSummary: summaryFor({ completedAt: beforeStarted, blockingFindingCount: 0 }),
    });

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
