// ────────────────────────────────────────────────────────────────────────────
// Material E1 · SUPPLIER STOCK SIMULATION (MR-7 BR-01 to BR-09; plan AD-1).
//
// For a supplier s, a material m and a check date d, from the latest stock
// record (t0 = its `declaredAt`) plus what has happened since:
//
//   Supplier available stock(d) = SOH(t0)
//     − ASNs shipped in (t0, d]            (Submitted, In Transit, Delivered, Awaiting exception)
//     + to-distributor legs with ETA in (t0, d]   (Booked or Shipped; distributors only, BR-09)
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

import type {
  ASN,
  CapacitySubmission,
  IncomingItem,
  SimulationOverride,
  SimulationOverrideField,
} from '../data/types';
import type { ActorAttribution } from '../../lib/enforcement';
import type { IncomingShipment, InventoryDeclaration, SupplierMaterialRelationship } from '../sdc/types';
import { declarationRecency } from '../sdc/inventory';
import { addDays, dayOf, inTransitItems, isIsoDay, mondayOf } from './inventoryRules';
import { approvedDeliveries, CALL_OFF_CONFIRMED_STATES, type CallOffView } from './callOffRules';
import { latestSubmission } from './capacityRules';

/** The weekly series runs 13 weeks from the week of the check date (MR-7 step 4). */
export const SIMULATION_WEEKS = 13;

/** ASN states that mean the goods have left the supplier (MR-7 BR-01; D2's Awaiting exception). */
export const SIMULATION_SHIPPED_ASN_STATES: readonly ASN['status'][] = [
  'Submitted',
  'In Transit',
  'Delivered',
  'Awaiting exception',
];

/** To-distributor lifecycles still on their way to the distributor (MR-7 BR-01). */
const OPEN_LEG_STATES: readonly IncomingShipment['lifecycle'][] = ['Booked', 'Shipped'];

// ── Shapes ───────────────────────────────────────────────────────────────────

export interface SimulationQuery {
  readonly supplierId: string;
  readonly materialCode: string;
  /** `YYYY-MM-DD`. */
  readonly checkDate: string;
  /** Planner inputs; those for other suppliers or materials are ignored. */
  readonly overrides: readonly SimulationOverride[];
}

/** Everything the simulation reads, handed in by the caller (the read model). */
export interface SimulationWorld {
  readonly nowIso: string;
  readonly declarations: readonly InventoryDeclaration[];
  readonly asns: readonly ASN[];
  /** Edge case 1 — the day an ASN was submitted, for an ASN with no ship date. */
  readonly asnSubmittedOn?: (asnNumber: string) => string | null;
  readonly shipments: readonly IncomingShipment[];
  readonly callOffViews: readonly Pick<CallOffView, 'callOff' | 'delivery'>[];
  readonly capacitySubmissions: readonly CapacitySubmission[];
  /** A material's planning group (`materialEntry(code).planningGroupId`), null when unknown. */
  readonly planningGroupOf: (materialCode: string) => string | null;
  readonly relationships: readonly SupplierMaterialRelationship[];
}

/** Who entered a planner input, and when (MR-7 AC-03). */
export interface PlannerInputRef {
  readonly overrideId: string;
  readonly enteredBy: ActorAttribution;
  readonly enteredAt: string;
}

export type SimulationComponentKind =
  | 'soh'
  | 'asnShipped'
  | 'toDistributor'
  | 'inProduction'
  | 'calledOffNotShipped'
  | 'ptiInbound';

/** Which of the separate figures a component belongs to (never summed across, BR-02). */
export type SimulationFigure = 'available' | 'calledOffNotShipped' | 'ptiInbound';

/** How a to-distributor ETA was found (MR-7 BR-05, AC-05). */
export type EtaBasis = 'eta' | 'etdPlusLeadTime' | 'plannerInput';

export interface SimulationComponent {
  readonly kind: SimulationComponentKind;
  readonly figure: SimulationFigure;
  /** The signed quantity this component adds to its figure. */
  readonly qty: number;
  /** `YYYY-MM-DD`; null for SOH before any date and for undated items. */
  readonly date: string | null;
  /** ASN number, shipment id, call-off number or declaration id. */
  readonly reference: string | null;
  /** In production: the quantity before the capacity cap. */
  readonly uncappedQty?: number;
  readonly etaBasis?: EtaBasis;
  /** Present when the figure is the planner's, not the supplier's (BR-08). */
  readonly plannerInput?: PlannerInputRef;
}

export type SimulationFlagCode =
  /** BR-06 — no stock record: "Cannot simulate: no stock update". */
  | 'noStockUpdate'
  /** Edge case 1 — an ASN with no ship date; its submitted date was used (or none was known). */
  | 'asnShipDateMissing'
  /** Edge case 2 — a completion date already past but after t0: counted as finished. */
  | 'productionDatePassed'
  /** Edge case 3 — a completion date on or before t0: ignored. */
  | 'productionBeforeLastUpdate'
  /** An in-production quantity with no completion date: not counted (step 5, "Missing"). */
  | 'productionDateMissing'
  /** Edge case 4 — a cancelled to-distributor leg: not counted. */
  | 'toDistributorCancelled'
  /** BR-05 — no ETA and no ETD + principal lead time: "Missing", not counted. */
  | 'etaMissing'
  /** BR-04 — the group's completions in a week were above allocated capacity. */
  | 'cappedByCapacity'
  /** Edge case 5 — no capacity confirmed for the week: no cap. */
  | 'noCapacityConfirmed';

export interface SimulationFlag {
  readonly code: SimulationFlagCode;
  readonly reference?: string;
  /** The Monday of the week a capacity flag is about. */
  readonly week?: string;
  /** The date a flag is about (the fallback ship date, the completion date). */
  readonly date?: string;
}

export interface SimulationWeek {
  /** Monday. */
  readonly weekStart: string;
  /** Sunday: the figures are as at the end of this day. */
  readonly weekEnd: string;
  readonly available: number | null;
  readonly freeToCallOff: number | null;
  readonly ptiInbound: number;
  /** Production finishing, to-distributor arrivals and ASNs shipped inside the week. */
  readonly events: readonly SimulationComponent[];
}

export interface StockSimulation {
  readonly supplierId: string;
  readonly materialCode: string;
  readonly checkDate: string;
  /** The `declaredAt` of the latest stock record (or of the planner's SOH when there is none). */
  readonly t0: string | null;
  /** Supplier available stock; null when there is no stock record and no planner SOH (BR-06). */
  readonly available: number | null;
  readonly calledOffNotShipped: number;
  /** available − calledOffNotShipped; null when available is null. */
  readonly freeToCallOff: number | null;
  /** Already left the supplier: never added to `available` (BR-02). */
  readonly ptiInbound: number;
  readonly components: readonly SimulationComponent[];
  /** An in-production quantity counted at the check date was scaled down (BR-04). */
  readonly cappedByCapacity: boolean;
  /** "Includes planner input" when any planner input was used (MR-7 step 3). */
  readonly basis: 'supplier' | 'plannerInput';
  readonly flags: readonly SimulationFlag[];
  readonly weekly: readonly SimulationWeek[];
}

export type SimulationRefusalCode = 'INVALID_CHECK_DATE' | 'CHECK_DATE_BEFORE_LAST_UPDATE';

/** Edge case 6 — a simulation looks forward only. */
export interface SimulationRefusal {
  readonly refusal: SimulationRefusalCode;
  readonly t0: string | null;
}

export const isSimulationRefusal = (r: StockSimulation | SimulationRefusal): r is SimulationRefusal =>
  'refusal' in r;

// ── The per-material basis: latest record plus the planner inputs in force ───

interface Production {
  readonly qty: number;
  readonly date: string | null;
  readonly reference: string | null;
  readonly plannerInput?: PlannerInputRef;
}

interface MaterialBasis {
  readonly t0: string | null;
  readonly t0Day: string | null;
  readonly soh: number | null;
  readonly sohReference: string | null;
  readonly sohInput?: PlannerInputRef;
  readonly production: Production | null;
  readonly toDistributorInput: { qty: number; eta: string | null; input: PlannerInputRef } | null;
}

const inputRef = (o: SimulationOverride): PlannerInputRef => ({
  overrideId: o.id,
  enteredBy: o.enteredBy,
  enteredAt: o.enteredAt,
});

/** The latest stock record for a supplier × material, by store recency (SDC-4a ruling c). */
export function latestDeclaration(
  declarations: readonly InventoryDeclaration[],
  supplierId: string,
  materialCode: string,
): InventoryDeclaration | null {
  let latest: InventoryDeclaration | null = null;
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
 */
export function overridesInForce(
  overrides: readonly SimulationOverride[],
  supplierId: string,
  materialCode: string,
  latest: Pick<InventoryDeclaration, 'declaredAt'> | null,
): Partial<Record<SimulationOverrideField, SimulationOverride>> {
  const out: Partial<Record<SimulationOverrideField, SimulationOverride>> = {};
  for (const o of overrides) {
    if (o.supplierId !== supplierId || o.materialCode !== materialCode) continue;
    if (latest && o.enteredAt < latest.declaredAt) continue;
    const held = out[o.field];
    if (!held || o.enteredAt > held.enteredAt || (o.enteredAt === held.enteredAt && o.id > held.id)) out[o.field] = o;
  }
  return out;
}

function basisFor(
  world: SimulationWorld,
  overrides: readonly SimulationOverride[],
  supplierId: string,
  materialCode: string,
): MaterialBasis {
  const record = latestDeclaration(world.declarations, supplierId, materialCode);
  const inForce = overridesInForce(overrides, supplierId, materialCode, record);
  const sohInput = inForce.soh;
  // BR-06 — with no record, a planner SOH starts the simulation on the day it was entered.
  const t0 = record?.declaredAt ?? sohInput?.enteredAt ?? null;
  const prodInput = inForce.inProduction;
  const production: Production | null = prodInput
    ? { qty: prodInput.value, date: prodInput.date ?? null, reference: null, plannerInput: inputRef(prodInput) }
    : record && (record.inProductionQty ?? 0) > 0
      ? { qty: record.inProductionQty ?? 0, date: record.productionCompletionDate ?? null, reference: record.id }
      : null;
  const legInput = inForce.toDistributor;
  return {
    t0,
    t0Day: t0 ? dayOf(t0) : null,
    soh: sohInput ? sohInput.value : record ? record.totalQty : null,
    sohReference: sohInput ? null : record?.id ?? null,
    ...(sohInput ? { sohInput: inputRef(sohInput) } : {}),
    production,
    toDistributorInput: legInput ? { qty: legInput.value, eta: legInput.date ?? null, input: inputRef(legInput) } : null,
  };
}

// ── BR-04 · the capacity cap ─────────────────────────────────────────────────

/**
 * The share of a production quantity that counts after the cap: per supplier
 * × planning group × week, the completions across the group's materials are
 * capped at the ALLOCATED capacity (MAT-D11), each scaled pro rata. No
 * capacity confirmed for the week (or no group): no cap, flagged.
 */
function capFactor(
  world: SimulationWorld,
  overrides: readonly SimulationOverride[],
  supplierId: string,
  materialCode: string,
  completion: string,
  flags: SimulationFlag[],
): number {
  const week = mondayOf(completion);
  const group = world.planningGroupOf(materialCode);
  const entry = group
    ? latestSubmission(world.capacitySubmissions, supplierId, group)?.weeks.find((w) => w.week === week) ?? null
    : null;
  if (!group || !entry) {
    flags.push({ code: 'noCapacityConfirmed', week });
    return 1;
  }
  // The group's materials this supplier has production for, finishing in the same week.
  const codes = new Set<string>([materialCode]);
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

/** The day an ASN left: its ship date, else its submitted date (edge case 1). */
function asnShipDay(a: ASN, world: SimulationWorld, flags: SimulationFlag[]): string | null {
  if (a.shipDate) return dayOf(a.shipDate);
  const submitted = world.asnSubmittedOn?.(a.asnNumber) ?? null;
  flags.push({ code: 'asnShipDateMissing', reference: a.asnNumber, ...(submitted ? { date: dayOf(submitted) } : {}) });
  return submitted ? dayOf(submitted) : null;
}

const isDistributor = (world: SimulationWorld, supplierId: string, materialCode: string): boolean =>
  world.relationships.some(
    (r) => r.supplierId === supplierId && r.materialCode === materialCode && r.supplierType === 'distributor',
  );

/** BR-05 — the leg's ETA, else ETD + the principal lead time (the shortest, when several), else none. */
function legEta(
  leg: IncomingShipment,
  world: SimulationWorld,
): { date: string; basis: EtaBasis } | null {
  if (leg.eta) return { date: dayOf(leg.eta), basis: 'eta' };
  const rel = world.relationships.find((r) => r.supplierId === leg.supplierId && r.materialCode === leg.materialCode);
  const leadTimes = (rel?.principals ?? []).map((p) => p.principalLeadTimeDays);
  if (leg.etd && leadTimes.length > 0) return { date: addDays(dayOf(leg.etd), Math.min(...leadTimes)), basis: 'etdPlusLeadTime' };
  return null;
}

function movementsAfterT0(
  world: SimulationWorld,
  overrides: readonly SimulationOverride[],
  q: Pick<SimulationQuery, 'supplierId' | 'materialCode'>,
  basis: MaterialBasis,
  flags: SimulationFlag[],
): SimulationComponent[] {
  const { supplierId, materialCode } = q;
  const t0Day = basis.t0Day;
  if (!t0Day) return [];
  const out: SimulationComponent[] = [];

  // − ASNs shipped after t0 (BR-01, BR-03).
  for (const a of world.asns) {
    if (a.supplierId !== supplierId || !SIMULATION_SHIPPED_ASN_STATES.includes(a.status)) continue;
    const qty = a.lineItems.filter((l) => l.materialCode === materialCode).reduce((s, l) => s + l.shippedQty, 0);
    if (qty <= 0) continue;
    const day = asnShipDay(a, world, flags);
    if (!day || day <= t0Day) continue;
    out.push({ kind: 'asnShipped', figure: 'available', qty: -qty, date: day, reference: a.asnNumber });
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
      out.push({ kind: 'toDistributor', figure: 'available', qty: leg.qty, date: eta.date, reference: leg.id, etaBasis: eta.basis });
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
        plannerInput: leg.input,
      });
    }
  }

  // + in production, capped (BR-01, BR-04; edge cases 2 and 3).
  const p = basis.production;
  if (p) {
    if (!p.date) {
      flags.push({ code: 'productionDateMissing', ...(p.reference ? { reference: p.reference } : {}) });
    } else if (p.date <= t0Day) {
      flags.push({ code: 'productionBeforeLastUpdate', date: p.date, ...(p.reference ? { reference: p.reference } : {}) });
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
        ...(p.plannerInput ? { plannerInput: p.plannerInput } : {}),
      });
    }
  }
  return out.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}

// ── BR-07 · already called off, not shipped ─────────────────────────────────

function calledOffNotShippedItems(
  world: SimulationWorld,
  supplierId: string,
  materialCode: string,
): SimulationComponent[] {
  const out: SimulationComponent[] = [];
  for (const { callOff: c } of world.callOffViews) {
    if (c.supplierId !== supplierId || c.materialCode !== materialCode) continue;
    if (!CALL_OFF_CONFIRMED_STATES.includes(c.status)) continue;
    const confirmed = approvedDeliveries(c).reduce((s, d) => s + d.quantity, 0);
    const shipped = world.asns
      .filter((a) => a.callOffId === c.id && SIMULATION_SHIPPED_ASN_STATES.includes(a.status))
      .reduce(
        (s, a) => s + a.lineItems.filter((l) => l.materialCode === materialCode).reduce((t, l) => t + l.shippedQty, 0),
        0,
      );
    const open = Math.max(0, confirmed - shipped);
    if (open > 0) out.push({ kind: 'calledOffNotShipped', figure: 'calledOffNotShipped', qty: open, date: null, reference: c.callOffNumber });
  }
  return out;
}

// ── PTI inbound ──────────────────────────────────────────────────────────────

/** In transit to PTI, not yet arrived on `day`. An item with no ETA is still on its way. */
const ptiInboundOn = (items: readonly IncomingItem[], day: string): IncomingItem[] =>
  items.filter((i) => i.date === null || i.date >= day);

const sumQty = (xs: readonly { qty: number }[]): number => xs.reduce((s, x) => s + x.qty, 0);

function dedupeFlags(flags: readonly SimulationFlag[]): SimulationFlag[] {
  const seen = new Set<string>();
  return flags.filter((f) => {
    const key = `${f.code}|${f.reference ?? ''}|${f.week ?? ''}|${f.date ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── THE SIMULATION ───────────────────────────────────────────────────────────

export function simulateSupplierStock(
  query: SimulationQuery,
  world: SimulationWorld,
): StockSimulation | SimulationRefusal {
  const { supplierId, materialCode, checkDate, overrides } = query;
  const basis = basisFor(world, overrides, supplierId, materialCode);
  if (!isIsoDay(checkDate)) return { refusal: 'INVALID_CHECK_DATE', t0: basis.t0 };
  // Edge case 6 — a simulation looks forward only.
  if (basis.t0Day && checkDate < basis.t0Day) return { refusal: 'CHECK_DATE_BEFORE_LAST_UPDATE', t0: basis.t0 };

  const flags: SimulationFlag[] = [];
  if (!latestDeclaration(world.declarations, supplierId, materialCode)) flags.push({ code: 'noStockUpdate' });
  const movements = movementsAfterT0(world, overrides, query, basis, flags);
  const calledOff = calledOffNotShippedItems(world, supplierId, materialCode);
  const calledOffNotShipped = sumQty(calledOff);
  const transit = inTransitItems(supplierId, materialCode, world.asns, world.callOffViews);

  const availableOn = (day: string): number | null =>
    basis.soh === null ? null : basis.soh + sumQty(movements.filter((m) => m.date !== null && m.date <= day));
  const ptiOn = (day: string): number => ptiInboundOn(transit, day).reduce((s, i) => s + i.quantity, 0);
  const free = (a: number | null): number | null => (a === null ? null : a - calledOffNotShipped);

  const counted = movements.filter((m) => m.date !== null && m.date <= checkDate);
  const sohComponent: SimulationComponent[] =
    basis.soh === null
      ? []
      : [
          {
            kind: 'soh',
            figure: 'available',
            qty: basis.soh,
            date: basis.t0Day,
            reference: basis.sohReference,
            ...(basis.sohInput ? { plannerInput: basis.sohInput } : {}),
          },
        ];
  const ptiComponents: SimulationComponent[] = ptiInboundOn(transit, checkDate).map((i) => ({
    kind: 'ptiInbound',
    figure: 'ptiInbound',
    qty: i.quantity,
    date: i.date,
    reference: i.reference,
  }));
  const components = [...sohComponent, ...counted, ...calledOff, ...ptiComponents];
  const available = availableOn(checkDate);

  const first = mondayOf(checkDate);
  const weekly: SimulationWeek[] = Array.from({ length: SIMULATION_WEEKS }, (_, i) => {
    const weekStart = addDays(first, i * 7);
    const weekEnd = addDays(weekStart, 6);
    const a = availableOn(weekEnd);
    return {
      weekStart,
      weekEnd,
      available: a,
      freeToCallOff: free(a),
      ptiInbound: ptiOn(weekEnd),
      events: movements.filter((m) => m.date !== null && m.date >= weekStart && m.date <= weekEnd),
    };
  });

  const usedInput =
    !!basis.sohInput || movements.some((m) => !!m.plannerInput);
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
    weekly,
  };
}

// ── The planner input verb's rule (MAT-R2: the hook and the page call this) ──

export const SIMULATION_OVERRIDE_FIELDS: readonly SimulationOverrideField[] = ['soh', 'inProduction', 'toDistributor'];

export type SimulationOverrideRefusal =
  | 'UNKNOWN_SUPPLIER'
  | 'UNKNOWN_MATERIAL'
  | 'UNKNOWN_FIELD'
  | 'INVALID_QUANTITY'
  | 'DATE_REQUIRED'
  | 'INVALID_DATE'
  | 'DATE_NOT_ALLOWED';

export interface SimulationOverrideWorld {
  readonly supplierKnown: (supplierId: string) => boolean;
  readonly materialKnown: (materialCode: string) => boolean;
}

/**
 * `t_simulation_override_set` — a planner input names a known supplier and
 * material and one of the 3 fields; the value is a quantity of 0 or more; an
 * in-production or to-distributor input carries its date, an SOH input none.
 */
export function simulationOverrideRefusal(
  payload: Record<string, unknown>,
  world: SimulationOverrideWorld,
): SimulationOverrideRefusal | null {
  const { supplierId, materialCode, field, value, date } = payload;
  if (typeof supplierId !== 'string' || !world.supplierKnown(supplierId)) return 'UNKNOWN_SUPPLIER';
  if (typeof materialCode !== 'string' || !world.materialKnown(materialCode)) return 'UNKNOWN_MATERIAL';
  if (!SIMULATION_OVERRIDE_FIELDS.includes(field as SimulationOverrideField)) return 'UNKNOWN_FIELD';
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 'INVALID_QUANTITY';
  const hasDate = date !== undefined && date !== null && date !== '';
  if (field === 'soh') return hasDate ? 'DATE_NOT_ALLOWED' : null;
  if (!hasDate) return 'DATE_REQUIRED';
  return isIsoDay(date) ? null : 'INVALID_DATE';
}
