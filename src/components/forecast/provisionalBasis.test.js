import { describe, it, expect, afterEach } from 'vitest';
import i18n from '@lib/i18n';
import { provisionalBasis } from './provisionalBasis';
import { OSIP_ROP_QUESTIONS } from '@services/transitions/osipRopRules';
import { OSIP_SAFETY_QUESTIONS } from '@services/transitions/osipSafetyRules';
import { CALL_OFF_TRIGGER_QUESTIONS } from '@services/transitions/callOffTriggerRules';

// U-15 (BL-257) — question IDs stay IDs; the master-data defaults read as words.

const t = (/** @type {string} */ k) => i18n.t(k);

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('provisionalBasis (U-15, BL-257)', () => {
  it('keeps the question IDs and writes MPQ as the default it is', () => {
    expect(provisionalBasis(OSIP_SAFETY_QUESTIONS.safetyOrder, t)).toBe(
      'B4; MPQ = order multiple until master data'
    );
  });

  it('separates the question IDs from both master-data defaults', () => {
    expect(provisionalBasis(OSIP_ROP_QUESTIONS.ropFisik, t)).toBe(
      'B1, C2; MPQ = order multiple until master data; MDQ = MOQ until master data'
    );
    expect(provisionalBasis(CALL_OFF_TRIGGER_QUESTIONS, t)).toBe(
      'F1, B8, B9, F2; MPQ = order multiple until master data'
    );
  });

  it('a list of question IDs only, or of defaults only, reads as before / as words alone', () => {
    expect(provisionalBasis(['B8'], t)).toBe('B8');
    expect(provisionalBasis(['MPQ'], t)).toBe('MPQ = order multiple until master data');
    expect(provisionalBasis([], t)).toBe('');
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    expect(provisionalBasis(OSIP_ROP_QUESTIONS.ropFisik, t)).toBe(
      'B1, C2; MPQ = kelipatan pesanan sampai data master; MDQ = MOQ sampai data master'
    );
  });

  it('the rules lists keep their question IDs and defaults unchanged', () => {
    expect(OSIP_SAFETY_QUESTIONS.safetyOrder).toEqual(['B4', 'MPQ']);
    expect(OSIP_ROP_QUESTIONS.ropFisik).toEqual(['B1', 'C2', 'MPQ', 'MDQ']);
  });
});
