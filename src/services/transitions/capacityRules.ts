// ─────────────────────────────────────────────────────────────────────────────
// CAPACITY CONFIRMATION RULES — REQ-E08-04.
//
// Capacity is stated per supplier × material group per week (a supplier line
// shared by several PTI materials is one group), for 13 weekly buckets
// starting the current week (PQ-02 default). Demand per week is PTI's forecast
// for the supplier's materials in the group, prorated by day, with the
// planning estimate where no forecast exists (same rule as CR-01). A week
// below demand needs a starter reason code; `other` needs a note. All of it is
// derived at read time from the latest submission — nothing here is stored.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CapacityPlan,
  CapacitySubmission,
  CapacityWeekEntry,
  PurchaseOrder,
} from '../data/types';
import type { ForecastLine, MaterialMasterEntry } from '../sdc/types';
import { CAPACITY_HORIZON_WEEKS } from './inventoryConfig';
import { isActiveReasonCode } from './reasonCodes';
import { addDays, dayOf, isIsoDay, mondayOf, weekDemand } from './inventoryRules';

/** The 13 Mondays of the capacity horizon, starting with the current week. */
export function horizonWeeks(nowIso: string): string[] {
  const first = mondayOf(dayOf(nowIso));
  return Array.from({ length: CAPACITY_HORIZON_WEEKS }, (_, i) => addDays(first, i * 7));
}

export interface CapacityInputs {
  readonly assignments: readonly { readonly supplierId: string; readonly materialCode: string }[];
  readonly master: (materialCode: string) => MaterialMasterEntry | null;
  readonly supplierName: (supplierId: string) => string;
  readonly submissions: readonly CapacitySubmission[];
  readonly forecastLines: readonly ForecastLine[];
  readonly planningEstimate: (supplierId: string, materialCode: string) => number | null;
}

/** The latest submission for a supplier × group (submission time, then id). */
export function latestSubmission(
  submissions: readonly CapacitySubmission[],
  supplierId: string,
  materialGroup: string,
): CapacitySubmission | null {
  const mine = submissions
    .filter((s) => s.supplierId === supplierId && s.materialGroup === materialGroup)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id));
  return mine[0] ?? null;
}

/** Weekly demand for one supplier × group (rounded to whole units). */
export function groupWeekDemand(
  input: Pick<CapacityInputs, 'forecastLines' | 'planningEstimate'>,
  supplierId: string,
  materials: readonly string[],
  week: string,
): number {
  let total = 0;
  for (const code of materials) {
    const lines = input.forecastLines.filter((l) => l.supplierId === supplierId && l.materialCode === code);
    total += weekDemand(lines, input.planningEstimate(supplierId, code), week);
  }
  return Math.round(total);
}

/** Every supplier × material group with capacity against demand for the horizon. */
export function buildCapacityPlans(input: CapacityInputs, nowIso: string): CapacityPlan[] {
  const weeks = horizonWeeks(nowIso);
  const groups = new Map<string, { supplierId: string; group: string; materials: string[]; uom: string }>();
  for (const a of input.assignments) {
    const entry = input.master(a.materialCode);
    if (!entry) continue;
    const key = `${a.supplierId}|${entry.materialGroup}`;
    const g = groups.get(key) ?? { supplierId: a.supplierId, group: entry.materialGroup, materials: [], uom: entry.canonicalUom };
    if (!g.materials.includes(a.materialCode)) g.materials.push(a.materialCode);
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => {
      const latest = latestSubmission(input.submissions, g.supplierId, g.group);
      return {
        supplierId: g.supplierId,
        supplierName: input.supplierName(g.supplierId),
        materialGroup: g.group,
        materials: [...g.materials].sort(),
        uom: g.uom,
        weeks: weeks.map((week) => ({
          week,
          demand: groupWeekDemand(input, g.supplierId, g.materials, week),
          entry: latest?.weeks.find((w) => w.week === week) ?? null,
        })),
        latest,
      };
    })
    .sort((a, b) => a.supplierName.localeCompare(b.supplierName) || a.materialGroup.localeCompare(b.materialGroup));
}

/** A week is a gap when the supplier allocated less than PTI's demand. */
export const isGapWeek = (w: CapacityPlan['weeks'][number]): boolean =>
  w.entry !== null && w.entry.allocated < w.demand;

export const gapWeeks = (plan: CapacityPlan): CapacityPlan['weeks'] => plan.weeks.filter(isGapWeek);

/** Current = the latest submission states every week of the horizon. */
export const isCurrentPlan = (plan: CapacityPlan): boolean => plan.weeks.every((w) => w.entry !== null);

export type CapacityConfirmationStatus = 'notStarted' | 'outdated' | 'gap' | 'confirmed';

/** A plan's confirmation state: never submitted, not covering the horizon, gap, or confirmed. */
export function planStatus(plan: CapacityPlan): CapacityConfirmationStatus {
  if (!plan.latest) return 'notStarted';
  if (gapWeeks(plan).length > 0) return 'gap';
  if (!isCurrentPlan(plan)) return 'outdated';
  return 'confirmed';
}

const STATUS_RANK: Record<CapacityConfirmationStatus, number> = { gap: 0, notStarted: 1, outdated: 2, confirmed: 3 };

/**
 * The Order summary "Capacity" confirmation for a PO (REQ-E07-03 with
 * REQ-E08-04): the worst state across the material groups of its lines.
 * Confirmed only when every group has a current submission with no gap week.
 */
export function capacityStatusForPo(
  po: Pick<PurchaseOrder, 'supplierId' | 'lineItems'>,
  plans: readonly CapacityPlan[],
  master: (materialCode: string) => MaterialMasterEntry | null,
): CapacityConfirmationStatus {
  const groups = [
    ...new Set(
      po.lineItems.map((li) => master(li.materialCode)?.materialGroup).filter((g): g is string => typeof g === 'string'),
    ),
  ];
  if (groups.length === 0) return 'notStarted';
  let worst: CapacityConfirmationStatus = 'confirmed';
  for (const group of groups) {
    const plan = plans.find((p) => p.supplierId === po.supplierId && p.materialGroup === group);
    const status = plan ? planStatus(plan) : 'notStarted';
    if (STATUS_RANK[status] < STATUS_RANK[worst]) worst = status;
  }
  return worst;
}

export type CapacityRefusal =
  | 'noWeeks'
  | 'weekOutsideHorizon'
  | 'duplicateWeek'
  | 'missingWeek'
  | 'invalidQuantity'
  | 'reasonRequired'
  | 'noteRequired';

/**
 * REQ-E08-04 AC-01 / AC-02 — the submission states every week of the horizon,
 * is well formed, and every week
 * below demand carries a starter reason (and `other` a note). The ONE check
 * the policy hook and the page's courtesy mirror both call.
 */
export function capacitySubmissionRefusal(
  weeks: readonly unknown[],
  demandFor: (week: string) => number,
  horizon: readonly string[],
): { refusal: CapacityRefusal; week?: string } | null {
  if (weeks.length === 0) return { refusal: 'noWeeks' };
  const seen = new Set<string>();
  for (const raw of weeks) {
    const w = (raw ?? {}) as Partial<CapacityWeekEntry> & Record<string, unknown>;
    if (!isIsoDay(w.week) || !horizon.includes(w.week)) return { refusal: 'weekOutsideHorizon', week: String(w.week) };
    if (seen.has(w.week)) return { refusal: 'duplicateWeek', week: w.week };
    seen.add(w.week);
    const validQty = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
    if (!validQty(w.allocated) || (w.upside !== undefined && !validQty(w.upside))) {
      return { refusal: 'invalidQuantity', week: w.week };
    }
    if ((w.allocated as number) < demandFor(w.week)) {
      if (!isActiveReasonCode('capacityShortfall', w.reason)) return { refusal: 'reasonRequired', week: w.week };
      if (w.reason === 'other' && (typeof w.note !== 'string' || w.note.trim() === '')) {
        return { refusal: 'noteRequired', week: w.week };
      }
    }
  }
  const missing = horizon.find((w) => !seen.has(w));
  if (missing) return { refusal: 'missingWeek', week: missing };
  return null;
}
