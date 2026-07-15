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

export interface SynchronizationSnapshotSnapshot {
  readonly synchronizationSnapshotId: string;
  readonly workspaceId: string;
  readonly playbookSourceId: string;
  readonly synchronizationRunId: string;
  readonly contentChecksum: string;
  readonly storageReference: string;
  readonly storageFormat: SynchronizationSnapshotStorageFormat;
  readonly sourceSchemaVersion: string;
  readonly parserCompatibilityVersion: string;
  readonly createdAt: string;
}

export interface RestoreSynchronizationSnapshotInput {
  readonly synchronizationSnapshotId: SynchronizationSnapshotId;
  readonly workspaceId: WorkspaceId;
  readonly playbookSourceId: PlaybookSourceId;
  readonly synchronizationRunId: SynchronizationRunId;
  readonly contentChecksum: ContentChecksum;
  readonly storageReference: StorageReference;
  readonly storageFormat: SynchronizationSnapshotStorageFormat;
  readonly sourceSchemaVersion: SourceSchemaVersion;
  readonly parserCompatibilityVersion: ParserCompatibilityVersion;
  readonly createdAt: Instant;
}

export interface CreateSynchronizationSnapshotInput {
  readonly synchronizationSnapshotId: SynchronizationSnapshotId;
  readonly workspaceId: WorkspaceId;
  readonly playbookSourceId: PlaybookSourceId;
  readonly synchronizationRunId: SynchronizationRunId;
  readonly contentChecksum: ContentChecksum;
  readonly storageReference: StorageReference;
  readonly storageFormat: SynchronizationSnapshotStorageFormat;
  readonly sourceSchemaVersion: SourceSchemaVersion;
  readonly parserCompatibilityVersion: ParserCompatibilityVersion;
  readonly createdAt: Instant;
}

export interface SynchronizationSnapshotState {
  readonly synchronizationSnapshotId: SynchronizationSnapshotId;
  readonly workspaceId: WorkspaceId;
  readonly playbookSourceId: PlaybookSourceId;
  readonly synchronizationRunId: SynchronizationRunId;
  readonly contentChecksum: ContentChecksum;
  readonly storageReference: StorageReference;
  readonly storageFormat: SynchronizationSnapshotStorageFormat;
  readonly sourceSchemaVersion: SourceSchemaVersion;
  readonly parserCompatibilityVersion: ParserCompatibilityVersion;
  readonly createdAt: Instant;
}
