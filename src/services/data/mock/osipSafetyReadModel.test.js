// ─────────────────────────────────────────────────────────────────────────────
// BL-193 (DRC-7) / BL-197 (DRC-11) — the inputs the read model hands the OSIP
// rules, at the hub's declared present (W36, 2026-08-31). Named members and
// named values: the claims depend on the values (CLAUDE.md, data-population
// instruments).
// ─────────────────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it } from 'vitest';
import { osipSafetyInputs } from './osipSafetyReadModel';
import { consumptionStore } from './stores/consumptionStore';
import { engineDataset } from './fixtures/engineDataset';
import { NO_PERSON } from '@context/noPerson';
import { osipSafety } from '../../transitions/osipSafetyRules';
import { cv as cvOf, componentCv, mean } from '../../transitions/osipRules';

afterEach(() => consumptionStore.reset());

/**
 * @param {Map<string, import('../../transitions/osipSafetyRules').MaterialOsipInputs>} all
 * @param {string} material
 * @param {string} supplier
 */
const pair = (all, material, supplier) => {
  const s = all.get(material)?.suppliers.find((x) => x.supplierId === supplier);
  if (!s) throw new Error(`${material} × ${supplier} missing`);
  return s;
};

describe('osipSafetyInputs — what the rules read', () => {
  const all = osipSafetyInputs();

  it('every engine material is present; its sources primary first (largest share)', () => {
    expect([...all.keys()].sort()).toEqual(
      engineDataset()
        .materials.map((m) => m.materialCode)
        .sort()
    );
    expect(all.get('PK-PETB-8801')?.suppliers.map((s) => s.supplierId)).toEqual([
      'sup-007',
      'sup-012'
    ]);
  });

  it('RM-STEAR-7300 × sup-002: 7 lead-time weeks of LTP, MPQ = order multiple 25, outside Jabodetabek (Medan)', () => {
    const s = pair(all, 'RM-STEAR-7300', 'sup-002');
    expect(s.leadTimeWeeks).toBe(7);
    expect(s.ltp).toEqual([2520, 2940, 2940, 2940, 2937, 2935, 2935]);
    expect(s.mpq).toBe(25);
    expect(s.supplyArea).toBe('outsideJabodetabek');
    expect(s.supplierName).not.toBe('');
  });

  it('…and its safety order by hand: SD 157.94 × 1.65 × √7 = 689.50, up to the MPQ 25 → 700', () => {
    const r = osipSafety(pair(all, 'RM-STEAR-7300', 'sup-002'));
    expect(r.safetyOrder.sd).toBeCloseTo(157.9424, 4);
    expect(r.safetyOrder.value).toBe(700);
  });

  it('the supply area follows the supplier master: Tangerang = Jabodetabek, Germany = import', () => {
    expect(pair(all, 'PK-PETB-8801', 'sup-007').supplyArea).toBe('jabodetabek');
    expect(pair(all, 'PK-PETB-8801', 'sup-012').supplyArea).toBe('import');
  });

  it('a source with no published LTP reads zeros, and the rules say NO_LTP', () => {
    const s = pair(all, 'AI-PANTO-6640', 'sup-009');
    expect(s.ltp.every((q) => q === 0)).toBe(true);
    expect(osipSafety(s).safetyOrder.unavailable).toBe('NO_LTP');
  });

  it('no consumption is recorded at start: the series is empty', () => {
    expect(pair(all, 'RM-STEAR-7300', 'sup-002').consumption).toEqual([]);
  });

  it('CV: a component is weighted over its BOM parents valid this week, each SKU its own variant', () => {
    const data = engineDataset();
    const c = all.get('RM-STEAR-7300')?.cv;
    expect(c?.noBom).toBe(false);
    expect(c?.skus.length).toBeGreaterThan(1);
    // Recomputed from the module's own functions over the SKUs the read names.
    expect(c?.cv).toBeCloseTo(/** @type {number} */ (componentCv(c?.skus ?? [])), 12);
    const parents = new Set(
      data.bom
        .filter(
          (b) =>
            b.componentCode === 'RM-STEAR-7300' &&
            b.validFrom <= '2026-08-31' &&
            (b.validTo === undefined || '2026-08-31' < b.validTo)
        )
        .map((b) => b.parentCode)
    );
    for (const k of c?.skus ?? []) expect(parents.has(k.skuCode)).toBe(true);
    // A SKU's figures are its last 26 weeks of sell-in.
    const first = /** @type {NonNullable<typeof c>} */ (c).skus[0];
    const rows = data.sales
      .filter((s) => s.skuCode === first.skuCode && s.weekStart < '2026-08-31')
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
      .slice(-26);
    // No stock-out in this SKU's window, so no week is filled.
    expect(rows.length).toBe(26);
    expect(rows.some((r) => r.stockout)).toBe(false);
    expect(first.avgDemand).toBeCloseTo(mean(rows.map((r) => r.quantity)), 9);
    expect(first.cv).toBeCloseTo(/** @type {number} */ (cvOf(rows.map((r) => r.quantity))), 12);
  });
});

describe('osipSafetyInputs — recorded consumption, times the supplier share', () => {
  it('the last 13 weeks only, oldest first, × share (RM-EMUL-9410: sup-002 0.7, sup-005 0.3)', () => {
    const rec = (/** @type {string} */ week, /** @type {number} */ qty) =>
      consumptionStore.add({
        materialCode: 'RM-EMUL-9410',
        week,
        qty,
        unit: 'KG',
        source: 'manual',
        recordedAt: '2026-08-31T12:00:00.000Z',
        actor: NO_PERSON
      });
    rec('2026-05-25', 9999); // 14 weeks before W36: outside the window
    rec('2026-08-17', 1000);
    rec('2026-08-24', 2000);
    const all = osipSafetyInputs();
    expect(pair(all, 'RM-EMUL-9410', 'sup-002').consumption).toEqual([700, 1400]);
    expect(pair(all, 'RM-EMUL-9410', 'sup-005').consumption.map((q) => Math.round(q))).toEqual([
      300, 600
    ]);
  });
});
