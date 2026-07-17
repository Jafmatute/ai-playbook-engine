import { describe, expect, it } from 'vitest';

import type { PlaybookId, PlaybookVersionId, WorkspaceId } from '@ai-playbook-engine/core';
import {
  ContentChecksum,
  Instant,
  NormalizationSchemaVersion,
  parsePlaybookId,
  parsePlaybookVersionId,
  parseSynchronizationSnapshotId,
  parseWorkspaceId,
  ParserVersion,
  PlaybookVersion,
  VersionLabel,
  VersionSequence,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import {
  PERSISTENCE_OPERATION_FAILED,
  persistenceOperationFailed,
} from '../../persistence/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import type { PlaybookVersionRepository } from './playbook-version-repository.js';

// ---------------------------------------------------------------------------
// Stub result types
// ---------------------------------------------------------------------------

type FindByIdStubResult =
  | { readonly kind: 'playbookVersion'; readonly playbookVersion: PlaybookVersion }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindBySequenceStubResult =
  | { readonly kind: 'playbookVersion'; readonly playbookVersion: PlaybookVersion }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindBySequenceCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookId: PlaybookId;
  versionSequence: VersionSequence;
}>;

type FindLatestByPlaybookIdStubResult =
  | { readonly kind: 'playbookVersion'; readonly playbookVersion: PlaybookVersion }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindLatestByPlaybookIdCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookId: PlaybookId;
}>;

// ---------------------------------------------------------------------------
// Stub
// ---------------------------------------------------------------------------

class StubPlaybookVersionRepository implements PlaybookVersionRepository {
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findBySequenceResult: FindBySequenceStubResult;
  readonly #findLatestByPlaybookIdResult: FindLatestByPlaybookIdStubResult;
  #findBySequenceCall: FindBySequenceCall | null = null;
  #findLatestByPlaybookIdCall: FindLatestByPlaybookIdCall | null = null;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findBySequenceResult: FindBySequenceStubResult,
    findLatestByPlaybookIdResult: FindLatestByPlaybookIdStubResult,
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findBySequenceResult = findBySequenceResult;
    this.#findLatestByPlaybookIdResult = findLatestByPlaybookIdResult;
  }

  // -- findById factories ---------------------------------------------------

  static returningPlaybookVersion(playbookVersion: PlaybookVersion): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
      { kind: 'playbookVersion', playbookVersion },
      { kind: 'null' },
      { kind: 'null' },
    );
  }

  static returningNull(): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository({ kind: 'null' }, { kind: 'null' }, { kind: 'null' });
  }

  static returningError(error: PersistenceOperationFailedError): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
      { kind: 'error', error },
      { kind: 'null' },
      { kind: 'null' },
    );
  }

  // -- findBySequence factories ---------------------------------------------

  static returningPlaybookVersionBySequence(
    playbookVersion: PlaybookVersion,
  ): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
      { kind: 'null' },
      { kind: 'playbookVersion', playbookVersion },
      { kind: 'null' },
    );
  }

  static returningNoPlaybookVersionBySequence(): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository({ kind: 'null' }, { kind: 'null' }, { kind: 'null' });
  }

  static returningFindBySequenceError(
    error: PersistenceOperationFailedError,
  ): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
      { kind: 'null' },
      { kind: 'error', error },
      { kind: 'null' },
    );
  }

  // -- findLatestByPlaybookId factories -------------------------------------

  static returningLatestPlaybookVersion(
    playbookVersion: PlaybookVersion,
  ): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'playbookVersion', playbookVersion },
    );
  }

  static returningNoLatestPlaybookVersion(): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository({ kind: 'null' }, { kind: 'null' }, { kind: 'null' });
  }

  static returningFindLatestByPlaybookIdError(
    error: PersistenceOperationFailedError,
  ): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'error', error },
    );
  }

  // -- findLatestByPlaybookId ------------------------------------------------

  get findLatestByPlaybookIdCall(): FindLatestByPlaybookIdCall | null {
    return this.#findLatestByPlaybookIdCall;
  }

  async findLatestByPlaybookId(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
  ): Promise<Result<PlaybookVersion | null, PersistenceOperationFailedError>> {
    this.#findLatestByPlaybookIdCall = Object.freeze({ workspaceId, playbookId });

    switch (this.#findLatestByPlaybookIdResult.kind) {
      case 'playbookVersion': {
        return ok(this.#findLatestByPlaybookIdResult.playbookVersion);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findLatestByPlaybookIdResult.error);
      }
    }
  }

  // -- findById -------------------------------------------------------------

  async findById(
    _workspaceId: WorkspaceId,
    _playbookVersionId: PlaybookVersionId,
  ): Promise<Result<PlaybookVersion | null, PersistenceOperationFailedError>> {
    switch (this.#findByIdResult.kind) {
      case 'playbookVersion': {
        return ok(this.#findByIdResult.playbookVersion);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findByIdResult.error);
      }
    }
  }

  // -- findBySequence -------------------------------------------------------

  get findBySequenceCall(): FindBySequenceCall | null {
    return this.#findBySequenceCall;
  }

  async findBySequence(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
    versionSequence: VersionSequence,
  ): Promise<Result<PlaybookVersion | null, PersistenceOperationFailedError>> {
    this.#findBySequenceCall = Object.freeze({ workspaceId, playbookId, versionSequence });

    switch (this.#findBySequenceResult.kind) {
      case 'playbookVersion': {
        return ok(this.#findBySequenceResult.playbookVersion);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findBySequenceResult.error);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

interface PlaybookVersionFixtureOptions {
  readonly playbookVersionId: string;
  readonly playbookId: string;
  readonly versionSequence: number;
}

function createValidPlaybookVersion(
  options?: Partial<PlaybookVersionFixtureOptions>,
): PlaybookVersion {
  const playbookVersionIdRaw = options?.playbookVersionId ?? '00000000-0000-0000-0000-000000000001';
  const playbookVersionIdResult = parsePlaybookVersionId(playbookVersionIdRaw);
  if (!playbookVersionIdResult.success) {
    throw new Error('Expected a valid playbook version ID fixture.');
  }

  const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!workspaceIdResult.success) {
    throw new Error('Expected a valid workspace ID fixture.');
  }

  const playbookIdRaw = options?.playbookId ?? '00000000-0000-0000-0000-000000000003';
  const playbookIdResult = parsePlaybookId(playbookIdRaw);
  if (!playbookIdResult.success) {
    throw new Error('Expected a valid playbook ID fixture.');
  }

  const synchronizationSnapshotIdResult = parseSynchronizationSnapshotId(
    '00000000-0000-0000-0000-000000000004',
  );
  if (!synchronizationSnapshotIdResult.success) {
    throw new Error('Expected a valid synchronization snapshot ID fixture.');
  }

  const versionSequenceRaw = options?.versionSequence ?? 1;
  const versionSequenceResult = VersionSequence.create(versionSequenceRaw);
  if (!versionSequenceResult.success) {
    throw new Error('Expected a valid version sequence fixture.');
  }

  const versionLabelResult = VersionLabel.create('v1.0');
  if (!versionLabelResult.success) {
    throw new Error('Expected a valid version label fixture.');
  }

  const parserVersionResult = ParserVersion.create('1.0.0');
  if (!parserVersionResult.success) {
    throw new Error('Expected a valid parser version fixture.');
  }

  const normalizationSchemaVersionResult = NormalizationSchemaVersion.create('1.0.0');
  if (!normalizationSchemaVersionResult.success) {
    throw new Error('Expected a valid normalization schema version fixture.');
  }

  const contentChecksumResult = ContentChecksum.create(
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  );
  if (!contentChecksumResult.success) {
    throw new Error('Expected a valid content checksum fixture.');
  }

  const createdAtResult = Instant.parse('2026-07-15T10:00:00.000Z');
  if (!createdAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const playbookVersionResult = PlaybookVersion.create({
    playbookVersionId: playbookVersionIdResult.value,
    workspaceId: workspaceIdResult.value,
    playbookId: playbookIdResult.value,
    synchronizationSnapshotId: synchronizationSnapshotIdResult.value,
    versionSequence: versionSequenceResult.value,
    versionLabel: versionLabelResult.value,
    parserVersion: parserVersionResult.value,
    normalizationSchemaVersion: normalizationSchemaVersionResult.value,
    sourceContentChecksum: contentChecksumResult.value,
    createdAt: createdAtResult.value,
  });
  if (!playbookVersionResult.success) {
    throw new Error('Expected a valid playbook version fixture.');
  }

  return playbookVersionResult.value;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlaybookVersionRepository', () => {
  describe('findById — found', () => {
    it('returns a successful Result with the PlaybookVersion instance', async () => {
      const playbookVersion = createValidPlaybookVersion();
      const repository = StubPlaybookVersionRepository.returningPlaybookVersion(playbookVersion);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookVersion.id);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(playbookVersion);
    });
  });

  describe('findById — absent', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubPlaybookVersionRepository.returningNull();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000001');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookVersionId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — wrong workspace', () => {
    it('returns a successful Result with null when the version belongs to a different workspace', async () => {
      const repository = StubPlaybookVersionRepository.returningNull();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000001');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findById(workspaceB.value, playbookVersionId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbookVersion.findById');
      const repository = StubPlaybookVersionRepository.returningError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000001');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookVersionId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbookVersion.findById');
    });
  });

  describe('findById — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookVersionId parameter types', () => {
      const playbookVersion = createValidPlaybookVersion();
      const repository = StubPlaybookVersionRepository.returningPlaybookVersion(playbookVersion);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookVersionId: PlaybookVersionId,
      ) => Promise<Result<PlaybookVersion | null, PersistenceOperationFailedError>> = (
        wsId,
        pvId,
      ) => repository.findById(wsId, pvId);

      void _acceptsTypedIds;
    });
  });

  // -------------------------------------------------------------------------
  // findBySequence
  // -------------------------------------------------------------------------

  describe('findBySequence — found', () => {
    it('returns a successful Result with the PlaybookVersion instance', async () => {
      const playbookVersion = createValidPlaybookVersion({ versionSequence: 2 });
      const repository =
        StubPlaybookVersionRepository.returningPlaybookVersionBySequence(playbookVersion);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const versionSequenceResult = VersionSequence.create(2);
      if (!versionSequenceResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      const result = await repository.findBySequence(
        workspaceId.value,
        playbookId.value,
        versionSequenceResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(playbookVersion);
      expect(playbookVersion.versionSequence.value).toBe(2);
    });
  });

  describe('findBySequence — sequence not found', () => {
    it('returns a successful Result with null when the sequence does not exist', async () => {
      const repository = StubPlaybookVersionRepository.returningNoPlaybookVersionBySequence();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const versionSequenceResult = VersionSequence.create(99);
      if (!versionSequenceResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      const result = await repository.findBySequence(
        workspaceId.value,
        playbookId.value,
        versionSequenceResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findBySequence — playbook not found', () => {
    it('returns a successful Result with null when the playbook does not exist', async () => {
      const repository = StubPlaybookVersionRepository.returningNoPlaybookVersionBySequence();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const nonExistentPlaybookId = parsePlaybookId('00000000-0000-0000-0000-00000000ffff');
      if (!nonExistentPlaybookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const versionSequenceResult = VersionSequence.create(1);
      if (!versionSequenceResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      const result = await repository.findBySequence(
        workspaceId.value,
        nonExistentPlaybookId.value,
        versionSequenceResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findBySequence — wrong workspace', () => {
    it('returns a successful Result with null when queried from a different workspace', async () => {
      const repository = StubPlaybookVersionRepository.returningNoPlaybookVersionBySequence();
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const versionSequenceResult = VersionSequence.create(1);
      if (!versionSequenceResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      const result = await repository.findBySequence(
        workspaceB.value,
        playbookId.value,
        versionSequenceResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findBySequence — same sequence in different playbook', () => {
    it('returns a successful Result with null for a non-matching playbook', async () => {
      const repository = StubPlaybookVersionRepository.returningNoPlaybookVersionBySequence();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const otherPlaybookId = parsePlaybookId('00000000-0000-0000-0000-00000000000a');
      if (!otherPlaybookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const versionSequenceResult = VersionSequence.create(1);
      if (!versionSequenceResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      const result = await repository.findBySequence(
        workspaceId.value,
        otherPlaybookId.value,
        versionSequenceResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findBySequence — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbookVersion.findBySequence');
      const repository = StubPlaybookVersionRepository.returningFindBySequenceError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const versionSequenceResult = VersionSequence.create(1);
      if (!versionSequenceResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      const result = await repository.findBySequence(
        workspaceId.value,
        playbookId.value,
        versionSequenceResult.value,
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbookVersion.findBySequence');
    });
  });

  describe('findBySequence — argument capture', () => {
    it('captures the workspaceId, playbookId, and versionSequence from the last call', async () => {
      const playbookVersion = createValidPlaybookVersion({ versionSequence: 3 });
      const repository =
        StubPlaybookVersionRepository.returningPlaybookVersionBySequence(playbookVersion);

      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const versionSequenceResult = VersionSequence.create(3);
      if (!versionSequenceResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      await repository.findBySequence(
        workspaceId.value,
        playbookId.value,
        versionSequenceResult.value,
      );

      const call = repository.findBySequenceCall;

      expect(call).not.toBeNull();
      expect(call!.workspaceId).toBe(workspaceId.value);
      expect(call!.playbookId).toBe(playbookId.value);
      expect(call!.versionSequence).toBe(versionSequenceResult.value);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('findBySequence — accepts typed IDs', () => {
    it('compiles with WorkspaceId, PlaybookId, and VersionSequence parameter types', () => {
      const playbookVersion = createValidPlaybookVersion();
      const repository =
        StubPlaybookVersionRepository.returningPlaybookVersionBySequence(playbookVersion);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookId: PlaybookId,
        versionSequence: VersionSequence,
      ) => Promise<Result<PlaybookVersion | null, PersistenceOperationFailedError>> = (
        wsId,
        pbId,
        vs,
      ) => repository.findBySequence(wsId, pbId, vs);

      void _acceptsTypedIds;
    });
  });

  // -------------------------------------------------------------------------
  // findLatestByPlaybookId
  // -------------------------------------------------------------------------

  describe('findLatestByPlaybookId — found', () => {
    it('returns the version with the highest sequence', async () => {
      const seq1 = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000001',
        versionSequence: 1,
      });
      const seq2 = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
        versionSequence: 2,
      });
      const seq3 = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000003',
        versionSequence: 3,
      });

      expect(seq1.playbookId).toBe(seq2.playbookId);
      expect(seq2.playbookId).toBe(seq3.playbookId);
      expect(seq3.playbookId).toBe(seq1.playbookId);
      expect(seq1.id).not.toBe(seq2.id);
      expect(seq2.id).not.toBe(seq3.id);

      const repository = StubPlaybookVersionRepository.returningLatestPlaybookVersion(seq3);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findLatestByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(seq3);
      expect(result.value).not.toBe(seq1);
      expect(result.value).not.toBe(seq2);
      expect(seq3.versionSequence.value).toBe(3);
    });
  });

  describe('findLatestByPlaybookId — no versions', () => {
    it('returns a successful Result with null when the playbook has no versions', async () => {
      const repository = StubPlaybookVersionRepository.returningNoLatestPlaybookVersion();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findLatestByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestByPlaybookId — playbook not found', () => {
    it('returns a successful Result with null when the playbook does not exist', async () => {
      const repository = StubPlaybookVersionRepository.returningNoLatestPlaybookVersion();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const nonExistentPlaybookId = parsePlaybookId('00000000-0000-0000-0000-00000000ffff');
      if (!nonExistentPlaybookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findLatestByPlaybookId(
        workspaceId.value,
        nonExistentPlaybookId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestByPlaybookId — wrong workspace', () => {
    it('returns a successful Result with null when queried from a different workspace', async () => {
      const repository = StubPlaybookVersionRepository.returningNoLatestPlaybookVersion();
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findLatestByPlaybookId(workspaceB.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestByPlaybookId — higher sequence in another playbook', () => {
    it('returns the latest version for the queried playbook, unaffected by other playbooks', async () => {
      const playbookAseq3 = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000001',
        playbookId: '00000000-0000-0000-0000-00000000000a',
        versionSequence: 3,
      });
      const playbookBseq10 = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
        playbookId: '00000000-0000-0000-0000-00000000000b',
        versionSequence: 10,
      });

      expect(playbookAseq3.playbookId).not.toBe(playbookBseq10.playbookId);
      expect(playbookAseq3.versionSequence.value).toBe(3);
      expect(playbookBseq10.versionSequence.value).toBe(10);

      const repository =
        StubPlaybookVersionRepository.returningLatestPlaybookVersion(playbookAseq3);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookAId = parsePlaybookId('00000000-0000-0000-0000-00000000000a');
      if (!playbookAId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findLatestByPlaybookId(workspaceId.value, playbookAId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(playbookAseq3);
      expect(result.value).not.toBe(playbookBseq10);
    });
  });

  describe('findLatestByPlaybookId — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbookVersion.findLatestByPlaybookId');
      const repository = StubPlaybookVersionRepository.returningFindLatestByPlaybookIdError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findLatestByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbookVersion.findLatestByPlaybookId');
    });
  });

  describe('findLatestByPlaybookId — argument capture', () => {
    it('captures the workspaceId and playbookId from the last call', async () => {
      const playbookVersion = createValidPlaybookVersion({ versionSequence: 5 });
      const repository =
        StubPlaybookVersionRepository.returningLatestPlaybookVersion(playbookVersion);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      await repository.findLatestByPlaybookId(workspaceId.value, playbookId.value);

      const call = repository.findLatestByPlaybookIdCall;

      expect(call).not.toBeNull();
      expect(call!.workspaceId).toBe(workspaceId.value);
      expect(call!.playbookId).toBe(playbookId.value);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('findLatestByPlaybookId — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookId parameter types', () => {
      const playbookVersion = createValidPlaybookVersion();
      const repository =
        StubPlaybookVersionRepository.returningLatestPlaybookVersion(playbookVersion);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookId: PlaybookId,
      ) => Promise<Result<PlaybookVersion | null, PersistenceOperationFailedError>> = (
        wsId,
        pbId,
      ) => repository.findLatestByPlaybookId(wsId, pbId);

      void _acceptsTypedIds;
    });
  });
});
