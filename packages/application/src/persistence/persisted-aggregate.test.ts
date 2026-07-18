import { describe, expect, it } from 'vitest';
import {
  Playbook,
  PlaybookName,
  parsePlaybookId,
  parseWorkspaceId,
  Instant,
} from '@ai-playbook-engine/core';

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

  it('works with a real Playbook aggregate and preserves domain behaviors', () => {
    const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000001');
    const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
    const name = PlaybookName.create('Test Playbook');
    const createdAt = Instant.parse('2026-07-15T10:00:00.000Z');

    expect(playbookId.success).toBe(true);
    expect(workspaceId.success).toBe(true);
    expect(name.success).toBe(true);
    expect(createdAt.success).toBe(true);

    if (!playbookId.success || !workspaceId.success || !name.success || !createdAt.success) {
      return;
    }

    const playbookResult = Playbook.create({
      playbookId: playbookId.value,
      workspaceId: workspaceId.value,
      name: name.value,
      createdAt: createdAt.value,
    });
    expect(playbookResult.success).toBe(true);
    if (!playbookResult.success) return;

    const playbook = playbookResult.value;
    const revisionResult = PersistenceRevision.from(5);
    expect(revisionResult.success).toBe(true);
    if (!revisionResult.success) return;

    const persisted = createPersistedAggregate(playbook, revisionResult.value);

    // 1. el wrapper conserva exactamente la instancia del Playbook
    expect(persisted.aggregate).toBe(playbook);

    // 2. conserva exactamente la instancia de PersistenceRevision
    expect(persisted.revision).toBe(revisionResult.value);

    // 3. el wrapper está congelado
    expect(Object.isFrozen(persisted)).toBe(true);

    // 4. no clona el Aggregate
    expect(persisted.aggregate).toBe(playbook);

    // 5. no congela profundamente el Aggregate
    expect(Object.isFrozen(playbook)).toBe(false);

    // 6. el Aggregate conserva su comportamiento de dominio y se puede ejecutar una transición
    const transitionTime = Instant.parse('2026-07-15T11:00:00.000Z');
    expect(transitionTime.success).toBe(true);
    if (transitionTime.success) {
      const transitionResult = persisted.aggregate.updateDescription({
        description: 'New Description',
        updatedAt: transitionTime.value,
      });
      expect(transitionResult.success).toBe(true);
      expect(persisted.aggregate.description).toBe('New Description');
    }

    // 7. el wrapper no contiene setters
    const descAggregate = Object.getOwnPropertyDescriptor(persisted, 'aggregate');
    const descRevision = Object.getOwnPropertyDescriptor(persisted, 'revision');
    expect(descAggregate?.set).toBeUndefined();
    expect(descRevision?.set).toBeUndefined();

    // 8. no se añade revision al snapshot de Core
    const snapshot = persisted.aggregate.toSnapshot();
    expect('revision' in snapshot).toBe(false);
  });
});
