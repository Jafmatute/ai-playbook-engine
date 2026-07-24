import { ExitCode } from './exit-codes.js';

export function mapErrorToExitCode(errorCode: string): ExitCode {
  switch (errorCode) {
    case 'INVALID_IDENTIFIER':
    case 'WORKSPACE_NAME_REQUIRED':
    case 'WORKSPACE_NAME_INVALID':
    case 'WORKSPACE_DESCRIPTION_INVALID':
    case 'PLAYBOOK_NAME_REQUIRED':
    case 'PLAYBOOK_NAME_INVALID':
    case 'PLAYBOOK_DESCRIPTION_INVALID':
    case 'PAGINATION_INVALID':
    case 'PLAYBOOK_SOURCE_TYPE_UNSUPPORTED':
    case 'PLAYBOOK_SOURCE_EXTERNAL_ROOT_REFERENCE_INVALID':
    case 'PLAYBOOK_SOURCE_CONFIGURATION_REFERENCE_INVALID':
      return ExitCode.INVALID_INPUT;

    case 'WORKSPACE_NOT_FOUND':
    case 'PLAYBOOK_NOT_FOUND':
    case 'PLAYBOOK_SOURCE_NOT_FOUND':
      return ExitCode.NOT_FOUND;

    case 'WORKSPACE_ALREADY_INITIALIZED':
    case 'PLAYBOOK_NAME_CONFLICT':
    case 'WORKSPACE_NOT_ACTIVE':
    case 'PERSISTENCE_REVISION_CONFLICT':
    case 'PLAYBOOK_OPERATION_NOT_ALLOWED':
    case 'PLAYBOOK_ALREADY_ARCHIVED':
    case 'PLAYBOOK_NOT_ARCHIVED':
    case 'ENABLED_PLAYBOOK_SOURCE_CONFLICT':
    case 'PLAYBOOK_ARCHIVED':
    case 'PLAYBOOK_SOURCE_TRANSITION_NOT_ALLOWED':
    case 'PLAYBOOK_SOURCE_UPDATE_INVALID':
      return ExitCode.CONFLICT;

    case 'CURRENT_WORKSPACE_UNAVAILABLE':
    case 'CONFIGURATION_INVALID':
    case 'CONFIGURATION_MISSING':
      return ExitCode.CONFIG_ERROR;

    case 'PERSISTENCE_OPERATION_FAILED':
    case 'WORKSPACE_STATE_INVALID':
    case 'PLAYBOOK_STATE_INVALID':
      return ExitCode.INFRASTRUCTURE_ERROR;

    default:
      return ExitCode.UNEXPECTED_ERROR;
  }
}

export function getErrorMessage(error: { code: string; message: string; details?: unknown }): {
  code: string;
  message: string;
  details: unknown;
} {
  return {
    code: error.code,
    message: error.message,
    details: error.details ?? {},
  };
}
