import { err, ok, type Result } from '@ai-playbook-engine/shared';

export interface ParsedArgs {
  readonly command: string[];
  readonly flags: ReadonlyMap<string, string | boolean>;
}

export interface CliParseError {
  readonly code: 'INVALID_FLAG' | 'DUPLICATE_FLAG';
  readonly message: string;
}

const VALUE_REQUIRED_FLAGS = new Set<string>([
  'name',
  'id',
  'output',
  'workspace-id',
  'offset',
  'limit',
  'status',
  'has-active-version',
]);

export function parseArgs(argv: readonly string[]): Result<ParsedArgs, CliParseError> {
  const command: string[] = [];
  const flags = new Map<string, string | boolean>();
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];
    if (arg === undefined) {
      break;
    }

    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');

      if (eqIndex !== -1) {
        const name = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);

        if (name.length === 0) {
          return err({
            code: 'INVALID_FLAG',
            message: `Invalid flag: "${arg}".`,
          });
        }

        if (flags.has(name)) {
          return err({
            code: 'DUPLICATE_FLAG',
            message: `Duplicate flag: "${name}".`,
          });
        }

        if (value.length === 0) {
          return err({
            code: 'INVALID_FLAG',
            message: `Flag "${name}" cannot have an empty value.`,
          });
        }

        flags.set(name, value);
      } else {
        const name = arg.slice(2);

        if (name.length === 0) {
          return err({
            code: 'INVALID_FLAG',
            message: `Invalid flag: "${arg}".`,
          });
        }

        if (flags.has(name)) {
          return err({
            code: 'DUPLICATE_FLAG',
            message: `Duplicate flag: "${name}".`,
          });
        }

        const next = argv[i + 1];

        if (next !== undefined && !next.startsWith('--')) {
          if (next.length === 0) {
            return err({
              code: 'INVALID_FLAG',
              message: `Flag "${name}" cannot have an empty value.`,
            });
          }
          flags.set(name, next);
          i++;
        } else {
          if (VALUE_REQUIRED_FLAGS.has(name)) {
            return err({
              code: 'INVALID_FLAG',
              message: `Flag "${name}" requires a value.`,
            });
          }
          flags.set(name, true);
        }
      }
    } else {
      command.push(arg);
    }

    i++;
  }

  return ok({ command, flags });
}
