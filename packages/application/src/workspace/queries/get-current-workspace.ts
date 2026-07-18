import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type {
  CurrentWorkspaceProvider,
  CurrentWorkspaceUnavailableError,
} from '../../ports/index.js';
import type { WorkspaceRepository } from '../ports/workspace-repository.js';
import type { WorkspaceOutput } from '../dto/workspace-output.js';
import { toWorkspaceOutput } from '../dto/workspace-output.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import { workspaceNotFound } from '../../errors/index.js';
import type { WorkspaceNotFoundError } from '../../errors/index.js';

type GetCurrentWorkspaceError =
  CurrentWorkspaceUnavailableError | WorkspaceNotFoundError | PersistenceOperationFailedError;

export class GetCurrentWorkspaceHandler {
  readonly #currentWorkspaceProvider: CurrentWorkspaceProvider;
  readonly #workspaceRepository: WorkspaceRepository;

  constructor(
    currentWorkspaceProvider: CurrentWorkspaceProvider,
    workspaceRepository: WorkspaceRepository,
  ) {
    this.#currentWorkspaceProvider = currentWorkspaceProvider;
    this.#workspaceRepository = workspaceRepository;
  }

  async handle(): Promise<Result<WorkspaceOutput, GetCurrentWorkspaceError>> {
    const workspaceIdResult = this.#currentWorkspaceProvider.getCurrentWorkspaceId();
    if (!workspaceIdResult.success) {
      return workspaceIdResult;
    }

    const workspaceResult = await this.#workspaceRepository.findById(workspaceIdResult.value);
    if (!workspaceResult.success) {
      return workspaceResult;
    }

    if (workspaceResult.value === null) {
      return err(workspaceNotFound());
    }

    return ok(toWorkspaceOutput(workspaceResult.value));
  }
}
