import { parsePlaybookId, type IdentifierError } from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type {
  CurrentWorkspaceProvider,
  CurrentWorkspaceUnavailableError,
} from '../../ports/index.js';
import type { PlaybookSourceRepository } from '../ports/playbook-source-repository.js';
import type { PlaybookRepository } from '../../playbook/ports/playbook-repository.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type { PlaybookSourceOutput } from '../dto/playbook-source-output.js';
import { toPlaybookSourceOutput } from '../dto/playbook-source-output.js';
import { createPage } from '../../pagination/index.js';
import type { Page, PaginationRequest } from '../../pagination/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import { workspaceNotFound, playbookNotFound, paginationInvalid } from '../../errors/index.js';
import type {
  WorkspaceNotFoundError,
  PlaybookNotFoundError,
  PaginationInvalidError,
} from '../../errors/index.js';

export interface ListPlaybookSourcesQuery {
  readonly playbookId: string;
  readonly offset: number;
  readonly limit: number;
}

export type ListPlaybookSourcesError =
  | IdentifierError
  | CurrentWorkspaceUnavailableError
  | WorkspaceNotFoundError
  | PlaybookNotFoundError
  | PaginationInvalidError
  | PersistenceOperationFailedError;

export class ListPlaybookSourcesHandler {
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
    query: ListPlaybookSourcesQuery,
  ): Promise<Result<Page<PlaybookSourceOutput>, ListPlaybookSourcesError>> {
    const playbookIdResult = parsePlaybookId(query.playbookId);
    if (!playbookIdResult.success) {
      return playbookIdResult;
    }

    if (!Number.isInteger(query.offset) || query.offset < 0) {
      return err(paginationInvalid('offset must be a non-negative integer.'));
    }

    if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 100) {
      return err(paginationInvalid('limit must be an integer between 1 and 100.'));
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

    const paginationRequest: PaginationRequest = Object.freeze({
      offset: query.offset,
      limit: query.limit,
    });

    const listResult = await this.#playbookSourceRepository.listByPlaybookId(
      workspaceId,
      playbookIdResult.value,
      paginationRequest,
    );
    if (!listResult.success) {
      return listResult;
    }

    const page = listResult.value;
    const outputItems: PlaybookSourceOutput[] = [];
    for (const source of page.items) {
      outputItems.push(toPlaybookSourceOutput(source));
    }

    return ok(
      createPage({
        items: outputItems,
        offset: page.offset,
        limit: page.limit,
        hasMore: page.hasMore,
        ...(page.totalCount !== undefined ? { totalCount: page.totalCount } : {}),
      }),
    );
  }
}
