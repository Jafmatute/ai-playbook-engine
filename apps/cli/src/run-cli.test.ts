import { describe, expect, it } from 'vitest';
import { parseStrictInteger, runCli } from './run-cli.js';
import { MapEnvReader } from '@ai-playbook-engine/config';
import { ExitCode } from './exit-codes.js';

describe('parseStrictInteger', () => {
  it('accepts correct decimal integers', () => {
    expect(parseStrictInteger('0')).toBe(0);
    expect(parseStrictInteger('1')).toBe(1);
    expect(parseStrictInteger('42')).toBe(42);
    expect(parseStrictInteger('1234567890')).toBe(1234567890);
  });

  it('rejects invalid inputs', () => {
    expect(parseStrictInteger('10abc')).toBeNull();
    expect(parseStrictInteger('1.5')).toBeNull();
    expect(parseStrictInteger('1e2')).toBeNull();
    expect(parseStrictInteger('NaN')).toBeNull();
    expect(parseStrictInteger('Infinity')).toBeNull();
    expect(parseStrictInteger('+1')).toBeNull();
    expect(parseStrictInteger('-0')).toBeNull();
    expect(parseStrictInteger('')).toBeNull();
    expect(parseStrictInteger('1 0')).toBeNull();
    expect(parseStrictInteger(' 10')).toBeNull();
    expect(parseStrictInteger('10 ')).toBeNull();
  });
});

describe('runCli offset and limit validation', () => {
  const envReader = new MapEnvReader(new Map());
  
  const createMockIo = () => {
    let stdout = '';
    let stderr = '';
    return {
      writeStdout(v: string) { stdout += v; },
      writeStderr(v: string) { stderr += v; },
      getStdout() { return stdout; },
      getStderr() { return stderr; },
    };
  };

  it('rejects invalid offsets', async () => {
    const invalidOffsets = ['10abc', '1.5', '1e2', 'NaN', 'Infinity', '+1', '-0', '', '1 0', '-1'];

    for (const offset of invalidOffsets) {
      const io = createMockIo();
      const code = await runCli(['playbook', 'list', '--offset', offset], envReader, io);
      expect(code).toBe(ExitCode.INVALID_INPUT);
      expect(io.getStderr()).toContain('offset');
    }
  });

  it('rejects invalid limits', async () => {
    const invalidLimits = ['10abc', '1.5', '1e2', 'NaN', 'Infinity', '+1', '-0', '', '1 0', '0', '101'];

    for (const limit of invalidLimits) {
      const io = createMockIo();
      const code = await runCli(['playbook', 'list', '--limit', limit], envReader, io);
      expect(code).toBe(ExitCode.INVALID_INPUT);
      expect(io.getStderr()).toContain('limit');
    }
  });
});
