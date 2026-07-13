import type { NormalizationStatus } from './normalization-status.js';
import type { PlaybookVersionStatus } from './playbook-version-status.js';

export type PlaybookVersionOperation =
  | 'begin_normalization'
  | 'complete_normalization'
  | 'fail_normalization'
  | 'begin_validation'
  | 'mark_validated'
  | 'mark_invalid'
  | 'publish'
  | 'archive';

export type PlaybookVersionOperationNotAllowedReason =
  'version_not_draft' | 'normalization_already_completed' | 'version_not_finalized';

export type PlaybookVersionNotPublishableReason =
  | 'version_not_validated'
  | 'version_invalid'
  | 'version_archived'
  | 'validation_summary_not_eligible'
  | 'validation_checksum_mismatch'
  | 'validation_completion_mismatch';

export type PlaybookVersionValidationSummaryInvalidReason =
  | 'validation_summary_not_eligible'
  | 'validation_summary_unexpectedly_eligible'
  | 'validation_checksum_mismatch'
  | 'validation_completion_mismatch';

export type PlaybookVersionStateInvalidReason =
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

export interface PlaybookVersionStateInvalidError {
  readonly code: 'PLAYBOOK_VERSION_STATE_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: PlaybookVersionStateInvalidReason;
    readonly field?: string;
    readonly currentStatus?: string;
    readonly normalizationStatus?: string;
    readonly operation?: string;
  };
}

export interface PlaybookVersionAlreadyPublishedError {
  readonly code: 'PLAYBOOK_VERSION_ALREADY_PUBLISHED';
  readonly message: string;
  readonly details: {
    readonly operation: string;
    readonly currentStatus: PlaybookVersionStatus;
  };
}

export interface PlaybookVersionNotPublishableError {
  readonly code: 'PLAYBOOK_VERSION_NOT_PUBLISHABLE';
  readonly message: string;
  readonly details: {
    readonly operation: string;
    readonly currentStatus?: PlaybookVersionStatus;
    readonly reason: PlaybookVersionNotPublishableReason;
    readonly blockingFindingCount?: number;
  };
}

export interface PlaybookVersionAlreadyArchivedError {
  readonly code: 'PLAYBOOK_VERSION_ALREADY_ARCHIVED';
  readonly message: string;
  readonly details: {
    readonly operation: string;
    readonly currentStatus: PlaybookVersionStatus;
  };
}

export type PlaybookVersionCreationError = PlaybookVersionStateInvalidError;

export type PlaybookVersionRestorationError = PlaybookVersionStateInvalidError;

export interface PlaybookVersionOperationNotAllowedError {
  readonly code: 'PLAYBOOK_VERSION_OPERATION_NOT_ALLOWED';
  readonly message: string;
  readonly details: {
    readonly operation: PlaybookVersionOperation;
    readonly reason: PlaybookVersionOperationNotAllowedReason;
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
    readonly operation: PlaybookVersionOperation;
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

export interface PlaybookVersionNormalizationIncompleteError {
  readonly code: 'PLAYBOOK_VERSION_NORMALIZATION_INCOMPLETE';
  readonly message: string;
  readonly details: {
    readonly operation: PlaybookVersionOperation;
    readonly normalizationStatus: NormalizationStatus;
  };
}

export interface PlaybookVersionValidationAlreadyStartedError {
  readonly code: 'PLAYBOOK_VERSION_VALIDATION_ALREADY_STARTED';
  readonly message: string;
  readonly details: {
    readonly operation: PlaybookVersionOperation;
    readonly currentStatus: PlaybookVersionStatus;
  };
}

export interface PlaybookVersionNotValidatingError {
  readonly code: 'PLAYBOOK_VERSION_NOT_VALIDATING';
  readonly message: string;
  readonly details: {
    readonly operation: PlaybookVersionOperation;
    readonly currentStatus: PlaybookVersionStatus;
  };
}

export interface PlaybookVersionValidationSummaryInvalidError {
  readonly code: 'PLAYBOOK_VERSION_VALIDATION_SUMMARY_INVALID';
  readonly message: string;
  readonly details: {
    readonly operation: PlaybookVersionOperation;
    readonly reason: PlaybookVersionValidationSummaryInvalidReason;
    readonly blockingFindingCount?: number;
  };
}

export type PlaybookVersionTransitionError =
  | PlaybookVersionStateInvalidError
  | PlaybookVersionOperationNotAllowedError
  | PlaybookVersionNormalizationAlreadyRunningError
  | PlaybookVersionNormalizationNotRunningError
  | PlaybookVersionNormalizationAttemptInvalidError
  | PlaybookVersionNormalizationIncompleteError
  | PlaybookVersionValidationAlreadyStartedError
  | PlaybookVersionNotValidatingError
  | PlaybookVersionValidationSummaryInvalidError
  | PlaybookVersionAlreadyPublishedError
  | PlaybookVersionNotPublishableError
  | PlaybookVersionAlreadyArchivedError;

function freezeDetails<T extends Record<string, unknown>>(details: T): T {
  return Object.freeze({ ...details }) as T;
}

export function stateInvalid(
  details: PlaybookVersionStateInvalidError['details'],
): PlaybookVersionStateInvalidError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_STATE_INVALID' as const,
    message: 'The playbook version state is inconsistent.',
    details: freezeDetails(details),
  });
}

export function operationNotAllowed(
  details: PlaybookVersionOperationNotAllowedError['details'],
): PlaybookVersionOperationNotAllowedError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_OPERATION_NOT_ALLOWED' as const,
    message: 'The operation is not allowed for the current version state.',
    details: freezeDetails(details),
  });
}

export function normalizationAlreadyRunning(): PlaybookVersionNormalizationAlreadyRunningError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_NORMALIZATION_ALREADY_RUNNING' as const,
    message: 'Normalization is already running.',
    details: Object.freeze({}),
  });
}

export function normalizationNotRunning(
  details: PlaybookVersionNormalizationNotRunningError['details'],
): PlaybookVersionNormalizationNotRunningError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_NORMALIZATION_NOT_RUNNING' as const,
    message: 'Normalization must be running to perform this operation.',
    details: freezeDetails(details),
  });
}

export function normalizationAttemptInvalid(
  details: PlaybookVersionNormalizationAttemptInvalidError['details'],
): PlaybookVersionNormalizationAttemptInvalidError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_NORMALIZATION_ATTEMPT_INVALID' as const,
    message: 'A new normalization attempt must use a different identifier.',
    details: freezeDetails(details),
  });
}

export function normalizationIncomplete(
  normalizationStatus: NormalizationStatus,
): PlaybookVersionNormalizationIncompleteError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_NORMALIZATION_INCOMPLETE' as const,
    message: 'Normalization must be completed before validation can begin.',
    details: freezeDetails({
      operation: 'begin_validation' as PlaybookVersionOperation,
      normalizationStatus,
    }),
  });
}

export function validationAlreadyStarted(): PlaybookVersionValidationAlreadyStartedError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_VALIDATION_ALREADY_STARTED' as const,
    message: 'Validation is already in progress.',
    details: freezeDetails({
      operation: 'begin_validation' as PlaybookVersionOperation,
      currentStatus: 'validating' as PlaybookVersionStatus,
    }),
  });
}

export function notValidating(
  details: PlaybookVersionNotValidatingError['details'],
): PlaybookVersionNotValidatingError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_NOT_VALIDATING' as const,
    message: 'The version must be in validating status.',
    details: freezeDetails(details),
  });
}

export function validationSummaryInvalid(
  details: PlaybookVersionValidationSummaryInvalidError['details'],
): PlaybookVersionValidationSummaryInvalidError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_VALIDATION_SUMMARY_INVALID' as const,
    message: 'The validation summary is not valid for this transition.',
    details: freezeDetails(details),
  });
}

export function alreadyPublished(): PlaybookVersionAlreadyPublishedError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_ALREADY_PUBLISHED' as const,
    message: 'The playbook version is already published.',
    details: freezeDetails({
      operation: 'publish' as PlaybookVersionOperation,
      currentStatus: 'published' as PlaybookVersionStatus,
    }),
  });
}

export function notPublishable(
  details: PlaybookVersionNotPublishableError['details'],
): PlaybookVersionNotPublishableError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_NOT_PUBLISHABLE' as const,
    message: 'The playbook version is not publishable.',
    details: freezeDetails(details),
  });
}

export function alreadyArchived(): PlaybookVersionAlreadyArchivedError {
  return Object.freeze({
    code: 'PLAYBOOK_VERSION_ALREADY_ARCHIVED' as const,
    message: 'The playbook version is already archived.',
    details: freezeDetails({
      operation: 'archive' as PlaybookVersionOperation,
      currentStatus: 'archived' as PlaybookVersionStatus,
    }),
  });
}
