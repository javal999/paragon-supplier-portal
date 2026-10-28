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
import {
  OSIP_RULES,
  cv as cvOf,
  componentCv,
  mean,
  monthlyBuckets
} from '../../transitions/osipRules';
import { fillStockouts, historyOf } from '../../engine/demandForecast';

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

  it('RM-STEAR-7300 × sup-002: 7 lead-time weeks, 13 weeks of LTP [Team B2], MPQ = order multiple 25, outside Jabodetabek (Medan)', () => {
    const s = pair(all, 'RM-STEAR-7300', 'sup-002');
    expect(s.leadTimeWeeks).toBe(7);
    expect(s.ltp).toEqual([
      2520, 2940, 2940, 2940, 2937, 2935, 2935, 2935, 2873, 2497, 2497, 2497, 2497
    ]);
    expect(s.mpq).toBe(25);
    expect(s.supplyArea).toBe('outsideJabodetabek');
    expect(s.supplierName).not.toBe('');
  });

  it('…and its safety order by hand: [Team B2] SD of 13 weeks 217.40 × 1.65 × √7 = 949.05, up to the MPQ 25 → 950', () => {
    const s = pair(all, 'RM-STEAR-7300', 'sup-002');
    const r = osipSafety(s);
    expect(r.safetyOrder.sd).toBeCloseTo(217.3982, 4);
    expect(r.safetyOrder.value).toBe(950);
    // The lead-time variant: SD of the 7 lead-time weeks 157.94 × 1.65 × √7 = 689.50 → 700.
    const lt = osipSafety(s, { ...OSIP_RULES, sdSource: 'ltp' });
    expect(lt.safetyOrder.sd).toBeCloseTo(157.9424, 4);
    expect(lt.safetyOrder.value).toBe(700);
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
    // [Team C1] a SKU's figures are its last 6 full calendar months of sell-in,
    // stock-out weeks filled: Feb–Jul 2026 (August is not full at W36).
    const first = /** @type {NonNullable<typeof c>} */ (c).skus[0];
    expect(first.skuCode).toBe('SYN-FG-006');
    const h = /** @type {NonNullable<ReturnType<typeof historyOf>>} */ (
      historyOf(
        data.sales.filter((s) => s.skuCode === first.skuCode),
        '2026-08-31'
      )
    );
    const months = monthlyBuckets(fillStockouts(h.qty, h.stockout), h.start).slice(-6);
    expect(months.map((m) => m.month)).toEqual([
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07'
    ]);
    const qty = months.map((m) => m.qty);
    expect(first.avgDemand).toBeCloseTo(mean(qty), 9);
    expect(first.cv).toBeCloseTo(/** @type {number} */ (cvOf(qty)), 12);
    expect(first.cv).toBeCloseTo(0.0843, 4);
    expect(c?.category).toBe('stable');
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
