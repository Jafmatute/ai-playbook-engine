import type {
  CurrentWorkspaceProvider,
  CurrentWorkspaceUnavailableError,
} from '@ai-playbook-engine/application';
import { currentWorkspaceUnavailable } from '@ai-playbook-engine/application';
import type { WorkspaceId } from '@ai-playbook-engine/core';
import { parseWorkspaceId } from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

export class ConfiguredCurrentWorkspaceProvider implements CurrentWorkspaceProvider {
  readonly #workspaceId: string | undefined;

  constructor(workspaceId: string | undefined) {
    this.#workspaceId = workspaceId;
  }

  getCurrentWorkspaceId(): Result<WorkspaceId, CurrentWorkspaceUnavailableError> {
    if (this.#workspaceId === undefined) {
      return err(currentWorkspaceUnavailable());
    }

    const parsed = parseWorkspaceId(this.#workspaceId);
    if (!parsed.success) {
      return err(currentWorkspaceUnavailable());
    }

    return ok(parsed.value);
  }
}
