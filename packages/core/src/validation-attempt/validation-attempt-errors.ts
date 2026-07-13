export type ValidationAttemptStateInvalidReason =
  | 'unknown_status'
  | 'required_summary_missing'
  | 'unexpected_summary'
  | 'summary_attempt_mismatch'
  | 'summary_result_mismatch'
  | 'summary_completed_before_started';

export interface ValidationAttemptStateInvalidError {
  readonly code: 'VALIDATION_ATTEMPT_STATE_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: ValidationAttemptStateInvalidReason;
    readonly field?: string;
    readonly currentStatus?: string;
  };
}

export type ValidationAttemptCreationError = ValidationAttemptStateInvalidError;

export type ValidationAttemptRestorationError = ValidationAttemptStateInvalidError;

function freezeDetails<T extends Record<string, unknown>>(details: T): T {
  return Object.freeze({ ...details }) as T;
}

export function stateInvalid(
  details: ValidationAttemptStateInvalidError['details'],
): ValidationAttemptStateInvalidError {
  return Object.freeze({
    code: 'VALIDATION_ATTEMPT_STATE_INVALID' as const,
    message: 'The validation attempt state is inconsistent.',
    details: freezeDetails(details),
  });
}

import type { ValidationAttemptStatus } from './validation-attempt-status.js';

export type ValidationAttemptOperation = 'markValidated';

export interface ValidationAttemptNotRunningError {
  readonly code: 'VALIDATION_ATTEMPT_NOT_RUNNING';
  readonly message: string;
  readonly details: {
    readonly operation: ValidationAttemptOperation;
    readonly currentStatus: ValidationAttemptStatus;
  };
}

export type ValidationAttemptSummaryInvalidReason =
  | 'summary_attempt_mismatch'
  | 'summary_completed_before_started'
  | 'summary_not_publication_eligible';

export interface ValidationAttemptSummaryInvalidError {
  readonly code: 'VALIDATION_ATTEMPT_SUMMARY_INVALID';
  readonly message: string;
  readonly details: {
    readonly operation: ValidationAttemptOperation;
    readonly field: 'validationSummary';
    readonly reason: ValidationAttemptSummaryInvalidReason;
  };
}

export type ValidationAttemptTransitionError =
  ValidationAttemptNotRunningError | ValidationAttemptSummaryInvalidError;

export function notRunning(
  details: ValidationAttemptNotRunningError['details'],
): ValidationAttemptNotRunningError {
  return Object.freeze({
    code: 'VALIDATION_ATTEMPT_NOT_RUNNING' as const,
    message: 'The validation attempt must be running to perform this operation.',
    details: freezeDetails(details),
  });
}

export function summaryInvalid(
  details: ValidationAttemptSummaryInvalidError['details'],
): ValidationAttemptSummaryInvalidError {
  return Object.freeze({
    code: 'VALIDATION_ATTEMPT_SUMMARY_INVALID' as const,
    message: 'The validation summary is invalid for this transition.',
    details: freezeDetails(details),
  });
}
