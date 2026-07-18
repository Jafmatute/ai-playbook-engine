export const CONFIGURATION_INVALID = 'CONFIGURATION_INVALID' as const;

export interface ConfigurationInvalidError {
  readonly code: typeof CONFIGURATION_INVALID;
  readonly message: string;
  readonly details: Readonly<Record<string, never>>;
}

export function configurationInvalid(message: string): ConfigurationInvalidError {
  return Object.freeze({
    code: CONFIGURATION_INVALID,
    message,
    details: Object.freeze({}),
  });
}

export const CONFIGURATION_MISSING = 'CONFIGURATION_MISSING' as const;

export interface ConfigurationMissingError {
  readonly code: typeof CONFIGURATION_MISSING;
  readonly message: string;
  readonly details: {
    readonly variableName: string;
  };
}

export function configurationMissing(variableName: string): ConfigurationMissingError {
  return Object.freeze({
    code: CONFIGURATION_MISSING,
    message: `The required configuration variable "${variableName}" is missing.`,
    details: Object.freeze({ variableName }),
  });
}
