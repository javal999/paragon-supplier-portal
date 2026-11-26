// ────────────────────────────────────────────────────────────────────────────
// UCX-P4 v2 (BL-365) — THE WEEKLY PAGE'S PURE RULES (PSC-1, owner 2026-11-18).
//
// The page confirms each material ONCE a week (stock on hand, in production and
// feedstock — UCX-D17), shows a "Last confirmed" date per material, shows
// capacity's "Last changed" date, and carries at the WEEK level ONLY the demand
// anticipation, the due purchase orders and the Foresight periods (UCX-D17).
// Stock, in production, feedstock and capacity are never carried: each needs
// its own confirmed figure, and capacity shows the date of its last change.
//
// Pure: no store, no clock, no UI. The page and its specs call these functions
// so the carried set and the confirmed counts cannot disagree between the
// screen and the test.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CapacityPlan, InventoryPosition } from '../data/types' */

/**
 * UCX-D17 — the ONLY items a week-level confirmation carries. The list is the
 * ruling: stock, in production, feedstock and capacity are deliberately absent.
 * @typedef {'demandAnticipation' | 'purchaseOrders' | 'foresight'} WeeklyCarriedKind
 */

/** @type {readonly WeeklyCarriedKind[]} */
export const WEEKLY_CARRIED_KINDS = Object.freeze([
  'demandAnticipation',
  'purchaseOrders',
  'foresight'
]);

/**
 * `count`:  How many periods or orders the item carries; null for the demand
 *   anticipation, which the page names by week and never by figure (DRC-D10).
 * @typedef {{
 *   readonly kind: WeeklyCarriedKind;
 *   readonly count: number | null;
 * }} WeeklyCarriedItem
 */

/**
 * What "Confirm the week" carries, in the ruling's order (UCX-D17): the DA,
 * the due POs and the Foresight periods. Nothing else is ever returned.
 * @param {{ readonly duePurchaseOrderCount: number; readonly foresightCount: number }} facts
 * @returns {readonly WeeklyCarriedItem[]}
 */
export function carriedForwardItems({ duePurchaseOrderCount, foresightCount }) {
  return [
    { kind: 'demandAnticipation', count: null },
    { kind: 'purchaseOrders', count: duePurchaseOrderCount },
    { kind: 'foresight', count: foresightCount }
  ];
}

/**
 * The later of the two instants that confirm a material for the week, or null
 * when neither exists. The stock record's `lastUpdatedAt` is the stock half;
 * the feedstock confirmation's `recordedAt` is the feedstock half.
 * @param {string | null | undefined} stockRecordedAt
 * @param {string | null | undefined} feedstockRecordedAt
 * @returns {string | null}
 */
export function lastConfirmedAt(stockRecordedAt, feedstockRecordedAt) {
  const stock =
    typeof stockRecordedAt === 'string' && stockRecordedAt !== '' ? stockRecordedAt : null;
  const feed =
    typeof feedstockRecordedAt === 'string' && feedstockRecordedAt !== ''
      ? feedstockRecordedAt
      : null;
  if (stock === null) return feed;
  if (feed === null) return stock;
  // ISO-8601 instants sort lexicographically in time order.
  return stock > feed ? stock : feed;
}

/**
 * UCX-D17 — capacity shows the date of its last change: the latest submission's
 * `submittedAt`, or null when the group was never submitted.
 * @param {Pick<CapacityPlan, 'latest'>} plan
 * @returns {string | null}
 */
export const capacityLastChanged = (plan) => plan.latest?.submittedAt ?? null;

/**
 * PSC-2 BR-06 / UCX-D18 — feedstock is the packaging material's figure: a raw
 * material row has no feedstock field (the stock template drops the columns
 * for a raw material supplier).
 * @param {Pick<InventoryPosition, 'materialType'>} position
 * @returns {boolean}
 */
export const feedstockApplies = (position) => position.materialType === 'VERP';

/**
 * Does one material count as confirmed for the week? The stock figure must be
 * accepted in the current cycle AND, where feedstock applies (a packaging
 * material), its feedstock confirmation must be in the current cycle too —
 * one confirmation per material covers all three figures (UCX-D17).
 * @param {{ readonly stockUpdated: boolean; readonly feedstockUpdated: boolean; readonly feedstockApplies: boolean }} facts
 * @returns {boolean}
 */
export const materialConfirmed = ({ stockUpdated, feedstockUpdated, feedstockApplies }) =>
  stockUpdated && (!feedstockApplies || feedstockUpdated);

/**
 * The page's counter: how many of the supplier's materials are confirmed for
 * the current cycle, out of how many it has.
 * @param {{
 *   readonly positions: readonly Pick<InventoryPosition, 'materialCode' | 'materialType'>[];
 *   readonly stockUpdated: readonly string[];
 *   readonly feedstockUpdated: readonly string[];
 * }} facts
 * @returns {{ readonly confirmed: number; readonly total: number }}
 */
export function weeklyProgress({ positions, stockUpdated, feedstockUpdated }) {
  const stock = new Set(stockUpdated);
  const feedstock = new Set(feedstockUpdated);
  let confirmed = 0;
  for (const p of positions) {
    if (
      materialConfirmed({
        stockUpdated: stock.has(p.materialCode),
        feedstockUpdated: feedstock.has(p.materialCode),
        feedstockApplies: feedstockApplies(p)
      })
    )
      confirmed += 1;
  }
  return { confirmed, total: positions.length };
}

/**
 * The materials a week's DA confirmation may name: the publication's own
 * materials that the supplier actually holds. The confirmation verb refuses a
 * material the publication does not hold, so the page names only this set.
 * @param {readonly string[]} publicationMaterials
 * @param {readonly string[]} ownMaterials
 * @returns {readonly string[]}
 */
export function publishedMaterialsOf(publicationMaterials, ownMaterials) {
  const own = new Set(ownMaterials);
  return publicationMaterials.filter((code) => own.has(code));
}
