// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY VISIBILITY AND STOCK SUBMISSION RULES — REQ-E08-01, REQ-E08-02.
//
// Pure functions, inputs as arguments, `now` always injected. Every derived
// figure a page shows — days of supply (CR-01), its band (CR-02), coverage
// (CR-03), staleness against the data-update SLA, incoming totals, projected
// stock-out — is computed HERE at read time and never stored, so the planner's
// page, the supplier's page, the alerts and the Home tasks cannot disagree.
//
// The ONE band function: `supplyBand`. It replaces the two conflicting sets the
// old pages carried (the buyer's <14/<30/≤60 labels and the supplier's
// <7/7–13/14–30 stock status). Since CR-24 (BL-46) the band is a FALLBACK: the
// ONE risk-class function is `riskFor` / `positionRisk`, which compares days of
// cover with the supplier lead time and reaches for the band only where no lead
// time is on record.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {import('../data/types').SupplyBand} SupplyBand */
/** @import { ASN, CallOff, IncomingItem, InventoryPosition, RiskBasis, RiskClass, StockAccessGrant, StockSyncAttempt, StockUpdateMode, DemandSource } from '../data/types' */
/** @import { ForecastLine, InventoryDeclaration, MaterialMasterEntry, StockChannel } from '../sdc/types' */
/** @import { CallOffView } from './callOffRules' */
import { normalizeQty } from '@lib/localeNumber';
import {
  coverageThresholds,
  DEMAND_WINDOW,
  groupStaleDaysFor,
  leadTimeRisk,
  staleApiHours,
  staleOverrideDaysFor,
  supplyBands,
  updateCycleSettings,
  updateSlaFor
} from './inventoryConfig';
import { staleAtFor, updateCycleFor } from './updateCycle';
/** @import { WorkingCalendar } from '@lib/workingCalendar' */

// ── Dates (UTC calendar days, `YYYY-MM-DD`) ──────────────────────────────────

const DAY_MS = 86_400_000;

/**
 * @param {string} iso
 * @returns {string}
 */
export const dayOf = (iso) => iso.slice(0, 10);

/**
 * @param {string} day
 * @param {number} n
 * @returns {string}
 */
export const addDays = (day, n) =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + n * DAY_MS).toISOString().slice(0, 10);

/**
 * Whole days from `from` to `to` (both `YYYY-MM-DD`).
 * @param {string} from
 * @param {string} to
 * @returns {number}
 */
export const daysBetween = (from, to) =>
  Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS);

/**
 * Monday of the week that contains `day`.
 * @param {string} day
 * @returns {string}
 */
export function mondayOf(day) {
  const dow = new Date(`${day}T00:00:00.000Z`).getUTCDay(); // 0 = Sunday
  return addDays(day, dow === 0 ? -6 : 1 - dow);
}

/**
 * @param {unknown} v
 * @returns {v is string}
 */
export const isIsoDay = (v) =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(`${v}T00:00:00.000Z`));

// ── Demand (CR-01) ───────────────────────────────────────────────────────────

/**
 * @param {string} bucket
 * @returns {number}
 */
const daysInMonth = (bucket) => {
  const [y, m] = bucket.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** @typedef {Pick<ForecastLine, 'periodBucket' | 'forecastQty'>} DemandLine */

/**
 * Demand on one day: the forecast for that day's month spread evenly over the
 * month when a forecast line exists for it, otherwise the planning estimate
 * (sample data) — so a window that runs past the forecast horizon still has a
 * demand, and a month the forecast covers is never double counted.
 * @param {readonly DemandLine[]} lines
 * @param {number | null} planningEstimate
 * @param {string} day
 * @returns {{ qty: number; fromForecast: boolean }}
 */
export function demandOn(lines, planningEstimate, day) {
  const bucket = day.slice(0, 7);
  const monthLines = lines.filter((l) => l.periodBucket === bucket);
  if (monthLines.length > 0) {
    return {
      qty: monthLines.reduce((s, l) => s + l.forecastQty, 0) / daysInMonth(bucket),
      fromForecast: true
    };
  }
  return { qty: planningEstimate ?? 0, fromForecast: false };
}

/**
 * Total demand between two days, inclusive.
 * @param {readonly DemandLine[]} lines
 * @param {number | null} planningEstimate
 * @param {string} from
 * @param {string} to
 * @returns {{ qty: number; fromForecast: boolean }}
 */
export function demandBetween(lines, planningEstimate, from, to) {
  let qty = 0;
  let fromForecast = false;
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const d = demandOn(lines, planningEstimate, day);
    qty += d.qty;
    fromForecast = fromForecast || d.fromForecast;
  }
  return { qty, fromForecast };
}

/**
 * CR-01 — average daily demand = forecast quantity for the next 30 days ÷ 30
 * (today and the 29 days after), with the planning estimate for days the
 * forecast does not cover. Null when there is no demand at all.
 * @param {readonly DemandLine[]} lines
 * @param {number | null} planningEstimate
 * @param {string} nowIso
 * @returns {{ value: number | null; source: DemandSource }}
 */
export function averageDailyDemand(lines, planningEstimate, nowIso) {
  const today = dayOf(nowIso);
  const d = demandBetween(lines, planningEstimate, today, addDays(today, DEMAND_WINDOW - 1));
  /** @type {DemandSource} */
  const source = d.fromForecast
    ? 'forecast'
    : planningEstimate !== null
      ? 'planningEstimate'
      : 'none';
  return { value: d.qty > 0 ? d.qty / DEMAND_WINDOW : null, source: d.qty > 0 ? source : 'none' };
}

/**
 * Demand in one week (Monday + 6 days).
 * @param {readonly DemandLine[]} lines
 * @param {number | null} planningEstimate
 * @param {string} week
 * @returns {number}
 */
export function weekDemand(lines, planningEstimate, week) {
  return demandBetween(lines, planningEstimate, week, addDays(week, 6)).qty;
}

// ── Days of supply and bands (CR-01, CR-02) ──────────────────────────────────

/** @type {readonly SupplyBand[]} */
export const SUPPLY_BAND_ORDER = ['critical', 'warning', 'healthy', 'excess'];

/**
 * SOH ÷ average daily demand; null without stock figures or without demand.
 * @param {number | null} soh
 * @param {number | null} avgDailyDemand
 * @returns {number | null}
 */
export function daysOfSupply(soh, avgDailyDemand) {
  if (soh === null || avgDailyDemand === null || avgDailyDemand <= 0) return null;
  return soh / avgDailyDemand;
}

/**
 * CR-02 — THE band function. Null when days of supply cannot be computed.
 * With a material group, that group's bands (REQ-E08-05 BR-03).
 * @param {number | null} days
 * @param {string | null} [materialGroup]
 * @returns {SupplyBand | null}
 */
export function supplyBand(days, materialGroup) {
  if (days === null) return null;
  // The administrator's bands in force at THIS call (BL-32), for the group.
  const bands = supplyBands(materialGroup);
  if (days < bands.criticalBelow) return 'critical';
  if (days < bands.warningBelow) return 'warning';
  if (days <= bands.healthyUpTo) return 'healthy';
  return 'excess';
}

/**
 * @param {Pick<InventoryPosition, 'supplierSoh' | 'avgDailyDemand'>} p
 * @returns {number | null}
 */
export const positionDays = (p) => daysOfSupply(p.supplierSoh, p.avgDailyDemand);

/**
 * @param {Pick<InventoryPosition, 'supplierSoh' | 'avgDailyDemand'> & Partial<Pick<InventoryPosition, 'materialGroup'>>} p
 * @returns {SupplyBand | null}
 */
export const positionBand = (p) => supplyBand(positionDays(p), p.materialGroup);

// ── Risk class (CR-24, CR-02 as its fallback) ────────────────────────────────

/**
 * A usable lead time: a positive, finite number of days. Anything else is missing.
 * @param {number | null | undefined} leadTimeDays
 * @returns {leadTimeDays is number}
 */
export const hasLeadTime = (leadTimeDays) =>
  typeof leadTimeDays === 'number' && Number.isFinite(leadTimeDays) && leadTimeDays > 0;

/** @type {Record<SupplyBand, RiskClass>} */
const BAND_RISK = {
  critical: 'high',
  warning: 'medium',
  healthy: 'low',
  excess: 'low'
};

/**
 * CR-24 — THE risk-class function. Every page, widget and alert that shows a
 * material's risk reads it from here (BL-46).
 *   · With a lead time L: High when cover < L; Medium when cover < 1.5 × L;
 *     Low otherwise. Strict at both cuts — cover exactly L is Medium, exactly
 *     1.5 × L is Low.
 *   · Without one: the CR-02 bands decide (Critical → High, Warning → Medium,
 *     Healthy / Excess → Low), and the caller raises "lead time missing".
 *   · Without days of cover: Low, basis `noCover` — the missing figures are the
 *     stale-data alert's business, not a risk.
 *   · With a material group (REQ-E08-05 BR-03, owner 2026-10-23), the group's
 *     multiples and bands where it overrides them; the global values otherwise.
 * @param {number | null} daysOfCover
 * @param {number | null} leadTimeDays
 * @param {string | null} [materialGroup]
 * @returns {{ riskClass: RiskClass; basis: RiskBasis }}
 */
export function riskFor(daysOfCover, leadTimeDays, materialGroup) {
  const lead = hasLeadTime(leadTimeDays) ? leadTimeDays : null;
  if (daysOfCover === null)
    return { riskClass: 'low', basis: { kind: 'noCover', leadTimeDays: lead } };
  if (lead !== null) {
    const m = leadTimeRisk(materialGroup);
    /** @type {RiskClass} */
    const riskClass =
      daysOfCover < m.highBelowMultiple * lead
        ? 'high'
        : daysOfCover < m.mediumBelowMultiple * lead
          ? 'medium'
          : 'low';
    return { riskClass, basis: { kind: 'leadTime', leadTimeDays: lead, daysOfCover } };
  }
  const band = /** @type {SupplyBand} */ (supplyBand(daysOfCover, materialGroup));
  return { riskClass: BAND_RISK[band], basis: { kind: 'fallbackBands', band, daysOfCover } };
}

/**
 * CR-24 for one position: its days of supply (CR-01) against its supplier lead
 * time, with the thresholds of the position's material group.
 * @param {Pick<InventoryPosition, 'supplierSoh' | 'avgDailyDemand' | 'leadTimeDays'> & Partial<Pick<InventoryPosition, 'materialGroup'>>} p
 * @returns {{ riskClass: RiskClass; basis: RiskBasis }}
 */
export const positionRisk = (p) => riskFor(positionDays(p), p.leadTimeDays, p.materialGroup);

// ── Incoming (REQ-E08-01 BR-05, BR-06) ───────────────────────────────────────

/**
 * @typedef {{
 *   readonly inProduction: number;
 *   readonly inTransit: number;
 *   readonly total: number;
 *   readonly nextDate: string | null;
 * }} IncomingTotals
 */

/**
 * @param {readonly IncomingItem[]} items
 * @returns {IncomingTotals}
 */
export function incomingTotals(items) {
  const inProduction = items
    .filter((i) => i.source === 'production')
    .reduce((s, i) => s + i.quantity, 0);
  const inTransit = items
    .filter((i) => i.source !== 'production')
    .reduce((s, i) => s + i.quantity, 0);
  const dates = items
    .map((i) => i.date)
    .filter(/** @returns {d is string} */ (d) => d !== null)
    .sort();
  return { inProduction, inTransit, total: inProduction + inTransit, nextDate: dates[0] ?? null };
}

/** ASN states that are on the way to PTI: submitted or in transit, not cancelled or received.
 * @type {readonly ASN['status'][]}
 *  MR-6 AC-04 — 'Awaiting exception' does not count until Quality approves. */
const IN_TRANSIT_ASN_STATES = ['Submitted', 'In Transit'];

/**
 * In-transit quantities for one supplier × material: submitted, non-cancelled
 * ASNs, plus call-off dispatch notices whose delivery has not been received.
 * A notice that names an ASN already counted is not counted twice.
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {readonly ASN[]} asns
 * @param {readonly Pick<CallOffView, 'callOff' | 'delivery'>[]} views
 * @returns {IncomingItem[]}
 */
export function inTransitItems(supplierId, materialCode, asns, views) {
  const counted = /** @type {Set<string>} */ (new Set());
  /** @type {IncomingItem[]} */
  const fromAsns = [];
  for (const a of asns) {
    if (a.supplierId !== supplierId || !IN_TRANSIT_ASN_STATES.includes(a.status)) continue;
    const qty = a.lineItems
      .filter((l) => l.materialCode === materialCode)
      .reduce((s, l) => s + l.shippedQty, 0);
    if (qty <= 0) continue;
    counted.add(a.asnNumber);
    fromAsns.push({
      source: 'asn',
      date: a.eta ? dayOf(a.eta) : null,
      quantity: qty,
      reference: a.asnNumber
    });
  }
  /** @type {IncomingItem[]} */
  const fromNotices = [];
  for (const v of views) {
    /** @type {CallOff} */
    const c = v.callOff;
    if (c.supplierId !== supplierId || c.materialCode !== materialCode) continue;
    if (v.delivery !== 'dispatched' && v.delivery !== 'atRisk') continue;
    for (const d of c.dispatches) {
      if (d.asnNumber && counted.has(d.asnNumber)) continue;
      fromNotices.push({
        source: 'dispatch',
        date: d.expectedArrival,
        quantity: d.quantity,
        reference: c.callOffNumber
      });
    }
  }
  return [...fromAsns, ...fromNotices];
}

// ── Coverage (CR-03) ─────────────────────────────────────────────────────────

/** @typedef {'covered' | 'atRisk' | 'uncovered'} CoverageStatus */

/**
 * CR-03 — (supplier SOH + incoming in production or in transit) ÷ firm demand.
 * Firm demand here is the demand for the CR-01 window (30 days); no demand
 * counts as Covered. A supplier that never submitted stock cannot be assessed,
 * so it is not reported as uncovered — its missing figures are the stale-data
 * alert instead.
 * @param {Pick<InventoryPosition, 'supplierSoh' | 'avgDailyDemand' | 'incoming'>} p
 * @returns {{ ratio: number | null; status: CoverageStatus }}
 */
export function coverage(p) {
  const demand = p.avgDailyDemand === null ? 0 : p.avgDailyDemand * DEMAND_WINDOW;
  if (demand <= 0 || p.supplierSoh === null) return { ratio: null, status: 'covered' };
  const supply = (p.supplierSoh ?? 0) + incomingTotals(p.incoming).total;
  const ratio = supply / demand;
  const thresholds = coverageThresholds();
  /** @type {CoverageStatus} */
  const status =
    ratio >= thresholds.coveredFrom
      ? 'covered'
      : ratio >= thresholds.atRiskFrom
        ? 'atRisk'
        : 'uncovered';
  return { ratio, status };
}

// ── Freshness against the data-update SLA (REQ-E08-01 AC-05, edge case) ─────

/** @typedef {'missing' | 'stale' | 'current'} StockFreshness */

/**
 * Missing when the supplier never submitted; stale when `now` is past the
 * position's `staleAt` (Material B1: by update mode, cycle and calendar,
 * computed once in `buildInventoryPositions` — MR-1 BR-05, AR-07); otherwise
 * current.
 *
 * A failed API sync after the figure does NOT make it stale (owner ruling
 * 2026-09-29, reversing the REQ-E08-02 edge case / BL-59 flag): the previous
 * figures are kept and stay current until `stale.apiHours` after the last
 * successful pull. The failure shows as a warning (`lastPullFailedAt`).
 *
 * A position that carries no `staleAt` (one built outside the read model)
 * falls back to the stale period in days, `updateSla` — the only place the
 * default stale period (`stale.defaultDays`) still decides freshness.
 * @param {Pick<InventoryPosition, 'lastUpdatedAt' | 'updateSla' | 'lastSync'> & Partial<Pick<InventoryPosition, 'staleAt'>>} p
 * @param {string} nowIso
 * @returns {StockFreshness}
 */
export function stockFreshness(p, nowIso) {
  if (p.lastUpdatedAt === null) return 'missing';
  if (p.staleAt) return Date.parse(nowIso) > Date.parse(p.staleAt) ? 'stale' : 'current';
  const ageMs = Date.parse(nowIso) - Date.parse(p.lastUpdatedAt);
  return ageMs > p.updateSla * DAY_MS ? 'stale' : 'current';
}

// ── PTI-side conditions (REQ-E08-05 BR-01) ───────────────────────────────────

/**
 * @param {Pick<InventoryPosition, 'ptiSoh' | 'ptiRop'>} p
 * @returns {boolean}
 */
export const isPtiBelowRop = (p) => p.ptiSoh !== null && p.ptiRop !== null && p.ptiSoh < p.ptiRop;

/**
 * REQ-E08-05 `supplierBelowRop`, rewired by the owner (2026-10-19, DRC-D15):
 * the supplier's stock against the SYSTEM-calculated ROP Supplier
 * (`systemRopSupplier`, BL-196), never the supplier-typed `supplierRop`, which
 * is display only. No system figure ("Not available", e.g. a lead-time leg the
 * hub does not hold) → the rule does not fire for the pair.
 * @param {Pick<InventoryPosition, 'supplierSoh' | 'systemRopSupplier'>} p
 * @returns {boolean}
 */
export const isSupplierBelowRop = (p) => {
  const rop = p.systemRopSupplier?.value ?? null;
  return p.supplierSoh !== null && rop !== null && p.supplierSoh < rop;
};

/**
 * Projected stock-out before the next incoming date: PTI SOH ÷ the material's
 * daily demand (all its suppliers) is fewer days than until the next incoming
 * quantity from this supplier. With no incoming date there is no "before" to
 * compare against, so the rule does not fire (PTI SOH below PTI ROP covers it).
 * @param {Pick<InventoryPosition, 'ptiSoh' | 'incoming'>} p
 * @param {number} materialDailyDemand
 * @param {string} nowIso
 * @returns {boolean}
 */
export function isProjectedStockOut(p, materialDailyDemand, nowIso) {
  if (p.ptiSoh === null || materialDailyDemand <= 0) return false;
  const cover = p.ptiSoh / materialDailyDemand;
  const next = incomingTotals(p.incoming).nextDate;
  if (next === null) return false;
  return cover < daysBetween(dayOf(nowIso), next);
}

/**
 * The material's daily demand across every supplier of it.
 * @param {readonly InventoryPosition[]} positions
 * @param {string} materialCode
 * @returns {number}
 */
export function materialDailyDemand(positions, materialCode) {
  return positions
    .filter((p) => p.materialCode === materialCode)
    .reduce((s, p) => s + (p.avgDailyDemand ?? 0), 0);
}

// ── Building the positions (the ONE inventory model) ─────────────────────────

/**
 * `plant`: DRC-D12 (BL-199) — the plant the stock sits in (J6, J2). Every
 * record in the hub carries it; optional here only for callers of the pure
 * rules that build a record without one.
 * @typedef {{
 *   readonly materialCode: string;
 *   readonly ptiSoh: number;
 *   readonly ptiRop: number;
 *   readonly consignment: boolean;
 *   readonly plant?: import('./callOffTriggerRules').PtiPlant;
 * }} PtiStockRecord
 */

/**
 * `assignments`:  Every supplier × material the hub knows as assigned.
 * `currentDeclaration`:  Picks the current declaration for a pair (store insertion order).
 * `leadTime`:  CR-24 — the supplier lead time in days (master data); null when none is on record.
 * `updateModeAt`: Material B1 — the supplier's stock update mode as it stood at an instant (the resolver, `stockUpdateModeOf`). Read at the start of the current update cycle, so a mode changed mid-cycle takes effect next cycle (MR-1 edge case 1).
 * `calendar`:  The hub working calendar in force (BL-50) — it moves a holiday cutoff.
 *
 * @typedef {{
 *   readonly assignments: readonly { readonly supplierId: string; readonly materialCode: string }[];
 *   readonly declarations: readonly InventoryDeclaration[];
 *   readonly currentDeclaration: (supplierId: string, materialCode: string) => InventoryDeclaration | undefined;
 *   readonly master: (materialCode: string) => MaterialMasterEntry | null;
 *   readonly supplierName: (supplierId: string) => string;
 *   readonly ptiStock: readonly PtiStockRecord[];
 *   readonly forecastLines: readonly ForecastLine[];
 *   readonly planningEstimate: (supplierId: string, materialCode: string) => number | null;
 *   readonly leadTime: (supplierId: string, materialCode: string) => number | null;
 *   readonly asns: readonly ASN[];
 *   readonly callOffViews: readonly Pick<CallOffView, 'callOff' | 'delivery'>[];
 *   readonly apiConnected: (supplierId: string) => boolean;
 *   readonly syncAttempts: readonly StockSyncAttempt[];
 *   readonly updateModeAt: (supplierId: string, atIso: string) => StockUpdateMode;
 *   readonly calendar: WorkingCalendar;
 * }} PositionInputs
 */

/**
 * Every assigned supplier × material, projected. PTI stock is present for all rows.
 * @param {PositionInputs} input
 * @param {string} nowIso
 * @returns {InventoryPosition[]}
 */
export function buildInventoryPositions(input, nowIso) {
  /** @type {InventoryPosition[]} */
  const rows = [];
  const cycleSettings = updateCycleSettings();
  const cycleStart = updateCycleFor(nowIso, input.calendar, cycleSettings).start;
  for (const { supplierId, materialCode } of input.assignments) {
    const entry = input.master(materialCode);
    if (!entry) continue;
    const decl = input.currentDeclaration(supplierId, materialCode);
    const pti = input.ptiStock.find((s) => s.materialCode === materialCode);
    const lines = input.forecastLines.filter(
      (l) => l.supplierId === supplierId && l.materialCode === materialCode
    );
    const demand = averageDailyDemand(
      lines,
      input.planningEstimate(supplierId, materialCode),
      nowIso
    );
    /** @type {IncomingItem[]} */
    const production =
      decl?.inProductionQty && decl.inProductionQty > 0
        ? [
            {
              source: 'production',
              date: decl.productionCompletionDate ?? null,
              quantity: decl.inProductionQty,
              reference: null
            }
          ]
        : [];
    const syncs = input.syncAttempts
      .filter((a) => a.supplierId === supplierId)
      .sort((a, b) => b.at.localeCompare(a.at));
    const lastUpdatedAt = decl ? decl.declaredAt : null;
    const staleAt = staleAtFor({
      lastUpdatedAt,
      mode: input.updateModeAt(supplierId, cycleStart),
      lastSuccessfulPullAt: syncs.find((a) => a.outcome === 'success')?.at ?? null,
      overrideDays: staleOverrideDaysFor(supplierId, materialCode),
      // REQ-E08-05 BR-03 — the material group's periods, below the pair's own.
      groupDays: groupStaleDaysFor(entry.materialGroup),
      calendar: input.calendar,
      cycle: cycleSettings,
      apiHours: staleApiHours(entry.materialGroup)
    });
    rows.push({
      supplierId,
      supplierName: input.supplierName(supplierId),
      materialCode,
      materialLabel: entry.label,
      materialType: entry.materialType,
      materialGroup: entry.materialGroup,
      uom: entry.canonicalUom,
      supplierSoh: decl ? decl.totalQty : null,
      supplierRop: decl?.supplierRop ?? null,
      ptiSoh: pti ? pti.ptiSoh : null,
      ptiRop: pti ? pti.ptiRop : null,
      ptiStockShared: true,
      consignment: pti?.consignment ?? false,
      incoming: [
        ...production,
        ...inTransitItems(supplierId, materialCode, input.asns, input.callOffViews)
      ],
      avgDailyDemand: demand.value,
      demandSource: demand.source,
      leadTimeDays: input.leadTime(supplierId, materialCode),
      lastUpdatedAt,
      channel: decl ? (decl.channel ?? 'manual') : null,
      updateSla: updateSlaFor(supplierId, materialCode, entry.materialGroup),
      staleAt,
      apiConnected: input.apiConnected(supplierId),
      lastSync: syncs[0] ?? null,
      lastPullFailedAt:
        syncs[0]?.outcome === 'failed' && (lastUpdatedAt === null || syncs[0].at >= lastUpdatedAt)
          ? syncs[0].at
          : null,
      batches: (decl?.batches ?? []).map((b) => ({
        batchNumber: b.batchNumber,
        qty: b.qty,
        ...(b.manufacturingDate ? { manufacturingDate: b.manufacturingDate } : {}),
        ...(b.expiryDate ? { expiryDate: b.expiryDate } : {})
      }))
    });
  }
  return rows.sort(
    (a, b) =>
      a.supplierName.localeCompare(b.supplierName) || a.materialCode.localeCompare(b.materialCode)
  );
}

// ── Supplier access to PTI stock (REQ-E08-03) ────────────────────────────────

/**
 * Is PTI stock for this material visible to this supplier? No grant → never.
 * @param {StockAccessGrant | undefined} grant
 * @param {string} materialCode
 * @returns {boolean}
 */
export function canSeePtiStock(grant, materialCode) {
  if (!grant || !grant.active) return false;
  return grant.materials.length === 0 || grant.materials.includes(materialCode);
}

/**
 * The supplier's view of a position: PTI stock removed unless access covers it.
 * @param {InventoryPosition} p
 * @param {StockAccessGrant | undefined} grant
 * @returns {InventoryPosition}
 */
export function maskForSupplier(p, grant) {
  if (canSeePtiStock(grant, p.materialCode)) return p;
  return { ...p, ptiSoh: null, ptiRop: null, ptiStockShared: false };
}

// ── The stock template and row-by-row validation (REQ-E08-02 BR-05 to BR-07) ─

/**
 * @typedef {| 'materialCode'
 *   | 'soh'
 *   | 'unit'
 *   | 'supplierRop'
 *   | 'inProductionQty'
 *   | 'productionCompletionDate'
 *   | 'batchNumber'
 *   | 'batchQty'
 *   | 'manufacturingDate'
 *   | 'expiryDate'
 *   | 'feedstockQty'
 *   | 'feedstockConfirmedOn'} StockTemplateField
 */

/**
 * Whether a template column must be filled (MR-4, MAT-D4 owner ruling 2026-09-29):
 * - `required`: always.
 * - `requiredWhenInProduction`: only when the in-production quantity (E) is above 0.
 * - `requiredForRawMaterial`: [Owner, 2026-11-10, raw only] required on a raw
 *   material (ROH) with stock above 0 (`rawMaterialBatchProblem`), optional on packaging.
 * - `optional`: may be left blank; its header carries " (optional)" / " (opsional)".
 */
/** @typedef {'required' | 'requiredWhenInProduction' | 'requiredForRawMaterial' | 'optional'} StockFieldPresence */

/**
 * The fixed template, in column order (BR-06). Headers are matched in EN or ID.
 * MAT-D4 — E (in-production quantity) is required and 0 is allowed, so "none"
 * can be told from "not reported"; F is required when E > 0; D stays optional.
 * @type {readonly { readonly field: StockTemplateField; readonly en: string; readonly id: string; readonly presence: StockFieldPresence; }[]}
 */
export const STOCK_TEMPLATE_FIELDS = [
  { field: 'materialCode', en: 'Material code', id: 'Kode material', presence: 'required' },
  { field: 'soh', en: 'Stock on hand', id: 'Stok tersedia', presence: 'required' },
  { field: 'unit', en: 'Unit', id: 'Satuan', presence: 'required' },
  {
    field: 'supplierRop',
    en: 'Supplier reorder point',
    id: 'Titik pemesanan ulang pemasok',
    presence: 'optional'
  },
  {
    field: 'inProductionQty',
    en: 'In-production quantity',
    id: 'Kuantitas dalam produksi',
    presence: 'required'
  },
  {
    field: 'productionCompletionDate',
    en: 'Expected production completion date (YYYY-MM-DD)',
    id: 'Perkiraan tanggal selesai produksi (YYYY-MM-DD)',
    presence: 'requiredWhenInProduction'
  },
  {
    field: 'batchNumber',
    en: 'Batch number',
    id: 'Nomor batch',
    presence: 'requiredForRawMaterial'
  },
  {
    field: 'batchQty',
    en: 'Batch quantity',
    id: 'Kuantitas batch',
    presence: 'requiredForRawMaterial'
  },
  {
    field: 'manufacturingDate',
    en: 'Manufacturing date (YYYY-MM-DD)',
    id: 'Tanggal produksi (YYYY-MM-DD)',
    presence: 'optional'
  },
  {
    field: 'expiryDate',
    en: 'Expiry date (YYYY-MM-DD)',
    id: 'Tanggal kedaluwarsa (YYYY-MM-DD)',
    presence: 'requiredForRawMaterial'
  },
  // [Proposed, user feedback 2026-11-10] the weekly feedstock confirmation
  // (BL-194, DRC-8) rides the same file. It is NOT stock (MoM 2B): the upload
  // sends it through its own verb, `t_feedstock_confirm`, never inside the SOH.
  {
    field: 'feedstockQty',
    en: 'Feedstock quantity',
    id: 'Kuantitas feedstock',
    presence: 'optional'
  },
  {
    field: 'feedstockConfirmedOn',
    en: 'Feedstock as of (YYYY-MM-DD)',
    id: 'Feedstock per tanggal (YYYY-MM-DD)',
    presence: 'optional'
  }
];

/** The template columns that belong to the feedstock confirmation, not to the stock submission. */
export const FEEDSTOCK_TEMPLATE_FIELDS = /** @type {const} */ ([
  'feedstockQty',
  'feedstockConfirmedOn'
]);

/**
 * MR-4 BR-01 — the suffix every optional header ends with, per language.
 * @type {Readonly<Record<'en' | 'id', string>>}
 */
export const OPTIONAL_HEADER_SUFFIX = { en: ' (optional)', id: ' (opsional)' };

/**
 * The header a freshly built template writes for a column (MR-4 BR-01).
 * @param {(typeof STOCK_TEMPLATE_FIELDS)[number]} f
 * @param {'en' | 'id'} language
 * @returns {string}
 */
export function stockTemplateHeader(f, language) {
  return f.presence === 'optional'
    ? `${f[language]}${OPTIONAL_HEADER_SUFFIX[language]}`
    : f[language];
}

/**
 * MAT-D4 — the ONE check of the production pair, read by the template
 * validator, the manual form and the declare/record verbs
 * (`INV_DECLARE_DETAIL_VALID`): E must be given (0 allowed); F must be given
 * when E > 0; F, when given, is a `YYYY-MM-DD` day. Null when the pair is fine.
 *
 * Owner ruling 2026-09-29 (C1b): the `api` channel is EXEMPT from the two
 * "must be given" parts — a supplier ERP that does not send in-production is
 * accepted and the figure is left unset. A date it does send must still be a day.
 * @param {number | null} inProductionQty
 * @param {string} productionCompletionDate
 * @param {StockChannel} channel
 * @returns {{ readonly reason: 'missingField' | 'productionDateMissing' | 'invalidDate'; readonly field: 'inProductionQty' | 'productionCompletionDate'; } | null}
 */
export function productionProblem(inProductionQty, productionCompletionDate, channel) {
  const required = channel !== 'api';
  if (required && inProductionQty === null)
    return { reason: 'missingField', field: 'inProductionQty' };
  if (productionCompletionDate !== '' && !isIsoDay(productionCompletionDate)) {
    return { reason: 'invalidDate', field: 'productionCompletionDate' };
  }
  if (
    required &&
    inProductionQty !== null &&
    inProductionQty > 0 &&
    productionCompletionDate === ''
  ) {
    return { reason: 'productionDateMissing', field: 'productionCompletionDate' };
  }
  return null;
}

// ── Batch dates (REQ-E08-02 BR-06, BL-60) ────────────────────────────────────

/** @typedef {'invalidDate' | 'manufacturedAfterExpiry' | 'manufacturedInFuture'} BatchDateProblem */

/**
 * The ONE check of a batch's optional dates, read by the manual form, the
 * template validator and the declare/record verbs, so the three cannot
 * disagree: each date, when given, is a `YYYY-MM-DD` day; the manufacturing
 * date is not after the expiry date, and not after `today` (the app's clock —
 * a batch cannot have been made tomorrow). Null when the dates are fine.
 * @param {{ readonly manufacturingDate?: string; readonly expiryDate?: string }} batch
 * @param {string} today
 * @returns {{ readonly problem: BatchDateProblem; readonly field: 'manufacturingDate' | 'expiryDate' } | null}
 */
export function batchDatesProblem(batch, today) {
  const mfg = batch.manufacturingDate ?? '';
  const exp = batch.expiryDate ?? '';
  if (mfg !== '' && !isIsoDay(mfg)) return { problem: 'invalidDate', field: 'manufacturingDate' };
  if (exp !== '' && !isIsoDay(exp)) return { problem: 'invalidDate', field: 'expiryDate' };
  if (mfg === '') return null;
  if (exp !== '' && mfg > exp)
    return { problem: 'manufacturedAfterExpiry', field: 'manufacturingDate' };
  if (mfg > today) return { problem: 'manufacturedInFuture', field: 'manufacturingDate' };
  return null;
}

// ── Raw-material batches (user feedback, Owner ruling 2026-11-10) ──────────

/** @typedef {'rawMaterialBatchRequired' | 'rawMaterialExpiryRequired'} RawMaterialBatchProblem */

/**
 * [Owner, 2026-11-10, raw only — user feedback from the warehouse; it narrows
 * BR-06 "batch detail stays optional"] A RAW MATERIAL (ROH) with stock on hand
 * above 0 must come with its batches, and every batch must carry its expiry
 * date, because the warehouse controls near-expiry stock by batch. Packaging
 * (VERP) keeps batches optional. The `api` channel is exempt, as for MAT-D4: a
 * supplier ERP may not send batches. The ONE check, read by the manual form,
 * the template validator and the declare/record verbs. Null when fine.
 * @param {{
 *   readonly materialType: string | null | undefined;
 *   readonly soh: number | null;
 *   readonly batches: readonly { readonly expiryDate?: string }[];
 *   readonly channel: StockChannel;
 * }} input
 * @returns {{ readonly reason: RawMaterialBatchProblem; readonly field: 'batchNumber' | 'expiryDate' } | null}
 */
export function rawMaterialBatchProblem({ materialType, soh, batches, channel }) {
  if (channel === 'api' || materialType !== 'ROH' || soh === null || soh <= 0) return null;
  if (batches.length === 0) return { reason: 'rawMaterialBatchRequired', field: 'batchNumber' };
  if (batches.some((b) => (b.expiryDate ?? '') === ''))
    return { reason: 'rawMaterialExpiryRequired', field: 'expiryDate' };
  return null;
}

/**
 * MR-4 BR-02 — the optional suffix is dropped before matching, so older files still upload.
 * @param {string} h
 */
const normHeader = (h) =>
  h
    .trim()
    .replace(/\s*\((optional|opsional)\)\s*$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

/**
 * The template field a raw header names (with or without the optional suffix), or null.
 * @param {string} header
 * @returns {StockTemplateField | null}
 */
export function templateFieldFor(header) {
  const n = normHeader(header);
  const hit = STOCK_TEMPLATE_FIELDS.find((f) => normHeader(f.en) === n || normHeader(f.id) === n);
  return hit ? hit.field : null;
}

/**
 * The template as CSV text, one row per assigned material, prefilled with code and unit.
 * @param {readonly { readonly materialCode: string; readonly uom: string }[]} materials
 * @param {'en' | 'id'} language
 * @returns {string}
 */
export function stockTemplateCsv(materials, language) {
  /** @param {string} v */
  const quote = (v) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = STOCK_TEMPLATE_FIELDS.map((f) => quote(stockTemplateHeader(f, language))).join(
    ','
  );
  const rows = materials.map((m) =>
    STOCK_TEMPLATE_FIELDS.map((f) =>
      f.field === 'materialCode' ? m.materialCode : f.field === 'unit' ? m.uom : ''
    ).join(',')
  );
  return [header, ...rows].join('\n') + '\n';
}

/**
 * Parse CSV text (comma or semicolon, quoted cells) into rows keyed by header.
 * @param {string} text
 * @returns {{ headers: string[]; rows: Record<string, string>[] }}
 */
export function parseCsv(text) {
  /** @type {string[][]} */
  const lines = [];
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
  let cell = '';
  /** @type {string[]} */
  let row = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      lines.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    lines.push(row);
  }
  const nonBlank = lines.filter((l) => l.some((c) => c.trim() !== ''));
  const headers = (nonBlank[0] ?? []).map((h) => h.trim());
  const rows = nonBlank.slice(1).map((l) => {
    /** @type {Record<string, string>} */
    const rec = {};
    headers.forEach((h, idx) => {
      rec[h] = (l[idx] ?? '').trim();
    });
    return rec;
  });
  return { headers, rows };
}

/**
 * @typedef {| 'missingField'
 *   | 'notAssigned'
 *   | 'notANumber'
 *   | 'ambiguousNumber'
 *   | 'unitMismatch'
 *   | 'invalidDate'
 *   | 'manufacturedAfterExpiry'
 *   | 'manufacturedInFuture'
 *   | 'batchTotal'
 *   | 'conflictingRows'
 *   | 'productionDateMissing'
 *   | 'rawMaterialBatchRequired'
 *   | 'rawMaterialExpiryRequired'} StockRowRefusal
 */

/**
 * `row`:  1-based data row number as the supplier sees it (header is row 1, so data starts at 2).
 * `field`:  The field the refusal is about, when there is one.
 *
 * @typedef {{
 *   readonly row: number;
 *   readonly materialCode: string;
 *   readonly reason: StockRowRefusal;
 *   readonly field?: StockTemplateField;
 * }} RefusedStockRow
 */

/** One validated material submission, ready for the declare verb. */
/**
 * `rows`:  The file rows this submission came from.
 *
 * @typedef {{
 *   readonly materialCode: string;
 *   readonly totalQty: number;
 *   readonly supplierRop?: number;
 *   readonly inProductionQty?: number;
 *   readonly productionCompletionDate?: string;
 *   readonly batches?: readonly { readonly batchNumber: string; readonly qty: number; readonly manufacturingDate?: string; readonly expiryDate?: string; }[];
 *   readonly rows: readonly number[];
 * }} StockSubmissionDraft
 */

/**
 * `assigned`:  The supplier's assigned materials with their canonical unit, and their
 *   material type when known (ROH raw material → batches with expiry required).
 * `today`:  Today on the app's clock (`YYYY-MM-DD`) — a manufacturing date may not be after it.
 *
 * @typedef {{
 *   readonly assigned: readonly { readonly materialCode: string; readonly uom: string; readonly materialType?: string }[];
 *   readonly today: string;
 * }} StockRowContext
 */

/** @typedef {{ ok: true; value: number | null } | { ok: false; reason: 'notANumber' | 'ambiguousNumber' }} NumberRead */

/**
 * CR-18 — a number that reads differently in ID and EN format is refused, not guessed.
 * @param {string | undefined} raw
 * @returns {NumberRead}
 */
export function readStockNumber(raw) {
  const s = (raw ?? '').trim();
  if (s === '') return { ok: true, value: null };
  const r = normalizeQty(s);
  if (r.ok) return { ok: true, value: r.value };
  return { ok: false, reason: r.reason === 'AMBIGUOUS_QTY' ? 'ambiguousNumber' : 'notANumber' };
}

/**
 * Inventory UX S-03 (INV-D10) — a template row the supplier left blank: every
 * cell is empty except the material code and the unit, which the downloaded
 * template fills in. A value under ANY other column, a column the template
 * does not know included, makes the row filled, so a renamed column is still
 * refused by name rather than passed over as blank. The feedstock columns do
 * not count: feedstock is a separate confirmation (`readFeedstockRows`).
 * @param {Readonly<Record<string, string>>} row  One file row keyed by its header.
 * @returns {boolean}
 */
export function isBlankStockRow(row) {
  return Object.entries(row).every(([header, value]) => {
    const f = templateFieldFor(header);
    return (
      f === 'materialCode' ||
      f === 'unit' ||
      (f !== null && /** @type {readonly string[]} */ (FEEDSTOCK_TEMPLATE_FIELDS).includes(f)) ||
      (value ?? '').trim() === ''
    );
  });
}

/**
 * `row`:  1-based file row number, as in `RefusedStockRow`.
 *
 * @typedef {{ readonly row: number; readonly materialCode: string }} BlankStockRow
 */

/**
 * Validate an uploaded file row by row (BR-05). A material's rows (one row, or
 * one row per batch) are accepted or refused together, because batch
 * quantities must add up to the SOH (CR-19); every other material's rows are
 * unaffected. Valid materials become drafts; every refused row is listed with
 * its row number and reason.
 *
 * S-03 (INV-D10) — a material whose rows are all blank (`isBlankStockRow`)
 * is neither accepted nor refused: its rows come back in `blank`, "left blank,
 * not sent". A blank row beside a filled row of the same material stays part
 * of that material, as before.
 * @param {readonly Record<string, string>[]} rows
 * @param {StockRowContext} ctx
 * @returns {{ accepted: StockSubmissionDraft[]; refused: RefusedStockRow[]; blank: BlankStockRow[] }}
 */
export function validateStockRows(rows, ctx) {
  /** @type {RefusedStockRow[]} */
  const refused = [];
  /** @type {BlankStockRow[]} */
  const blank = [];
  // Re-key every row by template field.
  const keyed = rows.map((r, index) => {
    /** @type {Partial<Record<StockTemplateField, string>>} */
    const rec = {};
    for (const [header, value] of Object.entries(r)) {
      const f = templateFieldFor(header);
      if (f) rec[f] = (value ?? '').trim();
    }
    return { row: index + 2, rec, isBlank: isBlankStockRow(r) };
  });

  const groups =
    /** @type {Map<string, { row: number; rec: Partial<Record<StockTemplateField, string>>; isBlank: boolean }[]>} */ (
      new Map()
    );
  for (const k of keyed) {
    const code = k.rec.materialCode ?? '';
    if (code === '' && k.isBlank) {
      blank.push({ row: k.row, materialCode: '' });
      continue;
    }
    if (code === '') {
      refused.push({ row: k.row, materialCode: '', reason: 'missingField', field: 'materialCode' });
      continue;
    }
    groups.set(code, [...(groups.get(code) ?? []), k]);
  }

  /** @type {StockSubmissionDraft[]} */
  const accepted = [];
  for (const [code, members] of groups) {
    const rowNumbers = members.map((m) => m.row);
    if (members.every((m) => m.isBlank)) {
      for (const m of members) blank.push({ row: m.row, materialCode: code });
      continue;
    }
    /**
     * @param {StockRowRefusal} reason
     * @param {StockTemplateField} [field]
     */
    const refuseAll = (reason, field) => {
      for (const m of members)
        refused.push({ row: m.row, materialCode: code, reason, ...(field ? { field } : {}) });
    };
    const assigned = ctx.assigned.find((a) => a.materialCode === code);
    if (!assigned) {
      refuseAll('notAssigned');
      continue;
    }
    const first = members[0].rec;
    // Required fields on the first row of the material.
    const missing = /** @type {const} */ (['soh', 'unit']).find((f) => (first[f] ?? '') === '');
    if (missing) {
      refuseAll('missingField', missing);
      continue;
    }
    // Header values repeated on batch rows must agree with the first row.
    const headerFields = /** @type {const} */ ([
      'soh',
      'unit',
      'supplierRop',
      'inProductionQty',
      'productionCompletionDate'
    ]);
    const conflict = members
      .slice(1)
      .some((m) => headerFields.some((f) => (m.rec[f] ?? '') !== '' && m.rec[f] !== first[f]));
    if (conflict) {
      refuseAll('conflictingRows');
      continue;
    }
    if (
      /** @type {NonNullable<typeof first.unit>} */ (first.unit).toUpperCase() !==
      assigned.uom.toUpperCase()
    ) {
      refuseAll('unitMismatch', 'unit');
      continue;
    }
    let failed = false;
    /** @type {Partial<Record<'soh' | 'supplierRop' | 'inProductionQty', number | null>>} */
    const numbers = {};
    for (const f of /** @type {const} */ (['soh', 'supplierRop', 'inProductionQty'])) {
      const read = readStockNumber(first[f]);
      if (!read.ok) {
        refuseAll(read.reason, f);
        failed = true;
        break;
      }
      numbers[f] = read.value;
    }
    if (failed) continue;
    const completion = first.productionCompletionDate ?? '';
    // MAT-D4 — E required (0 allowed); F required when E > 0.
    const production = productionProblem(numbers.inProductionQty ?? null, completion, 'template');
    if (production) {
      refuseAll(production.reason, production.field);
      continue;
    }
    // Batches: every row that names a batch number or a batch quantity.
    /** @type {{ batchNumber: string; qty: number; manufacturingDate?: string; expiryDate?: string }[]} */
    const batches = [];
    for (const m of members) {
      const bn = m.rec.batchNumber ?? '';
      const bq = m.rec.batchQty ?? '';
      const mfg = m.rec.manufacturingDate ?? '';
      const exp = m.rec.expiryDate ?? '';
      if (bn === '' && bq === '' && mfg === '' && exp === '') continue;
      if (bn === '' || bq === '') {
        refused.push({
          row: m.row,
          materialCode: code,
          reason: 'missingField',
          field: bn === '' ? 'batchNumber' : 'batchQty'
        });
        failed = true;
        continue;
      }
      const read = readStockNumber(bq);
      if (!read.ok || read.value === null) {
        refused.push({
          row: m.row,
          materialCode: code,
          reason: read.ok ? 'missingField' : read.reason,
          field: 'batchQty'
        });
        failed = true;
        continue;
      }
      const dates = batchDatesProblem({ manufacturingDate: mfg, expiryDate: exp }, ctx.today);
      if (dates) {
        refused.push({ row: m.row, materialCode: code, reason: dates.problem, field: dates.field });
        failed = true;
        continue;
      }
      batches.push({
        batchNumber: bn,
        qty: read.value,
        ...(mfg ? { manufacturingDate: mfg } : {}),
        ...(exp ? { expiryDate: exp } : {})
      });
    }
    if (failed) {
      // A material is all-or-nothing: list its remaining rows too, so nothing is half-saved.
      const listed = new Set(refused.filter((r) => r.materialCode === code).map((r) => r.row));
      for (const m of members) {
        if (!listed.has(m.row))
          refused.push({ row: m.row, materialCode: code, reason: 'conflictingRows' });
      }
      continue;
    }
    const soh = /** @type {NonNullable<typeof numbers.soh>} */ (numbers.soh);
    if (batches.length > 0 && batches.reduce((s, b) => s + b.qty, 0) !== soh) {
      refuseAll('batchTotal', 'batchQty');
      continue;
    }
    // [Proposed] raw material: batches with an expiry date are required.
    const rawBatch = rawMaterialBatchProblem({
      materialType: assigned.materialType,
      soh,
      batches,
      channel: 'template'
    });
    if (rawBatch) {
      refuseAll(rawBatch.reason, rawBatch.field);
      continue;
    }
    accepted.push({
      materialCode: code,
      totalQty: soh,
      ...(numbers.supplierRop !== null && numbers.supplierRop !== undefined
        ? { supplierRop: numbers.supplierRop }
        : {}),
      ...(numbers.inProductionQty !== null && numbers.inProductionQty !== undefined
        ? { inProductionQty: numbers.inProductionQty }
        : {}),
      ...(completion ? { productionCompletionDate: completion } : {}),
      ...(batches.length > 0 ? { batches } : {}),
      rows: rowNumbers
    });
  }
  refused.sort((a, b) => a.row - b.row);
  blank.sort((a, b) => a.row - b.row);
  return { accepted, refused, blank };
}

/**
 * [Proposed, user feedback 2026-11-10] The feedstock half of an uploaded
 * template: per material, the first row that fills the feedstock quantity.
 * A blank date means `today` (the upload day) — my call, so the supplier can
 * fill one column. The verb (`t_feedstock_confirm`) still runs its own rule.
 * @param {readonly Record<string, string>[]} rows
 * @param {{ readonly assigned: readonly { readonly materialCode: string }[]; readonly today: string }} ctx
 * @returns {{
 *   accepted: { readonly materialCode: string; readonly feedstockQty: number; readonly confirmedOn: string; readonly row: number }[];
 *   refused: { readonly row: number; readonly materialCode: string; readonly reason: 'feedstockQtyInvalid' | 'feedstockDateInvalid' | 'notAssigned' }[];
 * }}
 */
export function readFeedstockRows(rows, ctx) {
  /** @type {ReturnType<typeof readFeedstockRows>['accepted']} */
  const accepted = [];
  /** @type {ReturnType<typeof readFeedstockRows>['refused']} */
  const refused = [];
  const seen = new Set();
  rows.forEach((r, index) => {
    /** @type {Partial<Record<StockTemplateField, string>>} */
    const rec = {};
    for (const [header, value] of Object.entries(r)) {
      const f = templateFieldFor(header);
      if (f) rec[f] = (value ?? '').trim();
    }
    const code = rec.materialCode ?? '';
    const rawQty = rec.feedstockQty ?? '';
    if (code === '' || rawQty === '' || seen.has(code)) return;
    seen.add(code);
    const row = index + 2;
    if (!ctx.assigned.some((a) => a.materialCode === code)) {
      refused.push({ row, materialCode: code, reason: 'notAssigned' });
      return;
    }
    const read = readStockNumber(rawQty);
    if (!read.ok || read.value === null || read.value < 0) {
      refused.push({ row, materialCode: code, reason: 'feedstockQtyInvalid' });
      return;
    }
    const date =
      (rec.feedstockConfirmedOn ?? '') === '' ? ctx.today : (rec.feedstockConfirmedOn ?? '');
    if (!isIsoDay(date) || date > ctx.today) {
      refused.push({ row, materialCode: code, reason: 'feedstockDateInvalid' });
      return;
    }
    accepted.push({ materialCode: code, feedstockQty: read.value, confirmedOn: date, row });
  });
  return { accepted, refused };
}

/**
 * The channel a declare/record submission is stored under (REQ-E08-02 BR-08):
 * a PTI (buyer) recording is ALWAYS `pti`, whatever the payload says; a
 * supplier's own submission is `template` when it says so, else `manual`.
 * Read by the target that stores it and by the hook that checks it.
 * @param {boolean} byBuyer
 * @param {unknown} requested
 * @returns {StockChannel}
 */
export function submissionChannel(byBuyer, requested) {
  return byBuyer ? 'pti' : requested === 'template' ? 'template' : 'manual';
}

/**
 * The channel label key suffix for a stock figure (REQ-E08-02 BR-08: "Entered by PTI").
 * @type {readonly StockChannel[]}
 */
export const CHANNELS = ['template', 'manual', 'api', 'pti'];
