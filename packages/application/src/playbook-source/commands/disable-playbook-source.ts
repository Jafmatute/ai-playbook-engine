import { parsePlaybookSourceId, type IdentifierError } from '@ai-playbook-engine/core';
import type { PlaybookSourceTransitionError } from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type {
  CurrentWorkspaceProvider,
  CurrentWorkspaceUnavailableError,
} from '../../ports/index.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type { PlaybookSourceRepository } from '../ports/playbook-source-repository.js';
import type { PlaybookSourceOutput } from '../dto/playbook-source-output.js';
import { toPlaybookSourceOutput } from '../dto/playbook-source-output.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import {
  workspaceNotFound,
  workspaceNotActive,
  playbookSourceNotFound,
} from '../../errors/index.js';
import type { WorkspaceNotFoundError, WorkspaceNotActiveError } from '../../errors/index.js';
import type { PlaybookSourceRepositoryUpdateError } from '../ports/playbook-source-repository.js';

export interface DisablePlaybookSourceCommand {
  readonly playbookSourceId: string;
}

export type DisablePlaybookSourceError =
  | IdentifierError
  | CurrentWorkspaceUnavailableError
  | WorkspaceNotFoundError
  | WorkspaceNotActiveError
  | PlaybookSourceTransitionError
  | PlaybookSourceRepositoryUpdateError
  | PersistenceOperationFailedError;

export class DisablePlaybookSourceHandler {
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
    command: DisablePlaybookSourceCommand,
  ): Promise<Result<PlaybookSourceOutput, DisablePlaybookSourceError>> {
    const playbookSourceIdResult = parsePlaybookSourceId(command.playbookSourceId);
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

    if (workspaceResult.value.status !== 'active') {
      return err(workspaceNotActive(workspaceId, workspaceResult.value.status));
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

    const persisted = sourceResult.value;
    const source = persisted.aggregate;
    const expectedRevision = persisted.revision;

    const disableResult = source.disable();
    if (!disableResult.success) {
      return disableResult;
    }

    const updateResult = await this.#playbookSourceRepository.update(source, expectedRevision);
    if (!updateResult.success) {
      return updateResult;
    }

    return ok(toPlaybookSourceOutput(source));
  }
}
