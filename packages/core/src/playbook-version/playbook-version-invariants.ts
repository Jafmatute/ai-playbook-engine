import type { Instant } from '../instant.js';
import type { ContentChecksum } from './content-checksum.js';
import type { ValidationSummary } from './validation-summary.js';
import { stateInvalid } from './playbook-version-errors.js';
import type { PlaybookVersionStateInvalidError } from './playbook-version-errors.js';

export function checkFinalizedSummaryIntegrity(
  summary: ValidationSummary,
  validatedAt: Instant,
  sourceContentChecksum: ContentChecksum,
): PlaybookVersionStateInvalidError | null {
  if (!summary.completedAt.equals(validatedAt)) {
    return stateInvalid({ reason: 'validation_completion_mismatch' });
  }

  if (!summary.validatedContentChecksum.equals(sourceContentChecksum)) {
    return stateInvalid({ reason: 'validation_checksum_mismatch' });
  }

  return null;
}
