import { describe, expect, it } from 'vitest';

import { isPlaybookSourceType } from '../index.js';

describe('PlaybookSourceType', () => {
  it('accepts notion', () => {
    expect(isPlaybookSourceType('notion')).toBe(true);
  });

  it.each([
    ['empty string', ''],
    ['uppercase Notion', 'Notion'],
    ['all uppercase NOTION', 'NOTION'],
    ['leading whitespace', ' notion'],
    ['trailing whitespace', 'notion '],
    ['hyphen variant', 'notion-api'],
    ['page', 'page'],
    ['database', 'database'],
    ['markdown', 'markdown'],
    ['github', 'github'],
    ['custom', 'custom'],
    ['enabled', 'enabled'],
    ['disabled', 'disabled'],
  ])('rejects %s', (_label, value) => {
    expect(isPlaybookSourceType(value)).toBe(false);
  });

  it('narrows string to PlaybookSourceType', () => {
    const values: string[] = ['notion', 'github'];
    const typed = values.filter(isPlaybookSourceType);

    expect(typed.length).toBe(1);
    expect(typed[0]).toBe('notion');
  });
});
