import {
  PlaybookName,
  parsePlaybookId,
  type PlaybookNameError,
  type PlaybookTransitionError,
  type IdentifierError,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { Clock, CurrentWorkspaceProvider } from '../../ports/index.js';
import type { CurrentWorkspaceUnavailableError } from '../../ports/index.js';
import type { PlaybookRepository } from '../ports/playbook-repository.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type { PlaybookOutput } from '../dto/playbook-output.js';
import { toPlaybookOutput } from '../dto/playbook-output.js';
import type {
  PersistenceOperationFailedError,
  PersistenceRevisionConflictError,
} from '../../persistence/index.js';
import {
  workspaceNotFound,
  workspaceNotActive,
  playbookNotFound,
  playbookNameConflict,
} from '../../errors/index.js';
import type {
  WorkspaceNotFoundError,
  WorkspaceNotActiveError,
  PlaybookNotFoundError,
  PlaybookNameConflictError,
} from '../../errors/index.js';

export interface RenamePlaybookCommand {
  readonly playbookId: string;
  readonly newName: string;
}

type RenamePlaybookError =
  | IdentifierError
  | CurrentWorkspaceUnavailableError
  | WorkspaceNotFoundError
  | WorkspaceNotActiveError
  | PlaybookNotFoundError
  | PlaybookNameError
  | PlaybookTransitionError
  | PlaybookNameConflictError
  | PersistenceRevisionConflictError
  | PersistenceOperationFailedError;

export class RenamePlaybookHandler {
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
    command: RenamePlaybookCommand,
  ): Promise<Result<PlaybookOutput, RenamePlaybookError>> {
    // 3.1 Validar identificador
    const playbookIdResult = parsePlaybookId(command.playbookId);
    if (!playbookIdResult.success) {
      return playbookIdResult;
    }
    const playbookId = playbookIdResult.value;

    // 3.2 Resolver Workspace actual
    const workspaceIdResult = this.#currentWorkspaceProvider.getCurrentWorkspaceId();
    if (!workspaceIdResult.success) {
      return workspaceIdResult;
    }
    const workspaceId = workspaceIdResult.value;

    // 3.3 Cargar y validar Workspace
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

    // 3.4 Validar nuevo nombre
    const nameResult = PlaybookName.create(command.newName);
    if (!nameResult.success) {
      return nameResult;
    }
    const newName = nameResult.value;

    // 3.5 Cargar Playbook con revisión
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

    // 3.6 Comprobar unicidad
    const precheckResult = await this.#playbookRepository.findByNormalizedName(
      workspaceId,
      newName.normalizedValue,
      { includeArchived: false },
    );
    if (!precheckResult.success) {
      return precheckResult;
    }

    if (precheckResult.value !== null) {
      if (precheckResult.value.id !== playbookId) {
        return err(playbookNameConflict());
      }
    }

    // 3.7 Ejecutar comportamiento de dominio
    const updatedAt = this.#clock.now();

    const renameResult = playbook.rename({
      name: newName,
      updatedAt,
    });
    if (!renameResult.success) {
      return renameResult;
    }

    // 3.8 Persistir con revisión optimista
    const updateResult = await this.#playbookRepository.update(playbook, expectedRevision);
    if (!updateResult.success) {
      return updateResult;
    }

    // 3.9 Resultado
    return ok(toPlaybookOutput(playbook));
  }
}
