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
