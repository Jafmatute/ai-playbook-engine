import {
  Instant,
  parsePlaybookId,
  parsePlaybookVersionId,
  parseWorkspaceId,
  PlaybookName,
} from '@ai-playbook-engine/core';
import { Playbook as PlaybookAggregate } from '@ai-playbook-engine/core';
import type { Playbook } from '@ai-playbook-engine/core';

export interface PlaybookRow {
  readonly playbook_id: string;
  readonly workspace_id: string;
  readonly name: string;
  readonly normalized_name: string;
  readonly status: string;
  readonly description: string | null;
  readonly active_version_id: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly archived_at: Date | null;
}

export function mapRowToPlaybook(row: PlaybookRow): Playbook | null {
  try {
    const playbookIdResult = parsePlaybookId(row.playbook_id);
    if (!playbookIdResult.success) {
      return null;
    }

    const workspaceIdResult = parseWorkspaceId(row.workspace_id);
    if (!workspaceIdResult.success) {
      return null;
    }

    const nameResult = PlaybookName.create(row.name);
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

    let activeVersionId = null;
    if (row.active_version_id !== null) {
      const parsed = parsePlaybookVersionId(row.active_version_id);
      if (!parsed.success) {
        return null;
      }
      activeVersionId = parsed.value;
    }

    const restored = PlaybookAggregate.restore({
      playbookId: playbookIdResult.value,
      workspaceId: workspaceIdResult.value,
      name: nameResult.value,
      status: row.status,
      description: row.description,
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
