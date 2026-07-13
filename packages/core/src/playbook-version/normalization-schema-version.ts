import { err, ok, type Result } from '@ai-playbook-engine/shared';

export const normalizationSchemaVersionMaximumLength = 100;

export type NormalizationSchemaVersionError =
  | {
      readonly code: 'NORMALIZATION_SCHEMA_VERSION_REQUIRED';
      readonly message: string;
      readonly details: Readonly<Record<string, never>>;
    }
  | {
      readonly code: 'NORMALIZATION_SCHEMA_VERSION_INVALID';
      readonly message: string;
      readonly details: {
        readonly maximumLength: number;
        readonly actualLength: number;
      };
    };

export class NormalizationSchemaVersion {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
    Object.freeze(this);
  }

  static create(
    rawValue: string,
  ): Result<NormalizationSchemaVersion, NormalizationSchemaVersionError> {
    const value = rawValue.trim();
    if (value.length === 0) {
      return err(normalizationSchemaVersionRequired());
    }

    if (value.length > normalizationSchemaVersionMaximumLength) {
      return err(normalizationSchemaVersionInvalid(value.length));
    }

    return ok(new NormalizationSchemaVersion(value));
  }

  get value(): string {
    return this.#value;
  }

  equals(other: NormalizationSchemaVersion): boolean {
    return this.#value === other.#value;
  }
}

function normalizationSchemaVersionRequired(): NormalizationSchemaVersionError {
  return Object.freeze({
    code: 'NORMALIZATION_SCHEMA_VERSION_REQUIRED' as const,
    message: 'A normalization schema version is required.',
    details: Object.freeze({}),
  });
}

function normalizationSchemaVersionInvalid(actualLength: number): NormalizationSchemaVersionError {
  return Object.freeze({
    code: 'NORMALIZATION_SCHEMA_VERSION_INVALID' as const,
    message: 'The normalization schema version exceeds the maximum length.',
    details: Object.freeze({
      maximumLength: normalizationSchemaVersionMaximumLength,
      actualLength,
    }),
  });
}
