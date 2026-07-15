import type {
  PlaybookSourceId,
  SynchronizationRunId,
  SynchronizationSnapshotId,
  WorkspaceId,
} from '../identifiers.js';
import type { Instant } from '../instant.js';
import type { ContentChecksum } from '../content-checksum.js';
import type { StorageReference } from '../storage-reference.js';
import type { SynchronizationSnapshotStorageFormat } from '../synchronization-snapshot-storage-format.js';
import type { SourceSchemaVersion } from '../source-schema-version.js';
import type { ParserCompatibilityVersion } from '../parser-compatibility-version.js';
import type {
  CreateSynchronizationSnapshotInput,
  SynchronizationSnapshotState,
} from './synchronization-snapshot-contracts.js';

export class SynchronizationSnapshot {
  readonly #state: SynchronizationSnapshotState;

  private constructor(state: SynchronizationSnapshotState) {
    this.#state = Object.freeze({ ...state });
    Object.freeze(this);
  }

  static create(input: CreateSynchronizationSnapshotInput): SynchronizationSnapshot {
    return new SynchronizationSnapshot({
      synchronizationSnapshotId: input.synchronizationSnapshotId,
      workspaceId: input.workspaceId,
      playbookSourceId: input.playbookSourceId,
      synchronizationRunId: input.synchronizationRunId,
      contentChecksum: input.contentChecksum,
      storageReference: input.storageReference,
      storageFormat: input.storageFormat,
      sourceSchemaVersion: input.sourceSchemaVersion,
      parserCompatibilityVersion: input.parserCompatibilityVersion,
      createdAt: input.createdAt,
    });
  }

  get id(): SynchronizationSnapshotId {
    return this.#state.synchronizationSnapshotId;
  }

  get workspaceId(): WorkspaceId {
    return this.#state.workspaceId;
  }

  get playbookSourceId(): PlaybookSourceId {
    return this.#state.playbookSourceId;
  }

  get synchronizationRunId(): SynchronizationRunId {
    return this.#state.synchronizationRunId;
  }

  get contentChecksum(): ContentChecksum {
    return this.#state.contentChecksum;
  }

  get storageReference(): StorageReference {
    return this.#state.storageReference;
  }

  get storageFormat(): SynchronizationSnapshotStorageFormat {
    return this.#state.storageFormat;
  }

  get sourceSchemaVersion(): SourceSchemaVersion {
    return this.#state.sourceSchemaVersion;
  }

  get parserCompatibilityVersion(): ParserCompatibilityVersion {
    return this.#state.parserCompatibilityVersion;
  }

  get createdAt(): Instant {
    return this.#state.createdAt;
  }
}
