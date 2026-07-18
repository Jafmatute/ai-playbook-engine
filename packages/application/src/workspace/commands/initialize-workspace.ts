import { Workspace, WorkspaceName } from '@ai-playbook-engine/core';
import type { WorkspaceNameError, WorkspaceCreationError } from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { Clock, WorkspaceIdGenerator } from '../../ports/index.js';
import type { WorkspaceRepository } from '../ports/workspace-repository.js';
import type { WorkspaceOutput } from '../dto/workspace-output.js';
import { toWorkspaceOutput } from '../dto/workspace-output.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import { workspaceAlreadyInitialized } from '../../errors/index.js';
import type { WorkspaceAlreadyInitializedError } from '../../errors/index.js';

export interface InitializeWorkspaceCommand {
  readonly name: string;
  readonly description?: string;
}

type InitializeWorkspaceError =
  | WorkspaceAlreadyInitializedError
  | WorkspaceNameError
  | WorkspaceCreationError
  | PersistenceOperationFailedError;

export class InitializeWorkspaceHandler {
  readonly #workspaceRepository: WorkspaceRepository;
  readonly #clock: Clock;
  readonly #workspaceIdGenerator: WorkspaceIdGenerator;

  constructor(
    workspaceRepository: WorkspaceRepository,
    clock: Clock,
    workspaceIdGenerator: WorkspaceIdGenerator,
  ) {
    this.#workspaceRepository = workspaceRepository;
    this.#clock = clock;
    this.#workspaceIdGenerator = workspaceIdGenerator;
  }

  async handle(
    command: InitializeWorkspaceCommand,
  ): Promise<Result<WorkspaceOutput, InitializeWorkspaceError>> {
    const hasAnyResult = await this.#workspaceRepository.hasAnyWorkspace();
    if (!hasAnyResult.success) {
      return hasAnyResult;
    }

    if (hasAnyResult.value) {
      return err(workspaceAlreadyInitialized());
    }

    const nameResult = WorkspaceName.create(command.name);
    if (!nameResult.success) {
      return nameResult;
    }

    const workspaceId = this.#workspaceIdGenerator.generate();
    const now = this.#clock.now();

    const createInput: Record<string, unknown> = {
      workspaceId,
      name: nameResult.value,
      createdAt: now,
    };

    if (command.description !== undefined) {
      createInput.description = command.description;
    }

    const workspaceResult = Workspace.create(createInput as Parameters<typeof Workspace.create>[0]);
    if (!workspaceResult.success) {
      return workspaceResult;
    }

    const insertResult = await this.#workspaceRepository.insert(workspaceResult.value);
    if (!insertResult.success) {
      return insertResult;
    }

    return ok(toWorkspaceOutput(workspaceResult.value));
  }
}
