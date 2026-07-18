import type { WorkspaceId } from '@ai-playbook-engine/core';

export const WORKSPACE_ALREADY_INITIALIZED = 'WORKSPACE_ALREADY_INITIALIZED' as const;

export interface WorkspaceAlreadyInitializedError {
  readonly code: typeof WORKSPACE_ALREADY_INITIALIZED;
  readonly message: string;
  readonly details: Readonly<Record<string, never>>;
}

export function workspaceAlreadyInitialized(): WorkspaceAlreadyInitializedError {
  return Object.freeze({
    code: WORKSPACE_ALREADY_INITIALIZED,
    message: 'A workspace has already been initialized. Only one workspace is allowed.',
    details: Object.freeze({}),
  });
}

export const WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND' as const;

export interface WorkspaceNotFoundError {
  readonly code: typeof WORKSPACE_NOT_FOUND;
  readonly message: string;
  readonly details: Readonly<Record<string, never>>;
}

export function workspaceNotFound(): WorkspaceNotFoundError {
  return Object.freeze({
    code: WORKSPACE_NOT_FOUND,
    message: 'The workspace was not found.',
    details: Object.freeze({}),
  });
}

export const WORKSPACE_NOT_ACTIVE = 'WORKSPACE_NOT_ACTIVE' as const;

export interface WorkspaceNotActiveError {
  readonly code: typeof WORKSPACE_NOT_ACTIVE;
  readonly message: string;
  readonly details: {
    readonly workspaceId: WorkspaceId;
    readonly status: string;
  };
}

export function workspaceNotActive(
  workspaceId: WorkspaceId,
  status: string,
): WorkspaceNotActiveError {
  return Object.freeze({
    code: WORKSPACE_NOT_ACTIVE,
    message: 'The workspace is not active. Only active workspaces can have playbooks.',
    details: Object.freeze({ workspaceId, status }),
  });
}
