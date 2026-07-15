import { err, ok, type Result } from '@ai-playbook-engine/shared';

const MAX_EXTERNAL_ROOT_REFERENCE_LENGTH = 512;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER_PATTERN = /[\x00-\x1f\x7f]/;

export type PlaybookSourceExternalRootReferenceField = 'value';

export type PlaybookSourceExternalRootReferenceInvalidReason =
  'empty' | 'too_long' | 'contains_control_character';

export interface PlaybookSourceExternalRootReferenceError {
  readonly code: 'PLAYBOOK_SOURCE_EXTERNAL_ROOT_REFERENCE_INVALID';
  readonly message: string;
  readonly details: {
    readonly field: PlaybookSourceExternalRootReferenceField;
    readonly reason: PlaybookSourceExternalRootReferenceInvalidReason;
  };
}

export class PlaybookSourceExternalRootReference {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
    Object.freeze(this);
  }

  static create(
    rawValue: string,
  ): Result<PlaybookSourceExternalRootReference, PlaybookSourceExternalRootReferenceError> {
    const value = rawValue.trim();

    if (value.length === 0) {
      return err(externalRootRefInvalid('empty'));
    }

    if (value.length > MAX_EXTERNAL_ROOT_REFERENCE_LENGTH) {
      return err(externalRootRefInvalid('too_long'));
    }

    if (CONTROL_CHARACTER_PATTERN.test(value)) {
      return err(externalRootRefInvalid('contains_control_character'));
    }

    return ok(new PlaybookSourceExternalRootReference(value));
  }

  get value(): string {
    return this.#value;
  }

  toString(): string {
    return this.#value;
  }

  equals(other: PlaybookSourceExternalRootReference): boolean {
    return this.#value === other.#value;
  }
}

function externalRootRefInvalid(
  reason: PlaybookSourceExternalRootReferenceInvalidReason,
): PlaybookSourceExternalRootReferenceError {
  return Object.freeze({
    code: 'PLAYBOOK_SOURCE_EXTERNAL_ROOT_REFERENCE_INVALID' as const,
    message: 'The playbook source external root reference is invalid.',
    details: Object.freeze({ field: 'value' as const, reason }),
  });
}
