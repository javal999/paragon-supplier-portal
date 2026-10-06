// BL-159 — the call-off warnings use real plurals: "1 day", "2 days" in
// English; Indonesian has no plural forms and reads "hari" for every count.

import { describe, expect, it } from 'vitest';
import i18n from '@lib/i18n';
import { callOffWarningText } from './CallOffWarnings';
/** @import { CallOffWarning } from '@services/data/types' */

/**
 * @param {number} days
 * @returns {CallOffWarning}
 */
const late = (days) => ({
  kind: 'late',
  detail: { callOffNumber: 'CO-1', eta: '2026-10-02', agreedDate: '2026-10-01', days }
});
/**
 * @param {number} days
 * @param {number} limit
 * @returns {CallOffWarning}
 */
const early = (days, limit) => ({
  kind: 'early',
  detail: { callOffNumber: 'CO-1', eta: '2026-09-28', agreedDate: '2026-10-01', days, limit }
});

describe('BL-159 — call-off warning plurals', () => {
  it('English: late by 1 day, late by 3 days', () => {
    const en = i18n.getFixedT('en');
    expect(callOffWarningText(en, late(1))).toMatch(/late by 1 day$/);
    expect(callOffWarningText(en, late(3))).toMatch(/late by 3 days$/);
  });

  it('English: early by 1 day with an allowance of 2 days; early by 4 days with an allowance of 1 day', () => {
    const en = i18n.getFixedT('en');
    expect(callOffWarningText(en, early(1, 2))).toMatch(/early by 1 day, allowance 2 days$/);
    expect(callOffWarningText(en, early(4, 1))).toMatch(/early by 4 days, allowance 1 day$/);
  });

  it('Indonesian: one form for every count', () => {
    const id = i18n.getFixedT('id');
    expect(callOffWarningText(id, late(1))).toMatch(/terlambat 1 hari$/);
    expect(callOffWarningText(id, early(4, 1))).toMatch(/lebih awal 4 hari, toleransi 1 hari$/);
  });
});
