import type { Instant } from '../instant.js';
import type { NormalizationAttemptId } from '../identifiers.js';
import type { ContentChecksum } from './content-checksum.js';
import type { NormalizationStatus } from './normalization-status.js';
import type { PlaybookVersionStatus } from './playbook-version-status.js';
import type { ValidationSummary } from './validation-summary.js';
import { stateInvalid } from './playbook-version-errors.js';
import type { PlaybookVersionStateInvalidError } from './playbook-version-errors.js';
import { checkFinalizedSummaryIntegrity } from './playbook-version-invariants.js';

export function isPlaybookVersionStatus(value: string): value is PlaybookVersionStatus {
  return (
    value === 'draft' ||
    value === 'validating' ||
    value === 'validated' ||
    value === 'invalid' ||
    value === 'published' ||
    value === 'archived'
  );
}

export function isNormalizationStatus(value: string): value is NormalizationStatus {
  return value === 'pending' || value === 'running' || value === 'completed' || value === 'failed';
}

interface RestorationValidationInput {
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
}

export function validateRestoredState(
  input: RestorationValidationInput,
): PlaybookVersionStateInvalidError | null {
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
