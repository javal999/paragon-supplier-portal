// X-01 — `qty` follows the reader's locale: "85,000" in English, "85.000" in
// Indonesian, at most two decimals in both.

import { afterEach, describe, expect, it } from 'vitest';
import i18n from '@lib/i18n';
import { qty } from './inventoryDisplay';

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('X-01 — qty groups the way the UI language does', () => {
  it('English: comma thousands, point decimal, two decimals at most', () => {
    expect(qty(85000)).toBe('85,000');
    expect(qty(2.5)).toBe('2.5');
    expect(qty(1234.5678)).toBe('1,234.57');
    expect(qty(0)).toBe('0');
  });

  it('Indonesian: dot thousands, comma decimal, two decimals at most', async () => {
    await i18n.changeLanguage('id');
    expect(qty(85000)).toBe('85.000');
    expect(qty(2.5)).toBe('2,5');
    expect(qty(1234.5678)).toBe('1.234,57');
    expect(qty(0)).toBe('0');
  });
});
