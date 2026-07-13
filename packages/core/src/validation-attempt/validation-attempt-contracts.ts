import type { ValidationAttemptId, PlaybookVersionId } from '../identifiers.js';
import type { Instant } from '../instant.js';
import type { ValidationAttemptStatus } from './validation-attempt-status.js';
import type { ValidationSummary } from '../playbook-version/validation-summary.js';
import type { ValidationSummarySnapshot } from '../playbook-version/validation-summary.js';

export interface ValidationAttemptState {
  readonly validationAttemptId: ValidationAttemptId;
  readonly playbookVersionId: PlaybookVersionId;
  status: ValidationAttemptStatus;
  readonly startedAt: Instant;
  validationSummary: ValidationSummary | null;
}

export interface CreateValidationAttemptInput {
  readonly validationAttemptId: ValidationAttemptId;
  readonly playbookVersionId: PlaybookVersionId;
  readonly startedAt: Instant;
}

export interface RestoreValidationAttemptInput {
  readonly validationAttemptId: ValidationAttemptId;
  readonly playbookVersionId: PlaybookVersionId;
  readonly status: ValidationAttemptStatus | string;
  readonly startedAt: Instant;
  readonly validationSummary: ValidationSummary | null;
}

export interface MarkValidationAttemptValidatedInput {
  readonly validationSummary: ValidationSummary;
}

export interface MarkValidationAttemptInvalidInput {
  readonly validationSummary: ValidationSummary;
}

export interface ValidationAttemptSnapshot {
  readonly validationAttemptId: ValidationAttemptId;
  readonly playbookVersionId: PlaybookVersionId;
  readonly status: ValidationAttemptStatus;
  readonly startedAt: string;
  readonly validationSummary: ValidationSummarySnapshot | null;
}
