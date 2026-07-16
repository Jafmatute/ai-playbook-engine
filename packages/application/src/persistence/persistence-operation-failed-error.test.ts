import { describe, expect, it } from 'vitest';

import { PERSISTENCE_OPERATION_FAILED, persistenceOperationFailed } from './index.js';

const operations = [
  'workspace.findById',
  'workspace.hasAnyWorkspace',
  'playbook.findById',
  'playbookSource.findById',
  'synchronizationRun.findById',
] as const;

describe('persistenceOperationFailed', () => {
  for (const operation of operations) {
    describe(`for operation '${operation}'`, () => {
      it('creates an error with the correct shape', () => {
        const error = persistenceOperationFailed(operation);

        expect(error.code).toBe(PERSISTENCE_OPERATION_FAILED);
        expect(error.message).toBe('Persistence operation failed.');
        expect(error.details.operation).toBe(operation);
      });

      it('freezes the error object and its details', () => {
        const error = persistenceOperationFailed(operation);

        expect(Object.isFrozen(error)).toBe(true);
        expect(Object.isFrozen(error.details)).toBe(true);
      });
    });
  }
});
