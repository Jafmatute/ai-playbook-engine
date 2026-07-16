import { describe, expect, it } from 'vitest';

import { PERSISTENCE_OPERATION_FAILED, persistenceOperationFailed } from './index.js';

describe('persistenceOperationFailed', () => {
  it('creates an error with the correct shape', () => {
    const error = persistenceOperationFailed('workspace.findById');

    expect(error.code).toBe(PERSISTENCE_OPERATION_FAILED);
    expect(error.message).toBe('Persistence operation failed.');
    expect(error.details.operation).toBe('workspace.findById');
  });

  it('freezes the error object and its details', () => {
    const error = persistenceOperationFailed('workspace.findById');

    expect(Object.isFrozen(error)).toBe(true);
    expect(Object.isFrozen(error.details)).toBe(true);
  });
});
