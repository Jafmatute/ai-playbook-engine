import type { PersistenceRevision } from './persistence-revision.js';

export interface PersistedAggregate<TAggregate> {
  readonly aggregate: TAggregate;
  readonly revision: PersistenceRevision;
}

export function createPersistedAggregate<TAggregate>(
  aggregate: TAggregate,
  revision: PersistenceRevision,
): PersistedAggregate<TAggregate> {
  const wrapper: PersistedAggregate<TAggregate> = {
    aggregate,
    revision,
  };
  return Object.freeze(wrapper);
}
