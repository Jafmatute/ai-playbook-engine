import type { PlaybookId, PlaybookSourceId, WorkspaceId } from '../identifiers.js';
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

export interface PlaybookSourceState {
  readonly playbookSourceId: PlaybookSourceId;
  readonly workspaceId: WorkspaceId;
  readonly playbookId: PlaybookId;
  readonly type: PlaybookSourceType;
  readonly status: PlaybookSourceStatus;
  readonly externalRootReference: PlaybookSourceExternalRootReference;
  readonly configurationReference: PlaybookSourceConfigurationReference;
  readonly createdAt: Instant;
}
