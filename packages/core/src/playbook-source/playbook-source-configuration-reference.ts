import { err, ok, type Result } from '@ai-playbook-engine/shared';

const MAX_CONFIGURATION_REFERENCE_LENGTH = 512;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER_PATTERN = /[\x00-\x1f\x7f]/;

export type PlaybookSourceConfigurationReferenceField = 'value';

export type PlaybookSourceConfigurationReferenceInvalidReason =
  'empty' | 'too_long' | 'contains_control_character';

export interface PlaybookSourceConfigurationReferenceError {
  readonly code: 'PLAYBOOK_SOURCE_CONFIGURATION_REFERENCE_INVALID';
  readonly message: string;
  readonly details: {
    readonly field: PlaybookSourceConfigurationReferenceField;
    readonly reason: PlaybookSourceConfigurationReferenceInvalidReason;
  };
}

export class PlaybookSourceConfigurationReference {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
    Object.freeze(this);
  }

  static create(
    rawValue: string,
  ): Result<PlaybookSourceConfigurationReference, PlaybookSourceConfigurationReferenceError> {
    const value = rawValue.trim();

    if (value.length === 0) {
      return err(configRefInvalid('empty'));
    }

    if (value.length > MAX_CONFIGURATION_REFERENCE_LENGTH) {
      return err(configRefInvalid('too_long'));
    }

    if (CONTROL_CHARACTER_PATTERN.test(value)) {
      return err(configRefInvalid('contains_control_character'));
    }

    return ok(new PlaybookSourceConfigurationReference(value));
  }

  get value(): string {
    return this.#value;
  }

  toString(): string {
    return this.#value;
  }

  equals(other: PlaybookSourceConfigurationReference): boolean {
    return this.#value === other.#value;
  }
}

function configRefInvalid(
  reason: PlaybookSourceConfigurationReferenceInvalidReason,
): PlaybookSourceConfigurationReferenceError {
  return Object.freeze({
    code: 'PLAYBOOK_SOURCE_CONFIGURATION_REFERENCE_INVALID' as const,
    message: 'The playbook source configuration reference is invalid.',
    details: Object.freeze({ field: 'value' as const, reason }),
  });
}
