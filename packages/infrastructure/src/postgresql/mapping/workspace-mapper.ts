import { Instant, parseWorkspaceId, WorkspaceName } from '@ai-playbook-engine/core';
import { Workspace as WorkspaceAggregate } from '@ai-playbook-engine/core';
import type { Workspace } from '@ai-playbook-engine/core';

export interface WorkspaceRow {
  readonly workspace_id: string;
  readonly name: string;
  readonly normalized_name: string;
  readonly status: string;
  readonly description: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly archived_at: Date | null;
}

export function mapRowToWorkspace(row: WorkspaceRow): Workspace | null {
  try {
    const workspaceIdResult = parseWorkspaceId(row.workspace_id);
    if (!workspaceIdResult.success) {
      return null;
    }

    const nameResult = WorkspaceName.create(row.name);
    if (!nameResult.success) {
      return null;
    }

    if (nameResult.value.normalizedValue !== row.normalized_name) {
      return null;
    }

    const createdAtResult = Instant.fromDate(row.created_at);
    if (!createdAtResult.success) {
      return null;
    }

    const updatedAtResult = Instant.fromDate(row.updated_at);
    if (!updatedAtResult.success) {
      return null;
    }

    let archivedAt = null;
    if (row.archived_at !== null) {
      const parsed = Instant.fromDate(row.archived_at);
      if (!parsed.success) {
        return null;
      }
      archivedAt = parsed.value;
    }

    const restored = WorkspaceAggregate.restore({
      workspaceId: workspaceIdResult.value,
      name: nameResult.value,
      status: row.status,
      description: row.description,
      createdAt: createdAtResult.value,
      updatedAt: updatedAtResult.value,
      archivedAt,
    });

    if (!restored.success) {
      return null;
    }

    return restored.value;
  } catch {
    return null;
  }
}
