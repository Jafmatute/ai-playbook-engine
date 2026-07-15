import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { Instant } from '../instant.js';
import type {
  PlaybookSourceId,
  PlaybookId,
  SynchronizationRunId,
  WorkspaceId,
} from '../identifiers.js';
import type { PlaybookSourceType } from './playbook-source-type.js';
import type { PlaybookSourceStatus } from './playbook-source-status.js';
import type { PlaybookSourceExternalRootReference } from './playbook-source-external-root-reference.js';
import type { PlaybookSourceConfigurationReference } from './playbook-source-configuration-reference.js';
import type {
  CreatePlaybookSourceInput,
  PlaybookSourceState,
  RestorePlaybookSourceInput,
  PlaybookSourceSnapshot,
  UpdatePlaybookSourceExternalRootReferenceInput,
  UpdatePlaybookSourceConfigurationReferenceInput,
  RecordSuccessfulPlaybookSourceSynchronizationInput,
  RecordFailedPlaybookSourceSynchronizationInput,
} from './playbook-source-contracts.js';
import type {
  PlaybookSourceTransitionError,
  PlaybookSourceRestorationError,
  PlaybookSourceUpdateError,
  PlaybookSourceSynchronizationMetadataError,
} from './playbook-source-errors.js';
import {
  transitionNotAllowed,
  stateInvalid,
  updateInvalid,
  synchronizationMetadataInvalid,
} from './playbook-source-errors.js';

export class PlaybookSource {
  #state: PlaybookSourceState;

  private constructor(state: PlaybookSourceState) {
    this.#state = Object.freeze({ ...state });
    Object.freeze(this);
  }

  static create(input: CreatePlaybookSourceInput): PlaybookSource {
    return new PlaybookSource({
      playbookSourceId: input.playbookSourceId,
      workspaceId: input.workspaceId,
      playbookId: input.playbookId,
      type: input.type,
      status: 'enabled',
      externalRootReference: input.externalRootReference,
      configurationReference: input.configurationReference,
      createdAt: input.createdAt,
      lastSuccessfulSynchronizationRunId: null,
      lastSuccessfulSynchronizationAt: null,
      lastFailedSynchronizationRunId: null,
      lastFailedSynchronizationAt: null,
    });
  }

  static restore(
    input: RestorePlaybookSourceInput,
  ): Result<PlaybookSource, PlaybookSourceRestorationError> {
    switch (input.status) {
      case 'enabled':
      case 'disabled':
        break;
      default:
        return err(stateInvalid('UNKNOWN_PLAYBOOK_SOURCE_STATUS'));
    }

    if (
      input.lastSuccessfulSynchronizationRunId !== null &&
      input.lastSuccessfulSynchronizationAt === null
    ) {
      return err(stateInvalid('SUCCESSFUL_RUN_ID_REQUIRES_TIMESTAMP'));
    }

    if (
      input.lastSuccessfulSynchronizationRunId === null &&
      input.lastSuccessfulSynchronizationAt !== null
    ) {
      return err(stateInvalid('SUCCESSFUL_TIMESTAMP_REQUIRES_RUN_ID'));
    }

    if (
      input.lastSuccessfulSynchronizationAt !== null &&
      input.lastSuccessfulSynchronizationAt.compare(input.createdAt) < 0
    ) {
      return err(stateInvalid('SUCCESSFUL_TIMESTAMP_BEFORE_CREATED_AT'));
    }

    if (
      input.lastFailedSynchronizationRunId !== null &&
      input.lastFailedSynchronizationAt === null
    ) {
      return err(stateInvalid('FAILED_RUN_ID_REQUIRES_TIMESTAMP'));
    }

    if (
      input.lastFailedSynchronizationRunId === null &&
      input.lastFailedSynchronizationAt !== null
    ) {
      return err(stateInvalid('FAILED_TIMESTAMP_REQUIRES_RUN_ID'));
    }

    if (
      input.lastFailedSynchronizationAt !== null &&
      input.lastFailedSynchronizationAt.compare(input.createdAt) < 0
    ) {
      return err(stateInvalid('FAILED_TIMESTAMP_BEFORE_CREATED_AT'));
    }

    if (
      input.lastSuccessfulSynchronizationRunId !== null &&
      input.lastFailedSynchronizationRunId !== null &&
      input.lastSuccessfulSynchronizationRunId === input.lastFailedSynchronizationRunId
    ) {
      return err(stateInvalid('SAME_RUN_RECORDED_AS_SUCCESS_AND_FAILURE'));
    }

    return ok(
      new PlaybookSource({
        playbookSourceId: input.playbookSourceId,
        workspaceId: input.workspaceId,
        playbookId: input.playbookId,
        type: input.type,
        status: input.status,
        externalRootReference: input.externalRootReference,
        configurationReference: input.configurationReference,
        createdAt: input.createdAt,
        lastSuccessfulSynchronizationRunId: input.lastSuccessfulSynchronizationRunId,
        lastSuccessfulSynchronizationAt: input.lastSuccessfulSynchronizationAt,
        lastFailedSynchronizationRunId: input.lastFailedSynchronizationRunId,
        lastFailedSynchronizationAt: input.lastFailedSynchronizationAt,
      }),
    );
  }

  disable(): Result<void, PlaybookSourceTransitionError> {
    if (this.#state.status !== 'enabled') {
      return err(
        transitionNotAllowed({
          operation: 'disable',
          currentStatus: this.#state.status,
          expectedStatus: 'enabled',
        }),
      );
    }

    this.#state = Object.freeze({
      ...this.#state,
      status: 'disabled',
    });

    return ok(undefined);
  }

  enable(): Result<void, PlaybookSourceTransitionError> {
    if (this.#state.status !== 'disabled') {
      return err(
        transitionNotAllowed({
          operation: 'enable',
          currentStatus: this.#state.status,
          expectedStatus: 'disabled',
        }),
      );
    }

    this.#state = Object.freeze({
      ...this.#state,
      status: 'enabled',
    });

    return ok(undefined);
  }

  toSnapshot(): PlaybookSourceSnapshot {
    return Object.freeze({
      playbookSourceId: this.#state.playbookSourceId,
      workspaceId: this.#state.workspaceId,
      playbookId: this.#state.playbookId,
      type: this.#state.type,
      status: this.#state.status,
      externalRootReference: this.#state.externalRootReference.toString(),
      configurationReference: this.#state.configurationReference.toString(),
      createdAt: this.#state.createdAt.toString(),
      lastSuccessfulSynchronizationRunId: this.#state.lastSuccessfulSynchronizationRunId,
      lastSuccessfulSynchronizationAt:
        this.#state.lastSuccessfulSynchronizationAt?.toString() ?? null,
      lastFailedSynchronizationRunId: this.#state.lastFailedSynchronizationRunId,
      lastFailedSynchronizationAt: this.#state.lastFailedSynchronizationAt?.toString() ?? null,
    });
  }

  updateExternalRootReference(
    input: UpdatePlaybookSourceExternalRootReferenceInput,
  ): Result<void, PlaybookSourceUpdateError> {
    if (this.#state.externalRootReference.equals(input.externalRootReference)) {
      return err(
        updateInvalid({
          field: 'externalRootReference',
          reason: 'unchanged',
        }),
      );
    }

    this.#state = Object.freeze({
      ...this.#state,
      externalRootReference: input.externalRootReference,
    });

    return ok(undefined);
  }

  updateConfigurationReference(
    input: UpdatePlaybookSourceConfigurationReferenceInput,
  ): Result<void, PlaybookSourceUpdateError> {
    if (this.#state.configurationReference.equals(input.configurationReference)) {
      return err(
        updateInvalid({
          field: 'configurationReference',
          reason: 'unchanged',
        }),
      );
    }

    this.#state = Object.freeze({
      ...this.#state,
      configurationReference: input.configurationReference,
    });

    return ok(undefined);
  }

  recordSuccessfulSynchronization(
    input: RecordSuccessfulPlaybookSourceSynchronizationInput,
  ): Result<void, PlaybookSourceSynchronizationMetadataError> {
    if (input.succeededAt.compare(this.#state.createdAt) < 0) {
      return err(
        synchronizationMetadataInvalid({
          field: 'lastSuccessfulSynchronization',
          reason: 'timestamp_before_created',
        }),
      );
    }

    if (
      this.#state.lastFailedSynchronizationRunId !== null &&
      this.#state.lastFailedSynchronizationRunId === input.synchronizationRunId
    ) {
      return err(
        synchronizationMetadataInvalid({
          field: 'lastSuccessfulSynchronization',
          reason: 'run_outcome_conflict',
        }),
      );
    }

    if (
      this.#state.lastSuccessfulSynchronizationRunId !== null &&
      this.#state.lastSuccessfulSynchronizationAt !== null
    ) {
      if (this.#state.lastSuccessfulSynchronizationRunId === input.synchronizationRunId) {
        if (this.#state.lastSuccessfulSynchronizationAt.equals(input.succeededAt)) {
          return err(
            synchronizationMetadataInvalid({
              field: 'lastSuccessfulSynchronization',
              reason: 'unchanged',
            }),
          );
        }

        return err(
          synchronizationMetadataInvalid({
            field: 'lastSuccessfulSynchronization',
            reason: 'run_timestamp_conflict',
          }),
        );
      }

      if (input.succeededAt.compare(this.#state.lastSuccessfulSynchronizationAt) < 0) {
        return err(
          synchronizationMetadataInvalid({
            field: 'lastSuccessfulSynchronization',
            reason: 'timestamp_before_last_success',
          }),
        );
      }
    }

    this.#state = Object.freeze({
      ...this.#state,
      lastSuccessfulSynchronizationRunId: input.synchronizationRunId,
      lastSuccessfulSynchronizationAt: input.succeededAt,
    });

    return ok(undefined);
  }

  recordFailedSynchronization(
    input: RecordFailedPlaybookSourceSynchronizationInput,
  ): Result<void, PlaybookSourceSynchronizationMetadataError> {
    if (input.failedAt.compare(this.#state.createdAt) < 0) {
      return err(
        synchronizationMetadataInvalid({
          field: 'lastFailedSynchronization',
          reason: 'timestamp_before_created',
        }),
      );
    }

    if (
      this.#state.lastSuccessfulSynchronizationRunId !== null &&
      this.#state.lastSuccessfulSynchronizationRunId === input.synchronizationRunId
    ) {
      return err(
        synchronizationMetadataInvalid({
          field: 'lastFailedSynchronization',
          reason: 'run_outcome_conflict',
        }),
      );
    }

    if (
      this.#state.lastFailedSynchronizationRunId !== null &&
      this.#state.lastFailedSynchronizationAt !== null
    ) {
      if (this.#state.lastFailedSynchronizationRunId === input.synchronizationRunId) {
        if (this.#state.lastFailedSynchronizationAt.equals(input.failedAt)) {
          return err(
            synchronizationMetadataInvalid({
              field: 'lastFailedSynchronization',
              reason: 'unchanged',
            }),
          );
        }

        return err(
          synchronizationMetadataInvalid({
            field: 'lastFailedSynchronization',
            reason: 'run_timestamp_conflict',
          }),
        );
      }

      if (input.failedAt.compare(this.#state.lastFailedSynchronizationAt) < 0) {
        return err(
          synchronizationMetadataInvalid({
            field: 'lastFailedSynchronization',
            reason: 'timestamp_before_last_failure',
          }),
        );
      }
    }

    this.#state = Object.freeze({
      ...this.#state,
      lastFailedSynchronizationRunId: input.synchronizationRunId,
      lastFailedSynchronizationAt: input.failedAt,
    });

    return ok(undefined);
  }

  get id(): PlaybookSourceId {
    return this.#state.playbookSourceId;
  }

  get workspaceId(): WorkspaceId {
    return this.#state.workspaceId;
  }

  get playbookId(): PlaybookId {
    return this.#state.playbookId;
  }

  get type(): PlaybookSourceType {
    return this.#state.type;
  }

  get status(): PlaybookSourceStatus {
    return this.#state.status;
  }

  get externalRootReference(): PlaybookSourceExternalRootReference {
    return this.#state.externalRootReference;
  }

  get configurationReference(): PlaybookSourceConfigurationReference {
    return this.#state.configurationReference;
  }

  get createdAt(): Instant {
    return this.#state.createdAt;
  }

  get lastSuccessfulSynchronizationRunId(): SynchronizationRunId | null {
    return this.#state.lastSuccessfulSynchronizationRunId;
  }

  get lastSuccessfulSynchronizationAt(): Instant | null {
    return this.#state.lastSuccessfulSynchronizationAt;
  }

  get lastFailedSynchronizationRunId(): SynchronizationRunId | null {
    return this.#state.lastFailedSynchronizationRunId;
  }

  get lastFailedSynchronizationAt(): Instant | null {
    return this.#state.lastFailedSynchronizationAt;
  }
}
