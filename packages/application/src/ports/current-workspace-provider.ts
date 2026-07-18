import type { WorkspaceId } from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

export const CURRENT_WORKSPACE_UNAVAILABLE = 'CURRENT_WORKSPACE_UNAVAILABLE' as const;

export interface CurrentWorkspaceUnavailableError {
  readonly code: typeof CURRENT_WORKSPACE_UNAVAILABLE;
  readonly message: string;
  readonly details: Readonly<Record<string, never>>;
}

export function currentWorkspaceUnavailable(): CurrentWorkspaceUnavailableError {
  return Object.freeze({
    code: CURRENT_WORKSPACE_UNAVAILABLE,
    message:
      'No current workspace is configured. Use --workspace-id or set AI_PLAYBOOK_ENGINE_WORKSPACE_ID.',
    details: Object.freeze({}),
  });
}

export interface CurrentWorkspaceProvider {
  getCurrentWorkspaceId(): Result<WorkspaceId, CurrentWorkspaceUnavailableError>;
}
