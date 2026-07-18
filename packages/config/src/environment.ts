export const VALID_ENVIRONMENTS = ['development', 'test', 'production'] as const;

export type Environment = (typeof VALID_ENVIRONMENTS)[number];

export const DEFAULT_ENVIRONMENT: Environment = 'development';
