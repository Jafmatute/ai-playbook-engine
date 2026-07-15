import { err, ok, type Result } from '@ai-playbook-engine/shared';

export const parserCompatibilityVersionMaximumLength = 100;

export type ParserCompatibilityVersionInvalidReason = 'too_long' | 'contains_control_characters';

export interface ParserCompatibilityVersionRequiredError {
  readonly code: 'PARSER_COMPATIBILITY_VERSION_REQUIRED';
  readonly message: string;
  readonly details: Readonly<Record<string, never>>;
}

export interface ParserCompatibilityVersionInvalidError {
  readonly code: 'PARSER_COMPATIBILITY_VERSION_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: ParserCompatibilityVersionInvalidReason;
    readonly maximumLength: number;
    readonly actualLength: number;
  };
}

export type ParserCompatibilityVersionError =
  ParserCompatibilityVersionRequiredError | ParserCompatibilityVersionInvalidError;

function hasControlCharacters(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

export class ParserCompatibilityVersion {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
    Object.freeze(this);
  }

  static create(
    rawValue: string,
  ): Result<ParserCompatibilityVersion, ParserCompatibilityVersionError> {
    if (hasControlCharacters(rawValue)) {
      return err(parserCompatibilityVersionInvalid('contains_control_characters', rawValue.length));
    }

    const value = rawValue.trim();

    if (value.length === 0) {
      return err(parserCompatibilityVersionRequired());
    }

    if (value.length > parserCompatibilityVersionMaximumLength) {
      return err(parserCompatibilityVersionInvalid('too_long', value.length));
    }

    return ok(new ParserCompatibilityVersion(value));
  }

  get value(): string {
    return this.#value;
  }

  toString(): string {
    return this.#value;
  }

  equals(other: ParserCompatibilityVersion): boolean {
    return this.#value === other.#value;
  }
}

function parserCompatibilityVersionRequired(): ParserCompatibilityVersionRequiredError {
  return Object.freeze({
    code: 'PARSER_COMPATIBILITY_VERSION_REQUIRED' as const,
    message: 'A parser compatibility version is required.',
    details: Object.freeze({}),
  });
}

function parserCompatibilityVersionInvalid(
  reason: ParserCompatibilityVersionInvalidReason,
  actualLength: number,
): ParserCompatibilityVersionInvalidError {
  return Object.freeze({
    code: 'PARSER_COMPATIBILITY_VERSION_INVALID' as const,
    message: 'The parser compatibility version is invalid.',
    details: Object.freeze({
      reason,
      maximumLength: parserCompatibilityVersionMaximumLength,
      actualLength,
    }),
  });
}
