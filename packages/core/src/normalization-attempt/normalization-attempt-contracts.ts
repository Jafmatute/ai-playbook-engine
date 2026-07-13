import type { NormalizationAttemptId, PlaybookVersionId } from '../identifiers.js';
import type { Instant } from '../instant.js';
import type { NormalizationAttemptStatus } from './normalization-attempt-status.js';

export interface NormalizationAttemptState {
  readonly normalizationAttemptId: NormalizationAttemptId;
  readonly playbookVersionId: PlaybookVersionId;
  status: NormalizationAttemptStatus;
  readonly startedAt: Instant;
  completedAt: Instant | null;
  failedAt: Instant | null;
}

export interface CreateNormalizationAttemptInput {
  readonly normalizationAttemptId: NormalizationAttemptId;
  readonly playbookVersionId: PlaybookVersionId;
  readonly startedAt: Instant;
}

export interface RestoreNormalizationAttemptInput {
  readonly normalizationAttemptId: NormalizationAttemptId;
  readonly playbookVersionId: PlaybookVersionId;
  readonly status: NormalizationAttemptStatus | string;
  readonly startedAt: Instant;
  readonly completedAt: Instant | null;
  readonly failedAt: Instant | null;
}

export interface CompleteNormalizationAttemptInput {
  readonly completedAt: Instant;
}

export interface NormalizationAttemptSnapshot {
  readonly normalizationAttemptId: NormalizationAttemptId;
  readonly playbookVersionId: PlaybookVersionId;
  readonly status: NormalizationAttemptStatus;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly failedAt: string | null;
}
