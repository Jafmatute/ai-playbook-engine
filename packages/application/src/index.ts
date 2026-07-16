export const APPLICATION_PACKAGE_NAME = '@ai-playbook-engine/application' as const;

export { PERSISTENCE_OPERATION_FAILED, persistenceOperationFailed } from './persistence/index.js';
export type { PersistenceOperation, PersistenceOperationFailedError } from './persistence/index.js';
export type { WorkspaceRepository } from './workspace/index.js';
