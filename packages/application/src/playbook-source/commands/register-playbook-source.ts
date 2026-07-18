import {
  isPlaybookSourceType,
  parsePlaybookId,
  PlaybookSource,
  PlaybookSourceConfigurationReference,
  PlaybookSourceExternalRootReference,
  type IdentifierError,
  type PlaybookSourceConfigurationReferenceError,
  type PlaybookSourceExternalRootReferenceError,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';
import type {
  Clock,
  CurrentWorkspaceProvider,
  PlaybookSourceIdGenerator,
} from '../../ports/index.js';
import type { CurrentWorkspaceUnavailableError } from '../../ports/index.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type { PlaybookRepository } from '../../playbook/ports/playbook-repository.js';
import type { PlaybookSourceRepository } from '../ports/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import {
  enabledPlaybookSourceConflict,
  playbookArchived,
  playbookNotFound,
  playbookSourceTypeUnsupported,
  workspaceNotActive,
  workspaceNotFound,
} from '../../errors/index.js';
import type {
  EnabledPlaybookSourceConflictError,
  PlaybookArchivedError,
  PlaybookNotFoundError,
  PlaybookSourceTypeUnsupportedError,
  WorkspaceNotActiveError,
  WorkspaceNotFoundError,
} from '../../errors/index.js';
import type { PlaybookSourceOutput } from '../dto/index.js';
import { toPlaybookSourceOutput } from '../dto/index.js';

export interface RegisterPlaybookSourceCommand {
  readonly playbookId: string;
  readonly type: string;
  readonly externalRootReference: string;
  readonly configurationReference: string;
}
type RegisterError =
  | IdentifierError
  | PlaybookSourceTypeUnsupportedError
  | PlaybookSourceExternalRootReferenceError
  | PlaybookSourceConfigurationReferenceError
  | CurrentWorkspaceUnavailableError
  | WorkspaceNotFoundError
  | WorkspaceNotActiveError
  | PlaybookNotFoundError
  | PlaybookArchivedError
  | EnabledPlaybookSourceConflictError
  | PersistenceOperationFailedError;
export class RegisterPlaybookSourceHandler {
  constructor(
    private readonly currentWorkspaceProvider: CurrentWorkspaceProvider,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly playbookRepository: PlaybookRepository,
    private readonly sourceRepository: PlaybookSourceRepository,
    private readonly clock: Clock,
    private readonly sourceIdGenerator: PlaybookSourceIdGenerator,
  ) {}
  async handle(
    command: RegisterPlaybookSourceCommand,
  ): Promise<Result<PlaybookSourceOutput, RegisterError>> {
    const id = parsePlaybookId(command.playbookId);
    if (!id.success) return id;
    if (!isPlaybookSourceType(command.type))
      return err(playbookSourceTypeUnsupported(command.type));
    const external = PlaybookSourceExternalRootReference.create(command.externalRootReference);
    if (!external.success) return external;
    const configuration = PlaybookSourceConfigurationReference.create(
      command.configurationReference,
    );
    if (!configuration.success) return configuration;
    const current = this.currentWorkspaceProvider.getCurrentWorkspaceId();
    if (!current.success) return current;
    const workspace = await this.workspaceRepository.findById(current.value);
    if (!workspace.success) return workspace;
    if (workspace.value === null) return err(workspaceNotFound());
    if (workspace.value.status !== 'active')
      return err(workspaceNotActive(current.value, workspace.value.status));
    const playbookResult = await this.playbookRepository.findById(current.value, id.value);
    if (!playbookResult.success) return playbookResult;
    if (playbookResult.value === null) return err(playbookNotFound());
    const playbook = playbookResult.value.aggregate;
    if (playbook.status === 'archived') return err(playbookArchived(playbook.id));
    const existing = await this.sourceRepository.findEnabledByPlaybookId(
      current.value,
      playbook.id,
    );
    if (!existing.success) return existing;
    if (existing.value !== null) return err(enabledPlaybookSourceConflict(playbook.id));
    const source = PlaybookSource.create({
      playbookSourceId: this.sourceIdGenerator.generate(),
      workspaceId: current.value,
      playbookId: playbook.id,
      type: command.type,
      externalRootReference: external.value,
      configurationReference: configuration.value,
      createdAt: this.clock.now(),
    });
    const inserted = await this.sourceRepository.insert(source);
    if (!inserted.success) return inserted;
    return ok(toPlaybookSourceOutput(source));
  }
}
