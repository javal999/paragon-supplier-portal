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
// Risk class (BR-02, until PQ-03): High when days of supply is Critical (CR-02)
// or coverage is Uncovered (CR-03); Medium when Warning or At risk; Low for any
// other rule, such as stale data. Thresholds live in `inventoryConfig.ts`.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CapacityPlan,
  InventoryAlert,
  InventoryAlertRule,
  InventoryPosition,
  RiskClass,
} from '../data/types';
import type { ActorAttribution } from '../../lib/enforcement';
import { gapWeeks } from './capacityRules';
import {
  coverage,
  isProjectedStockOut,
  isPtiBelowRop,
  isSupplierBelowRop,
  materialDailyDemand,
  positionBand,
  stockFreshness,
} from './inventoryRules';

export const ALERT_RULES: readonly InventoryAlertRule[] = [
  'ptiBelowRop',
  'supplierBelowRop',
  'projectedStockOut',
  'capacityBelowDemand',
  'staleData',
  'coverage',
];

/** Rules that read PTI stock — never shown to a supplier. */
export const PTI_ONLY_RULES: readonly InventoryAlertRule[] = ['ptiBelowRop', 'projectedStockOut'];

export const RISK_ORDER: readonly RiskClass[] = ['high', 'medium', 'low'];

export const alertKey = (rule: InventoryAlertRule, subject: string, supplierId: string): string =>
  `${rule}|${subject}|${supplierId}`;

export function parseAlertKey(key: string): { rule: InventoryAlertRule; subject: string; supplierId: string } | null {
  const [rule, subject, supplierId] = key.split('|');
  if (!rule || !subject || !supplierId || !(ALERT_RULES as readonly string[]).includes(rule)) return null;
  return { rule: rule as InventoryAlertRule, subject, supplierId };
}

/** BR-02 — the class from a position's days-of-supply band and coverage. */
export function positionRiskClass(p: InventoryPosition): RiskClass {
  const band = positionBand(p);
  const cov = coverage(p).status;
  if (band === 'critical' || cov === 'uncovered') return 'high';
  if (band === 'warning' || cov === 'atRisk') return 'medium';
  return 'low';
}

export type AlertCondition = Omit<InventoryAlert, 'status' | 'closedAt' | 'actionNote'>;

/** BR-01 — every alert condition active now. Positions must be PTI's unmasked view. */
export function deriveAlertConditions(
  positions: readonly InventoryPosition[],
  plans: readonly CapacityPlan[],
  nowIso: string,
): AlertCondition[] {
  const out = new Map<string, AlertCondition>();
  const push = (rule: InventoryAlertRule, p: { supplierId: string; supplierName: string }, subject: string, label: string, riskClass: RiskClass) => {
    const key = alertKey(rule, subject, p.supplierId);
    if (!out.has(key)) out.set(key, { key, rule, supplierId: p.supplierId, supplierName: p.supplierName, subject, subjectLabel: label, riskClass });
  };
  for (const p of positions) {
    const cls = positionRiskClass(p);
    if (isPtiBelowRop(p)) push('ptiBelowRop', p, p.materialCode, p.materialLabel, cls);
    if (isSupplierBelowRop(p)) push('supplierBelowRop', p, p.materialCode, p.materialLabel, cls);
    if (isProjectedStockOut(p, materialDailyDemand(positions, p.materialCode), nowIso)) {
      push('projectedStockOut', p, p.materialCode, p.materialLabel, cls);
    }
    if (stockFreshness(p, nowIso) !== 'current') push('staleData', p, p.materialCode, p.materialLabel, 'low');
    if (coverage(p).status !== 'covered') push('coverage', p, p.materialCode, p.materialLabel, cls);
  }
  for (const plan of plans) {
    if (gapWeeks(plan).length === 0) continue;
    const classes = positions
      .filter((p) => p.supplierId === plan.supplierId && plan.materials.includes(p.materialCode))
      .map(positionRiskClass);
    const cls: RiskClass = classes.includes('high') ? 'high' : classes.includes('medium') ? 'medium' : 'low';
    push('capacityBelowDemand', plan, plan.materialGroup, plan.materialGroup, cls);
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
