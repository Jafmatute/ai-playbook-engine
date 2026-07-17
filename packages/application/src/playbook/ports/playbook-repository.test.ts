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

import {
  PERSISTENCE_OPERATION_FAILED,
  persistenceOperationFailed,
} from '../../persistence/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import type {
  FindPlaybookByNormalizedNameOptions,
  PlaybookRepository,
} from './playbook-repository.js';

type FindByIdStubResult =
  | { readonly kind: 'playbook'; readonly playbook: Playbook }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindByNormalizedNameStubResult =
  | { readonly kind: 'playbook'; readonly playbook: Playbook }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindByNormalizedNameCall = Readonly<{
  workspaceId: WorkspaceId;
  normalizedName: string;
  options: FindPlaybookByNormalizedNameOptions;
}>;

class StubPlaybookRepository implements PlaybookRepository {
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findByNormalizedNameResult: FindByNormalizedNameStubResult;
  #findByNormalizedNameCall: FindByNormalizedNameCall | null = null;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findByNormalizedNameResult: FindByNormalizedNameStubResult = { kind: 'null' },
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findByNormalizedNameResult = findByNormalizedNameResult;
  }

  static returningPlaybook(playbook: Playbook): StubPlaybookRepository {
    return new StubPlaybookRepository({ kind: 'playbook', playbook });
  }

  static returningNull(): StubPlaybookRepository {
    return new StubPlaybookRepository({ kind: 'null' });
  }

  static returningError(error: PersistenceOperationFailedError): StubPlaybookRepository {
    return new StubPlaybookRepository({ kind: 'error', error });
  }

  static returningPlaybookByNormalizedName(playbook: Playbook): StubPlaybookRepository {
    return new StubPlaybookRepository({ kind: 'null' }, { kind: 'playbook', playbook });
  }

  static returningNoPlaybookByNormalizedName(): StubPlaybookRepository {
    return new StubPlaybookRepository({ kind: 'null' }, { kind: 'null' });
  }

  static returningFindByNormalizedNameError(
    error: PersistenceOperationFailedError,
  ): StubPlaybookRepository {
    return new StubPlaybookRepository({ kind: 'null' }, { kind: 'error', error });
  }

  get findByNormalizedNameCall(): FindByNormalizedNameCall | null {
    return this.#findByNormalizedNameCall;
  }

  async findById(
    _workspaceId: WorkspaceId,
    _playbookId: PlaybookId,
  ): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    switch (this.#findByIdResult.kind) {
      case 'playbook': {
        return ok(this.#findByIdResult.playbook);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findByIdResult.error);
      }
    }
  }

  async findByNormalizedName(
    workspaceId: WorkspaceId,
    normalizedName: string,
    options: FindPlaybookByNormalizedNameOptions,
  ): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    this.#findByNormalizedNameCall = Object.freeze({
      workspaceId,
      normalizedName,
      options: Object.freeze({ ...options }),
    });

    switch (this.#findByNormalizedNameResult.kind) {
      case 'playbook': {
        return ok(this.#findByNormalizedNameResult.playbook);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findByNormalizedNameResult.error);
      }
    }
  }
}

function createValidPlaybook(): Playbook {
  const playbookIdResult = parsePlaybookId('00000000-0000-0000-0000-000000000001');
  if (!playbookIdResult.success) {
    throw new Error('Expected a valid playbook ID fixture.');
  }

  const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!workspaceIdResult.success) {
    throw new Error('Expected a valid workspace ID fixture.');
  }

  const nameResult = PlaybookName.create('Test Playbook');
  if (!nameResult.success) {
    throw new Error('Expected a valid playbook name fixture.');
  }

  const createdAtResult = Instant.parse('2026-07-15T10:00:00.000Z');
  if (!createdAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const playbookResult = Playbook.create({
    playbookId: playbookIdResult.value,
    workspaceId: workspaceIdResult.value,
    name: nameResult.value,
    createdAt: createdAtResult.value,
  });
  if (!playbookResult.success) {
    throw new Error('Expected a valid playbook fixture.');
  }

  return playbookResult.value;
}

function createArchivedPlaybook(): Playbook {
  const playbook = createValidPlaybook();

  const archivedAtResult = Instant.parse('2026-07-16T10:00:00.000Z');
  if (!archivedAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const archiveResult = playbook.archive({ archivedAt: archivedAtResult.value });
  if (!archiveResult.success) {
    throw new Error('Expected the archive transition to succeed.');
  }

  return playbook;
}

describe('PlaybookRepository', () => {
  describe('findById — found', () => {
    it('returns a successful Result with the Playbook instance', async () => {
      const playbook = createValidPlaybook();
      const repository = StubPlaybookRepository.returningPlaybook(playbook);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbook.id);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(playbook);
    });
  });

  describe('findById — absent', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubPlaybookRepository.returningNull();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000001');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — wrong workspace', () => {
    it('returns a successful Result with null when the playbook belongs to a different workspace', async () => {
      const repository = StubPlaybookRepository.returningNull();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000001');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findById(workspaceB.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbook.findById');
      const repository = StubPlaybookRepository.returningError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000001');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbook.findById');
    });
  });

  describe('findById — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookId parameter types', () => {
      const playbook = createValidPlaybook();
      const repository = StubPlaybookRepository.returningPlaybook(playbook);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookId: PlaybookId,
      ) => Promise<Result<Playbook | null, PersistenceOperationFailedError>> = (wsId, pbId) =>
        repository.findById(wsId, pbId);

      void _acceptsTypedIds;
    });
  });

  describe('findByNormalizedName — found', () => {
    it('returns a successful Result with the Playbook instance', async () => {
      const playbook = createValidPlaybook();
      const repository = StubPlaybookRepository.returningPlaybookByNormalizedName(playbook);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findByNormalizedName(workspaceId.value, 'test playbook', {
        includeArchived: false,
      });

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(playbook);
    });
  });

  describe('findByNormalizedName — exact normalized match', () => {
    it('receives the exact normalized value from the domain', async () => {
      const nameResult = PlaybookName.create('Test Playbook');
      if (!nameResult.success) {
        throw new Error('Expected a valid playbook name fixture.');
      }

      const normalizedName = nameResult.value.normalizedValue;
      const playbook = createValidPlaybook();
      const repository = StubPlaybookRepository.returningPlaybookByNormalizedName(playbook);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      await repository.findByNormalizedName(workspaceId.value, normalizedName, {
        includeArchived: false,
      });

      const call = repository.findByNormalizedNameCall;
      expect(call).not.toBeNull();
      expect(call!.normalizedName).toBe('test playbook');
    });
  });

  describe('findByNormalizedName — absent', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubPlaybookRepository.returningNoPlaybookByNormalizedName();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findByNormalizedName(workspaceId.value, 'nonexistent', {
        includeArchived: false,
      });

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findByNormalizedName — archived excluded', () => {
    it('returns a successful Result with null when only an archived playbook matches (includeArchived: false)', async () => {
      const repository = StubPlaybookRepository.returningNoPlaybookByNormalizedName();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findByNormalizedName(workspaceId.value, 'test playbook', {
        includeArchived: false,
      });

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();

      const call = repository.findByNormalizedNameCall;
      expect(call).not.toBeNull();
      expect(call!.options.includeArchived).toBe(false);
    });
  });

  describe('findByNormalizedName — archived included', () => {
    it('returns the archived Playbook when includeArchived is true', async () => {
      const archivedPlaybook = createArchivedPlaybook();
      const repository = StubPlaybookRepository.returningPlaybookByNormalizedName(archivedPlaybook);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findByNormalizedName(workspaceId.value, 'test playbook', {
        includeArchived: true,
      });

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(archivedPlaybook);
      if (result.value === null) {
        throw new Error('Expected result.value to be a Playbook.');
      }

      expect(result.value.status).toBe('archived');

      const call = repository.findByNormalizedNameCall;
      expect(call).not.toBeNull();
      expect(call!.options.includeArchived).toBe(true);
    });
  });

  describe('findByNormalizedName — wrong workspace', () => {
    it('returns a successful Result with null when the playbook belongs to a different workspace', async () => {
      const repository = StubPlaybookRepository.returningNoPlaybookByNormalizedName();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findByNormalizedName(workspaceB.value, 'test playbook', {
        includeArchived: false,
      });

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findByNormalizedName — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbook.findByNormalizedName');
      const repository = StubPlaybookRepository.returningFindByNormalizedNameError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findByNormalizedName(workspaceId.value, 'test playbook', {
        includeArchived: false,
      });

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbook.findByNormalizedName');
    });
  });

  describe('findByNormalizedName — accepts typed signature', () => {
    it('compiles with WorkspaceId, normalizedName string, and options', () => {
      const playbook = createValidPlaybook();
      const repository = StubPlaybookRepository.returningPlaybookByNormalizedName(playbook);

      const _acceptsSignature: (
        workspaceId: WorkspaceId,
        normalizedName: string,
        options: FindPlaybookByNormalizedNameOptions,
      ) => Promise<Result<Playbook | null, PersistenceOperationFailedError>> = (wsId, name, opts) =>
        repository.findByNormalizedName(wsId, name, opts);

      void _acceptsSignature;
    });
  });
});
