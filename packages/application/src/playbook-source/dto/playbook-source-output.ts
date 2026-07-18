import type { PlaybookSource } from '@ai-playbook-engine/core';
export interface PlaybookSourceOutput {
  readonly playbookSourceId: string;
  readonly workspaceId: string;
  readonly playbookId: string;
  readonly type: 'notion';
  readonly status: 'enabled' | 'disabled';
  readonly externalRootReference: string;
  readonly configurationReference: string;
  readonly createdAt: string;
  readonly lastSuccessfulSynchronizationRunId: string | null;
  readonly lastSuccessfulSynchronizationAt: string | null;
  readonly lastFailedSynchronizationRunId: string | null;
  readonly lastFailedSynchronizationAt: string | null;
}
export function toPlaybookSourceOutput(source: PlaybookSource): PlaybookSourceOutput {
  return Object.freeze(source.toSnapshot());
}
