import { describe, it, expect, afterEach } from 'vitest';
import i18n from '@lib/i18n';
import { pctText, qtyText } from './forecastDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// BL-260 (C-07) [Owner FSR-D4, 2026-11-03] — the one quantity helper behind
// both personas' Foresight commitments follows the reader's language (X-01 of
// the inventory UX evaluation, through the BL-223 `formatNumber`), so the
// Indonesian cycle reads "34.300" everywhere instead of "34,300" on this page
// and "34.300" on the next. 2 decimals at most stay. The RFx pages keep their
// own local `qtyText` and are not touched (26 Oct rule).
// ─────────────────────────────────────────────────────────────────────────────

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('BL-260 — qtyText groups the way the UI language does', () => {
  it('English: comma thousands, point decimal, 2 decimals at most', () => {
    expect(qtyText(34300)).toBe('34,300');
    expect(qtyText(14700)).toBe('14,700');
    expect(qtyText(1234.567)).toBe('1,234.57');
    expect(qtyText(-500)).toBe('-500');
  });

  it('Indonesian: dot thousands, comma decimal, 2 decimals at most', async () => {
    await i18n.changeLanguage('id');
    expect(qtyText(34300)).toBe('34.300');
    expect(qtyText(14700)).toBe('14.700');
    expect(qtyText(1234.567)).toBe('1.234,57');
  });

  it('pctText is not in scope: a fixed one-decimal percent in both languages', async () => {
    expect(pctText(0.1234)).toBe('+12.3%');
    await i18n.changeLanguage('id');
    expect(pctText(-0.05)).toBe('-5.0%');
  });
});
