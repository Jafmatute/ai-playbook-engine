import { describe, expect, it } from 'vitest';

import { NormalizedContent, NormalizedText } from '../index.js';

function normalizedText(value = 'AI Model Selection'): NormalizedText {
  const result = NormalizedText.create(value);
  if (!result.success) throw new Error('Fixture must be valid.');
  return result.value;
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe('NormalizedContent.create', () => {
  it('creates content from NormalizedText', () => {
    const content = NormalizedContent.create({ text: normalizedText() });

    expect(content).toBeInstanceOf(NormalizedContent);
  });

  it('does not return a Result', () => {
    const content = NormalizedContent.create({ text: normalizedText() });

    expect(content instanceof NormalizedContent).toBe(true);
  });

  it('preserves the provided text', () => {
    const text = normalizedText('Workflow');
    const content = NormalizedContent.create({ text });

    expect(content.text.equals(text)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getter
// ---------------------------------------------------------------------------

describe('NormalizedContent — getter', () => {
  it('returns the exact same NormalizedText instance', () => {
    const text = normalizedText('Workflow');
    const content = NormalizedContent.create({ text });

    expect(content.text).toBe(text);
  });
});

// ---------------------------------------------------------------------------
// equality
// ---------------------------------------------------------------------------

describe('NormalizedContent — equality', () => {
  it('considers contents with equivalent text equal', () => {
    const a = NormalizedContent.create({ text: normalizedText('Workflow') });
    const b = NormalizedContent.create({ text: normalizedText(' Workflow ') });

    expect(a.equals(b)).toBe(true);
  });

  it('considers contents with different text unequal', () => {
    const a = NormalizedContent.create({ text: normalizedText('Workflow') });
    const b = NormalizedContent.create({ text: normalizedText('Methodology') });

    expect(a.equals(b)).toBe(false);
  });

  it('is case-sensitive', () => {
    const a = NormalizedContent.create({ text: normalizedText('Workflow') });
    const b = NormalizedContent.create({ text: normalizedText('workflow') });

    expect(a.equals(b)).toBe(false);
  });

  it('distinguishes LF from CRLF', () => {
    const a = NormalizedContent.create({ text: normalizedText('Line 1\nLine 2') });
    const b = NormalizedContent.create({ text: normalizedText('Line 1\r\nLine 2') });

    expect(a.equals(b)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// immutability
// ---------------------------------------------------------------------------

describe('NormalizedContent — immutability', () => {
  it('instance is frozen', () => {
    const content = NormalizedContent.create({ text: normalizedText() });

    expect(Object.isFrozen(content)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// no premature API
// ---------------------------------------------------------------------------

describe('NormalizedContent — no premature API', () => {
  it('does not expose replaceText', () => {
    const content = NormalizedContent.create({ text: normalizedText() });

    expect((content as unknown as Record<string, unknown>).replaceText).toBeUndefined();
  });

  it('does not expose append', () => {
    const content = NormalizedContent.create({ text: normalizedText() });

    expect((content as unknown as Record<string, unknown>).append).toBeUndefined();
  });

  it('does not expose toSnapshot', () => {
    const content = NormalizedContent.create({ text: normalizedText() });

    expect((content as unknown as Record<string, unknown>).toSnapshot).toBeUndefined();
  });
});
