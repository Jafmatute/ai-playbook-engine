import { parsePlaybookSourceId, type IdentifierError } from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type {
  CurrentWorkspaceProvider,
  CurrentWorkspaceUnavailableError,
} from '../../ports/index.js';
import type { PlaybookSourceRepository } from '../ports/playbook-source-repository.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type { PlaybookSourceOutput } from '../dto/playbook-source-output.js';
import { toPlaybookSourceOutput } from '../dto/playbook-source-output.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import { workspaceNotFound, playbookSourceNotFound } from '../../errors/index.js';
import type { WorkspaceNotFoundError, PlaybookSourceNotFoundError } from '../../errors/index.js';

export interface GetPlaybookSourceQuery {
  readonly playbookSourceId: string;
}

export type GetPlaybookSourceError =
  | IdentifierError
  | CurrentWorkspaceUnavailableError
  | WorkspaceNotFoundError
  | PlaybookSourceNotFoundError
  | PersistenceOperationFailedError;

export class GetPlaybookSourceHandler {
  readonly #currentWorkspaceProvider: CurrentWorkspaceProvider;
  readonly #workspaceRepository: WorkspaceRepository;
  readonly #playbookSourceRepository: PlaybookSourceRepository;

  constructor(
    currentWorkspaceProvider: CurrentWorkspaceProvider,
    workspaceRepository: WorkspaceRepository,
    playbookSourceRepository: PlaybookSourceRepository,
  ) {
    this.#currentWorkspaceProvider = currentWorkspaceProvider;
    this.#workspaceRepository = workspaceRepository;
    this.#playbookSourceRepository = playbookSourceRepository;
  }

  async handle(
    query: GetPlaybookSourceQuery,
  ): Promise<Result<PlaybookSourceOutput, GetPlaybookSourceError>> {
    const playbookSourceIdResult = parsePlaybookSourceId(query.playbookSourceId);
    if (!playbookSourceIdResult.success) {
      return playbookSourceIdResult;
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

    const sourceResult = await this.#playbookSourceRepository.findById(
      workspaceId,
      playbookSourceIdResult.value,
    );
    if (!sourceResult.success) {
      return sourceResult;
    }

    if (sourceResult.value === null) {
      return err(playbookSourceNotFound(playbookSourceIdResult.value));
    }

    const source = sourceResult.value.aggregate;

    return ok(toPlaybookSourceOutput(source));
  }
}
