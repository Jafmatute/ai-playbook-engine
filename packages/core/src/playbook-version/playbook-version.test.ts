import { describe, expect, it } from 'vitest';

import { parseValidationAttemptId } from '../identifiers.js';
import { Instant } from '../instant.js';
import {
  type ContentChecksum,
  type NormalizationSchemaVersion,
  type NormalizationStatus,
  type ParserVersion,
  type PlaybookVersionSnapshot,
  type PlaybookVersionStatus,
  PlaybookVersion,
  type ValidationSummary,
  ValidatorVersion,
  type VersionLabel,
  VersionSequence,
} from '../index.js';
import { parseNormalizationAttemptId } from '../identifiers.js';
import { parsePlaybookId } from '../identifiers.js';
import { parsePlaybookVersionId } from '../identifiers.js';
import { parseSynchronizationSnapshotId } from '../identifiers.js';
import { parseWorkspaceId } from '../identifiers.js';
import { ContentChecksum as ContentChecksumClass } from './content-checksum.js';
import { NormalizationSchemaVersion as NormalizationSchemaVersionClass } from './normalization-schema-version.js';
import { ParserVersion as ParserVersionClass } from './parser-version.js';
import { ValidationSummary as ValidationSummaryClass } from './validation-summary.js';
import { VersionLabel as VersionLabelClass } from './version-label.js';

const fixturePlaybookVersionId = parsedPlaybookVersionId('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
const fixtureWorkspaceId = parsedWorkspaceId('de305d54-75b4-431b-adb2-eb6b9e546014');
const fixturePlaybookId = parsedPlaybookId('11111111-2222-3333-4444-555555555555');
const fixtureSnapshotId = parsedSynchronizationSnapshotId('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
const fixtureNormalizationAttemptId = parsedNormalizationAttemptId(
  '22222222-3333-4444-5555-666666666666',
);

function parsedPlaybookVersionId(value: string) {
  const result = parsePlaybookVersionId(value);
  if (!result.success) throw new Error('Expected a valid playbook version identifier fixture.');
  return result.value;
}

function parsedWorkspaceId(value: string) {
  const result = parseWorkspaceId(value);
  if (!result.success) throw new Error('Expected a valid workspace identifier fixture.');
  return result.value;
}

function parsedPlaybookId(value: string) {
  const result = parsePlaybookId(value);
  if (!result.success) throw new Error('Expected a valid playbook identifier fixture.');
  return result.value;
}

function parsedSynchronizationSnapshotId(value: string) {
  const result = parseSynchronizationSnapshotId(value);
  if (!result.success)
    throw new Error('Expected a valid synchronization snapshot identifier fixture.');
  return result.value;
}

function parsedNormalizationAttemptId(value: string) {
  const result = parseNormalizationAttemptId(value);
  if (!result.success)
    throw new Error('Expected a valid normalization attempt identifier fixture.');
  return result.value;
}

function instant(value: string): Instant {
  const result = Instant.parse(value);
  if (!result.success) throw new Error('Expected a valid instant fixture.');
  return result.value;
}

function versionSequence(value = 1): VersionSequence {
  const result = VersionSequence.create(value);
  if (!result.success) throw new Error('Expected a valid version sequence fixture.');
  return result.value;
}

function versionLabel(value?: string): VersionLabel | null {
  if (value === undefined) return null;
  const result = VersionLabelClass.create(value);
  if (!result.success) throw new Error('Expected a valid version label fixture.');
  return result.value;
}

function parserVersion(value = 'notion-parser/v1'): ParserVersion {
  const result = ParserVersionClass.create(value);
  if (!result.success) throw new Error('Expected a valid parser version fixture.');
  return result.value;
}

function normalizationSchemaVersion(value = 'knowledge-schema/v1'): NormalizationSchemaVersion {
  const result = NormalizationSchemaVersionClass.create(value);
  if (!result.success) throw new Error('Expected a valid normalization schema version fixture.');
  return result.value;
}

function contentChecksum(
  value = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
): ContentChecksum {
  const result = ContentChecksumClass.create({ algorithm: 'sha256', value });
  if (!result.success) throw new Error('Expected a valid content checksum fixture.');
  return result.value;
}

function validationSummary(
  overrides?: Partial<{
    blockingFindingCount: number;
    publicationEligible: boolean;
    completedAt: Instant;
    validatedContentChecksum: ContentChecksum;
  }>,
): ValidationSummary {
  const validationAttemptId = parseValidationAttemptId('dddddddd-1111-2222-3333-444444444444');
  if (!validationAttemptId.success) throw new Error('Expected a valid validation attempt id.');

  const validator = ValidatorVersion.create('validator/v1');
  if (!validator.success) throw new Error('Expected a valid validator version.');

  const completedAt = overrides?.completedAt ?? instant('2026-07-12T12:00:00Z');
  const checksum = overrides?.validatedContentChecksum ?? contentChecksum();
  const blocking = overrides?.blockingFindingCount ?? 0;

  const result = ValidationSummaryClass.create({
    validationAttemptId: validationAttemptId.value,
    validatorVersion: validator.value,
    completedAt,
    validatedContentChecksum: checksum,
    errorCount: blocking,
    warningCount: 0,
    informationCount: 0,
    blockingFindingCount: blocking,
  });
  if (!result.success) throw new Error('Expected a valid validation summary fixture.');
  return result.value;
}

const defaultNow = instant('2026-07-12T10:00:00Z');

function createDraft(overrides?: {
  versionLabel?: VersionLabel | null;
  createdAt?: Instant;
}): PlaybookVersion {
  const result = PlaybookVersion.create({
    playbookVersionId: fixturePlaybookVersionId,
    workspaceId: fixtureWorkspaceId,
    playbookId: fixturePlaybookId,
    synchronizationSnapshotId: fixtureSnapshotId,
    versionSequence: versionSequence(),
    versionLabel: overrides?.versionLabel ?? null,
    parserVersion: parserVersion(),
    normalizationSchemaVersion: normalizationSchemaVersion(),
    sourceContentChecksum: contentChecksum(),
    createdAt: overrides?.createdAt ?? defaultNow,
  });
  if (!result.success) throw new Error('Expected a valid playbook version fixture.');
  return result.value;
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

describe('PlaybookVersion creation', () => {
  it('creates a version in draft status', () => {
    const result = createDraft();
    expect(result.status).toBe('draft');
  });

  it('starts normalization as pending', () => {
    const result = createDraft();
    expect(result.normalizationStatus).toBe('pending');
  });

  it('starts with null normalizationAttemptId', () => {
    const result = createDraft();
    expect(result.normalizationAttemptId).toBeNull();
  });

  it('starts with null validationSummary', () => {
    const result = createDraft();
    expect(result.validationSummary).toBeNull();
  });

  it('starts with all processing timestamps as null', () => {
    const result = createDraft();
    expect(result.validationStartedAt).toBeNull();
    expect(result.validatedAt).toBeNull();
    expect(result.publishedAt).toBeNull();
    expect(result.archivedAt).toBeNull();
  });

  it('sets updatedAt equal to createdAt', () => {
    const result = createDraft();
    expect(result.updatedAt.equals(result.createdAt)).toBe(true);
  });

  it('preserves workspaceId', () => {
    const result = createDraft();
    expect(result.workspaceId).toBe(fixtureWorkspaceId);
  });

  it('preserves playbookId', () => {
    const result = createDraft();
    expect(result.playbookId).toBe(fixturePlaybookId);
  });

  it('preserves synchronizationSnapshotId', () => {
    const result = createDraft();
    expect(result.synchronizationSnapshotId).toBe(fixtureSnapshotId);
  });

  it('preserves versionSequence', () => {
    const result = createDraft();
    expect(result.versionSequence.value).toBe(1);
  });

  it('preserves versionLabel', () => {
    const result = createDraft({ versionLabel: versionLabel('v1-label') });
    expect(result.versionLabel?.value).toBe('v1-label');
  });

  it('accepts null versionLabel', () => {
    const result = createDraft({ versionLabel: null });
    expect(result.versionLabel).toBeNull();
  });

  it('preserves parser version', () => {
    const result = createDraft();
    expect(result.parserVersion.value).toBe('notion-parser/v1');
  });

  it('preserves normalization schema version', () => {
    const result = createDraft();
    expect(result.normalizationSchemaVersion.value).toBe('knowledge-schema/v1');
  });

  it('preserves source content checksum', () => {
    const result = createDraft();
    expect(result.sourceContentChecksum.algorithm).toBe('sha256');
    expect(result.sourceContentChecksum.value).toBe(
      'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    );
  });

  it('does not generate IDs', () => {
    const result = PlaybookVersion.create({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      createdAt: defaultNow,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.id).toBe(fixturePlaybookVersionId);
    }
  });

  it('does not obtain current time', () => {
    const createdAt = instant('2026-07-12T10:00:00Z');
    const result = createDraft({ createdAt });
    expect(result.createdAt.toString()).toBe('2026-07-12T10:00:00.000Z');
  });

  it('does not produce events', () => {
    const result = createDraft();
    expect((result as unknown as { pullDomainEvents?: unknown }).pullDomainEvents).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Restoration helpers
// ---------------------------------------------------------------------------

function restoreValidDraftPending(): PlaybookVersion {
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
    archivedAt: null,
  });
  if (!result.success) throw new Error('Expected valid restoration.');
  return result.value;
}

function restoreValidDraftRunning(): PlaybookVersion {
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
    normalizationAttemptId: fixtureNormalizationAttemptId,
    validationSummary: null,
    createdAt: defaultNow,
    updatedAt: defaultNow,
    validationStartedAt: null,
    validatedAt: null,
    publishedAt: null,
    archivedAt: null,
  });
  if (!result.success) throw new Error('Expected valid restoration.');
  return result.value;
}

function restoreValidDraftCompleted(): PlaybookVersion {
  const result = PlaybookVersion.restore({
    playbookVersionId: fixturePlaybookVersionId,
    workspaceId: fixtureWorkspaceId,
    playbookId: fixturePlaybookId,
    synchronizationSnapshotId: fixtureSnapshotId,
    versionSequence: versionSequence(),
    versionLabel: null,
    status: 'draft',
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
  if (!result.success) throw new Error('Expected valid restoration.');
  return result.value;
}

function restoreValidDraftFailed(): PlaybookVersion {
  const result = PlaybookVersion.restore({
    playbookVersionId: fixturePlaybookVersionId,
    workspaceId: fixtureWorkspaceId,
    playbookId: fixturePlaybookId,
    synchronizationSnapshotId: fixtureSnapshotId,
    versionSequence: versionSequence(),
    versionLabel: null,
    status: 'draft',
    normalizationStatus: 'failed',
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
  if (!result.success) throw new Error('Expected valid restoration.');
  return result.value;
}

function restoreValidValidating(): PlaybookVersion {
  const validationStartedAt = instant('2026-07-12T11:00:00Z');
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
    updatedAt: validationStartedAt,
    validationStartedAt,
    validatedAt: null,
    publishedAt: null,
    archivedAt: null,
  });
  if (!result.success) throw new Error('Expected valid restoration.');
  return result.value;
}

function restoreValidValidated(): PlaybookVersion {
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
  if (!result.success) throw new Error('Expected valid restoration.');
  return result.value;
}

function restoreValidInvalid(): PlaybookVersion {
  const validatedAt = instant('2026-07-12T12:00:00Z');
  const summary = validationSummary({
    completedAt: validatedAt,
    validatedContentChecksum: contentChecksum(),
    blockingFindingCount: 3,
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
  if (!result.success) throw new Error('Expected valid restoration.');
  return result.value;
}

function restoreValidPublished(): PlaybookVersion {
  const validatedAt = instant('2026-07-12T12:00:00Z');
  const publishedAt = instant('2026-07-12T13:00:00Z');
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
  if (!result.success) throw new Error('Expected valid restoration.');
  return result.value;
}

function restoreValidArchivedFromPublished(): PlaybookVersion {
  const validatedAt = instant('2026-07-12T12:00:00Z');
  const publishedAt = instant('2026-07-12T13:00:00Z');
  const archivedAt = instant('2026-07-12T14:00:00Z');
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
    updatedAt: archivedAt,
    validationStartedAt: instant('2026-07-12T11:00:00Z'),
    validatedAt,
    publishedAt,
    archivedAt,
  });
  if (!result.success) throw new Error('Expected valid restoration.');
  return result.value;
}

function restoreValidArchivedFromValidated(): PlaybookVersion {
  const validatedAt = instant('2026-07-12T12:00:00Z');
  const archivedAt = instant('2026-07-12T14:00:00Z');
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
    updatedAt: archivedAt,
    validationStartedAt: instant('2026-07-12T11:00:00Z'),
    validatedAt,
    publishedAt: null,
    archivedAt,
  });
  if (!result.success) throw new Error('Expected valid restoration.');
  return result.value;
}

function restoreValidArchivedFromInvalid(): PlaybookVersion {
  const validatedAt = instant('2026-07-12T12:00:00Z');
  const archivedAt = instant('2026-07-12T14:00:00Z');
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
    updatedAt: archivedAt,
    validationStartedAt: instant('2026-07-12T11:00:00Z'),
    validatedAt,
    publishedAt: null,
    archivedAt,
  });
  if (!result.success) throw new Error('Expected valid restoration.');
  return result.value;
}

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

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

describe('PlaybookVersion snapshot', () => {
  it('contains canonical IDs', () => {
    const result = createDraft();
    const snapshot = result.toSnapshot();
    expect(snapshot.playbookVersionId).toBe(fixturePlaybookVersionId);
    expect(snapshot.workspaceId).toBe(fixtureWorkspaceId);
    expect(snapshot.playbookId).toBe(fixturePlaybookId);
    expect(snapshot.synchronizationSnapshotId).toBe(fixtureSnapshotId);
  });

  it('converts versionSequence to number', () => {
    const result = createDraft();
    const snapshot = result.toSnapshot();
    expect(snapshot.versionSequence).toBe(1);
  });

  it('converts versionLabel to string or null', () => {
    const withLabel = createDraft({ versionLabel: versionLabel('test-label') });
    expect(withLabel.toSnapshot().versionLabel).toBe('test-label');

    const withoutLabel = createDraft({ versionLabel: null });
    expect(withoutLabel.toSnapshot().versionLabel).toBeNull();
  });

  it('includes structured sourceContentChecksum', () => {
    const result = createDraft();
    const snapshot = result.toSnapshot();
    expect(snapshot.sourceContentChecksum).toEqual({
      algorithm: 'sha256',
      value: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    });
  });

  it('includes validationSummary when present', () => {
    const result = restoreValidPublished();
    const snapshot = result.toSnapshot();
    expect(snapshot.validationSummary).not.toBeNull();
    expect(snapshot.validationSummary?.publicationEligible).toBe(true);
    expect(snapshot.validationSummary?.validatedContentChecksum.algorithm).toBe('sha256');
  });

  it('returns null validationSummary when absent', () => {
    const result = createDraft();
    expect(result.toSnapshot().validationSummary).toBeNull();
  });

  it('returns a new structure on each call', () => {
    const result = createDraft();
    const a = result.toSnapshot();
    const b = result.toSnapshot();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it('mutating a nested copy does not modify the aggregate', () => {
    const result = restoreValidPublished();
    const snapshot = result.toSnapshot();
    const mutableSummary = { ...snapshot.validationSummary!, blockingFindingCount: 99 };
    const modified: PlaybookVersionSnapshot = { ...snapshot, validationSummary: mutableSummary };
    expect(result.toSnapshot().validationSummary?.blockingFindingCount).toBe(0);
    expect(modified.validationSummary?.blockingFindingCount).toBe(99);
  });

  it('does not contain technical fields', () => {
    const result = createDraft();
    const snapshot = result.toSnapshot();
    const keys = Object.keys(snapshot).sort();
    expect(keys).not.toContain('state');
    expect(keys).not.toContain('domainEvents');
    expect(keys).not.toContain('revision');
  });

  it('does not contain findings collection', () => {
    const result = restoreValidPublished();
    const snapshot = result.toSnapshot();
    expect((snapshot as unknown as Record<string, unknown>).validationFindings).toBeUndefined();
  });

  it('does not contain knowledge items', () => {
    const result = createDraft();
    const snapshotStr = JSON.stringify(result.toSnapshot());
    expect(snapshotStr).not.toContain('knowledgeItems');
    expect(snapshotStr).not.toContain('KnowledgeItems');
  });
});

// ---------------------------------------------------------------------------
// Fixture: second normalization attempt id
// ---------------------------------------------------------------------------

const fixtureSecondAttemptId = parsedNormalizationAttemptId('33333333-4444-5555-6666-777777777777');

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
