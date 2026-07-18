export const APPLICATION_PACKAGE_NAME = '@ai-playbook-engine/application' as const;

export { PERSISTENCE_OPERATION_FAILED, persistenceOperationFailed } from './persistence/index.js';
export type { PersistenceOperation, PersistenceOperationFailedError } from './persistence/index.js';

// Ports
export type {
  Clock,
  WorkspaceIdGenerator,
  PlaybookIdGenerator,
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
  PAGINATION_INVALID,
  workspaceAlreadyInitialized,
  workspaceNotFound,
  workspaceNotActive,
  playbookNameConflict,
  playbookNotFound,
  paginationInvalid,
} from './errors/index.js';
export type {
  WorkspaceAlreadyInitializedError,
  WorkspaceNotFoundError,
  WorkspaceNotActiveError,
  PlaybookNameConflictError,
  PlaybookNotFoundError,
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
} from './playbook/index.js';
export type {
  CreatePlaybookCommand,
  GetPlaybookQuery,
  ListPlaybooksQuery,
  PlaybookOutput,
} from './playbook/index.js';
export {
  CreatePlaybookHandler,
  GetPlaybookHandler,
  ListPlaybooksHandler,
  toPlaybookOutput,
} from './playbook/index.js';

// Other repository types (unchanged)
export type { PlaybookSourceRepository } from './playbook-source/index.js';
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
