// ─────────────────────────────────────────────────────────────────────────────
// CALL-OFF TRIGGER AT ROP FISIK — BL-199 (DRC-13, DRC-D12),
// SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.
//
// On every PTI SOH update the hub compares a material's stock on hand with its
// ROP Fisik and, at or below it, drafts a call-off on the umbrella PO for the
// planner to approve [Owner F2]:
//   · BR-01   at or below ROP Fisik → a draft, through the existing draft act;
//             one open draft per material; a dismissed (or released) draft does
//             not come back until SOH rises above ROP Fisik and falls again.
//   · BR-01a  the oldest blanket line with balance first (CAP-9's
//             `oldestFirst`), across every supplier holding balance; need date
//             = today + the replenishment cycle f of that supplier's area
//             (`replenishmentCycleDays` × `supplyAreaOf`, DRC-14 [Default B6]).
//   · BR-01b  [Team, 2026-10-28, F5; owner ruling 2026-10-28] quantity = the
//             supplier's minimum delivery quantity (MDQ = MOQ until the master
//             carries MDQ, [Proposed] owner 2026-10-28), rounded up the way max
//             stock rounds (local: pallet/koli; import: MOQ; `maxRule`), then
//             capped so projected stock never exceeds Max (BR-03 [Owner A7]);
//             never above a line's remaining balance, the remainder on the
//             next-oldest line (CAP-12's walk). Call-offs follow ROP Fisik, not
//             the PO delivery date. The earlier rule — Max − (SOH + released
//             not received), rounded up to the MPQ — is kept as `fillToMax`.
//             The ≤ 6 MPQ-rate continuous/batching rule is NOT a call-off rule:
//             it lives only in the OSIP level suggestion (`osipLevelSuggestion`).
//   · BR-02   what no blanket line covers is a recommendation: "Create a PR in
//             SAP for N". The hub posts nothing to SAP.
//   · BR-05   SOH is compared per material, all plants combined [Default F1];
//             every SOH record keeps its plant (DRC-D12).
//
// ROP Fisik and Max are the calculation module's (`osipRules.js`) through
// Task A's `osipRops`; this file sums them over the material's suppliers and
// never re-derives a formula.
//
// Pure: plain data in, plain data out. No clock, no store.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { BlanketBalance } from './supplyBelowDemandRules' */
/** @import { CallOff } from '../data/types' */
/** @import { DeliveryResult } from './callOffRules' */
/** @import { Stamped } from './osipRules' */
import { oldestFirst } from './blanketPoRules';
import { isReleased } from './callOffRules';
import { ceilingTo } from './osipRules';

/** DRC-D12 — the plants a PTI SOH record names. */
/** @typedef {'J6' | 'J2'} PtiPlant */

/** DRC-D12 — the plants PTI stock sits in (eWM, MoM 5A). */
export const PTI_PLANTS = Object.freeze(/** @type {PtiPlant[]} */ (['J6', 'J2']));

/**
 * The trigger's readings, one key each with its question ID (design rule 2).
 */
export const CALL_OFF_TRIGGER_RULES = Object.freeze({
  /**
   * [Default F1] DRC-13 BR-05 — 'combined': the material's SOH summed over
   * every plant is compared with its ROP Fisik. 'perPlant' (the alternative
   * kept): each plant's SOH is compared with the material's ROP Fisik, and any
   * plant at or below it triggers. The hub holds no ROP Fisik per plant, so
   * the per-plant variant is flagged `ROP_NOT_PER_PLANT`.
   */
  plantComparison: /** @type {'combined' | 'perPlant'} */ ('combined'),
  /**
   * [Owner A7, reading] BR-03 — when rounding up to the MPQ would take
   * projected stock above Max: 'mpqMultiple' steps down to the largest MPQ
   * multiple that fits (a call-off stays a whole MPQ); 'exact' cuts the call-off
   * to exactly what fits (the literal "round up, then cap").
   */
  maxCap: /** @type {'mpqMultiple' | 'exact'} */ ('mpqMultiple'),
  /**
   * [Team, 2026-10-28, F5; owner ruling 2026-10-28] BR-01b — one call-off's
   * quantity: 'minimumDelivery' = the supplier's MDQ rounded like max stock
   * (default); 'fillToMax' = Max − (SOH + released not received), rounded up
   * to the MPQ (the earlier reading).
   */
  quantityRule: /** @type {'minimumDelivery' | 'fillToMax'} */ ('minimumDelivery'),
  /**
   * [Proposed, 2026-10-28 — awaits the owner] when the minimum delivery,
   * rounded like Max, does not fit under Max. Max is ROP Fisik rounded up to
   * the same unit, so at the trigger the room below Max is always under one
   * unit: read literally, A7 ("Max caps call-offs") and F5 ("the minimum
   * delivery, rounded like Max") never let a call-off through. 'callOff': the
   * minimum delivery is called off anyway, flagged `ABOVE_MAX` (stock may pass
   * Max by less than one unit); 'wait': A7 wins, cut per `maxCap`, and nothing
   * is called off while not even one unit fits.
   */
  minimumDeliveryAboveMax: /** @type {'callOff' | 'wait'} */ ('callOff'),
  /** [Default] MPQ = orderMultiple until the master data feed carries MPQ (wave 2 default). */
  mpqSource: /** @type {'orderMultiple'} */ ('orderMultiple'),
  /** DRC-13 — a call-off at ROP Fisik replenishes stock already needed: JIT (REQ-E09-01 BR-09). */
  callOffType: /** @type {'jit'} */ ('jit')
});

/** @typedef {typeof CALL_OFF_TRIGGER_RULES} CallOffTriggerRules */

/**
 * Design rule 5 — the question IDs behind every trigger figure: the plant rule
 * and the ROP questions still open (Max B8, B9), and the MPQ default. B5, B6,
 * B7 and F5 left on 2026-10-28 [Team; owner ruling].
 */
export const CALL_OFF_TRIGGER_QUESTIONS = Object.freeze(['F1', 'B8', 'B9', 'MPQ']);

// ─── BR-05 — SOH against ROP Fisik ───────────────────────────────────────────

/**
 * One PTI SOH record as the trigger reads it (DRC-D12: it names its plant).
 * @typedef {{ readonly materialCode: string; readonly plant: PtiPlant; readonly ptiSoh: number }} PlantSoh
 */

/**
 * @typedef {'ROP_NOT_PER_PLANT'
 *   | 'PARTIAL_ROP'
 *   | 'NO_SUPPLY_AREA'
 *   | 'NO_MPQ'
 *   | 'NO_MDQ'
 *   | 'ROOM_BELOW_MPQ'
 *   | 'ROOM_BELOW_MIN_DELIVERY'
 *   | 'ABOVE_MAX'} TriggerFlag
 */

/**
 * `soh`: the material's SOH, all plants combined (what the quantity reads).
 * `plants`: each plant's SOH, in `PTI_PLANTS` order then any other.
 * `atOrBelow`: whether the comparison under the plant rule triggers.
 * @typedef {{
 *   readonly soh: number;
 *   readonly plants: readonly { readonly plant: PtiPlant; readonly soh: number }[];
 *   readonly atOrBelow: boolean;
 *   readonly flags: readonly TriggerFlag[];
 * }} SohCheck
 */

/**
 * A plant's place in `PTI_PLANTS` order; any other plant after them.
 * @param {string} plant
 */
const rank = (plant) => {
  const i = PTI_PLANTS.indexOf(/** @type {PtiPlant} */ (plant));
  return i < 0 ? PTI_PLANTS.length : i;
};

/**
 * DRC-13 BR-05 [Default F1] — the material's SOH against its ROP Fisik.
 * @param {readonly PlantSoh[]} records  The material's SOH records.
 * @param {number} ropFisik
 * @param {CallOffTriggerRules} [rules]
 * @returns {SohCheck}
 */
export function sohCheck(records, ropFisik, rules = CALL_OFF_TRIGGER_RULES) {
  /** @type {Map<PtiPlant, number>} */
  const byPlant = new Map();
  for (const r of records) byPlant.set(r.plant, (byPlant.get(r.plant) ?? 0) + r.ptiSoh);
  const plants = [...byPlant.entries()]
    .map(([plant, soh]) => ({ plant, soh }))
    .sort(
      (a, b) => rank(a.plant) - rank(b.plant) || String(a.plant).localeCompare(String(b.plant))
    );
  const soh = plants.reduce((n, p) => n + p.soh, 0);
  if (rules.plantComparison === 'perPlant')
    return {
      soh,
      plants,
      atOrBelow: plants.some((p) => p.soh <= ropFisik),
      flags: ['ROP_NOT_PER_PLANT']
    };
  return { soh, plants, atOrBelow: soh <= ropFisik, flags: [] };
}

/**
 * One supplier's ROP Fisik and Max for the material, as `osipRops` gives them
 * (null when that figure is not available for the supplier).
 * @typedef {{ readonly supplierId: string; readonly ropFisik: number | null; readonly max: number | null }} SupplierRop
 */

/**
 * The material's ROP Fisik and Max: the sum over its suppliers' figures. Each
 * supplier's figure already rests on its share of the material's consumption
 * (CAP-D11, DRC-B25), so the sum is the material's. A supplier without a
 * figure adds nothing and flags `PARTIAL_ROP`; with no figure at all the
 * material is not checked (null).
 * @param {readonly SupplierRop[]} suppliers
 * @returns {{ readonly ropFisik: number; readonly max: number; readonly flags: readonly TriggerFlag[] } | null}
 */
export function materialRop(suppliers) {
  const held = suppliers.filter((s) => s.ropFisik !== null && s.max !== null);
  if (held.length === 0) return null;
  return {
    ropFisik: held.reduce((n, s) => n + /** @type {number} */ (s.ropFisik), 0),
    max: held.reduce((n, s) => n + /** @type {number} */ (s.max), 0),
    flags: held.length < suppliers.length ? ['PARTIAL_ROP'] : []
  };
}

// ─── BR-01b — released call-offs not yet received ────────────────────────────

/**
 * BR-01b — the material's call-offs released and not yet received: per
 * released call-off, its quantity less what goods receipts counted against it
 * (`deliveryResults`, basis 'receipt'), never below 0.
 * @param {readonly Pick<CallOff, 'id' | 'materialCode' | 'quantity' | 'status'>[]} callOffs
 * @param {readonly Pick<DeliveryResult, 'callOffId' | 'basis' | 'quantity'>[]} results
 * @param {string} materialCode
 * @returns {number}
 */
export function releasedNotReceived(callOffs, results, materialCode) {
  return callOffs
    .filter((c) => c.materialCode === materialCode && isReleased(c))
    .reduce((n, c) => {
      const received = results
        .filter((r) => r.callOffId === c.id && r.basis === 'receipt')
        .reduce((s, r) => s + (r.quantity ?? 0), 0);
      return n + Math.max(0, c.quantity - received);
    }, 0);
}

// ─── BR-01a, BR-01b, BR-02 — the call-offs and the PR recommendation ─────────

/**
 * One blanket line the trigger may call off against: the CAP-12 balance, with
 * its supplier, that supplier's MPQ and its replenishment cycle f in days
 * (null when the supplier's area is unknown). [Team F5] `mdq`: the supplier's
 * minimum delivery quantity (null when the master has none); `roundTo`: the
 * unit max stock rounds to for that supplier (pallet/koli local, MOQ import;
 * 0 under the sheet's max rule, which does not round).
 * @typedef {BlanketBalance & {
 *   readonly supplierId: string;
 *   readonly mpq: number | null;
 *   readonly f: number | null;
 *   readonly mdq?: number | null;
 *   readonly roundTo?: number;
 * }} TriggerLine
 */

/**
 * One call-off the trigger drafts: `qty` on the line, which held `balance`.
 * @typedef {{
 *   readonly poId: string;
 *   readonly poNumber: string;
 *   readonly lineId: string;
 *   readonly supplierId: string;
 *   readonly qty: number;
 *   readonly balance: number;
 *   readonly mpq: number | null;
 *   readonly f: number | null;
 * }} TriggerCallOff
 */

/**
 * `room`: Max − (SOH + released not received), never below 0.
 * `prQty`: BR-02 — what the blanket lines could not cover: create a PR in SAP.
 * @typedef {{
 *   readonly room: number;
 *   readonly callOffs: readonly TriggerCallOff[];
 *   readonly prQty: number;
 *   readonly flags: readonly TriggerFlag[];
 * }} TriggerAllocation
 */

/**
 * BR-01b / BR-03 — one call-off's quantity: the room rounded up to the MPQ,
 * then capped so projected stock stays within Max (`maxCap`). An MPQ of 0 or
 * none leaves the room as it is.
 * @param {number} room  What still fits below Max.
 * @param {number | null} mpq
 * @param {CallOffTriggerRules} [rules]
 * @returns {number}
 */
export function cappedQuantity(room, mpq, rules = CALL_OFF_TRIGGER_RULES) {
  if (!(room > 0)) return 0;
  const step = mpq ?? 0;
  const up = ceilingTo(room, step);
  if (up <= room) return up;
  // [Owner A7] the rounding would pass Max.
  return rules.maxCap === 'mpqMultiple' ? Math.floor(room / step) * step : room;
}

/**
 * BR-01a / BR-01b / BR-02 — the call-offs one trigger drafts, oldest blanket
 * line first across every supplier, and the PR for what no line covers, per
 * `quantityRule` [Team F5]. Under 'fillToMax' they bring projected stock up to
 * Max:
 *
 *   room  = max(0, Max − (SOH + released not received))
 *   each line, oldest first: qty = min(`cappedQuantity`(room left, line MPQ),
 *         line balance); the remainder goes to the next line (CAP-12's walk).
 *   prQty = the room left once every line's balance is used (BR-02). Room
 *         left only because it is smaller than an MPQ is not a PR: it flags
 *         `ROOM_BELOW_MPQ`.
 * @param {{
 *   readonly max: number;
 *   readonly soh: number;
 *   readonly openSupply: number;
 *   readonly lines: readonly TriggerLine[];
 * }} input
 * @param {CallOffTriggerRules} [rules]
 * @returns {TriggerAllocation}
 */
export function allocateCallOffs(input, rules = CALL_OFF_TRIGGER_RULES) {
  return rules.quantityRule === 'fillToMax'
    ? fillToMax(input, rules)
    : minimumDelivery(input, rules);
}

/**
 * [Team F5] one call-off's quantity on a line: its MDQ rounded up to the max
 * stock rounding unit; null when the line has no MDQ.
 * @param {TriggerLine} line
 * @returns {number | null}
 */
export function deliveryQuantity(line) {
  if (!(typeof line.mdq === 'number' && line.mdq > 0)) return null;
  return ceilingTo(line.mdq, line.roundTo ?? 0);
}

/**
 * [Team F5] BR-01b 'minimumDelivery' — the call-off is the minimum delivery
 * quantity of the oldest line with balance (`deliveryQuantity`), capped by
 * the room below Max (`maxCap`: whole rounding units, or exactly what fits)
 * unless `minimumDeliveryAboveMax` lets it through ([Proposed]), then walked
 * over the lines oldest first; what no line covers is the PR
 * (BR-02). A line with no MDQ falls back to the room rounded to its MPQ
 * (`fillToMax`'s quantity), flagged `NO_MDQ`. No line with balance: the PR is
 * the room, as before.
 * @param {{
 *   readonly max: number;
 *   readonly soh: number;
 *   readonly openSupply: number;
 *   readonly lines: readonly TriggerLine[];
 * }} input
 * @param {CallOffTriggerRules} rules
 * @returns {TriggerAllocation}
 */
function minimumDelivery({ max, soh, openSupply, lines }, rules) {
  const room = Math.max(0, max - (soh + openSupply));
  /** @type {TriggerFlag[]} */
  const flags = [];
  const open = [...lines].sort(oldestFirst).filter((l) => l.balance > 0);
  if (room <= 0) return { room, callOffs: [], prQty: 0, flags };
  const first = open[0];
  if (!first) return { room, callOffs: [], prQty: room, flags };
  if (first.f === null) flags.push('NO_SUPPLY_AREA');
  const unit = deliveryQuantity(first);
  /** @type {number} */
  let want;
  if (unit === null) {
    flags.push('NO_MDQ');
    if (first.mpq === null) flags.push('NO_MPQ');
    want = cappedQuantity(room, first.mpq, rules);
  } else if (unit <= room) want = unit;
  else if (rules.minimumDeliveryAboveMax === 'callOff') {
    // [Proposed] the minimum delivery is the smallest call-off there is.
    want = unit;
    flags.push('ABOVE_MAX');
  } else {
    // [Owner A7] the minimum delivery would pass Max.
    const step = first.roundTo && first.roundTo > 0 ? first.roundTo : (first.mpq ?? 0);
    want = rules.maxCap === 'mpqMultiple' && step > 0 ? Math.floor(room / step) * step : room;
  }
  if (want <= 0) {
    flags.push(unit === null ? 'ROOM_BELOW_MPQ' : 'ROOM_BELOW_MIN_DELIVERY');
    return { room, callOffs: [], prQty: 0, flags };
  }
  /** @type {TriggerCallOff[]} */
  const callOffs = [];
  let left = want;
  for (const line of open) {
    if (left <= 0) break;
    const qty = Math.min(left, line.balance);
    callOffs.push({
      poId: line.poId,
      poNumber: line.poNumber,
      lineId: line.lineId,
      supplierId: line.supplierId,
      qty,
      balance: line.balance,
      mpq: line.mpq,
      f: line.f
    });
    left -= qty;
  }
  return { room, callOffs, prQty: left, flags };
}

/**
 * BR-01b 'fillToMax' (the earlier reading) — see `allocateCallOffs`.
 * @param {{
 *   readonly max: number;
 *   readonly soh: number;
 *   readonly openSupply: number;
 *   readonly lines: readonly TriggerLine[];
 * }} input
 * @param {CallOffTriggerRules} rules
 * @returns {TriggerAllocation}
 */
function fillToMax({ max, soh, openSupply, lines }, rules) {
  const room = Math.max(0, max - (soh + openSupply));
  /** @type {TriggerFlag[]} */
  const flags = [];
  /** @type {TriggerCallOff[]} */
  const callOffs = [];
  let left = room;
  let stoppedByMpq = false;
  for (const line of [...lines].sort(oldestFirst)) {
    if (left <= 0) break;
    if (line.balance <= 0) continue;
    if (line.mpq === null && !flags.includes('NO_MPQ')) flags.push('NO_MPQ');
    if (line.f === null && !flags.includes('NO_SUPPLY_AREA')) flags.push('NO_SUPPLY_AREA');
    const want = cappedQuantity(left, line.mpq, rules);
    if (want <= 0) {
      // The room left is smaller than this line's MPQ: no whole MPQ fits.
      stoppedByMpq = true;
      break;
    }
    const qty = Math.min(want, line.balance);
    callOffs.push({
      poId: line.poId,
      poNumber: line.poNumber,
      lineId: line.lineId,
      supplierId: line.supplierId,
      qty,
      balance: line.balance,
      mpq: line.mpq,
      f: line.f
    });
    left -= qty;
    if (qty < line.balance && left > 0) {
      // Rounding stopped short of the room on a line that still has balance.
      stoppedByMpq = true;
      break;
    }
  }
  if (stoppedByMpq && left > 0) flags.push('ROOM_BELOW_MPQ');
  return { room, callOffs, prQty: stoppedByMpq ? 0 : left, flags };
}

// ─── BR-01 — one open draft per material, and the trigger's ledger ───────────

/**
 * What one SOH update did for a material:
 *   noRop       — no ROP Fisik for the material: not checked.
 *   above       — SOH above ROP Fisik: the trigger re-arms.
 *   pending     — at or below, but a draft call-off of the material is open.
 *   waiting     — at or below, but this drop already had its draft (dismissed
 *                 or released): waits for SOH to rise above ROP Fisik again.
 *   covered     — at or below, but released call-offs already fill up to Max.
 *   belowMpq    — at or below, room left but less than an MPQ.
 *   drafted     — drafts created (and a PR recommendation when `prQty` > 0).
 *   prRecommended — no blanket balance at all: only the PR recommendation.
 * @typedef {'noRop' | 'above' | 'pending' | 'waiting' | 'covered' | 'belowMpq' | 'drafted' | 'prRecommended'} TriggerState
 */

/**
 * The figures behind a trigger row, stored with their inputs and
 * `RULES_VERSION` (DRC-D16). `quantity`: on the ledger, the total drafted; on
 * a draft call-off, that call-off's own. `demandPerDay` / `leadTimeDays`: the
 * material's ROP Fisik demand (summed over its suppliers) and its longest
 * supplier lead time, which rate the PR recommendation's Home task (SC-01).
 * @typedef {{
 *   readonly soh: number;
 *   readonly plants: readonly { readonly plant: PtiPlant; readonly soh: number }[];
 *   readonly ropFisik: number | null;
 *   readonly max: number | null;
 *   readonly openSupply: number;
 *   readonly room: number;
 *   readonly quantity: number;
 *   readonly prQty: number;
 *   readonly demandPerDay: number | null;
 *   readonly leadTimeDays: number | null;
 *   readonly flags: readonly TriggerFlag[];
 * }} TriggerFigures
 */

/**
 * One row of the trigger ledger: what one SOH update did for one material.
 * `armed`: whether the next drop may draft (false after a draft or a PR
 * recommendation, until SOH is seen above ROP Fisik again).
 * @typedef {{
 *   readonly materialCode: string;
 *   readonly observedAt: string;
 *   readonly sohSeq: number;
 *   readonly state: TriggerState;
 *   readonly armed: boolean;
 *   readonly callOffIds: readonly string[];
 *   readonly prQty: number;
 *   readonly figures: Stamped<TriggerFigures>;
 * }} TriggerRow
 */

/**
 * `ropAvailable`: the material has a ROP Fisik.
 * `pendingDraft`: a call-off of the material is in Draft (any origin).
 * `allocation`: what drafting would do now (read only when it drafts).
 * @typedef {{
 *   readonly ropAvailable: boolean;
 *   readonly atOrBelow: boolean;
 *   readonly pendingDraft: boolean;
 *   readonly allocation: TriggerAllocation;
 * }} TriggerStepInput
 */

/**
 * DRC-13 BR-01 / BR-02 — what an SOH update does, given the material's last
 * ledger row: the state, whether the trigger stays armed, and whether it
 * drafts (`draft`) or recommends a PR (`prQty`).
 * A material with no earlier row is armed: its first update may draft.
 * @param {Pick<TriggerRow, 'armed'> | undefined} prev
 * @param {TriggerStepInput} input
 * @returns {{ readonly state: TriggerState; readonly armed: boolean; readonly draft: boolean; readonly prQty: number }}
 */
export function triggerStep(prev, { ropAvailable, atOrBelow, pendingDraft, allocation }) {
  const armed = prev?.armed ?? true;
  if (!ropAvailable) return { state: 'noRop', armed, draft: false, prQty: 0 };
  if (!atOrBelow) return { state: 'above', armed: true, draft: false, prQty: 0 };
  if (pendingDraft) return { state: 'pending', armed, draft: false, prQty: 0 };
  if (!armed) return { state: 'waiting', armed, draft: false, prQty: 0 };
  if (allocation.room <= 0) return { state: 'covered', armed, draft: false, prQty: 0 };
  if (allocation.callOffs.length > 0)
    return { state: 'drafted', armed: false, draft: true, prQty: allocation.prQty };
  if (allocation.prQty > 0)
    return { state: 'prRecommended', armed: false, draft: false, prQty: allocation.prQty };
  return { state: 'belowMpq', armed, draft: false, prQty: 0 };
}

/**
 * An open "Create a PR in SAP" recommendation (BR-02).
 * @typedef {{
 *   readonly materialCode: string;
 *   readonly prQty: number;
 *   readonly recommendedAt: string;
 *   readonly figures: Stamped<TriggerFigures>;
 * }} PrRecommendation
 */

/**
 * An open PR recommendation as PTI reads it, with the material's label and unit.
 * @typedef {PrRecommendation & { readonly materialLabel: string; readonly uom: string }} PrRecommendationView
 */

/**
 * DRC-13 BR-02 — the open PR recommendations: per material, the latest row
 * that recommended one, until SOH is seen above ROP Fisik again (an `above`
 * row) or a later drop drafts without needing one.
 * @param {readonly TriggerRow[]} ledger  Oldest first.
 * @returns {PrRecommendation[]}
 */
export function openPrRecommendations(ledger) {
  /** @type {Map<string, TriggerRow | null>} */
  const open = new Map();
  for (const row of ledger) {
    if (row.prQty > 0) open.set(row.materialCode, row);
    else if (row.state === 'above' || row.state === 'drafted') open.set(row.materialCode, null);
  }
  return [...open.values()]
    .filter(/** @returns {r is TriggerRow} */ (r) => r !== null)
    .map((r) => ({
      materialCode: r.materialCode,
      prQty: r.prQty,
      recommendedAt: r.observedAt,
      figures: r.figures
    }))
    .sort((a, b) => a.materialCode.localeCompare(b.materialCode));
}
