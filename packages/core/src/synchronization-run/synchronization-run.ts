import type { Instant } from '../instant.js';
import type {
  PlaybookId,
  PlaybookSourceId,
  SynchronizationRunId,
  SynchronizationSnapshotId,
  WorkspaceId,
} from '../identifiers.js';
import type {
  CreateSynchronizationRunInput,
  SynchronizationRunState,
} from './synchronization-run-contracts.js';
import type { SynchronizationRunStatus } from './synchronization-run-status.js';

export class SynchronizationRun {
  readonly #state: SynchronizationRunState;

  private constructor(state: SynchronizationRunState) {
    this.#state = Object.freeze({ ...state });
    Object.freeze(this);
  }

  static create(input: CreateSynchronizationRunInput): SynchronizationRun {
    return new SynchronizationRun({
      synchronizationRunId: input.synchronizationRunId,
      workspaceId: input.workspaceId,
      playbookId: input.playbookId,
      playbookSourceId: input.playbookSourceId,
      status: 'pending',
      createdAt: input.createdAt,
      startedAt: null,
      completedAt: null,
      synchronizationSnapshotId: null,
    });
  }

  get id(): SynchronizationRunId {
    return this.#state.synchronizationRunId;
  }

  get workspaceId(): WorkspaceId {
    return this.#state.workspaceId;
  }

  get playbookId(): PlaybookId {
    return this.#state.playbookId;
  }

  get playbookSourceId(): PlaybookSourceId {
    return this.#state.playbookSourceId;
  }

  get status(): SynchronizationRunStatus {
    return this.#state.status;
  }

  get createdAt(): Instant {
    return this.#state.createdAt;
  }

  get startedAt(): Instant | null {
    return this.#state.startedAt;
  }

  get completedAt(): Instant | null {
    return this.#state.completedAt;
  }

  get synchronizationSnapshotId(): SynchronizationSnapshotId | null {
    return this.#state.synchronizationSnapshotId;
  }
}
