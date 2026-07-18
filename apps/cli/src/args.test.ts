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

  it('rejects empty flag names', () => {
    const result = parseArgs(['--=value']);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toBe('Invalid flag: "--=value".');
  });

  it('rejects bare double dash', () => {
    const result = parseArgs(['--']);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toBe('Invalid flag: "--".');
  });
});
