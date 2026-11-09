// ─────────────────────────────────────────────────────────────────────────────
// PLAN VS EXECUTION TRACE — PEX-11 (BL-276), SC-HUB-PLAN-EXECUTION-REQUIREMENTS-
// 2026-11 section 3 (BR-01 to BR-03). BR-04 (a PO flowing back into DA) is Hold:
// it waits on Mba Septi's SAP identifiers and is not built.
//
// For one supplier × material: DA per week (the publication in force), the POs
// with a line for the material, the call-offs per PO and the ASNs per call-off,
// the flags of BR-02, and the events of BR-03 on the week they hit.
//
// Pure: stores' rows in, a trace out. Nothing is stored, so nothing is stamped.
//
// THE FLAG CONDITIONS ARE [Proposed] (the doc names the flags, not their tests):
//   noPo         a live call-off (not a Draft, Dismissed or Rejected one) whose
//                PO is not a PO of this supplier × material.
//   poUsedUp     a live call-off released while the calls before it (by need
//                date, then number) already filled its PO line's quantity; or
//                open on a PO that is Delivered or Closed.
//   overlapping  two open POs (not Delivered, Closed or Rejected) of the pair
//                whose order-to-delivery date ranges overlap.
// EVENTS (BR-03): a rejected call-off on its need-date week, a rejected PO on its
// order-date week, a capacity decision on its week, and demand the planner moved
// to another supplier (CAP-8) on the line's week.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { CallOff, ASN, PurchaseOrder, CapacityDecision, ForecastCommitmentLine } from '../data/types' */
/** @import { DaHistoryRow } from './demandAnticipationHistory' */
import { dayOf, mondayOf } from './inventoryRules';

/** Call-off statuses that are a live call on the PO. */
const NOT_LIVE = new Set(['Draft', 'Dismissed', 'Rejected']);
/** PO statuses that are no longer open. */
const PO_NOT_OPEN = new Set(['Delivered', 'Closed', 'Rejected']);
/** PO statuses that are used up. */
const PO_USED_UP = new Set(['Delivered', 'Closed']);

/** @typedef {'noPo' | 'poUsedUp' | 'overlapping'} TraceFlagKind */
/** @typedef {'callOffRejected' | 'poRejected' | 'capacityDecision' | 'demandMoved'} TraceEventKind */

/**
 * @typedef {{
 *   readonly kind: TraceFlagKind;
 *   readonly callOffNumber?: string;
 *   readonly poNumber?: string;
 *   readonly otherPoNumber?: string;
 * }} TraceFlag
 */

/**
 * `ref`: the call-off number, PO number or decision id; `detail`: a figure or a short fact.
 * @typedef {{
 *   readonly kind: TraceEventKind;
 *   readonly week: string;
 *   readonly ref: string;
 *   readonly detail: string | null;
 * }} TraceEvent
 */

/**
 * @typedef {{
 *   readonly callOff: CallOff;
 *   readonly asns: readonly ASN[];
 *   readonly flags: readonly TraceFlag[];
 * }} TraceCallOff
 */

/**
 * `lineQty`: the quantity of the PO's line for the material; `calledOff`: the sum of its live call-offs.
 * @typedef {{
 *   readonly po: PurchaseOrder;
 *   readonly lineQty: number;
 *   readonly calledOff: number;
 *   readonly callOffs: readonly TraceCallOff[];
 *   readonly poLevelAsns: readonly ASN[];
 *   readonly flags: readonly TraceFlag[];
 * }} TracePo
 */

/**
 * `da`: the DA in force for the week (the publication's `daInForce`), null when no publication covers it.
 * `publicationId`: the DA publication it comes from (the version link, BR-03).
 * @typedef {{
 *   readonly week: string;
 *   readonly da: number | null;
 *   readonly publicationId: string | null;
 *   readonly events: readonly TraceEvent[];
 * }} TraceWeek
 */

/**
 * @typedef {{
 *   readonly weeks: readonly TraceWeek[];
 *   readonly pos: readonly TracePo[];
 *   readonly noPoCallOffs: readonly TraceCallOff[];
 *   readonly flags: readonly TraceFlag[];
 * }} PlanExecutionTrace
 */

/**
 * @param {PurchaseOrder} po
 * @param {string} materialCode
 */
const lineOf = (po, materialCode) => po.lineItems.find((l) => l.materialCode === materialCode);

/**
 * The end of a PO's period: confirmed delivery, else requested.
 * @param {PurchaseOrder} po
 */
const poEnd = (po) => dayOf(po.confirmedDeliveryDate || po.requestedDeliveryDate || po.orderDate);

/**
 * PEX-11 BR-02 — two open POs of the pair whose date ranges overlap.
 * @param {readonly PurchaseOrder[]} pos  The pair's POs.
 * @returns {{ readonly poNumber: string; readonly otherPoNumber: string }[]}
 */
export function overlappingPos(pos) {
  const open = pos.filter((p) => !PO_NOT_OPEN.has(p.status));
  /** @type {{ poNumber: string; otherPoNumber: string }[]} */
  const out = [];
  for (let i = 0; i < open.length; i += 1)
    for (let j = i + 1; j < open.length; j += 1) {
      const a = open[i];
      const b = open[j];
      if (dayOf(a.orderDate) <= poEnd(b) && dayOf(b.orderDate) <= poEnd(a))
        out.push({ poNumber: a.poNumber, otherPoNumber: b.poNumber });
    }
  return out;
}

/**
 * PEX-11 — the trace of one supplier × material.
 * @param {{
 *   supplierId: string;
 *   materialCode: string;
 *   daRows: readonly DaHistoryRow[];
 *   purchaseOrders: readonly PurchaseOrder[];
 *   callOffs: readonly CallOff[];
 *   asns: readonly ASN[];
 *   capacityDecisions: readonly CapacityDecision[];
 *   commitmentLines: readonly ForecastCommitmentLine[];
 * }} input  `daRows`, `callOffs` and `asns` may hold other pairs: they are narrowed here.
 * @returns {PlanExecutionTrace}
 */
export function buildPlanExecutionTrace(input) {
  const { supplierId, materialCode } = input;
  const mine = (/** @type {{ supplierId: string; materialCode?: string }} */ r) =>
    r.supplierId === supplierId &&
    (r.materialCode === undefined || r.materialCode === materialCode);

  // ── DA per week: the publication in force for each planning week (DRC-B21), the latest first.
  const daRows = input.daRows.filter((r) => mine(r) && r.inForce);
  /** @type {Map<string, { da: number; publicationId: string }>} */
  const daByWeek = new Map();
  for (const row of [...daRows].sort((a, b) => a.planningWeek.localeCompare(b.planningWeek)))
    for (const w of row.weeks)
      daByWeek.set(w.week, { da: w.daInForce, publicationId: row.publicationId });

  // ── POs, call-offs, ASNs of the pair.
  const pairPos = input.purchaseOrders
    .filter((p) => p.supplierId === supplierId && lineOf(p, materialCode))
    .sort((a, b) => a.orderDate.localeCompare(b.orderDate));
  const poIds = new Set(pairPos.map((p) => p.id));
  const pairCallOffs = input.callOffs
    .filter((c) => mine(c))
    .sort(
      (a, b) =>
        a.needDate.localeCompare(b.needDate) || a.callOffNumber.localeCompare(b.callOffNumber)
    );
  const pairAsns = input.asns.filter((a) => a.supplierId === supplierId);
  const asnsOf = (/** @type {CallOff} */ c) => pairAsns.filter((a) => a.callOffId === c.id);

  /** @type {TraceFlag[]} */
  const flags = [];

  /** @type {Map<string, number>} PO id → live quantity called so far (in need-date order). */
  const calledBefore = new Map();
  /** @type {Map<string, TraceFlag[]>} */
  const flagsOf = new Map();
  const addFlag = (/** @type {string} */ callOffId, /** @type {TraceFlag} */ f) => {
    flagsOf.set(callOffId, [...(flagsOf.get(callOffId) ?? []), f]);
    flags.push(f);
  };
  for (const c of pairCallOffs) {
    if (NOT_LIVE.has(c.status)) continue;
    const po = pairPos.find((p) => p.id === c.poId);
    if (!po) {
      addFlag(c.id, {
        kind: 'noPo',
        callOffNumber: c.callOffNumber,
        poNumber: c.poNumber || undefined
      });
      continue;
    }
    const lineQty = lineOf(po, materialCode)?.quantity ?? 0;
    const before = calledBefore.get(po.id) ?? 0;
    // A value-limit line (quantity 0) has no quantity to use up.
    if ((lineQty > 0 && before >= lineQty) || PO_USED_UP.has(po.status))
      addFlag(c.id, { kind: 'poUsedUp', callOffNumber: c.callOffNumber, poNumber: po.poNumber });
    calledBefore.set(po.id, before + c.quantity);
  }
  for (const o of overlappingPos(pairPos)) flags.push({ kind: 'overlapping', ...o });

  const traceOf = (/** @type {CallOff} */ c) => ({
    callOff: c,
    asns: asnsOf(c),
    flags: flagsOf.get(c.id) ?? []
  });
  /** @type {TracePo[]} */
  const pos = pairPos.map((po) => ({
    po,
    lineQty: lineOf(po, materialCode)?.quantity ?? 0,
    calledOff: calledBefore.get(po.id) ?? 0,
    callOffs: pairCallOffs.filter((c) => c.poId === po.id).map(traceOf),
    poLevelAsns: pairAsns.filter((a) => !a.callOffId && a.poReference === po.poNumber),
    flags: flags.filter(
      (f) =>
        f.kind === 'overlapping' && (f.poNumber === po.poNumber || f.otherPoNumber === po.poNumber)
    )
  }));
  const noPoCallOffs = pairCallOffs.filter((c) => !poIds.has(c.poId)).map(traceOf);

  // ── Events on the week they hit (BR-03).
  /** @type {TraceEvent[]} */
  const events = [];
  for (const c of pairCallOffs)
    if (c.status === 'Rejected')
      events.push({
        kind: 'callOffRejected',
        week: mondayOf(dayOf(c.needDate)),
        ref: c.callOffNumber,
        detail: c.rejectionReason ?? null
      });
  for (const p of pairPos)
    if (p.status === 'Rejected')
      events.push({
        kind: 'poRejected',
        week: mondayOf(dayOf(p.orderDate)),
        ref: p.poNumber,
        detail: null
      });
  // Capacity is confirmed per planning group; the pair's group is the one its commitment lines name.
  const lines = input.commitmentLines.filter(mine);
  const groups = new Set(lines.map((l) => `pg-${l.materialGroup}`));
  for (const d of input.capacityDecisions)
    if (d.supplierId === supplierId && groups.has(d.planningGroupId))
      events.push({
        kind: 'capacityDecision',
        week: d.week,
        ref: d.id,
        detail: d.decision
      });
  for (const l of lines)
    for (const m of l.moves)
      events.push({
        kind: 'demandMoved',
        week: mondayOf(dayOf(l.periodStart)),
        ref: m.toSupplierName,
        detail: String(m.qty)
      });

  const weekKeys = [...new Set([...daByWeek.keys(), ...events.map((e) => e.week)])].sort();
  /** @type {TraceWeek[]} */
  const weeks = weekKeys.map((week) => ({
    week,
    da: daByWeek.get(week)?.da ?? null,
    publicationId: daByWeek.get(week)?.publicationId ?? null,
    events: events.filter((e) => e.week === week)
  }));

  return { weeks, pos, noPoCallOffs, flags };
}
