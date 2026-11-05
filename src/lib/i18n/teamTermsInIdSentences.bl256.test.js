// ─────────────────────────────────────────────────────────────────────────────
// BL-256 (U-14) — TL-D17: the team's English terms stay English inside
// Indonesian SENTENCES too (Safety stock targets, Capacity, the DA card). Each
// row names the key, the term its ID sentence must carry, and the translated
// form it must no longer carry. The EN sentences are not part of this row
// (W-01, W-02 wait on the logic review), so they are pinned unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { safetyStockEn, safetyStockId } from './safetyStock';
import { inventoryCapacityEn, inventoryCapacityId } from './inventoryCapacity';
import { demandAnticipationEn, demandAnticipationId } from './demandAnticipation';

/** @type {[Record<string, string>, string, string, RegExp][]} */
const ROWS = [
  [safetyStockId, 'sst.osip.def.safetyOrder', 'Safety order (ROP Order) =', /pesanan pengaman/i],
  [safetyStockId, 'sst.osip.def.fisik', 'Safety ROP Fisik =', /pengaman ROP Fisik/i],
  [safetyStockId, 'sst.rop.unavailable.NO_SAFETY_ORDER', 'safety order', /pesanan pengaman/i],
  [safetyStockId, 'sst.rop.unavailable.NO_FISIK_SAFETY', 'Safety ROP Fisik', /pengaman ROP Fisik/i],
  [safetyStockId, 'sst.rop.detail.supplierReading', 'ROP Supplier adalah', /ROP Pemasok/],
  [
    safetyStockId,
    'sst.rop.detail.supplierReading',
    'ROP order to principal masih',
    /ROP ke prinsipal/
  ],
  [safetyStockId, 'sst.rop.def.rops', 'cycle stock (LTP', /stok siklus/i],
  [safetyStockId, 'sst.rop.def.rops', '+ safety order:', /pesanan pengaman/i],
  [safetyStockId, 'sst.rop.def.max', 'Max = ROP Fisik', /\bMaks\b/],
  [
    safetyStockId,
    'sst.rop.def.supplier',
    'ROP Supplier dan ROP order to principal',
    /ROP Pemasok|ROP ke prinsipal/
  ],
  [inventoryCapacityId, 'inv.col.supplierRop.displayOnly', 'ROP Supplier sistem', /ROP Pemasok/],
  [inventoryCapacityId, 'inv.alerts.sup.rule.supplierBelowRop', '(ROP Supplier)', /ROP Pemasok/],
  [demandAnticipationId, 'demandAnt.subtitle', 'akan di-call-off', /dipanggil/],
  [demandAnticipationId, 'demandAnt.howItWorks', 'call-off minggu pertama', /panggilan/i],
  [demandAnticipationId, 'demandAnt.carry.label', 'Call-off {{week}}', /panggilan/i],
  [demandAnticipationId, 'demandAnt.carry.parts', '{{callOff}} di-call-off', /dipanggil/],
  [demandAnticipationId, 'demandAnt.flag.OSPO_FROM_STORE', 'belum di-call-off', /dipanggil/]
];

describe('BL-256 — TL-D17 in the Indonesian sentences', () => {
  it.each(ROWS)('%#: %s keeps the team term', (dict, key, term, translated) => {
    const text = dict[key];
    expect(text, key).toBeDefined();
    expect(text).toContain(term);
    expect(text).not.toMatch(translated);
  });

  it('the ROP Supplier note under the provisional rule keeps the term too', () => {
    const key = Object.keys(inventoryCapacityId).find((k) =>
      inventoryCapacityId[k]?.startsWith('ROP Supplier sistem (OSIP).')
    );
    expect(key).toBeDefined();
  });

  it('the EN sentences are unchanged (W-01, W-02 wait on the logic review)', () => {
    expect(safetyStockEn['sst.rop.def.max']).toMatch(/^Max = ROP Fisik/);
    expect(safetyStockEn['sst.osip.def.fisik']).toMatch(/^ROP Fisik safety = /);
    expect(safetyStockEn['sst.rop.def.supplier']).toMatch(/^ROP Supplier and ROP to principal /);
    expect(inventoryCapacityEn['inv.col.supplierRop.displayOnly']).toContain('ROP Supplier');
    expect(demandAnticipationEn['demandAnt.carry.parts']).toBe(
      '{{callOff}} called off, remainder {{remainder}}'
    );
  });
});
