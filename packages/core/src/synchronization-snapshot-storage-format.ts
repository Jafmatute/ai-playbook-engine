import { err, ok, type Result } from '@ai-playbook-engine/shared';

export const synchronizationSnapshotStorageFormats = Object.freeze(['json'] as const);

export type SynchronizationSnapshotStorageFormat =
  (typeof synchronizationSnapshotStorageFormats)[number];

export interface SynchronizationSnapshotStorageFormatInvalidError {
  readonly code: 'SYNCHRONIZATION_SNAPSHOT_STORAGE_FORMAT_INVALID';
  readonly message: string;
  readonly details: {
    readonly value: string;
  };
}

export function isSynchronizationSnapshotStorageFormat(
  value: string,
): value is SynchronizationSnapshotStorageFormat {
  return value === 'json';
}

export function parseSynchronizationSnapshotStorageFormat(
  value: string,
): Result<SynchronizationSnapshotStorageFormat, SynchronizationSnapshotStorageFormatInvalidError> {
  if (isSynchronizationSnapshotStorageFormat(value)) {
    return ok(value);
  }

  return err(synchronizationSnapshotStorageFormatInvalid(value));
}

function synchronizationSnapshotStorageFormatInvalid(
  value: string,
): SynchronizationSnapshotStorageFormatInvalidError {
  return Object.freeze({
    code: 'SYNCHRONIZATION_SNAPSHOT_STORAGE_FORMAT_INVALID' as const,
    message: 'The synchronization snapshot storage format is invalid.',
    details: Object.freeze({
      value,
    }),
  });
}
