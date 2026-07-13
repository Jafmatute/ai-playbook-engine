import { err, ok, type Result } from '@ai-playbook-engine/shared';

declare const workspaceIdBrand: unique symbol;
declare const playbookIdBrand: unique symbol;
declare const playbookVersionIdBrand: unique symbol;
declare const synchronizationSnapshotIdBrand: unique symbol;
declare const normalizationAttemptIdBrand: unique symbol;
declare const validationAttemptIdBrand: unique symbol;
declare const knowledgeItemIdBrand: unique symbol;
declare const canonicalUuidBrand: unique symbol;

type CanonicalUuid = string & {
  readonly [canonicalUuidBrand]: true;
};

export type WorkspaceId = CanonicalUuid & {
  readonly [workspaceIdBrand]: true;
};

export type PlaybookId = CanonicalUuid & {
  readonly [playbookIdBrand]: true;
};

export type PlaybookVersionId = CanonicalUuid & {
  readonly [playbookVersionIdBrand]: true;
};

export type SynchronizationSnapshotId = CanonicalUuid & {
  readonly [synchronizationSnapshotIdBrand]: true;
};

export type NormalizationAttemptId = CanonicalUuid & {
  readonly [normalizationAttemptIdBrand]: true;
};

export type ValidationAttemptId = CanonicalUuid & {
  readonly [validationAttemptIdBrand]: true;
};

export type KnowledgeItemId = CanonicalUuid & {
  readonly [knowledgeItemIdBrand]: true;
};

export interface IdentifierError {
  readonly code: 'INVALID_IDENTIFIER';
  readonly message: string;
  readonly details: {
    readonly expectedType:
      | 'workspace_id'
      | 'playbook_id'
      | 'playbook_version_id'
      | 'synchronization_snapshot_id'
      | 'normalization_attempt_id'
      | 'validation_attempt_id'
      | 'knowledge_item_id';
  };
}

const canonicalUuidPattern =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function parseWorkspaceId(rawValue: string): Result<WorkspaceId, IdentifierError> {
  const parsed = parseIdentifier(rawValue, 'workspace_id');
  return parsed.success ? ok(createWorkspaceId(parsed.value)) : parsed;
}

export function parsePlaybookId(rawValue: string): Result<PlaybookId, IdentifierError> {
  const parsed = parseIdentifier(rawValue, 'playbook_id');
  return parsed.success ? ok(createPlaybookId(parsed.value)) : parsed;
}

export function parsePlaybookVersionId(
  rawValue: string,
): Result<PlaybookVersionId, IdentifierError> {
  const parsed = parseIdentifier(rawValue, 'playbook_version_id');
  return parsed.success ? ok(createPlaybookVersionId(parsed.value)) : parsed;
}

export function parseSynchronizationSnapshotId(
  rawValue: string,
): Result<SynchronizationSnapshotId, IdentifierError> {
  const parsed = parseIdentifier(rawValue, 'synchronization_snapshot_id');
  return parsed.success ? ok(createSynchronizationSnapshotId(parsed.value)) : parsed;
}

export function parseNormalizationAttemptId(
  rawValue: string,
): Result<NormalizationAttemptId, IdentifierError> {
  const parsed = parseIdentifier(rawValue, 'normalization_attempt_id');
  return parsed.success ? ok(createNormalizationAttemptId(parsed.value)) : parsed;
}

export function parseValidationAttemptId(
  rawValue: string,
): Result<ValidationAttemptId, IdentifierError> {
  const parsed = parseIdentifier(rawValue, 'validation_attempt_id');
  return parsed.success ? ok(createValidationAttemptId(parsed.value)) : parsed;
}

export function parseKnowledgeItemId(rawValue: string): Result<KnowledgeItemId, IdentifierError> {
  const parsed = parseIdentifier(rawValue, 'knowledge_item_id');
  return parsed.success ? ok(createKnowledgeItemId(parsed.value)) : parsed;
}

function parseIdentifier(
  rawValue: string,
  expectedType: IdentifierError['details']['expectedType'],
): Result<CanonicalUuid, IdentifierError> {
  if (!canonicalUuidPattern.test(rawValue)) {
    return err(invalidIdentifier(expectedType));
  }

  return ok(createCanonicalUuid(rawValue.toLowerCase()));
}

function createCanonicalUuid(value: string): CanonicalUuid {
  return value as CanonicalUuid;
}

function createWorkspaceId(value: CanonicalUuid): WorkspaceId {
  return value as WorkspaceId;
}

function createPlaybookId(value: CanonicalUuid): PlaybookId {
  return value as PlaybookId;
}

function createPlaybookVersionId(value: CanonicalUuid): PlaybookVersionId {
  return value as PlaybookVersionId;
}

function createSynchronizationSnapshotId(value: CanonicalUuid): SynchronizationSnapshotId {
  return value as SynchronizationSnapshotId;
}

function createNormalizationAttemptId(value: CanonicalUuid): NormalizationAttemptId {
  return value as NormalizationAttemptId;
}

function createValidationAttemptId(value: CanonicalUuid): ValidationAttemptId {
  return value as ValidationAttemptId;
}

function createKnowledgeItemId(value: CanonicalUuid): KnowledgeItemId {
  return value as KnowledgeItemId;
}

function invalidIdentifier(
  expectedType: IdentifierError['details']['expectedType'],
): IdentifierError {
  return Object.freeze({
    code: 'INVALID_IDENTIFIER' as const,
    message: 'The identifier must be a canonical UUID.',
    details: Object.freeze({ expectedType }),
  });
}
