import type {
  Instant,
  PlaybookVersionStatus,
  SynchronizationSnapshotId,
  VersionSequence,
} from '@ai-playbook-engine/core';

export interface PlaybookVersionListFilter {
  readonly status?: PlaybookVersionStatus;
  readonly versionSequenceFrom?: VersionSequence;
  readonly versionSequenceTo?: VersionSequence;
  readonly publishedAtFrom?: Instant;
  readonly publishedAtTo?: Instant;
  readonly synchronizationSnapshotId?: SynchronizationSnapshotId;
}
