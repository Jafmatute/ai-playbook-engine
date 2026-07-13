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
