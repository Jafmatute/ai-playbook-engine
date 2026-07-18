import type { Instant, SynchronizationRunStatus } from '@ai-playbook-engine/core';

export interface SynchronizationRunListFilter {
  readonly status?: SynchronizationRunStatus;
  readonly createdAtFrom?: Instant;
  readonly createdAtTo?: Instant;
}
