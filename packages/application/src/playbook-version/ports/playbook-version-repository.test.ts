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

// ---------------------------------------------------------------------------
// Stub
// ---------------------------------------------------------------------------

class StubPlaybookVersionRepository implements PlaybookVersionRepository {
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findBySequenceResult: FindBySequenceStubResult;
  #findBySequenceCall: FindBySequenceCall | null = null;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findBySequenceResult: FindBySequenceStubResult,
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findBySequenceResult = findBySequenceResult;
  }

  // -- findById factories ---------------------------------------------------

  static returningPlaybookVersion(playbookVersion: PlaybookVersion): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
      { kind: 'playbookVersion', playbookVersion },
      { kind: 'null' },
    );
  }

  static returningNull(): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository({ kind: 'null' }, { kind: 'null' });
  }

  static returningError(error: PersistenceOperationFailedError): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository({ kind: 'error', error }, { kind: 'null' });
  }

  // -- findBySequence factories ---------------------------------------------

  static returningPlaybookVersionBySequence(
    playbookVersion: PlaybookVersion,
  ): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
      { kind: 'null' },
      { kind: 'playbookVersion', playbookVersion },
    );
  }

  static returningNoPlaybookVersionBySequence(): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository({ kind: 'null' }, { kind: 'null' });
  }

  static returningFindBySequenceError(
    error: PersistenceOperationFailedError,
  ): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository({ kind: 'null' }, { kind: 'error', error });
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
});
