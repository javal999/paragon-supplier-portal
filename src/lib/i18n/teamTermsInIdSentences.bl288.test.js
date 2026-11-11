// BL-288 (admin part) — the owner's ruling of 2026-11-10: the team's term
// "lead time" stays English inside the Indonesian text of the ADMIN pages
// (TL-D11 / TL-D17, as BL-263 and BL-280 did for the planning pages). RFx,
// RFQ and the supplier-read dictionaries stay Indonesian until the supplier
// usability test says otherwise, so they are not checked here.

import { describe, expect, it } from 'vitest';
import { adminSettingsId } from './adminSettings';

describe('BL-288 — lead time stays English in the admin dictionary', () => {
  it('adminSettings has no "waktu tunggu" left', () => {
    const left = Object.entries(adminSettingsId)
      .filter(([, v]) => /waktu tunggu/i.test(v))
      .map(([k]) => k);
    expect(left).toEqual([]);
  });

  it('the safety lead time sentences use the team term', () => {
    expect(adminSettingsId['adminSet.rule.REQ-E14-04']).toContain('Safety lead time');
    expect(adminSettingsId['adminSet.unit.multiple']).toBe('{{value}} × lead time');
  });
});
