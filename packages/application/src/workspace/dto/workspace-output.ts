import type { Workspace, WorkspaceStatus } from '@ai-playbook-engine/core';

export interface WorkspaceOutput {
  readonly workspaceId: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly status: WorkspaceStatus;
  readonly description: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}

export function toWorkspaceOutput(workspace: Workspace): WorkspaceOutput {
  const snapshot = workspace.toSnapshot();
  return Object.freeze({
    workspaceId: snapshot.workspaceId,
    name: snapshot.name,
    normalizedName: snapshot.normalizedName,
    status: snapshot.status,
    description: snapshot.description,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    archivedAt: snapshot.archivedAt,
  });
}
