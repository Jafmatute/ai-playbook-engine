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
import type { SynchronizationFailureStage } from './synchronization-failure-stage.js';

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

export interface CompleteSynchronizationRunInput {
  readonly completedAt: Instant;
  readonly synchronizationSnapshotId: SynchronizationSnapshotId;
}

export interface RestoreSynchronizationRunInput {
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

export interface SynchronizationFailureSnapshot {
  readonly code: string;
  readonly message: string;
  readonly stage: SynchronizationFailureStage;
  readonly retryable: boolean;
  readonly externalReference: string | null;
}

export interface SynchronizationRunSnapshot {
  readonly synchronizationRunId: string;
  readonly workspaceId: string;
  readonly playbookId: string;
  readonly playbookSourceId: string;
  readonly status: SynchronizationRunStatus;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly synchronizationSnapshotId: string | null;
  readonly failure: SynchronizationFailureSnapshot | null;
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
