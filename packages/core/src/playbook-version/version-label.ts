import { err, ok, type Result } from '@ai-playbook-engine/shared';

export const versionLabelMaximumLength = 200;

export type VersionLabelError =
  | {
      readonly code: 'VERSION_LABEL_REQUIRED';
      readonly message: string;
      readonly details: Readonly<Record<string, never>>;
    }
  | {
      readonly code: 'VERSION_LABEL_INVALID';
      readonly message: string;
      readonly details: {
        readonly maximumLength: number;
        readonly actualLength: number;
      };
    };

export class VersionLabel {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
    Object.freeze(this);
  }

  static create(rawValue: string): Result<VersionLabel, VersionLabelError> {
    const value = rawValue.trim();
    if (value.length === 0) {
      return err(versionLabelRequired());
    }

    if (value.length > versionLabelMaximumLength) {
      return err(versionLabelInvalid(value.length));
    }

    return ok(new VersionLabel(value));
  }

  get value(): string {
    return this.#value;
  }

  equals(other: VersionLabel): boolean {
    return this.#value === other.#value;
  }
}

function versionLabelRequired(): VersionLabelError {
  return Object.freeze({
    code: 'VERSION_LABEL_REQUIRED' as const,
    message: 'A version label is required.',
    details: Object.freeze({}),
  });
}

function versionLabelInvalid(actualLength: number): VersionLabelError {
  return Object.freeze({
    code: 'VERSION_LABEL_INVALID' as const,
    message: 'The version label exceeds the maximum length.',
    details: Object.freeze({
      maximumLength: versionLabelMaximumLength,
      actualLength,
    }),
  });
}
