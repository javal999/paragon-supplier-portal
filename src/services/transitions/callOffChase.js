// ────────────────────────────────────────────────────────────────────────────
// THE MISSING-ASN CHASE — AIB-3 (BL-351), SC-HUB-ASN-INBOUND-REQUIREMENTS-2026-11.
//
// A call-off the planner has SENT with no ASN from the supplier is chased. The
// rule, as the owner ruled it (AIB-3 BR-01, [Owner, 2026-11-18, BL-335]; decision
// AIB-D6):
//
//   · the chase FIRES on the NEXT WORKING DAY after the call-off is sent, ONCE —
//     a derived state, never a stored timer, so every read agrees with the
//     calendar the administrator maintains (BL-50);
//   · the planner CLOSES it with a reason; a closed chase never comes back;
//   · it CLEARS when the supplier's ASNs cover the call-off — a partial ASN
//     keeps it until the ASNs cover what was agreed (AIB-3 edge case, [Proposed]);
//   · a call-off that was never sent (Draft, Dismissed) or that the supplier
//     rejected raises no chase;
//   · CR-09 is NOT replaced: the 7-day-before-need-date reminder is a second,
//     separate rule (AIB-3 BR-02, BR-03).
//
// ⚠️ TWO FACTS CLOSE THE CHASE BY EVIDENCE, AND THEY ARE THIS BATCH'S CALL —
// reported for the owner to overrule. A delivery fully RECEIVED has no ASN left
// to chase (the goods arrived; the GR pages already read "Received without
// ASN"), and a delivery the hub reads as MISSED is past the point where a
// shipping notice helps. Without the receipt condition the GATE demo's
// received-without-ASN call-offs (20 rows, received up to 84 days ago) would sit
// on the chase list beside today's — a list that contradicts a posted receipt.
// What is NOT added: no end date, no cap on how long an open chase stays open.
//
// Every figure is derived at read from the call-off, ASN and goods-receipt
// stores; the only stored fact is the planner's closure (the ledger).
// ────────────────────────────────────────────────────────────────────────────

/** @import { ASN, CallOff, GoodsReceipt } from '../data/types' */
/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { WorkingCalendar } from '../../lib/workingCalendar' */
import { addWorkingDays, documentInstant } from '../../lib/workingCalendar';
import { hubWorkingCalendar } from './workingCalendarStore';
import { approvedDeliveries, callOffViews, isReleased, SHIPPED_ASN_STATES } from './callOffRules';

/** AIB-3 BR-01 — ONE working day after the call-off is sent. */
export const CHASE_WORKING_DAYS = 1;

/**
 * `notDue`:  Sent, chase not yet fired (the next working day has not come).
 * `open`:  Fired, no covered ASN, not closed — the list the planner acts on.
 * `closed`:  The planner closed it with a reason; it never re-opens.
 * `covered`:  The supplier's shipped ASNs cover the agreed quantity.
 *
 * @typedef {'notDue' | 'open' | 'closed' | 'covered'} CallOffChaseState
 */

/**
 * The planner's closure of one chase (AIB-3 data: closed by, at, reason).
 * `callOffId`:  The chase's entity id — one chase per call-off, so one id.
 * `reason`:  The planner's reason, text with substance (the verb's policy hook proves it).
 *
 * @typedef {{
 *   readonly callOffId: string;
 *   readonly reason: string;
 *   readonly closedAt: string;
 *   readonly closedBy: ActorAttribution;
 * }} ChaseClosure
 */

/**
 * One call-off's chase state, as the planner and the supplier read it.
 * `coverage`:  Shipped quantity on the ASNs linked to this call-off, for its material.
 * `obligation`:  The agreed total (the approved deliveries; the released quantity before an answer).
 * `closed`:  The closure, when the planner closed it; null otherwise.
 *
 * @typedef {{
 *   readonly callOffId: string;
 *   readonly callOffNumber: string;
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly materialCode: string;
 *   readonly description: string;
 *   readonly uom: string;
 *   readonly quantity: number;
 *   readonly needDate: string;
 *   readonly releasedAt: string;
 *   readonly dueAt: string;
 *   readonly state: CallOffChaseState;
 *   readonly coverage: number;
 *   readonly obligation: number;
 *   readonly closed: ChaseClosure | null;
 * }} CallOffChaseRow
 */

/**
 * AIB-3 BR-01 — the instant the chase fires: one working day after the
 * call-off was sent, on the hub's calendar (BL-50: every deadline reads the
 * calendar the administrator maintains). Null for a call-off never sent.
 * @param {Pick<CallOff, 'releasedAt'>} callOff
 * @param {WorkingCalendar} [cal]
 * @returns {string | null}
 */
export function chaseDueAt(callOff, cal = hubWorkingCalendar()) {
  if (!callOff.releasedAt) return null;
  return addWorkingDays(
    documentInstant(callOff.releasedAt, cal),
    CHASE_WORKING_DAYS,
    cal
  ).toISOString();
}

/**
 * AIB-3 — what the supplier has told the hub is coming: the quantity shipped
 * on ASNs LINKED to this call-off, in a shipped state (a draft never left, a
 * cancelled one never will — `SHIPPED_ASN_STATES`).
 * @param {Pick<CallOff, 'id' | 'materialCode'>} callOff
 * @param {readonly ASN[]} asns
 * @returns {number}
 */
export function chaseCoverage(callOff, asns) {
  return asns
    .filter((a) => a.callOffId === callOff.id && SHIPPED_ASN_STATES.includes(a.status))
    .reduce(
      (sum, a) =>
        sum +
        a.lineItems
          .filter((l) => l.materialCode === callOff.materialCode)
          .reduce((line, l) => line + l.shippedQty, 0),
      0
    );
}

/**
 * What the ASNs must cover: the agreed total — the approved deliveries after a
 * confirmation, the released quantity before one.
 * @param {Pick<CallOff, 'quantity'> & Parameters<typeof approvedDeliveries>[0]} callOff
 * @returns {number}
 */
export function chaseObligation(callOff) {
  return approvedDeliveries(callOff).reduce((sum, d) => sum + d.quantity, 0);
}

/**
 * The chase rows of every call-off the planner sent, in the order the list
 * reads them (oldest chase first, then call-off number).
 *
 * A chase exists only for a call-off that was SENT and is not yet resolved:
 *   · Draft / Dismissed / Rejected — never sent, or the supplier declined.
 *   · Every agreed delivery RECEIVED — the goods arrived, no ASN left to chase.
 *   · A delivery the hub reads as MISSED — past the point a notice helps.
 * The remaining rows are `notDue`, `open`, `covered` or `closed`; the page and
 * Home list only `open`.
 *
 * @param {readonly CallOff[]} callOffs
 * @param {readonly ASN[]} asns
 * @param {readonly GoodsReceipt[]} receipts
 * @param {readonly ChaseClosure[]} closures
 * @param {string} nowIso
 * @param {WorkingCalendar} [cal]
 * @returns {readonly CallOffChaseRow[]}
 */
export function callOffChaseRows(
  callOffs,
  asns,
  receipts,
  closures,
  nowIso,
  cal = hubWorkingCalendar()
) {
  const views = new Map(
    callOffViews(callOffs, asns, receipts, nowIso).map((v) => [v.callOff.id, v])
  );
  const closedBy = new Map(closures.map((c) => [c.callOffId, c]));
  const now = Date.parse(nowIso);
  /** @type {CallOffChaseRow[]} */
  const rows = [];
  // One chase per call-off id — and the id is the entity the close verb names,
  // so a store holding two rows under one id yields ONE chase, the first, the
  // same row `callOffStore.get(id)` resolves. (The walkthrough fixture's
  // CO-2026-0043/0044 reuse the base seed's ids; that collision is reported,
  // not repaired here.)
  const seen = new Set();
  for (const c of callOffs) {
    if (!c.releasedAt || !isReleased(c)) continue;
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    const view = views.get(c.id);
    if (!view) continue;
    // The goods arrived: a receipt answers what an ASN would have announced.
    const received = view.results.length > 0 && view.results.every((r) => r.basis === 'receipt');
    if (received || view.delivery === 'missed') continue;
    const dueAt = chaseDueAt(c, cal);
    if (dueAt === null) continue;
    const coverage = chaseCoverage(c, asns);
    const obligation = chaseObligation(c);
    const closed = closedBy.get(c.id) ?? null;
    /** @type {CallOffChaseState} */
    const state = closed
      ? 'closed'
      : obligation <= 0 || coverage >= obligation
        ? 'covered'
        : now >= Date.parse(dueAt)
          ? 'open'
          : 'notDue';
    rows.push({
      callOffId: c.id,
      callOffNumber: c.callOffNumber,
      supplierId: c.supplierId,
      supplierName: c.supplierName,
      materialCode: c.materialCode,
      description: c.description,
      uom: c.uom,
      quantity: c.quantity,
      needDate: c.needDate,
      releasedAt: c.releasedAt,
      dueAt,
      state,
      coverage,
      obligation,
      closed
    });
  }
  return rows.sort(
    (a, b) => a.dueAt.localeCompare(b.dueAt) || a.callOffNumber.localeCompare(b.callOffNumber)
  );
}

/**
 * One call-off's chase row, or null when it has none (the command target's
 * `readState` / `readEntity`).
 * @param {string} callOffId
 * @param {readonly CallOff[]} callOffs
 * @param {readonly ASN[]} asns
 * @param {readonly GoodsReceipt[]} receipts
 * @param {readonly ChaseClosure[]} closures
 * @param {string} nowIso
 * @param {WorkingCalendar} [cal]
 * @returns {CallOffChaseRow | null}
 */
export function callOffChaseRow(callOffId, callOffs, asns, receipts, closures, nowIso, cal) {
  return (
    callOffChaseRows(callOffs, asns, receipts, closures, nowIso, cal).find(
      (r) => r.callOffId === callOffId
    ) ?? null
  );
}
