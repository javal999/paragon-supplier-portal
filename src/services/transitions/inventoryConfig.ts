// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY & CAPACITY THRESHOLDS — the ONE config module (REQ-E08-01 to 05).
//
// Every number the inventory, capacity and alert rules compare against lives
// here, so a threshold is changed in one place (REQ-E08-05 BR-03: configurable
// by ADM; the prototype has no admin screen, so this module is that setting).
// The values are the section 3.6 rules of SUPPLIER-HUB-REQUIREMENTS.md:
//   CR-01 days of supply (30-day demand window), CR-02 bands, CR-03 coverage,
//   REQ-E08-01 data-update SLA (default 7 days, per supplier × material),
//   REQ-E08-04 capacity horizon (PQ-02 default: 13 weekly buckets) and the
//   starter reason codes, REQ-E08-05 BR-02 risk classes (CR-24 lead-time
//   multiple; CR-02 bands as its fallback).
// ─────────────────────────────────────────────────────────────────────────────

import type { CapacityReason } from '../data/types';

/** CR-01 — average daily demand = forecast quantity for the next 30 days ÷ 30. */
export const DEMAND_WINDOW = 30;

/**
 * CR-24 — risk class against the supplier lead time: High when days of cover
 * are below the lead time; Medium below 1.5 × lead time; Low otherwise.
 * "Below" is strict at both cuts: cover EXACTLY at the lead time is Medium, and
 * EXACTLY at 1.5 × lead time is Low (pinned in inventoryRules.test.ts).
 */
export const LEAD_TIME_RISK = Object.freeze({
  mediumBelowMultiple: 1.5,
});

/**
 * CR-02 — Critical below 14; Warning 14 to 29; Healthy 30 to 60; Excess above 60.
 * Since 2026-09-21 a FALLBACK only: the risk class uses these bands where the
 * supplier lead time is missing (CR-24), and that gap raises its own alert.
 */
export const SUPPLY_BANDS = Object.freeze({
  criticalBelow: 14,
  warningBelow: 30,
  healthyUpTo: 60,
});

/** CR-03 — Covered at 1.0 or more; At risk from 0.8 to below 1.0; Uncovered below 0.8. */
export const COVERAGE_THRESHOLDS = Object.freeze({
  coveredFrom: 1,
  atRiskFrom: 0.8,
});

/** REQ-E08-01 open item — until agreed, a supplier figure is stale after 7 days. */
export const DEFAULT_UPDATE_SLA = 7;

/**
 * The data-update SLA per supplier × material, where it differs from the
 * default. The SLA varies because each material moves differently (owner,
 * 2026-09-17). API-connected suppliers sync daily, so their SLA is 1 day.
 */
export const UPDATE_SLA_OVERRIDES: Readonly<Record<string, number>> = Object.freeze({
  'sup-001|RM-COCO-8200': 1,
  'sup-001|RM-LAURIC-7200': 1,
  'sup-003|FR-WARD-4410': 1,
  'sup-003|FR-EMIN-4420': 1,
  'sup-007|PK-PETB-8801': 3,
  'sup-007|PK-PETB-8802': 3,
});

/** The data-update SLA (days) for one supplier × material. */
export function updateSlaFor(supplierId: string, materialCode: string): number {
  return UPDATE_SLA_OVERRIDES[`${supplierId}|${materialCode}`] ?? DEFAULT_UPDATE_SLA;
}

/** REQ-E08-04 BR-03 / PQ-02 — weekly buckets for 13 weeks. */
export const CAPACITY_HORIZON_WEEKS = 13;

/** Section 3.6 starter reason codes; `other` needs a note. */
export const CAPACITY_REASONS: readonly CapacityReason[] = Object.freeze([
  'capacity',
  'material',
  'logistics',
  'quality',
  'other',
]);

export const isCapacityReason = (value: unknown): value is CapacityReason =>
  typeof value === 'string' && (CAPACITY_REASONS as readonly string[]).includes(value);
