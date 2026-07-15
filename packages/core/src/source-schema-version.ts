import { err, ok, type Result } from '@ai-playbook-engine/shared';

export const sourceSchemaVersionMaximumLength = 100;

export type SourceSchemaVersionInvalidReason = 'too_long' | 'contains_control_characters';

export interface SourceSchemaVersionRequiredError {
  readonly code: 'SOURCE_SCHEMA_VERSION_REQUIRED';
  readonly message: string;
  readonly details: Readonly<Record<string, never>>;
}

export interface SourceSchemaVersionInvalidError {
  readonly code: 'SOURCE_SCHEMA_VERSION_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: SourceSchemaVersionInvalidReason;
    readonly maximumLength: number;
    readonly actualLength: number;
  };
}

export type SourceSchemaVersionError =
  SourceSchemaVersionRequiredError | SourceSchemaVersionInvalidError;

function hasControlCharacters(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

export class SourceSchemaVersion {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
    Object.freeze(this);
  }

  static create(rawValue: string): Result<SourceSchemaVersion, SourceSchemaVersionError> {
    if (hasControlCharacters(rawValue)) {
      return err(sourceSchemaVersionInvalid('contains_control_characters', rawValue.length));
    }

    const value = rawValue.trim();

    if (value.length === 0) {
      return err(sourceSchemaVersionRequired());
    }

    if (value.length > sourceSchemaVersionMaximumLength) {
      return err(sourceSchemaVersionInvalid('too_long', value.length));
    }

    return ok(new SourceSchemaVersion(value));
  }

  get value(): string {
    return this.#value;
  }

  toString(): string {
    return this.#value;
  }

  equals(other: SourceSchemaVersion): boolean {
    return this.#value === other.#value;
  }
}

function sourceSchemaVersionRequired(): SourceSchemaVersionRequiredError {
  return Object.freeze({
    code: 'SOURCE_SCHEMA_VERSION_REQUIRED' as const,
    message: 'A source schema version is required.',
    details: Object.freeze({}),
  });
}

function sourceSchemaVersionInvalid(
  reason: SourceSchemaVersionInvalidReason,
  actualLength: number,
): SourceSchemaVersionInvalidError {
  return Object.freeze({
    code: 'SOURCE_SCHEMA_VERSION_INVALID' as const,
    message: 'The source schema version is invalid.',
    details: Object.freeze({
      reason,
      maximumLength: sourceSchemaVersionMaximumLength,
      actualLength,
    }),
  });
}
