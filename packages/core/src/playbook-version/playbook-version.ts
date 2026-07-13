import { err, ok, type Result } from '@ai-playbook-engine/shared';

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

export interface PlaybookVersionStateInvalidError {
  readonly code: 'PLAYBOOK_VERSION_STATE_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason:
      | 'updated_before_created'
      | 'timestamp_order_invalid'
      | 'unexpected_timestamp'
      | 'required_timestamp_missing'
      | 'unexpected_validation_summary'
      | 'validation_summary_required'
      | 'normalization_attempt_required'
      | 'normalization_attempt_not_allowed'
      | 'normalization_incomplete'
      | 'validation_summary_not_eligible'
      | 'validation_summary_unexpectedly_eligible'
      | 'validation_checksum_mismatch'
      | 'validation_completion_mismatch'
      | 'status_combination_invalid';
    readonly field?: string;
    readonly currentStatus?: string;
    readonly normalizationStatus?: string;
    readonly operation?: string;
  };
}

export type PlaybookVersionCreationError = PlaybookVersionStateInvalidError;

export type PlaybookVersionRestorationError = PlaybookVersionStateInvalidError;

export interface PlaybookVersionOperationNotAllowedError {
  readonly code: 'PLAYBOOK_VERSION_OPERATION_NOT_ALLOWED';
  readonly message: string;
  readonly details: {
    readonly operation: string;
    readonly reason: string;
    readonly currentStatus?: PlaybookVersionStatus;
    readonly normalizationStatus?: NormalizationStatus;
  };
}

export interface PlaybookVersionNormalizationAlreadyRunningError {
  readonly code: 'PLAYBOOK_VERSION_NORMALIZATION_ALREADY_RUNNING';
  readonly message: string;
  readonly details: Record<string, never>;
}

export interface PlaybookVersionNormalizationNotRunningError {
  readonly code: 'PLAYBOOK_VERSION_NORMALIZATION_NOT_RUNNING';
  readonly message: string;
  readonly details: {
    readonly operation: string;
    readonly normalizationStatus: NormalizationStatus;
  };
}

export interface PlaybookVersionNormalizationAttemptInvalidError {
  readonly code: 'PLAYBOOK_VERSION_NORMALIZATION_ATTEMPT_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: 'attempt_must_change';
    readonly normalizationAttemptId: string;
  };
}

export type PlaybookVersionTransitionError =
  | PlaybookVersionStateInvalidError
  | PlaybookVersionOperationNotAllowedError
  | PlaybookVersionNormalizationAlreadyRunningError
  | PlaybookVersionNormalizationNotRunningError
  | PlaybookVersionNormalizationAttemptInvalidError;

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

interface PlaybookVersionState {
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

export class PlaybookVersion {
  #state: PlaybookVersionState;

  private constructor(state: PlaybookVersionState) {
    this.#state = state;
  }

  static create(input: {
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
  }): Result<PlaybookVersion, PlaybookVersionCreationError> {
    return ok(
      new PlaybookVersion({
        playbookVersionId: input.playbookVersionId,
        workspaceId: input.workspaceId,
        playbookId: input.playbookId,
        synchronizationSnapshotId: input.synchronizationSnapshotId,
        versionSequence: input.versionSequence,
        versionLabel: input.versionLabel,
        status: 'draft',
        normalizationStatus: 'pending',
        parserVersion: input.parserVersion,
        normalizationSchemaVersion: input.normalizationSchemaVersion,
        sourceContentChecksum: input.sourceContentChecksum,
        normalizationAttemptId: null,
        validationSummary: null,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
        validationStartedAt: null,
        validatedAt: null,
        publishedAt: null,
        archivedAt: null,
      }),
    );
  }

  static restore(input: {
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
  }): Result<PlaybookVersion, PlaybookVersionRestorationError> {
    const status = input.status;
    if (!isPlaybookVersionStatus(status)) {
      return err(stateInvalid({ reason: 'status_combination_invalid', currentStatus: status }));
    }

    const normalizationStatus = input.normalizationStatus;
    if (!isNormalizationStatus(normalizationStatus)) {
      return err(
        stateInvalid({
          reason: 'status_combination_invalid',
          currentStatus: status,
          normalizationStatus: String(input.normalizationStatus),
        }),
      );
    }

    const stateValidation = validateRestoredState({
      ...input,
      status,
      normalizationStatus,
    });
    if (stateValidation !== null) {
      return err(stateValidation);
    }

    return ok(new PlaybookVersion({ ...input, status, normalizationStatus }));
  }

  get id(): PlaybookVersionId {
    return this.#state.playbookVersionId;
  }

  get workspaceId(): WorkspaceId {
    return this.#state.workspaceId;
  }

  get playbookId(): PlaybookId {
    return this.#state.playbookId;
  }

  get synchronizationSnapshotId(): SynchronizationSnapshotId {
    return this.#state.synchronizationSnapshotId;
  }

  get versionSequence(): VersionSequence {
    return this.#state.versionSequence;
  }

  get versionLabel(): VersionLabel | null {
    return this.#state.versionLabel;
  }

  get status(): PlaybookVersionStatus {
    return this.#state.status;
  }

  get normalizationStatus(): NormalizationStatus {
    return this.#state.normalizationStatus;
  }

  get parserVersion(): ParserVersion {
    return this.#state.parserVersion;
  }

  get normalizationSchemaVersion(): NormalizationSchemaVersion {
    return this.#state.normalizationSchemaVersion;
  }

  get sourceContentChecksum(): ContentChecksum {
    return this.#state.sourceContentChecksum;
  }

  get normalizationAttemptId(): NormalizationAttemptId | null {
    return this.#state.normalizationAttemptId;
  }

  get validationSummary(): ValidationSummary | null {
    return this.#state.validationSummary;
  }

  get createdAt(): Instant {
    return this.#state.createdAt;
  }

  get updatedAt(): Instant {
    return this.#state.updatedAt;
  }

  get validationStartedAt(): Instant | null {
    return this.#state.validationStartedAt;
  }

  get validatedAt(): Instant | null {
    return this.#state.validatedAt;
  }

  get publishedAt(): Instant | null {
    return this.#state.publishedAt;
  }

  get archivedAt(): Instant | null {
    return this.#state.archivedAt;
  }

  beginNormalization(input: {
    readonly normalizationAttemptId: NormalizationAttemptId;
    readonly startedAt: Instant;
  }): Result<void, PlaybookVersionTransitionError> {
    const { status, normalizationStatus } = this.#state;

    if (status !== 'draft') {
      return err(
        operationNotAllowed({
          operation: 'begin_normalization',
          currentStatus: status,
          normalizationStatus,
          reason: 'version_not_draft',
        }),
      );
    }

    if (normalizationStatus === 'running') {
      return err(normalizationAlreadyRunning());
    }

    if (normalizationStatus === 'completed') {
      return err(
        operationNotAllowed({
          operation: 'begin_normalization',
          currentStatus: status,
          normalizationStatus,
          reason: 'normalization_already_completed',
        }),
      );
    }

    if (input.startedAt.compare(this.#state.updatedAt) < 0) {
      return err(
        stateInvalid({
          reason: 'timestamp_order_invalid',
          field: 'updatedAt',
          operation: 'begin_normalization',
        }),
      );
    }

    if (normalizationStatus === 'pending') {
      this.#state.normalizationStatus = 'running';
      this.#state.normalizationAttemptId = input.normalizationAttemptId;
      this.#state.updatedAt = input.startedAt;
      return ok(undefined);
    }

    if (this.#state.normalizationAttemptId === null) {
      return err(stateInvalid({ reason: 'normalization_attempt_required' }));
    }

    if (input.normalizationAttemptId === this.#state.normalizationAttemptId) {
      return err(
        normalizationAttemptInvalid({
          reason: 'attempt_must_change',
          normalizationAttemptId: input.normalizationAttemptId,
        }),
      );
    }

    this.#state.normalizationStatus = 'running';
    this.#state.normalizationAttemptId = input.normalizationAttemptId;
    this.#state.updatedAt = input.startedAt;
    return ok(undefined);
  }

  completeNormalization(input: {
    readonly completedAt: Instant;
  }): Result<void, PlaybookVersionTransitionError> {
    const { status, normalizationStatus } = this.#state;

    if (status !== 'draft') {
      return err(
        operationNotAllowed({
          operation: 'complete_normalization',
          reason: 'version_not_draft',
        }),
      );
    }

    if (normalizationStatus !== 'running') {
      return err(
        normalizationNotRunning({
          operation: 'complete_normalization',
          normalizationStatus,
        }),
      );
    }

    if (this.#state.normalizationAttemptId === null) {
      return err(stateInvalid({ reason: 'normalization_attempt_required' }));
    }

    if (input.completedAt.compare(this.#state.updatedAt) < 0) {
      return err(
        stateInvalid({
          reason: 'timestamp_order_invalid',
          field: 'updatedAt',
          operation: 'complete_normalization',
        }),
      );
    }

    this.#state.normalizationStatus = 'completed';
    this.#state.updatedAt = input.completedAt;
    return ok(undefined);
  }

  failNormalization(input: {
    readonly failedAt: Instant;
  }): Result<void, PlaybookVersionTransitionError> {
    const { status, normalizationStatus } = this.#state;

    if (status !== 'draft') {
      return err(
        operationNotAllowed({
          operation: 'fail_normalization',
          reason: 'version_not_draft',
        }),
      );
    }

    if (normalizationStatus !== 'running') {
      return err(
        normalizationNotRunning({
          operation: 'fail_normalization',
          normalizationStatus,
        }),
      );
    }

    if (this.#state.normalizationAttemptId === null) {
      return err(stateInvalid({ reason: 'normalization_attempt_required' }));
    }

    if (input.failedAt.compare(this.#state.updatedAt) < 0) {
      return err(
        stateInvalid({
          reason: 'timestamp_order_invalid',
          field: 'updatedAt',
          operation: 'fail_normalization',
        }),
      );
    }

    this.#state.normalizationStatus = 'failed';
    this.#state.updatedAt = input.failedAt;
    return ok(undefined);
  }

  toSnapshot(): PlaybookVersionSnapshot {
    return Object.freeze({
      playbookVersionId: this.#state.playbookVersionId,
      workspaceId: this.#state.workspaceId,
      playbookId: this.#state.playbookId,
      synchronizationSnapshotId: this.#state.synchronizationSnapshotId,
      versionSequence: this.#state.versionSequence.value,
      versionLabel: this.#state.versionLabel?.value ?? null,
      status: this.#state.status,
      normalizationStatus: this.#state.normalizationStatus,
      parserVersion: this.#state.parserVersion.value,
      normalizationSchemaVersion: this.#state.normalizationSchemaVersion.value,
      sourceContentChecksum: Object.freeze({
        algorithm: this.#state.sourceContentChecksum.algorithm,
        value: this.#state.sourceContentChecksum.value,
      }),
      normalizationAttemptId: this.#state.normalizationAttemptId,
      validationSummary: this.#state.validationSummary?.toSnapshot() ?? null,
      createdAt: this.#state.createdAt.toString(),
      updatedAt: this.#state.updatedAt.toString(),
      validationStartedAt: this.#state.validationStartedAt?.toString() ?? null,
      validatedAt: this.#state.validatedAt?.toString() ?? null,
      publishedAt: this.#state.publishedAt?.toString() ?? null,
      archivedAt: this.#state.archivedAt?.toString() ?? null,
    });
  }
}

function validateRestoredState(input: {
  readonly status: PlaybookVersionStatus;
  readonly normalizationStatus: NormalizationStatus;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
  readonly validationStartedAt: Instant | null;
  readonly validatedAt: Instant | null;
  readonly publishedAt: Instant | null;
  readonly archivedAt: Instant | null;
  readonly validationSummary: ValidationSummary | null;
  readonly normalizationAttemptId: NormalizationAttemptId | null;
  readonly sourceContentChecksum: ContentChecksum;
}): PlaybookVersionStateInvalidError | null {
  if (input.updatedAt.compare(input.createdAt) < 0) {
    return stateInvalid({ reason: 'updated_before_created', field: 'updatedAt' });
  }

  if (input.archivedAt !== null && input.archivedAt.compare(input.createdAt) < 0) {
    return stateInvalid({ reason: 'timestamp_order_invalid', field: 'archivedAt' });
  }

  if (
    input.validationStartedAt !== null &&
    input.validationStartedAt.compare(input.createdAt) < 0
  ) {
    return stateInvalid({ reason: 'timestamp_order_invalid', field: 'validationStartedAt' });
  }

  if (
    input.validatedAt !== null &&
    input.validationStartedAt !== null &&
    input.validatedAt.compare(input.validationStartedAt) < 0
  ) {
    return stateInvalid({ reason: 'timestamp_order_invalid', field: 'validatedAt' });
  }

  if (
    input.publishedAt !== null &&
    input.validatedAt !== null &&
    input.publishedAt.compare(input.validatedAt) < 0
  ) {
    return stateInvalid({ reason: 'timestamp_order_invalid', field: 'publishedAt' });
  }

  if (input.archivedAt !== null && input.updatedAt.compare(input.archivedAt) < 0) {
    return stateInvalid({ reason: 'timestamp_order_invalid', field: 'updatedAt' });
  }

  if (
    input.validationStartedAt !== null &&
    input.updatedAt.compare(input.validationStartedAt) < 0
  ) {
    return stateInvalid({ reason: 'timestamp_order_invalid', field: 'updatedAt' });
  }

  if (input.validatedAt !== null && input.updatedAt.compare(input.validatedAt) < 0) {
    return stateInvalid({ reason: 'timestamp_order_invalid', field: 'updatedAt' });
  }

  if (input.publishedAt !== null && input.updatedAt.compare(input.publishedAt) < 0) {
    return stateInvalid({ reason: 'timestamp_order_invalid', field: 'updatedAt' });
  }

  if (input.publishedAt !== null && input.validationStartedAt === null) {
    return stateInvalid({ reason: 'required_timestamp_missing', field: 'validationStartedAt' });
  }

  if (input.validatedAt !== null && input.validationStartedAt === null) {
    return stateInvalid({ reason: 'required_timestamp_missing', field: 'validationStartedAt' });
  }

  switch (input.status) {
    case 'draft':
      return validateDraft(input);
    case 'validating':
      return validateValidating(input);
    case 'validated':
      return validateValidated(input);
    case 'invalid':
      return validateInvalid(input);
    case 'published':
      return validatePublished(input);
    case 'archived':
      return validateArchived(input);
    default:
      return stateInvalid({ reason: 'status_combination_invalid', currentStatus: input.status });
  }
}

function validateDraft(input: {
  readonly normalizationStatus: NormalizationStatus;
  readonly normalizationAttemptId: NormalizationAttemptId | null;
  readonly validationStartedAt: Instant | null;
  readonly validatedAt: Instant | null;
  readonly validationSummary: ValidationSummary | null;
  readonly publishedAt: Instant | null;
  readonly archivedAt: Instant | null;
}): PlaybookVersionStateInvalidError | null {
  if (input.validationStartedAt !== null) {
    return stateInvalid({ reason: 'unexpected_timestamp', field: 'validationStartedAt' });
  }

  if (input.validatedAt !== null) {
    return stateInvalid({ reason: 'unexpected_timestamp', field: 'validatedAt' });
  }

  if (input.validationSummary !== null) {
    return stateInvalid({ reason: 'unexpected_validation_summary' });
  }

  if (input.publishedAt !== null) {
    return stateInvalid({ reason: 'unexpected_timestamp', field: 'publishedAt' });
  }

  if (input.archivedAt !== null) {
    return stateInvalid({ reason: 'unexpected_timestamp', field: 'archivedAt' });
  }

  switch (input.normalizationStatus) {
    case 'pending':
      if (input.normalizationAttemptId !== null) {
        return stateInvalid({ reason: 'normalization_attempt_not_allowed' });
      }
      return null;
    case 'running':
    case 'completed':
    case 'failed':
      if (input.normalizationAttemptId === null) {
        return stateInvalid({ reason: 'normalization_attempt_required' });
      }
      return null;
    default:
      return stateInvalid({
        reason: 'status_combination_invalid',
        normalizationStatus: input.normalizationStatus,
      });
  }
}

function validateValidating(input: {
  readonly normalizationStatus: NormalizationStatus;
  readonly normalizationAttemptId: NormalizationAttemptId | null;
  readonly validationStartedAt: Instant | null;
  readonly validatedAt: Instant | null;
  readonly validationSummary: ValidationSummary | null;
  readonly publishedAt: Instant | null;
  readonly archivedAt: Instant | null;
}): PlaybookVersionStateInvalidError | null {
  if (input.normalizationStatus !== 'completed') {
    return stateInvalid({
      reason: 'normalization_incomplete',
      normalizationStatus: input.normalizationStatus,
    });
  }

  if (input.normalizationAttemptId === null) {
    return stateInvalid({ reason: 'normalization_attempt_required' });
  }

  if (input.validationStartedAt === null) {
    return stateInvalid({ reason: 'required_timestamp_missing', field: 'validationStartedAt' });
  }

  if (input.validatedAt !== null) {
    return stateInvalid({ reason: 'unexpected_timestamp', field: 'validatedAt' });
  }

  if (input.validationSummary !== null) {
    return stateInvalid({ reason: 'unexpected_validation_summary' });
  }

  if (input.publishedAt !== null) {
    return stateInvalid({ reason: 'unexpected_timestamp', field: 'publishedAt' });
  }

  if (input.archivedAt !== null) {
    return stateInvalid({ reason: 'unexpected_timestamp', field: 'archivedAt' });
  }

  return null;
}

function validateValidated(input: {
  readonly normalizationStatus: NormalizationStatus;
  readonly normalizationAttemptId: NormalizationAttemptId | null;
  readonly validationStartedAt: Instant | null;
  readonly validatedAt: Instant | null;
  readonly validationSummary: ValidationSummary | null;
  readonly publishedAt: Instant | null;
  readonly archivedAt: Instant | null;
  readonly sourceContentChecksum: ContentChecksum;
}): PlaybookVersionStateInvalidError | null {
  if (input.normalizationStatus !== 'completed') {
    return stateInvalid({
      reason: 'normalization_incomplete',
      normalizationStatus: input.normalizationStatus,
    });
  }

  if (input.normalizationAttemptId === null) {
    return stateInvalid({ reason: 'normalization_attempt_required' });
  }

  if (input.validationStartedAt === null) {
    return stateInvalid({ reason: 'required_timestamp_missing', field: 'validationStartedAt' });
  }

  if (input.validatedAt === null) {
    return stateInvalid({ reason: 'required_timestamp_missing', field: 'validatedAt' });
  }

  if (input.validationSummary === null) {
    return stateInvalid({ reason: 'validation_summary_required' });
  }

  if (!input.validationSummary.publicationEligible) {
    return stateInvalid({ reason: 'validation_summary_not_eligible' });
  }

  if (input.validationSummary.blockingFindingCount > 0) {
    return stateInvalid({ reason: 'validation_summary_not_eligible' });
  }

  const summaryErrorValidated = checkFinalizedSummaryIntegrity(
    input.validationSummary,
    input.validatedAt,
    input.sourceContentChecksum,
  );
  if (summaryErrorValidated !== null) {
    return summaryErrorValidated;
  }

  if (input.publishedAt !== null) {
    return stateInvalid({ reason: 'unexpected_timestamp', field: 'publishedAt' });
  }

  if (input.archivedAt !== null) {
    return stateInvalid({ reason: 'unexpected_timestamp', field: 'archivedAt' });
  }

  return null;
}

function validateInvalid(input: {
  readonly normalizationStatus: NormalizationStatus;
  readonly normalizationAttemptId: NormalizationAttemptId | null;
  readonly validationStartedAt: Instant | null;
  readonly validatedAt: Instant | null;
  readonly validationSummary: ValidationSummary | null;
  readonly publishedAt: Instant | null;
  readonly archivedAt: Instant | null;
  readonly sourceContentChecksum: ContentChecksum;
}): PlaybookVersionStateInvalidError | null {
  if (input.normalizationStatus !== 'completed') {
    return stateInvalid({
      reason: 'normalization_incomplete',
      normalizationStatus: input.normalizationStatus,
    });
  }

  if (input.normalizationAttemptId === null) {
    return stateInvalid({ reason: 'normalization_attempt_required' });
  }

  if (input.validationStartedAt === null) {
    return stateInvalid({ reason: 'required_timestamp_missing', field: 'validationStartedAt' });
  }

  if (input.validatedAt === null) {
    return stateInvalid({ reason: 'required_timestamp_missing', field: 'validatedAt' });
  }

  if (input.validationSummary === null) {
    return stateInvalid({ reason: 'validation_summary_required' });
  }

  if (input.validationSummary.publicationEligible) {
    return stateInvalid({ reason: 'validation_summary_unexpectedly_eligible' });
  }

  if (input.validationSummary.blockingFindingCount === 0) {
    return stateInvalid({ reason: 'validation_summary_not_eligible' });
  }

  const summaryErrorInvalid = checkFinalizedSummaryIntegrity(
    input.validationSummary,
    input.validatedAt,
    input.sourceContentChecksum,
  );
  if (summaryErrorInvalid !== null) {
    return summaryErrorInvalid;
  }

  if (input.publishedAt !== null) {
    return stateInvalid({ reason: 'unexpected_timestamp', field: 'publishedAt' });
  }

  if (input.archivedAt !== null) {
    return stateInvalid({ reason: 'unexpected_timestamp', field: 'archivedAt' });
  }

  return null;
}

function validatePublished(input: {
  readonly normalizationStatus: NormalizationStatus;
  readonly normalizationAttemptId: NormalizationAttemptId | null;
  readonly validationStartedAt: Instant | null;
  readonly validatedAt: Instant | null;
  readonly validationSummary: ValidationSummary | null;
  readonly publishedAt: Instant | null;
  readonly archivedAt: Instant | null;
  readonly sourceContentChecksum: ContentChecksum;
}): PlaybookVersionStateInvalidError | null {
  if (input.normalizationStatus !== 'completed') {
    return stateInvalid({
      reason: 'normalization_incomplete',
      normalizationStatus: input.normalizationStatus,
    });
  }

  if (input.normalizationAttemptId === null) {
    return stateInvalid({ reason: 'normalization_attempt_required' });
  }

  if (input.validationStartedAt === null) {
    return stateInvalid({ reason: 'required_timestamp_missing', field: 'validationStartedAt' });
  }

  if (input.validatedAt === null) {
    return stateInvalid({ reason: 'required_timestamp_missing', field: 'validatedAt' });
  }

  if (input.validationSummary === null) {
    return stateInvalid({ reason: 'validation_summary_required' });
  }

  if (!input.validationSummary.publicationEligible) {
    return stateInvalid({ reason: 'validation_summary_not_eligible' });
  }

  if (input.validationSummary.blockingFindingCount !== 0) {
    return stateInvalid({ reason: 'validation_summary_not_eligible' });
  }

  const summaryError = checkFinalizedSummaryIntegrity(
    input.validationSummary,
    input.validatedAt,
    input.sourceContentChecksum,
  );
  if (summaryError !== null) {
    return summaryError;
  }

  if (input.publishedAt === null) {
    return stateInvalid({ reason: 'required_timestamp_missing', field: 'publishedAt' });
  }

  if (input.archivedAt !== null) {
    return stateInvalid({ reason: 'unexpected_timestamp', field: 'archivedAt' });
  }

  return null;
}

function validateArchived(input: {
  readonly normalizationStatus: NormalizationStatus;
  readonly normalizationAttemptId: NormalizationAttemptId | null;
  readonly validationStartedAt: Instant | null;
  readonly validatedAt: Instant | null;
  readonly validationSummary: ValidationSummary | null;
  readonly publishedAt: Instant | null;
  readonly archivedAt: Instant | null;
  readonly sourceContentChecksum: ContentChecksum;
}): PlaybookVersionStateInvalidError | null {
  if (input.archivedAt === null) {
    return stateInvalid({ reason: 'required_timestamp_missing', field: 'archivedAt' });
  }

  if (input.normalizationStatus !== 'completed') {
    return stateInvalid({
      reason: 'normalization_incomplete',
      normalizationStatus: input.normalizationStatus,
    });
  }

  if (input.normalizationAttemptId === null) {
    return stateInvalid({ reason: 'normalization_attempt_required' });
  }

  if (input.validationStartedAt === null) {
    return stateInvalid({ reason: 'required_timestamp_missing', field: 'validationStartedAt' });
  }

  if (input.validatedAt === null) {
    return stateInvalid({ reason: 'required_timestamp_missing', field: 'validatedAt' });
  }

  if (input.validationSummary === null) {
    return stateInvalid({ reason: 'validation_summary_required' });
  }

  if (input.archivedAt.compare(input.validatedAt) < 0) {
    return stateInvalid({ reason: 'timestamp_order_invalid', field: 'archivedAt' });
  }

  if (input.publishedAt !== null && input.archivedAt.compare(input.publishedAt) < 0) {
    return stateInvalid({ reason: 'timestamp_order_invalid', field: 'archivedAt' });
  }

  const summaryError = checkFinalizedSummaryIntegrity(
    input.validationSummary,
    input.validatedAt,
    input.sourceContentChecksum,
  );
  if (summaryError !== null) {
    return summaryError;
  }

  const previouslyPublished =
    input.publishedAt !== null &&
    input.validationSummary.publicationEligible &&
    input.validationSummary.blockingFindingCount === 0;

  const previouslyValidated =
    input.publishedAt === null &&
    input.validationSummary.publicationEligible &&
    input.validationSummary.blockingFindingCount === 0;

  const previouslyInvalid =
    input.publishedAt === null &&
    !input.validationSummary.publicationEligible &&
    input.validationSummary.blockingFindingCount > 0;

  if (!previouslyPublished && !previouslyValidated && !previouslyInvalid) {
    return stateInvalid({ reason: 'status_combination_invalid' });
  }

  return null;
}

function checkFinalizedSummaryIntegrity(
  summary: ValidationSummary,
  validatedAt: Instant,
  sourceContentChecksum: ContentChecksum,
): PlaybookVersionStateInvalidError | null {
  if (!summary.completedAt.equals(validatedAt)) {
    return stateInvalid({ reason: 'validation_completion_mismatch' });
  }

  if (!summary.validatedContentChecksum.equals(sourceContentChecksum)) {
    return stateInvalid({ reason: 'validation_checksum_mismatch' });
  }

  return null;
}

function isPlaybookVersionStatus(value: string): value is PlaybookVersionStatus {
  return (
    value === 'draft' ||
    value === 'validating' ||
    value === 'validated' ||
    value === 'invalid' ||
    value === 'published' ||
    value === 'archived'
  );
}

function isNormalizationStatus(value: string): value is NormalizationStatus {
  return value === 'pending' || value === 'running' || value === 'completed' || value === 'failed';
}

function stateInvalid(
  details: PlaybookVersionStateInvalidError['details'],
): PlaybookVersionStateInvalidError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_STATE_INVALID' as const,
    message: 'The playbook version state is inconsistent.',
    details: Object.freeze(details),
  });
}

function operationNotAllowed(
  details: PlaybookVersionOperationNotAllowedError['details'],
): PlaybookVersionOperationNotAllowedError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_OPERATION_NOT_ALLOWED' as const,
    message: 'The operation is not allowed for the current version state.',
    details: Object.freeze(details),
  });
}

function normalizationAlreadyRunning(): PlaybookVersionNormalizationAlreadyRunningError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_NORMALIZATION_ALREADY_RUNNING' as const,
    message: 'Normalization is already running.',
    details: Object.freeze({}),
  });
}

function normalizationNotRunning(
  details: PlaybookVersionNormalizationNotRunningError['details'],
): PlaybookVersionNormalizationNotRunningError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_NORMALIZATION_NOT_RUNNING' as const,
    message: 'Normalization must be running to perform this operation.',
    details: Object.freeze(details),
  });
}

function normalizationAttemptInvalid(
  details: PlaybookVersionNormalizationAttemptInvalidError['details'],
): PlaybookVersionNormalizationAttemptInvalidError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_NORMALIZATION_ATTEMPT_INVALID' as const,
    message: 'A new normalization attempt must use a different identifier.',
    details: Object.freeze(details),
  });
}
