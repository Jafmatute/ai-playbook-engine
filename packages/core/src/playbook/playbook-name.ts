import { err, ok, type Result } from '@ai-playbook-engine/shared';

export const playbookNameMaximumLength = 160;

export type PlaybookNameError =
  | {
      readonly code: 'PLAYBOOK_NAME_REQUIRED';
      readonly message: string;
      readonly details: Readonly<Record<string, never>>;
    }
  | {
      readonly code: 'PLAYBOOK_NAME_INVALID';
      readonly message: string;
      readonly details: {
        readonly maximumLength: number;
        readonly actualLength: number;
      };
    };

export class PlaybookName {
  readonly #value: string;
  readonly #normalizedValue: string;

  private constructor(value: string, normalizedValue: string) {
    this.#value = value;
    this.#normalizedValue = normalizedValue;
    Object.freeze(this);
  }

  static create(rawValue: string): Result<PlaybookName, PlaybookNameError> {
    const value = rawValue.trim();
    if (value.length === 0) {
      return err(playbookNameRequired());
    }

    if (value.length > playbookNameMaximumLength) {
      return err(playbookNameInvalid(value.length));
    }

    return ok(new PlaybookName(value, value.toLowerCase()));
  }

  get value(): string {
    return this.#value;
  }

  get normalizedValue(): string {
    return this.#normalizedValue;
  }

  equals(other: PlaybookName): boolean {
    return this.#normalizedValue === other.#normalizedValue;
  }
}

function playbookNameRequired(): PlaybookNameError {
  return Object.freeze({
    code: 'PLAYBOOK_NAME_REQUIRED' as const,
    message: 'A playbook name is required.',
    details: Object.freeze({}),
  });
}

function playbookNameInvalid(actualLength: number): PlaybookNameError {
  return Object.freeze({
    code: 'PLAYBOOK_NAME_INVALID' as const,
    message: 'The playbook name exceeds the maximum length.',
    details: Object.freeze({
      maximumLength: playbookNameMaximumLength,
      actualLength,
    }),
  });
}
