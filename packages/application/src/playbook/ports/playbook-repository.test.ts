import { describe, expect, it } from 'vitest';

import type { PlaybookId, WorkspaceId } from '@ai-playbook-engine/core';
import {
  Instant,
  parsePlaybookId,
  parseWorkspaceId,
  Playbook,
  PlaybookName,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { Page, PaginationRequest } from '../../pagination/index.js';
import type { PlaybookListFilter } from '../playbook-list-filter.js';
import {
  persistenceOperationFailed,
  PersistenceRevision,
  createPersistedAggregate,
} from '../../persistence/index.js';
import type {
  PersistedAggregate,
  PersistenceOperationFailedError,
} from '../../persistence/index.js';
import type {
  FindPlaybookByNormalizedNameOptions,
  PlaybookRepository,
  PlaybookRepositoryUpdateError,
} from './playbook-repository.js';
import type { PlaybookNameConflictError } from '../../errors/index.js';

type FindByIdStubResult =
  | { readonly kind: 'playbook'; readonly playbook: Playbook; readonly revision: number }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubPlaybookRepository implements PlaybookRepository {
  constructor(
    private readonly findByIdResult: FindByIdStubResult,
    private readonly listResult: Result<Page<Playbook>, PersistenceOperationFailedError> = ok({
      items: [],
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 0,
    }),
  ) {}

  async findById(
    _workspaceId: WorkspaceId,
    _playbookId: PlaybookId,
  ): Promise<Result<PersistedAggregate<Playbook> | null, PersistenceOperationFailedError>> {
    if (this.findByIdResult.kind === 'playbook') {
      const rev = PersistenceRevision.from(this.findByIdResult.revision);
      if (!rev.success) {
        return err(persistenceOperationFailed('playbook.findById'));
      }
      return ok(createPersistedAggregate(this.findByIdResult.playbook, rev.value));
    }
    if (this.findByIdResult.kind === 'error') {
      return err(this.findByIdResult.error);
    }
    return ok(null);
  }

  async findByNormalizedName(
    _workspaceId: WorkspaceId,
    _normalizedName: string,
    _options: FindPlaybookByNormalizedNameOptions,
  ): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    if (this.findByIdResult.kind === 'playbook') {
      return ok(this.findByIdResult.playbook);
    }
    return ok(null);
  }

  async list(
    _workspaceId: WorkspaceId,
    _filter: PlaybookListFilter,
    _pagination: PaginationRequest,
  ): Promise<Result<Page<Playbook>, PersistenceOperationFailedError>> {
    return this.listResult;
  }

  async insert(
    _playbook: Playbook,
  ): Promise<
    Result<PersistenceRevision, PlaybookNameConflictError | PersistenceOperationFailedError>
  > {
    const rev = PersistenceRevision.from(1);
    if (!rev.success) {
      return err(persistenceOperationFailed('playbook.insert'));
    }
    return ok(rev.value);
  }

  async update(
    _playbook: Playbook,
    _expectedRevision: PersistenceRevision,
  ): Promise<Result<PersistenceRevision, PlaybookRepositoryUpdateError>> {
    const rev = PersistenceRevision.from(2);
    if (!rev.success) {
      return err(persistenceOperationFailed('playbook.update'));
    }
    return ok(rev.value);
  }
}

function createValidPlaybook(): Playbook {
  const playbookIdResult = parsePlaybookId('00000000-0000-0000-0000-000000000001');
  const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  const nameResult = PlaybookName.create('Test Playbook');
  const createdAtResult = Instant.parse('2026-07-15T10:00:00.000Z');

  if (
    !playbookIdResult.success ||
    !workspaceIdResult.success ||
    !nameResult.success ||
    !createdAtResult.success
  ) {
    throw new Error('Fixture creation failed.');
  }

  const pbResult = Playbook.create({
    playbookId: playbookIdResult.value,
    workspaceId: workspaceIdResult.value,
    name: nameResult.value,
    createdAt: createdAtResult.value,
  });

  if (!pbResult.success) {
    throw new Error('Playbook aggregate creation failed.');
  }

  return pbResult.value;
}

describe('PlaybookRepository Interface Tests', () => {
  it('findById returns PersistedAggregate and conserves the revision', async () => {
    const pb = createValidPlaybook();
    const repo = new StubPlaybookRepository({ kind: 'playbook', playbook: pb, revision: 42 });
    const wsId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
    expect(wsId.success).toBe(true);
    if (!wsId.success) return;

    const res = await repo.findById(wsId.value, pb.id);
    expect(res.success).toBe(true);
    if (res.success && res.value !== null) {
      expect(res.value.aggregate).toBe(pb);
      expect(res.value.revision.value).toBe(42);
    }
  });

  it('insert returns the initial revision 1', async () => {
    const pb = createValidPlaybook();
    const repo = new StubPlaybookRepository({ kind: 'null' });
    const res = await repo.insert(pb);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.value.value).toBe(1);
    }
  });

  it('update accepts the expected revision and can return new revision', async () => {
    const pb = createValidPlaybook();
    const repo = new StubPlaybookRepository({ kind: 'null' });
    const expectedRevision = PersistenceRevision.from(1);
    expect(expectedRevision.success).toBe(true);
    if (!expectedRevision.success) return;

    const res = await repo.update(pb, expectedRevision.value);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.value.value).toBe(2);
    }
  });

  it('findByNormalizedName continues returning a plain Playbook aggregate', async () => {
    const pb = createValidPlaybook();
    const repo = new StubPlaybookRepository({ kind: 'playbook', playbook: pb, revision: 1 });
    const wsId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
    expect(wsId.success).toBe(true);
    if (!wsId.success) return;

    const res = await repo.findByNormalizedName(wsId.value, 'test playbook', {
      includeArchived: false,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.value).toBe(pb);
    }
  });

  it('list continues returning a Page of plain Playbook aggregates', async () => {
    const pb = createValidPlaybook();
    const repo = new StubPlaybookRepository(
      { kind: 'null' },
      ok({
        items: [pb],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      }),
    );
    const wsId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
    expect(wsId.success).toBe(true);
    if (!wsId.success) return;

    const res = await repo.list(wsId.value, {}, { offset: 0, limit: 25 });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.value.items).toEqual([pb]);
    }
  });
});
