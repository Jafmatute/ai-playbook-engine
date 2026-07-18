import { describe, expect, it } from 'vitest';

import { renderJsonSuccess, renderJsonError } from './json-renderer.js';

describe('renderJsonSuccess', () => {
  it('renders success response with data', () => {
    const result = renderJsonSuccess({ workspaceId: 'abc-123', name: 'Test' });

    expect(result).toBe(
      JSON.stringify({ success: true, data: { workspaceId: 'abc-123', name: 'Test' } }, null, 2),
    );
  });

  it('renders success with array data', () => {
    const result = renderJsonSuccess([1, 2, 3]);

    expect(result).toBe(JSON.stringify({ success: true, data: [1, 2, 3] }, null, 2));
  });
});

describe('renderJsonError', () => {
  it('renders error response with code, message, and details', () => {
    const result = renderJsonError('INVALID_INPUT', 'Name is required.', { field: 'name' });

    expect(result).toBe(
      JSON.stringify(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Name is required.',
            details: { field: 'name' },
          },
        },
        null,
        2,
      ),
    );
  });

  it('renders error with empty details', () => {
    const result = renderJsonError('NOT_FOUND', 'Workspace not found.', {});

    expect(result).toBe(
      JSON.stringify(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Workspace not found.',
            details: {},
          },
        },
        null,
        2,
      ),
    );
  });
});
