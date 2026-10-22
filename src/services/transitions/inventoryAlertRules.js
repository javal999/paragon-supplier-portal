// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY AND CAPACITY ALERTS — REQ-E08-05.
//
// An alert is a CONDITION derived at read time (BR-01) with a risk class
// (BR-02), keyed rule × material (or material group) × supplier. Because the
// key is the identity, one condition can only ever be one open alert (BR-05,
// AC-03) — however many times it is read.
//
// The only stored part is the planner's side: a closure with its action note,
// and the moment the condition was later seen to clear. A closed alert stays
// closed while its condition persists; it reopens only when the condition has
// cleared and then recurs. That ledger is append-only and lives in the mock
// store; everything else here is pure.
//
// Risk class (BR-02, CR-24 — decided 2026-09-21, BL-46): the material's days
// of cover against its supplier lead time, from THE one function
// `positionRisk` (inventoryRules). The CR-02 bands decide only where no lead
// time is on record, and that gap raises its own "lead time missing" alert.
// Stale data is Low. A commitment below forecast beyond tolerance (REQ-E06-03)
// is High in the Firm zone and Medium in the Trade-off zone — its own rule, not
// CR-24. Coverage (CR-03) raises an alert but no longer sets its class: before
// CR-24 an Uncovered position was High on that ground alone.
// Every alert carries the basis its class was decided on, so the planner can
// see WHY it is High. Thresholds live in `inventoryConfig.js`.
//
// Order (MR-9 BR-02, BR-03; MAT-D1 keeps the CR-24 classes): class High to
// Low, then fewest days to impact, then supplier name. Supplier groups keep
// that order: a group sits where its most urgent alert sits (AR-13).
//
// Closing (MR-9 BR-04): a reason from the administrator's `alertClose` list;
// the note is optional except for "Other". A closure recorded before reasons
// existed carries only its note and counts as "Other" (`closeReasonOf`).
//
// CAP-4 BR-03 (CAP-D2, BL-173) — a supplier that gives the shortfall reason
// Discontinued, on its capacity for a week or on a commitment, is saying the
// material will not come from it any more: `supplyDiscontinued` asks PTI to
// find another source. One alert per supplier × MATERIAL (a capacity week's
// reason speaks for every material of its planning group), derived from the
// standing submission like every other rule; High by rule. The alert model has
// no audience field: it reaches whoever reads the PTI alerts page.
//
// CAP-9 BR-05 (BL-178) — `blanketPoRunOut`: a blanket PO whose "new PO needed
// by" week (`blanketPoRules`) falls within 4 weeks or has passed. One alert per
// supplier × material group, on its last (newest) PO; subject = that PO id. PTI-only. High when
// the week is this week or passed, Medium otherwise; impact at that week.
//
// DRC-4 BR-02 / DRC-B7 (BL-190; rewired from CAP-11 BR-04, whose absorbing
// over weeks 5 to 8 is superseded) — `demandAnticipationUnabsorbed`: supply
// above the rolling demand anticipation is more than the last week of the
// horizon can absorb (`planCheck`'s `unabsorbed`, `demandAnticipationRules`).
// One alert per supplier × material; subject = the material; it carries the
// remaining amount. PTI-only. Medium by rule (a surplus is stock PTI will not
// need yet, not a shortage); impact at the end of the horizon's last week.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { CapacityPlan, ForecastCommitmentLine, InventoryAlert, InventoryAlertRule, InventoryPosition, RiskBasis, RiskClass } from '../data/types' */
/** @import { ActorAttribution } from '@lib/enforcement' */
import { deepLink } from '@lib/deepLink';
/** @import { BlanketPoAlertSubject } from './blanketPoRules' */
/** @import { UnabsorbedExcess } from './demandAnticipationRules' */
import { alertGapWeeks } from './capacityRules';
/** @import { AcceptedWeek } from './capacityRules' */
import { DEMAND_ANTICIPATION_RULES } from './demandAnticipationRules';
import { DISCONTINUED_CODE, NOTE_REQUIRED_CODE, isActiveReasonCode } from './reasonCodes';
import {
  addDays,
  coverage,
  dayOf,
  daysBetween,
  isProjectedStockOut,
  isPtiBelowRop,
  isSupplierBelowRop,
  hasLeadTime,
  materialDailyDemand,
  positionDays,
  positionRisk,
  stockFreshness
} from './inventoryRules';

/** @type {readonly InventoryAlertRule[]} */
export const ALERT_RULES = [
  'ptiBelowRop',
  'supplierBelowRop',
  'projectedStockOut',
  'capacityBelowDemand',
  'staleData',
  'coverage',
  'commitmentBelowForecast',
  'leadTimeMissing',
  'callOffNotCovered',
  'supplyDiscontinued',
  'blanketPoRunOut',
  'demandAnticipationUnabsorbed'
];

/**
 * Rules never shown to a supplier: the ones that read PTI stock, the gap in
 * PTI's own master data (the supplier has nothing to act on there), and the
 * planner's stock-side check of confirmed call-offs (MR-6 BR-13), and the
 * "find another source" alert a Discontinued reason raises (CAP-D2).
 * @type {readonly InventoryAlertRule[]}
 */
export const PTI_ONLY_RULES = [
  'ptiBelowRop',
  'projectedStockOut',
  'leadTimeMissing',
  'callOffNotCovered',
  // CAP-D2 — finding another source is PTI's act; the supplier gave the reason.
  'supplyDiscontinued',
  // CAP-9 BR-05 — raising the next PO is PTI's act; the projection is PTI's estimate.
  'blanketPoRunOut',
  // DRC-4 — the demand anticipation and the supply check are PTI's own figures.
  'demandAnticipationUnabsorbed'
];

/** @type {readonly RiskClass[]} */
export const RISK_ORDER = ['high', 'medium', 'low'];

/**
 * @param {InventoryAlertRule} rule
 * @param {string} subject
 * @param {string} supplierId
 * @returns {string}
 */
export const alertKey = (rule, subject, supplierId) => `${rule}|${subject}|${supplierId}`;

/**
 * @param {string} key
 * @returns {{ rule: InventoryAlertRule; subject: string; supplierId: string } | null}
 */
export function parseAlertKey(key) {
  const [rule, subject, supplierId] = key.split('|');
  if (
    !rule ||
    !subject ||
    !supplierId ||
    !(/** @type {readonly string[]} */ (ALERT_RULES).includes(rule))
  )
    return null;
  return { rule: /** @type {InventoryAlertRule} */ (rule), subject, supplierId };
}

/** @typedef {Omit<InventoryAlert, 'status' | 'closedAt' | 'actionNote' | 'closeReason'>} AlertCondition */

/**
 * MR-9 BR-03 — a stock rule whose days cannot be computed (no demand, no
 * figure) has no impact date: it sorts after every dated alert of its class.
 */
export const NO_DAYS_TO_IMPACT = Number.MAX_SAFE_INTEGER;

const DAY_MS = 86_400_000;

/**
 * Days of cover (CR-01, the figure CR-24 classes on); none sorts last.
 * @param {InventoryPosition} p
 * @returns {number}
 */
const coverDays = (p) => positionDays(p) ?? NO_DAYS_TO_IMPACT;

/**
 * Days until PTI stock runs out at the material's daily demand; none sorts last.
 * @param {InventoryPosition} p
 * @param {number} dailyDemand
 * @returns {number}
 */
const stockOutDays = (p, dailyDemand) =>
  p.ptiSoh === null || dailyDemand <= 0 ? NO_DAYS_TO_IMPACT : p.ptiSoh / dailyDemand;

/**
 * MR-9 BR-03 — stale data: minus the whole days since the figure went stale,
 * so the oldest comes first. A figure goes stale at its `staleAt` (Material
 * B1: by update mode; a failed sync no longer makes it stale — owner ruling
 * 2026-09-29), or, on a position without one, when its stale period in days
 * runs out. A supplier that never submitted has no figure at all, so it is
 * the oldest of all.
 * @param {InventoryPosition} p
 * @param {string} nowIso
 * @returns {number}
 */
function staleDaysToImpact(p, nowIso) {
  if (p.lastUpdatedAt === null) return -NO_DAYS_TO_IMPACT;
  const staleFrom = p.staleAt
    ? Date.parse(p.staleAt)
    : Date.parse(p.lastUpdatedAt) + p.updateSla * DAY_MS;
  const since = Math.floor((Date.parse(nowIso) - staleFrom) / DAY_MS);
  return -Math.max(0, since);
}

/**
 * MR-9 BR-03 — capacity: whole days from today to the first gap week the
 * alert counts (INV-D12), 0 once it has begun.
 * @param {CapacityPlan} plan
 * @param {string} nowIso
 * @param {AcceptedWeek} [accepted]
 * @returns {number}
 */
function capacityDaysToImpact(plan, nowIso, accepted) {
  const first = alertGapWeeks(plan, accepted)[0];
  return first ? Math.max(0, daysBetween(dayOf(nowIso), first.week)) : 0;
}

/** A supplier × material with a commitment below forecast beyond tolerance (REQ-E06-03). */
/**
 * `firm`:  True when any of its short periods is in the Firm zone.
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly materialCode: string;
 *   readonly materialLabel: string;
 *   readonly firm: boolean;
 * }} CommitmentShortfallSubject
 */

/**
 * CAP-4 BR-03 — a supplier × material the supplier has said is Discontinued.
 * `daysToImpact`: days from today to the first week or period it said so for.
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly materialCode: string;
 *   readonly materialLabel: string;
 *   readonly daysToImpact: number;
 * }} DiscontinuedSubject
 */

/**
 * CAP-4 BR-03 (CAP-D2) — every supplier × material whose standing answer gives
 * Discontinued for a shortfall: a capacity week below the LTP (for each
 * material of the planning group), or a submitted commitment below forecast.
 * Drafts are never read; a week or period that is no longer short is not one.
 * @param {readonly CapacityPlan[]} plans
 * @param {readonly Pick<ForecastCommitmentLine, 'supplierId' | 'supplierName' | 'materialCode' | 'materialLabel' | 'periodStart' | 'forecastQty' | 'committedQty' | 'response'>[]} lines
 * @param {(materialCode: string) => string} materialLabel
 * @param {string} nowIso
 * @returns {DiscontinuedSubject[]}
 */
export function discontinuedSubjects(plans, lines, materialLabel, nowIso) {
  const today = dayOf(nowIso);
  const out = /** @type {Map<string, DiscontinuedSubject>} */ (new Map());
  /** @param {Omit<DiscontinuedSubject, 'daysToImpact'>} s @param {string} from */
  const add = (s, from) => {
    const days = Math.max(0, daysBetween(today, from));
    const k = `${s.supplierId}|${s.materialCode}`;
    const prev = out.get(k);
    if (!prev || days < prev.daysToImpact) out.set(k, { ...s, daysToImpact: days });
  };
  for (const plan of plans) {
    const week = plan.weeks.find(
      (w) =>
        w.entry !== null && w.entry.reason === DISCONTINUED_CODE && w.entry.allocated < w.demand
    );
    if (!week) continue;
    for (const materialCode of plan.materials) {
      add(
        {
          supplierId: plan.supplierId,
          supplierName: plan.supplierName,
          materialCode,
          materialLabel: materialLabel(materialCode)
        },
        week.week
      );
    }
  }
  for (const l of lines) {
    if (l.response?.rootCause?.level1 !== DISCONTINUED_CODE) continue;
    if (l.committedQty === null || l.committedQty >= l.forecastQty) continue;
    add(
      {
        supplierId: l.supplierId,
        supplierName: l.supplierName,
        materialCode: l.materialCode,
        materialLabel: l.materialLabel
      },
      l.periodStart
    );
  }
  return [...out.values()];
}

/** Confirmed call-off deliveries a supplier × material still has to ship (MR-6 BR-13). */
/**
 * `deliveries`:  Outstanding deliveries, in date order.
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly deliveries: readonly { readonly quantity: number; readonly date: string }[];
 * }} CallOffCoverInput
 */

/** Where a supplier's declared stock falls short of a confirmed call-off (MR-6 BR-13). */
/**
 * `needDate`:  The need date of the first delivery the stock cannot cover.
 * `required`:  Every outstanding delivery up to and including that one.
 * `available`:  Declared SOH plus in production due before the need date.
 *
 * @typedef {{
 *   readonly needDate: string;
 *   readonly required: number;
 *   readonly available: number;
 *   readonly daysToNeed: number;
 * }} CallOffCoverGap
 */

/**
 * MR-6 BR-13 — the first confirmed call-off delivery due within the supplier's
 * lead time (today to today + lead time) that the supplier's declared SOH plus
 * its production due before the need date cannot cover, counting every
 * outstanding delivery due up to then. Null when all are covered, when no lead
 * time is on record (`leadTimeMissing` speaks), or when nothing falls due in
 * the window. A supplier with no stock record has declared nothing: SOH 0.
 * @param {Pick<InventoryPosition, 'supplierSoh' | 'incoming' | 'leadTimeDays'>} p
 * @param {CallOffCoverInput['deliveries']} deliveries
 * @param {string} nowIso
 * @returns {CallOffCoverGap | null}
 */
export function callOffCoverGap(p, deliveries, nowIso) {
  if (!hasLeadTime(p.leadTimeDays)) return null;
  const today = dayOf(nowIso);
  let required = 0;
  for (const d of [...deliveries].sort((a, b) => a.date.localeCompare(b.date))) {
    required += d.quantity;
    const daysToNeed = daysBetween(today, d.date);
    if (daysToNeed > p.leadTimeDays) break;
    if (daysToNeed < 0) continue;
    const production = p.incoming
      .filter((i) => i.source === 'production' && i.date !== null && i.date < d.date)
      .reduce((s, i) => s + i.quantity, 0);
    const available = (p.supplierSoh ?? 0) + production;
    if (required > available) return { needDate: d.date, required, available, daysToNeed };
  }
  return null;
}

/**
 * BR-01 — every alert condition active now. Positions must be PTI's unmasked view.
 * @param {readonly InventoryPosition[]} positions
 * @param {readonly CapacityPlan[]} plans
 * @param {string} nowIso
 * @param {readonly CommitmentShortfallSubject[]} [commitmentShortfalls]
 * @param {readonly CallOffCoverInput[]} [callOffSubjects]
 * @param {readonly DiscontinuedSubject[]} [discontinued]
 * @param {readonly BlanketPoAlertSubject[]} [blanketRunOuts]
 * @param {readonly UnabsorbedAlertSubject[]} [unabsorbed]
 * @param {AcceptedWeek} [acceptedWeek]  INV-D12 — PTI accepted a week's additional capacity.
 * @returns {AlertCondition[]}
 */
export function deriveAlertConditions(
  positions,
  plans,
  nowIso,
  commitmentShortfalls = [],
  callOffSubjects = [],
  discontinued = [],
  blanketRunOuts = [],
  unabsorbed = [],
  acceptedWeek = () => false
) {
  const out = /** @type {Map<string, AlertCondition>} */ (new Map());
  /** @typedef {{ riskClass: RiskClass; basis: RiskBasis }} Risk */
  /**
   * @param {InventoryAlertRule} rule
   * @param {{ supplierId: string; supplierName: string }} p
   * @param {string} subject
   * @param {string} label
   * @param {Risk} risk
   * @param {number} [daysToImpact]
   * @param {InventoryAlert['unabsorbed']} [unabsorbedExcess]
   */
  const push = (rule, p, subject, label, risk, daysToImpact = 0, unabsorbedExcess) => {
    const key = alertKey(rule, subject, p.supplierId);
    if (!out.has(key)) {
      out.set(key, {
        key,
        rule,
        supplierId: p.supplierId,
        supplierName: p.supplierName,
        subject,
        subjectLabel: label,
        riskClass: risk.riskClass,
        riskBasis: risk.basis,
        daysToImpact,
        ...(unabsorbedExcess ? { unabsorbed: unabsorbedExcess } : {})
      });
    }
  };
  /**
   * @param {RiskClass} riskClass
   * @returns {Risk}
   */
  const byRule = (riskClass) => ({ riskClass, basis: { kind: 'rule' } });
  for (const p of positions) {
    const risk = positionRisk(p);
    const dailyDemand = materialDailyDemand(positions, p.materialCode);
    // MR-9 BR-03 — the stock rules: days of cover, or days to the projected stock-out.
    if (isPtiBelowRop(p))
      push('ptiBelowRop', p, p.materialCode, p.materialLabel, risk, coverDays(p));
    // REQ-E08-05 — supplier stock below the SYSTEM ROP Supplier (owner,
    // 2026-10-19; DRC-D15: the supplier-typed ROP is display only and no
    // calculation reads it). No system figure → no alert for the pair.
    if (isSupplierBelowRop(p))
      push('supplierBelowRop', p, p.materialCode, p.materialLabel, risk, coverDays(p));
    if (isProjectedStockOut(p, dailyDemand, nowIso)) {
      push(
        'projectedStockOut',
        p,
        p.materialCode,
        p.materialLabel,
        risk,
        stockOutDays(p, dailyDemand)
      );
    }
    if (stockFreshness(p, nowIso) !== 'current') {
      push(
        'staleData',
        p,
        p.materialCode,
        p.materialLabel,
        byRule('low'),
        staleDaysToImpact(p, nowIso)
      );
    }
    if (coverage(p).status !== 'covered')
      push('coverage', p, p.materialCode, p.materialLabel, risk, coverDays(p));
    // CR-24 — no lead time on record: the class above came from the CR-02
    // fallback, and the master-data gap is an alert of its own, carrying that
    // same fallback class so a Critical material's gap sorts with the Highs.
    if (!hasLeadTime(p.leadTimeDays))
      push('leadTimeMissing', p, p.materialCode, p.materialLabel, risk);
  }
  for (const plan of plans) {
    // INV-D12 (BL-225) — an accepted amber week no longer counts; red always does.
    if (alertGapWeeks(plan, acceptedWeek).length === 0) continue;
    // The group's class is its worst material's, with that material's basis.
    const risks = positions
      .filter((p) => p.supplierId === plan.supplierId && plan.materials.includes(p.materialCode))
      .map(positionRisk);
    const worst = RISK_ORDER.map((c) => risks.find((r) => r.riskClass === c)).find(
      (r) => r !== undefined
    );
    // Material C5 (MR-8 BR-04) — the subject is the planning group; its name is
    // data in the planning group store, resolved where the alert is shown.
    push(
      'capacityBelowDemand',
      plan,
      plan.planningGroupId,
      plan.planningGroupId,
      worst ?? byRule('low'),
      capacityDaysToImpact(plan, nowIso, acceptedWeek)
    );
  }
  // REQ-E08-05 BR-01 — committed quantity below forecast beyond tolerance
  // (CR-21): High when a Firm period is short, Medium for Trade-off only.
  for (const c of commitmentShortfalls) {
    push(
      'commitmentBelowForecast',
      c,
      c.materialCode,
      c.materialLabel,
      byRule(c.firm ? 'high' : 'medium')
    );
  }
  // MR-6 BR-13 — a confirmed call-off inside the lead time the supplier's
  // declared stock cannot cover. Class by CR-24 (the position's), impact at
  // the need date.
  for (const s of callOffSubjects) {
    const p = positions.find(
      (x) => x.supplierId === s.supplierId && x.materialCode === s.materialCode
    );
    if (!p) continue;
    const gap = callOffCoverGap(p, s.deliveries, nowIso);
    if (gap)
      push(
        'callOffNotCovered',
        p,
        p.materialCode,
        p.materialLabel,
        positionRisk(p),
        gap.daysToNeed
      );
  }
  // CAP-4 BR-03 (CAP-D2) — the supplier said Discontinued: find another source.
  for (const d of discontinued) {
    push('supplyDiscontinued', d, d.materialCode, d.materialLabel, byRule('high'), d.daysToImpact);
  }
  // CAP-9 BR-05 — a blanket PO needs its next PO within 4 weeks: raise it.
  for (const b of blanketRunOuts) {
    push('blanketPoRunOut', b, b.poId, b.label, byRule(b.riskClass), b.daysToImpact);
  }
  // DRC-4 BR-02 / DRC-B7 — a surplus the horizon's last week could not absorb, with what is left.
  for (const u of unabsorbed) {
    push(
      'demandAnticipationUnabsorbed',
      u,
      u.materialCode,
      u.materialLabel,
      byRule('medium'),
      u.daysToImpact,
      { qty: u.remaining, uom: u.uom, fromWeeks: u.fromWeeks, intoWeeks: u.intoWeeks }
    );
  }
  return [...out.values()];
}

/**
 * DRC-4 / DRC-B7 — one supplier × material whose surplus outlasts the last
 * week of its horizon. `remaining` is what that week could not take;
 * `fromWeeks` is the horizon and `intoWeeks` its last week.
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly materialCode: string;
 *   readonly materialLabel: string;
 *   readonly uom: string;
 *   readonly remaining: number;
 *   readonly fromWeeks: readonly string[];
 *   readonly intoWeeks: readonly string[];
 *   readonly daysToImpact: number;
 * }} UnabsorbedAlertSubject
 */

/**
 * The alert subjects: one per supplier × material whose unabsorbed surplus
 * reaches `unabsorbedAlertMinQty`. Impact: days from today to the end of the
 * week that could not take it, 0 once passed.
 * @param {readonly UnabsorbedExcess[]} rows
 * @param {string} nowIso
 * @param {{ readonly supplierName: (id: string) => string; readonly materialLabel: (code: string) => string; readonly uom: (code: string) => string }} names
 * @returns {UnabsorbedAlertSubject[]}
 */
export function unabsorbedAlertSubjects(rows, nowIso, names) {
  /** @type {Map<string, UnabsorbedAlertSubject>} */
  const out = new Map();
  for (const r of rows) {
    const k = `${r.supplierId}|${r.materialCode}`;
    const prev = out.get(k);
    const fromWeeks = [...new Set([...(prev?.fromWeeks ?? []), ...r.fromWeeks])].sort();
    const intoWeeks = [...new Set([...(prev?.intoWeeks ?? []), ...r.intoWeeks])].sort();
    const end = addDays(intoWeeks[intoWeeks.length - 1], 6);
    out.set(k, {
      supplierId: r.supplierId,
      supplierName: names.supplierName(r.supplierId),
      materialCode: r.materialCode,
      materialLabel: names.materialLabel(r.materialCode),
      uom: names.uom(r.materialCode),
      remaining: (prev?.remaining ?? 0) + r.remaining,
      fromWeeks,
      intoWeeks,
      daysToImpact: Math.max(0, daysBetween(dayOf(nowIso), end))
    });
  }
  return [...out.values()].filter(
    (s) => s.remaining >= DEMAND_ANTICIPATION_RULES.unabsorbedAlertMinQty
  );
}

/** One ledger entry: a planner's closure, or the moment its condition cleared. */
/**
 * `closeReason`:  MR-9 BR-04 — the `alertClose` code. Absent on a closure recorded before reasons existed.
 *
 * @typedef {{
 *   readonly key: string;
 *   readonly kind: 'closed' | 'cleared';
 *   readonly at: string;
 *   readonly note?: string;
 *   readonly closeReason?: string;
 *   readonly actor?: ActorAttribution;
 * }} AlertLedgerEntry
 */

/**
 * The latest closure of a key that its condition has not cleared since, if any.
 * @param {string} key
 * @param {readonly AlertLedgerEntry[]} ledger
 * @returns {AlertLedgerEntry | null}
 */
export function standingClosure(key, ledger) {
  const mine = ledger.filter((e) => e.key === key);
  const last = mine[mine.length - 1];
  return last && last.kind === 'closed' ? last : null;
}

/**
 * The alerts to show: every active condition exactly once, closed when a
 * standing closure exists (BR-05). A closure whose condition has cleared is
 * history, so a recurrence is a fresh open alert.
 * @param {readonly AlertCondition[]} conditions
 * @param {readonly AlertLedgerEntry[]} ledger
 * @returns {InventoryAlert[]}
 */
export function alertsFromLedger(conditions, ledger) {
  const seen = /** @type {Set<string>} */ (new Set());
  /** @type {InventoryAlert[]} */
  const alerts = [];
  for (const c of conditions) {
    if (seen.has(c.key)) continue;
    seen.add(c.key);
    const closure = standingClosure(c.key, ledger);
    alerts.push(
      closure
        ? {
            ...c,
            status: 'closed',
            closedAt: closure.at,
            ...(closure.note ? { actionNote: closure.note } : {}),
            ...(closure.closeReason ? { closeReason: closure.closeReason } : {})
          }
        : { ...c, status: 'open' }
    );
  }
  return alerts.sort(compareAlerts);
}

/** @typedef {Pick<InventoryAlert, 'riskClass' | 'daysToImpact' | 'supplierName' | 'key'>} Sortable */

/**
 * MR-9 BR-02 — class High to Low, then fewest days to impact, then supplier name.
 * @param {Sortable} a
 * @param {Sortable} b
 * @returns {number}
 */
export function compareAlerts(a, b) {
  return (
    RISK_ORDER.indexOf(a.riskClass) - RISK_ORDER.indexOf(b.riskClass) ||
    a.daysToImpact - b.daysToImpact ||
    a.supplierName.localeCompare(b.supplierName) ||
    a.key.localeCompare(b.key)
  );
}

// ── Closing (MR-9 BR-04 to BR-06) ────────────────────────────────────────────

/** @typedef {'REASON_UNKNOWN' | 'NOTE_REQUIRED'} AlertCloseRefusal */

/**
 * MR-9 BR-04 — why a closure is refused, or null. THE rule: the page's
 * pre-check and the verb's hook `ALERT_CLOSE_REASON_GIVEN` both call it.
 * The reason must be an ACTIVE `alertClose` code, read at the moment of the
 * call (a retired or unknown one is refused); "Other" needs a note.
 * @param {unknown} closeReason
 * @param {unknown} actionNote
 * @returns {AlertCloseRefusal | null}
 */
export function alertCloseRefusal(closeReason, actionNote) {
  if (!isActiveReasonCode('alertClose', closeReason)) return 'REASON_UNKNOWN';
  if (
    closeReason === NOTE_REQUIRED_CODE &&
    (typeof actionNote !== 'string' || actionNote.trim() === '')
  ) {
    return 'NOTE_REQUIRED';
  }
  return null;
}

/**
 * The reason a closed alert counts under: its code, or "Other" for a note-only closure.
 * @param {Pick<InventoryAlert, 'closeReason'>} a
 * @returns {string}
 */
export const closeReasonOf = (a) => a.closeReason ?? NOTE_REQUIRED_CODE;

/**
 * MR-9 BR-06 — closed alerts counted per rule per reason, in first-seen order.
 * @param {readonly InventoryAlert[]} alerts
 * @returns {{ rule: InventoryAlertRule; reason: string; count: number }[]}
 */
export function closeReasonCounts(alerts) {
  const counts =
    /** @type {Map<string, { rule: InventoryAlertRule; reason: string; count: number }>} */ (
      new Map()
    );
  for (const a of alerts) {
    if (a.status !== 'closed') continue;
    const reason = closeReasonOf(a);
    const k = `${a.rule}|${reason}`;
    const row = counts.get(k) ?? { rule: a.rule, reason, count: 0 };
    row.count += 1;
    counts.set(k, row);
  }
  return [...counts.values()];
}

/**
 * The `cleared` entries to append now: closures whose condition is no longer
 * active. Appending them is what lets a recurrence reopen the alert.
 * @param {ReadonlySet<string>} activeKeys
 * @param {readonly AlertLedgerEntry[]} ledger
 * @param {string} at
 * @returns {AlertLedgerEntry[]}
 */
export function clearedSince(activeKeys, ledger, at) {
  const keys = [...new Set(ledger.map((e) => e.key))];
  return keys
    .filter((k) => !activeKeys.has(k) && standingClosure(k, ledger) !== null)
    .map((key) => ({ key, kind: 'cleared', at }));
}

/**
 * Edge case — many alerts from one supplier are grouped under one parent row.
 * A group sits where its most urgent alert sits (MR-9 BR-02, AR-13), so the
 * grouping keeps the order. Its class is its worst alert's.
 * @param {readonly InventoryAlert[]} alerts
 * @returns {{ supplierId: string; supplierName: string; riskClass: RiskClass; alerts: InventoryAlert[] }[]}
 */
export function groupAlertsBySupplier(alerts) {
  const groups =
    /** @type {Map<string, { supplierId: string; supplierName: string; riskClass: RiskClass; alerts: InventoryAlert[] }>} */ (
      new Map()
    );
  // Sorted first: each group's first alert is its most urgent (so also its
  // worst class), and the groups are created in that order.
  for (const a of [...alerts].sort(compareAlerts)) {
    const g = groups.get(a.supplierId) ?? {
      supplierId: a.supplierId,
      supplierName: a.supplierName,
      riskClass: a.riskClass,
      alerts: []
    };
    g.alerts.push(a);
    groups.set(a.supplierId, g);
  }
  return [...groups.values()];
}

/**
 * The destination a My Tasks item or an alert-list row that names this alert
 * links to — the one place either side builds it, so a buyer's "Open
 * inventory" link and a supplier's own list agree on the shape.
 * @param {InventoryAlert} a
 * @param {'buyer' | 'supplier'} persona
 * @returns {string}
 */
export function alertHref(a, persona) {
  if (a.rule === 'capacityBelowDemand') {
    return persona === 'buyer'
      ? deepLink('/buyer/capacity', {
          supplier: a.supplierId,
          planningGroup: a.subject,
          gapsOnly: '1'
        })
      : deepLink('/supplier/capacity', { group: a.subject });
  }
  if (a.rule === 'commitmentBelowForecast') {
    return persona === 'buyer'
      ? deepLink('/buyer/collaboration', { material: a.subject, supplier: a.supplierId })
      : deepLink('/supplier/forecasts', { material: a.subject });
  }
  // These rules are in PTI_ONLY_RULES, so only the buyer side ever links them.
  if (persona === 'buyer') {
    // CAP-D2 — the commitments page is where demand moves to another qualified supplier.
    if (a.rule === 'supplyDiscontinued') {
      return deepLink('/buyer/collaboration', { material: a.subject });
    }
    // CAP-9 BR-05 — the subject is the blanket PO; the call-off page filters to it.
    if (a.rule === 'blanketPoRunOut') {
      return deepLink('/buyer/call-offs', { po: a.subject });
    }
    // DRC-4 — the subject is the material; the page filters to the supplier × material.
    if (a.rule === 'demandAnticipationUnabsorbed') {
      return deepLink('/buyer/demand-anticipation', {
        supplier: a.supplierId,
        material: a.subject
      });
    }
  }
  // A stale-reading position's RISK CLASS can be Medium or High on its own
  // merits — the staleness is a separate, always-Low condition — so linking
  // with `band=<riskClass>` would hide the row whenever the position's real
  // band differs from Low. The destination's own `stale` band is the match.
  const band = a.rule === 'staleData' ? 'stale' : a.riskClass;
  return persona === 'buyer'
    ? deepLink('/buyer/inventory', {
        band,
        material: a.subject,
        highlight: `${a.supplierId}-${a.subject}`
      })
    : deepLink('/supplier/inventory', { highlight: a.subject });
}
