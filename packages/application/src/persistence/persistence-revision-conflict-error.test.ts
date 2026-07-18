import { describe, expect, it } from 'vitest';
import {
  persistenceRevisionConflict,
  PERSISTENCE_REVISION_CONFLICT,
} from './persistence-revision-conflict-error.js';
import { PersistenceRevision } from './persistence-revision.js';

describe('PersistenceRevisionConflictError', () => {
  it('creates a correctly structured conflict error and freezes it', () => {
    const revisionResult = PersistenceRevision.from(5);
    expect(revisionResult.success).toBe(true);
    if (!revisionResult.success) return;

    const error = persistenceRevisionConflict(revisionResult.value);
    expect(error.code).toBe(PERSISTENCE_REVISION_CONFLICT);
    expect(error.message).toBe('The persisted aggregate was modified by another operation.');
    expect(error.details.operation).toBe('playbook.update');
    expect(error.details.expectedRevision).toBe(5);

    expect(Object.isFrozen(error)).toBe(true);
    expect(Object.isFrozen(error.details)).toBe(true);

    expect(Object.keys(error.details).sort()).toEqual(['expectedRevision', 'operation']);

    const errorJson = JSON.stringify(error);
    expect(errorJson).not.toContain('currentRevision');
    expect(errorJson).not.toContain('SELECT');
    expect(errorJson).not.toContain('UPDATE playbooks');
    expect(errorJson).not.toContain('stack');
  });
});
