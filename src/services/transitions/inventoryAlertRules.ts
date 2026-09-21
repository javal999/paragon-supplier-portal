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
// see WHY it is High. Thresholds live in `inventoryConfig.ts`.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CapacityPlan,
  InventoryAlert,
  InventoryAlertRule,
  InventoryPosition,
  RiskBasis,
  RiskClass,
} from '../data/types';
import type { ActorAttribution } from '../../lib/enforcement';
import { gapWeeks } from './capacityRules';
import {
  coverage,
  isProjectedStockOut,
  isPtiBelowRop,
  isSupplierBelowRop,
  hasLeadTime,
  materialDailyDemand,
  positionRisk,
  stockFreshness,
} from './inventoryRules';

export const ALERT_RULES: readonly InventoryAlertRule[] = [
  'ptiBelowRop',
  'supplierBelowRop',
  'projectedStockOut',
  'capacityBelowDemand',
  'staleData',
  'coverage',
  'commitmentBelowForecast',
  'leadTimeMissing',
];

/**
 * Rules never shown to a supplier: the ones that read PTI stock, and the gap in
 * PTI's own master data (the supplier has nothing to act on there).
 */
export const PTI_ONLY_RULES: readonly InventoryAlertRule[] = ['ptiBelowRop', 'projectedStockOut', 'leadTimeMissing'];

export const RISK_ORDER: readonly RiskClass[] = ['high', 'medium', 'low'];

export const alertKey = (rule: InventoryAlertRule, subject: string, supplierId: string): string =>
  `${rule}|${subject}|${supplierId}`;

export function parseAlertKey(key: string): { rule: InventoryAlertRule; subject: string; supplierId: string } | null {
  const [rule, subject, supplierId] = key.split('|');
  if (!rule || !subject || !supplierId || !(ALERT_RULES as readonly string[]).includes(rule)) return null;
  return { rule: rule as InventoryAlertRule, subject, supplierId };
}

export type AlertCondition = Omit<InventoryAlert, 'status' | 'closedAt' | 'actionNote'>;

/** A supplier × material with a commitment below forecast beyond tolerance (REQ-E06-03). */
export interface CommitmentShortfallSubject {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly materialCode: string;
  readonly materialLabel: string;
  /** True when any of its short periods is in the Firm zone. */
  readonly firm: boolean;
}

/** BR-01 — every alert condition active now. Positions must be PTI's unmasked view. */
export function deriveAlertConditions(
  positions: readonly InventoryPosition[],
  plans: readonly CapacityPlan[],
  nowIso: string,
  commitmentShortfalls: readonly CommitmentShortfallSubject[] = [],
): AlertCondition[] {
  const out = new Map<string, AlertCondition>();
  type Risk = { riskClass: RiskClass; basis: RiskBasis };
  const push = (rule: InventoryAlertRule, p: { supplierId: string; supplierName: string }, subject: string, label: string, risk: Risk) => {
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
      });
    }
  };
  const byRule = (riskClass: RiskClass): Risk => ({ riskClass, basis: { kind: 'rule' } });
  for (const p of positions) {
    const risk = positionRisk(p);
    if (isPtiBelowRop(p)) push('ptiBelowRop', p, p.materialCode, p.materialLabel, risk);
    if (isSupplierBelowRop(p)) push('supplierBelowRop', p, p.materialCode, p.materialLabel, risk);
    if (isProjectedStockOut(p, materialDailyDemand(positions, p.materialCode), nowIso)) {
      push('projectedStockOut', p, p.materialCode, p.materialLabel, risk);
    }
    if (stockFreshness(p, nowIso) !== 'current') push('staleData', p, p.materialCode, p.materialLabel, byRule('low'));
    if (coverage(p).status !== 'covered') push('coverage', p, p.materialCode, p.materialLabel, risk);
    // CR-24 — no lead time on record: the class above came from the CR-02
    // fallback, and the master-data gap is an alert of its own, carrying that
    // same fallback class so a Critical material's gap sorts with the Highs.
    if (!hasLeadTime(p.leadTimeDays)) push('leadTimeMissing', p, p.materialCode, p.materialLabel, risk);
  }
  for (const plan of plans) {
    if (gapWeeks(plan).length === 0) continue;
    // The group's class is its worst material's, with that material's basis.
    const risks = positions
      .filter((p) => p.supplierId === plan.supplierId && plan.materials.includes(p.materialCode))
      .map(positionRisk);
    const worst = RISK_ORDER.map((c) => risks.find((r) => r.riskClass === c)).find((r) => r !== undefined);
    push('capacityBelowDemand', plan, plan.materialGroup, plan.materialGroup, worst ?? byRule('low'));
  }
  // REQ-E08-05 BR-01 — committed quantity below forecast beyond tolerance
  // (CR-21): High when a Firm period is short, Medium for Trade-off only.
  for (const c of commitmentShortfalls) {
    push('commitmentBelowForecast', c, c.materialCode, c.materialLabel, byRule(c.firm ? 'high' : 'medium'));
  }
  return [...out.values()];
}

/** One ledger entry: a planner's closure, or the moment its condition cleared. */
export interface AlertLedgerEntry {
  readonly key: string;
  readonly kind: 'closed' | 'cleared';
  readonly at: string;
  readonly note?: string;
  readonly actor?: ActorAttribution;
}

/** The latest closure of a key that its condition has not cleared since, if any. */
export function standingClosure(key: string, ledger: readonly AlertLedgerEntry[]): AlertLedgerEntry | null {
  const mine = ledger.filter((e) => e.key === key);
  const last = mine[mine.length - 1];
  return last && last.kind === 'closed' ? last : null;
}

/**
 * The alerts to show: every active condition exactly once, closed when a
 * standing closure exists (BR-05). A closure whose condition has cleared is
 * history, so a recurrence is a fresh open alert.
 */
export function alertsFromLedger(
  conditions: readonly AlertCondition[],
  ledger: readonly AlertLedgerEntry[],
): InventoryAlert[] {
  const seen = new Set<string>();
  const alerts: InventoryAlert[] = [];
  for (const c of conditions) {
    if (seen.has(c.key)) continue;
    seen.add(c.key);
    const closure = standingClosure(c.key, ledger);
    alerts.push(
      closure
        ? { ...c, status: 'closed', closedAt: closure.at, ...(closure.note ? { actionNote: closure.note } : {}) }
        : { ...c, status: 'open' },
    );
  }
  return alerts.sort(
    (a, b) =>
      RISK_ORDER.indexOf(a.riskClass) - RISK_ORDER.indexOf(b.riskClass) ||
      a.supplierName.localeCompare(b.supplierName) ||
      a.key.localeCompare(b.key),
  );
}

/**
 * The `cleared` entries to append now: closures whose condition is no longer
 * active. Appending them is what lets a recurrence reopen the alert.
 */
export function clearedSince(
  activeKeys: ReadonlySet<string>,
  ledger: readonly AlertLedgerEntry[],
  at: string,
): AlertLedgerEntry[] {
  const keys = [...new Set(ledger.map((e) => e.key))];
  return keys
    .filter((k) => !activeKeys.has(k) && standingClosure(k, ledger) !== null)
    .map((key) => ({ key, kind: 'cleared', at }));
}

/** Edge case — many alerts from one supplier are grouped under one parent row. */
export function groupAlertsBySupplier(
  alerts: readonly InventoryAlert[],
): { supplierId: string; supplierName: string; riskClass: RiskClass; alerts: InventoryAlert[] }[] {
  const groups = new Map<string, { supplierId: string; supplierName: string; riskClass: RiskClass; alerts: InventoryAlert[] }>();
  for (const a of alerts) {
    const g = groups.get(a.supplierId) ?? { supplierId: a.supplierId, supplierName: a.supplierName, riskClass: a.riskClass, alerts: [] };
    g.alerts.push(a);
    if (RISK_ORDER.indexOf(a.riskClass) < RISK_ORDER.indexOf(g.riskClass)) g.riskClass = a.riskClass;
    groups.set(a.supplierId, g);
  }
  return [...groups.values()].sort(
    (a, b) => RISK_ORDER.indexOf(a.riskClass) - RISK_ORDER.indexOf(b.riskClass) || a.supplierName.localeCompare(b.supplierName),
  );
}
