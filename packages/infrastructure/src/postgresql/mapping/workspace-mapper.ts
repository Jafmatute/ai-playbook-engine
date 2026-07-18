import { Instant, parseWorkspaceId, WorkspaceName } from '@ai-playbook-engine/core';
import { Workspace as WorkspaceAggregate } from '@ai-playbook-engine/core';
import type { Workspace } from '@ai-playbook-engine/core';

export function mapRowToWorkspace(row: Record<string, unknown>): Workspace | null {
  try {
    const workspaceIdResult = parseWorkspaceId(String(row.workspace_id ?? ''));
    if (!workspaceIdResult.success) {
      return null;
    }

    const nameResult = WorkspaceName.create(String(row.name ?? ''));
    if (!nameResult.success) {
      return null;
    }

    const createdAtResult = Instant.parse(String(row.created_at ?? ''));
    if (!createdAtResult.success) {
      return null;
    }

    const updatedAtResult = Instant.parse(String(row.updated_at ?? ''));
    if (!updatedAtResult.success) {
      return null;
    }

    let archivedAt = null;
    if (row.archived_at !== null && row.archived_at !== undefined) {
      const parsed = Instant.parse(String(row.archived_at));
      if (!parsed.success) {
        return null;
      }
      archivedAt = parsed.value;
    }

    const restored = WorkspaceAggregate.restore({
      workspaceId: workspaceIdResult.value,
      name: nameResult.value,
      status: String(row.status ?? ''),
      description: row.description !== null ? String(row.description) : null,
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
