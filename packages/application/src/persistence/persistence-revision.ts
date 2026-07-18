import { err, ok, type Result } from '@ai-playbook-engine/shared';

export const PERSISTENCE_REVISION_INVALID = 'PERSISTENCE_REVISION_INVALID' as const;

export interface PersistenceRevisionInvalidError {
  readonly code: typeof PERSISTENCE_REVISION_INVALID;
  readonly message: string;
  readonly details: Readonly<{
    readonly reason: 'NOT_POSITIVE_SAFE_INTEGER';
  }>;
}

export class PersistenceRevision {
  private constructor(private readonly _value: number) {
    Object.freeze(this);
  }

  static from(rawValue: number): Result<PersistenceRevision, PersistenceRevisionInvalidError> {
    if (
      typeof rawValue !== 'number' ||
      !Number.isFinite(rawValue) ||
      !Number.isSafeInteger(rawValue) ||
      rawValue < 1
    ) {
      const errorPayload: PersistenceRevisionInvalidError = Object.freeze({
        code: PERSISTENCE_REVISION_INVALID,
        message: 'Persistence revision must be a positive safe integer.',
        details: Object.freeze({
          reason: 'NOT_POSITIVE_SAFE_INTEGER',
        }),
      });
      return err(errorPayload);
    }

    return ok(new PersistenceRevision(rawValue));
  }

  get value(): number {
    return this._value;
  }

  equals(other: PersistenceRevision): boolean {
    return this._value === other.value;
  }
}
