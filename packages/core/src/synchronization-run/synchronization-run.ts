import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { Instant } from '../instant.js';
import type {
  PlaybookId,
  PlaybookSourceId,
  SynchronizationRunId,
  SynchronizationSnapshotId,
  WorkspaceId,
} from '../identifiers.js';
import type {
  CompleteSynchronizationRunInput,
  CreateSynchronizationRunInput,
  FailSynchronizationRunInput,
  RestoreSynchronizationRunInput,
  StartSynchronizationRunInput,
  SynchronizationRunState,
} from './synchronization-run-contracts.js';
import type { SynchronizationRunStatus } from './synchronization-run-status.js';
import type { SynchronizationFailure } from './synchronization-failure.js';
import type {
  SynchronizationRunRestorationError,
  SynchronizationRunTransitionError,
} from './synchronization-run-errors.js';
import {
  stateInvalid,
  transitionNotAllowed,
  timestampInvalid,
} from './synchronization-run-errors.js';

export class SynchronizationRun {
  #state: SynchronizationRunState;

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
      failure: null,
    });
  }

  static restore(
    input: RestoreSynchronizationRunInput,
  ): Result<SynchronizationRun, SynchronizationRunRestorationError> {
    switch (input.status) {
      case 'pending': {
        if (input.startedAt !== null)
          return err(stateInvalid('PENDING_RUN_CANNOT_HAVE_STARTED_AT'));
        if (input.completedAt !== null)
          return err(stateInvalid('PENDING_RUN_CANNOT_HAVE_COMPLETED_AT'));
        if (input.synchronizationSnapshotId !== null)
          return err(stateInvalid('PENDING_RUN_CANNOT_HAVE_SNAPSHOT'));
        if (input.failure !== null) return err(stateInvalid('PENDING_RUN_CANNOT_HAVE_FAILURE'));
        break;
      }

      case 'running': {
        if (input.startedAt === null) return err(stateInvalid('RUNNING_RUN_REQUIRES_STARTED_AT'));
        if (input.completedAt !== null)
          return err(stateInvalid('RUNNING_RUN_CANNOT_HAVE_COMPLETED_AT'));
        if (input.synchronizationSnapshotId !== null)
          return err(stateInvalid('RUNNING_RUN_CANNOT_HAVE_SNAPSHOT'));
        if (input.failure !== null) return err(stateInvalid('RUNNING_RUN_CANNOT_HAVE_FAILURE'));
        if (input.startedAt.compare(input.createdAt) < 0)
          return err(stateInvalid('STARTED_AT_BEFORE_CREATED_AT'));
        break;
      }

      case 'completed': {
        if (input.startedAt === null) return err(stateInvalid('COMPLETED_RUN_REQUIRES_STARTED_AT'));
        if (input.completedAt === null)
          return err(stateInvalid('COMPLETED_RUN_REQUIRES_COMPLETED_AT'));
        if (input.synchronizationSnapshotId === null)
          return err(stateInvalid('COMPLETED_RUN_REQUIRES_SNAPSHOT'));
        if (input.failure !== null) return err(stateInvalid('COMPLETED_RUN_CANNOT_HAVE_FAILURE'));
        if (input.startedAt.compare(input.createdAt) < 0)
          return err(stateInvalid('STARTED_AT_BEFORE_CREATED_AT'));
        if (input.completedAt.compare(input.startedAt) < 0)
          return err(stateInvalid('COMPLETED_AT_BEFORE_STARTED_AT'));
        break;
      }

      case 'failed': {
        if (input.startedAt === null) return err(stateInvalid('FAILED_RUN_REQUIRES_STARTED_AT'));
        if (input.completedAt === null)
          return err(stateInvalid('FAILED_RUN_REQUIRES_COMPLETED_AT'));
        if (input.synchronizationSnapshotId !== null)
          return err(stateInvalid('FAILED_RUN_CANNOT_HAVE_SNAPSHOT'));
        if (input.failure === null) return err(stateInvalid('FAILED_RUN_REQUIRES_FAILURE'));
        if (input.startedAt.compare(input.createdAt) < 0)
          return err(stateInvalid('STARTED_AT_BEFORE_CREATED_AT'));
        if (input.completedAt.compare(input.startedAt) < 0)
          return err(stateInvalid('COMPLETED_AT_BEFORE_STARTED_AT'));
        break;
      }

      default:
        return err(stateInvalid('UNKNOWN_SYNCHRONIZATION_RUN_STATUS'));
    }

    return ok(
      new SynchronizationRun({
        synchronizationRunId: input.synchronizationRunId,
        workspaceId: input.workspaceId,
        playbookId: input.playbookId,
        playbookSourceId: input.playbookSourceId,
        status: input.status,
        createdAt: input.createdAt,
        startedAt: input.startedAt,
        completedAt: input.completedAt,
        synchronizationSnapshotId: input.synchronizationSnapshotId,
        failure: input.failure,
      }),
    );
  }

  start(input: StartSynchronizationRunInput): Result<void, SynchronizationRunTransitionError> {
    if (this.#state.status !== 'pending') {
      return err(
        transitionNotAllowed({
          operation: 'start',
          currentStatus: this.#state.status,
          expectedStatus: 'pending',
        }),
      );
    }

    if (input.startedAt.compare(this.#state.createdAt) < 0) {
      return err(
        timestampInvalid({
          operation: 'start',
          field: 'startedAt',
          reason: 'timestamp_before_created',
        }),
      );
    }

    this.#state = Object.freeze({
      ...this.#state,
      status: 'running',
      startedAt: input.startedAt,
      completedAt: null,
      synchronizationSnapshotId: null,
      failure: null,
    });

    return ok(undefined);
  }

  fail(input: FailSynchronizationRunInput): Result<void, SynchronizationRunTransitionError> {
    if (this.#state.status !== 'running') {
      return err(
        transitionNotAllowed({
          operation: 'fail',
          currentStatus: this.#state.status,
          expectedStatus: 'running',
        }),
      );
    }

    const currentStartedAt = this.#state.startedAt;

    if (currentStartedAt !== null && input.failedAt.compare(currentStartedAt) < 0) {
      return err(
        timestampInvalid({
          operation: 'fail',
          field: 'failedAt',
          reason: 'timestamp_before_started',
        }),
      );
    }

    this.#state = Object.freeze({
      ...this.#state,
      status: 'failed',
      completedAt: input.failedAt,
      synchronizationSnapshotId: null,
      failure: input.failure,
    });

    return ok(undefined);
  }

  complete(
    input: CompleteSynchronizationRunInput,
  ): Result<void, SynchronizationRunTransitionError> {
    if (this.#state.status !== 'running') {
      return err(
        transitionNotAllowed({
          operation: 'complete',
          currentStatus: this.#state.status,
          expectedStatus: 'running',
        }),
      );
    }

    const currentStartedAt = this.#state.startedAt;

    if (currentStartedAt !== null && input.completedAt.compare(currentStartedAt) < 0) {
      return err(
        timestampInvalid({
          operation: 'complete',
          field: 'completedAt',
          reason: 'timestamp_before_started',
        }),
      );
    }

    this.#state = Object.freeze({
      ...this.#state,
      status: 'completed',
      completedAt: input.completedAt,
      synchronizationSnapshotId: input.synchronizationSnapshotId,
      failure: null,
    });

    return ok(undefined);
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

  get failure(): SynchronizationFailure | null {
    return this.#state.failure;
  }
}
