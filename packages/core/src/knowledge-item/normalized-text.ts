import { err, ok, type Result } from '@ai-playbook-engine/shared';

const MAX_NORMALIZED_TEXT_LENGTH = 1_000_000;

// eslint-disable-next-line no-control-regex
const DISALLOWED_CONTROL_CHARACTER_PATTERN = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;

export type NormalizedTextInvalidReason =
  'empty' | 'too_long' | 'contains_disallowed_control_character';

export interface NormalizedTextError {
  readonly code: 'NORMALIZED_TEXT_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: NormalizedTextInvalidReason;
  };
}

export class NormalizedText {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
    Object.freeze(this);
  }

  static create(rawValue: string): Result<NormalizedText, NormalizedTextError> {
    const value = rawValue.trim();

    if (value.length === 0) {
      return err(normalizedTextInvalid('empty'));
    }

    if (value.length > MAX_NORMALIZED_TEXT_LENGTH) {
      return err(normalizedTextInvalid('too_long'));
    }

    if (DISALLOWED_CONTROL_CHARACTER_PATTERN.test(value)) {
      return err(normalizedTextInvalid('contains_disallowed_control_character'));
    }

    return ok(new NormalizedText(value));
  }

  get value(): string {
    return this.#value;
  }

  equals(other: NormalizedText): boolean {
    return this.#value === other.#value;
  }

  toString(): string {
    return this.#value;
  }
}

function normalizedTextInvalid(reason: NormalizedTextInvalidReason): NormalizedTextError {
  return Object.freeze({
    code: 'NORMALIZED_TEXT_INVALID' as const,
    message: 'The normalized text is invalid.',
    details: Object.freeze({ reason }),
  });
}
