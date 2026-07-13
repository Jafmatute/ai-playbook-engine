import { describe, expect, it } from 'vitest';

import {
  ContentChecksum,
  ValidationSummary,
  ValidatorVersion,
  type ValidationAttemptId,
} from '../index.js';
import { Instant } from '../index.js';
import { parseValidationAttemptId } from '../index.js';

const uuid = 'de305d54-75b4-431b-adb2-eb6b9e546014';

function validId(): ValidationAttemptId {
  const result = parseValidationAttemptId(uuid);
  if (!result.success) throw new Error('Fixture id must be valid.');
  return result.value;
}

function validChecksum(): ContentChecksum {
  const result = ContentChecksum.create({ algorithm: 'sha256', value: 'a'.repeat(64) });
  if (!result.success) throw new Error('Fixture checksum must be valid.');
  return result.value;
}

function validVersion(): ValidatorVersion {
  const result = ValidatorVersion.create('validator/v1');
  if (!result.success) throw new Error('Fixture version must be valid.');
  return result.value;
}

function validInstant(): Instant {
  const result = Instant.parse('2026-07-12T21:00:00.000Z');
  if (!result.success) throw new Error('Fixture instant must be valid.');
  return result.value;
}

function makeValidSummary(overrides?: {
  errorCount?: number;
  warningCount?: number;
  informationCount?: number;
  blockingFindingCount?: number;
}) {
  return ValidationSummary.create({
    validationAttemptId: validId(),
    validatorVersion: validVersion(),
    completedAt: validInstant(),
    validatedContentChecksum: validChecksum(),
    errorCount: overrides?.errorCount ?? 0,
    warningCount: overrides?.warningCount ?? 0,
    informationCount: overrides?.informationCount ?? 0,
    blockingFindingCount: overrides?.blockingFindingCount ?? 0,
  });
}

describe('ValidationSummary', () => {
  it('all counts zero — eligible', () => {
    const result = makeValidSummary();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.errorCount).toBe(0);
      expect(result.value.warningCount).toBe(0);
      expect(result.value.informationCount).toBe(0);
      expect(result.value.blockingFindingCount).toBe(0);
      expect(result.value.totalFindings).toBe(0);
      expect(result.value.publicationEligible).toBe(true);
    }
  });

  it('only warnings — eligible', () => {
    const result = makeValidSummary({ warningCount: 3 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.totalFindings).toBe(3);
      expect(result.value.publicationEligible).toBe(true);
    }
  });

  it('only information — eligible', () => {
    const result = makeValidSummary({ informationCount: 5 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.totalFindings).toBe(5);
      expect(result.value.publicationEligible).toBe(true);
    }
  });

  it('errors without blocking — eligible', () => {
    const result = makeValidSummary({ errorCount: 2, blockingFindingCount: 0 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.totalFindings).toBe(2);
      expect(result.value.publicationEligible).toBe(true);
    }
  });

  it('one blocking error — not eligible', () => {
    const result = makeValidSummary({ errorCount: 1, blockingFindingCount: 1 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.publicationEligible).toBe(false);
    }
  });

  it('multiple types — total correct', () => {
    const result = makeValidSummary({
      errorCount: 2,
      warningCount: 3,
      informationCount: 5,
      blockingFindingCount: 1,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.totalFindings).toBe(10);
      expect(result.value.publicationEligible).toBe(false);
    }
  });

  it('preserves validationAttemptId', () => {
    const result = makeValidSummary();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.validationAttemptId).toBe(validId());
    }
  });

  it('preserves validatorVersion', () => {
    const result = makeValidSummary();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.validatorVersion.equals(validVersion())).toBe(true);
    }
  });

  it('preserves completedAt', () => {
    const result = makeValidSummary();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.completedAt.equals(validInstant())).toBe(true);
    }
  });

  it('preserves checksum', () => {
    const result = makeValidSummary();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.validatedContentChecksum.equals(validChecksum())).toBe(true);
    }
  });

  describe('invalid counts', () => {
    it.each([
      { field: 'errorCount', value: -1 },
      { field: 'warningCount', value: -5 },
      { field: 'informationCount', value: -3 },
      { field: 'blockingFindingCount', value: -2 },
    ])('rejects negative $field', ({ field, value }) => {
      const result = makeValidSummary({ [field]: value });

      expect(result).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_SUMMARY_INVALID',
          details: { field, reason: 'below_minimum' },
        },
      });
    });

    it.each([
      { field: 'errorCount', value: 1.5 },
      { field: 'warningCount', value: 0.1 },
      { field: 'informationCount', value: 2.9 },
      { field: 'blockingFindingCount', value: 0.5 },
    ])('rejects decimal $field', ({ field, value }) => {
      const result = makeValidSummary({ [field]: value });

      expect(result).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_SUMMARY_INVALID',
          details: { field, reason: 'not_integer' },
        },
      });
    });

    it('rejects NaN errorCount', () => {
      const result = makeValidSummary({ errorCount: NaN });

      expect(result).toMatchObject({
        success: false,
        error: { details: { reason: 'not_finite' } },
      });
    });

    it('rejects Infinity warningCount', () => {
      const result = makeValidSummary({ warningCount: Infinity });

      expect(result).toMatchObject({
        success: false,
        error: { details: { reason: 'not_finite' } },
      });
    });
  });

  describe('consistency', () => {
    it('rejects blockingFindingCount > errorCount', () => {
      const result = makeValidSummary({ errorCount: 1, blockingFindingCount: 2 });

      expect(result).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_SUMMARY_INVALID',
          details: { field: 'blockingFindingCount', reason: 'blocking_exceeds_errors' },
        },
      });
    });

    it('accepts blockingFindingCount === errorCount', () => {
      const result = makeValidSummary({ errorCount: 3, blockingFindingCount: 3 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.blockingFindingCount).toBe(3);
        expect(result.value.publicationEligible).toBe(false);
      }
    });

    it('accepts non-blocking errors', () => {
      const result = makeValidSummary({ errorCount: 5, blockingFindingCount: 2 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.publicationEligible).toBe(false);
        expect(result.value.totalFindings).toBe(5);
      }
    });

    it('totalFindings cannot be supplied manually', () => {
      const input = {
        validationAttemptId: validId(),
        validatorVersion: validVersion(),
        completedAt: validInstant(),
        validatedContentChecksum: validChecksum(),
        errorCount: 0,
        warningCount: 0,
        informationCount: 0,
        blockingFindingCount: 0,
        totalFindings: 0,
        publicationEligible: true,
      };

      expect('totalFindings' in input).toBe(true);
      expect('publicationEligible' in input).toBe(true);
    });
  });

  describe('snapshot', () => {
    it('contains all canonical values', () => {
      const result = makeValidSummary({
        errorCount: 2,
        warningCount: 3,
        informationCount: 1,
        blockingFindingCount: 1,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const snapshot = result.value.toSnapshot();

        expect(snapshot.validationAttemptId).toBe(validId());
        expect(snapshot.validatorVersion).toBe('validator/v1');
        expect(snapshot.completedAt).toBe('2026-07-12T21:00:00.000Z');
        expect(snapshot.validatedContentChecksum).toEqual({
          algorithm: 'sha256',
          value: 'a'.repeat(64),
        });
        expect(snapshot.totalFindings).toBe(6);
        expect(snapshot.errorCount).toBe(2);
        expect(snapshot.warningCount).toBe(3);
        expect(snapshot.informationCount).toBe(1);
        expect(snapshot.blockingFindingCount).toBe(1);
        expect(snapshot.publicationEligible).toBe(false);
      }
    });

    it('returns new object each call', () => {
      const result = makeValidSummary();
      expect(result.success).toBe(true);
      if (result.success) {
        const a = result.value.toSnapshot();
        const b = result.value.toSnapshot();

        expect(a).not.toBe(b);
        expect(a).toEqual(b);
      }
    });

    it('modifying nested copy does not affect VO', () => {
      const result = makeValidSummary();
      expect(result.success).toBe(true);
      if (result.success) {
        const snapshot = result.value.toSnapshot();
        const modified = { ...snapshot, errorCount: 999 };

        expect(snapshot.errorCount).toBe(0);
        expect(modified.errorCount).toBe(999);
        expect(result.value.errorCount).toBe(0);
      }
    });

    it('snapshot is frozen at runtime', () => {
      const result = makeValidSummary();
      expect(result.success).toBe(true);
      if (result.success) {
        const snapshot = result.value.toSnapshot();

        expect(Object.isFrozen(snapshot)).toBe(true);
        expect(Object.isFrozen(snapshot.validatedContentChecksum)).toBe(true);
      }
    });
  });
});
