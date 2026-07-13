import { err, ok, type Result } from '@ai-playbook-engine/shared';

export interface VersionSequenceError {
  readonly code: 'VERSION_SEQUENCE_INVALID';
  readonly message: string;
  readonly details: {
    readonly receivedValue: number;
    readonly minimumValue: number;
    readonly reason: 'not_integer' | 'below_minimum' | 'not_finite';
  };
}

export const versionSequenceMinimum = 1;

export class VersionSequence {
  readonly #value: number;

  private constructor(value: number) {
    this.#value = value;
    Object.freeze(this);
  }

  static create(rawValue: number): Result<VersionSequence, VersionSequenceError> {
    if (!Number.isFinite(rawValue)) {
      return err(versionSequenceInvalid(rawValue, 'not_finite'));
    }

    if (!Number.isInteger(rawValue)) {
      return err(versionSequenceInvalid(rawValue, 'not_integer'));
    }

    if (rawValue < versionSequenceMinimum) {
      return err(versionSequenceInvalid(rawValue, 'below_minimum'));
    }

    return ok(new VersionSequence(rawValue));
  }

  get value(): number {
    return this.#value;
  }

  equals(other: VersionSequence): boolean {
    return this.#value === other.#value;
  }

  compare(other: VersionSequence): number {
    if (this.#value < other.#value) return -1;
    if (this.#value > other.#value) return 1;
    return 0;
  }

  toString(): string {
    return String(this.#value);
  }
}

function versionSequenceInvalid(
  receivedValue: number,
  reason: VersionSequenceError['details']['reason'],
): VersionSequenceError {
  return Object.freeze({
    code: 'VERSION_SEQUENCE_INVALID' as const,
    message: 'The version sequence must be a positive integer.',
    details: Object.freeze({
      receivedValue,
      minimumValue: versionSequenceMinimum,
      reason,
    }),
  });
}
