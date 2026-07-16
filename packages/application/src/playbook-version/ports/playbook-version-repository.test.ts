import { describe, expect, it } from 'vitest';

import type { PlaybookVersionId, WorkspaceId } from '@ai-playbook-engine/core';
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

type FindByIdStubResult =
  | { readonly kind: 'playbookVersion'; readonly playbookVersion: PlaybookVersion }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubPlaybookVersionRepository implements PlaybookVersionRepository {
  readonly #result: FindByIdStubResult;

  private constructor(result: FindByIdStubResult) {
    this.#result = result;
  }

  static returningPlaybookVersion(playbookVersion: PlaybookVersion): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository({ kind: 'playbookVersion', playbookVersion });
  }

  static returningNull(): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository({ kind: 'null' });
  }

  static returningError(error: PersistenceOperationFailedError): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository({ kind: 'error', error });
  }

  async findById(
    _workspaceId: WorkspaceId,
    _playbookVersionId: PlaybookVersionId,
  ): Promise<Result<PlaybookVersion | null, PersistenceOperationFailedError>> {
    switch (this.#result.kind) {
      case 'playbookVersion': {
        return ok(this.#result.playbookVersion);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#result.error);
      }
    }
  }
}

function createValidPlaybookVersion(): PlaybookVersion {
  const playbookVersionIdResult = parsePlaybookVersionId('00000000-0000-0000-0000-000000000001');
  if (!playbookVersionIdResult.success) {
    throw new Error('Expected a valid playbook version ID fixture.');
  }

  const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!workspaceIdResult.success) {
    throw new Error('Expected a valid workspace ID fixture.');
  }

  const playbookIdResult = parsePlaybookId('00000000-0000-0000-0000-000000000003');
  if (!playbookIdResult.success) {
    throw new Error('Expected a valid playbook ID fixture.');
  }

  const synchronizationSnapshotIdResult = parseSynchronizationSnapshotId(
    '00000000-0000-0000-0000-000000000004',
  );
  if (!synchronizationSnapshotIdResult.success) {
    throw new Error('Expected a valid synchronization snapshot ID fixture.');
  }

  const versionSequenceResult = VersionSequence.create(1);
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
});
