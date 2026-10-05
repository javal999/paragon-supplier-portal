// ────────────────────────────────────────────────────────────────────────────
// Material E1 · SUPPLIER STOCK SIMULATION (MR-7 BR-01 to BR-09; plan AD-1).
//
// For a supplier s, a material m and a check date d, from the latest stock
// record (t0 = its `declaredAt`) plus what has happened since:
//
//   Supplier available stock(d) = SOH(t0)
//     − ASNs shipped in (t0, d]            (Submitted, In Transit, Delivered, Discrepancy, Awaiting exception)
//     + to-distributor legs with ETA in (t0, d]   (Booked, Shipped or Arrived; distributors only, BR-09)
//     + in production completing in (t0, d], capped by allocated capacity (BR-04)
//   Already called off, not shipped = confirmed call-offs not yet covered by an ASN (BR-07)
//   Free to call off = available − already called off, not shipped (BR-07, MAT-D10)
//   PTI inbound(d) = in transit to PTI with ETA on or after d (`inTransitItems`)
//
// Available and PTI inbound are separate fields and are never added (BR-02).
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
 * @typedef {object} SimulationQuery
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {string} checkDate -  `YYYY-MM-DD`.
 * @property {readonly SimulationOverride[]} overrides -  Planner inputs; those for other suppliers or materials are ignored.
 */

/** Everything the simulation reads, handed in by the caller (the read model). */
/**
 * @typedef {object} SimulationWorld
 * @property {string} nowIso
 * @property {readonly InventoryDeclaration[]} declarations
 * @property {readonly ASN[]} asns
 * @property {(asnNumber: string) => string | null} [asnSubmittedOn] -  Edge case 1 — the day an ASN was submitted, for an ASN with no ship date.
 * @property {readonly IncomingShipment[]} shipments
 * @property {readonly Pick<CallOffView, 'callOff' | 'delivery'>[]} callOffViews
 * @property {readonly CapacitySubmission[]} capacitySubmissions
 * @property {(materialCode: string) => string | null} planningGroupOf -  A material's planning group (`materialEntry(code).planningGroupId`), null when unknown.
 * @property {readonly SupplierMaterialRelationship[]} relationships
 */

/** Who entered a planner input, and when (MR-7 AC-03). */
/**
 * @typedef {object} PlannerInputRef
 * @property {string} overrideId
 * @property {ActorAttribution} enteredBy
 * @property {string} enteredAt
 */

/**
 * @typedef {| 'soh'
 *   | 'asnShipped'
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
 * @typedef {object} SimulationComponent
 * @property {SimulationComponentKind} kind
 * @property {SimulationFigure} figure
 * @property {number} qty -  The signed quantity this component adds to its figure.
 * @property {string | null} date -  `YYYY-MM-DD`; null for SOH before any date and for undated items.
 * @property {string | null} reference -  ASN number, shipment id, call-off number or declaration id.
 * @property {number} [uncappedQty] -  In production: the quantity before the capacity cap.
 * @property {EtaBasis} [etaBasis]
 * @property {PlannerInputRef} [plannerInput] -  Present when the figure is the planner's, not the supplier's (BR-08).
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
 * @typedef {object} SimulationFlag
 * @property {SimulationFlagCode} code
 * @property {string} [reference]
 * @property {string} [week] -  The Monday of the week a capacity flag is about.
 * @property {string} [date] -  The date a flag is about (the fallback ship date, the completion date).
 */

/**
 * @typedef {object} SimulationWeek
 * @property {string} weekStart -  Monday.
 * @property {string} weekEnd -  Sunday: the figures are as at the end of this day.
 * @property {number | null} available
 * @property {number | null} freeToCallOff
 * @property {number} ptiInbound
 * @property {readonly SimulationComponent[]} events -  Production finishing, to-distributor arrivals and ASNs shipped inside the week.
 */

/**
 * @typedef {object} StockSimulation
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {string} checkDate
 * @property {string | null} t0 -  The `declaredAt` of the latest stock record (or of the planner's SOH when there is none).
 * @property {number | null} available -  Supplier available stock; null when there is no stock record and no planner SOH (BR-06).
 * @property {number} calledOffNotShipped
 * @property {number | null} freeToCallOff -  available − calledOffNotShipped; null when available is null.
 * @property {number} ptiInbound -  Already left the supplier: never added to `available` (BR-02).
 * @property {readonly SimulationComponent[]} components
 * @property {boolean} cappedByCapacity -  An in-production quantity counted at the check date was scaled down (BR-04).
 * @property {'supplier' | 'plannerInput'} basis -  "Includes planner input" when any planner input was used (MR-7 step 3).
 * @property {readonly SimulationFlag[]} flags
 * @property {readonly SimulationWeek[]} weekly
 */

/** @typedef {'INVALID_CHECK_DATE' | 'CHECK_DATE_BEFORE_LAST_UPDATE'} SimulationRefusalCode */

/** Edge case 6 — a simulation looks forward only. */
/**
 * @typedef {object} SimulationRefusal
 * @property {SimulationRefusalCode} refusal
 * @property {string | null} t0
 */

/**
 * @param {StockSimulation | SimulationRefusal} r
 * @returns {r is SimulationRefusal}
 */
export const isSimulationRefusal = (r) => 'refusal' in r;

// ── The per-material basis: latest record plus the planner inputs in force ───

/**
 * @typedef {object} Production
 * @property {number} qty
 * @property {string | null} date
 * @property {string | null} reference
 * @property {PlannerInputRef} [plannerInput]
 */

/**
 * @typedef {object} MaterialBasis
 * @property {string | null} t0
 * @property {string | null} t0Day
 * @property {number | null} soh
 * @property {string | null} sohReference
 * @property {PlannerInputRef} [sohInput]
 * @property {Production | null} production
 * @property {{ qty: number; eta: string | null; input: PlannerInputRef } | null} toDistributorInput
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
 * @returns {SimulationComponent[]}
 */
function movementsAfterT0(world, overrides, q, basis, flags) {
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

// ── BR-07 · already called off, not shipped ─────────────────────────────────

/**
 * @param {SimulationWorld} world
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {SimulationComponent[]}
 */
function calledOffNotShippedItems(world, supplierId, materialCode) {
  /** @type {SimulationComponent[]} */
  const out = [];
  for (const { callOff: c } of world.callOffViews) {
    if (c.supplierId !== supplierId || c.materialCode !== materialCode) continue;
    if (!CALL_OFF_CONFIRMED_STATES.includes(c.status)) continue;
    const confirmed = approvedDeliveries(c).reduce((s, d) => s + d.quantity, 0);
    const shipped = world.asns
      .filter((a) => a.callOffId === c.id && SIMULATION_SHIPPED_ASN_STATES.includes(a.status))
      .reduce(
        (s, a) =>
          s +
          a.lineItems
            .filter((l) => l.materialCode === materialCode)
            .reduce((t, l) => t + l.shippedQty, 0),
        0
      );
    const open = Math.max(0, confirmed - shipped);
    if (open > 0)
      out.push({
        kind: 'calledOffNotShipped',
        figure: 'calledOffNotShipped',
        qty: open,
        date: null,
        reference: c.callOffNumber
      });
  }
  return out;
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
 * @param {readonly { qty: number }[]} xs
 * @returns {number}
 */
const sumQty = (xs) => xs.reduce((s, x) => s + x.qty, 0);

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
  const movements = movementsAfterT0(world, overrides, query, basis, flags);
  const calledOff = calledOffNotShippedItems(world, supplierId, materialCode);
  const calledOffNotShipped = sumQty(calledOff);
  const transit = inTransitItems(supplierId, materialCode, world.asns, world.callOffViews);

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
    kind: 'ptiInbound',
    figure: 'ptiInbound',
    qty: i.quantity,
    date: i.date,
    reference: i.reference
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
 * @typedef {object} SimulationOverrideWorld
 * @property {(supplierId: string) => boolean} supplierKnown
 * @property {(materialCode: string) => boolean} materialKnown
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
