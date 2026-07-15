import { describe, expect, it } from 'vitest';

import { SynchronizationFailure, type CreateSynchronizationFailureInput } from '../index.js';

function validInput(
  overrides?: Partial<CreateSynchronizationFailureInput>,
): CreateSynchronizationFailureInput {
  return {
    code: 'AUTHENTICATION_FAILED',
    message: 'Authentication with the source failed.',
    stage: 'authentication',
    retryable: true,
    externalReference: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Creación válida
// ---------------------------------------------------------------------------

describe('SynchronizationFailure.create — valid', () => {
  it('creates a SynchronizationFailure', () => {
    const result = SynchronizationFailure.create(validInput());

    expect(result.success).toBe(true);
  });

  it('returns all getters', () => {
    const result = SynchronizationFailure.create(
      validInput({
        code: 'SOURCE_UNAVAILABLE',
        message: 'The source is not reachable.',
        stage: 'retrieval',
        retryable: false,
        externalReference: 'http-status:503',
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.code).toBe('SOURCE_UNAVAILABLE');
      expect(result.value.message).toBe('The source is not reachable.');
      expect(result.value.stage).toBe('retrieval');
      expect(result.value.retryable).toBe(false);
      expect(result.value.externalReference).toBe('http-status:503');
    }
  });

  it('accepts retryable: true', () => {
    const result = SynchronizationFailure.create(validInput({ retryable: true }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.retryable).toBe(true);
    }
  });

  it('accepts retryable: false', () => {
    const result = SynchronizationFailure.create(validInput({ retryable: false }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.retryable).toBe(false);
    }
  });

  it('accepts externalReference: null', () => {
    const result = SynchronizationFailure.create(validInput({ externalReference: null }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.externalReference).toBeNull();
    }
  });

  it('accepts an externalReference string', () => {
    const result = SynchronizationFailure.create(
      validInput({ externalReference: 'request-id:abc123' }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.externalReference).toBe('request-id:abc123');
    }
  });
});

// ---------------------------------------------------------------------------
// Código
// ---------------------------------------------------------------------------

describe('SynchronizationFailure — code validation', () => {
  it('trims whitespace from code', () => {
    const result = SynchronizationFailure.create(validInput({ code: '  AUTH_FAILED  ' }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.code).toBe('AUTH_FAILED');
    }
  });

  it('accepts max length code', () => {
    const longCode = 'A' + '_'.repeat(126);
    const result = SynchronizationFailure.create(validInput({ code: longCode }));

    expect(result.success).toBe(true);
  });

  it('rejects empty code', () => {
    const result = SynchronizationFailure.create(validInput({ code: '' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'SYNCHRONIZATION_FAILURE_INVALID',
        details: { field: 'code', reason: 'empty' },
      });
    }
  });

  it('rejects whitespace-only code', () => {
    const result = SynchronizationFailure.create(validInput({ code: '   ' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('empty');
    }
  });

  it('rejects code exceeding max length', () => {
    const longCode = 'A' + 'X'.repeat(128);
    const result = SynchronizationFailure.create(validInput({ code: longCode }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { field: 'code', reason: 'too_long' },
      });
    }
  });

  it('rejects lowercase code', () => {
    const result = SynchronizationFailure.create(validInput({ code: 'authentication_failed' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { field: 'code', reason: 'invalid_format' },
      });
    }
  });

  it('rejects code with hyphens', () => {
    const result = SynchronizationFailure.create(validInput({ code: 'AUTH-FAILED' }));

    expect(result.success).toBe(false);
  });

  it('rejects code with leading digit', () => {
    const result = SynchronizationFailure.create(validInput({ code: '1AUTH_FAILED' }));

    expect(result.success).toBe(false);
  });

  it('rejects code with spaces', () => {
    const result = SynchronizationFailure.create(validInput({ code: 'AUTH FAILED' }));

    expect(result.success).toBe(false);
  });

  it('rejects code with camelCase', () => {
    const result = SynchronizationFailure.create(validInput({ code: 'AuthFailed' }));

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Mensaje
// ---------------------------------------------------------------------------

describe('SynchronizationFailure — message validation', () => {
  it('trims whitespace from message', () => {
    const result = SynchronizationFailure.create(validInput({ message: '  some error  ' }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.message).toBe('some error');
    }
  });

  it('accepts Unicode', () => {
    const result = SynchronizationFailure.create(validInput({ message: 'ñññ' }));

    expect(result.success).toBe(true);
  });

  it('accepts punctuation and spaces', () => {
    const result = SynchronizationFailure.create(
      validInput({ message: 'Something went wrong! Check #3.' }),
    );

    expect(result.success).toBe(true);
  });

  it('rejects empty message', () => {
    const result = SynchronizationFailure.create(validInput({ message: '' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { field: 'message', reason: 'empty' },
      });
    }
  });

  it('rejects whitespace-only message', () => {
    const result = SynchronizationFailure.create(validInput({ message: '   ' }));

    expect(result.success).toBe(false);
  });

  it('rejects message exceeding max length', () => {
    const longMessage = 'x'.repeat(2_001);
    const result = SynchronizationFailure.create(validInput({ message: longMessage }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { field: 'message', reason: 'too_long' },
      });
    }
  });

  it('rejects control characters', () => {
    const result = SynchronizationFailure.create(validInput({ message: 'error\x00message' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { field: 'message', reason: 'contains_control_character' },
      });
    }
  });

  it('rejects tab character', () => {
    const result = SynchronizationFailure.create(validInput({ message: 'error\tmessage' }));

    expect(result.success).toBe(false);
  });

  it('rejects newline character', () => {
    const result = SynchronizationFailure.create(validInput({ message: 'error\nmessage' }));

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// externalReference
// ---------------------------------------------------------------------------

describe('SynchronizationFailure — externalReference validation', () => {
  it('preserves null', () => {
    const result = SynchronizationFailure.create(validInput({ externalReference: null }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.externalReference).toBeNull();
    }
  });

  it('trims whitespace', () => {
    const result = SynchronizationFailure.create(validInput({ externalReference: '  ref:abc  ' }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.externalReference).toBe('ref:abc');
    }
  });

  it('rejects empty string', () => {
    const result = SynchronizationFailure.create(validInput({ externalReference: '' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { field: 'externalReference', reason: 'empty' },
      });
    }
  });

  it('rejects whitespace-only string', () => {
    const result = SynchronizationFailure.create(validInput({ externalReference: '   ' }));

    expect(result.success).toBe(false);
  });

  it('rejects exceeding max length', () => {
    const longRef = 'x'.repeat(513);
    const result = SynchronizationFailure.create(validInput({ externalReference: longRef }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { field: 'externalReference', reason: 'too_long' },
      });
    }
  });

  it('rejects control characters', () => {
    const result = SynchronizationFailure.create(validInput({ externalReference: 'ref\x00abc' }));

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Prioridad
// ---------------------------------------------------------------------------

describe('SynchronizationFailure — validation priority', () => {
  it('reports code before message', () => {
    const result = SynchronizationFailure.create(validInput({ code: '', message: '' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.field).toBe('code');
    }
  });

  it('reports message before externalReference', () => {
    const result = SynchronizationFailure.create(
      validInput({ message: '', externalReference: '' }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.field).toBe('message');
    }
  });

  it('reports length before format within code', () => {
    const longCode = 'A' + 'X'.repeat(128);
    const result = SynchronizationFailure.create(validInput({ code: longCode }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('too_long');
    }
  });

  it('reports length before control characters within message', () => {
    const longMessage = 'x'.repeat(2_001) + '\x00';
    const result = SynchronizationFailure.create(validInput({ message: longMessage }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details.reason).toBe('too_long');
    }
  });
});

// ---------------------------------------------------------------------------
// Igualdad
// ---------------------------------------------------------------------------

describe('SynchronizationFailure — equality', () => {
  it('considers identical failures equal', () => {
    const a = SynchronizationFailure.create(validInput());
    const b = SynchronizationFailure.create(validInput());

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });

  it('detects different code', () => {
    const a = SynchronizationFailure.create(validInput({ code: 'AUTH_FAILED' }));
    const b = SynchronizationFailure.create(validInput({ code: 'OTHER_ERROR' }));

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });

  it('detects different message', () => {
    const a = SynchronizationFailure.create(validInput({ message: 'Error A.' }));
    const b = SynchronizationFailure.create(validInput({ message: 'Error B.' }));

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });

  it('detects different stage', () => {
    const a = SynchronizationFailure.create(validInput({ stage: 'authentication' }));
    const b = SynchronizationFailure.create(validInput({ stage: 'retrieval' }));

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });

  it('detects different retryable', () => {
    const a = SynchronizationFailure.create(validInput({ retryable: true }));
    const b = SynchronizationFailure.create(validInput({ retryable: false }));

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });

  it('detects different externalReference', () => {
    const a = SynchronizationFailure.create(validInput({ externalReference: null }));
    const b = SynchronizationFailure.create(validInput({ externalReference: 'ref:abc' }));

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad
// ---------------------------------------------------------------------------

describe('SynchronizationFailure — immutability', () => {
  it('instance is frozen', () => {
    const result = SynchronizationFailure.create(validInput());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it('error root is frozen', () => {
    const result = SynchronizationFailure.create(validInput({ code: '' }));

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const result = SynchronizationFailure.create(validInput({ code: '' }));

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
