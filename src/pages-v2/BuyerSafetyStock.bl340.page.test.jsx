// BL-340 (TL-D41, TL-D42) — the three buffer tips on Safety stock targets:
// Protection buffer (TL-D41's accepted text, replacing TL-D40's), the new
// Material Buffer term (TL-D42), and the Strategic buffer (whose "Shown only:
// nothing is ordered from it" is false under model A, PSC-4 BR-06).
//
// The accepted texts are held here as LITERALS, not read back from the glossary:
// a spec that imported them would prove only that the glossary agrees with
// itself. TL-R1 rides along — the panel keeps its own column headers and the (i)
// is attached beside them, so nothing is renamed.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerSafetyStock from './BuyerSafetyStock';
import { osipParamStore } from '@services/data/mock/stores/osipParamStore';
import { eventCalendarStore } from '@services/transitions/eventCalendarStore';
import { ropOrderAuditStore } from '@services/data/mock/stores/ropOrderAuditStore';
import { consumptionStore } from '@services/data/mock/stores/consumptionStore';
import { goodsReceiptStore } from '@services/data/mock/stores/goodsReceiptStore';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';

const MAT = 'RM-STEAR-7300';

/** TL-D41 — the owner's accepted Protection buffer tip (2026-11-18). */
const D41_EN =
  'A buffer against a jump in demand. It is LTP B minus LTP A over the lead time, averaged, multiplied by the material’s cover setting (4 weeks by default), and added once to ROP Order.';
const D41_ID =
  'Buffer untuk lonjakan permintaan. Nilainya LTP B dikurangi LTP A sepanjang lead time, dirata-ratakan, dikali pengaturan cover material (bawaan 4 minggu), dan ditambahkan satu kali ke ROP Order.';

/** TL-D42 — the owner's accepted Material Buffer tip (2026-11-18). */
const D42_EN =
  'Additional stock cover for an event such as CNY or a typhoon: the coverage weeks × the average weekly LTP A.';
const D42_ID =
  'Cadangan stok tambahan untuk peristiwa seperti CNY atau topan: minggu cakupan × rata-rata LTP A mingguan.';

/** The Strategic buffer tip after BL-340: added once, as the Strategic total. */
const STRATEGIC_EN =
  'Stock built up for a festive window such as CNY. It is added once to ROP Order as part of the Strategic total.';
const STRATEGIC_ID =
  'Stok yang dibangun untuk periode festive seperti CNY. Nilainya ditambahkan satu kali ke ROP Order sebagai bagian dari total strategis.';

beforeEach(() => {
  sdcClock.reset();
  osipParamStore.reset();
  eventCalendarStore.reset();
  ropOrderAuditStore.reset();
  consumptionStore.reset();
  goodsReceiptStore.reset();
});
afterEach(() => {
  osipParamStore.reset();
  eventCalendarStore.reset();
  ropOrderAuditStore.reset();
  sdcClock.reset();
  void i18n.changeLanguage('en');
});

const openPanel = async () => {
  renderWithProviders(<BuyerSafetyStock />, {
    identity: BUYER,
    route: `/buyer/safety-stock?material=${MAT}`
  });
  return screen.findByTestId('sst-buffers');
};

/**
 * The text a term's (i) describes, in the active language.
 * @param {string} slug  The term's glossary key, slugged (`protection-buffer`).
 * @returns {string}
 */
const tipText = (slug) =>
  within(screen.getByTestId(`term-tip-${slug}`)).getByRole('tooltip', { hidden: true })
    .textContent ?? '';

describe('BL-340 — the buffer tips on Safety stock targets', () => {
  it('TL-R1: the panel keeps its own column headers, with the (i) beside them', async () => {
    const panel = await openPanel();
    // The header's OWN words: the (i)'s hidden description sits in the same
    // cell, so only the cell's text nodes count.
    const headers = within(screen.getByTestId('sst-buffers-table'))
      .getAllByRole('columnheader')
      .map((th) =>
        [...th.childNodes]
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent)
          .join('')
          .trim()
      );
    expect(headers).toEqual([
      'Supplier',
      'Protection',
      'Strategic, festive',
      'Strategic, material',
      'Strategic total',
      'ROP Order'
    ]);
    expect(within(panel).getByTestId('term-tip-protection-buffer')).toBeInTheDocument();
    expect(within(panel).getByTestId('term-tip-strategic-buffer')).toBeInTheDocument();
    expect(within(panel).getByTestId('term-tip-material-buffer')).toBeInTheDocument();
  });

  it('TL-D41: the Protection tip carries the accepted text, not the retired sentence', async () => {
    await openPanel();
    const text = tipText('protection-buffer');
    expect(text).toContain(D41_EN);
    expect(text).not.toMatch(/shown only/i);
    expect(text).not.toContain('Capacity page');
  });

  it('TL-D42: the Material Buffer term carries its label and its accepted text', async () => {
    await openPanel();
    expect(tipText('material-buffer')).toContain(D42_EN);
    // The label is the same word in both languages (TL-D42).
    expect(
      screen.getByRole('button', { name: 'What “Material Buffer” means' })
    ).toBeInTheDocument();
  });

  it('the Strategic buffer tip names ROP Order as part of the Strategic total', async () => {
    await openPanel();
    const text = tipText('strategic-buffer');
    expect(text).toContain(STRATEGIC_EN);
    expect(text).not.toMatch(/nothing is ordered/i);
  });

  it('reads the three tips in Indonesian', async () => {
    await i18n.changeLanguage('id');
    await openPanel();
    expect(tipText('protection-buffer')).toContain(D41_ID);
    expect(tipText('material-buffer')).toContain(D42_ID);
    expect(tipText('strategic-buffer')).toContain(STRATEGIC_ID);
    expect(screen.getByRole('button', { name: 'Arti “Material Buffer”' })).toBeInTheDocument();
  });
});
