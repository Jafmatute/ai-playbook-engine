import { describe, expect, it } from 'vitest';

import {
  instant,
  createDraft,
  restoreValidDraftFailed,
  restoreValidDraftCompleted,
  restoreValidValidating,
  restoreValidValidated,
  restoreValidInvalid,
  restoreValidPublished,
  restoreValidArchivedFromPublished,
  fixtureNormalizationAttemptId,
  fixtureSecondAttemptId,
  parsedNormalizationAttemptId,
  defaultNow,
} from './playbook-version.test-fixtures.js';

// ---------------------------------------------------------------------------
// Normalization — beginNormalization
// ---------------------------------------------------------------------------

describe('PlaybookVersion beginNormalization', () => {
  // ------ From pending ------

  it('transitions pending to running', () => {
    const version = createDraft();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(result.success).toBe(true);
    expect(version.normalizationStatus).toBe('running');
  });

  it('assigns normalizationAttemptId', () => {
    const version = createDraft();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(result.success).toBe(true);
    expect(version.normalizationAttemptId).toBe(fixtureNormalizationAttemptId);
  });

  it('updates updatedAt', () => {
    const version = createDraft();
    const startedAt = instant('2026-07-12T11:00:00Z');
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt,
    });
    expect(result.success).toBe(true);
    expect(version.updatedAt.equals(startedAt)).toBe(true);
  });

  it('preserves status as draft', () => {
    const version = createDraft();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(result.success).toBe(true);
    expect(version.status).toBe('draft');
  });

  it('preserves all other fields', () => {
    const version = createDraft();
    const before = version.toSnapshot();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(result.success).toBe(true);
    const after = version.toSnapshot();
    expect(after.playbookVersionId).toBe(before.playbookVersionId);
    expect(after.workspaceId).toBe(before.workspaceId);
    expect(after.playbookId).toBe(before.playbookId);
    expect(after.synchronizationSnapshotId).toBe(before.synchronizationSnapshotId);
    expect(after.versionSequence).toBe(before.versionSequence);
    expect(after.versionLabel).toBe(before.versionLabel);
    expect(after.status).toBe('draft');
    expect(after.parserVersion).toBe(before.parserVersion);
    expect(after.normalizationSchemaVersion).toBe(before.normalizationSchemaVersion);
    expect(after.sourceContentChecksum).toEqual(before.sourceContentChecksum);
    expect(after.validationSummary).toBeNull();
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.validationStartedAt).toBeNull();
    expect(after.validatedAt).toBeNull();
    expect(after.publishedAt).toBeNull();
    expect(after.archivedAt).toBeNull();
  });

  it('accepts timestamp equal to updatedAt', () => {
    const version = createDraft();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(result.success).toBe(true);
    expect(version.updatedAt.equals(defaultNow)).toBe(true);
  });

  // ------ From failed (retry) ------

  it('retries with a new attempt', () => {
    const version = restoreValidDraftFailed();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureSecondAttemptId,
      startedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(true);
    expect(version.normalizationStatus).toBe('running');
    expect(version.normalizationAttemptId).toBe(fixtureSecondAttemptId);
  });

  it('replaces previous attempt with new one on retry', () => {
    const version = restoreValidDraftFailed();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureSecondAttemptId,
      startedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(true);
    expect(version.normalizationAttemptId).toBe(fixtureSecondAttemptId);
    expect(version.normalizationAttemptId).not.toBe(fixtureNormalizationAttemptId);
  });

  it('transitions failed to running on retry', () => {
    const version = restoreValidDraftFailed();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureSecondAttemptId,
      startedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(true);
    expect(version.normalizationStatus).toBe('running');
  });

  it('updates updatedAt on retry', () => {
    const version = restoreValidDraftFailed();
    const startedAt = instant('2026-07-12T11:00:00Z');
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureSecondAttemptId,
      startedAt,
    });
    expect(result.success).toBe(true);
    expect(version.updatedAt.equals(startedAt)).toBe(true);
  });

  it('preserves the rest of the aggregate on retry', () => {
    const version = restoreValidDraftFailed();
    const before = version.toSnapshot();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureSecondAttemptId,
      startedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(true);
    const after = version.toSnapshot();
    expect(after.playbookVersionId).toBe(before.playbookVersionId);
    expect(after.workspaceId).toBe(before.workspaceId);
    expect(after.playbookId).toBe(before.playbookId);
    expect(after.synchronizationSnapshotId).toBe(before.synchronizationSnapshotId);
    expect(after.versionSequence).toBe(before.versionSequence);
    expect(after.status).toBe('draft');
    expect(after.parserVersion).toBe(before.parserVersion);
    expect(after.normalizationSchemaVersion).toBe(before.normalizationSchemaVersion);
    expect(after.sourceContentChecksum).toEqual(before.sourceContentChecksum);
    expect(after.validationSummary).toBeNull();
    expect(after.validationStartedAt).toBeNull();
    expect(after.validatedAt).toBeNull();
    expect(after.publishedAt).toBeNull();
    expect(after.archivedAt).toBeNull();
  });

  it('rejects reusing the same attempt identifier', () => {
    const version = restoreValidDraftFailed();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_NORMALIZATION_ATTEMPT_INVALID');
    }
  });

  it('preserves snapshot when attempt is reused', () => {
    const version = restoreValidDraftFailed();
    const before = version.toSnapshot();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    expect(version.toSnapshot()).toEqual(before);
  });

  // ------ Invalid states ------

  it('rejects when already running', () => {
    const version = createDraft();
    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(r1.success).toBe(true);

    const before = version.toSnapshot();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureSecondAttemptId,
      startedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_NORMALIZATION_ALREADY_RUNNING');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects when completed', () => {
    const version = restoreValidDraftCompleted();
    const before = version.toSnapshot();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureSecondAttemptId,
      startedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_OPERATION_NOT_ALLOWED');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects when status is validating', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureSecondAttemptId,
      startedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects when status is validated', () => {
    const version = restoreValidValidated();
    const before = version.toSnapshot();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureSecondAttemptId,
      startedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects when status is invalid', () => {
    const version = restoreValidInvalid();
    const before = version.toSnapshot();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureSecondAttemptId,
      startedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects when status is published', () => {
    const version = restoreValidPublished();
    const before = version.toSnapshot();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureSecondAttemptId,
      startedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects when status is archived', () => {
    const version = restoreValidArchivedFromPublished();
    const before = version.toSnapshot();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureSecondAttemptId,
      startedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    expect(version.toSnapshot()).toEqual(before);
  });

  // ------ Timestamp ------

  it('rejects startedAt before updatedAt', () => {
    const version = createDraft();
    const before = version.toSnapshot();
    const result = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: instant('2026-07-12T09:00:00Z'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_STATE_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Normalization — completeNormalization
// ---------------------------------------------------------------------------

describe('PlaybookVersion completeNormalization', () => {
  it('transitions running to completed', () => {
    const version = createDraft();
    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(r1.success).toBe(true);

    const completedAt = instant('2026-07-12T11:00:00Z');
    const result = version.completeNormalization({ completedAt });
    expect(result.success).toBe(true);
    expect(version.normalizationStatus).toBe('completed');
  });

  it('preserves normalizationAttemptId', () => {
    const version = createDraft();
    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(r1.success).toBe(true);

    const result = version.completeNormalization({
      completedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(true);
    expect(version.normalizationAttemptId).toBe(fixtureNormalizationAttemptId);
  });

  it('updates updatedAt', () => {
    const version = createDraft();
    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(r1.success).toBe(true);

    const completedAt = instant('2026-07-12T11:00:00Z');
    const result = version.completeNormalization({ completedAt });
    expect(result.success).toBe(true);
    expect(version.updatedAt.equals(completedAt)).toBe(true);
  });

  it('preserves status as draft', () => {
    const version = createDraft();
    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(r1.success).toBe(true);

    const result = version.completeNormalization({
      completedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(true);
    expect(version.status).toBe('draft');
  });

  it('accepts timestamp equal to updatedAt', () => {
    const version = createDraft();
    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(r1.success).toBe(true);

    const result = version.completeNormalization({ completedAt: defaultNow });
    expect(result.success).toBe(true);
  });

  it('rejects when pending', () => {
    const version = createDraft();
    const before = version.toSnapshot();
    const result = version.completeNormalization({
      completedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_NORMALIZATION_NOT_RUNNING');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects when failed', () => {
    const version = restoreValidDraftFailed();
    const before = version.toSnapshot();
    const result = version.completeNormalization({
      completedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_NORMALIZATION_NOT_RUNNING');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects when completed', () => {
    const version = restoreValidDraftCompleted();
    const before = version.toSnapshot();
    const result = version.completeNormalization({
      completedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_NORMALIZATION_NOT_RUNNING');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects when status is not draft', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const result = version.completeNormalization({
      completedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects timestamp before updatedAt', () => {
    const version = createDraft();
    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(r1.success).toBe(true);

    const before = version.toSnapshot();
    const result = version.completeNormalization({
      completedAt: instant('2026-07-12T10:00:00Z'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_STATE_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('does not create validationSummary', () => {
    const version = createDraft();
    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(r1.success).toBe(true);

    const result = version.completeNormalization({
      completedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(true);
    expect(version.validationSummary).toBeNull();
  });

  it('does not change validationStartedAt', () => {
    const version = createDraft();
    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(r1.success).toBe(true);

    const result = version.completeNormalization({
      completedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(true);
    expect(version.validationStartedAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Normalization — failNormalization
// ---------------------------------------------------------------------------

describe('PlaybookVersion failNormalization', () => {
  it('transitions running to failed', () => {
    const version = createDraft();
    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(r1.success).toBe(true);

    const failedAt = instant('2026-07-12T11:00:00Z');
    const result = version.failNormalization({ failedAt });
    expect(result.success).toBe(true);
    expect(version.normalizationStatus).toBe('failed');
  });

  it('preserves the failed attempt identifier', () => {
    const version = createDraft();
    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(r1.success).toBe(true);

    const result = version.failNormalization({
      failedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(true);
    expect(version.normalizationAttemptId).toBe(fixtureNormalizationAttemptId);
  });

  it('updates updatedAt', () => {
    const version = createDraft();
    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(r1.success).toBe(true);

    const failedAt = instant('2026-07-12T11:00:00Z');
    const result = version.failNormalization({ failedAt });
    expect(result.success).toBe(true);
    expect(version.updatedAt.equals(failedAt)).toBe(true);
  });

  it('preserves status as draft', () => {
    const version = createDraft();
    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(r1.success).toBe(true);

    const result = version.failNormalization({
      failedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(true);
    expect(version.status).toBe('draft');
  });

  it('accepts timestamp equal to updatedAt', () => {
    const version = createDraft();
    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(r1.success).toBe(true);

    const result = version.failNormalization({ failedAt: defaultNow });
    expect(result.success).toBe(true);
  });

  it('rejects when pending', () => {
    const version = createDraft();
    const before = version.toSnapshot();
    const result = version.failNormalization({
      failedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_NORMALIZATION_NOT_RUNNING');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects when failed', () => {
    const version = restoreValidDraftFailed();
    const before = version.toSnapshot();
    const result = version.failNormalization({
      failedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_NORMALIZATION_NOT_RUNNING');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects when completed', () => {
    const version = restoreValidDraftCompleted();
    const before = version.toSnapshot();
    const result = version.failNormalization({
      failedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_NORMALIZATION_NOT_RUNNING');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects when status is not draft', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const result = version.failNormalization({
      failedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(false);
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects timestamp before updatedAt', () => {
    const version = createDraft();
    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(r1.success).toBe(true);

    const before = version.toSnapshot();
    const result = version.failNormalization({
      failedAt: instant('2026-07-12T10:00:00Z'),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_STATE_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('does not automatically create a new attempt', () => {
    const version = createDraft();
    const r1 = version.beginNormalization({
      normalizationAttemptId: fixtureNormalizationAttemptId,
      startedAt: defaultNow,
    });
    expect(r1.success).toBe(true);

    const result = version.failNormalization({
      failedAt: instant('2026-07-12T11:00:00Z'),
    });
    expect(result.success).toBe(true);
    expect(version.normalizationAttemptId).toBe(fixtureNormalizationAttemptId);
    expect(version.normalizationStatus).toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// Normalization — Full sequence
// ---------------------------------------------------------------------------

describe('PlaybookVersion normalization full sequence', () => {
  it('create → begin(attemptA) → fail → begin(attemptB) → complete', () => {
    const createdAt = instant('2026-07-12T09:00:00Z');
    const attemptA = parsedNormalizationAttemptId('aaaaaaaa-1111-2222-3333-444444444444');
    const attemptB = parsedNormalizationAttemptId('bbbbbbbb-1111-2222-3333-444444444444');

    const t1 = instant('2026-07-12T10:00:00Z');
    const t2 = instant('2026-07-12T11:00:00Z');
    const t3 = instant('2026-07-12T12:00:00Z');
    const t4 = instant('2026-07-12T13:00:00Z');

    const version = createDraft({ createdAt });

    expect(version.status).toBe('draft');
    expect(version.normalizationStatus).toBe('pending');
    expect(version.normalizationAttemptId).toBeNull();

    const r1 = version.beginNormalization({
      normalizationAttemptId: attemptA,
      startedAt: t1,
    });
    expect(r1.success).toBe(true);
    expect(version.normalizationStatus).toBe('running');
    expect(version.normalizationAttemptId).toBe(attemptA);
    expect(version.updatedAt.equals(t1)).toBe(true);

    const r2 = version.failNormalization({ failedAt: t2 });
    expect(r2.success).toBe(true);
    expect(version.normalizationStatus).toBe('failed');
    expect(version.normalizationAttemptId).toBe(attemptA);
    expect(version.updatedAt.equals(t2)).toBe(true);

    const r3 = version.beginNormalization({
      normalizationAttemptId: attemptB,
      startedAt: t3,
    });
    expect(r3.success).toBe(true);
    expect(version.normalizationStatus).toBe('running');
    expect(version.normalizationAttemptId).toBe(attemptB);
    expect(version.updatedAt.equals(t3)).toBe(true);

    const r4 = version.completeNormalization({ completedAt: t4 });
    expect(r4.success).toBe(true);

    expect(version.status).toBe('draft');
    expect(version.normalizationStatus).toBe('completed');
    expect(version.normalizationAttemptId).toBe(attemptB);
    expect(version.updatedAt.equals(t4)).toBe(true);
    expect(version.validationSummary).toBeNull();
    expect(version.validationStartedAt).toBeNull();
  });
});
