import { err, ok, type Result } from '@ai-playbook-engine/shared';

export interface ParsedArgs {
  readonly command: string[];
  readonly flags: ReadonlyMap<string, string | boolean>;
}

export function parseArgs(argv: readonly string[]): Result<ParsedArgs, string> {
  const command: string[] = [];
  const flags = new Map<string, string | boolean>();
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i]!;

    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');

      if (eqIndex !== -1) {
        const name = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);

        if (name.length === 0) {
          return err(`Invalid flag: "${arg}".`);
        }

        flags.set(name, value);
      } else {
        const name = arg.slice(2);

        if (name.length === 0) {
          return err(`Invalid flag: "${arg}".`);
        }

        const next = argv[i + 1];

        if (next !== undefined && !next.startsWith('--')) {
          flags.set(name, next);
          i++;
        } else {
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
