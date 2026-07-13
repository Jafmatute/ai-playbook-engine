import { describe, expect, it } from 'vitest';

import { PlaybookVersion } from '../index.js';
import {
  instant,
  versionSequence,
  versionLabel,
  parserVersion,
  normalizationSchemaVersion,
  contentChecksum,
  validationSummary,
  createDraft,
  restoreValidValidating,
  restoreValidValidated,
  restoreValidInvalid,
  restoreValidPublished,
  restoreValidArchivedFromValidated,
  restoreValidArchivedFromPublished,
  fixtureNormalizationAttemptId,
} from './playbook-version.test-fixtures.js';

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

describe('PlaybookVersion publish', () => {
  function createValidatedVersion(): PlaybookVersion {
    const version = restoreValidValidated();
    return version;
  }

  it('transitions validated to published', () => {
    const version = createValidatedVersion();
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const result = version.publish({ publishedAt });
    expect(result.success).toBe(true);
    expect(version.status).toBe('published');
  });

  it('sets publishedAt', () => {
    const version = createValidatedVersion();
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const result = version.publish({ publishedAt });
    expect(result.success).toBe(true);
    expect(version.publishedAt?.equals(publishedAt)).toBe(true);
  });

  it('updates updatedAt to publishedAt', () => {
    const version = createValidatedVersion();
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const result = version.publish({ publishedAt });
    expect(result.success).toBe(true);
    expect(version.updatedAt.equals(publishedAt)).toBe(true);
  });

  it('preserves validatedAt', () => {
    const version = createValidatedVersion();
    const validatedAt = version.validatedAt;
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const result = version.publish({ publishedAt });
    expect(result.success).toBe(true);
    expect(version.validatedAt?.equals(validatedAt!)).toBe(true);
  });

  it('preserves validationSummary', () => {
    const version = createValidatedVersion();
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const result = version.publish({ publishedAt });
    expect(result.success).toBe(true);
    expect(version.validationSummary).not.toBeNull();
    expect(version.validationSummary?.publicationEligible).toBe(true);
  });

  it('preserves normalizationStatus as completed', () => {
    const version = createValidatedVersion();
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const result = version.publish({ publishedAt });
    expect(result.success).toBe(true);
    expect(version.normalizationStatus).toBe('completed');
  });

  it('preserves normalizationAttemptId', () => {
    const version = createValidatedVersion();
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const result = version.publish({ publishedAt });
    expect(result.success).toBe(true);
    expect(version.normalizationAttemptId).not.toBeNull();
  });

  it('does not set archivedAt', () => {
    const version = createValidatedVersion();
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const result = version.publish({ publishedAt });
    expect(result.success).toBe(true);
    expect(version.archivedAt).toBeNull();
  });

  it('accepts publishedAt equal to updatedAt', () => {
    const version = createValidatedVersion();
    const publishedAt = version.updatedAt;
    const result = version.publish({ publishedAt });
    expect(result.success).toBe(true);
    expect(version.publishedAt?.equals(publishedAt)).toBe(true);
  });

  it('preserves all metadata and identifiers', () => {
    const version = createValidatedVersion();
    const before = version.toSnapshot();
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const result = version.publish({ publishedAt });
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
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.validationSummary).not.toBeNull();
    expect(after.validationStartedAt).not.toBeNull();
    expect(after.validatedAt).not.toBeNull();
    expect(after.archivedAt).toBeNull();
  });

  // ------ Not publishable states ------

  it('rejects publish when status is draft', () => {
    const version = createDraft();
    const before = version.toSnapshot();
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const result = version.publish({ publishedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_NOT_PUBLISHABLE');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects publish when status is validating', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const result = version.publish({ publishedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_NOT_PUBLISHABLE');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects publish when status is invalid', () => {
    const version = restoreValidInvalid();
    const before = version.toSnapshot();
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const result = version.publish({ publishedAt });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_NOT_PUBLISHABLE',
        details: { reason: 'version_invalid' },
      },
    });
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects publish when status is archived', () => {
    const version = restoreValidArchivedFromValidated();
    const before = version.toSnapshot();
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const result = version.publish({ publishedAt });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_NOT_PUBLISHABLE',
        details: { reason: 'version_archived' },
      },
    });
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects publish when already published', () => {
    const version = restoreValidPublished();
    const before = version.toSnapshot();
    const publishedAt = instant('2026-07-12T14:00:00Z');
    const result = version.publish({ publishedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_ALREADY_PUBLISHED');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  // ------ Summary inconsistency (defense-in-depth) ------
  // These code paths guard against corruption that cannot be
  // constructed through public APIs, since both markValidated
  // and restore already validate summary integrity. The checks
  // in publish would catch a corruption bug should one occur.

  // ------ Timestamp ------

  it('rejects publishedAt before validatedAt', () => {
    const version = createValidatedVersion();
    const before = version.toSnapshot();
    const publishedAt = instant('2026-07-12T11:00:00Z');
    const result = version.publish({ publishedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_STATE_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects publishedAt before updatedAt', () => {
    const version = createValidatedVersion();
    const before = version.toSnapshot();
    const publishedAt = instant('2026-07-12T10:30:00Z');
    const result = version.publish({ publishedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_STATE_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('failure preserves the complete snapshot', () => {
    const version = createValidatedVersion();
    const before = version.toSnapshot();
    const publishedAt = instant('2026-07-12T11:00:00Z');
    const result = version.publish({ publishedAt });
    expect(result.success).toBe(false);
    expect(version.toSnapshot()).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Archive from validated
// ---------------------------------------------------------------------------

describe('PlaybookVersion archive from validated', () => {
  it('transitions validated to archived', () => {
    const version = restoreValidValidated();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(true);
    expect(version.status).toBe('archived');
  });

  it('sets archivedAt', () => {
    const version = restoreValidValidated();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(true);
    expect(version.archivedAt?.equals(archivedAt)).toBe(true);
  });

  it('updates updatedAt to archivedAt', () => {
    const version = restoreValidValidated();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(true);
    expect(version.updatedAt.equals(archivedAt)).toBe(true);
  });

  it('preserves eligible validationSummary', () => {
    const version = restoreValidValidated();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(true);
    expect(version.validationSummary).not.toBeNull();
    expect(version.validationSummary?.publicationEligible).toBe(true);
  });

  it('preserves validatedAt', () => {
    const version = restoreValidValidated();
    const validatedAt = version.validatedAt;
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(true);
    expect(version.validatedAt?.equals(validatedAt!)).toBe(true);
  });

  it('maintains publishedAt as null', () => {
    const version = restoreValidValidated();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(true);
    expect(version.publishedAt).toBeNull();
  });

  it('preserves normalization and metadata', () => {
    const version = restoreValidValidated();
    const before = version.toSnapshot();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(true);
    const after = version.toSnapshot();
    expect(after.playbookVersionId).toBe(before.playbookVersionId);
    expect(after.normalizationStatus).toBe('completed');
    expect(after.normalizationAttemptId).not.toBeNull();
    expect(after.sourceContentChecksum).toEqual(before.sourceContentChecksum);
  });

  it('rejects archivedAt before validatedAt', () => {
    const version = restoreValidValidated();
    const before = version.toSnapshot();
    const archivedAt = instant('2026-07-12T11:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_STATE_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects archivedAt before updatedAt', () => {
    const version = restoreValidValidated();
    const before = version.toSnapshot();
    const archivedAt = instant('2026-07-12T10:30:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_STATE_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('failure preserves the complete snapshot', () => {
    const version = restoreValidValidated();
    const before = version.toSnapshot();
    const archivedAt = instant('2026-07-12T11:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(false);
    expect(version.toSnapshot()).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Archive from invalid
// ---------------------------------------------------------------------------

describe('PlaybookVersion archive from invalid', () => {
  it('transitions invalid to archived', () => {
    const version = restoreValidInvalid();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(true);
    expect(version.status).toBe('archived');
  });

  it('preserves ineligible validationSummary with blocking findings', () => {
    const version = restoreValidInvalid();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(true);
    expect(version.validationSummary).not.toBeNull();
    expect(version.validationSummary?.publicationEligible).toBe(false);
    expect(version.validationSummary?.blockingFindingCount).toBe(3);
  });

  it('maintains publishedAt as null', () => {
    const version = restoreValidInvalid();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(true);
    expect(version.publishedAt).toBeNull();
  });

  it('sets archivedAt and updates updatedAt', () => {
    const version = restoreValidInvalid();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(true);
    expect(version.archivedAt?.equals(archivedAt)).toBe(true);
    expect(version.updatedAt.equals(archivedAt)).toBe(true);
  });

  it('rejects archivedAt before validatedAt', () => {
    const version = restoreValidInvalid();
    const before = version.toSnapshot();
    const archivedAt = instant('2026-07-12T11:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_STATE_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('failure preserves the complete snapshot', () => {
    const version = restoreValidInvalid();
    const before = version.toSnapshot();
    const archivedAt = instant('2026-07-12T11:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(false);
    expect(version.toSnapshot()).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Archive from published
// ---------------------------------------------------------------------------

describe('PlaybookVersion archive from published', () => {
  it('transitions published to archived', () => {
    const version = restoreValidPublished();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(true);
    expect(version.status).toBe('archived');
  });

  it('preserves publishedAt', () => {
    const version = restoreValidPublished();
    const publishedAt = version.publishedAt;
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(true);
    expect(version.publishedAt).not.toBeNull();
    expect(version.publishedAt?.equals(publishedAt!)).toBe(true);
  });

  it('sets archivedAt and updates updatedAt', () => {
    const version = restoreValidPublished();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(true);
    expect(version.archivedAt?.equals(archivedAt)).toBe(true);
    expect(version.updatedAt.equals(archivedAt)).toBe(true);
  });

  it('preserves eligible validationSummary', () => {
    const version = restoreValidPublished();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(true);
    expect(version.validationSummary).not.toBeNull();
    expect(version.validationSummary?.publicationEligible).toBe(true);
  });

  it('rejects archivedAt before publishedAt', () => {
    const version = restoreValidPublished();
    const before = version.toSnapshot();
    const archivedAt = instant('2026-07-12T12:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_STATE_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects archivedAt before updatedAt', () => {
    const version = restoreValidPublished();
    const before = version.toSnapshot();
    const archivedAt = instant('2026-07-12T10:30:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_STATE_INVALID');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('failure preserves the complete snapshot', () => {
    const version = restoreValidPublished();
    const before = version.toSnapshot();
    const archivedAt = instant('2026-07-12T10:30:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(false);
    expect(version.toSnapshot()).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Archive — not archivable states
// ---------------------------------------------------------------------------

describe('PlaybookVersion archive — not archivable states', () => {
  it('rejects archive when status is draft', () => {
    const version = createDraft();
    const before = version.toSnapshot();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_OPERATION_NOT_ALLOWED',
        details: { reason: 'version_not_finalized' },
      },
    });
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects archive when status is validating', () => {
    const version = restoreValidValidating();
    const before = version.toSnapshot();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_OPERATION_NOT_ALLOWED',
        details: { reason: 'version_not_finalized' },
      },
    });
    expect(version.toSnapshot()).toEqual(before);
  });

  it('rejects archive when already archived', () => {
    const version = restoreValidArchivedFromPublished();
    const before = version.toSnapshot();
    const archivedAt = instant('2026-07-12T15:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_VERSION_ALREADY_ARCHIVED');
    }
    expect(version.toSnapshot()).toEqual(before);
  });

  it('archive failure preserves snapshot for draft', () => {
    const version = createDraft();
    const before = version.toSnapshot();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(false);
    expect(version.toSnapshot()).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Publish and archive — full flows
// ---------------------------------------------------------------------------

describe('PlaybookVersion publish and archive full flows', () => {
  function buildValidatedVersion(): PlaybookVersion {
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
      blockingFindingCount: 0,
    });
    const r4 = version.markValidated({ validationSummary: summary, validatedAt });
    expect(r4.success).toBe(true);
    expect(version.status).toBe('validated');

    return version;
  }

  it('create → normalize → validate → publish', () => {
    const version = buildValidatedVersion();
    const publishedAt = instant('2026-07-12T13:00:00Z');

    const result = version.publish({ publishedAt });
    expect(result.success).toBe(true);

    expect(version.status).toBe('published');
    expect(version.publishedAt?.equals(publishedAt)).toBe(true);
    expect(version.archivedAt).toBeNull();
    expect(version.validationSummary).not.toBeNull();
    expect(version.validationSummary?.publicationEligible).toBe(true);
    expect(version.normalizationStatus).toBe('completed');
  });

  it('create → normalize → validate → publish → archive', () => {
    const version = buildValidatedVersion();

    const publishedAt = instant('2026-07-12T13:00:00Z');
    const r1 = version.publish({ publishedAt });
    expect(r1.success).toBe(true);
    expect(version.status).toBe('published');
    const preservedPublishedAt = version.publishedAt;

    const archivedAt = instant('2026-07-12T14:00:00Z');
    const r2 = version.archive({ archivedAt });
    expect(r2.success).toBe(true);

    expect(version.status).toBe('archived');
    expect(version.publishedAt?.equals(preservedPublishedAt!)).toBe(true);
    expect(version.archivedAt?.equals(archivedAt)).toBe(true);
    expect(version.validationSummary).not.toBeNull();
  });

  it('create → normalize → validate → markInvalid → archive', () => {
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

    const archivedAt = instant('2026-07-12T14:00:00Z');
    const r5 = version.archive({ archivedAt });
    expect(r5.success).toBe(true);

    expect(version.status).toBe('archived');
    expect(version.publishedAt).toBeNull();
    expect(version.archivedAt?.equals(archivedAt)).toBe(true);
    expect(version.validationSummary?.publicationEligible).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Publish — snapshot equivalence
// ---------------------------------------------------------------------------

describe('PlaybookVersion publish snapshot equivalence', () => {
  it('published version → snapshot → restore → equivalent snapshot', () => {
    const version = restoreValidValidated();
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const result = version.publish({ publishedAt });
    expect(result.success).toBe(true);

    const snapshot = version.toSnapshot();

    const restoredSummary = validationSummary({
      completedAt: instant(snapshot.validatedAt!),
      validatedContentChecksum: contentChecksum(snapshot.sourceContentChecksum.value),
    });
    const restored = PlaybookVersion.restore({
      playbookVersionId: snapshot.playbookVersionId,
      workspaceId: snapshot.workspaceId,
      playbookId: snapshot.playbookId,
      synchronizationSnapshotId: snapshot.synchronizationSnapshotId,
      versionSequence: versionSequence(snapshot.versionSequence),
      versionLabel: snapshot.versionLabel !== null ? versionLabel(snapshot.versionLabel) : null,
      status: snapshot.status,
      normalizationStatus: snapshot.normalizationStatus,
      parserVersion: parserVersion(snapshot.parserVersion),
      normalizationSchemaVersion: normalizationSchemaVersion(snapshot.normalizationSchemaVersion),
      sourceContentChecksum: contentChecksum(snapshot.sourceContentChecksum.value),
      normalizationAttemptId: snapshot.normalizationAttemptId,
      validationSummary: restoredSummary,
      createdAt: instant(snapshot.createdAt),
      updatedAt: instant(snapshot.updatedAt),
      validationStartedAt:
        snapshot.validationStartedAt !== null ? instant(snapshot.validationStartedAt) : null,
      validatedAt: snapshot.validatedAt !== null ? instant(snapshot.validatedAt) : null,
      publishedAt: snapshot.publishedAt !== null ? instant(snapshot.publishedAt) : null,
      archivedAt: null,
    });
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.value.toSnapshot()).toEqual(snapshot);
    }
  });
});

describe('PlaybookVersion archive snapshot equivalence', () => {
  it('archived from published version → snapshot → restore → equivalent snapshot', () => {
    const version = restoreValidPublished();
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = version.archive({ archivedAt });
    expect(result.success).toBe(true);

    const snapshot = version.toSnapshot();

    const restoredSummary = validationSummary({
      completedAt: instant(snapshot.validatedAt!),
      validatedContentChecksum: contentChecksum(snapshot.sourceContentChecksum.value),
    });
    const restored = PlaybookVersion.restore({
      playbookVersionId: snapshot.playbookVersionId,
      workspaceId: snapshot.workspaceId,
      playbookId: snapshot.playbookId,
      synchronizationSnapshotId: snapshot.synchronizationSnapshotId,
      versionSequence: versionSequence(snapshot.versionSequence),
      versionLabel: snapshot.versionLabel !== null ? versionLabel(snapshot.versionLabel) : null,
      status: snapshot.status,
      normalizationStatus: snapshot.normalizationStatus,
      parserVersion: parserVersion(snapshot.parserVersion),
      normalizationSchemaVersion: normalizationSchemaVersion(snapshot.normalizationSchemaVersion),
      sourceContentChecksum: contentChecksum(snapshot.sourceContentChecksum.value),
      normalizationAttemptId: snapshot.normalizationAttemptId,
      validationSummary: restoredSummary,
      createdAt: instant(snapshot.createdAt),
      updatedAt: instant(snapshot.updatedAt),
      validationStartedAt:
        snapshot.validationStartedAt !== null ? instant(snapshot.validationStartedAt) : null,
      validatedAt: snapshot.validatedAt !== null ? instant(snapshot.validatedAt) : null,
      publishedAt: snapshot.publishedAt !== null ? instant(snapshot.publishedAt) : null,
      archivedAt: snapshot.archivedAt !== null ? instant(snapshot.archivedAt) : null,
    });
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.value.toSnapshot()).toEqual(snapshot);
    }
  });
});
