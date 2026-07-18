import { describe, expect, it } from 'vitest';

import type { Page, PaginationRequest } from '../index.js';

interface TestItem {
  readonly id: string;
  readonly name: string;
}

describe('PaginationRequest', () => {
  it('holds offset and limit', () => {
    const request: PaginationRequest = Object.freeze({
      offset: 0,
      limit: 25,
    });

    expect(request.offset).toBe(0);
    expect(request.limit).toBe(25);
    expect(Object.isFrozen(request)).toBe(true);
  });
});

describe('Page', () => {
  it('holds items with hasMore and without totalCount', () => {
    const itemA: TestItem = Object.freeze({ id: 'item-a', name: 'Item A' });
    const itemB: TestItem = Object.freeze({ id: 'item-b', name: 'Item B' });

    const page: Page<TestItem> = Object.freeze({
      items: Object.freeze([itemA, itemB]),
      offset: 0,
      limit: 2,
      hasMore: true,
    });

    expect(page.items).toHaveLength(2);
    expect(page.items[0]).toBe(itemA);
    expect(page.items[1]).toBe(itemB);
    expect(page.offset).toBe(0);
    expect(page.limit).toBe(2);
    expect(page.hasMore).toBe(true);
    expect('totalCount' in page).toBe(false);
    expect(Object.isFrozen(page.items)).toBe(true);
    expect(Object.isFrozen(page)).toBe(true);
  });

  it('holds items with totalCount and hasMore false', () => {
    const itemA: TestItem = Object.freeze({ id: 'item-a', name: 'Item A' });

    const page: Page<TestItem> = Object.freeze({
      items: Object.freeze([itemA]),
      offset: 25,
      limit: 25,
      hasMore: false,
      totalCount: 26,
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toBe(itemA);
    expect(page.offset).toBe(25);
    expect(page.limit).toBe(25);
    expect(page.hasMore).toBe(false);
    expect(page.totalCount).toBe(26);
    expect(Object.isFrozen(page.items)).toBe(true);
    expect(Object.isFrozen(page)).toBe(true);
  });

  it('holds an empty page', () => {
    const page: Page<TestItem> = Object.freeze({
      items: Object.freeze([]),
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 0,
    });

    expect(page.items).toHaveLength(0);
    expect(page.totalCount).toBe(0);
    expect(page.hasMore).toBe(false);
    expect(Object.isFrozen(page.items)).toBe(true);
  });

  it('preserves the generic item type', () => {
    const page: Page<TestItem> = Object.freeze({
      items: Object.freeze([Object.freeze({ id: 'item-a', name: 'Item A' })]),
      offset: 0,
      limit: 1,
      hasMore: false,
    });

    const _acceptsTypedPage: Page<TestItem> = page;

    const firstItem: TestItem | undefined = _acceptsTypedPage.items[0];

    void firstItem;
  });
});
