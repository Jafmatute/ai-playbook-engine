import type { Playbook } from '@ai-playbook-engine/core';
import {
  Instant,
  PlaybookName,
  parsePlaybookId,
  parsePlaybookVersionId,
  parseWorkspaceId,
} from '@ai-playbook-engine/core';
import { Playbook as PlaybookAggregate } from '@ai-playbook-engine/core';

export function mapRowToPlaybook(row: Record<string, unknown>): Playbook | null {
  try {
    const playbookIdResult = parsePlaybookId(String(row.playbook_id ?? ''));
    if (!playbookIdResult.success) {
      return null;
    }

    const workspaceIdResult = parseWorkspaceId(String(row.workspace_id ?? ''));
    if (!workspaceIdResult.success) {
      return null;
    }

    const nameResult = PlaybookName.create(String(row.name ?? ''));
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

    let activeVersionId = null;
    if (row.active_version_id !== null && row.active_version_id !== undefined) {
      const parsed = parsePlaybookVersionId(String(row.active_version_id));
      if (!parsed.success) {
        return null;
      }
      activeVersionId = parsed.value;
    }

    const restored = PlaybookAggregate.restore({
      playbookId: playbookIdResult.value,
      workspaceId: workspaceIdResult.value,
      name: nameResult.value,
      status: String(row.status ?? ''),
      description: row.description !== null ? String(row.description) : null,
      activeVersionId,
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
