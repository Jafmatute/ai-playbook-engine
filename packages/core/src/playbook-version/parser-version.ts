import { err, ok, type Result } from '@ai-playbook-engine/shared';

export const parserVersionMaximumLength = 100;

export type ParserVersionError =
  | {
      readonly code: 'PARSER_VERSION_REQUIRED';
      readonly message: string;
      readonly details: Readonly<Record<string, never>>;
    }
  | {
      readonly code: 'PARSER_VERSION_INVALID';
      readonly message: string;
      readonly details: {
        readonly maximumLength: number;
        readonly actualLength: number;
      };
    };

export class ParserVersion {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
    Object.freeze(this);
  }

  static create(rawValue: string): Result<ParserVersion, ParserVersionError> {
    const value = rawValue.trim();
    if (value.length === 0) {
      return err(parserVersionRequired());
    }

    if (value.length > parserVersionMaximumLength) {
      return err(parserVersionInvalid(value.length));
    }

    return ok(new ParserVersion(value));
  }

  get value(): string {
    return this.#value;
  }

  equals(other: ParserVersion): boolean {
    return this.#value === other.#value;
  }
}

function parserVersionRequired(): ParserVersionError {
  return Object.freeze({
    code: 'PARSER_VERSION_REQUIRED' as const,
    message: 'A parser version is required.',
    details: Object.freeze({}),
  });
}

function parserVersionInvalid(actualLength: number): ParserVersionError {
  return Object.freeze({
    code: 'PARSER_VERSION_INVALID' as const,
    message: 'The parser version exceeds the maximum length.',
    details: Object.freeze({
      maximumLength: parserVersionMaximumLength,
      actualLength,
    }),
  });
}
