import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { WorkspaceId } from '../identifiers.js';
import type { Instant } from '../instant.js';
import type { WorkspaceName } from './workspace-name.js';
import type { WorkspaceStatus } from './workspace-status.js';

const workspaceDescriptionMaximumLength = 500;

export interface WorkspaceDescriptionError {
  readonly code: 'WORKSPACE_DESCRIPTION_INVALID';
  readonly message: string;
  readonly details: {
    readonly maximumLength: number;
    readonly actualLength: number;
  };
}

export interface WorkspaceStateInvalidError {
  readonly code: 'WORKSPACE_STATE_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason:
      | 'ACTIVE_WORKSPACE_CANNOT_HAVE_ARCHIVED_AT'
      | 'ARCHIVED_WORKSPACE_REQUIRES_ARCHIVED_AT'
      | 'ARCHIVED_AT_BEFORE_CREATED_AT'
      | 'UPDATED_AT_BEFORE_CREATED_AT'
      | 'UPDATED_AT_BEFORE_ARCHIVED_AT'
      | 'TIMESTAMP_BEFORE_UPDATED_AT'
      | 'TIMESTAMP_BEFORE_CREATED_AT'
      | 'UNKNOWN_WORKSPACE_STATUS';
  };
}

export interface WorkspaceAlreadyArchivedError {
  readonly code: 'WORKSPACE_ALREADY_ARCHIVED';
  readonly message: string;
  readonly details: {
    readonly currentStatus: 'archived';
  };
}

export interface WorkspaceNotArchivedError {
  readonly code: 'WORKSPACE_NOT_ARCHIVED';
  readonly message: string;
  readonly details: {
    readonly currentStatus: 'active';
  };
}

export interface WorkspaceOperationNotAllowedError {
  readonly code: 'WORKSPACE_OPERATION_NOT_ALLOWED';
  readonly message: string;
  readonly details: {
    readonly currentStatus: 'archived';
    readonly operation: 'rename';
  };
}

export type WorkspaceCreationError = WorkspaceDescriptionError;
export type WorkspaceRestorationError = WorkspaceDescriptionError | WorkspaceStateInvalidError;
export type WorkspaceTransitionError =
  | WorkspaceStateInvalidError
  | WorkspaceAlreadyArchivedError
  | WorkspaceNotArchivedError
  | WorkspaceOperationNotAllowedError;

export interface WorkspaceSnapshot {
  readonly workspaceId: WorkspaceId;
  readonly name: string;
  readonly normalizedName: string;
  readonly status: WorkspaceStatus;
  readonly description: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}

interface WorkspaceState {
  readonly workspaceId: WorkspaceId;
  name: WorkspaceName;
  status: WorkspaceStatus;
  description: string | null;
  readonly createdAt: Instant;
  updatedAt: Instant;
  archivedAt: Instant | null;
}

export class Workspace {
  #state: WorkspaceState;

  private constructor(state: WorkspaceState) {
    this.#state = state;
  }

  static create(input: {
    readonly workspaceId: WorkspaceId;
    readonly name: WorkspaceName;
    readonly description?: string;
    readonly createdAt: Instant;
  }): Result<Workspace, WorkspaceCreationError> {
    const description = normalizeDescription(input.description);
    if (!description.success) {
      return description;
    }

    return ok(
      new Workspace({
        workspaceId: input.workspaceId,
        name: input.name,
        status: 'active',
        description: description.value,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
        archivedAt: null,
      }),
    );
  }

  static restore(input: {
    readonly workspaceId: WorkspaceId;
    readonly name: WorkspaceName;
    readonly status: WorkspaceStatus | string;
    readonly description: string | null;
    readonly createdAt: Instant;
    readonly updatedAt: Instant;
    readonly archivedAt: Instant | null;
  }): Result<Workspace, WorkspaceRestorationError> {
    const description = normalizeDescription(input.description ?? undefined);
    if (!description.success) {
      return description;
    }

    const status = input.status;
    if (!isWorkspaceStatus(status)) {
      return err(stateInvalid('UNKNOWN_WORKSPACE_STATUS'));
    }

    const stateValidation = validateRestoredState({ ...input, status });
    if (stateValidation !== null) {
      return err(stateValidation);
    }

    return ok(
      new Workspace({
        workspaceId: input.workspaceId,
        name: input.name,
        status,
        description: description.value,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
        archivedAt: input.archivedAt,
      }),
    );
  }

  get id(): WorkspaceId {
    return this.#state.workspaceId;
  }

  get name(): WorkspaceName {
    return this.#state.name;
  }

  get status(): WorkspaceStatus {
    return this.#state.status;
  }

  get description(): string | null {
    return this.#state.description;
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
    readonly name: WorkspaceName;
    readonly updatedAt: Instant;
  }): Result<void, WorkspaceTransitionError> {
    if (this.#state.status === 'archived') {
      return err(operationNotAllowed());
    }

    if (input.updatedAt.compare(this.#state.updatedAt) < 0) {
      return err(stateInvalid('TIMESTAMP_BEFORE_UPDATED_AT'));
    }

    this.#state.name = input.name;
    this.#state.updatedAt = input.updatedAt;
    return ok(undefined);
  }

  archive(input: { readonly archivedAt: Instant }): Result<void, WorkspaceTransitionError> {
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
  }): Result<void, WorkspaceTransitionError> {
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

  toSnapshot(): WorkspaceSnapshot {
    return Object.freeze({
      workspaceId: this.#state.workspaceId,
      name: this.#state.name.value,
      normalizedName: this.#state.name.normalizedValue,
      status: this.#state.status,
      description: this.#state.description,
      createdAt: this.#state.createdAt.toString(),
      updatedAt: this.#state.updatedAt.toString(),
      archivedAt: this.#state.archivedAt?.toString() ?? null,
    });
  }
}

function normalizeDescription(
  rawValue: string | undefined,
): Result<string | null, WorkspaceDescriptionError> {
  if (rawValue === undefined) {
    return ok(null);
  }

  const value = rawValue.trim();
  if (value.length === 0) {
    return ok(null);
  }

  if (value.length > workspaceDescriptionMaximumLength) {
    return err(descriptionInvalid(value.length));
  }

  return ok(value);
}

function validateRestoredState(input: {
  readonly status: WorkspaceStatus;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
  readonly archivedAt: Instant | null;
}): WorkspaceStateInvalidError | null {
  if (input.updatedAt.compare(input.createdAt) < 0) {
    return stateInvalid('UPDATED_AT_BEFORE_CREATED_AT');
  }

  if (input.status === 'active' && input.archivedAt !== null) {
    return stateInvalid('ACTIVE_WORKSPACE_CANNOT_HAVE_ARCHIVED_AT');
  }

  if (input.status === 'archived' && input.archivedAt === null) {
    return stateInvalid('ARCHIVED_WORKSPACE_REQUIRES_ARCHIVED_AT');
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

function isWorkspaceStatus(value: string): value is WorkspaceStatus {
  return value === 'active' || value === 'archived';
}

function descriptionInvalid(actualLength: number): WorkspaceDescriptionError {
  return Object.freeze({
    code: 'WORKSPACE_DESCRIPTION_INVALID' as const,
    message: 'The workspace description exceeds the maximum length.',
    details: Object.freeze({
      maximumLength: workspaceDescriptionMaximumLength,
      actualLength,
    }),
  });
}

function stateInvalid(
  reason: WorkspaceStateInvalidError['details']['reason'],
): WorkspaceStateInvalidError {
  return Object.freeze({
    code: 'WORKSPACE_STATE_INVALID' as const,
    message: 'The workspace state is inconsistent.',
    details: Object.freeze({ reason }),
  });
}

function alreadyArchived(): WorkspaceAlreadyArchivedError {
  return Object.freeze({
    code: 'WORKSPACE_ALREADY_ARCHIVED' as const,
    message: 'The workspace is already archived.',
    details: Object.freeze({ currentStatus: 'archived' as const }),
  });
}

function notArchived(): WorkspaceNotArchivedError {
  return Object.freeze({
    code: 'WORKSPACE_NOT_ARCHIVED' as const,
    message: 'The workspace is not archived.',
    details: Object.freeze({ currentStatus: 'active' as const }),
  });
}

function operationNotAllowed(): WorkspaceOperationNotAllowedError {
  return Object.freeze({
    code: 'WORKSPACE_OPERATION_NOT_ALLOWED' as const,
    message: 'The operation is not allowed for an archived workspace.',
    details: Object.freeze({
      currentStatus: 'archived' as const,
      operation: 'rename' as const,
    }),
  });
}
