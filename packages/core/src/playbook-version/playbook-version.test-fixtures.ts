import { parseValidationAttemptId } from '../identifiers.js';
import { Instant } from '../instant.js';
import {
  type ContentChecksum,
  type NormalizationSchemaVersion,
  type ParserVersion,
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

export const fixturePlaybookVersionId = parsedPlaybookVersionId(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
);
export const fixtureWorkspaceId = parsedWorkspaceId('de305d54-75b4-431b-adb2-eb6b9e546014');
export const fixturePlaybookId = parsedPlaybookId('11111111-2222-3333-4444-555555555555');
export const fixtureSnapshotId = parsedSynchronizationSnapshotId(
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
);
export const fixtureNormalizationAttemptId = parsedNormalizationAttemptId(
  '22222222-3333-4444-5555-666666666666',
);
export const fixtureSecondAttemptId = parsedNormalizationAttemptId(
  '33333333-4444-5555-6666-777777777777',
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

export function parsedNormalizationAttemptId(value: string) {
  const result = parseNormalizationAttemptId(value);
  if (!result.success)
    throw new Error('Expected a valid normalization attempt identifier fixture.');
  return result.value;
}

export function instant(value: string): Instant {
  const result = Instant.parse(value);
  if (!result.success) throw new Error('Expected a valid instant fixture.');
  return result.value;
}

export function versionSequence(value = 1): VersionSequence {
  const result = VersionSequence.create(value);
  if (!result.success) throw new Error('Expected a valid version sequence fixture.');
  return result.value;
}

export function versionLabel(value?: string): VersionLabel | null {
  if (value === undefined) return null;
  const result = VersionLabelClass.create(value);
  if (!result.success) throw new Error('Expected a valid version label fixture.');
  return result.value;
}

export function parserVersion(value = 'notion-parser/v1'): ParserVersion {
  const result = ParserVersionClass.create(value);
  if (!result.success) throw new Error('Expected a valid parser version fixture.');
  return result.value;
}

export function normalizationSchemaVersion(
  value = 'knowledge-schema/v1',
): NormalizationSchemaVersion {
  const result = NormalizationSchemaVersionClass.create(value);
  if (!result.success) throw new Error('Expected a valid normalization schema version fixture.');
  return result.value;
}

export function contentChecksum(
  value = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
): ContentChecksum {
  const result = ContentChecksumClass.create({ algorithm: 'sha256', value });
  if (!result.success) throw new Error('Expected a valid content checksum fixture.');
  return result.value;
}

export function validationSummary(
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

export const defaultNow = instant('2026-07-12T10:00:00Z');

export function createDraft(overrides?: {
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

export function restoreValidDraftPending(): PlaybookVersion {
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

export function restoreValidDraftRunning(): PlaybookVersion {
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

export function restoreValidDraftCompleted(): PlaybookVersion {
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

export function restoreValidDraftFailed(): PlaybookVersion {
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

export function restoreValidValidating(): PlaybookVersion {
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

export function restoreValidValidated(): PlaybookVersion {
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

export function restoreValidInvalid(): PlaybookVersion {
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

export function restoreValidPublished(): PlaybookVersion {
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

export function restoreValidArchivedFromPublished(): PlaybookVersion {
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

export function restoreValidArchivedFromValidated(): PlaybookVersion {
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

export function restoreValidArchivedFromInvalid(): PlaybookVersion {
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
