import { describe, expect, it } from 'vitest';

import type { PlaybookVersion } from '../index.js';
import {
  instant,
  contentChecksum,
  validationSummary,
  defaultNow,
  createDraft,
  restoreValidDraftPending,
  restoreValidDraftRunning,
  restoreValidDraftCompleted,
  restoreValidDraftFailed,
  restoreValidValidating,
  restoreValidValidated,
  restoreValidInvalid,
  restoreValidPublished,
  restoreValidArchivedFromPublished,
  fixtureNormalizationAttemptId,
} from './playbook-version.test-fixtures.js';

// ---------------------------------------------------------------------------
// Validation — beginValidation
// ---------------------------------------------------------------------------

describe('PlaybookVersion beginValidation', () => {
  it('transitions draft with completed normalization to validating', () => {
    const version = restoreValidDraftCompleted();
    const startedAt = instant('2026-07-12T11:00:00Z');
    const result = version.beginValidation({ startedAt });
    expect(result.success).toBe(true);
    expect(version.status).toBe('validating');
  });

  it('assigns validationStartedAt', () => {
    const version = restoreValidDraftCompleted();
    const startedAt = instant('2026-07-12T11:00:00Z');
    const result = version.beginValidation({ startedAt });
    expect(result.success).toBe(true);
    expect(version.validationStartedAt?.equals(startedAt)).toBe(true);
  });

  it('updates updatedAt to startedAt', () => {
    const version = restoreValidDraftCompleted();
    const startedAt = instant('2026-07-12T11:00:00Z');
    const result = version.beginValidation({ startedAt });
    expect(result.success).toBe(true);
    expect(version.updatedAt.equals(startedAt)).toBe(true);
  });

  it('preserves normalizationStatus as completed', () => {
    const version = restoreValidDraftCompleted();
    const result = version.beginValidation({ startedAt: instant('2026-07-12T11:00:00Z') });
    expect(result.success).toBe(true);
    expect(version.normalizationStatus).toBe('completed');
  });

  it('preserves normalizationAttemptId', () => {
    const version = restoreValidDraftCompleted();
    const result = version.beginValidation({ startedAt: instant('2026-07-12T11:00:00Z') });
    expect(result.success).toBe(true);
    expect(version.normalizationAttemptId).toBe(fixtureNormalizationAttemptId);
  });

  it('preserves sourceContentChecksum and metadata', () => {
    const version = restoreValidDraftCompleted();
    const before = version.toSnapshot();
    const result = version.beginValidation({ startedAt: instant('2026-07-12T11:00:00Z') });
    expect(result.success).toBe(true);
    const after = version.toSnapshot();
    expect(after.playbookVersionId).toBe(before.playbookVersionId);
    expect(after.workspaceId).toBe(before.workspaceId);
    expect(after.playbookId).toBe(before.playbookId);
    expect(after.synchronizationSnapshotId).toBe(before.synchronizationSnapshotId);
    expect(after.versionSequence).toBe(before.versionSequence);
    expect(after.versionLabel).toBe(before.versionLabel);
    expect(after.parserVersion).toBe(before.parserVersion);
    expect(after.normalizationSchemaVersion).toBe(before.normalizationSchemaVersion);
    expect(after.sourceContentChecksum).toEqual(before.sourceContentChecksum);
    expect(after.validationSummary).toBeNull();
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.validatedAt).toBeNull();
    expect(after.publishedAt).toBeNull();
    expect(after.archivedAt).toBeNull();
  });

  it('accepts startedAt equal to updatedAt', () => {
    const version = restoreValidDraftCompleted();
    const result = version.beginValidation({ startedAt: defaultNow });
    expect(result.success).toBe(true);
    expect(version.updatedAt.equals(defaultNow)).toBe(true);
  });

  it.each(['pending', 'running', 'failed'] as const)(
    'rejects normalization status %s with PLAYBOOK_VERSION_NORMALIZATION_INCOMPLETE',
    (normStatus) => {
      let version: PlaybookVersion;
      if (normStatus === 'pending') version = restoreValidDraftPending();
      else if (normStatus === 'running') version = restoreValidDraftRunning();
      else version = restoreValidDraftFailed();

      const before = version.toSnapshot();
      const result = version.beginValidation({ startedAt: instant('2026-07-12T11:00:00Z') });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PLAYBOOK_VERSION_NORMALIZATION_INCOMPLETE');
      }
      expect(version.toSnapshot()).toEqual(before);
    },
  );

  it('rejects when already validating with PLAYBOOK_VERSION_VALIDATION_ALREADY_STARTED', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const result = version.beginValidation({ startedAt: instant('2026-07-12T11:00:00Z') });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_VALIDATION_ALREADY_STARTED');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it.each(['validated', 'invalid', 'published', 'archived'] as const)(
    'rejects status %s with PLAYBOOK_VERSION_OPERATION_NOT_ALLOWED',
    (status) => {
      let version: PlaybookVersion;
      if (status === 'validated') version = restoreValidValidated();
      else if (status === 'invalid') version = restoreValidInvalid();
      else if (status === 'published') version = restoreValidPublished();
      else version = restoreValidArchivedFromPublished();

      const before = version.toSnapshot();
      const result = version.beginValidation({ startedAt: instant('2026-07-12T11:00:00Z') });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PLAYBOOK_VERSION_OPERATION_NOT_ALLOWED');
      }
      expect(version.toSnapshot()).toEqual(before);
    },
  );

  it('rejects startedAt before updatedAt', () => {
    const version = restoreValidDraftCompleted();
    const before = version.toSnapshot();
    const result = version.beginValidation({ startedAt: instant('2026-07-12T09:00:00Z') });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_STATE_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Validation — markValidated
// ---------------------------------------------------------------------------

describe('PlaybookVersion markValidated', () => {
  it('transitions validating to validated', () => {
    const version = restoreValidValidating();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = version.markValidated({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(true);
    expect(version.status).toBe('validated');
  });

  it('persists the validation summary', () => {
    const version = restoreValidValidating();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = version.markValidated({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(true);
    expect(version.validationSummary).not.toBeNull();
    expect(version.validationSummary?.publicationEligible).toBe(true);
  });

  it('sets validatedAt and updates updatedAt', () => {
    const version = restoreValidValidating();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = version.markValidated({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(true);
    expect(version.validatedAt?.equals(validatedAt)).toBe(true);
    expect(version.updatedAt.equals(validatedAt)).toBe(true);
  });

  it('preserves validationStartedAt and normalizationStatus', () => {
    const version = restoreValidValidating();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = version.markValidated({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(true);
    expect(version.validationStartedAt).not.toBeNull();
    expect(version.normalizationStatus).toBe('completed');
  });

  it('does not set publishedAt', () => {
    const version = restoreValidValidating();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = version.markValidated({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(true);
    expect(version.publishedAt).toBeNull();
  });

  it('accepts validatedAt equal to updatedAt', () => {
    const version = restoreValidValidating();
    const validatedAt = version.updatedAt;
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = version.markValidated({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(true);
  });

  it.each(['draft', 'validated', 'invalid', 'published', 'archived'] as const)(
    'rejects markValidated when status is %s',
    (status) => {
      let version: PlaybookVersion;
      if (status === 'draft') version = restoreValidDraftCompleted();
      else if (status === 'validated') version = restoreValidValidated();
      else if (status === 'invalid') version = restoreValidInvalid();
      else if (status === 'published') version = restoreValidPublished();
      else version = restoreValidArchivedFromPublished();

      const before = version.toSnapshot();
      const validatedAt = instant('2026-07-12T12:00:00Z');
      const summary = validationSummary({
        completedAt: validatedAt,
        validatedContentChecksum: contentChecksum(),
        blockingFindingCount: 0,
      });
      const result = version.markValidated({ validationSummary: summary, validatedAt });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PLAYBOOK_VERSION_NOT_VALIDATING');
      }
      expect(version.toSnapshot()).toEqual(before);
    },
  );

  it('rejects markValidated with non-eligible summary', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 3,
    });
    const result = version.markValidated({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_VALIDATION_SUMMARY_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects markValidated with blocking finding count greater than zero', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 1,
    });
    const result = version.markValidated({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_VALIDATION_SUMMARY_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects markValidated with completedAt different from validatedAt', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: instant('2026-07-12T12:30:00Z'),
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = version.markValidated({ validationSummary: summary, validatedAt });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_VALIDATION_SUMMARY_INVALID',
        details: { reason: 'validation_completion_mismatch' },
      },
    });
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects markValidated with checksum mismatch', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const differentChecksum = contentChecksum(
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: differentChecksum,
      blockingFindingCount: 0,
    });
    const result = version.markValidated({ validationSummary: summary, validatedAt });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_VALIDATION_SUMMARY_INVALID',
        details: { reason: 'validation_checksum_mismatch' },
      },
    });
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects markValidated with validatedAt before validationStartedAt', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const validatedAt = instant('2026-07-12T10:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = version.markValidated({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_STATE_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects markValidated with validatedAt before updatedAt', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const validatedAt = instant('2026-07-12T10:30:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = version.markValidated({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_STATE_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Validation — markInvalid
// ---------------------------------------------------------------------------

describe('PlaybookVersion markInvalid', () => {
  it('transitions validating to invalid', () => {
    const version = restoreValidValidating();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 3,
    });
    const result = version.markInvalid({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(true);
    expect(version.status).toBe('invalid');
  });

  it('persists the ineligible validation summary with blocking findings', () => {
    const version = restoreValidValidating();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 3,
    });
    const result = version.markInvalid({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(true);
    expect(version.validationSummary).not.toBeNull();
    expect(version.validationSummary?.publicationEligible).toBe(false);
    expect(version.validationSummary?.blockingFindingCount).toBe(3);
  });

  it('sets validatedAt and updates updatedAt', () => {
    const version = restoreValidValidating();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 3,
    });
    const result = version.markInvalid({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(true);
    expect(version.validatedAt?.equals(validatedAt)).toBe(true);
    expect(version.updatedAt.equals(validatedAt)).toBe(true);
  });

  it('preserves validationStartedAt', () => {
    const version = restoreValidValidating();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 3,
    });
    const result = version.markInvalid({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(true);
    expect(version.validationStartedAt).not.toBeNull();
  });

  it('does not set publishedAt', () => {
    const version = restoreValidValidating();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 3,
    });
    const result = version.markInvalid({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(true);
    expect(version.publishedAt).toBeNull();
  });

  it.each(['draft', 'validated', 'invalid', 'published', 'archived'] as const)(
    'rejects markInvalid when status is %s',
    (status) => {
      let version: PlaybookVersion;
      if (status === 'draft') version = restoreValidDraftCompleted();
      else if (status === 'validated') version = restoreValidValidated();
      else if (status === 'invalid') version = restoreValidInvalid();
      else if (status === 'published') version = restoreValidPublished();
      else version = restoreValidArchivedFromPublished();

      const before = version.toSnapshot();
      const validatedAt = instant('2026-07-12T12:00:00Z');
      const summary = validationSummary({
        completedAt: validatedAt,
        validatedContentChecksum: contentChecksum(),
        blockingFindingCount: 3,
      });
      const result = version.markInvalid({ validationSummary: summary, validatedAt });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PLAYBOOK_VERSION_NOT_VALIDATING');
      }
      expect(version.toSnapshot()).toEqual(before);
    },
  );

  it('rejects markInvalid with eligible summary', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = version.markInvalid({ validationSummary: summary, validatedAt });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_VALIDATION_SUMMARY_INVALID',
        details: { reason: 'validation_summary_unexpectedly_eligible' },
      },
    });
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects markInvalid with zero blocking findings', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = version.markInvalid({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_VALIDATION_SUMMARY_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects markInvalid with completedAt different from validatedAt', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: instant('2026-07-12T12:30:00Z'),
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 3,
    });
    const result = version.markInvalid({ validationSummary: summary, validatedAt });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_VALIDATION_SUMMARY_INVALID',
        details: { reason: 'validation_completion_mismatch' },
      },
    });
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects markInvalid with checksum mismatch', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const differentChecksum = contentChecksum(
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: differentChecksum,
      blockingFindingCount: 3,
    });
    const result = version.markInvalid({ validationSummary: summary, validatedAt });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_VALIDATION_SUMMARY_INVALID',
        details: { reason: 'validation_checksum_mismatch' },
      },
    });
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects markInvalid with validatedAt before validationStartedAt', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const validatedAt = instant('2026-07-12T10:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 3,
    });
    const result = version.markInvalid({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_STATE_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects markInvalid with validatedAt before updatedAt', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const validatedAt = instant('2026-07-12T10:30:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 3,
    });
    const result = version.markInvalid({ validationSummary: summary, validatedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_STATE_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Validation — Full sequences
// ---------------------------------------------------------------------------

describe('PlaybookVersion validation full sequences', () => {
  it('create → beginNormalization → completeNormalization → beginValidation → markValidated', () => {
    const createdAt = instant('2026-07-12T09:00:00Z');
    const version = createDraft({ createdAt });

    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: instant('2026-07-12T10:00:00Z'),
    });
    expect(r1.success).toBe(true);

    const r2 = version.completeNormalization({ completedAt: instant('2026-07-12T11:00:00Z') });
    expect(r2.success).toBe(true);

    const r3 = version.beginValidation({ startedAt: instant('2026-07-12T11:30:00Z') });
    expect(r3.success).toBe(true);
    expect(version.status).toBe('validating');

    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const r4 = version.markValidated({ validationSummary: summary, validatedAt });
    expect(r4.success).toBe(true);

    expect(version.status).toBe('validated');
    expect(version.normalizationStatus).toBe('completed');
    expect(version.validationSummary).not.toBeNull();
    expect(version.validationSummary?.publicationEligible).toBe(true);
    expect(version.validatedAt?.equals(validatedAt)).toBe(true);
    expect(version.publishedAt).toBeNull();
    expect(version.archivedAt).toBeNull();
  });

  it('create → beginNormalization → completeNormalization → beginValidation → markInvalid', () => {
    const createdAt = instant('2026-07-12T09:00:00Z');
    const version = createDraft({ createdAt });

    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: instant('2026-07-12T10:00:00Z'),
    });
    expect(r1.success).toBe(true);

    const r2 = version.completeNormalization({ completedAt: instant('2026-07-12T11:00:00Z') });
    expect(r2.success).toBe(true);

    const r3 = version.beginValidation({ startedAt: instant('2026-07-12T11:30:00Z') });
    expect(r3.success).toBe(true);

    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 3,
    });
    const r4 = version.markInvalid({ validationSummary: summary, validatedAt });
    expect(r4.success).toBe(true);

    expect(version.status).toBe('invalid');
    expect(version.normalizationStatus).toBe('completed');
    expect(version.validationSummary).not.toBeNull();
    expect(version.validationSummary?.publicationEligible).toBe(false);
    expect(version.validationSummary?.blockingFindingCount).toBe(3);
    expect(version.publishedAt).toBeNull();
  });
});
