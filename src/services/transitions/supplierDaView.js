// ─────────────────────────────────────────────────────────────────────────────
// BL-204 · THE SUPPLIER VIEW OF DEMAND ANTICIPATION (DRC-1, DRC-8 Incoming DA),
// SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.
//
// BUILT AHEAD AND SWITCHED OFF. Owner decision DRC-D10 holds: suppliers do not
// see DA until Material Planning confirms the safety and DA rules (A1, A2,
// B1 to B4). The owner asked for the feature to be built ahead, so it is
// complete behind ONE flag, `SUPPLIER_DA_VIEW_ENABLED`, following CAP-7's
// `REQUEST_REVISION_ENABLED` (forecastConfig.js). While false:
//   · the supplier menu has no Demand anticipation item (navConfig.js);
//   · the route renders a "not available yet" notice (SupplierDemandAnticipation);
//   · `getSupplierDemandAnticipation` returns an empty page to every scope;
//   · the feedstock confirmation hides "Incoming DA confirmed", and the verb
//     refuses a payload that carries it (feedstockRules.js).
// A code flag, not an administrator setting, so it cannot be switched on by
// accident; setting it to true is the one-line release once DRC-D10 lifts.
//
// The projection below is pure: it reads stored publications only. A supplier
// sees PUBLISHED figures, never the planner's "would be" recomputation, and
// never PTI's own inputs (SOH, OSPO, PR, gap): DRC-1 is "its own DA, read
// only, per material and week".
// ─────────────────────────────────────────────────────────────────────────────

/** @import { DemandAnticipationPublication } from './demandAnticipationRules' */
import { pairKey } from './demandAnticipationRules';

/**
 * DRC-D10 / BL-204 — the supplier view of DA and the Incoming DA confirmation.
 * False until Material Planning confirms A1, A2 and B1 to B4.
 */
export const SUPPLIER_DA_VIEW_ENABLED = false;

/**
 * One horizon week of a supplier's published DA. Every number is the stored
 * figure's: `qty` is `daInForce` (after the DRC-4 absorption), the parts are
 * the published week's LTP, safety order and carried-in remainders.
 * @typedef {{
 *   readonly week: string;
 *   readonly qty: number;
 *   readonly ltp: number;
 *   readonly safety: number;
 *   readonly carriedIn: number;
 * }} SupplierDaWeek
 */

/**
 * One supplier × material's DA as the latest publication holding the pair
 * recorded it (DRC-1).
 * `planningWeek`:  The planning week that publication records (it can be an
 *   earlier week than the hub's current one when this week is not published yet).
 * `totalDa`:  Σ of the horizon weeks' `qty`.
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly publicationId: string;
 *   readonly planningWeek: string;
 *   readonly publishedAt: string;
 *   readonly source: DemandAnticipationPublication['source'];
 *   readonly weeks: readonly SupplierDaWeek[];
 *   readonly totalDa: number;
 * }} SupplierDaRowCore
 */

/**
 * DRC-1 — every pair's figure from the LATEST publication that holds it
 * (publications are kept oldest first, so a re-publication of a week
 * supersedes the earlier one, as `publicationOf` reads it). Sorted by pair.
 * @param {readonly DemandAnticipationPublication[]} publications
 * @returns {SupplierDaRowCore[]}
 */
export function supplierDaRows(publications) {
  const seen = new Set();
  /** @type {SupplierDaRowCore[]} */
  const out = [];
  for (let i = publications.length - 1; i >= 0; i -= 1) {
    const pub = publications[i];
    for (const e of pub.entries) {
      const key = pairKey(e.supplierId, e.materialCode);
      if (seen.has(key)) continue;
      seen.add(key);
      const v = e.figure.value;
      const weeks = v.horizonWeeks.map((week, j) => {
        const w = v.weeks[j];
        return {
          week,
          qty: v.daInForce[j] ?? 0,
          ltp: w ? w.ltp : 0,
          safety: w ? w.safety : 0,
          carriedIn: w ? w.carriedIn.reduce((n, c) => n + c.qty, 0) : 0
        };
      });
      out.push({
        supplierId: e.supplierId,
        materialCode: e.materialCode,
        publicationId: pub.id,
        planningWeek: pub.planningWeek,
        publishedAt: pub.publishedAt,
        source: pub.source,
        weeks,
        totalDa: weeks.reduce((n, w) => n + w.qty, 0)
      });
    }
  }
  return out.sort((a, b) =>
    pairKey(a.supplierId, a.materialCode).localeCompare(pairKey(b.supplierId, b.materialCode))
  );
}
