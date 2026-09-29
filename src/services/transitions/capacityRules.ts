// ─────────────────────────────────────────────────────────────────────────────
// CAPACITY CONFIRMATION RULES — REQ-E08-04.
//
// Capacity is stated per supplier × planning group per week (a supplier line
// shared by several PTI materials is one group), for 13 weekly buckets
// starting the current week (PQ-02 default). Demand per week is THE LTP (owner,
// 2026-09-29): the current forecast version for the supplier's materials in
// the group, summed, each line spread over its period by day (`groupWeekLtp`,
// below). It is the ONE demand figure every capacity surface reads — the gap,
// the reason rule, the Order summary status, the alerts. The SDC-0 publication
// and the planning estimate no longer feed capacity; a material with no LTP
// line has no capacity demand. A week below the LTP needs a starter reason
// code; `other` needs a note. All of it is derived at read time from the
// latest submission — nothing here is stored.
//
// Material C5 (MR-8 BR-04, AR-15) — the group is the material's PLANNING group
// (`materialEntry(code).planningGroupId`), not its SAP material group, and a
// group's LTP is the sum of its materials' lines. With no split made each SAP
// group has 1 default planning group holding the same materials, so the plans
// are today's. A move of materials between groups marks the weeks it touched
// "Needs re-entry" (BR-05, `needsReEntry`).
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CapacityPlan,
  CapacitySubmission,
  CapacityWeekEntry,
  ForecastCommitmentLine,
  PurchaseOrder,
} from '../data/types';
import type { MaterialMasterEntry } from '../sdc/types';
import type { PlanningGroupEvent } from '../data/types';
import { needsReEntry } from './planningGroupRules';
import { CAPACITY_HORIZON_WEEKS } from './inventoryConfig';
import { isActiveReasonCode } from './reasonCodes';
import { addDays, dayOf, isIsoDay, mondayOf } from './inventoryRules';

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
  /** The current forecast versions' lines — the LTP. */
  readonly ltpLines: readonly LtpLine[];
  /** Material C5 (MR-8 BR-05) — the planning-group moves, oldest first. None: no split made. */
  readonly moves?: readonly Extract<PlanningGroupEvent, { kind: 'moved' }>[];
}

/** A material's planning group: the resolver fills the default, so this is total. */
const groupOf = (entry: MaterialMasterEntry): string => entry.planningGroupId ?? `pg-${entry.materialGroup}`;

/** The latest submission for a supplier × planning group (submission time, then id). */
export function latestSubmission(
  submissions: readonly CapacitySubmission[],
  supplierId: string,
  planningGroupId: string,
): CapacitySubmission | null {
  const mine = submissions
    .filter((s) => s.supplierId === supplierId && s.planningGroupId === planningGroupId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id));
  return mine[0] ?? null;
}

/** Every supplier × planning group with capacity against demand for the horizon. */
export function buildCapacityPlans(input: CapacityInputs, nowIso: string): CapacityPlan[] {
  const weeks = horizonWeeks(nowIso);
  const moves = input.moves ?? [];
  const groups = new Map<string, { supplierId: string; group: string; materials: string[]; uom: string }>();
  for (const a of input.assignments) {
    const entry = input.master(a.materialCode);
    if (!entry) continue;
    const group = groupOf(entry);
    const key = `${a.supplierId}|${group}`;
    const g = groups.get(key) ?? { supplierId: a.supplierId, group, materials: [], uom: entry.canonicalUom };
    if (!g.materials.includes(a.materialCode)) g.materials.push(a.materialCode);
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => {
      const latest = latestSubmission(input.submissions, g.supplierId, g.group);
      const supplies = (code: string) =>
        input.assignments.some((a) => a.supplierId === g.supplierId && a.materialCode === code);
      return {
        supplierId: g.supplierId,
        supplierName: input.supplierName(g.supplierId),
        planningGroupId: g.group,
        materials: [...g.materials].sort(),
        uom: g.uom,
        weeks: weeks.map((week) => ({
          week,
          demand: groupWeekLtp(input.ltpLines, g.supplierId, g.materials, week),
          entry: latest?.weeks.find((w) => w.week === week) ?? null,
          ...(latest && needsReEntry(moves, supplies, g.group, latest.submittedAt, week) ? { needsReEntry: true as const } : {}),
        })),
        latest,
      };
    })
    .sort((a, b) => a.supplierName.localeCompare(b.supplierName) || a.planningGroupId.localeCompare(b.planningGroupId));
}

/** A week is a gap when the supplier allocated less than PTI's demand. */
export const isGapWeek = (w: CapacityPlan['weeks'][number]): boolean =>
  w.entry !== null && w.entry.allocated < w.demand;

export const gapWeeks = (plan: CapacityPlan): CapacityPlan['weeks'] => plan.weeks.filter(isGapWeek);

/**
 * Current = the latest submission states every week of the horizon, and no
 * week needs re-entry after a planning-group move (MR-8 BR-05).
 */
export const isCurrentPlan = (plan: CapacityPlan): boolean =>
  plan.weeks.every((w) => w.entry !== null && w.needsReEntry !== true);

/** MR-8 BR-05 — the weeks a planning-group move asks the supplier to enter again. */
export const reEntryWeeks = (plan: CapacityPlan): CapacityPlan['weeks'] => plan.weeks.filter((w) => w.needsReEntry === true);

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
 * REQ-E08-04): the worst state across the planning groups of its lines.
 * Confirmed only when every group has a current submission with no gap week.
 */
export function capacityStatusForPo(
  po: Pick<PurchaseOrder, 'supplierId' | 'lineItems'>,
  plans: readonly CapacityPlan[],
  master: (materialCode: string) => MaterialMasterEntry | null,
): CapacityConfirmationStatus {
  const groups = [
    ...new Set(
      po.lineItems
        .map((li) => {
          const entry = master(li.materialCode);
          return entry ? groupOf(entry) : undefined;
        })
        .filter((g): g is string => typeof g === 'string'),
    ),
  ];
  if (groups.length === 0) return 'notStarted';
  let worst: CapacityConfirmationStatus = 'confirmed';
  for (const group of groups) {
    const plan = plans.find((p) => p.supplierId === po.supplierId && p.planningGroupId === group);
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

// ─────────────────────────────────────────────────────────────────────────────
// BL-133 — CAPACITY BEFORE THE LTP (ENG-D18, ENG-D19; REQ-E08-04 BR-08..BR-11,
// REQ-E06-02 BR-11..BR-13).
//
// The LTP is the current forecast version the supplier commits against. It is
// per MATERIAL and period; capacity is per PLANNING GROUP and week (Material
// C5). They meet at the group × week: the group's LTP for a week is the SUM of the supplier's
// LTP lines for every material of the group, each spread evenly over its
// period by day (a weekly line lands whole in its week; a monthly line lands
// by the days of the month that fall in the week). That sum is compared with
// the week's capacity and BE:
//
//   · BE (the supplier's total) = capacity + additional capacity. DERIVED at
//     read from the week's entry, never stored (`upside` is the additional
//     capacity, REQ-E08-04 BR-05).
//   · LTP ≤ capacity                → within.
//   · capacity < LTP ≤ BE           → needsAdditional (amber). Exactly at BE is
//                                     amber: the supplier can supply it, with
//                                     the additional capacity.
//   · LTP > BE                      → cannotSupply (red).
//   · the week has no stated capacity → unconfirmed.
//
// ENG-D19 — a commitment for a period cannot be SUBMITTED until capacity is
// confirmed for every horizon week the period touches, and a period touching a
// red week needs a reason. Weeks outside the capacity horizon are not asked
// (capacity cannot be stated there), so a period wholly beyond it is not gated.
// Nothing here is stored: every figure is derived from the latest capacity
// submission and the current forecast version.
// ─────────────────────────────────────────────────────────────────────────────

/** BE — the supplier's total for a week: capacity + additional capacity. */
export const beOf = (entry: Pick<CapacityWeekEntry, 'allocated' | 'upside'>): number =>
  entry.allocated + (entry.upside ?? 0);

export type LtpCapacityLevel = 'unconfirmed' | 'within' | 'needsAdditional' | 'cannotSupply';

/** ENG-D18 — where a week's LTP stands against its capacity and BE. */
export function ltpCapacityLevel(
  ltp: number,
  entry: Pick<CapacityWeekEntry, 'allocated' | 'upside'> | null,
): LtpCapacityLevel {
  if (!entry) return 'unconfirmed';
  if (ltp <= entry.allocated) return 'within';
  if (ltp <= beOf(entry)) return 'needsAdditional';
  return 'cannotSupply';
}

/**
 * The fields of a forecast line the LTP sum reads. Material C5 — a line joins a
 * capacity group by its MATERIAL (the planning group holds materials), not by
 * the forecast's own `materialGroup`, which stays the forecast's concept.
 */
export type LtpLine = Pick<
  ForecastCommitmentLine,
  'supplierId' | 'materialCode' | 'periodStart' | 'periodEnd' | 'forecastQty'
>;

const daysInclusive = (from: string, to: string): number => {
  let n = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) n += 1;
  return n;
};

/** Days a period and a week (Monday + 6) share. */
function overlapDays(periodStart: string, periodEnd: string, week: string): number {
  const from = periodStart > week ? periodStart : week;
  const weekEnd = addDays(week, 6);
  const to = periodEnd < weekEnd ? periodEnd : weekEnd;
  return from > to ? 0 : daysInclusive(from, to);
}

/**
 * The group's LTP for one week: the sum of the supplier's lines for the group's
 * materials, each spread by day. Whole units (MR-8 BR-04: a group's demand is
 * the sum of its materials').
 */
export function groupWeekLtp(
  lines: readonly LtpLine[],
  supplierId: string,
  materials: readonly string[],
  week: string,
): number {
  let total = 0;
  for (const l of lines) {
    if (l.supplierId !== supplierId || !materials.includes(l.materialCode)) continue;
    const shared = overlapDays(l.periodStart, l.periodEnd, week);
    if (shared === 0) continue;
    total += (l.forecastQty * shared) / daysInclusive(l.periodStart, l.periodEnd);
  }
  return Math.round(total);
}

export interface LtpCapacityWeek {
  readonly week: string;
  readonly ltp: number;
  /** The stated capacity, or null when the week has none. */
  readonly capacity: number | null;
  /** Capacity + additional capacity (derived), or null. */
  readonly be: number | null;
  readonly level: LtpCapacityLevel;
}

/** ENG-D18 — the LTP (the plan's one demand figure) against capacity and BE, every horizon week. */
export function ltpCapacityWeeks(plan: CapacityPlan): LtpCapacityWeek[] {
  return plan.weeks.map((w) => {
    const ltp = w.demand;
    return {
      week: w.week,
      ltp,
      capacity: w.entry ? w.entry.allocated : null,
      be: w.entry ? beOf(w.entry) : null,
      level: ltpCapacityLevel(ltp, w.entry),
    };
  });
}

/**
 * Material C5 (MR-8 BR-04) — the supplier's capacity plan for the planning
 * group a material is in, with the group's materials (the LTP a period is
 * checked against sums them). No plan: the group's materials are unknown to
 * capacity, so only the material itself counts.
 */
export function capacityGroupOfMaterial(
  plans: readonly CapacityPlan[],
  supplierId: string,
  materialCode: string,
  master: (materialCode: string) => MaterialMasterEntry | null,
): { planningGroupId: string | null; plan: CapacityPlan | null; materials: readonly string[] } {
  const entry = master(materialCode);
  const planningGroupId = entry ? groupOf(entry) : null;
  const plan = plans.find((p) => p.supplierId === supplierId && p.planningGroupId === planningGroupId) ?? null;
  return { planningGroupId, plan, materials: plan?.materials ?? [materialCode] };
}

/** The horizon weeks a period touches (Mondays, ascending). */
export function periodHorizonWeeks(periodStart: string, periodEnd: string, horizon: readonly string[]): string[] {
  return horizon.filter((week) => overlapDays(periodStart, periodEnd, week) > 0);
}

const LEVEL_RANK: Record<LtpCapacityLevel, number> = { unconfirmed: 0, cannotSupply: 1, needsAdditional: 2, within: 3 };

export interface PeriodCapacityCheck {
  /** Worst level over the horizon weeks the period touches; null when it touches none. */
  readonly level: LtpCapacityLevel | null;
  /** The weeks checked, with their figures. */
  readonly weeks: readonly LtpCapacityWeek[];
  /** The first week with no stated capacity, if any. */
  readonly unconfirmedWeek: string | null;
  /** The first week above BE, if any. */
  readonly redWeek: string | null;
}

/**
 * ENG-D18 / ENG-D19 — one period of one supplier × planning group against the
 * group's capacity. `materials` are the group's materials (the plan's). `plan`
 * is null when the supplier has no capacity plan for the group: every horizon
 * week the period touches is then unconfirmed.
 */
export function periodCapacityCheck(
  plan: CapacityPlan | null,
  lines: readonly LtpLine[],
  supplierId: string,
  materials: readonly string[],
  periodStart: string,
  periodEnd: string,
  horizon: readonly string[],
): PeriodCapacityCheck {
  const touched = periodHorizonWeeks(periodStart, periodEnd, horizon);
  const weeks: LtpCapacityWeek[] = touched.map((week) => {
    const entry = plan?.weeks.find((w) => w.week === week)?.entry ?? null;
    const ltp = groupWeekLtp(lines, supplierId, materials, week);
    return {
      week,
      ltp,
      capacity: entry ? entry.allocated : null,
      be: entry ? beOf(entry) : null,
      level: ltpCapacityLevel(ltp, entry),
    };
  });
  const level =
    weeks.length === 0
      ? null
      : weeks.reduce<LtpCapacityLevel>((worst, w) => (LEVEL_RANK[w.level] < LEVEL_RANK[worst] ? w.level : worst), 'within');
  return {
    level,
    weeks,
    unconfirmedWeek: weeks.find((w) => w.level === 'unconfirmed')?.week ?? null,
    redWeek: weeks.find((w) => w.level === 'cannotSupply')?.week ?? null,
  };
}

export type CommitmentCapacityRefusal = 'capacityNotConfirmed' | 'aboveBeNeedsReason' | 'aboveBeNoteRequired';

/**
 * ENG-D19 — the ONE check the submit policy and the page's Submit all both
 * call: capacity confirmed for every horizon week the period touches, and a
 * starter reason (`other` with a note) when one of them is above BE.
 */
export function commitmentCapacityRefusal(
  check: PeriodCapacityCheck,
  rootCause: { readonly level1?: unknown; readonly note?: unknown } | undefined,
): { refusal: CommitmentCapacityRefusal; week: string } | null {
  if (check.unconfirmedWeek) return { refusal: 'capacityNotConfirmed', week: check.unconfirmedWeek };
  if (check.redWeek) {
    if (!rootCause || !isActiveReasonCode('commitmentShortfall', rootCause.level1)) {
      return { refusal: 'aboveBeNeedsReason', week: check.redWeek };
    }
    if (rootCause.level1 === 'other' && (typeof rootCause.note !== 'string' || rootCause.note.trim() === '')) {
      return { refusal: 'aboveBeNoteRequired', week: check.redWeek };
    }
  }
  return null;
}
