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
// code; `other`, `force-majeure` and `discontinued` need a note (CAP-4).
// All of it is derived at read time from the
// latest submission — nothing here is stored.
//
// Material C5 (MR-8 BR-04, AR-15) — the group is the material's PLANNING group
// (`materialEntry(code).planningGroupId`), not its SAP material group, and a
// group's LTP is the sum of its materials' lines. With no split made each SAP
// group has 1 default planning group holding the same materials, so the plans
// are today's. A move of materials between groups marks the weeks it touched
// "Needs re-entry" (BR-05, `needsReEntry`).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { CapacityPlan, CapacitySubmission, CapacityWeekEntry, ForecastCommitmentLine, PurchaseOrder } from '../data/types' */
/** @import { MaterialMasterEntry } from '../sdc/types' */
/** @import { PlanningGroupEvent } from '../data/types' */
import { needsReEntry } from './planningGroupRules';
import { CAPACITY_HORIZON_WEEKS } from './inventoryConfig';
import { isActiveReasonCode, shortfallReasonNeedsNote } from './reasonCodes';
import { addDays, dayOf, isIsoDay, mondayOf } from './inventoryRules';

/**
 * The 13 Mondays of the capacity horizon, starting with the current week.
 * @param {string} nowIso
 * @returns {string[]}
 */
export function horizonWeeks(nowIso) {
  const first = mondayOf(dayOf(nowIso));
  return Array.from({ length: CAPACITY_HORIZON_WEEKS }, (_, i) => addDays(first, i * 7));
}

/**
 * `ltpLines`:  The current forecast versions' lines — the LTP.
 * `moves`:  Material C5 (MR-8 BR-05) — the planning-group moves, oldest first. None: no split made.
 *
 * @typedef {{
 *   readonly assignments: readonly { readonly supplierId: string; readonly materialCode: string }[];
 *   readonly master: (materialCode: string) => MaterialMasterEntry | null;
 *   readonly supplierName: (supplierId: string) => string;
 *   readonly submissions: readonly CapacitySubmission[];
 *   readonly ltpLines: readonly LtpLine[];
 *   readonly moves?: readonly Extract<PlanningGroupEvent, { kind: 'moved' }>[];
 * }} CapacityInputs
 */

/**
 * A material's planning group: the resolver fills the default, so this is total.
 * @param {MaterialMasterEntry} entry
 * @returns {string}
 */
const groupOf = (entry) => entry.planningGroupId ?? `pg-${entry.materialGroup}`;

/**
 * The latest submission for a supplier × planning group (submission time, then id).
 * @param {readonly CapacitySubmission[]} submissions
 * @param {string} supplierId
 * @param {string} planningGroupId
 * @returns {CapacitySubmission | null}
 */
export function latestSubmission(submissions, supplierId, planningGroupId) {
  const mine = submissions
    .filter((s) => s.supplierId === supplierId && s.planningGroupId === planningGroupId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id));
  return mine[0] ?? null;
}

/**
 * Every supplier × planning group with capacity against demand for the horizon.
 * @param {CapacityInputs} input
 * @param {string} nowIso
 * @returns {CapacityPlan[]}
 */
export function buildCapacityPlans(input, nowIso) {
  const weeks = horizonWeeks(nowIso);
  const moves = input.moves ?? [];
  const groups =
    /** @type {Map<string, { supplierId: string; group: string; materials: string[]; uom: string }>} */ (
      new Map()
    );
  for (const a of input.assignments) {
    const entry = input.master(a.materialCode);
    if (!entry) continue;
    const group = groupOf(entry);
    const key = `${a.supplierId}|${group}`;
    const g = groups.get(key) ?? {
      supplierId: a.supplierId,
      group,
      materials: [],
      uom: entry.canonicalUom
    };
    if (!g.materials.includes(a.materialCode)) g.materials.push(a.materialCode);
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => {
      const latest = latestSubmission(input.submissions, g.supplierId, g.group);
      /** @param {string} code */
      const supplies = (code) =>
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
          ...(latest && needsReEntry(moves, supplies, g.group, latest.submittedAt, week)
            ? { needsReEntry: /** @type {const} */ (true) }
            : {})
        })),
        latest
      };
    })
    .sort(
      (a, b) =>
        a.supplierName.localeCompare(b.supplierName) ||
        a.planningGroupId.localeCompare(b.planningGroupId)
    );
}

/**
 * A week is a gap when the supplier allocated less than PTI's demand.
 * @param {CapacityPlan['weeks'][number]} w
 * @returns {boolean}
 */
export const isGapWeek = (w) => w.entry !== null && w.entry.allocated < w.demand;

/**
 * @param {CapacityPlan} plan
 * @returns {CapacityPlan['weeks']}
 */
export const gapWeeks = (plan) => plan.weeks.filter(isGapWeek);

/**
 * Current = the latest submission states every week of the horizon, and no
 * week needs re-entry after a planning-group move (MR-8 BR-05).
 * @param {CapacityPlan} plan
 * @returns {boolean}
 */
export const isCurrentPlan = (plan) =>
  plan.weeks.every((w) => w.entry !== null && w.needsReEntry !== true);

/**
 * MR-8 BR-05 — the weeks a planning-group move asks the supplier to enter again.
 * @param {CapacityPlan} plan
 * @returns {CapacityPlan['weeks']}
 */
export const reEntryWeeks = (plan) => plan.weeks.filter((w) => w.needsReEntry === true);

/** @typedef {'notStarted' | 'outdated' | 'gap' | 'confirmed'} CapacityConfirmationStatus */

/**
 * A plan's confirmation state: never submitted, not covering the horizon, gap, or confirmed.
 * @param {CapacityPlan} plan
 * @returns {CapacityConfirmationStatus}
 */
export function planStatus(plan) {
  if (!plan.latest) return 'notStarted';
  if (gapWeeks(plan).length > 0) return 'gap';
  if (!isCurrentPlan(plan)) return 'outdated';
  return 'confirmed';
}

/** @type {Record<CapacityConfirmationStatus, number>} */
const STATUS_RANK = { gap: 0, notStarted: 1, outdated: 2, confirmed: 3 };

/**
 * The Order summary "Capacity" confirmation for a PO (REQ-E07-03 with
 * REQ-E08-04): the worst state across the planning groups of its lines.
 * Confirmed only when every group has a current submission with no gap week.
 * @param {Pick<PurchaseOrder, 'supplierId' | 'lineItems'>} po
 * @param {readonly CapacityPlan[]} plans
 * @param {(materialCode: string) => MaterialMasterEntry | null} master
 * @returns {CapacityConfirmationStatus}
 */
export function capacityStatusForPo(po, plans, master) {
  const groups = [
    ...new Set(
      po.lineItems
        .map((li) => {
          const entry = master(li.materialCode);
          return entry ? groupOf(entry) : undefined;
        })
        .filter(/** @returns {g is string} */ (g) => typeof g === 'string')
    )
  ];
  if (groups.length === 0) return 'notStarted';
  /** @type {CapacityConfirmationStatus} */
  let worst = 'confirmed';
  for (const group of groups) {
    const plan = plans.find((p) => p.supplierId === po.supplierId && p.planningGroupId === group);
    const status = plan ? planStatus(plan) : 'notStarted';
    if (STATUS_RANK[status] < STATUS_RANK[worst]) worst = status;
  }
  return worst;
}

/**
 * @typedef {| 'noWeeks'
 *   | 'weekOutsideHorizon'
 *   | 'duplicateWeek'
 *   | 'missingWeek'
 *   | 'invalidQuantity'
 *   | 'reasonRequired'
 *   | 'noteRequired'} CapacityRefusal
 */

/**
 * REQ-E08-04 AC-01 / AC-02 — the submission states every week of the horizon,
 * is well formed, and every week
 * below demand carries a starter reason (and `other`, `force-majeure` or
 * `discontinued` a note — CAP-4 BR-02). The ONE check
 * the policy hook and the page's courtesy mirror both call.
 * @param {readonly unknown[]} weeks
 * @param {(week: string) => number} demandFor
 * @param {readonly string[]} horizon
 * @returns {{ refusal: CapacityRefusal; week?: string } | null}
 */
export function capacitySubmissionRefusal(weeks, demandFor, horizon) {
  if (weeks.length === 0) return { refusal: 'noWeeks' };
  const seen = /** @type {Set<string>} */ (new Set());
  for (const raw of weeks) {
    const w = /** @type {Partial<CapacityWeekEntry> & Record<string, unknown>} */ (raw ?? {});
    if (!isIsoDay(w.week) || !horizon.includes(w.week))
      return { refusal: 'weekOutsideHorizon', week: String(w.week) };
    if (seen.has(w.week)) return { refusal: 'duplicateWeek', week: w.week };
    seen.add(w.week);
    /** @param {unknown} v */
    const validQty = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
    if (!validQty(w.allocated) || (w.upside !== undefined && !validQty(w.upside))) {
      return { refusal: 'invalidQuantity', week: w.week };
    }
    if (/** @type {number} */ (w.allocated) < demandFor(w.week)) {
      if (!isActiveReasonCode('capacityShortfall', w.reason))
        return { refusal: 'reasonRequired', week: w.week };
      if (
        shortfallReasonNeedsNote(w.reason) &&
        (typeof w.note !== 'string' || w.note.trim() === '')
      ) {
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

/**
 * BE — the supplier's total for a week: capacity + additional capacity.
 * @param {Pick<CapacityWeekEntry, 'allocated' | 'upside'>} entry
 * @returns {number}
 */
export const beOf = (entry) => entry.allocated + (entry.upside ?? 0);

/** @typedef {'unconfirmed' | 'within' | 'needsAdditional' | 'cannotSupply'} LtpCapacityLevel */

/**
 * ENG-D18 — where a week's LTP stands against its capacity and BE.
 * @param {number} ltp
 * @param {Pick<CapacityWeekEntry, 'allocated' | 'upside'> | null} entry
 * @returns {LtpCapacityLevel}
 */
export function ltpCapacityLevel(ltp, entry) {
  if (!entry) return 'unconfirmed';
  if (ltp <= entry.allocated) return 'within';
  if (ltp <= beOf(entry)) return 'needsAdditional';
  return 'cannotSupply';
}

/**
 * CAP-3 BR-03 (CAP-D1) — an amber week's additional capacity is confirmed when
 * the supplier said so on that week. Any other level has nothing to confirm,
 * so a stored confirmation on a week that is no longer amber reads false.
 * @param {LtpCapacityLevel} level
 * @param {Pick<CapacityWeekEntry, 'allocated' | 'upside' | 'upsideConfirmed'> | null} entry
 * @returns {boolean}
 */
export const isUpsideConfirmed = (level, entry) =>
  level === 'needsAdditional' && entry?.upsideConfirmed === true;

/**
 * The fields of a forecast line the LTP sum reads. Material C5 — a line joins a
 * capacity group by its MATERIAL (the planning group holds materials), not by
 * the forecast's own `materialGroup`, which stays the forecast's concept.
 */
/**
 * @typedef {Pick<
 *     ForecastCommitmentLine,
 *     'supplierId' | 'materialCode' | 'periodStart' | 'periodEnd' | 'forecastQty'
 *   >} LtpLine
 */

/**
 * @param {string} from
 * @param {string} to
 * @returns {number}
 */
const daysInclusive = (from, to) => {
  let n = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) n += 1;
  return n;
};

/**
 * Days a period and a week (Monday + 6) share.
 * @param {string} periodStart
 * @param {string} periodEnd
 * @param {string} week
 * @returns {number}
 */
function overlapDays(periodStart, periodEnd, week) {
  const from = periodStart > week ? periodStart : week;
  const weekEnd = addDays(week, 6);
  const to = periodEnd < weekEnd ? periodEnd : weekEnd;
  return from > to ? 0 : daysInclusive(from, to);
}

/**
 * The group's LTP for one week: the sum of the supplier's lines for the group's
 * materials, each spread by day. Whole units (MR-8 BR-04: a group's demand is
 * the sum of its materials').
 * @param {readonly LtpLine[]} lines
 * @param {string} supplierId
 * @param {readonly string[]} materials
 * @param {string} week
 * @returns {number}
 */
export function groupWeekLtp(lines, supplierId, materials, week) {
  let total = 0;
  for (const l of lines) {
    if (l.supplierId !== supplierId || !materials.includes(l.materialCode)) continue;
    const shared = overlapDays(l.periodStart, l.periodEnd, week);
    if (shared === 0) continue;
    total += (l.forecastQty * shared) / daysInclusive(l.periodStart, l.periodEnd);
  }
  return Math.round(total);
}

/**
 * `capacity`:  The stated capacity, or null when the week has none.
 * `be`:  Capacity + additional capacity (derived), or null.
 * `upsideConfirmed`:  CAP-3 BR-03 — an amber week whose additional capacity the supplier confirmed.
 *
 * @typedef {{
 *   readonly week: string;
 *   readonly ltp: number;
 *   readonly capacity: number | null;
 *   readonly be: number | null;
 *   readonly level: LtpCapacityLevel;
 *   readonly upsideConfirmed: boolean;
 * }} LtpCapacityWeek
 */

/**
 * ENG-D18 — the LTP (the plan's one demand figure) against capacity and BE, every horizon week.
 * @param {CapacityPlan} plan
 * @returns {LtpCapacityWeek[]}
 */
export function ltpCapacityWeeks(plan) {
  return plan.weeks.map((w) => {
    const ltp = w.demand;
    const level = ltpCapacityLevel(ltp, w.entry);
    return {
      week: w.week,
      ltp,
      capacity: w.entry ? w.entry.allocated : null,
      be: w.entry ? beOf(w.entry) : null,
      level,
      upsideConfirmed: isUpsideConfirmed(level, w.entry)
    };
  });
}

/**
 * Material C5 (MR-8 BR-04) — the supplier's capacity plan for the planning
 * group a material is in, with the group's materials (the LTP a period is
 * checked against sums them). No plan: the group's materials are unknown to
 * capacity, so only the material itself counts.
 * @param {readonly CapacityPlan[]} plans
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {(materialCode: string) => MaterialMasterEntry | null} master
 * @returns {{ planningGroupId: string | null; plan: CapacityPlan | null; materials: readonly string[] }}
 */
export function capacityGroupOfMaterial(plans, supplierId, materialCode, master) {
  const entry = master(materialCode);
  const planningGroupId = entry ? groupOf(entry) : null;
  const plan =
    plans.find((p) => p.supplierId === supplierId && p.planningGroupId === planningGroupId) ?? null;
  return { planningGroupId, plan, materials: plan?.materials ?? [materialCode] };
}

/**
 * The horizon weeks a period touches (Mondays, ascending).
 * @param {string} periodStart
 * @param {string} periodEnd
 * @param {readonly string[]} horizon
 * @returns {string[]}
 */
export function periodHorizonWeeks(periodStart, periodEnd, horizon) {
  return horizon.filter((week) => overlapDays(periodStart, periodEnd, week) > 0);
}

/** @type {Record<LtpCapacityLevel, number>} */
const LEVEL_RANK = { unconfirmed: 0, cannotSupply: 1, needsAdditional: 2, within: 3 };

/**
 * `level`:  Worst level over the horizon weeks the period touches; null when it touches none.
 * `weeks`:  The weeks checked, with their figures.
 * `unconfirmedWeek`:  The first week with no stated capacity, if any.
 * `redWeek`:  The first week above BE, if any.
 * `upsideUnconfirmedWeek`:  CAP-3 BR-03 — the first amber week whose additional capacity is not confirmed, if any.
 *
 * @typedef {{
 *   readonly level: LtpCapacityLevel | null;
 *   readonly weeks: readonly LtpCapacityWeek[];
 *   readonly unconfirmedWeek: string | null;
 *   readonly redWeek: string | null;
 *   readonly upsideUnconfirmedWeek: string | null;
 * }} PeriodCapacityCheck
 */

/**
 * ENG-D18 / ENG-D19 — one period of one supplier × planning group against the
 * group's capacity. `materials` are the group's materials (the plan's). `plan`
 * is null when the supplier has no capacity plan for the group: every horizon
 * week the period touches is then unconfirmed.
 * @param {CapacityPlan | null} plan
 * @param {readonly LtpLine[]} lines
 * @param {string} supplierId
 * @param {readonly string[]} materials
 * @param {string} periodStart
 * @param {string} periodEnd
 * @param {readonly string[]} horizon
 * @returns {PeriodCapacityCheck}
 */
export function periodCapacityCheck(
  plan,
  lines,
  supplierId,
  materials,
  periodStart,
  periodEnd,
  horizon
) {
  const touched = periodHorizonWeeks(periodStart, periodEnd, horizon);
  /** @type {LtpCapacityWeek[]} */
  const weeks = touched.map((week) => {
    const entry = plan?.weeks.find((w) => w.week === week)?.entry ?? null;
    const ltp = groupWeekLtp(lines, supplierId, materials, week);
    const level = ltpCapacityLevel(ltp, entry);
    return {
      week,
      ltp,
      capacity: entry ? entry.allocated : null,
      be: entry ? beOf(entry) : null,
      level,
      upsideConfirmed: isUpsideConfirmed(level, entry)
    };
  });
  const level =
    weeks.length === 0
      ? null
      : weeks.reduce(
          (worst, w) => (LEVEL_RANK[w.level] < LEVEL_RANK[worst] ? w.level : worst),
          /** @type {LtpCapacityLevel} */ ('within')
        );
  return {
    level,
    weeks,
    unconfirmedWeek: weeks.find((w) => w.level === 'unconfirmed')?.week ?? null,
    redWeek: weeks.find((w) => w.level === 'cannotSupply')?.week ?? null,
    upsideUnconfirmedWeek:
      weeks.find((w) => w.level === 'needsAdditional' && !w.upsideConfirmed)?.week ?? null
  };
}

/** @typedef {'capacityNotConfirmed' | 'aboveBeNeedsReason' | 'aboveBeNoteRequired'} CommitmentCapacityRefusal */

/**
 * ENG-D19 — the ONE check the submit policy and the page's Submit all both
 * call: capacity confirmed for every horizon week the period touches, and a
 * starter reason (`other` with a note) when one of them is above BE.
 * @param {PeriodCapacityCheck} check
 * @param {{ readonly level1?: unknown; readonly note?: unknown } | undefined} rootCause
 * @returns {{ refusal: CommitmentCapacityRefusal; week: string } | null}
 */
export function commitmentCapacityRefusal(check, rootCause) {
  if (check.unconfirmedWeek)
    return { refusal: 'capacityNotConfirmed', week: check.unconfirmedWeek };
  if (check.redWeek) {
    if (!rootCause || !isActiveReasonCode('commitmentShortfall', rootCause.level1)) {
      return { refusal: 'aboveBeNeedsReason', week: check.redWeek };
    }
    if (
      shortfallReasonNeedsNote(rootCause.level1) &&
      (typeof rootCause.note !== 'string' || rootCause.note.trim() === '')
    ) {
      return { refusal: 'aboveBeNoteRequired', week: check.redWeek };
    }
  }
  return null;
}
