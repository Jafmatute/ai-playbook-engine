import { err, ok, type Result } from '@ai-playbook-engine/shared';

const MAX_SOURCE_STABLE_KEY_LENGTH = 512;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER_PATTERN = /[\x00-\x1f\x7f]/;

export type SourceStableKeyInvalidReason = 'empty' | 'too_long' | 'contains_control_character';

export interface SourceStableKeyError {
  readonly code: 'SOURCE_STABLE_KEY_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: SourceStableKeyInvalidReason;
  };
}

export class SourceStableKey {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
    Object.freeze(this);
  }

  static create(rawValue: string): Result<SourceStableKey, SourceStableKeyError> {
    const value = rawValue.trim();

    if (value.length === 0) {
      return err(sourceStableKeyInvalid('empty'));
    }

    if (value.length > MAX_SOURCE_STABLE_KEY_LENGTH) {
      return err(sourceStableKeyInvalid('too_long'));
    }

    if (CONTROL_CHARACTER_PATTERN.test(value)) {
      return err(sourceStableKeyInvalid('contains_control_character'));
    }

    return ok(new SourceStableKey(value));
  }

  get value(): string {
    return this.#value;
  }

  equals(other: SourceStableKey): boolean {
    return this.#value === other.#value;
  }

  toString(): string {
    return this.#value;
  }
}

function sourceStableKeyInvalid(reason: SourceStableKeyInvalidReason): SourceStableKeyError {
  return Object.freeze({
    code: 'SOURCE_STABLE_KEY_INVALID' as const,
    message: 'The source stable key is invalid.',
    details: Object.freeze({ reason }),
  });
}
