export const MIGRATION_FAILED = 'MIGRATION_FAILED' as const;

export interface MigrationFailedError {
  readonly code: typeof MIGRATION_FAILED;
  readonly message: string;
  readonly details: Readonly<Record<string, never>>;
}

export function migrationFailed(): MigrationFailedError {
  return Object.freeze({
    code: MIGRATION_FAILED,
    message: 'Migration failed.',
    details: Object.freeze({}),
  });
}
