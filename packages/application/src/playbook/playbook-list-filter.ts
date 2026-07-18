import type { PlaybookStatus } from '@ai-playbook-engine/core';

export interface PlaybookListFilter {
  readonly status?: PlaybookStatus;
  readonly normalizedNamePrefix?: string;
  readonly hasActiveVersion?: boolean;
}
