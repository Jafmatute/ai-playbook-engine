export type Result<TValue, TError> =
  | {
      readonly success: true;
      readonly value: TValue;
    }
  | {
      readonly success: false;
      readonly error: TError;
    };

export function ok<TValue>(value: TValue): Result<TValue, never> {
  return Object.freeze({ success: true as const, value });
}

export function err<TError>(error: TError): Result<never, TError> {
  return Object.freeze({ success: false as const, error });
}
