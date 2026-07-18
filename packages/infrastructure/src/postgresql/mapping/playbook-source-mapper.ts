import {
  Instant,
  isPlaybookSourceStatus,
  isPlaybookSourceType,
  parsePlaybookId,
  parsePlaybookSourceId,
  parseSynchronizationRunId,
  parseWorkspaceId,
  PlaybookSource,
  PlaybookSourceConfigurationReference,
  PlaybookSourceExternalRootReference,
} from '@ai-playbook-engine/core';
import type {
  PlaybookSource as PlaybookSourceAggregate,
  SynchronizationRunId,
} from '@ai-playbook-engine/core';

export interface PlaybookSourceRow {
  readonly playbook_source_id: string;
  readonly workspace_id: string;
  readonly playbook_id: string;
  readonly type: string;
  readonly status: string;
  readonly external_root_reference: string;
  readonly configuration_reference: string;
  readonly created_at: Date;
  readonly last_successful_synchronization_run_id: string | null;
  readonly last_successful_synchronization_at: Date | null;
  readonly last_failed_synchronization_run_id: string | null;
  readonly last_failed_synchronization_at: Date | null;
}

interface SynchronizationMetadata {
  readonly runId: SynchronizationRunId | null;
  readonly at: Instant | null;
}

export function mapRowToPlaybookSource(row: PlaybookSourceRow): PlaybookSourceAggregate | null {
  try {
    const sourceId = parsePlaybookSourceId(row.playbook_source_id);
    const workspaceId = parseWorkspaceId(row.workspace_id);
    const playbookId = parsePlaybookId(row.playbook_id);
    if (!sourceId.success || !workspaceId.success || !playbookId.success) return null;
    if (!isPlaybookSourceType(row.type) || !isPlaybookSourceStatus(row.status)) return null;
    const external = PlaybookSourceExternalRootReference.create(row.external_root_reference);
    const configuration = PlaybookSourceConfigurationReference.create(row.configuration_reference);
    if (!external.success || !configuration.success) return null;
    if (
      external.value.toString() !== row.external_root_reference ||
      configuration.value.toString() !== row.configuration_reference
    )
      return null;
    const createdAt = Instant.fromDate(row.created_at);
    if (!createdAt.success) return null;
    const successful = parseSynchronizationMetadata(
      row.last_successful_synchronization_run_id,
      row.last_successful_synchronization_at,
    );
    const failed = parseSynchronizationMetadata(
      row.last_failed_synchronization_run_id,
      row.last_failed_synchronization_at,
    );
    if (successful === null || failed === null) return null;
    const restored = PlaybookSource.restore({
      playbookSourceId: sourceId.value,
      workspaceId: workspaceId.value,
      playbookId: playbookId.value,
      type: row.type,
      status: row.status,
      externalRootReference: external.value,
      configurationReference: configuration.value,
      createdAt: createdAt.value,
      lastSuccessfulSynchronizationRunId: successful.runId,
      lastSuccessfulSynchronizationAt: successful.at,
      lastFailedSynchronizationRunId: failed.runId,
      lastFailedSynchronizationAt: failed.at,
    });
    return restored.success ? restored.value : null;
  } catch {
    return null;
  }
}

function parseSynchronizationMetadata(
  rawRunId: string | null,
  rawAt: Date | null,
): SynchronizationMetadata | null {
  if (rawRunId === null && rawAt === null) return { runId: null, at: null };
  if (rawRunId === null || rawAt === null) return null;
  const runId = parseSynchronizationRunId(rawRunId);
  const at = Instant.fromDate(rawAt);
  if (!runId.success || !at.success) return null;
  return { runId: runId.value, at: at.value };
}
