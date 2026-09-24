// ─────────────────────────────────────────────────────────────────────────────
// Finished-goods sales through the bill of materials — the weekly gross
// requirement per material (the first step of E14-03, METHOD-SPEC M2).
//
// Uses the BOM version valid in each week (E14-01 edge case), adds scrap and
// divides by yield (E14-03 BR-03, BL-115). Pure: inputs in, series out.
// ─────────────────────────────────────────────────────────────────────────────

import type { BomLine, IsoDate, SalesWeek } from './types';

/** materialCode → weekStart → quantity, in the material's own unit. */
export type RequirementSeries = Map<string, Map<IsoDate, number>>;

/**
 * E14-03 BR-03 — component quantity per ONE parent unit, as the requirement
 * counts it: qtyPer × (1 + scrap) ÷ yield. With a yield of 1 this is exactly
 * qtyPer × (1 + scrap), bit for bit (÷ 1 is exact in floating point), so a
 * BOM without yield losses gives the figures it gave before yield existed.
 * (E14-03's explosion multiplies by this factor, as it multiplied by
 * qtyPer × (1 + scrap) before.)
 */
export const componentFactor = (b: Pick<BomLine, 'qtyPer' | 'scrapPct' | 'yieldPct'>): number =>
  (b.qtyPer * (1 + b.scrapPct)) / b.yieldPct;

export function grossRequirement(sales: readonly SalesWeek[], bom: readonly BomLine[]): RequirementSeries {
  const byParent = new Map<string, BomLine[]>();
  for (const b of bom) {
    const list = byParent.get(b.parentCode);
    if (list) list.push(b);
    else byParent.set(b.parentCode, [b]);
  }
  const out: RequirementSeries = new Map();
  for (const s of sales) {
    for (const b of byParent.get(s.skuCode) ?? []) {
      if (s.weekStart < b.validFrom || (b.validTo !== undefined && s.weekStart >= b.validTo)) continue;
      let series = out.get(b.componentCode);
      if (!series) {
        series = new Map();
        out.set(b.componentCode, series);
      }
      // Kept in the pre-yield order of operations — (qty × qtyPer) × (1 + scrap),
      // then ÷ yield — so a yield of 1 changes no figure by even one bit.
      series.set(s.weekStart, (series.get(s.weekStart) ?? 0) + (s.quantity * b.qtyPer * (1 + b.scrapPct)) / b.yieldPct);
    }
  }
  return out;
}
