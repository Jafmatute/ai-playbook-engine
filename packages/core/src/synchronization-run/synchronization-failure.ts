import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { SynchronizationFailureStage } from './synchronization-failure-stage.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FAILURE_CODE_LENGTH = 128;
const MAX_FAILURE_MESSAGE_LENGTH = 2_000;
const MAX_EXTERNAL_REFERENCE_LENGTH = 512;

const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER_PATTERN = /[\x00-\x1f\x7f]/;

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export interface CreateSynchronizationFailureInput {
  readonly code: string;
  readonly message: string;
  readonly stage: SynchronizationFailureStage;
  readonly retryable: boolean;
  readonly externalReference: string | null;
}

export type SynchronizationFailureField = 'code' | 'message' | 'externalReference';

export type SynchronizationFailureInvalidReason =
  'empty' | 'too_long' | 'invalid_format' | 'contains_control_character';

export interface SynchronizationFailureError {
  readonly code: 'SYNCHRONIZATION_FAILURE_INVALID';
  readonly message: string;
  readonly details: {
    readonly field: SynchronizationFailureField;
    readonly reason: SynchronizationFailureInvalidReason;
  };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface SynchronizationFailureState {
  readonly code: string;
  readonly message: string;
  readonly stage: SynchronizationFailureStage;
  readonly retryable: boolean;
  readonly externalReference: string | null;
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class SynchronizationFailure {
  readonly #state: SynchronizationFailureState;

  private constructor(state: SynchronizationFailureState) {
    this.#state = Object.freeze({ ...state });
    Object.freeze(this);
  }

  static create(
    input: CreateSynchronizationFailureInput,
  ): Result<SynchronizationFailure, SynchronizationFailureError> {
    const code = input.code.trim();
    const message = input.message.trim();
    const externalReference =
      input.externalReference === null ? null : input.externalReference.trim();

    const codeError = validateCode(code);
    if (codeError !== null) return err(codeError);

    const messageError = validateMessage(message);
    if (messageError !== null) return err(messageError);

    if (externalReference !== null) {
      const refError = validateExternalReference(externalReference);
      if (refError !== null) return err(refError);
    }

    return ok(
      new SynchronizationFailure({
        code,
        message,
        stage: input.stage,
        retryable: input.retryable,
        externalReference,
      }),
    );
  }

  get code(): string {
    return this.#state.code;
  }

  get message(): string {
    return this.#state.message;
  }

  get stage(): SynchronizationFailureStage {
    return this.#state.stage;
  }

  get retryable(): boolean {
    return this.#state.retryable;
  }

  get externalReference(): string | null {
    return this.#state.externalReference;
  }

  equals(other: SynchronizationFailure): boolean {
    return (
      this.#state.code === other.#state.code &&
      this.#state.message === other.#state.message &&
      this.#state.stage === other.#state.stage &&
      this.#state.retryable === other.#state.retryable &&
      this.#state.externalReference === other.#state.externalReference
    );
  }
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

function validateCode(value: string): SynchronizationFailureError | null {
  if (value.length === 0) {
    return syncFailureInvalid('code', 'empty');
  }

  if (value.length > MAX_FAILURE_CODE_LENGTH) {
    return syncFailureInvalid('code', 'too_long');
  }

  if (!CODE_PATTERN.test(value)) {
    return syncFailureInvalid('code', 'invalid_format');
  }

  return null;
}

function validateMessage(value: string): SynchronizationFailureError | null {
  if (value.length === 0) {
    return syncFailureInvalid('message', 'empty');
  }

  if (value.length > MAX_FAILURE_MESSAGE_LENGTH) {
    return syncFailureInvalid('message', 'too_long');
  }

  if (CONTROL_CHARACTER_PATTERN.test(value)) {
    return syncFailureInvalid('message', 'contains_control_character');
  }

  return null;
}

function validateExternalReference(value: string): SynchronizationFailureError | null {
  if (value.length === 0) {
    return syncFailureInvalid('externalReference', 'empty');
  }

  if (value.length > MAX_EXTERNAL_REFERENCE_LENGTH) {
    return syncFailureInvalid('externalReference', 'too_long');
  }

  if (CONTROL_CHARACTER_PATTERN.test(value)) {
    return syncFailureInvalid('externalReference', 'contains_control_character');
  }

  return null;
}

function syncFailureInvalid(
  field: SynchronizationFailureField,
  reason: SynchronizationFailureInvalidReason,
): SynchronizationFailureError {
  return Object.freeze({
    code: 'SYNCHRONIZATION_FAILURE_INVALID' as const,
    message: 'The synchronization failure is invalid.',
    details: Object.freeze({ field, reason }),
  });
}
