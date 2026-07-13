import { err, ok, type Result } from '@ai-playbook-engine/shared';

export const validatorVersionMaximumLength = 100;

export type ValidatorVersionError =
  | {
      readonly code: 'VALIDATOR_VERSION_REQUIRED';
      readonly message: string;
      readonly details: Readonly<Record<string, never>>;
    }
  | {
      readonly code: 'VALIDATOR_VERSION_INVALID';
      readonly message: string;
      readonly details: {
        readonly maximumLength: number;
        readonly actualLength: number;
      };
    };

export class ValidatorVersion {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
    Object.freeze(this);
  }

  static create(rawValue: string): Result<ValidatorVersion, ValidatorVersionError> {
    const value = rawValue.trim();
    if (value.length === 0) {
      return err(validatorVersionRequired());
    }

    if (value.length > validatorVersionMaximumLength) {
      return err(validatorVersionInvalid(value.length));
    }

    return ok(new ValidatorVersion(value));
  }

  get value(): string {
    return this.#value;
  }

  equals(other: ValidatorVersion): boolean {
    return this.#value === other.#value;
  }
}

function validatorVersionRequired(): ValidatorVersionError {
  return Object.freeze({
    code: 'VALIDATOR_VERSION_REQUIRED' as const,
    message: 'A validator version is required.',
    details: Object.freeze({}),
  });
}

function validatorVersionInvalid(actualLength: number): ValidatorVersionError {
  return Object.freeze({
    code: 'VALIDATOR_VERSION_INVALID' as const,
    message: 'The validator version exceeds the maximum length.',
    details: Object.freeze({
      maximumLength: validatorVersionMaximumLength,
      actualLength,
    }),
  });
}
