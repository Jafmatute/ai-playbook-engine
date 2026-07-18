export {
  PERSISTENCE_OPERATION_FAILED,
  persistenceOperationFailed,
} from './persistence-operation-failed-error.js';
export type {
  PersistenceOperation,
  PersistenceOperationFailedError,
} from './persistence-operation-failed-error.js';

export { PersistenceRevision, PERSISTENCE_REVISION_INVALID } from './persistence-revision.js';
export type { PersistenceRevisionInvalidError } from './persistence-revision.js';

export { createPersistedAggregate } from './persisted-aggregate.js';
export type { PersistedAggregate } from './persisted-aggregate.js';

export {
  PERSISTENCE_REVISION_CONFLICT,
  persistenceRevisionConflict,
} from './persistence-revision-conflict-error.js';
export type { PersistenceRevisionConflictError } from './persistence-revision-conflict-error.js';
