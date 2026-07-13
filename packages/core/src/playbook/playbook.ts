import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { PlaybookId, PlaybookVersionId, WorkspaceId } from '../identifiers.js';
import type { Instant } from '../instant.js';
import type { PlaybookName } from './playbook-name.js';
import type { PlaybookStatus } from './playbook-status.js';

const playbookDescriptionMaximumLength = 1000;

export interface PlaybookDescriptionError {
  readonly code: 'PLAYBOOK_DESCRIPTION_INVALID';
  readonly message: string;
  readonly details: {
    readonly maximumLength: number;
    readonly actualLength: number;
  };
}

export interface PlaybookStateInvalidError {
  readonly code: 'PLAYBOOK_STATE_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason:
      | 'ACTIVE_PLAYBOOK_CANNOT_HAVE_ARCHIVED_AT'
      | 'ARCHIVED_PLAYBOOK_REQUIRES_ARCHIVED_AT'
      | 'ARCHIVED_AT_BEFORE_CREATED_AT'
      | 'UPDATED_AT_BEFORE_CREATED_AT'
      | 'UPDATED_AT_BEFORE_ARCHIVED_AT'
      | 'TIMESTAMP_BEFORE_UPDATED_AT'
      | 'TIMESTAMP_BEFORE_CREATED_AT'
      | 'UNKNOWN_PLAYBOOK_STATUS';
  };
}

export interface PlaybookAlreadyArchivedError {
  readonly code: 'PLAYBOOK_ALREADY_ARCHIVED';
  readonly message: string;
  readonly details: {
    readonly currentStatus: 'archived';
  };
}

export interface PlaybookNotArchivedError {
  readonly code: 'PLAYBOOK_NOT_ARCHIVED';
  readonly message: string;
  readonly details: {
    readonly currentStatus: 'active';
  };
}

export type PlaybookOperation =
  'rename' | 'update_description' | 'activate_version' | 'clear_active_version';

export interface PlaybookOperationNotAllowedError {
  readonly code: 'PLAYBOOK_OPERATION_NOT_ALLOWED';
  readonly message: string;
  readonly details: {
    readonly currentStatus: 'archived';
    readonly operation: PlaybookOperation;
  };
}

export type PlaybookCreationError = PlaybookDescriptionError;
export type PlaybookRestorationError = PlaybookDescriptionError | PlaybookStateInvalidError;
export type PlaybookTransitionError =
  | PlaybookStateInvalidError
  | PlaybookAlreadyArchivedError
  | PlaybookNotArchivedError
  | PlaybookOperationNotAllowedError
  | PlaybookDescriptionError;

export interface ActivationChange {
  readonly previousActiveVersionId: PlaybookVersionId | null;
  readonly activeVersionId: PlaybookVersionId | null;
  readonly changed: boolean;
}

export interface PlaybookSnapshot {
  readonly playbookId: PlaybookId;
  readonly workspaceId: WorkspaceId;
  readonly name: string;
  readonly normalizedName: string;
  readonly status: PlaybookStatus;
  readonly description: string | null;
  readonly activeVersionId: PlaybookVersionId | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}

interface PlaybookState {
  readonly playbookId: PlaybookId;
  readonly workspaceId: WorkspaceId;
  name: PlaybookName;
  status: PlaybookStatus;
  description: string | null;
  activeVersionId: PlaybookVersionId | null;
  readonly createdAt: Instant;
  updatedAt: Instant;
  archivedAt: Instant | null;
}

export class Playbook {
  #state: PlaybookState;

  private constructor(state: PlaybookState) {
    this.#state = state;
  }

  static create(input: {
    readonly playbookId: PlaybookId;
    readonly workspaceId: WorkspaceId;
    readonly name: PlaybookName;
    readonly description?: string;
    readonly createdAt: Instant;
  }): Result<Playbook, PlaybookCreationError> {
    const description = normalizeDescription(input.description);
    if (!description.success) {
      return description;
    }

    return ok(
      new Playbook({
        playbookId: input.playbookId,
        workspaceId: input.workspaceId,
        name: input.name,
        status: 'active',
        description: description.value,
        activeVersionId: null,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
        archivedAt: null,
      }),
    );
  }

  static restore(input: {
    readonly playbookId: PlaybookId;
    readonly workspaceId: WorkspaceId;
    readonly name: PlaybookName;
    readonly status: PlaybookStatus | string;
    readonly description: string | null;
    readonly activeVersionId: PlaybookVersionId | null;
    readonly createdAt: Instant;
    readonly updatedAt: Instant;
    readonly archivedAt: Instant | null;
  }): Result<Playbook, PlaybookRestorationError> {
    const description = normalizeDescription(input.description ?? undefined);
    if (!description.success) {
      return description;
    }

    const status = input.status;
    if (!isPlaybookStatus(status)) {
      return err(stateInvalid('UNKNOWN_PLAYBOOK_STATUS'));
    }

    const stateValidation = validateRestoredState({ ...input, status });
    if (stateValidation !== null) {
      return err(stateValidation);
    }

    return ok(
      new Playbook({
        playbookId: input.playbookId,
        workspaceId: input.workspaceId,
        name: input.name,
        status,
        description: description.value,
        activeVersionId: input.activeVersionId ?? null,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
        archivedAt: input.archivedAt,
      }),
    );
  }

  get id(): PlaybookId {
    return this.#state.playbookId;
  }

  get workspaceId(): WorkspaceId {
    return this.#state.workspaceId;
  }

  get name(): PlaybookName {
    return this.#state.name;
  }

  get status(): PlaybookStatus {
    return this.#state.status;
  }

  get description(): string | null {
    return this.#state.description;
  }

  get activeVersionId(): PlaybookVersionId | null {
    return this.#state.activeVersionId;
  }

  get createdAt(): Instant {
    return this.#state.createdAt;
  }

  get updatedAt(): Instant {
    return this.#state.updatedAt;
  }

  get archivedAt(): Instant | null {
    return this.#state.archivedAt;
  }

  rename(input: {
    readonly name: PlaybookName;
    readonly updatedAt: Instant;
  }): Result<void, PlaybookTransitionError> {
    if (this.#state.status === 'archived') {
      return err(operationNotAllowed('rename'));
    }

    if (input.updatedAt.compare(this.#state.updatedAt) < 0) {
      return err(stateInvalid('TIMESTAMP_BEFORE_UPDATED_AT'));
    }

    this.#state.name = input.name;
    this.#state.updatedAt = input.updatedAt;
    return ok(undefined);
  }

  updateDescription(input: {
    readonly description?: string;
    readonly updatedAt: Instant;
  }): Result<void, PlaybookTransitionError> {
    if (this.#state.status === 'archived') {
      return err(operationNotAllowed('update_description'));
    }

    const description = normalizeDescription(input.description);
    if (!description.success) {
      return description;
    }

    if (input.updatedAt.compare(this.#state.updatedAt) < 0) {
      return err(stateInvalid('TIMESTAMP_BEFORE_UPDATED_AT'));
    }

    this.#state.description = description.value;
    this.#state.updatedAt = input.updatedAt;
    return ok(undefined);
  }

  activateVersion(input: {
    readonly playbookVersionId: PlaybookVersionId;
    readonly activatedAt: Instant;
  }): Result<ActivationChange, PlaybookTransitionError> {
    if (this.#state.status === 'archived') {
      return err(operationNotAllowed('activate_version'));
    }

    if (this.#state.activeVersionId === input.playbookVersionId) {
      return ok({
        previousActiveVersionId: this.#state.activeVersionId,
        activeVersionId: this.#state.activeVersionId,
        changed: false,
      });
    }

    if (input.activatedAt.compare(this.#state.updatedAt) < 0) {
      return err(stateInvalid('TIMESTAMP_BEFORE_UPDATED_AT'));
    }

    const previous = this.#state.activeVersionId;
    this.#state.activeVersionId = input.playbookVersionId;
    this.#state.updatedAt = input.activatedAt;
    return ok({
      previousActiveVersionId: previous,
      activeVersionId: this.#state.activeVersionId,
      changed: true,
    });
  }

  clearActiveVersion(input: {
    readonly clearedAt: Instant;
  }): Result<ActivationChange, PlaybookTransitionError> {
    if (this.#state.status === 'archived') {
      return err(operationNotAllowed('clear_active_version'));
    }

    if (this.#state.activeVersionId === null) {
      return ok({
        previousActiveVersionId: null,
        activeVersionId: null,
        changed: false,
      });
    }

    if (input.clearedAt.compare(this.#state.updatedAt) < 0) {
      return err(stateInvalid('TIMESTAMP_BEFORE_UPDATED_AT'));
    }

    const previous = this.#state.activeVersionId;
    this.#state.activeVersionId = null;
    this.#state.updatedAt = input.clearedAt;
    return ok({
      previousActiveVersionId: previous,
      activeVersionId: null,
      changed: true,
    });
  }

  archive(input: { readonly archivedAt: Instant }): Result<void, PlaybookTransitionError> {
    if (this.#state.status === 'archived') {
      return err(alreadyArchived());
    }

    if (input.archivedAt.compare(this.#state.createdAt) < 0) {
      return err(stateInvalid('TIMESTAMP_BEFORE_CREATED_AT'));
    }

    if (input.archivedAt.compare(this.#state.updatedAt) < 0) {
      return err(stateInvalid('TIMESTAMP_BEFORE_UPDATED_AT'));
    }

    this.#state.status = 'archived';
    this.#state.archivedAt = input.archivedAt;
    this.#state.updatedAt = input.archivedAt;
    return ok(undefined);
  }

  restoreFromArchive(input: {
    readonly restoredAt: Instant;
  }): Result<void, PlaybookTransitionError> {
    if (this.#state.status === 'active') {
      return err(notArchived());
    }

    if (input.restoredAt.compare(this.#state.updatedAt) < 0) {
      return err(stateInvalid('TIMESTAMP_BEFORE_UPDATED_AT'));
    }

    this.#state.status = 'active';
    this.#state.archivedAt = null;
    this.#state.updatedAt = input.restoredAt;
    return ok(undefined);
  }

  toSnapshot(): PlaybookSnapshot {
    return Object.freeze({
      playbookId: this.#state.playbookId,
      workspaceId: this.#state.workspaceId,
      name: this.#state.name.value,
      normalizedName: this.#state.name.normalizedValue,
      status: this.#state.status,
      description: this.#state.description,
      activeVersionId: this.#state.activeVersionId,
      createdAt: this.#state.createdAt.toString(),
      updatedAt: this.#state.updatedAt.toString(),
      archivedAt: this.#state.archivedAt?.toString() ?? null,
    });
  }
}

function normalizeDescription(
  rawValue: string | undefined,
): Result<string | null, PlaybookDescriptionError> {
  if (rawValue === undefined) {
    return ok(null);
  }

  const value = rawValue.trim();
  if (value.length === 0) {
    return ok(null);
  }

  if (value.length > playbookDescriptionMaximumLength) {
    return err(descriptionInvalid(value.length));
  }

  return ok(value);
}

function validateRestoredState(input: {
  readonly status: PlaybookStatus;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
  readonly archivedAt: Instant | null;
}): PlaybookStateInvalidError | null {
  if (input.updatedAt.compare(input.createdAt) < 0) {
    return stateInvalid('UPDATED_AT_BEFORE_CREATED_AT');
  }

  if (input.status === 'active' && input.archivedAt !== null) {
    return stateInvalid('ACTIVE_PLAYBOOK_CANNOT_HAVE_ARCHIVED_AT');
  }

  if (input.status === 'archived' && input.archivedAt === null) {
    return stateInvalid('ARCHIVED_PLAYBOOK_REQUIRES_ARCHIVED_AT');
  }

  if (input.archivedAt !== null) {
    if (input.archivedAt.compare(input.createdAt) < 0) {
      return stateInvalid('ARCHIVED_AT_BEFORE_CREATED_AT');
    }

    if (input.updatedAt.compare(input.archivedAt) < 0) {
      return stateInvalid('UPDATED_AT_BEFORE_ARCHIVED_AT');
    }
  }

  return null;
}

function isPlaybookStatus(value: string): value is PlaybookStatus {
  return value === 'active' || value === 'archived';
}

function descriptionInvalid(actualLength: number): PlaybookDescriptionError {
  return Object.freeze({
    code: 'PLAYBOOK_DESCRIPTION_INVALID' as const,
    message: 'The playbook description exceeds the maximum length.',
    details: Object.freeze({
      maximumLength: playbookDescriptionMaximumLength,
      actualLength,
    }),
  });
}

function stateInvalid(
  reason: PlaybookStateInvalidError['details']['reason'],
): PlaybookStateInvalidError {
  return Object.freeze({
    code: 'PLAYBOOK_STATE_INVALID' as const,
    message: 'The playbook state is inconsistent.',
    details: Object.freeze({ reason }),
  });
}

function alreadyArchived(): PlaybookAlreadyArchivedError {
  return Object.freeze({
    code: 'PLAYBOOK_ALREADY_ARCHIVED' as const,
    message: 'The playbook is already archived.',
    details: Object.freeze({ currentStatus: 'archived' as const }),
  });
}

function notArchived(): PlaybookNotArchivedError {
  return Object.freeze({
    code: 'PLAYBOOK_NOT_ARCHIVED' as const,
    message: 'The playbook is not archived.',
    details: Object.freeze({ currentStatus: 'active' as const }),
  });
}

function operationNotAllowed(operation: PlaybookOperation): PlaybookOperationNotAllowedError {
  return Object.freeze({
    code: 'PLAYBOOK_OPERATION_NOT_ALLOWED' as const,
    message: 'The operation is not allowed for an archived playbook.',
    details: Object.freeze({
      currentStatus: 'archived' as const,
      operation,
    }),
  });
}
