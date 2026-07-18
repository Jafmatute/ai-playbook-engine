import { parsePlaybookId, type IdentifierError } from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type {
  CurrentWorkspaceProvider,
  CurrentWorkspaceUnavailableError,
} from '../../ports/index.js';
import type { PlaybookRepository } from '../ports/playbook-repository.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type { PlaybookOutput } from '../dto/playbook-output.js';
import { toPlaybookOutput } from '../dto/playbook-output.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import { workspaceNotFound, playbookNotFound } from '../../errors/index.js';
import type { WorkspaceNotFoundError, PlaybookNotFoundError } from '../../errors/index.js';

export interface GetPlaybookQuery {
  readonly playbookId: string;
}

type GetPlaybookError =
  | IdentifierError
  | CurrentWorkspaceUnavailableError
  | WorkspaceNotFoundError
  | PlaybookNotFoundError
  | PersistenceOperationFailedError;

export class GetPlaybookHandler {
  readonly #currentWorkspaceProvider: CurrentWorkspaceProvider;
  readonly #workspaceRepository: WorkspaceRepository;
  readonly #playbookRepository: PlaybookRepository;

  constructor(
    currentWorkspaceProvider: CurrentWorkspaceProvider,
    workspaceRepository: WorkspaceRepository,
    playbookRepository: PlaybookRepository,
  ) {
    this.#currentWorkspaceProvider = currentWorkspaceProvider;
    this.#workspaceRepository = workspaceRepository;
    this.#playbookRepository = playbookRepository;
  }

  async handle(query: GetPlaybookQuery): Promise<Result<PlaybookOutput, GetPlaybookError>> {
    const playbookIdResult = parsePlaybookId(query.playbookId);
    if (!playbookIdResult.success) {
      return playbookIdResult;
    }

    const workspaceIdResult = this.#currentWorkspaceProvider.getCurrentWorkspaceId();
    if (!workspaceIdResult.success) {
      return workspaceIdResult;
    }

    const workspaceId = workspaceIdResult.value;

    const workspaceResult = await this.#workspaceRepository.findById(workspaceId);
    if (!workspaceResult.success) {
      return workspaceResult;
    }

    if (workspaceResult.value === null) {
      return err(workspaceNotFound());
    }

    const playbookResult = await this.#playbookRepository.findById(
      workspaceId,
      playbookIdResult.value,
    );
    if (!playbookResult.success) {
      return playbookResult;
    }

    if (playbookResult.value === null) {
      return err(playbookNotFound());
    }

    return ok(toPlaybookOutput(playbookResult.value));
  }
}
