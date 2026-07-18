import { describe, expect, it } from 'vitest';
import { createPersistedAggregate } from './persisted-aggregate.js';
import { PersistenceRevision } from './persistence-revision.js';

describe('PersistedAggregate', () => {
  it('conserves the aggregate instance and the revision', () => {
    const dummyAggregate = { name: 'Test Playbook' };
    const revisionResult = PersistenceRevision.from(1);
    expect(revisionResult.success).toBe(true);
    if (!revisionResult.success) return;

    const persisted = createPersistedAggregate(dummyAggregate, revisionResult.value);
    expect(persisted.aggregate).toBe(dummyAggregate);
    expect(persisted.revision).toBe(revisionResult.value);
  });

  it('freezes the wrapper object and does not clone the aggregate', () => {
    const dummyAggregate = { name: 'Test Playbook' };
    const revisionResult = PersistenceRevision.from(1);
    expect(revisionResult.success).toBe(true);
    if (!revisionResult.success) return;

    const persisted = createPersistedAggregate(dummyAggregate, revisionResult.value);
    expect(Object.isFrozen(persisted)).toBe(true);
    expect(persisted.aggregate).toBe(dummyAggregate);
  });

  it('does not deeply freeze the aggregate itself', () => {
    const dummyAggregate = { name: 'Test Playbook', nested: { val: 1 } };
    const revisionResult = PersistenceRevision.from(1);
    expect(revisionResult.success).toBe(true);
    if (!revisionResult.success) return;

    createPersistedAggregate(dummyAggregate, revisionResult.value);
    expect(Object.isFrozen(dummyAggregate)).toBe(false);
    expect(Object.isFrozen(dummyAggregate.nested)).toBe(false);
  });
});
