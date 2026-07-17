export const APPLICATION_PACKAGE_NAME = '@ai-playbook-engine/application' as const;

export { PERSISTENCE_OPERATION_FAILED, persistenceOperationFailed } from './persistence/index.js';
export type { PersistenceOperation, PersistenceOperationFailedError } from './persistence/index.js';
export type { WorkspaceRepository } from './workspace/index.js';
export type { FindPlaybookByNormalizedNameOptions, PlaybookRepository } from './playbook/index.js';
export type { PlaybookSourceRepository } from './playbook-source/index.js';
export type { SynchronizationRunRepository } from './synchronization-run/index.js';
export type { PlaybookVersionRepository } from './playbook-version/index.js';
export type { SynchronizationSnapshotRepository } from './synchronization-snapshot/index.js';
export type { NormalizationAttemptRepository } from './normalization-attempt/index.js';
export type { KnowledgeItemRepository } from './knowledge-item/index.js';
export type { ValidationAttemptRepository } from './validation-attempt/index.js';
