import type { SynchronizationRunStatus } from './synchronization-run-status.js';

export type SynchronizationRunTransitionOperation = 'start' | 'fail' | 'complete';

export interface SynchronizationRunTransitionNotAllowedError {
  readonly code: 'SYNCHRONIZATION_RUN_TRANSITION_NOT_ALLOWED';
  readonly message: string;
  readonly details: {
    readonly operation: SynchronizationRunTransitionOperation;
    readonly currentStatus: SynchronizationRunStatus;
    readonly expectedStatus: 'pending' | 'running';
  };
}

export interface SynchronizationRunTimestampInvalidError {
  readonly code: 'SYNCHRONIZATION_RUN_TIMESTAMP_INVALID';
  readonly message: string;
  readonly details: {
    readonly operation: SynchronizationRunTransitionOperation;
    readonly field: 'startedAt' | 'failedAt' | 'completedAt';
    readonly reason: 'timestamp_before_created' | 'timestamp_before_started';
  };
}

export type SynchronizationRunTransitionError =
  SynchronizationRunTransitionNotAllowedError | SynchronizationRunTimestampInvalidError;

export function transitionNotAllowed(
  details: SynchronizationRunTransitionNotAllowedError['details'],
): SynchronizationRunTransitionNotAllowedError {
  return Object.freeze({
    code: 'SYNCHRONIZATION_RUN_TRANSITION_NOT_ALLOWED' as const,
    message: 'The synchronization run transition is not allowed.',
    details: Object.freeze({ ...details }),
  });
}

export function timestampInvalid(
  details: SynchronizationRunTimestampInvalidError['details'],
): SynchronizationRunTimestampInvalidError {
  return Object.freeze({
    code: 'SYNCHRONIZATION_RUN_TIMESTAMP_INVALID' as const,
    message: 'The synchronization run timestamp is invalid.',
    details: Object.freeze({ ...details }),
  });
}

export type SynchronizationRunStateInvalidReason =
  | 'PENDING_RUN_CANNOT_HAVE_STARTED_AT'
  | 'PENDING_RUN_CANNOT_HAVE_COMPLETED_AT'
  | 'PENDING_RUN_CANNOT_HAVE_SNAPSHOT'
  | 'PENDING_RUN_CANNOT_HAVE_FAILURE'
  | 'RUNNING_RUN_REQUIRES_STARTED_AT'
  | 'RUNNING_RUN_CANNOT_HAVE_COMPLETED_AT'
  | 'RUNNING_RUN_CANNOT_HAVE_SNAPSHOT'
  | 'RUNNING_RUN_CANNOT_HAVE_FAILURE'
  | 'COMPLETED_RUN_REQUIRES_STARTED_AT'
  | 'COMPLETED_RUN_REQUIRES_COMPLETED_AT'
  | 'COMPLETED_RUN_REQUIRES_SNAPSHOT'
  | 'COMPLETED_RUN_CANNOT_HAVE_FAILURE'
  | 'FAILED_RUN_REQUIRES_STARTED_AT'
  | 'FAILED_RUN_REQUIRES_COMPLETED_AT'
  | 'FAILED_RUN_CANNOT_HAVE_SNAPSHOT'
  | 'FAILED_RUN_REQUIRES_FAILURE'
  | 'STARTED_AT_BEFORE_CREATED_AT'
  | 'COMPLETED_AT_BEFORE_STARTED_AT'
  | 'UNKNOWN_SYNCHRONIZATION_RUN_STATUS';

export interface SynchronizationRunStateInvalidError {
  readonly code: 'SYNCHRONIZATION_RUN_STATE_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: SynchronizationRunStateInvalidReason;
  };
}

export type SynchronizationRunRestorationError = SynchronizationRunStateInvalidError;

export function stateInvalid(
  reason: SynchronizationRunStateInvalidReason,
): SynchronizationRunStateInvalidError {
  return Object.freeze({
    code: 'SYNCHRONIZATION_RUN_STATE_INVALID' as const,
    message: 'The synchronization run state is invalid.',
    details: Object.freeze({ reason }),
  });
}
