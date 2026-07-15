import type { SynchronizationRunStatus } from './synchronization-run-status.js';

export type SynchronizationRunTransitionOperation = 'start';

export interface SynchronizationRunTransitionNotAllowedError {
  readonly code: 'SYNCHRONIZATION_RUN_TRANSITION_NOT_ALLOWED';
  readonly message: string;
  readonly details: {
    readonly operation: SynchronizationRunTransitionOperation;
    readonly currentStatus: SynchronizationRunStatus;
    readonly expectedStatus: 'pending';
  };
}

export interface SynchronizationRunTimestampInvalidError {
  readonly code: 'SYNCHRONIZATION_RUN_TIMESTAMP_INVALID';
  readonly message: string;
  readonly details: {
    readonly operation: SynchronizationRunTransitionOperation;
    readonly field: 'startedAt';
    readonly reason: 'timestamp_before_created';
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
