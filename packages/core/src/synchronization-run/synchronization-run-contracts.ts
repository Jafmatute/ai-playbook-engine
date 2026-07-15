import type {
  PlaybookId,
  PlaybookSourceId,
  SynchronizationRunId,
  WorkspaceId,
} from '../identifiers.js';
import type { Instant } from '../instant.js';
import type { SynchronizationRunStatus } from './synchronization-run-status.js';
import type { SynchronizationSnapshotId } from '../identifiers.js';
import type { SynchronizationFailure } from './synchronization-failure.js';

export interface CreateSynchronizationRunInput {
  readonly synchronizationRunId: SynchronizationRunId;
  readonly workspaceId: WorkspaceId;
  readonly playbookId: PlaybookId;
  readonly playbookSourceId: PlaybookSourceId;
  readonly createdAt: Instant;
}

export interface StartSynchronizationRunInput {
  readonly startedAt: Instant;
}

export interface FailSynchronizationRunInput {
  readonly failedAt: Instant;
  readonly failure: SynchronizationFailure;
}

export interface SynchronizationRunState {
  readonly synchronizationRunId: SynchronizationRunId;
  readonly workspaceId: WorkspaceId;
  readonly playbookId: PlaybookId;
  readonly playbookSourceId: PlaybookSourceId;
  readonly status: SynchronizationRunStatus;
  readonly createdAt: Instant;
  readonly startedAt: Instant | null;
  readonly completedAt: Instant | null;
  readonly synchronizationSnapshotId: SynchronizationSnapshotId | null;
  readonly failure: SynchronizationFailure | null;
}
