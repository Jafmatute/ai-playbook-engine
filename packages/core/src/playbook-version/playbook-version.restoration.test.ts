import { describe, expect, it } from 'vitest';
import { type NormalizationStatus, type PlaybookVersionStatus, PlaybookVersion } from '../index.js';
import {
  contentChecksum,
  defaultNow,
  fixtureNormalizationAttemptId,
  fixturePlaybookId,
  fixturePlaybookVersionId,
  fixtureSnapshotId,
  fixtureWorkspaceId,
  instant,
  normalizationSchemaVersion,
  parserVersion,
  restoreValidArchivedFromInvalid,
  restoreValidArchivedFromPublished,
  restoreValidArchivedFromValidated,
  restoreValidDraftCompleted,
  restoreValidDraftFailed,
  restoreValidDraftPending,
  restoreValidDraftRunning,
  restoreValidInvalid,
  restoreValidPublished,
  restoreValidValidated,
  restoreValidValidating,
  validationSummary,
  versionSequence,
} from './playbook-version.test-fixtures.js';

// ---------------------------------------------------------------------------
// Restoration — Draft
// ---------------------------------------------------------------------------

describe('PlaybookVersion restoration — draft', () => {
  it('restores valid draft with pending normalization and no attempt', () => {
    expect(restoreValidDraftPending().status).toBe('draft');
  });

  it('restores valid draft with running normalization and attempt', () => {
    expect(restoreValidDraftRunning().status).toBe('draft');
  });

  it('restores valid draft with completed normalization and attempt', () => {
    expect(restoreValidDraftCompleted().status).toBe('draft');
  });

  it('restores valid draft with failed normalization and attempt', () => {
    expect(restoreValidDraftFailed().status).toBe('draft');
  });

  it('rejects draft pending with normalizationAttemptId', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'draft',
      normalizationStatus: 'pending',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: null,
      validatedAt: null,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects draft running without normalizationAttemptId', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'draft',
      normalizationStatus: 'running',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: null,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: null,
      validatedAt: null,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects draft with validationSummary', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'draft',
      normalizationStatus: 'pending',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: null,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: null,
      validatedAt: null,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects draft with validationStartedAt', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'draft',
      normalizationStatus: 'pending',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: null,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt: null,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects draft with validatedAt', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'draft',
      normalizationStatus: 'pending',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: null,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: null,
      validatedAt: instant('2026-07-12T12:00:00Z'),
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects draft with publishedAt', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'draft',
      normalizationStatus: 'pending',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: null,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: null,
      validatedAt: null,
      publishedAt: instant('2026-07-12T13:00:00Z'),
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects draft with archivedAt', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'draft',
      normalizationStatus: 'pending',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: null,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: null,
      validatedAt: null,
      publishedAt: null,
      archivedAt: instant('2026-07-12T14:00:00Z'),
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });
});

// ---------------------------------------------------------------------------
// Restoration — Validating
// ---------------------------------------------------------------------------

describe('PlaybookVersion restoration — validating', () => {
  it('restores valid validating state', () => {
    expect(restoreValidValidating().status).toBe('validating');
  });

  it('rejects validating with normalization not completed', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'validating',
      normalizationStatus: 'running',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt: null,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects validating without normalizationAttemptId', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'validating',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: null,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt: null,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects validating without validationStartedAt', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'validating',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: null,
      validatedAt: null,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects validating with validationSummary present', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'validating',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt: null,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects validating with validatedAt present', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'validating',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt: instant('2026-07-12T12:00:00Z'),
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects validating with publishedAt', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'validating',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt: null,
      publishedAt: instant('2026-07-12T13:00:00Z'),
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects validating with archivedAt', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'validating',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt: null,
      publishedAt: null,
      archivedAt: instant('2026-07-12T14:00:00Z'),
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });
});

// ---------------------------------------------------------------------------
// Restoration — Validated
// ---------------------------------------------------------------------------

describe('PlaybookVersion restoration — validated', () => {
  it('restores valid validated state with eligible summary', () => {
    expect(restoreValidValidated().status).toBe('validated');
  });

  it('rejects validated without validationSummary', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'validated',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: instant('2026-07-12T12:00:00Z'),
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt: instant('2026-07-12T12:00:00Z'),
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects validated with non-eligible summary', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 1,
      publicationEligible: false,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'validated',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: validatedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects validated with blocking count greater than zero', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 1,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'validated',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: validatedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects validated with checksum mismatch', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const differentChecksum = contentChecksum(
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: differentChecksum,
      blockingFindingCount: 0,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'validated',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: validatedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects validated with completedAt different from validatedAt', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: instant('2026-07-12T12:30:00Z'),
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'validated',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: validatedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects validated with publishedAt', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'validated',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: validatedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: instant('2026-07-12T13:00:00Z'),
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects validated with archivedAt', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'validated',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: validatedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt: instant('2026-07-12T14:00:00Z'),
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });
});

// ---------------------------------------------------------------------------
// Restoration — Invalid
// ---------------------------------------------------------------------------

describe('PlaybookVersion restoration — invalid', () => {
  it('restores valid invalid state with blocking findings', () => {
    expect(restoreValidInvalid().status).toBe('invalid');
  });

  it('rejects invalid with eligible summary', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'invalid',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: validatedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects invalid with zero blocking count', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'invalid',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: validatedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects invalid with checksum mismatch', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const differentChecksum = contentChecksum(
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: differentChecksum,
      blockingFindingCount: 3,
      publicationEligible: false,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'invalid',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: validatedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects invalid with completedAt different from validatedAt', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: instant('2026-07-12T12:30:00Z'),
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 3,
      publicationEligible: false,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'invalid',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: validatedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });
});

// ---------------------------------------------------------------------------
// Restoration — Published
// ---------------------------------------------------------------------------

describe('PlaybookVersion restoration — published', () => {
  it('restores valid published state', () => {
    expect(restoreValidPublished().status).toBe('published');
  });

  it('rejects published with non-eligible summary', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 1,
      publicationEligible: false,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'published',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: publishedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects published without publishedAt', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'published',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: validatedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects published with publishedAt before validatedAt', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const publishedAt = instant('2026-07-12T11:30:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'published',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: publishedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects published with archivedAt', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'published',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: publishedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt,
      archivedAt: instant('2026-07-12T14:00:00Z'),
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects published with checksum mismatch', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const differentChecksum = contentChecksum(
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: differentChecksum,
      blockingFindingCount: 0,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'published',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: publishedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_STATE_INVALID',
        details: { reason: 'validation_checksum_mismatch' },
      },
    });
  });

  it('rejects published with completedAt different from validatedAt', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const summary = validationSummary({
      completedAt: instant('2026-07-12T12:30:00Z'),
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'published',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: publishedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_STATE_INVALID',
        details: { reason: 'validation_completion_mismatch' },
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Restoration — Archived
// ---------------------------------------------------------------------------

describe('PlaybookVersion restoration — archived', () => {
  it('restores archived from published', () => {
    expect(restoreValidArchivedFromPublished().status).toBe('archived');
  });

  it('restores archived from validated', () => {
    expect(restoreValidArchivedFromValidated().status).toBe('archived');
  });

  it('restores archived from invalid', () => {
    expect(restoreValidArchivedFromInvalid().status).toBe('archived');
  });

  it('rejects archived without archivedAt', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'archived',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: publishedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects archived with incomplete normalization', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'archived',
      normalizationStatus: 'pending',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: null,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: archivedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects archived without validationSummary', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'archived',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: archivedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt,
      archivedAt,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects archived with impossible historical combination (published but not eligible)', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      ),
      blockingFindingCount: 3,
      publicationEligible: false,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'archived',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: archivedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt,
      archivedAt,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects archivedAt before createdAt', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const archivedAt = instant('2026-07-12T09:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'archived',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: archivedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt,
      archivedAt,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects updatedAt before archivedAt', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'archived',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: publishedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt,
      archivedAt,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects archived from validated with checksum mismatch', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const differentChecksum = contentChecksum(
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: differentChecksum,
      blockingFindingCount: 0,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'archived',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: archivedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt,
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_STATE_INVALID',
        details: { reason: 'validation_checksum_mismatch' },
      },
    });
  });

  it('rejects archived from validated with completion mismatch', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const summary = validationSummary({
      completedAt: instant('2026-07-12T12:30:00Z'),
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'archived',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: archivedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt,
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_STATE_INVALID',
        details: { reason: 'validation_completion_mismatch' },
      },
    });
  });

  it('rejects archived from validated with archivedAt before validatedAt', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const archivedAt = instant('2026-07-12T11:30:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'archived',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: validatedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt,
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_STATE_INVALID',
        details: { reason: 'timestamp_order_invalid', field: 'archivedAt' },
      },
    });
  });

  it('rejects archived from invalid with checksum mismatch', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const differentChecksum = contentChecksum(
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: differentChecksum,
      blockingFindingCount: 3,
      publicationEligible: false,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'archived',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: archivedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt,
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_STATE_INVALID',
        details: { reason: 'validation_checksum_mismatch' },
      },
    });
  });

  it('rejects archived from invalid with completion mismatch', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const summary = validationSummary({
      completedAt: instant('2026-07-12T12:30:00Z'),
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 3,
      publicationEligible: false,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'archived',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: archivedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt,
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_STATE_INVALID',
        details: { reason: 'validation_completion_mismatch' },
      },
    });
  });

  it('rejects archived from invalid with archivedAt before validatedAt', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const archivedAt = instant('2026-07-12T11:30:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 3,
      publicationEligible: false,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'archived',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: validatedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: null,
      archivedAt,
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_STATE_INVALID',
        details: { reason: 'timestamp_order_invalid', field: 'archivedAt' },
      },
    });
  });

  it('rejects archived from published with checksum mismatch', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const differentChecksum = contentChecksum(
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: differentChecksum,
      blockingFindingCount: 0,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'archived',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: archivedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt,
      archivedAt,
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_STATE_INVALID',
        details: { reason: 'validation_checksum_mismatch' },
      },
    });
  });

  it('rejects archived from published with completion mismatch', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const archivedAt = instant('2026-07-12T14:00:00Z');
    const summary = validationSummary({
      completedAt: instant('2026-07-12T12:30:00Z'),
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'archived',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: archivedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt,
      archivedAt,
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_STATE_INVALID',
        details: { reason: 'validation_completion_mismatch' },
      },
    });
  });

  it('rejects archived from published with archivedAt before publishedAt', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const publishedAt = instant('2026-07-12T13:00:00Z');
    const archivedAt = instant('2026-07-12T12:30:00Z');
    const summary = validationSummary({
      completedAt: validatedAt,
      validatedContentChecksum: contentChecksum(),
      blockingFindingCount: 0,
    });
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'archived',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: summary,
      createdAt: defaultNow,
      updatedAt: publishedAt,
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt,
      archivedAt,
    });
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_VERSION_STATE_INVALID',
        details: { reason: 'timestamp_order_invalid', field: 'archivedAt' },
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Restoration — General timestamp invariants
// ---------------------------------------------------------------------------

describe('PlaybookVersion restoration — general timestamp invariants', () => {
  it('rejects updatedAt before createdAt', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'draft',
      normalizationStatus: 'pending',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: null,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: instant('2026-07-12T09:00:00Z'),
      validationStartedAt: null,
      validatedAt: null,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects validationStartedAt before createdAt', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'validating',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: instant('2026-07-12T09:00:00Z'),
      validatedAt: null,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects validatedAt before validationStartedAt', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'validating',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: instant('2026-07-12T12:00:00Z'),
      validatedAt: instant('2026-07-12T11:00:00Z'),
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects updatedAt before any existing timestamp for published state', () => {
    const validatedAt = instant('2026-07-12T12:00:00Z');
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'published',
      normalizationStatus: 'completed',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: fixtureNormalizationAttemptId,
      validationSummary: validationSummary({
        completedAt: validatedAt,
        validatedContentChecksum: contentChecksum(),
      }),
      createdAt: defaultNow,
      updatedAt: instant('2026-07-12T10:30:00Z'),
      validationStartedAt: instant('2026-07-12T11:00:00Z'),
      validatedAt,
      publishedAt: instant('2026-07-12T13:00:00Z'),
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });
});

// ---------------------------------------------------------------------------
// Restoration — Unknown status
// ---------------------------------------------------------------------------

describe('PlaybookVersion restoration — unknown status', () => {
  it('rejects unknown status without using unsafe casts', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'unknown_status' as PlaybookVersionStatus,
      normalizationStatus: 'pending',
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: null,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: null,
      validatedAt: null,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });

  it('rejects unknown normalization status', () => {
    const result = PlaybookVersion.restore({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      status: 'draft',
      normalizationStatus: 'unknown_norm' as NormalizationStatus,
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      normalizationAttemptId: null,
      validationSummary: null,
      createdAt: defaultNow,
      updatedAt: defaultNow,
      validationStartedAt: null,
      validatedAt: null,
      publishedAt: null,
      archivedAt: null,
    });
    expect(result).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_VERSION_STATE_INVALID' },
    });
  });
});
