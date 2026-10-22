// ────────────────────────────────────────────────────────────────────────────
// Material E1 · SUPPLIER STOCK SIMULATION (MR-7 BR-01 to BR-09; plan AD-1).
//
// For a supplier s, a material m and a check date d, from the latest stock
// record (t0 = its `declaredAt`) plus what has happened since:
//
//   Supplier available stock(d) = SOH(t0)
//     − ASNs shipped in (t0, d]            (Submitted, In Transit, Delivered, Discrepancy, Awaiting exception)
//     − call-offs dispatched in (t0, d] with no ASN yet   (INV-D7)
//     + to-distributor legs with ETA in (t0, d]   (Booked, Shipped or Arrived; distributors only, BR-09)
//     + in production completing in (t0, d], capped by allocated capacity (BR-04)
//   Already called off, not shipped = confirmed call-offs not yet covered by an ASN
//     or a dispatch notice (BR-07; INV-D7 — a call-off counts as shipped from
//     dispatch, and an ASN that arrives later confirms the same quantity)
//   Free to call off = available − already called off, not shipped (BR-07, MAT-D10)
//   PTI inbound(d) = in transit to PTI with ETA on or after d (`inTransitItems`)
//
// Available and PTI inbound are separate fields and are never added (BR-02).
// A dispatched call-off with no ASN yet is listed once, as PTI inbound marked
// `dispatchOnly` (INV-D7); it is never also "called off, not shipped".
// Nothing here is stored (AD-1): the only stored input the simulation owns is
// the planner's `SimulationOverride`, which applies until the supplier's next
// stock record and never touches the record itself (BR-08).
//
// Dates are compared as calendar days (`YYYY-MM-DD`). "After t0" means after
// the DAY of t0: a movement on the day of the stock record is taken to be in it.
//
// Pure: every input is an argument, `now` is injected.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ASN, CapacitySubmission, IncomingItem, SimulationOverride, SimulationOverrideField } from '../data/types' */
/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { IncomingShipment, InventoryDeclaration, SupplierMaterialRelationship } from '../sdc/types' */
import { declarationRecency } from '../sdc/inventory';
import { addDays, dayOf, inTransitItems, isIsoDay, mondayOf } from './inventoryRules';
/** @import { CallOffView } from './callOffRules' */
import { approvedDeliveries, CALL_OFF_CONFIRMED_STATES } from './callOffRules';
import { latestSubmission } from './capacityRules';

/** The weekly series runs 13 weeks from the week of the check date (MR-7 step 4). */
export const SIMULATION_WEEKS = 13;

/** ASN states that mean the goods have left the supplier (MR-7 BR-01; D2's Awaiting exception;
 * @type {readonly ASN['status'][]}
 *  Discrepancy shipped too — orchestrator ruling 2026-09-29, as D3 counts it). */
export const SIMULATION_SHIPPED_ASN_STATES = [
  'Submitted',
  'In Transit',
  'Delivered',
  'Discrepancy',
  'Awaiting exception'
];

/** To-distributor lifecycles counted (MR-7 BR-01): on the way, or arrived at the distributor
 *  after t0 (orchestrator ruling 2026-09-29 — the stock is there but not yet in a record).
 * @type {readonly IncomingShipment['lifecycle'][]}
 *  Cancelled stays out (edge case 4). */
const OPEN_LEG_STATES = ['Booked', 'Shipped', 'Arrived'];

// ── Shapes ───────────────────────────────────────────────────────────────────

/**
 * `checkDate`:  `YYYY-MM-DD`.
 * `overrides`:  Planner inputs; those for other suppliers or materials are ignored.
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly checkDate: string;
 *   readonly overrides: readonly SimulationOverride[];
 * }} SimulationQuery
 */

/** Everything the simulation reads, handed in by the caller (the read model). */
/**
 * `asnSubmittedOn`:  Edge case 1 — the day an ASN was submitted, for an ASN with no ship date.
 * `planningGroupOf`:  A material's planning group (`materialEntry(code).planningGroupId`), null when unknown.
 *
 * @typedef {{
 *   readonly nowIso: string;
 *   readonly declarations: readonly InventoryDeclaration[];
 *   readonly asns: readonly ASN[];
 *   readonly asnSubmittedOn?: (asnNumber: string) => string | null;
 *   readonly shipments: readonly IncomingShipment[];
 *   readonly callOffViews: readonly Pick<CallOffView, 'callOff' | 'delivery'>[];
 *   readonly capacitySubmissions: readonly CapacitySubmission[];
 *   readonly planningGroupOf: (materialCode: string) => string | null;
 *   readonly relationships: readonly SupplierMaterialRelationship[];
 * }} SimulationWorld
 */

/** Who entered a planner input, and when (MR-7 AC-03). */
/**
 * @typedef {{
 *   readonly overrideId: string;
 *   readonly enteredBy: ActorAttribution;
 *   readonly enteredAt: string;
 * }} PlannerInputRef
 */

/**
 * @typedef {| 'soh'
 *   | 'asnShipped'
 *   | 'dispatchShipped'
 *   | 'toDistributor'
 *   | 'inProduction'
 *   | 'calledOffNotShipped'
 *   | 'ptiInbound'} SimulationComponentKind
 */

/** Which of the separate figures a component belongs to (never summed across, BR-02). */
/** @typedef {'available' | 'calledOffNotShipped' | 'ptiInbound'} SimulationFigure */

/** How a to-distributor ETA was found (MR-7 BR-05, AC-05). */
/** @typedef {'eta' | 'etdPlusLeadTime' | 'plannerInput'} EtaBasis */

/**
 * `qty`:  The signed quantity this component adds to its figure.
 * `date`:  `YYYY-MM-DD`; null for SOH before any date and for undated items.
 * `reference`:  ASN number, shipment id, call-off number or declaration id.
 * `uncappedQty`:  In production: the quantity before the capacity cap.
 * `plannerInput`:  Present when the figure is the planner's, not the supplier's (BR-08).
 * `dispatchOnly`:  INV-D7 — a call-off dispatched with no ASN yet (shipped or in transit on the dispatch notice alone).
 *
 * @typedef {{
 *   readonly kind: SimulationComponentKind;
 *   readonly figure: SimulationFigure;
 *   readonly qty: number;
 *   readonly date: string | null;
 *   readonly reference: string | null;
 *   readonly uncappedQty?: number;
 *   readonly etaBasis?: EtaBasis;
 *   readonly plannerInput?: PlannerInputRef;
 *   readonly dispatchOnly?: true;
 * }} SimulationComponent
 */

/**
 *  BR-06 — no stock record: "Cannot simulate: no stock update".
 *  Edge case 1 — an ASN with no ship date; its submitted date was used (or none was known).
 *  Edge case 2 — a completion date already past but after t0: counted as finished.
 *  Edge case 3 — a completion date on or before t0: ignored.
 *  An in-production quantity with no completion date: not counted (step 5, "Missing").
 *  Edge case 4 — a cancelled to-distributor leg: not counted.
 *  BR-05 — no ETA and no ETD + principal lead time: "Missing", not counted.
 *  BR-04 — the group's completions in a week were above allocated capacity.
 *  Edge case 5 — no capacity confirmed for the week: no cap.
 *
 * @typedef {| 'noStockUpdate'
 *   | 'asnShipDateMissing'
 *   | 'productionDatePassed'
 *   | 'productionBeforeLastUpdate'
 *   | 'productionDateMissing'
 *   | 'toDistributorCancelled'
 *   | 'etaMissing'
 *   | 'cappedByCapacity'
 *   | 'noCapacityConfirmed'} SimulationFlagCode
 */

/**
 * `week`:  The Monday of the week a capacity flag is about.
 * `date`:  The date a flag is about (the fallback ship date, the completion date).
 *
 * @typedef {{
 *   readonly code: SimulationFlagCode;
 *   readonly reference?: string;
 *   readonly week?: string;
 *   readonly date?: string;
 * }} SimulationFlag
 */

/**
 * `weekStart`:  Monday.
 * `weekEnd`:  Sunday: the figures are as at the end of this day.
 * `events`:  Production finishing, to-distributor arrivals and ASNs shipped inside the week.
 *
 * @typedef {{
 *   readonly weekStart: string;
 *   readonly weekEnd: string;
 *   readonly available: number | null;
 *   readonly freeToCallOff: number | null;
 *   readonly ptiInbound: number;
 *   readonly events: readonly SimulationComponent[];
 * }} SimulationWeek
 */

/**
 * `t0`:  The `declaredAt` of the latest stock record (or of the planner's SOH when there is none).
 * `available`:  Supplier available stock; null when there is no stock record and no planner SOH (BR-06).
 * `freeToCallOff`:  available − calledOffNotShipped; null when available is null.
 * `ptiInbound`:  Already left the supplier: never added to `available` (BR-02).
 * `cappedByCapacity`:  An in-production quantity counted at the check date was scaled down (BR-04).
 * `basis`:  "Includes planner input" when any planner input was used (MR-7 step 3).
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly checkDate: string;
 *   readonly t0: string | null;
 *   readonly available: number | null;
 *   readonly calledOffNotShipped: number;
 *   readonly freeToCallOff: number | null;
 *   readonly ptiInbound: number;
 *   readonly components: readonly SimulationComponent[];
 *   readonly cappedByCapacity: boolean;
 *   readonly basis: 'supplier' | 'plannerInput';
 *   readonly flags: readonly SimulationFlag[];
 *   readonly weekly: readonly SimulationWeek[];
 * }} StockSimulation
 */

/** @typedef {'INVALID_CHECK_DATE' | 'CHECK_DATE_BEFORE_LAST_UPDATE'} SimulationRefusalCode */

/** Edge case 6 — a simulation looks forward only. */
/**
 * @typedef {{
 *   readonly refusal: SimulationRefusalCode;
 *   readonly t0: string | null;
 * }} SimulationRefusal
 */

/**
 * @param {StockSimulation | SimulationRefusal} r
 * @returns {r is SimulationRefusal}
 */
export const isSimulationRefusal = (r) => 'refusal' in r;

// ── The per-material basis: latest record plus the planner inputs in force ───

/**
 * @typedef {{
 *   readonly qty: number;
 *   readonly date: string | null;
 *   readonly reference: string | null;
 *   readonly plannerInput?: PlannerInputRef;
 * }} Production
 */

/**
 * @typedef {{
 *   readonly t0: string | null;
 *   readonly t0Day: string | null;
 *   readonly soh: number | null;
 *   readonly sohReference: string | null;
 *   readonly sohInput?: PlannerInputRef;
 *   readonly production: Production | null;
 *   readonly toDistributorInput: { qty: number; eta: string | null; input: PlannerInputRef } | null;
 * }} MaterialBasis
 */

/**
 * @param {SimulationOverride} o
 * @returns {PlannerInputRef}
 */
const inputRef = (o) => ({
  overrideId: o.id,
  enteredBy: o.enteredBy,
  enteredAt: o.enteredAt
});

/**
 * The latest stock record for a supplier × material, by store recency (SDC-4a ruling c).
 * @param {readonly InventoryDeclaration[]} declarations
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {InventoryDeclaration | null}
 */
export function latestDeclaration(declarations, supplierId, materialCode) {
  /** @type {InventoryDeclaration | null} */
  let latest = null;
  for (const d of declarations) {
    if (d.supplierId !== supplierId || d.materialCode !== materialCode) continue;
    if (!latest || declarationRecency(d) > declarationRecency(latest)) latest = d;
  }
  return latest;
}

/**
 * BR-08 / AC-03 — the planner inputs in force for a supplier × material: those
 * entered at or after the latest stock record (all of them when there is none),
 * the latest per field. A newer stock record ends them.
 * @param {readonly SimulationOverride[]} overrides
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {Pick<InventoryDeclaration, 'declaredAt'> | null} latest
 * @returns {Partial<Record<SimulationOverrideField, SimulationOverride>>}
 */
export function overridesInForce(overrides, supplierId, materialCode, latest) {
  /** @type {Partial<Record<SimulationOverrideField, SimulationOverride>>} */
  const out = {};
  for (const o of overrides) {
    if (o.supplierId !== supplierId || o.materialCode !== materialCode) continue;
    if (latest && o.enteredAt < latest.declaredAt) continue;
    const held = out[o.field];
    if (!held || o.enteredAt > held.enteredAt || (o.enteredAt === held.enteredAt && o.id > held.id))
      out[o.field] = o;
  }
  return out;
}

/**
 * @param {SimulationWorld} world
 * @param {readonly SimulationOverride[]} overrides
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {MaterialBasis}
 */
function basisFor(world, overrides, supplierId, materialCode) {
  const record = latestDeclaration(world.declarations, supplierId, materialCode);
  const inForce = overridesInForce(overrides, supplierId, materialCode, record);
  const sohInput = inForce.soh;
  // BR-06 — with no record, a planner SOH starts the simulation on the day it was entered.
  const t0 = record?.declaredAt ?? sohInput?.enteredAt ?? null;
  const prodInput = inForce.inProduction;
  /** @type {Production | null} */
  const production = prodInput
    ? {
        qty: prodInput.value,
        date: prodInput.date ?? null,
        reference: null,
        plannerInput: inputRef(prodInput)
      }
    : record && (record.inProductionQty ?? 0) > 0
      ? {
          qty: record.inProductionQty ?? 0,
          date: record.productionCompletionDate ?? null,
          reference: record.id
        }
      : null;
  const legInput = inForce.toDistributor;
  return {
    t0,
    t0Day: t0 ? dayOf(t0) : null,
    soh: sohInput ? sohInput.value : record ? record.totalQty : null,
    sohReference: sohInput ? null : (record?.id ?? null),
    ...(sohInput ? { sohInput: inputRef(sohInput) } : {}),
    production,
    toDistributorInput: legInput
      ? { qty: legInput.value, eta: legInput.date ?? null, input: inputRef(legInput) }
      : null
  };
}

// ── BR-04 · the capacity cap ─────────────────────────────────────────────────

/**
 * The share of a production quantity that counts after the cap: per supplier
 * × planning group × week, the completions across the group's materials are
 * capped at the ALLOCATED capacity (MAT-D11), each scaled pro rata. No
 * capacity confirmed for the week (or no group): no cap, flagged.
 * @param {SimulationWorld} world
 * @param {readonly SimulationOverride[]} overrides
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string} completion
 * @param {SimulationFlag[]} flags
 * @returns {number}
 */
function capFactor(world, overrides, supplierId, materialCode, completion, flags) {
  const week = mondayOf(completion);
  const group = world.planningGroupOf(materialCode);
  const entry = group
    ? (latestSubmission(world.capacitySubmissions, supplierId, group)?.weeks.find(
        (w) => w.week === week
      ) ?? null)
    : null;
  if (!group || !entry) {
    flags.push({ code: 'noCapacityConfirmed', week });
    return 1;
  }
  // The group's materials this supplier has production for, finishing in the same week.
  const codes = /** @type {Set<string>} */ (new Set([materialCode]));
  for (const d of world.declarations) if (d.supplierId === supplierId) codes.add(d.materialCode);
  for (const o of overrides) if (o.supplierId === supplierId) codes.add(o.materialCode);
  let total = 0;
  for (const code of codes) {
    if (world.planningGroupOf(code) !== group) continue;
    const b = basisFor(world, overrides, supplierId, code);
    const p = b.production;
    if (!p || !p.date || !b.t0Day || p.date <= b.t0Day || mondayOf(p.date) !== week) continue;
    total += p.qty;
  }
  if (total <= entry.allocated || total <= 0) return 1;
  flags.push({ code: 'cappedByCapacity', week });
  return entry.allocated / total;
}

// ── The dated movements after t0 ─────────────────────────────────────────────

/**
 * The day an ASN left: its ship date, else its submitted date (edge case 1).
 * @param {ASN} a
 * @param {SimulationWorld} world
 * @param {SimulationFlag[]} flags
 * @returns {string | null}
 */
function asnShipDay(a, world, flags) {
  if (a.shipDate) return dayOf(a.shipDate);
  const submitted = world.asnSubmittedOn?.(a.asnNumber) ?? null;
  flags.push({
    code: 'asnShipDateMissing',
    reference: a.asnNumber,
    ...(submitted ? { date: dayOf(submitted) } : {})
  });
  return submitted ? dayOf(submitted) : null;
}

/**
 * @param {SimulationWorld} world
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {boolean}
 */
const isDistributor = (world, supplierId, materialCode) =>
  world.relationships.some(
    (r) =>
      r.supplierId === supplierId &&
      r.materialCode === materialCode &&
      r.supplierType === 'distributor'
  );

/**
 * BR-05 — the leg's ETA, else ETD + the principal lead time (the shortest, when several), else none.
 * @param {IncomingShipment} leg
 * @param {SimulationWorld} world
 * @returns {{ date: string; basis: EtaBasis } | null}
 */
function legEta(leg, world) {
  if (leg.eta) return { date: dayOf(leg.eta), basis: 'eta' };
  const rel = world.relationships.find(
    (r) => r.supplierId === leg.supplierId && r.materialCode === leg.materialCode
  );
  const leadTimes = (rel?.principals ?? []).map((p) => p.principalLeadTimeDays);
  if (leg.etd && leadTimes.length > 0)
    return { date: addDays(dayOf(leg.etd), Math.min(...leadTimes)), basis: 'etdPlusLeadTime' };
  return null;
}

/**
 * @param {SimulationWorld} world
 * @param {readonly SimulationOverride[]} overrides
 * @param {Pick<SimulationQuery, 'supplierId' | 'materialCode'>} q
 * @param {MaterialBasis} basis
 * @param {SimulationFlag[]} flags
 * @param {readonly DispatchOnly[]} dispatched
 * @returns {SimulationComponent[]}
 */
function movementsAfterT0(world, overrides, q, basis, flags, dispatched) {
  const { supplierId, materialCode } = q;
  const t0Day = basis.t0Day;
  if (!t0Day) return [];
  /** @type {SimulationComponent[]} */
  const out = [];

  // − ASNs shipped after t0 (BR-01, BR-03).
  for (const a of world.asns) {
    if (a.supplierId !== supplierId || !SIMULATION_SHIPPED_ASN_STATES.includes(a.status)) continue;
    const qty = a.lineItems
      .filter((l) => l.materialCode === materialCode)
      .reduce((s, l) => s + l.shippedQty, 0);
    if (qty <= 0) continue;
    const day = asnShipDay(a, world, flags);
    if (!day || day <= t0Day) continue;
    out.push({
      kind: 'asnShipped',
      figure: 'available',
      qty: -qty,
      date: day,
      reference: a.asnNumber
    });
  }

  // − call-offs dispatched after t0 with no ASN yet (INV-D7, the ASN rule above
  //   applied to the dispatch notice: on or before t0 it is in the record).
  for (const d of dispatched) {
    if (d.date <= t0Day) continue;
    out.push({
      kind: 'dispatchShipped',
      figure: 'available',
      qty: -d.qty,
      date: d.date,
      reference: d.reference,
      dispatchOnly: true
    });
  }

  // + to distributor (BR-01, BR-05, BR-09). A manufacturer has no such term.
  if (isDistributor(world, supplierId, materialCode)) {
    for (const leg of world.shipments) {
      if (leg.supplierId !== supplierId || leg.materialCode !== materialCode) continue;
      if (leg.direction !== 'principal-to-distributor') continue;
      if (leg.lifecycle === 'Cancelled') {
        flags.push({ code: 'toDistributorCancelled', reference: leg.id });
        continue;
      }
      if (!OPEN_LEG_STATES.includes(leg.lifecycle)) continue;
      const eta = legEta(leg, world);
      if (!eta) {
        flags.push({ code: 'etaMissing', reference: leg.id });
        continue;
      }
      if (eta.date <= t0Day) continue;
      out.push({
        kind: 'toDistributor',
        figure: 'available',
        qty: leg.qty,
        date: eta.date,
        reference: leg.id,
        etaBasis: eta.basis
      });
    }
    const leg = basis.toDistributorInput;
    if (leg && leg.eta && leg.eta > t0Day) {
      out.push({
        kind: 'toDistributor',
        figure: 'available',
        qty: leg.qty,
        date: leg.eta,
        reference: null,
        etaBasis: 'plannerInput',
        plannerInput: leg.input
      });
    }
  }

  // + in production, capped (BR-01, BR-04; edge cases 2 and 3).
  const p = basis.production;
  if (p) {
    if (!p.date) {
      flags.push({
        code: 'productionDateMissing',
        ...(p.reference ? { reference: p.reference } : {})
      });
    } else if (p.date <= t0Day) {
      flags.push({
        code: 'productionBeforeLastUpdate',
        date: p.date,
        ...(p.reference ? { reference: p.reference } : {})
      });
    } else {
      if (p.date < dayOf(world.nowIso)) flags.push({ code: 'productionDatePassed', date: p.date });
      const factor = capFactor(world, overrides, supplierId, materialCode, p.date, flags);
      out.push({
        kind: 'inProduction',
        figure: 'available',
        qty: p.qty * factor,
        date: p.date,
        reference: p.reference,
        ...(factor < 1 ? { uncappedQty: p.qty } : {}),
        ...(p.plannerInput ? { plannerInput: p.plannerInput } : {})
      });
    }
  }
  return out.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}

// ── BR-07 · already called off, not shipped (INV-D7: shipped from dispatch) ─

/**
 * One dispatch notice not (yet) confirmed by an ASN, or the part of it no ASN covers.
 * `date`:  The day it left the supplier (`YYYY-MM-DD`).
 * `arrival`:  The expected arrival at PTI (`YYYY-MM-DD`).
 * `inTransit`:  The call-off's delivery reads dispatched or at risk: not yet received.
 *
 * @typedef {{
 *   readonly qty: number;
 *   readonly date: string;
 *   readonly arrival: string;
 *   readonly reference: string;
 *   readonly inTransit: boolean;
 * }} DispatchOnly
 */

/**
 * @param {readonly { qty: number }[]} xs
 * @returns {number}
 */
const sumQty = (xs) => xs.reduce((s, x) => s + x.qty, 0);

/**
 * @param {ASN} a
 * @param {string} materialCode
 * @returns {number}
 */
const asnQtyOf = (a, materialCode) =>
  a.lineItems.filter((l) => l.materialCode === materialCode).reduce((s, l) => s + l.shippedQty, 0);

/**
 * INV-D7 — what a confirmed call-off has shipped: its shipped ASNs (linked by
 * `callOffId` or named by a dispatch notice), plus every dispatch notice no ASN
 * confirms yet. An ASN confirms a dispatch rather than adding to it: a notice
 * that names a shipped ASN is that ASN, and an ASN no notice names first
 * confirms the earliest unnamed notices.
 * @param {Pick<CallOffView, 'callOff' | 'delivery'>} view
 * @param {readonly ASN[]} asns
 * @param {string} materialCode
 * @returns {{ asnQty: number; dispatchOnly: DispatchOnly[] }}
 */
export function callOffShipped(view, asns, materialCode) {
  const c = view.callOff;
  const dispatches = c.dispatches ?? [];
  const named = new Set(dispatches.map((d) => d.asnNumber).filter(Boolean));
  const linked = asns.filter(
    (a) =>
      (a.callOffId === c.id || named.has(a.asnNumber)) &&
      SIMULATION_SHIPPED_ASN_STATES.includes(a.status)
  );
  const linkedNumbers = new Set(linked.map((a) => a.asnNumber));
  let pool = linked
    .filter((a) => !named.has(a.asnNumber))
    .reduce((s, a) => s + asnQtyOf(a, materialCode), 0);
  const inTransit = view.delivery === 'dispatched' || view.delivery === 'atRisk';
  /** @type {DispatchOnly[]} */
  const dispatchOnly = [];
  for (const d of [...dispatches].sort((a, b) => a.shippedDate.localeCompare(b.shippedDate))) {
    if (d.asnNumber && linkedNumbers.has(d.asnNumber)) continue;
    const covered = Math.min(pool, d.quantity);
    pool -= covered;
    const rest = d.quantity - covered;
    if (rest > 0)
      dispatchOnly.push({
        qty: rest,
        date: dayOf(d.shippedDate),
        arrival: dayOf(d.expectedArrival),
        reference: c.callOffNumber,
        inTransit
      });
  }
  return { asnQty: linked.reduce((s, a) => s + asnQtyOf(a, materialCode), 0), dispatchOnly };
}

/**
 * @param {SimulationWorld} world
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {{ items: SimulationComponent[]; dispatched: DispatchOnly[] }}
 */
function calledOffNotShippedItems(world, supplierId, materialCode) {
  /** @type {SimulationComponent[]} */
  const items = [];
  /** @type {DispatchOnly[]} */
  const dispatched = [];
  for (const view of world.callOffViews) {
    const c = view.callOff;
    if (c.supplierId !== supplierId || c.materialCode !== materialCode) continue;
    if (!CALL_OFF_CONFIRMED_STATES.includes(c.status)) continue;
    const confirmed = approvedDeliveries(c).reduce((s, d) => s + d.quantity, 0);
    const { asnQty, dispatchOnly } = callOffShipped(view, world.asns, materialCode);
    dispatched.push(...dispatchOnly);
    const open = Math.max(0, confirmed - asnQty - sumQty(dispatchOnly));
    if (open > 0)
      items.push({
        kind: 'calledOffNotShipped',
        figure: 'calledOffNotShipped',
        qty: open,
        date: null,
        reference: c.callOffNumber
      });
  }
  return { items, dispatched };
}

// ── PTI inbound ──────────────────────────────────────────────────────────────

/**
 * In transit to PTI, not yet arrived on `day`. An item with no ETA is still on its way.
 * @param {readonly IncomingItem[]} items
 * @param {string} day
 * @returns {IncomingItem[]}
 */
const ptiInboundOn = (items, day) => items.filter((i) => i.date === null || i.date >= day);

/**
 * @param {readonly SimulationFlag[]} flags
 * @returns {SimulationFlag[]}
 */
function dedupeFlags(flags) {
  const seen = /** @type {Set<string>} */ (new Set());
  return flags.filter((f) => {
    const key = `${f.code}|${f.reference ?? ''}|${f.week ?? ''}|${f.date ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── THE SIMULATION ───────────────────────────────────────────────────────────

/**
 * @param {SimulationQuery} query
 * @param {SimulationWorld} world
 * @returns {StockSimulation | SimulationRefusal}
 */
export function simulateSupplierStock(query, world) {
  const { supplierId, materialCode, checkDate, overrides } = query;
  const basis = basisFor(world, overrides, supplierId, materialCode);
  if (!isIsoDay(checkDate)) return { refusal: 'INVALID_CHECK_DATE', t0: basis.t0 };
  // Edge case 6 — a simulation looks forward only.
  if (basis.t0Day && checkDate < basis.t0Day)
    return { refusal: 'CHECK_DATE_BEFORE_LAST_UPDATE', t0: basis.t0 };

  /** @type {SimulationFlag[]} */
  const flags = [];
  if (!latestDeclaration(world.declarations, supplierId, materialCode))
    flags.push({ code: 'noStockUpdate' });
  const { items: calledOff, dispatched } = calledOffNotShippedItems(
    world,
    supplierId,
    materialCode
  );
  const movements = movementsAfterT0(world, overrides, query, basis, flags, dispatched);
  const calledOffNotShipped = sumQty(calledOff);
  // PTI inbound: the in-transit ASNs, plus each call-off dispatched with no ASN
  // yet and not yet received (INV-D7). A dispatch an ASN confirms is that ASN.
  /** @type {IncomingItem[]} */
  const transit = [
    ...inTransitItems(supplierId, materialCode, world.asns, []),
    ...dispatched
      .filter((d) => d.inTransit)
      .map((d) => ({
        source: /** @type {const} */ ('dispatch'),
        date: d.arrival,
        quantity: d.qty,
        reference: d.reference
      }))
  ];

  /**
   * @param {string} day
   * @returns {number | null}
   */
  const availableOn = (day) =>
    basis.soh === null
      ? null
      : basis.soh + sumQty(movements.filter((m) => m.date !== null && m.date <= day));
  /**
   * @param {string} day
   * @returns {number}
   */
  const ptiOn = (day) => ptiInboundOn(transit, day).reduce((s, i) => s + i.quantity, 0);
  /**
   * @param {number | null} a
   * @returns {number | null}
   */
  const free = (a) => (a === null ? null : a - calledOffNotShipped);

  const counted = movements.filter((m) => m.date !== null && m.date <= checkDate);
  /** @type {SimulationComponent[]} */
  const sohComponent =
    basis.soh === null
      ? []
      : [
          {
            kind: 'soh',
            figure: 'available',
            qty: basis.soh,
            date: basis.t0Day,
            reference: basis.sohReference,
            ...(basis.sohInput ? { plannerInput: basis.sohInput } : {})
          }
        ];
  /** @type {SimulationComponent[]} */
  const ptiComponents = ptiInboundOn(transit, checkDate).map((i) => ({
    kind: /** @type {const} */ ('ptiInbound'),
    figure: /** @type {const} */ ('ptiInbound'),
    qty: i.quantity,
    date: i.date,
    reference: i.reference,
    ...(i.source === 'dispatch' ? { dispatchOnly: /** @type {const} */ (true) } : {})
  }));
  const components = [...sohComponent, ...counted, ...calledOff, ...ptiComponents];
  const available = availableOn(checkDate);

  const first = mondayOf(checkDate);
  /** @type {SimulationWeek[]} */
  const weekly = Array.from({ length: SIMULATION_WEEKS }, (_, i) => {
    const weekStart = addDays(first, i * 7);
    const weekEnd = addDays(weekStart, 6);
    const a = availableOn(weekEnd);
    return {
      weekStart,
      weekEnd,
      available: a,
      freeToCallOff: free(a),
      ptiInbound: ptiOn(weekEnd),
      events: movements.filter((m) => m.date !== null && m.date >= weekStart && m.date <= weekEnd)
    };
  });

  const usedInput = !!basis.sohInput || movements.some((m) => !!m.plannerInput);
  return {
    supplierId,
    materialCode,
    checkDate,
    t0: basis.t0,
    available,
    calledOffNotShipped,
    freeToCallOff: free(available),
    ptiInbound: ptiOn(checkDate),
    components,
    cappedByCapacity: counted.some((m) => m.uncappedQty !== undefined),
    basis: usedInput ? 'plannerInput' : 'supplier',
    flags: dedupeFlags(flags),
    weekly
  };
}

// ── The planner input verb's rule (MAT-R2: the hook and the page call this) ──

/** @type {readonly SimulationOverrideField[]} */
export const SIMULATION_OVERRIDE_FIELDS = ['soh', 'inProduction', 'toDistributor'];

/**
 * @typedef {| 'UNKNOWN_SUPPLIER'
 *   | 'UNKNOWN_MATERIAL'
 *   | 'UNKNOWN_FIELD'
 *   | 'INVALID_QUANTITY'
 *   | 'DATE_REQUIRED'
 *   | 'INVALID_DATE'
 *   | 'DATE_NOT_ALLOWED'} SimulationOverrideRefusal
 */

/**
 * @typedef {{
 *   readonly supplierKnown: (supplierId: string) => boolean;
 *   readonly materialKnown: (materialCode: string) => boolean;
 * }} SimulationOverrideWorld
 */

/**
 * `t_simulation_override_set` — a planner input names a known supplier and
 * material and one of the 3 fields; the value is a quantity of 0 or more; an
 * in-production or to-distributor input carries its date, an SOH input none.
 * @param {Record<string, unknown>} payload
 * @param {SimulationOverrideWorld} world
 * @returns {SimulationOverrideRefusal | null}
 */
export function simulationOverrideRefusal(payload, world) {
  const { supplierId, materialCode, field, value, date } = payload;
  if (typeof supplierId !== 'string' || !world.supplierKnown(supplierId)) return 'UNKNOWN_SUPPLIER';
  if (typeof materialCode !== 'string' || !world.materialKnown(materialCode))
    return 'UNKNOWN_MATERIAL';
  if (!SIMULATION_OVERRIDE_FIELDS.includes(/** @type {SimulationOverrideField} */ (field)))
    return 'UNKNOWN_FIELD';
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 'INVALID_QUANTITY';
  const hasDate = date !== undefined && date !== null && date !== '';
  if (field === 'soh') return hasDate ? 'DATE_NOT_ALLOWED' : null;
  if (!hasDate) return 'DATE_REQUIRED';
  return isIsoDay(date) ? null : 'INVALID_DATE';
}
