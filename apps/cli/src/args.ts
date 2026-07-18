import { err, ok, type Result } from '@ai-playbook-engine/shared';

export interface ParsedArgs {
  readonly command: readonly string[];
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
  'playbook-id',
  'type',
  'external-root-reference',
  'configuration-reference',
]);

function invalidFlag(message: string): CliParseError {
  return Object.freeze({
    code: 'INVALID_FLAG',
    message,
  });
}

function duplicateFlag(message: string): CliParseError {
  return Object.freeze({
    code: 'DUPLICATE_FLAG',
    message,
  });
}

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
          return err(invalidFlag(`Invalid flag: "${arg}".`));
        }

        if (flags.has(name)) {
          return err(duplicateFlag(`Duplicate flag: "${name}".`));
        }

        if (value.length === 0) {
          return err(invalidFlag(`Flag "${name}" cannot have an empty value.`));
        }

        flags.set(name, value);
      } else {
        const name = arg.slice(2);

        if (name.length === 0) {
          return err(invalidFlag(`Invalid flag: "${arg}".`));
        }

        if (flags.has(name)) {
          return err(duplicateFlag(`Duplicate flag: "${name}".`));
        }

        const next = argv[i + 1];

        if (next !== undefined && !next.startsWith('--')) {
          if (next.length === 0) {
            return err(invalidFlag(`Flag "${name}" cannot have an empty value.`));
          }
          flags.set(name, next);
          i++;
        } else {
          if (VALUE_REQUIRED_FLAGS.has(name)) {
            return err(invalidFlag(`Flag "${name}" requires a value.`));
          }
          flags.set(name, true);
        }
      }
    } else {
      command.push(arg);
    }

    i++;
  }

  const frozenCommand = Object.freeze([...command]);

  const copy = new Map(flags);
  const immutableFlags: ReadonlyMap<string, string | boolean> = Object.freeze({
    get size() {
      return copy.size;
    },
    has(key: string) {
      return copy.has(key);
    },
    get(key: string) {
      return copy.get(key);
    },
    forEach(
      callbackfn: (
        value: string | boolean,
        key: string,
        map: ReadonlyMap<string, string | boolean>,
      ) => void,
      thisArg?: unknown,
    ) {
      copy.forEach((v, k) => callbackfn.call(thisArg, v, k, immutableFlags));
    },
    entries() {
      return copy.entries();
    },
    keys() {
      return copy.keys();
    },
    values() {
      return copy.values();
    },
    [Symbol.iterator]() {
      return copy.entries();
    },
  });

  return ok(
    Object.freeze({
      command: frozenCommand,
      flags: immutableFlags,
    }),
  );
}
