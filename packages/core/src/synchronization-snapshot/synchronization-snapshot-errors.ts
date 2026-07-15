export type SynchronizationSnapshotStateInvalidReason = 'UNKNOWN_STORAGE_FORMAT';

export interface SynchronizationSnapshotStateInvalidError {
  readonly code: 'SYNCHRONIZATION_SNAPSHOT_STATE_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: SynchronizationSnapshotStateInvalidReason;
  };
}

export type SynchronizationSnapshotRestorationError = SynchronizationSnapshotStateInvalidError;

export function stateInvalid(
  reason: SynchronizationSnapshotStateInvalidReason,
): SynchronizationSnapshotStateInvalidError {
  return Object.freeze({
    code: 'SYNCHRONIZATION_SNAPSHOT_STATE_INVALID' as const,
    message: 'The synchronization snapshot state is invalid.',
    details: Object.freeze({ reason }),
  });
}
