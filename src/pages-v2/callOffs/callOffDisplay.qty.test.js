// BL-223 — the call-off `qty` follows the reader's language (X-01): "15,000" in
// English, "15.000" in Indonesian, at most two decimals. It is the inventory
// helper re-exported, not a second implementation.

import { afterEach, describe, expect, it } from 'vitest';
import i18n from '@lib/i18n';
import { qty } from './callOffDisplay';
import { qty as inventoryQty } from '../inventory/inventoryDisplay';

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('BL-223 — call-off qty groups the way the UI language does', () => {
  it('is the inventory helper, not a copy', () => {
    expect(qty).toBe(inventoryQty);
  });

  it('English: comma thousands, point decimal', () => {
    expect(qty(15000)).toBe('15,000');
    expect(qty(1234.5678)).toBe('1,234.57');
    expect(qty(0)).toBe('0');
  });

  it('Indonesian: dot thousands, comma decimal', async () => {
    await i18n.changeLanguage('id');
    expect(qty(15000)).toBe('15.000');
    expect(qty(1234.5678)).toBe('1.234,57');
    expect(qty(0)).toBe('0');
  });
});
