import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { ValidationAttemptId, PlaybookVersionId } from '../identifiers.js';
import type { Instant } from '../instant.js';
import type { ValidationSummary } from '../playbook-version/validation-summary.js';
import type {
  ValidationAttemptSnapshot,
  ValidationAttemptState,
  CreateValidationAttemptInput,
  RestoreValidationAttemptInput,
  MarkValidationAttemptValidatedInput,
} from './validation-attempt-contracts.js';
import type {
  ValidationAttemptCreationError,
  ValidationAttemptRestorationError,
  ValidationAttemptTransitionError,
} from './validation-attempt-errors.js';
import { stateInvalid, notRunning, summaryInvalid } from './validation-attempt-errors.js';
import {
  isValidationAttemptStatus,
  type ValidationAttemptStatus,
} from './validation-attempt-status.js';

export { type ValidationAttemptSnapshot } from './validation-attempt-contracts.js';
export {
  type ValidationAttemptCreationError,
  type ValidationAttemptRestorationError,
  type ValidationAttemptTransitionError,
  type ValidationAttemptNotRunningError,
  type ValidationAttemptSummaryInvalidError,
} from './validation-attempt-errors.js';

export class ValidationAttempt {
  #state: ValidationAttemptState;

  private constructor(state: ValidationAttemptState) {
    this.#state = state;
  }

  static create(
    input: CreateValidationAttemptInput,
  ): Result<ValidationAttempt, ValidationAttemptCreationError> {
    return ok(
      new ValidationAttempt({
        validationAttemptId: input.validationAttemptId,
        playbookVersionId: input.playbookVersionId,
        status: 'running',
        startedAt: input.startedAt,
        validationSummary: null,
      }),
    );
  }

  static restore(
    input: RestoreValidationAttemptInput,
  ): Result<ValidationAttempt, ValidationAttemptRestorationError> {
    if (!isValidationAttemptStatus(input.status)) {
      return err(stateInvalid({ reason: 'unknown_status', currentStatus: String(input.status) }));
    }

    const status = input.status;

    if (status === 'running') {
      if (input.validationSummary !== null) {
        return err(
          stateInvalid({
            reason: 'unexpected_summary',
            field: 'validationSummary',
            currentStatus: status,
          }),
        );
      }
    }

    if (status === 'validated' || status === 'invalid') {
      if (input.validationSummary === null) {
        return err(
          stateInvalid({
            reason: 'required_summary_missing',
            field: 'validationSummary',
            currentStatus: status,
          }),
        );
      }

      if (input.validationSummary.validationAttemptId !== input.validationAttemptId) {
        return err(
          stateInvalid({
            reason: 'summary_attempt_mismatch',
            field: 'validationSummary',
            currentStatus: status,
          }),
        );
      }

      if (input.validationSummary.completedAt.compare(input.startedAt) < 0) {
        return err(
          stateInvalid({
            reason: 'summary_completed_before_started',
            field: 'validationSummary',
            currentStatus: status,
          }),
        );
      }

      if (status === 'validated' && !input.validationSummary.publicationEligible) {
        return err(
          stateInvalid({
            reason: 'summary_result_mismatch',
            field: 'validationSummary',
            currentStatus: status,
          }),
        );
      }

      if (status === 'invalid' && input.validationSummary.publicationEligible) {
        return err(
          stateInvalid({
            reason: 'summary_result_mismatch',
            field: 'validationSummary',
            currentStatus: status,
          }),
        );
      }
    }

    return ok(
      new ValidationAttempt({
        validationAttemptId: input.validationAttemptId,
        playbookVersionId: input.playbookVersionId,
        status,
        startedAt: input.startedAt,
        validationSummary: input.validationSummary,
      }),
    );
  }

  get id(): ValidationAttemptId {
    return this.#state.validationAttemptId;
  }

  get playbookVersionId(): PlaybookVersionId {
    return this.#state.playbookVersionId;
  }

  get status(): ValidationAttemptStatus {
    return this.#state.status;
  }

  get startedAt(): Instant {
    return this.#state.startedAt;
  }

  get validationSummary(): ValidationSummary | null {
    return this.#state.validationSummary;
  }

  markValidated(
    input: MarkValidationAttemptValidatedInput,
  ): Result<void, ValidationAttemptTransitionError> {
    if (this.#state.status !== 'running') {
      return err(notRunning({ operation: 'markValidated', currentStatus: this.#state.status }));
    }

    if (input.validationSummary.validationAttemptId !== this.#state.validationAttemptId) {
      return err(
        summaryInvalid({
          operation: 'markValidated',
          field: 'validationSummary',
          reason: 'summary_attempt_mismatch',
        }),
      );
    }

    if (input.validationSummary.completedAt.compare(this.#state.startedAt) < 0) {
      return err(
        summaryInvalid({
          operation: 'markValidated',
          field: 'validationSummary',
          reason: 'summary_completed_before_started',
        }),
      );
    }

    if (!input.validationSummary.publicationEligible) {
      return err(
        summaryInvalid({
          operation: 'markValidated',
          field: 'validationSummary',
          reason: 'summary_not_publication_eligible',
        }),
      );
    }

    this.#state.status = 'validated';
    this.#state.validationSummary = input.validationSummary;
    return ok(undefined);
  }

  toSnapshot(): ValidationAttemptSnapshot {
    return Object.freeze({
      validationAttemptId: this.#state.validationAttemptId,
      playbookVersionId: this.#state.playbookVersionId,
      status: this.#state.status,
      startedAt: this.#state.startedAt.toString(),
      validationSummary: this.#state.validationSummary?.toSnapshot() ?? null,
    });
  }
}
