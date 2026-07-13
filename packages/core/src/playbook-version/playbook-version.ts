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
import type { ValidationSummary } from './validation-summary.js';
import type { VersionLabel } from './version-label.js';
import type { VersionSequence } from './version-sequence.js';
import type { PlaybookVersionSnapshot } from './playbook-version-contracts.js';
import type { PlaybookVersionState } from './playbook-version-contracts.js';
import type { CreatePlaybookVersionInput } from './playbook-version-contracts.js';
import type { RestorePlaybookVersionInput } from './playbook-version-contracts.js';
import type { BeginNormalizationInput } from './playbook-version-contracts.js';
import type { CompleteNormalizationInput } from './playbook-version-contracts.js';
import type { FailNormalizationInput } from './playbook-version-contracts.js';
import type { BeginValidationInput } from './playbook-version-contracts.js';
import type { MarkValidatedInput } from './playbook-version-contracts.js';
import type { MarkInvalidInput } from './playbook-version-contracts.js';
import type { PublishInput } from './playbook-version-contracts.js';
import type { ArchiveInput } from './playbook-version-contracts.js';
import type {
  PlaybookVersionCreationError,
  PlaybookVersionRestorationError,
  PlaybookVersionTransitionError,
} from './playbook-version-errors.js';
import {
  stateInvalid,
  operationNotAllowed,
  normalizationAlreadyRunning,
  normalizationNotRunning,
  normalizationAttemptInvalid,
  normalizationIncomplete,
  validationAlreadyStarted,
  notValidating,
  validationSummaryInvalid,
  alreadyPublished,
  notPublishable,
  alreadyArchived,
} from './playbook-version-errors.js';
import {
  isPlaybookVersionStatus,
  isNormalizationStatus,
  validateRestoredState,
} from './playbook-version-restoration.js';
import { checkFinalizedSummaryIntegrity } from './playbook-version-invariants.js';

export {
  type PlaybookVersionCreationError,
  type PlaybookVersionRestorationError,
  type PlaybookVersionStateInvalidError,
  type PlaybookVersionOperationNotAllowedError,
  type PlaybookVersionNormalizationAlreadyRunningError,
  type PlaybookVersionNormalizationNotRunningError,
  type PlaybookVersionNormalizationAttemptInvalidError,
  type PlaybookVersionNormalizationIncompleteError,
  type PlaybookVersionValidationAlreadyStartedError,
  type PlaybookVersionNotValidatingError,
  type PlaybookVersionValidationSummaryInvalidError,
  type PlaybookVersionAlreadyPublishedError,
  type PlaybookVersionNotPublishableError,
  type PlaybookVersionAlreadyArchivedError,
  type PlaybookVersionTransitionError,
} from './playbook-version-errors.js';
export { type PlaybookVersionSnapshot } from './playbook-version-contracts.js';

export class PlaybookVersion {
  #state: PlaybookVersionState;

  private constructor(state: PlaybookVersionState) {
    this.#state = state;
  }

  static create(
    input: CreatePlaybookVersionInput,
  ): Result<PlaybookVersion, PlaybookVersionCreationError> {
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

  static restore(
    input: RestorePlaybookVersionInput,
  ): Result<PlaybookVersion, PlaybookVersionRestorationError> {
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

  beginNormalization(input: BeginNormalizationInput): Result<void, PlaybookVersionTransitionError> {
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

  completeNormalization(
    input: CompleteNormalizationInput,
  ): Result<void, PlaybookVersionTransitionError> {
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

  failNormalization(input: FailNormalizationInput): Result<void, PlaybookVersionTransitionError> {
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

  beginValidation(input: BeginValidationInput): Result<void, PlaybookVersionTransitionError> {
    const { status, normalizationStatus } = this.#state;

    if (status !== 'draft') {
      if (status === 'validating') {
        return err(validationAlreadyStarted());
      }

      return err(
        operationNotAllowed({
          operation: 'begin_validation',
          currentStatus: status,
          normalizationStatus,
          reason: 'version_not_draft',
        }),
      );
    }

    if (normalizationStatus !== 'completed') {
      return err(normalizationIncomplete(normalizationStatus));
    }

    if (this.#state.normalizationAttemptId === null) {
      return err(stateInvalid({ reason: 'normalization_attempt_required' }));
    }

    if (this.#state.validationSummary !== null) {
      return err(stateInvalid({ reason: 'unexpected_validation_summary' }));
    }

    if (this.#state.validationStartedAt !== null) {
      return err(stateInvalid({ reason: 'unexpected_timestamp', field: 'validationStartedAt' }));
    }

    if (this.#state.validatedAt !== null) {
      return err(stateInvalid({ reason: 'unexpected_timestamp', field: 'validatedAt' }));
    }

    if (this.#state.publishedAt !== null) {
      return err(stateInvalid({ reason: 'unexpected_timestamp', field: 'publishedAt' }));
    }

    if (this.#state.archivedAt !== null) {
      return err(stateInvalid({ reason: 'unexpected_timestamp', field: 'archivedAt' }));
    }

    if (input.startedAt.compare(this.#state.updatedAt) < 0) {
      return err(
        stateInvalid({
          reason: 'timestamp_order_invalid',
          field: 'updatedAt',
          operation: 'begin_validation',
        }),
      );
    }

    this.#state.status = 'validating';
    this.#state.validationStartedAt = input.startedAt;
    this.#state.updatedAt = input.startedAt;
    return ok(undefined);
  }

  markValidated(input: MarkValidatedInput): Result<void, PlaybookVersionTransitionError> {
    const { status } = this.#state;

    if (status !== 'validating') {
      return err(notValidating({ operation: 'mark_validated', currentStatus: status }));
    }

    if (this.#state.normalizationStatus !== 'completed') {
      return err(
        stateInvalid({
          reason: 'normalization_incomplete',
          normalizationStatus: this.#state.normalizationStatus,
        }),
      );
    }

    if (this.#state.normalizationAttemptId === null) {
      return err(stateInvalid({ reason: 'normalization_attempt_required' }));
    }

    if (this.#state.validationStartedAt === null) {
      return err(
        stateInvalid({ reason: 'required_timestamp_missing', field: 'validationStartedAt' }),
      );
    }

    if (this.#state.validationSummary !== null) {
      return err(stateInvalid({ reason: 'unexpected_validation_summary' }));
    }

    if (input.validatedAt.compare(this.#state.validationStartedAt) < 0) {
      return err(
        stateInvalid({
          reason: 'timestamp_order_invalid',
          field: 'validatedAt',
          operation: 'mark_validated',
        }),
      );
    }

    if (input.validatedAt.compare(this.#state.updatedAt) < 0) {
      return err(
        stateInvalid({
          reason: 'timestamp_order_invalid',
          field: 'validatedAt',
          operation: 'mark_validated',
        }),
      );
    }

    if (
      !input.validationSummary.publicationEligible ||
      input.validationSummary.blockingFindingCount > 0
    ) {
      return err(
        validationSummaryInvalid({
          operation: 'mark_validated',
          reason: 'validation_summary_not_eligible',
          blockingFindingCount: input.validationSummary.blockingFindingCount,
        }),
      );
    }

    if (!input.validationSummary.completedAt.equals(input.validatedAt)) {
      return err(
        validationSummaryInvalid({
          operation: 'mark_validated',
          reason: 'validation_completion_mismatch',
        }),
      );
    }

    if (
      !input.validationSummary.validatedContentChecksum.equals(this.#state.sourceContentChecksum)
    ) {
      return err(
        validationSummaryInvalid({
          operation: 'mark_validated',
          reason: 'validation_checksum_mismatch',
        }),
      );
    }

    this.#state.status = 'validated';
    this.#state.validationSummary = input.validationSummary;
    this.#state.validatedAt = input.validatedAt;
    this.#state.updatedAt = input.validatedAt;
    return ok(undefined);
  }

  markInvalid(input: MarkInvalidInput): Result<void, PlaybookVersionTransitionError> {
    const { status } = this.#state;

    if (status !== 'validating') {
      return err(notValidating({ operation: 'mark_invalid', currentStatus: status }));
    }

    if (this.#state.normalizationStatus !== 'completed') {
      return err(
        stateInvalid({
          reason: 'normalization_incomplete',
          normalizationStatus: this.#state.normalizationStatus,
        }),
      );
    }

    if (this.#state.normalizationAttemptId === null) {
      return err(stateInvalid({ reason: 'normalization_attempt_required' }));
    }

    if (this.#state.validationStartedAt === null) {
      return err(
        stateInvalid({ reason: 'required_timestamp_missing', field: 'validationStartedAt' }),
      );
    }

    if (this.#state.validationSummary !== null) {
      return err(stateInvalid({ reason: 'unexpected_validation_summary' }));
    }

    if (input.validatedAt.compare(this.#state.validationStartedAt) < 0) {
      return err(
        stateInvalid({
          reason: 'timestamp_order_invalid',
          field: 'validatedAt',
          operation: 'mark_invalid',
        }),
      );
    }

    if (input.validatedAt.compare(this.#state.updatedAt) < 0) {
      return err(
        stateInvalid({
          reason: 'timestamp_order_invalid',
          field: 'validatedAt',
          operation: 'mark_invalid',
        }),
      );
    }

    if (
      input.validationSummary.publicationEligible ||
      input.validationSummary.blockingFindingCount === 0
    ) {
      return err(
        validationSummaryInvalid({
          operation: 'mark_invalid',
          reason: 'validation_summary_unexpectedly_eligible',
          blockingFindingCount: input.validationSummary.blockingFindingCount,
        }),
      );
    }

    if (!input.validationSummary.completedAt.equals(input.validatedAt)) {
      return err(
        validationSummaryInvalid({
          operation: 'mark_invalid',
          reason: 'validation_completion_mismatch',
        }),
      );
    }

    if (
      !input.validationSummary.validatedContentChecksum.equals(this.#state.sourceContentChecksum)
    ) {
      return err(
        validationSummaryInvalid({
          operation: 'mark_invalid',
          reason: 'validation_checksum_mismatch',
        }),
      );
    }

    this.#state.status = 'invalid';
    this.#state.validationSummary = input.validationSummary;
    this.#state.validatedAt = input.validatedAt;
    this.#state.updatedAt = input.validatedAt;
    return ok(undefined);
  }

  publish(input: PublishInput): Result<void, PlaybookVersionTransitionError> {
    const { status, normalizationStatus } = this.#state;

    if (status === 'published') {
      return err(alreadyPublished());
    }

    if (status !== 'validated') {
      let reason: 'version_not_validated' | 'version_invalid' | 'version_archived';
      if (status === 'draft' || status === 'validating') {
        reason = 'version_not_validated';
      } else if (status === 'invalid') {
        reason = 'version_invalid';
      } else {
        reason = 'version_archived';
      }
      return err(notPublishable({ operation: 'publish', currentStatus: status, reason }));
    }

    if (normalizationStatus !== 'completed') {
      return err(
        stateInvalid({
          reason: 'normalization_incomplete',
          operation: 'publish',
          normalizationStatus,
        }),
      );
    }

    if (this.#state.normalizationAttemptId === null) {
      return err(stateInvalid({ reason: 'normalization_attempt_required' }));
    }

    if (this.#state.validationStartedAt === null) {
      return err(
        stateInvalid({ reason: 'required_timestamp_missing', field: 'validationStartedAt' }),
      );
    }

    if (this.#state.validatedAt === null) {
      return err(stateInvalid({ reason: 'required_timestamp_missing', field: 'validatedAt' }));
    }

    if (this.#state.validationSummary === null) {
      return err(stateInvalid({ reason: 'validation_summary_required' }));
    }

    if (this.#state.publishedAt !== null) {
      return err(stateInvalid({ reason: 'unexpected_timestamp', field: 'publishedAt' }));
    }

    if (this.#state.archivedAt !== null) {
      return err(stateInvalid({ reason: 'unexpected_timestamp', field: 'archivedAt' }));
    }

    const summary = this.#state.validationSummary;
    if (!summary.publicationEligible || summary.blockingFindingCount > 0) {
      return err(
        notPublishable({
          operation: 'publish',
          reason: 'validation_summary_not_eligible',
          blockingFindingCount: summary.blockingFindingCount,
        }),
      );
    }

    if (!summary.validatedContentChecksum.equals(this.#state.sourceContentChecksum)) {
      return err(notPublishable({ operation: 'publish', reason: 'validation_checksum_mismatch' }));
    }

    if (!summary.completedAt.equals(this.#state.validatedAt)) {
      return err(
        notPublishable({ operation: 'publish', reason: 'validation_completion_mismatch' }),
      );
    }

    if (input.publishedAt.compare(this.#state.validatedAt) < 0) {
      return err(
        stateInvalid({
          reason: 'timestamp_order_invalid',
          field: 'publishedAt',
          operation: 'publish',
        }),
      );
    }

    if (input.publishedAt.compare(this.#state.updatedAt) < 0) {
      return err(
        stateInvalid({
          reason: 'timestamp_order_invalid',
          field: 'publishedAt',
          operation: 'publish',
        }),
      );
    }

    this.#state.status = 'published';
    this.#state.publishedAt = input.publishedAt;
    this.#state.updatedAt = input.publishedAt;
    return ok(undefined);
  }

  archive(input: ArchiveInput): Result<void, PlaybookVersionTransitionError> {
    const { status } = this.#state;

    if (status === 'archived') {
      return err(alreadyArchived());
    }

    if (status === 'draft' || status === 'validating') {
      return err(
        operationNotAllowed({
          operation: 'archive',
          currentStatus: status,
          reason: 'version_not_finalized',
        }),
      );
    }

    if (this.#state.normalizationStatus !== 'completed') {
      return err(
        stateInvalid({
          reason: 'normalization_incomplete',
          operation: 'archive',
          normalizationStatus: this.#state.normalizationStatus,
        }),
      );
    }

    if (this.#state.normalizationAttemptId === null) {
      return err(stateInvalid({ reason: 'normalization_attempt_required' }));
    }

    if (this.#state.validationStartedAt === null) {
      return err(
        stateInvalid({ reason: 'required_timestamp_missing', field: 'validationStartedAt' }),
      );
    }

    if (this.#state.validatedAt === null) {
      return err(stateInvalid({ reason: 'required_timestamp_missing', field: 'validatedAt' }));
    }

    if (this.#state.validationSummary === null) {
      return err(stateInvalid({ reason: 'validation_summary_required' }));
    }

    if (this.#state.archivedAt !== null) {
      return err(stateInvalid({ reason: 'unexpected_timestamp', field: 'archivedAt' }));
    }

    const summary = this.#state.validationSummary;
    const validatedAt = this.#state.validatedAt;
    const integrityError = checkFinalizedSummaryIntegrity(
      summary,
      validatedAt,
      this.#state.sourceContentChecksum,
    );
    if (integrityError !== null) {
      return err(integrityError);
    }

    if (input.archivedAt.compare(validatedAt) < 0) {
      return err(
        stateInvalid({
          reason: 'timestamp_order_invalid',
          field: 'archivedAt',
          operation: 'archive',
        }),
      );
    }

    if (input.archivedAt.compare(this.#state.updatedAt) < 0) {
      return err(
        stateInvalid({
          reason: 'timestamp_order_invalid',
          field: 'archivedAt',
          operation: 'archive',
        }),
      );
    }

    if (this.#state.publishedAt !== null && input.archivedAt.compare(this.#state.publishedAt) < 0) {
      return err(
        stateInvalid({
          reason: 'timestamp_order_invalid',
          field: 'archivedAt',
          operation: 'archive',
        }),
      );
    }

    if (status === 'validated') {
      if (!summary.publicationEligible || summary.blockingFindingCount !== 0) {
        return err(stateInvalid({ reason: 'validation_summary_not_eligible' }));
      }

      if (this.#state.publishedAt !== null) {
        return err(stateInvalid({ reason: 'status_combination_invalid' }));
      }
    } else if (status === 'invalid') {
      if (summary.publicationEligible || summary.blockingFindingCount === 0) {
        return err(stateInvalid({ reason: 'validation_summary_unexpectedly_eligible' }));
      }

      if (this.#state.publishedAt !== null) {
        return err(stateInvalid({ reason: 'status_combination_invalid' }));
      }
    } else if (status === 'published') {
      if (!summary.publicationEligible || summary.blockingFindingCount !== 0) {
        return err(stateInvalid({ reason: 'validation_summary_not_eligible' }));
      }

      if (this.#state.publishedAt === null) {
        return err(stateInvalid({ reason: 'required_timestamp_missing', field: 'publishedAt' }));
      }
    }

    this.#state.status = 'archived';
    this.#state.archivedAt = input.archivedAt;
    this.#state.updatedAt = input.archivedAt;
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
