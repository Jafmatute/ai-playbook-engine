import type { PlaybookStatus } from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type {
  CurrentWorkspaceProvider,
  CurrentWorkspaceUnavailableError,
} from '../../ports/index.js';
import type { PlaybookRepository } from '../ports/playbook-repository.js';
import type { PlaybookListFilter } from '../playbook-list-filter.js';
import type { PlaybookOutput } from '../dto/playbook-output.js';
import { toPlaybookOutput } from '../dto/playbook-output.js';
import { createPage } from '../../pagination/index.js';
import type { PaginationRequest, Page } from '../../pagination/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import { paginationInvalid } from '../../errors/index.js';
import type { PaginationInvalidError } from '../../errors/index.js';

export interface ListPlaybooksQuery {
  readonly status?: PlaybookStatus;
  readonly namePrefix?: string;
  readonly hasActiveVersion?: boolean;
  readonly offset: number;
  readonly limit: number;
}

type ListPlaybooksError =
  CurrentWorkspaceUnavailableError | PaginationInvalidError | PersistenceOperationFailedError;

export class ListPlaybooksHandler {
  readonly #currentWorkspaceProvider: CurrentWorkspaceProvider;
  readonly #playbookRepository: PlaybookRepository;

  constructor(
    currentWorkspaceProvider: CurrentWorkspaceProvider,
    playbookRepository: PlaybookRepository,
  ) {
    this.#currentWorkspaceProvider = currentWorkspaceProvider;
    this.#playbookRepository = playbookRepository;
  }

  async handle(
    query: ListPlaybooksQuery,
  ): Promise<Result<Page<PlaybookOutput>, ListPlaybooksError>> {
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

    const filter: PlaybookListFilter = {};

    if (query.status !== undefined) {
      (filter as { status: PlaybookStatus }).status = query.status;
    }

    if (query.namePrefix !== undefined) {
      const trimmed = query.namePrefix.trim().toLowerCase();
      if (trimmed.length > 0) {
        (filter as { normalizedNamePrefix: string }).normalizedNamePrefix = trimmed;
      }
    }

    if (query.hasActiveVersion !== undefined) {
      (filter as { hasActiveVersion: boolean }).hasActiveVersion = query.hasActiveVersion;
    }

    const paginationRequest: PaginationRequest = Object.freeze({
      offset: query.offset,
      limit: query.limit,
    });

    const listResult = await this.#playbookRepository.list(
      workspaceIdResult.value,
      filter,
      paginationRequest,
    );
    if (!listResult.success) {
      return listResult;
    }

    const page = listResult.value;
    const outputItems: PlaybookOutput[] = [];
    for (const pb of page.items) {
      outputItems.push(toPlaybookOutput(pb));
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
