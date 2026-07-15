import type {
  PlaybookId,
  PlaybookSourceId,
  SynchronizationRunId,
  WorkspaceId,
} from '../identifiers.js';
import type { Instant } from '../instant.js';
import type { PlaybookSourceType } from './playbook-source-type.js';
import type { PlaybookSourceStatus } from './playbook-source-status.js';
import type { PlaybookSourceExternalRootReference } from './playbook-source-external-root-reference.js';
import type { PlaybookSourceConfigurationReference } from './playbook-source-configuration-reference.js';

export interface CreatePlaybookSourceInput {
  readonly playbookSourceId: PlaybookSourceId;
  readonly workspaceId: WorkspaceId;
  readonly playbookId: PlaybookId;
  readonly type: PlaybookSourceType;
  readonly externalRootReference: PlaybookSourceExternalRootReference;
  readonly configurationReference: PlaybookSourceConfigurationReference;
  readonly createdAt: Instant;
}

export interface RestorePlaybookSourceInput {
  readonly playbookSourceId: PlaybookSourceId;
  readonly workspaceId: WorkspaceId;
  readonly playbookId: PlaybookId;
  readonly type: PlaybookSourceType;
  readonly status: PlaybookSourceStatus;
  readonly externalRootReference: PlaybookSourceExternalRootReference;
  readonly configurationReference: PlaybookSourceConfigurationReference;
  readonly createdAt: Instant;
  readonly lastSuccessfulSynchronizationRunId: SynchronizationRunId | null;
  readonly lastSuccessfulSynchronizationAt: Instant | null;
  readonly lastFailedSynchronizationRunId: SynchronizationRunId | null;
  readonly lastFailedSynchronizationAt: Instant | null;
}

export interface UpdatePlaybookSourceExternalRootReferenceInput {
  readonly externalRootReference: PlaybookSourceExternalRootReference;
}

export interface UpdatePlaybookSourceConfigurationReferenceInput {
  readonly configurationReference: PlaybookSourceConfigurationReference;
}

export interface RecordSuccessfulPlaybookSourceSynchronizationInput {
  readonly synchronizationRunId: SynchronizationRunId;
  readonly succeededAt: Instant;
}

export interface RecordFailedPlaybookSourceSynchronizationInput {
  readonly synchronizationRunId: SynchronizationRunId;
  readonly failedAt: Instant;
}

export interface PlaybookSourceSnapshot {
  readonly playbookSourceId: string;
  readonly workspaceId: string;
  readonly playbookId: string;
  readonly type: PlaybookSourceType;
  readonly status: PlaybookSourceStatus;
  readonly externalRootReference: string;
  readonly configurationReference: string;
  readonly createdAt: string;
  readonly lastSuccessfulSynchronizationRunId: string | null;
  readonly lastSuccessfulSynchronizationAt: string | null;
  readonly lastFailedSynchronizationRunId: string | null;
  readonly lastFailedSynchronizationAt: string | null;
}

export interface PlaybookSourceState {
  readonly playbookSourceId: PlaybookSourceId;
  readonly workspaceId: WorkspaceId;
  readonly playbookId: PlaybookId;
  readonly type: PlaybookSourceType;
  readonly status: PlaybookSourceStatus;
  readonly externalRootReference: PlaybookSourceExternalRootReference;
  readonly configurationReference: PlaybookSourceConfigurationReference;
  readonly createdAt: Instant;
  readonly lastSuccessfulSynchronizationRunId: SynchronizationRunId | null;
  readonly lastSuccessfulSynchronizationAt: Instant | null;
  readonly lastFailedSynchronizationRunId: SynchronizationRunId | null;
  readonly lastFailedSynchronizationAt: Instant | null;
}
