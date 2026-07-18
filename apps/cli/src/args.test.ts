import { describe, expect, it } from 'vitest';
import { parseArgs } from './args.js';

describe('parseArgs', () => {
  it('parses simple command', () => {
    const result = parseArgs(['database', 'migrate']);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.command).toEqual(['database', 'migrate']);
    expect([...result.value.flags.entries()]).toEqual([]);
  });

  it('parses flags with value', () => {
    const result = parseArgs(['--name', 'test']);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.command).toEqual([]);
    expect(result.value.flags.get('name')).toBe('test');
  });

  it('parses --flag=value syntax', () => {
    const result = parseArgs(['--name=test']);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.command).toEqual([]);
    expect(result.value.flags.get('name')).toBe('test');
  });

  it('parses boolean flag', () => {
    const result = parseArgs(['--help']);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.command).toEqual([]);
    expect(result.value.flags.get('help')).toBe(true);
  });

  it('parses mixed command and flags', () => {
    const result = parseArgs([
      'playbook',
      'create',
      '--name',
      'my-pb',
      '--description',
      'A test playbook',
    ]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.command).toEqual(['playbook', 'create']);
    expect(result.value.flags.get('name')).toBe('my-pb');
    expect(result.value.flags.get('description')).toBe('A test playbook');
  });

  it('rejects empty flag names and returns a frozen error', () => {
    const result = parseArgs(['--=value']);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe('INVALID_FLAG');
    expect(result.error.message).toBe('Invalid flag: "--=value".');
    expect(Object.isFrozen(result.error)).toBe(true);
  });

  it('rejects bare double dash and returns a frozen error', () => {
    const result = parseArgs(['--']);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe('INVALID_FLAG');
    expect(result.error.message).toBe('Invalid flag: "--".');
    expect(Object.isFrozen(result.error)).toBe(true);
  });

  it('rejects duplicate flags and returns a frozen error', () => {
    const cases = [
      { args: ['--output', 'json', '--output', 'human'], flag: 'output' },
      { args: ['--name', 'A', '--name', 'B'], flag: 'name' },
      { args: ['--help', '--help'], flag: 'help' },
      { args: ['--name=A', '--name=B'], flag: 'name' },
    ];

    for (const c of cases) {
      const result = parseArgs(c.args);
      expect(result.success).toBe(false);
      if (result.success) continue;
      expect(result.error.code).toBe('DUPLICATE_FLAG');
      expect(result.error.message).toBe(`Duplicate flag: "${c.flag}".`);
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('rejects empty flag values for required flags and returns a frozen error', () => {
    const cases = [
      { args: ['--name='], flag: 'name' },
      { args: ['--name', ''], flag: 'name' },
      { args: ['--name'], flag: 'name' },
      { args: ['--id='], flag: 'id' },
      { args: ['--id'], flag: 'id' },
      { args: ['--output='], flag: 'output' },
      { args: ['--output'], flag: 'output' },
      { args: ['--workspace-id='], flag: 'workspace-id' },
      { args: ['--workspace-id'], flag: 'workspace-id' },
      { args: ['--offset='], flag: 'offset' },
      { args: ['--offset'], flag: 'offset' },
      { args: ['--limit='], flag: 'limit' },
      { args: ['--limit'], flag: 'limit' },
      { args: ['--status='], flag: 'status' },
      { args: ['--status'], flag: 'status' },
      { args: ['--has-active-version='], flag: 'has-active-version' },
      { args: ['--has-active-version'], flag: 'has-active-version' },
    ];

    for (const c of cases) {
      const result = parseArgs(c.args);
      expect(result.success).toBe(false);
      if (result.success) continue;
      expect(result.error.code).toBe('INVALID_FLAG');
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('returns a frozen success result with frozen command and flags', () => {
    const result = parseArgs(['playbook', 'create', '--name', 'test']);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.command)).toBe(true);
    expect(Object.isFrozen(result.value.flags)).toBe(true);
  });
});
