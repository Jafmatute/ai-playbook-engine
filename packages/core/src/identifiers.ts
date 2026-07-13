import { err, ok, type Result } from '@ai-playbook-engine/shared';

declare const workspaceIdBrand: unique symbol;
declare const playbookIdBrand: unique symbol;

export type WorkspaceId = string & {
  readonly [workspaceIdBrand]: true;
};

export type PlaybookId = string & {
  readonly [playbookIdBrand]: true;
};

export interface IdentifierError {
  readonly code: 'INVALID_IDENTIFIER';
  readonly message: string;
  readonly details: {
    readonly expectedType: 'workspace_id' | 'playbook_id';
  };
}

const canonicalUuidPattern =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function parseWorkspaceId(rawValue: string): Result<WorkspaceId, IdentifierError> {
  const parsed = parseIdentifier(rawValue, 'workspace_id');
  return parsed.success ? ok(parsed.value as WorkspaceId) : parsed;
}

export function parsePlaybookId(rawValue: string): Result<PlaybookId, IdentifierError> {
  const parsed = parseIdentifier(rawValue, 'playbook_id');
  return parsed.success ? ok(parsed.value as PlaybookId) : parsed;
}

function parseIdentifier(
  rawValue: string,
  expectedType: IdentifierError['details']['expectedType'],
): Result<string, IdentifierError> {
  if (!canonicalUuidPattern.test(rawValue)) {
    return err(invalidIdentifier(expectedType));
  }

  return ok(rawValue.toLowerCase());
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
