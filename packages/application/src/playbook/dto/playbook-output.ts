import type { Playbook } from '@ai-playbook-engine/core';

export interface PlaybookOutput {
  readonly playbookId: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly status: string;
  readonly description: string | null;
  readonly activeVersionId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}

export function toPlaybookOutput(playbook: Playbook): PlaybookOutput {
  const snapshot = playbook.toSnapshot();
  return Object.freeze({
    playbookId: snapshot.playbookId,
    workspaceId: snapshot.workspaceId,
    name: snapshot.name,
    normalizedName: snapshot.normalizedName,
    status: snapshot.status,
    description: snapshot.description,
    activeVersionId: snapshot.activeVersionId?.toString() ?? null,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    archivedAt: snapshot.archivedAt,
  });
}
