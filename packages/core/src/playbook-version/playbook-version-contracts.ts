import type {
  NormalizationAttemptId,
  PlaybookId,
  PlaybookVersionId,
  SynchronizationSnapshotId,
  WorkspaceId,
} from '../identifiers.js';
import type { Instant } from '../instant.js';
import type { ContentChecksum } from './content-checksum.js';
import type { NormalizationStatus } from './normalization-status.js';
import type { NormalizationSchemaVersion } from './normalization-schema-version.js';
import type { ParserVersion } from './parser-version.js';
import type { PlaybookVersionStatus } from './playbook-version-status.js';
import type { ValidationSummary, ValidationSummarySnapshot } from './validation-summary.js';
import type { VersionLabel } from './version-label.js';
import type { VersionSequence } from './version-sequence.js';

export interface PlaybookVersionSnapshot {
  readonly playbookVersionId: PlaybookVersionId;
  readonly workspaceId: WorkspaceId;
  readonly playbookId: PlaybookId;
  readonly synchronizationSnapshotId: SynchronizationSnapshotId;

  readonly versionSequence: number;
  readonly versionLabel: string | null;

  readonly status: PlaybookVersionStatus;
  readonly normalizationStatus: NormalizationStatus;

  readonly parserVersion: string;
  readonly normalizationSchemaVersion: string;

  readonly sourceContentChecksum: {
    readonly algorithm: 'sha256';
    readonly value: string;
  };

  readonly normalizationAttemptId: NormalizationAttemptId | null;

  readonly validationSummary: ValidationSummarySnapshot | null;

  readonly createdAt: string;
  readonly updatedAt: string;
  readonly validationStartedAt: string | null;
  readonly validatedAt: string | null;
  readonly publishedAt: string | null;
  readonly archivedAt: string | null;
}

export interface PlaybookVersionState {
  readonly playbookVersionId: PlaybookVersionId;
  readonly workspaceId: WorkspaceId;
  readonly playbookId: PlaybookId;
  readonly synchronizationSnapshotId: SynchronizationSnapshotId;
  readonly versionSequence: VersionSequence;
  readonly versionLabel: VersionLabel | null;

  status: PlaybookVersionStatus;
  normalizationStatus: NormalizationStatus;

  readonly parserVersion: ParserVersion;
  readonly normalizationSchemaVersion: NormalizationSchemaVersion;
  readonly sourceContentChecksum: ContentChecksum;

  normalizationAttemptId: NormalizationAttemptId | null;
  validationSummary: ValidationSummary | null;

  readonly createdAt: Instant;
  updatedAt: Instant;

  validationStartedAt: Instant | null;
  validatedAt: Instant | null;
  publishedAt: Instant | null;
  archivedAt: Instant | null;
}

export interface CreatePlaybookVersionInput {
  readonly playbookVersionId: PlaybookVersionId;
  readonly workspaceId: WorkspaceId;
  readonly playbookId: PlaybookId;
  readonly synchronizationSnapshotId: SynchronizationSnapshotId;
  readonly versionSequence: VersionSequence;
  readonly versionLabel: VersionLabel | null;
  readonly parserVersion: ParserVersion;
  readonly normalizationSchemaVersion: NormalizationSchemaVersion;
  readonly sourceContentChecksum: ContentChecksum;
  readonly createdAt: Instant;
}

export interface RestorePlaybookVersionInput {
  readonly playbookVersionId: PlaybookVersionId;
  readonly workspaceId: WorkspaceId;
  readonly playbookId: PlaybookId;
  readonly synchronizationSnapshotId: SynchronizationSnapshotId;
  readonly versionSequence: VersionSequence;
  readonly versionLabel: VersionLabel | null;
  readonly status: PlaybookVersionStatus | string;
  readonly normalizationStatus: NormalizationStatus | string;
  readonly parserVersion: ParserVersion;
  readonly normalizationSchemaVersion: NormalizationSchemaVersion;
  readonly sourceContentChecksum: ContentChecksum;
  readonly normalizationAttemptId: NormalizationAttemptId | null;
  readonly validationSummary: ValidationSummary | null;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
  readonly validationStartedAt: Instant | null;
  readonly validatedAt: Instant | null;
  readonly publishedAt: Instant | null;
  readonly archivedAt: Instant | null;
}

export interface BeginNormalizationInput {
  readonly normalizationAttemptId: NormalizationAttemptId;
  readonly startedAt: Instant;
}

export interface CompleteNormalizationInput {
  readonly completedAt: Instant;
}

export interface FailNormalizationInput {
  readonly failedAt: Instant;
}

export interface BeginValidationInput {
  readonly startedAt: Instant;
}

export interface MarkValidatedInput {
  readonly validationSummary: ValidationSummary;
  readonly validatedAt: Instant;
}

export interface MarkInvalidInput {
  readonly validationSummary: ValidationSummary;
  readonly validatedAt: Instant;
}

export interface PublishInput {
  readonly publishedAt: Instant;
}

export interface ArchiveInput {
  readonly archivedAt: Instant;
}
