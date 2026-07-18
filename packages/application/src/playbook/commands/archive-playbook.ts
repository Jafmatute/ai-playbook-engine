import {
  parsePlaybookId,
  type IdentifierError,
  type PlaybookTransitionError,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { Clock, CurrentWorkspaceProvider } from '../../ports/index.js';
import type { CurrentWorkspaceUnavailableError } from '../../ports/index.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type { PlaybookRepository } from '../ports/playbook-repository.js';
import type { PlaybookOutput } from '../dto/playbook-output.js';
import { toPlaybookOutput } from '../dto/playbook-output.js';
import type {
  PersistenceOperationFailedError,
  PersistenceRevisionConflictError,
} from '../../persistence/index.js';
import { playbookNotFound, workspaceNotActive, workspaceNotFound } from '../../errors/index.js';
import type {
  PlaybookNameConflictError,
  PlaybookNotFoundError,
  WorkspaceNotActiveError,
  WorkspaceNotFoundError,
} from '../../errors/index.js';

export interface ArchivePlaybookCommand {
  readonly playbookId: string;
}

type ArchivePlaybookError =
  | IdentifierError
  | CurrentWorkspaceUnavailableError
  | WorkspaceNotFoundError
  | WorkspaceNotActiveError
  | PlaybookNotFoundError
  | PlaybookTransitionError
  | PlaybookNameConflictError
  | PersistenceRevisionConflictError
  | PersistenceOperationFailedError;

export class ArchivePlaybookHandler {
  readonly #currentWorkspaceProvider: CurrentWorkspaceProvider;
  readonly #workspaceRepository: WorkspaceRepository;
  readonly #playbookRepository: PlaybookRepository;
  readonly #clock: Clock;

  constructor(
    currentWorkspaceProvider: CurrentWorkspaceProvider,
    workspaceRepository: WorkspaceRepository,
    playbookRepository: PlaybookRepository,
    clock: Clock,
  ) {
    this.#currentWorkspaceProvider = currentWorkspaceProvider;
    this.#workspaceRepository = workspaceRepository;
    this.#playbookRepository = playbookRepository;
    this.#clock = clock;
  }

  async handle(
    command: ArchivePlaybookCommand,
  ): Promise<Result<PlaybookOutput, ArchivePlaybookError>> {
    const playbookIdResult = parsePlaybookId(command.playbookId);
    if (!playbookIdResult.success) {
      return playbookIdResult;
    }
    const playbookId = playbookIdResult.value;

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

    const playbookResult = await this.#playbookRepository.findById(workspaceId, playbookId);
    if (!playbookResult.success) {
      return playbookResult;
    }
    if (playbookResult.value === null) {
      return err(playbookNotFound());
    }
    const persisted = playbookResult.value;
    const playbook = persisted.aggregate;
    const expectedRevision = persisted.revision;

    const archivedAt = this.#clock.now();
    const archiveResult = playbook.archive({ archivedAt });
    if (!archiveResult.success) {
      return archiveResult;
    }

    const updateResult = await this.#playbookRepository.update(playbook, expectedRevision);
    if (!updateResult.success) {
      return updateResult;
    }

    return ok(toPlaybookOutput(playbook));
  }
}
