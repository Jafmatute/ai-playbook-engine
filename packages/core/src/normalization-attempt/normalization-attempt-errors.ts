export type NormalizationAttemptStateInvalidReason =
  | 'unknown_status'
  | 'required_timestamp_missing'
  | 'unexpected_timestamp'
  | 'timestamp_before_started';

export interface NormalizationAttemptStateInvalidError {
  readonly code: 'NORMALIZATION_ATTEMPT_STATE_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: NormalizationAttemptStateInvalidReason;
    readonly field?: string;
    readonly currentStatus?: string;
  };
}

export type NormalizationAttemptCreationError = NormalizationAttemptStateInvalidError;

export type NormalizationAttemptRestorationError = NormalizationAttemptStateInvalidError;

function freezeDetails<T extends Record<string, unknown>>(details: T): T {
  return Object.freeze({ ...details }) as T;
}

export function stateInvalid(
  details: NormalizationAttemptStateInvalidError['details'],
): NormalizationAttemptStateInvalidError {
  return Object.freeze({
    code: 'NORMALIZATION_ATTEMPT_STATE_INVALID' as const,
    message: 'The normalization attempt state is inconsistent.',
    details: freezeDetails(details),
  });
}

import type { NormalizationAttemptStatus } from './normalization-attempt-status.js';

export type NormalizationAttemptOperation = 'complete';

export interface NormalizationAttemptNotRunningError {
  readonly code: 'NORMALIZATION_ATTEMPT_NOT_RUNNING';
  readonly message: string;
  readonly details: {
    readonly operation: NormalizationAttemptOperation;
    readonly currentStatus: NormalizationAttemptStatus;
  };
}

export interface NormalizationAttemptTimestampInvalidError {
  readonly code: 'NORMALIZATION_ATTEMPT_TIMESTAMP_INVALID';
  readonly message: string;
  readonly details: {
    readonly operation: NormalizationAttemptOperation;
    readonly field: 'completedAt';
    readonly reason: 'timestamp_before_started';
  };
}

export type NormalizationAttemptTransitionError =
  NormalizationAttemptNotRunningError | NormalizationAttemptTimestampInvalidError;

export function notRunning(
  details: NormalizationAttemptNotRunningError['details'],
): NormalizationAttemptNotRunningError {
  return Object.freeze({
    code: 'NORMALIZATION_ATTEMPT_NOT_RUNNING' as const,
    message: 'The normalization attempt must be running to perform this operation.',
    details: freezeDetails(details),
  });
}

export function timestampInvalid(
  details: NormalizationAttemptTimestampInvalidError['details'],
): NormalizationAttemptTimestampInvalidError {
  return Object.freeze({
    code: 'NORMALIZATION_ATTEMPT_TIMESTAMP_INVALID' as const,
    message: 'The normalization attempt timestamp is invalid for this transition.',
    details: freezeDetails(details),
  });
}
