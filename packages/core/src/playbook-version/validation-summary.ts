import { err, ok, type Result } from '@ai-playbook-engine/shared';
import type { ValidationAttemptId } from '../identifiers.js';
import type { ContentChecksum } from './content-checksum.js';
import type { ValidatorVersion } from './validator-version.js';
import type { Instant } from '../instant.js';

export interface ValidationSummaryError {
  readonly code: 'VALIDATION_SUMMARY_INVALID';
  readonly message: string;
  readonly details: {
    readonly field: string;
    readonly receivedValue: number;
    readonly reason: 'not_finite' | 'not_integer' | 'below_minimum' | 'blocking_exceeds_errors';
  };
}

export interface ValidationSummarySnapshot {
  readonly validationAttemptId: ValidationAttemptId;
  readonly validatorVersion: string;
  readonly completedAt: string;
  readonly validatedContentChecksum: {
    readonly algorithm: 'sha256';
    readonly value: string;
  };
  readonly totalFindings: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly informationCount: number;
  readonly blockingFindingCount: number;
  readonly publicationEligible: boolean;
}

export class ValidationSummary {
  readonly #validationAttemptId: ValidationAttemptId;
  readonly #validatorVersion: ValidatorVersion;
  readonly #completedAt: Instant;
  readonly #validatedContentChecksum: ContentChecksum;
  readonly #errorCount: number;
  readonly #warningCount: number;
  readonly #informationCount: number;
  readonly #blockingFindingCount: number;
  readonly #totalFindings: number;
  readonly #publicationEligible: boolean;

  private constructor(input: {
    validationAttemptId: ValidationAttemptId;
    validatorVersion: ValidatorVersion;
    completedAt: Instant;
    validatedContentChecksum: ContentChecksum;
    errorCount: number;
    warningCount: number;
    informationCount: number;
    blockingFindingCount: number;
  }) {
    this.#validationAttemptId = input.validationAttemptId;
    this.#validatorVersion = input.validatorVersion;
    this.#completedAt = input.completedAt;
    this.#validatedContentChecksum = input.validatedContentChecksum;
    this.#errorCount = input.errorCount;
    this.#warningCount = input.warningCount;
    this.#informationCount = input.informationCount;
    this.#blockingFindingCount = input.blockingFindingCount;

    this.#totalFindings = input.errorCount + input.warningCount + input.informationCount;
    this.#publicationEligible = input.blockingFindingCount === 0;

    Object.freeze(this);
  }

  static create(input: {
    validationAttemptId: ValidationAttemptId;
    validatorVersion: ValidatorVersion;
    completedAt: Instant;
    validatedContentChecksum: ContentChecksum;
    errorCount: number;
    warningCount: number;
    informationCount: number;
    blockingFindingCount: number;
  }): Result<ValidationSummary, ValidationSummaryError> {
    const countFields: {
      name: string;
      value: number;
    }[] = [
      { name: 'errorCount', value: input.errorCount },
      { name: 'warningCount', value: input.warningCount },
      { name: 'informationCount', value: input.informationCount },
      { name: 'blockingFindingCount', value: input.blockingFindingCount },
    ];

    for (const field of countFields) {
      if (!Number.isFinite(field.value)) {
        return err(validationSummaryInvalid(field.name, field.value, 'not_finite'));
      }

      if (!Number.isInteger(field.value)) {
        return err(validationSummaryInvalid(field.name, field.value, 'not_integer'));
      }

      if (field.value < 0) {
        return err(validationSummaryInvalid(field.name, field.value, 'below_minimum'));
      }
    }

    if (input.blockingFindingCount > input.errorCount) {
      return err(
        validationSummaryInvalid(
          'blockingFindingCount',
          input.blockingFindingCount,
          'blocking_exceeds_errors',
        ),
      );
    }

    return ok(new ValidationSummary(input));
  }

  get validationAttemptId(): ValidationAttemptId {
    return this.#validationAttemptId;
  }

  get validatorVersion(): ValidatorVersion {
    return this.#validatorVersion;
  }

  get completedAt(): Instant {
    return this.#completedAt;
  }

  get validatedContentChecksum(): ContentChecksum {
    return this.#validatedContentChecksum;
  }

  get errorCount(): number {
    return this.#errorCount;
  }

  get warningCount(): number {
    return this.#warningCount;
  }

  get informationCount(): number {
    return this.#informationCount;
  }

  get blockingFindingCount(): number {
    return this.#blockingFindingCount;
  }

  get totalFindings(): number {
    return this.#totalFindings;
  }

  get publicationEligible(): boolean {
    return this.#publicationEligible;
  }

  toSnapshot(): ValidationSummarySnapshot {
    return Object.freeze({
      validationAttemptId: this.#validationAttemptId,
      validatorVersion: this.#validatorVersion.value,
      completedAt: this.#completedAt.toString(),
      validatedContentChecksum: Object.freeze({
        algorithm: this.#validatedContentChecksum.algorithm,
        value: this.#validatedContentChecksum.value,
      }),
      totalFindings: this.#totalFindings,
      errorCount: this.#errorCount,
      warningCount: this.#warningCount,
      informationCount: this.#informationCount,
      blockingFindingCount: this.#blockingFindingCount,
      publicationEligible: this.#publicationEligible,
    });
  }
}

function validationSummaryInvalid(
  field: string,
  receivedValue: number,
  reason: ValidationSummaryError['details']['reason'],
): ValidationSummaryError {
  return Object.freeze({
    code: 'VALIDATION_SUMMARY_INVALID' as const,
    message: 'The validation summary contains invalid counts.',
    details: Object.freeze({
      field,
      receivedValue,
      reason,
    }),
  });
}
