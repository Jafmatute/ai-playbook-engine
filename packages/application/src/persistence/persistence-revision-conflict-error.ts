import type { PersistenceRevision } from './persistence-revision.js';

export const PERSISTENCE_REVISION_CONFLICT = 'PERSISTENCE_REVISION_CONFLICT' as const;

export interface PersistenceRevisionConflictError {
  readonly code: typeof PERSISTENCE_REVISION_CONFLICT;
  readonly message: string;
  readonly details: Readonly<{
    readonly operation: 'playbook.update';
    readonly expectedRevision: number;
  }>;
}

export function persistenceRevisionConflict(
  expectedRevision: PersistenceRevision,
): PersistenceRevisionConflictError {
  const errorPayload: PersistenceRevisionConflictError = {
    code: PERSISTENCE_REVISION_CONFLICT,
    message: 'The persisted aggregate was modified by another operation.',
    details: {
      operation: 'playbook.update',
      expectedRevision: expectedRevision.value,
    },
  };
  // Freeze the details first, then the root error object
  Object.freeze(errorPayload.details);
  return Object.freeze(errorPayload);
}
