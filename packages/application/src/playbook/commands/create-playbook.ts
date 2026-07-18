import { Playbook, PlaybookName } from '@ai-playbook-engine/core';
import type { PlaybookNameError, PlaybookCreationError } from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { Clock, CurrentWorkspaceProvider, PlaybookIdGenerator } from '../../ports/index.js';
import type { CurrentWorkspaceUnavailableError } from '../../ports/index.js';
import type { PlaybookRepository } from '../ports/playbook-repository.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type { PlaybookOutput } from '../dto/playbook-output.js';
import { toPlaybookOutput } from '../dto/playbook-output.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import { workspaceNotFound, workspaceNotActive, playbookNameConflict } from '../../errors/index.js';
import type {
  WorkspaceNotFoundError,
  WorkspaceNotActiveError,
  PlaybookNameConflictError,
} from '../../errors/index.js';

export interface CreatePlaybookCommand {
  readonly name: string;
  readonly description?: string;
}

type CreatePlaybookError =
  | CurrentWorkspaceUnavailableError
  | WorkspaceNotFoundError
  | WorkspaceNotActiveError
  | PlaybookNameError
  | PlaybookCreationError
  | PlaybookNameConflictError
  | PersistenceOperationFailedError;

export class CreatePlaybookHandler {
  readonly #currentWorkspaceProvider: CurrentWorkspaceProvider;
  readonly #workspaceRepository: WorkspaceRepository;
  readonly #playbookRepository: PlaybookRepository;
  readonly #clock: Clock;
  readonly #playbookIdGenerator: PlaybookIdGenerator;

  constructor(
    currentWorkspaceProvider: CurrentWorkspaceProvider,
    workspaceRepository: WorkspaceRepository,
    playbookRepository: PlaybookRepository,
    clock: Clock,
    playbookIdGenerator: PlaybookIdGenerator,
  ) {
    this.#currentWorkspaceProvider = currentWorkspaceProvider;
    this.#workspaceRepository = workspaceRepository;
    this.#playbookRepository = playbookRepository;
    this.#clock = clock;
    this.#playbookIdGenerator = playbookIdGenerator;
  }

  async handle(
    command: CreatePlaybookCommand,
  ): Promise<Result<PlaybookOutput, CreatePlaybookError>> {
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

    const nameResult = PlaybookName.create(command.name);
    if (!nameResult.success) {
      return nameResult;
    }

    const precheckResult = await this.#playbookRepository.findByNormalizedName(
      workspaceId,
      nameResult.value.normalizedValue,
      { includeArchived: false },
    );
    if (!precheckResult.success) {
      return precheckResult;
    }

    if (precheckResult.value !== null) {
      return err(playbookNameConflict());
    }

    const playbookId = this.#playbookIdGenerator.generate();
    const now = this.#clock.now();

    const createInput: Record<string, unknown> = {
      playbookId,
      workspaceId,
      name: nameResult.value,
      createdAt: now,
    };

    if (command.description !== undefined) {
      createInput.description = command.description;
    }

    const playbookResult = Playbook.create(createInput as Parameters<typeof Playbook.create>[0]);
    if (!playbookResult.success) {
      return playbookResult;
    }

    const insertResult = await this.#playbookRepository.insert(playbookResult.value);
    if (!insertResult.success) {
      return insertResult;
    }

    return ok(toPlaybookOutput(playbookResult.value));
  }
}
