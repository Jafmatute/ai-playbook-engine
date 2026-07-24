export const APPLICATION_PACKAGE_NAME = '@ai-playbook-engine/application' as const;

export {
  PERSISTENCE_OPERATION_FAILED,
  persistenceOperationFailed,
  PersistenceRevision,
  PERSISTENCE_REVISION_INVALID,
  createPersistedAggregate,
  PERSISTENCE_REVISION_CONFLICT,
  persistenceRevisionConflict,
} from './persistence/index.js';
export type {
  PersistenceOperation,
  PersistenceOperationFailedError,
  PersistenceRevisionInvalidError,
  PersistedAggregate,
  PersistenceRevisionConflictError,
} from './persistence/index.js';

// Ports
export type {
  Clock,
  WorkspaceIdGenerator,
  PlaybookIdGenerator,
  PlaybookSourceIdGenerator,
  CurrentWorkspaceProvider,
} from './ports/index.js';
export { CURRENT_WORKSPACE_UNAVAILABLE, currentWorkspaceUnavailable } from './ports/index.js';
export type { CurrentWorkspaceUnavailableError } from './ports/index.js';

// Errors
export {
  WORKSPACE_ALREADY_INITIALIZED,
  WORKSPACE_NOT_FOUND,
  WORKSPACE_NOT_ACTIVE,
  PLAYBOOK_NAME_CONFLICT,
  PLAYBOOK_NOT_FOUND,
  PLAYBOOK_ARCHIVED,
  PAGINATION_INVALID,
  workspaceAlreadyInitialized,
  workspaceNotFound,
  workspaceNotActive,
  playbookNameConflict,
  playbookNotFound,
  playbookArchived,
  ENABLED_PLAYBOOK_SOURCE_CONFLICT,
  PLAYBOOK_SOURCE_TYPE_UNSUPPORTED,
  PLAYBOOK_SOURCE_NOT_FOUND,
  enabledPlaybookSourceConflict,
  playbookSourceTypeUnsupported,
  playbookSourceNotFound,
  paginationInvalid,
} from './errors/index.js';
export type {
  WorkspaceAlreadyInitializedError,
  WorkspaceNotFoundError,
  WorkspaceNotActiveError,
  PlaybookNameConflictError,
  PlaybookNotFoundError,
  PlaybookArchivedError,
  EnabledPlaybookSourceConflictError,
  PlaybookSourceTypeUnsupportedError,
  PlaybookSourceNotFoundError,
  PaginationInvalidError,
} from './errors/index.js';

// Pagination
export type { Page } from './pagination/index.js';
export { createPage } from './pagination/index.js';
export type { PaginationRequest } from './pagination/index.js';

// Workspace
export type { WorkspaceRepository } from './workspace/index.js';
export type { InitializeWorkspaceCommand, WorkspaceOutput } from './workspace/index.js';
export {
  InitializeWorkspaceHandler,
  GetCurrentWorkspaceHandler,
  toWorkspaceOutput,
} from './workspace/index.js';

// Playbook
export type {
  PlaybookRepository,
  FindPlaybookByNormalizedNameOptions,
  PlaybookListFilter,
  PlaybookRepositoryUpdateError,
} from './playbook/index.js';
export type {
  CreatePlaybookCommand,
  RenamePlaybookCommand,
  ArchivePlaybookCommand,
  RestorePlaybookCommand,
  GetPlaybookQuery,
  ListPlaybooksQuery,
  PlaybookOutput,
} from './playbook/index.js';
export {
  CreatePlaybookHandler,
  RenamePlaybookHandler,
  ArchivePlaybookHandler,
  RestorePlaybookHandler,
  GetPlaybookHandler,
  ListPlaybooksHandler,
  toPlaybookOutput,
} from './playbook/index.js';

export type {
  PlaybookSourceRepository,
  PlaybookSourceRepositoryInsertError,
  PlaybookSourceRepositoryUpdateError,
  PlaybookSourceOutput,
  RegisterPlaybookSourceCommand,
  RegisterPlaybookSourceError,
  DisablePlaybookSourceCommand,
  DisablePlaybookSourceError,
  EnablePlaybookSourceCommand,
  EnablePlaybookSourceError,
  UpdatePlaybookSourceExternalRootReferenceCommand,
  UpdatePlaybookSourceExternalRootReferenceError,
  UpdatePlaybookSourceConfigurationReferenceCommand,
  UpdatePlaybookSourceConfigurationReferenceError,
  GetPlaybookSourceQuery,
  GetPlaybookSourceError,
  ListPlaybookSourcesQuery,
  ListPlaybookSourcesError,
} from './playbook-source/index.js';
export {
  toPlaybookSourceOutput,
  RegisterPlaybookSourceHandler,
  DisablePlaybookSourceHandler,
  EnablePlaybookSourceHandler,
  UpdatePlaybookSourceExternalRootReferenceHandler,
  UpdatePlaybookSourceConfigurationReferenceHandler,
  GetPlaybookSourceHandler,
  ListPlaybookSourcesHandler,
} from './playbook-source/index.js';
export type {
  SynchronizationRunListFilter,
  SynchronizationRunRepository,
} from './synchronization-run/index.js';
export type {
  PlaybookVersionListFilter,
  PlaybookVersionRepository,
} from './playbook-version/index.js';
export type { SynchronizationSnapshotRepository } from './synchronization-snapshot/index.js';
export type { NormalizationAttemptRepository } from './normalization-attempt/index.js';
export type { KnowledgeItemListFilter, KnowledgeItemRepository } from './knowledge-item/index.js';
export type { ValidationAttemptRepository } from './validation-attempt/index.js';
export type { KnowledgeRelationshipRepository } from './knowledge-relationship/index.js';
