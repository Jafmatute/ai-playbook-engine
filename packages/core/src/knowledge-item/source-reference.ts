import { err, ok, type Result } from '@ai-playbook-engine/shared';

const MAX_PROVIDER_LENGTH = 64;
const MAX_OBJECT_TYPE_LENGTH = 64;
const MAX_EXTERNAL_ID_LENGTH = 512;

const PROVIDER_PATTERN = /^[a-z][a-z0-9_-]*$/;

const OBJECT_TYPE_PATTERN = /^[a-z][a-z0-9_-]*$/;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER_PATTERN = /[\x00-\x1f\x7f]/;

interface SourceReferenceState {
  readonly provider: string;
  readonly objectType: string;
  readonly externalId: string;
}

export type SourceReferenceField = 'provider' | 'objectType' | 'externalId';

export type SourceReferenceInvalidReason = 'empty' | 'too_long' | 'invalid_format';

export interface SourceReferenceError {
  readonly code: 'SOURCE_REFERENCE_INVALID';
  readonly message: string;
  readonly details: {
    readonly field: SourceReferenceField;
    readonly reason: SourceReferenceInvalidReason;
  };
}

export interface CreateSourceReferenceInput {
  readonly provider: string;
  readonly objectType: string;
  readonly externalId: string;
}

function validateField(
  value: string,
  maxLength: number,
  pattern: RegExp | null,
  field: SourceReferenceField,
): SourceReferenceError | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return sourceReferenceInvalid(field, 'empty');
  }

  if (trimmed.length > maxLength) {
    return sourceReferenceInvalid(field, 'too_long');
  }

  if (pattern !== null && !pattern.test(trimmed)) {
    return sourceReferenceInvalid(field, 'invalid_format');
  }

  return null;
}

function validateExternalId(value: string): SourceReferenceError | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return sourceReferenceInvalid('externalId', 'empty');
  }

  if (trimmed.length > MAX_EXTERNAL_ID_LENGTH) {
    return sourceReferenceInvalid('externalId', 'too_long');
  }

  if (CONTROL_CHARACTER_PATTERN.test(trimmed)) {
    return sourceReferenceInvalid('externalId', 'invalid_format');
  }

  return null;
}

export class SourceReference {
  readonly #state: SourceReferenceState;

  private constructor(state: SourceReferenceState) {
    this.#state = Object.freeze({ ...state });
    Object.freeze(this);
  }

  static create(input: CreateSourceReferenceInput): Result<SourceReference, SourceReferenceError> {
    const providerError = validateField(
      input.provider,
      MAX_PROVIDER_LENGTH,
      PROVIDER_PATTERN,
      'provider',
    );
    if (providerError !== null) {
      return err(providerError);
    }

    const objectTypeError = validateField(
      input.objectType,
      MAX_OBJECT_TYPE_LENGTH,
      OBJECT_TYPE_PATTERN,
      'objectType',
    );
    if (objectTypeError !== null) {
      return err(objectTypeError);
    }

    const externalIdError = validateExternalId(input.externalId);
    if (externalIdError !== null) {
      return err(externalIdError);
    }

    return ok(
      new SourceReference({
        provider: input.provider.trim(),
        objectType: input.objectType.trim(),
        externalId: input.externalId.trim(),
      }),
    );
  }

  get provider(): string {
    return this.#state.provider;
  }

  get objectType(): string {
    return this.#state.objectType;
  }

  get externalId(): string {
    return this.#state.externalId;
  }

  equals(other: SourceReference): boolean {
    return (
      this.#state.provider === other.#state.provider &&
      this.#state.objectType === other.#state.objectType &&
      this.#state.externalId === other.#state.externalId
    );
  }

  toString(): string {
    return `${this.#state.provider}:${this.#state.objectType}:${this.#state.externalId}`;
  }
}

function sourceReferenceInvalid(
  field: SourceReferenceField,
  reason: SourceReferenceInvalidReason,
): SourceReferenceError {
  return Object.freeze({
    code: 'SOURCE_REFERENCE_INVALID' as const,
    message: 'The source reference is invalid.',
    details: Object.freeze({ field, reason }),
  });
}
