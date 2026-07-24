import { parsePlaybookSourceId, type IdentifierError } from '@ai-playbook-engine/core';
import type { PlaybookSourceTransitionError } from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type {
  CurrentWorkspaceProvider,
  CurrentWorkspaceUnavailableError,
} from '../../ports/index.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type { PlaybookRepository } from '../../playbook/ports/playbook-repository.js';
import type { PlaybookSourceRepository } from '../ports/playbook-source-repository.js';
import type { PlaybookSourceOutput } from '../dto/playbook-source-output.js';
import { toPlaybookSourceOutput } from '../dto/playbook-source-output.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import {
  workspaceNotFound,
  workspaceNotActive,
  playbookNotFound,
  playbookArchived,
  playbookSourceNotFound,
  enabledPlaybookSourceConflict,
} from '../../errors/index.js';
import type {
  WorkspaceNotFoundError,
  WorkspaceNotActiveError,
  PlaybookNotFoundError,
  PlaybookArchivedError,
} from '../../errors/index.js';
import type { PlaybookSourceRepositoryUpdateError } from '../ports/playbook-source-repository.js';

export interface EnablePlaybookSourceCommand {
  readonly playbookSourceId: string;
}

export type EnablePlaybookSourceError =
  | IdentifierError
  | CurrentWorkspaceUnavailableError
  | WorkspaceNotFoundError
  | WorkspaceNotActiveError
  | PlaybookNotFoundError
  | PlaybookArchivedError
  | PlaybookSourceTransitionError
  | PlaybookSourceRepositoryUpdateError
  | PersistenceOperationFailedError;

export class EnablePlaybookSourceHandler {
  readonly #currentWorkspaceProvider: CurrentWorkspaceProvider;
  readonly #workspaceRepository: WorkspaceRepository;
  readonly #playbookRepository: PlaybookRepository;
  readonly #playbookSourceRepository: PlaybookSourceRepository;

  constructor(
    currentWorkspaceProvider: CurrentWorkspaceProvider,
    workspaceRepository: WorkspaceRepository,
    playbookRepository: PlaybookRepository,
    playbookSourceRepository: PlaybookSourceRepository,
  ) {
    this.#currentWorkspaceProvider = currentWorkspaceProvider;
    this.#workspaceRepository = workspaceRepository;
    this.#playbookRepository = playbookRepository;
    this.#playbookSourceRepository = playbookSourceRepository;
  }

  async handle(
    command: EnablePlaybookSourceCommand,
  ): Promise<Result<PlaybookSourceOutput, EnablePlaybookSourceError>> {
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

    // Reject immediately if the source is already enabled
    if (source.status === 'enabled') {
      const transitionResult = source.enable();
      if (!transitionResult.success) {
        return transitionResult;
      }
      throw new Error('Expected enabling an enabled source to fail.');
    }

    // Load and validate the parent playbook
    const playbookResult = await this.#playbookRepository.findById(workspaceId, source.playbookId);
    if (!playbookResult.success) {
      return playbookResult;
    }

    if (playbookResult.value === null) {
      return err(playbookNotFound());
    }

    const playbook = playbookResult.value.aggregate;

    if (playbook.status === 'archived') {
      return err(playbookArchived(playbook.id));
    }

    // Check no other enabled source exists for this playbook
    const enabledResult = await this.#playbookSourceRepository.findEnabledByPlaybookId(
      workspaceId,
      source.playbookId,
    );
    if (!enabledResult.success) {
      return enabledResult;
    }

    if (enabledResult.value !== null) {
      return err(enabledPlaybookSourceConflict(source.playbookId));
    }

    // Perform the domain transition
    const enableResult = source.enable();
    if (!enableResult.success) {
      return enableResult;
    }

    // Persist optimistically
    const updateResult = await this.#playbookSourceRepository.update(source, expectedRevision);
    if (!updateResult.success) {
      return updateResult;
    }

    return ok(toPlaybookSourceOutput(source));
  }
}
