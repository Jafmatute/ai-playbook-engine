import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { NormalizationAttemptId, PlaybookVersionId } from '../identifiers.js';
import type { Instant } from '../instant.js';
import type {
  NormalizationAttemptSnapshot,
  NormalizationAttemptState,
  CreateNormalizationAttemptInput,
  RestoreNormalizationAttemptInput,
  CompleteNormalizationAttemptInput,
  FailNormalizationAttemptInput,
} from './normalization-attempt-contracts.js';
import type {
  NormalizationAttemptCreationError,
  NormalizationAttemptRestorationError,
  NormalizationAttemptTransitionError,
} from './normalization-attempt-errors.js';
import { stateInvalid, notRunning, timestampInvalid } from './normalization-attempt-errors.js';
import {
  isNormalizationAttemptStatus,
  type NormalizationAttemptStatus,
} from './normalization-attempt-status.js';

export { type NormalizationAttemptSnapshot } from './normalization-attempt-contracts.js';
export {
  type NormalizationAttemptCreationError,
  type NormalizationAttemptRestorationError,
  type NormalizationAttemptTransitionError,
  type NormalizationAttemptNotRunningError,
  type NormalizationAttemptTimestampInvalidError,
} from './normalization-attempt-errors.js';

export class NormalizationAttempt {
  #state: NormalizationAttemptState;

  private constructor(state: NormalizationAttemptState) {
    this.#state = state;
  }

  static create(
    input: CreateNormalizationAttemptInput,
  ): Result<NormalizationAttempt, NormalizationAttemptCreationError> {
    return ok(
      new NormalizationAttempt({
        normalizationAttemptId: input.normalizationAttemptId,
        playbookVersionId: input.playbookVersionId,
        status: 'running',
        startedAt: input.startedAt,
        completedAt: null,
        failedAt: null,
      }),
    );
  }

  static restore(
    input: RestoreNormalizationAttemptInput,
  ): Result<NormalizationAttempt, NormalizationAttemptRestorationError> {
    if (!isNormalizationAttemptStatus(input.status)) {
      return err(stateInvalid({ reason: 'unknown_status', currentStatus: String(input.status) }));
    }

    const status = input.status;

    if (status === 'running') {
      if (input.completedAt !== null) {
        return err(
          stateInvalid({
            reason: 'unexpected_timestamp',
            field: 'completedAt',
            currentStatus: status,
          }),
        );
      }
      if (input.failedAt !== null) {
        return err(
          stateInvalid({
            reason: 'unexpected_timestamp',
            field: 'failedAt',
            currentStatus: status,
          }),
        );
      }
    }

    if (status === 'completed') {
      if (input.completedAt === null) {
        return err(
          stateInvalid({
            reason: 'required_timestamp_missing',
            field: 'completedAt',
            currentStatus: status,
          }),
        );
      }
      if (input.failedAt !== null) {
        return err(
          stateInvalid({
            reason: 'unexpected_timestamp',
            field: 'failedAt',
            currentStatus: status,
          }),
        );
      }
      if (input.completedAt.compare(input.startedAt) < 0) {
        return err(
          stateInvalid({
            reason: 'timestamp_before_started',
            field: 'completedAt',
            currentStatus: status,
          }),
        );
      }
    }

    if (status === 'failed') {
      if (input.failedAt === null) {
        return err(
          stateInvalid({
            reason: 'required_timestamp_missing',
            field: 'failedAt',
            currentStatus: status,
          }),
        );
      }
      if (input.completedAt !== null) {
        return err(
          stateInvalid({
            reason: 'unexpected_timestamp',
            field: 'completedAt',
            currentStatus: status,
          }),
        );
      }
      if (input.failedAt.compare(input.startedAt) < 0) {
        return err(
          stateInvalid({
            reason: 'timestamp_before_started',
            field: 'failedAt',
            currentStatus: status,
          }),
        );
      }
    }

    return ok(
      new NormalizationAttempt({
        normalizationAttemptId: input.normalizationAttemptId,
        playbookVersionId: input.playbookVersionId,
        status,
        startedAt: input.startedAt,
        completedAt: input.completedAt,
        failedAt: input.failedAt,
      }),
    );
  }

  get id(): NormalizationAttemptId {
    return this.#state.normalizationAttemptId;
  }

  get playbookVersionId(): PlaybookVersionId {
    return this.#state.playbookVersionId;
  }

  get status(): NormalizationAttemptStatus {
    return this.#state.status;
  }

  get startedAt(): Instant {
    return this.#state.startedAt;
  }

  get completedAt(): Instant | null {
    return this.#state.completedAt;
  }

  get failedAt(): Instant | null {
    return this.#state.failedAt;
  }

  complete(
    input: CompleteNormalizationAttemptInput,
  ): Result<void, NormalizationAttemptTransitionError> {
    if (this.#state.status !== 'running') {
      return err(notRunning({ operation: 'complete', currentStatus: this.#state.status }));
    }

    if (input.completedAt.compare(this.#state.startedAt) < 0) {
      return err(
        timestampInvalid({
          operation: 'complete',
          field: 'completedAt',
          reason: 'timestamp_before_started',
        }),
      );
    }

    this.#state.status = 'completed';
    this.#state.completedAt = input.completedAt;
    this.#state.failedAt = null;
    return ok(undefined);
  }

  fail(input: FailNormalizationAttemptInput): Result<void, NormalizationAttemptTransitionError> {
    if (this.#state.status !== 'running') {
      return err(notRunning({ operation: 'fail', currentStatus: this.#state.status }));
    }

    if (input.failedAt.compare(this.#state.startedAt) < 0) {
      return err(
        timestampInvalid({
          operation: 'fail',
          field: 'failedAt',
          reason: 'timestamp_before_started',
        }),
      );
    }

    this.#state.status = 'failed';
    this.#state.failedAt = input.failedAt;
    this.#state.completedAt = null;
    return ok(undefined);
  }

  toSnapshot(): NormalizationAttemptSnapshot {
    return Object.freeze({
      normalizationAttemptId: this.#state.normalizationAttemptId,
      playbookVersionId: this.#state.playbookVersionId,
      status: this.#state.status,
      startedAt: this.#state.startedAt.toString(),
      completedAt: this.#state.completedAt?.toString() ?? null,
      failedAt: this.#state.failedAt?.toString() ?? null,
    });
  }
}
