import { err, ok, type Result } from '@ai-playbook-engine/shared';

export type StorageReferenceInvalidReason = 'empty' | 'too_long' | 'contains_control_characters';

export interface StorageReferenceInvalidError {
  readonly code: 'STORAGE_REFERENCE_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: StorageReferenceInvalidReason;
  };
}

interface StorageReferenceState {
  readonly value: string;
}

const STORAGE_REFERENCE_MAX_LENGTH = 1024;

function hasControlCharacters(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

export class StorageReference {
  readonly #state: StorageReferenceState;

  private constructor(state: StorageReferenceState) {
    this.#state = Object.freeze({ ...state });
    Object.freeze(this);
  }

  static create(value: string): Result<StorageReference, StorageReferenceInvalidError> {
    if (hasControlCharacters(value)) {
      return err(storageReferenceInvalid('contains_control_characters'));
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return err(storageReferenceInvalid('empty'));
    }

    if (trimmed.length > STORAGE_REFERENCE_MAX_LENGTH) {
      return err(storageReferenceInvalid('too_long'));
    }

    return ok(
      new StorageReference({
        value: trimmed,
      }),
    );
  }

  get value(): string {
    return this.#state.value;
  }

  toString(): string {
    return this.#state.value;
  }

  equals(other: StorageReference): boolean {
    return this.#state.value === other.#state.value;
  }
}

function storageReferenceInvalid(
  reason: StorageReferenceInvalidReason,
): StorageReferenceInvalidError {
  return Object.freeze({
    code: 'STORAGE_REFERENCE_INVALID' as const,
    message: 'The storage reference is invalid.',
    details: Object.freeze({
      reason,
    }),
  });
}
