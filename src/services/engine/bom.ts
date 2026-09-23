// ─────────────────────────────────────────────────────────────────────────────
// Finished-goods sales through the bill of materials — the weekly gross
// requirement per material (the first step of E14-03, METHOD-SPEC M2).
//
// Uses the BOM version valid in each week (E14-01 edge case) and adds scrap.
// Pure: inputs in, series out.
// ─────────────────────────────────────────────────────────────────────────────

import type { BomLine, IsoDate, SalesWeek } from './types';

/** materialCode → weekStart → quantity, in the material's own unit. */
export type RequirementSeries = Map<string, Map<IsoDate, number>>;

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
      series.set(s.weekStart, (series.get(s.weekStart) ?? 0) + s.quantity * b.qtyPer * (1 + b.scrapPct));
    }
  }
  return out;
}
