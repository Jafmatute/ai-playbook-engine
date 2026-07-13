import { err, ok, type Result } from '@ai-playbook-engine/shared';

export const workspaceNameMaximumLength = 120;

export type WorkspaceNameError =
  | {
      readonly code: 'WORKSPACE_NAME_REQUIRED';
      readonly message: string;
      readonly details: Readonly<Record<string, never>>;
    }
  | {
      readonly code: 'WORKSPACE_NAME_INVALID';
      readonly message: string;
      readonly details: {
        readonly maximumLength: number;
        readonly actualLength: number;
      };
    };

export class WorkspaceName {
  readonly #value: string;
  readonly #normalizedValue: string;

  private constructor(value: string, normalizedValue: string) {
    this.#value = value;
    this.#normalizedValue = normalizedValue;
    Object.freeze(this);
  }

  static create(rawValue: string): Result<WorkspaceName, WorkspaceNameError> {
    const value = rawValue.trim();
    if (value.length === 0) {
      return err(workspaceNameRequired());
    }

    if (value.length > workspaceNameMaximumLength) {
      return err(workspaceNameInvalid(value.length));
    }

    return ok(new WorkspaceName(value, value.toLocaleLowerCase('en-US')));
  }

  get value(): string {
    return this.#value;
  }

  get normalizedValue(): string {
    return this.#normalizedValue;
  }

  equals(other: WorkspaceName): boolean {
    return this.#normalizedValue === other.#normalizedValue;
  }
}

function workspaceNameRequired(): WorkspaceNameError {
  return Object.freeze({
    code: 'WORKSPACE_NAME_REQUIRED' as const,
    message: 'A workspace name is required.',
    details: Object.freeze({}),
  });
}

function workspaceNameInvalid(actualLength: number): WorkspaceNameError {
  return Object.freeze({
    code: 'WORKSPACE_NAME_INVALID' as const,
    message: 'The workspace name exceeds the maximum length.',
    details: Object.freeze({
      maximumLength: workspaceNameMaximumLength,
      actualLength,
    }),
  });
}
