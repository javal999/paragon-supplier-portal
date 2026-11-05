// ─────────────────────────────────────────────────────────────────────────────
// BL-263 (U-14, follow-up of BL-256) — TL-D11 lists lead time, Max and cycle
// stock among the team's English terms; TL-D17 keeps them English inside
// Indonesian SENTENCES. The sentence sites BL-256 did not reach: Call-offs
// ("Maks", "Waktu tunggu PO"), Feedstock reconcile (`fsr.max`), the What-if
// option "stok siklus", and "waktu tunggu" on Safety stock targets, Capacity
// and the DA card, with the two glossary tips those pages render. The agreed
// Indonesian LABELS the row also names are held for the owner (TL-R1 BR-03):
// they are pinned unchanged here so the hold is visible.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { safetyStockEn, safetyStockId } from './safetyStock';
import { inventoryCapacityId } from './inventoryCapacity';
import { demandAnticipationId } from './demandAnticipation';
import { callOffsEn, callOffsId } from './callOffs';
import { feedstockReconcileEn, feedstockReconcileId } from './feedstockReconcile';
import { whatIfSandboxEn, whatIfSandboxId } from './whatIfSandbox';
import { TERM_LABEL_GLOSSARY } from '@lib/glossary/termLabels.glossary';

/** @type {[Record<string, string>, string, string, RegExp][]} */
const ROWS = [
  [callOffsId, 'co.trigger.aboveMax.pill', 'Di atas Max', /\bMaks\b/],
  [callOffsId, 'co.trigger.aboveMax.body', 'di bawah Max', /\bMaks\b/],
  [callOffsId, 'co.trigger.quantityBasis', 'seperti Max', /\bMaks\b/],
  [callOffsId, 'co.runOut.leadTime', 'Lead time PO', /waktu tunggu/i],
  [callOffsId, 'co.runOut.leadTimeFallback', 'Lead time PO', /waktu tunggu/i],
  [feedstockReconcileId, 'fsr.max', 'Max:', /\bMaks\b/],
  [whatIfSandboxId, 'whatIf.opt.sheetGuidance', 'ROP + cycle stock', /stok siklus/i],
  [safetyStockId, 'sst.osip.def.safetyOrder', '√(lead time dalam minggu)', /waktu tunggu/i],
  [safetyStockId, 'sst.rop.def.rops', 'cycle stock (LTP selama lead time)', /waktu tunggu/i],
  [
    safetyStockId,
    'sst.rop.detail.supplierReading',
    'lead time produksi bottleneck',
    /waktu tunggu/i
  ],
  [safetyStockId, 'sst.osip.unavailable.NO_LTP', 'LTP selama lead time', /waktu tunggu/i],
  [safetyStockId, 'sst.osip.soTitle', 'lead time {{weeks}} minggu', /waktu tunggu/i],
  [safetyStockId, 'sst.rop.legTitle', 'hari dari lead time', /waktu tunggu/i],
  [safetyStockId, 'sst.def.rop', 'selama lead time', /waktu tunggu/i],
  [inventoryCapacityId, 'inv.alerts.ask.leadTime', 'lead time', /waktu tunggu/i],
  [
    inventoryCapacityId,
    'inv.alerts.basis.supplierCover',
    'lead time {{lead}} hari',
    /waktu tunggu/i
  ],
  [inventoryCapacityId, 'inv.drawer.why.leadTime', 'lead time pemasok', /waktu tunggu/i],
  [demandAnticipationId, 'demandAnt.subtitle', 'sepanjang lead time', /waktu tunggu/i],
  [demandAnticipationId, 'demandAnt.check.horizon', 'Horizon (lead time)', /waktu tunggu/i],
  [demandAnticipationId, 'demandAnt.flag.LEAD_TIME_MISSING', 'Tidak ada lead time', /waktu tunggu/i]
];

describe('BL-263 — TL-D17 in the remaining Indonesian sentences', () => {
  it.each(ROWS)('%#: %s keeps the team term', (dict, key, term, translated) => {
    const text = dict[key];
    expect(text, key).toBeDefined();
    expect(text).toContain(term);
    expect(text).not.toMatch(translated);
  });

  it('no sentence in the four dictionaries translates lead time any more', () => {
    for (const [name, dict] of /** @type {const} */ ([
      ['safetyStock', safetyStockId],
      ['inventoryCapacity', inventoryCapacityId],
      ['demandAnticipation', demandAnticipationId],
      ['callOffs', callOffsId]
    ])) {
      const left = Object.entries(dict)
        .filter(([, v]) => /waktu tunggu/i.test(v))
        .map(([k]) => k);
      // Held: "safety lead time" is the engine's term, not one TL-D11 lists (BL-263 decision).
      expect(left, name).toEqual(name === 'safetyStock' ? ['sst.subtitle', 'sst.def.slt'] : []);
    }
  });

  it('the glossary tips on those pages say lead time', () => {
    expect(TERM_LABEL_GLOSSARY.newPoNeededBy.formula?.id).toBe('Minggu habis − lead time PO.');
    expect(TERM_LABEL_GLOSSARY.ropSupplier.formula?.id).toBe(
      'Permintaan × lead time produksi bottleneck pemasok, termasuk antrean.'
    );
  });

  it('the EN strings are unchanged', () => {
    expect(callOffsEn['co.trigger.aboveMax.pill']).toBe('Above Max');
    expect(feedstockReconcileEn['fsr.max']).toBe('Max:');
    expect(whatIfSandboxEn['whatIf.opt.sheetGuidance']).toBe('Sheet guidance (ROP + cycle stock)');
    expect(safetyStockEn['sst.rop.legTitle']).toBe('{{days}} days of the lead time');
  });

  it('the agreed Indonesian labels are held for the owner, unchanged (BL-263, TL-R1 BR-03)', () => {
    expect(safetyStockId['sst.rop.rules.maxRule']).toBe('Maks (B8)');
    expect(safetyStockId['sst.rop.rules.maxRule.sheetGuidance']).toBe(
      'Panduan sheet: ROP + stok siklus'
    );
    // Rendered upper-case by the column header: "SD UNTUK PESANAN PENGAMAN (B2)".
    expect(safetyStockId['sst.osip.rules.sdSource']).toBe('SD untuk pesanan pengaman (B2)');
    expect(safetyStockId['sst.osip.rules.safetyRounding']).toBe(
      'Pesanan pengaman dibulatkan ke atas ke (B4)'
    );
  });
});
