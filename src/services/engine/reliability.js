// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER RELIABILITY AND PTI PLAN-CHANGE MEASURES — REQ-E14-02 (BL-99).
//
// Pure functions over the engine input contract (`./types`). The window and
// the instant "as of" are ARGUMENTS (X-01); the tolerance band is an argument
// with the owner's defaults (ENG-D8, X-05).
//
// ── SUPPLIER MEASURES ───────────────────────────────────────────────────────
//   BR-01 Confirmation rate = PO lines confirmed by their deadline ÷ PO lines
//         whose deadline fell in the window. "Confirmed by the deadline" reads
//         the FIRST confirmation. (Forecast-period commitments are not in the
//         engine contract yet, so only PO lines are counted — see the report.)
//   BR-02 Commitment reliability = quantity received on or before the committed
//         date ÷ committed quantity. The commitment is the LATEST confirmation
//         (BR-04: a re-confirmed change is the new basis). A line PTI cancelled
//         inside the lead time is excluded (edge case).
//
// ── WHO CAUSED A MISS (BR-03, BR-04) — EXACTLY ONE CLASS, BY CONSTRUCTION ───
//   Each line is measured against ONE basis, chosen by the same branch that
//   names its class, so the three classes partition the misses (AC-01):
//     1. never confirmed — no confirmation by the deadline. Basis: what PTI
//        asks for now (quantity and date after every change).
//     2. PTI-caused — confirmed, but PTI then made a QUALIFYING change that the
//        supplier has not re-confirmed. Basis: what PTI asks for now.
//        Qualifying = inside the supplier's lead time (the change was made less
//        than `leadTimeDays` before the requested date in force at that moment)
//        OR a quantity revision beyond the tolerance band — ±10% against the
//        previous value OR ±20% cumulative against the first (ENG-D8).
//        A line PTI cancelled inside the lead time is PTI-caused (edge case).
//     3. supplier-caused — everything else that missed. Basis: the latest
//        confirmation; if PTI made a NON-qualifying change after it (outside
//        the lead time, inside the band) that the supplier did not re-confirm,
//        the supplier is expected to absorb it and the basis is what PTI asks
//        for now (a judgement call — listed for the owner).
//   A line MISSES when less than its basis quantity was received on or before
//   its basis date, and that date is in the window and not after "as of".
//   A partial confirmation is a commitment for the confirmed quantity; the
//   shortfall against the order follows REQ-E06-03, not this measure.
//
// ── PTI'S PLAN-CHANGE MEASURES (BR-05, METHOD-SPEC G1) ──────────────────────
//   · Share of schedules changed inside the supplier lead time (SCOR RL.3.27)
//     = PO lines created in the window with ≥1 PTI change inside the lead time
//       ÷ PO lines created in the window.
//   · MASC (G1, Godahewa et al. 2025), per supplier × material, for each pair
//     of consecutive plan versions v−1, v published in the window:
//
//        MASC = [ (1/k) Σ_p |q_v(p) − q_{v−1}(p)| ]  ÷  S
//
//     over the k periods p both versions carry (the spec's h−1), where the
//     scale S is the in-sample SEASONAL-NAIVE mean absolute error of the
//     material's actual weekly requirement (sales × BOM, the supplier's share):
//
//        S = (1/(n−m)) Σ_{i=m}^{n−1} |y_i − y_{i−m}|,   m = 52 weeks
//
//     (the spec's (1/(t−m−1)) Σ_{i=m+1}^{t−1}, 0-based, over the n = 104 weeks
//     of history). The supplier's MASC is the mean over its material × version
//     pairs. MASC-I is the same numerator against the FIRST version that
//     carried each period, taken on the latest version in the window.
//     S = 0 (no seasonal movement) or n ≤ m has no scale: MASC is null, never 0.
//
// CFOT is not computed HERE: it lives in `./cfot.js` (`agreedCfot`, since
// BL-82), and the reliability read joins it per supplier beside these measures.
// ─────────────────────────────────────────────────────────────────────────────

import { grossRequirement } from './bom';
import { addDays, dayOf, daysBetween, mondayOf } from './dates';
/** @import { LineHistory } from './lines' */
import {
  confirmedByDeadline,
  latestConfirmation,
  lineHistories,
  receivedBy,
  requirementAt
} from './lines';
/** @import { EngineDataset, IsoDate, IsoInstant, PlanVersion, ScheduleChange } from './types' */

// ── Parameters ──────────────────────────────────────────────────────────────

/** ENG-D8 — ±10% per version, ±20% cumulative from first publication. */
/**
 * @typedef {object} ToleranceBand
 * @property {number} perVersion
 * @property {number} cumulative
 */
/** @type {ToleranceBand} */
export const DEFAULT_TOLERANCE_BAND = Object.freeze({ perVersion: 0.1, cumulative: 0.2 });

/** The weeks in a season for the MASC scale. */
export const SEASON_WEEKS = 52;

/**
 * @typedef {object} MeasureWindow
 * @property {IsoDate} from -  First day, inclusive.
 * @property {IsoDate} to -  Last day, inclusive.
 * @property {IsoInstant} asOf -  Nothing after this instant counts as having happened.
 */

/**
 * A trailing window of `weeks` ending on the day of `asOf`.
 * @param {IsoInstant} asOf
 * @param {number} weeks
 * @returns {MeasureWindow}
 */
export function trailingWindow(asOf, weeks) {
  const to = dayOf(asOf);
  return { from: addDays(to, -weeks * 7 + 1), to, asOf };
}

// ── The line-level rules ────────────────────────────────────────────────────

/**
 * "Inside lead time": the change was made less than `leadTimeDays` before the requested date then in force.
 * @param {IsoInstant} changeAt
 * @param {IsoDate} requestedDateThen
 * @param {number} leadTimeDays
 * @returns {boolean}
 */
export function isInsideLeadTime(changeAt, requestedDateThen, leadTimeDays) {
  return daysBetween(dayOf(changeAt), requestedDateThen) < leadTimeDays;
}

/**
 * ENG-D8 — a quantity revision beyond ±perVersion against the previous value or ±cumulative against the first.
 * @param {number} from
 * @param {number} to
 * @param {number} first
 * @param {ToleranceBand} [band]
 * @returns {boolean}
 */
export function breachesToleranceBand(from, to, first, band = DEFAULT_TOLERANCE_BAND) {
  const step = from > 0 ? Math.abs(to - from) / from : to > 0 ? Infinity : 0;
  const total = first > 0 ? Math.abs(to - first) / first : to > 0 ? Infinity : 0;
  return step > band.perVersion + 1e-12 || total > band.cumulative + 1e-12;
}

/** @typedef {'neverConfirmed' | 'ptiCaused' | 'supplierCaused'} MissClass */
/** @type {readonly MissClass[]} */
export const MISS_CLASSES = ['neverConfirmed', 'ptiCaused', 'supplierCaused'];

/**
 * @typedef {object} LineAssessment
 * @property {string} poNumber
 * @property {number} line
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {boolean} confirmedByDeadline
 * @property {boolean} changedInsideLeadTime -  At least one PTI change was made inside the supplier lead time (RL.3.27).
 * @property {boolean} cancelledInsideLeadTime -  PTI cancelled the line (quantity to 0) inside the lead time.
 * @property {boolean} cancelled -  A cancelled line, whenever it was cancelled.
 * @property {MissClass} branch -  The class the line WOULD take if it missed — decided with its basis.
 * @property {number} basisQty
 * @property {IsoDate} basisDate
 * @property {number} onTimeQty
 */

/**
 * A PTI change that shifts responsibility to PTI unless re-confirmed.
 * @param {readonly ScheduleChange[]} changes
 * @param {LineHistory} h
 * @param {number} leadTimeDays
 * @param {ToleranceBand} band
 * @returns {ScheduleChange[]}
 */
function qualifying(changes, h, leadTimeDays, band) {
  /** @type {ScheduleChange[]} */
  const out = [];
  let date = h.line.requestedDate;
  for (const c of changes) {
    if (c.by === 'PTI') {
      const inside = isInsideLeadTime(c.at, date, leadTimeDays);
      const breach =
        c.field === 'quantity' && breachesToleranceBand(c.from, c.to, h.line.orderedQty, band);
      if (inside || breach) out.push(c);
    }
    if (c.field === 'date') date = c.to;
  }
  return out;
}

/**
 * Assess one line: its confirmation, its basis, its would-be class.
 * @param {LineHistory} h
 * @param {number} leadTimeDays
 * @param {IsoInstant} asOf
 * @param {ToleranceBand} [band]
 * @returns {LineAssessment}
 */
export function assessLine(h, leadTimeDays, asOf, band = DEFAULT_TOLERANCE_BAND) {
  const changes = h.changes.filter((c) => c.at <= asOf);
  const confs = h.confirmations.filter((c) => c.confirmedAt <= asOf);
  /** @type {LineHistory} */
  const view = {
    ...h,
    changes,
    confirmations: confs,
    receipts: h.receipts.filter((r) => r.receivedDate <= dayOf(asOf))
  };
  const now = requirementAt(view);
  const onTime = confirmedByDeadline(view);

  // Inside-lead-time changes, reading the requested date in force at each change.
  let dateThen = h.line.requestedDate;
  let changedInside = false;
  let cancelledInside = false;
  for (const c of changes) {
    if (c.by === 'PTI' && isInsideLeadTime(c.at, dateThen, leadTimeDays)) {
      changedInside = true;
      if (c.field === 'quantity' && c.to === 0) cancelledInside = true;
    }
    if (c.field === 'date') dateThen = c.to;
  }

  const q = qualifying(changes, view, leadTimeDays, band);
  const lastQualifying = q[q.length - 1];
  const latest = latestConfirmation(view);
  const reconfirmed =
    lastQualifying !== undefined && confs.some((c) => c.confirmedAt > lastQualifying.at);

  /** @type {MissClass} */
  let branch;
  /** @type {number} */
  let basisQty;
  /** @type {IsoDate} */
  let basisDate;
  if (cancelledInside) {
    branch = 'ptiCaused';
    basisQty = now.qty;
    basisDate = now.date;
  } else if (!onTime) {
    branch = 'neverConfirmed';
    basisQty = now.qty;
    basisDate = now.date;
  } else if (lastQualifying !== undefined && !reconfirmed) {
    branch = 'ptiCaused';
    basisQty = now.qty;
    basisDate = now.date;
  } else {
    branch = 'supplierCaused';
    const changedSince =
      latest !== null && changes.some((c) => c.by === 'PTI' && c.at > latest.confirmedAt);
    basisQty = changedSince || latest === null ? now.qty : latest.confirmedQty;
    basisDate = changedSince || latest === null ? now.date : latest.confirmedDate;
  }
  return {
    poNumber: h.line.poNumber,
    line: h.line.line,
    supplierId: h.line.supplierId,
    materialCode: h.line.materialCode,
    confirmedByDeadline: onTime,
    changedInsideLeadTime: changedInside,
    cancelledInsideLeadTime: cancelledInside,
    cancelled: now.qty === 0,
    branch,
    basisQty,
    basisDate,
    onTimeQty: Math.min(basisQty, receivedBy(view, basisDate))
  };
}

/**
 * Did an assessed line miss, as of the window's instant? A cancelled-inside-lead-time line always did.
 * @param {LineAssessment} a
 * @param {IsoInstant} asOf
 * @returns {boolean}
 */
export function isMissed(a, asOf) {
  if (a.cancelledInsideLeadTime) return true;
  if (a.cancelled) return false;
  return a.basisDate <= dayOf(asOf) && a.onTimeQty < a.basisQty;
}

// ── Aggregates ──────────────────────────────────────────────────────────────

/**
 * @typedef {object} ConfirmationMeasure
 * @property {number} due
 * @property {number} confirmed
 * @property {number | null} rate -  0–1, null when nothing was due.
 */

/**
 * @typedef {object} CommitmentMeasure
 * @property {number} lines
 * @property {number} committedQty
 * @property {number} onTimeQty
 * @property {number | null} rate
 */

/**
 * @typedef {object} MissSplit
 * @property {number} total
 * @property {number} neverConfirmed
 * @property {number} ptiCaused
 * @property {number} supplierCaused
 */

/**
 * @typedef {object} PlanChangeMeasure
 * @property {number} schedules
 * @property {number} changedInsideLeadTime
 * @property {number | null} share -  RL.3.27, 0–1; null with no schedules.
 * @property {number | null} masc -  Mean MASC over material × consecutive-version pairs; null with none measurable.
 * @property {number | null} mascI -  Mean MASC-I over materials; null with none measurable.
 */

/**
 * @typedef {object} SupplierReliability
 * @property {string} supplierId
 * @property {ConfirmationMeasure} confirmation
 * @property {CommitmentMeasure} commitment
 * @property {MissSplit} misses
 * @property {PlanChangeMeasure} planChange -  PTI's own plan changes on this supplier's materials (BR-05, BR-07).
 */

/**
 * @param {number} num
 * @param {number} den
 * @returns {number | null}
 */
const rate = (num, den) => (den > 0 ? num / den : null);
/**
 * @param {IsoDate} d
 * @param {MeasureWindow} w
 */
const inWindow = (d, w) => d >= w.from && d <= w.to && d <= dayOf(w.asOf);

/**
 * BR-01 over a set of assessed lines.
 * @param {readonly { a: LineAssessment; h: LineHistory }[]} lines
 * @param {MeasureWindow} w
 * @returns {ConfirmationMeasure}
 */
export function confirmationMeasure(lines, w) {
  let due = 0;
  let confirmed = 0;
  for (const { a, h } of lines) {
    const deadline = h.line.confirmDeadline;
    if (deadline > w.asOf || !inWindow(dayOf(deadline), w)) continue;
    // A line PTI cancelled before its deadline needed no confirmation.
    if (
      a.cancelled &&
      h.changes.some((c) => c.field === 'quantity' && c.to === 0 && c.at <= deadline)
    )
      continue;
    due += 1;
    if (a.confirmedByDeadline) confirmed += 1;
  }
  return { due, confirmed, rate: rate(confirmed, due) };
}

/**
 * BR-02 over a set of lines: against the latest confirmation.
 * @param {readonly { a: LineAssessment; h: LineHistory }[]} lines
 * @param {MeasureWindow} w
 * @returns {CommitmentMeasure}
 */
export function commitmentMeasure(lines, w) {
  let n = 0;
  let committedQty = 0;
  let onTimeQty = 0;
  for (const { a, h } of lines) {
    if (a.cancelledInsideLeadTime || a.cancelled) continue;
    const c = latestConfirmation({
      ...h,
      confirmations: h.confirmations.filter((x) => x.confirmedAt <= w.asOf)
    });
    if (!c || !inWindow(c.confirmedDate, w) || c.confirmedQty <= 0) continue;
    const received = h.receipts.filter(
      (r) => r.receivedDate <= c.confirmedDate && r.receivedDate <= dayOf(w.asOf)
    );
    n += 1;
    committedQty += c.confirmedQty;
    onTimeQty += Math.min(
      c.confirmedQty,
      received.reduce((s, r) => s + r.receivedQty, 0)
    );
  }
  return { lines: n, committedQty, onTimeQty, rate: rate(onTimeQty, committedQty) };
}

/**
 * BR-03 — the missed lines in the window, one class each.
 * @param {readonly LineAssessment[]} assessed
 * @param {MeasureWindow} w
 * @returns {MissSplit}
 */
export function missSplit(assessed, w) {
  const split = { total: 0, neverConfirmed: 0, ptiCaused: 0, supplierCaused: 0 };
  for (const a of assessed) {
    if (!inWindow(a.basisDate, w) || !isMissed(a, w.asOf)) continue;
    split.total += 1;
    split[a.branch] += 1;
  }
  return split;
}

// ── MASC ────────────────────────────────────────────────────────────────────

/**
 * In-sample seasonal-naive MAE of a series (the MASC scale). Null when it cannot scale.
 * @param {readonly number[]} series
 * @param {number} [m]
 * @returns {number | null}
 */
export function seasonalNaiveScale(series, m = SEASON_WEEKS) {
  if (series.length <= m) return null;
  let sum = 0;
  for (let i = m; i < series.length; i += 1) sum += Math.abs(series[i] - series[i - m]);
  const mae = sum / (series.length - m);
  return mae > 0 ? mae : null;
}

/**
 * Mean absolute change over the periods both versions carry, ÷ scale. Null with no overlap or no scale.
 * @param {ReadonlyMap<IsoDate, number>} previous
 * @param {ReadonlyMap<IsoDate, number>} next
 * @param {number | null} scale
 * @returns {number | null}
 */
export function masc(previous, next, scale) {
  if (scale === null || scale <= 0) return null;
  let sum = 0;
  let k = 0;
  for (const [period, q] of next) {
    const before = previous.get(period);
    if (before === undefined) continue;
    sum += Math.abs(q - before);
    k += 1;
  }
  return k > 0 ? sum / k / scale : null;
}

/**
 * @param {readonly number[]} xs
 * @returns {number | null}
 */
const mean = (xs) => (xs.length > 0 ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

/**
 * MASC and MASC-I for one supplier × material's plan history in the window.
 * @param {readonly PlanVersion[]} versions
 * @param {number | null} scale
 * @param {MeasureWindow} w
 * @returns {{ masc: number[]; mascI: number | null }}
 */
export function planChangeForMaterial(versions, scale, w) {
  const byVersion = /** @type {Map<number, Map<IsoDate, number>>} */ (new Map());
  const publishedAt = /** @type {Map<number, IsoInstant>} */ (new Map());
  for (const v of versions) {
    if (v.publishedAt > w.asOf) continue;
    const m = byVersion.get(v.versionNo) ?? /** @type {Map<IsoDate, number>} */ (new Map());
    m.set(v.periodBucket, v.quantity);
    byVersion.set(v.versionNo, m);
    publishedAt.set(v.versionNo, v.publishedAt);
  }
  const order = [...byVersion.keys()].sort((a, b) => a - b);
  /** @type {number[]} */
  const out = [];
  const firstSeen = /** @type {Map<IsoDate, number>} */ (new Map());
  /** @type {number | null} */
  let latestInWindow = null;
  order.forEach((vNo, i) => {
    const cur = /** @type {Map<string, number>} */ (byVersion.get(vNo));
    for (const [p, q] of cur) if (!firstSeen.has(p)) firstSeen.set(p, q);
    if (
      !inWindow(
        dayOf(
          /** @type {NonNullable<ReturnType<typeof publishedAt.get>>} */ (publishedAt.get(vNo))
        ),
        w
      )
    )
      return;
    latestInWindow = vNo;
    if (i === 0) return;
    const value = masc(
      /** @type {Map<string, number>} */ (byVersion.get(order[i - 1])),
      cur,
      scale
    );
    if (value !== null) out.push(value);
  });
  /** @type {number | null} */
  let mascI = null;
  if (latestInWindow !== null) {
    const latest = /** @type {Map<string, number>} */ (byVersion.get(latestInWindow));
    // Against the first version that carried each period — only periods that
    // an EARLIER version already carried count (a new period has no drift).
    const first = /** @type {Map<IsoDate, number>} */ (new Map());
    for (const [p] of latest) {
      const earliest = order.find(
        (vNo) =>
          vNo < /** @type {NonNullable<typeof latestInWindow>} */ (latestInWindow) &&
          /** @type {Map<string, number>} */ (byVersion.get(vNo)).has(p)
      );
      if (earliest !== undefined)
        first.set(
          p,
          /** @type {NonNullable<ReturnType<(NonNullable<ReturnType<typeof byVersion.get>>)['get']>>} */ (
            /** @type {Map<string, number>} */ (byVersion.get(earliest)).get(p)
          )
        );
    }
    mascI = masc(first, latest, scale);
  }
  return { masc: out, mascI };
}

// ── The per-supplier read ───────────────────────────────────────────────────

/**
 * @typedef {object} ReliabilityOptions
 * @property {ToleranceBand} [band]
 */

/**
 * Every line assessed, with the lead time its source states. Refuses a line with no source by name.
 * @param {EngineDataset} data
 * @param {IsoInstant} asOf
 * @param {ToleranceBand} [band]
 * @returns {{ a: LineAssessment; h: LineHistory }[]}
 */
export function assessAll(data, asOf, band = DEFAULT_TOLERANCE_BAND) {
  const lt = new Map(
    data.sources.map((s) => [`${s.supplierId}|${s.materialCode}`, s.leadTimeDays])
  );
  return lineHistories(data)
    .filter((h) => h.line.createdAt <= asOf)
    .map((h) => {
      const leadTimeDays = lt.get(`${h.line.supplierId}|${h.line.materialCode}`);
      if (leadTimeDays === undefined) {
        throw new Error(
          `NO_SOURCE: ${h.line.poNumber}/${h.line.line} — '${h.line.supplierId}' has no source for '${h.line.materialCode}'`
        );
      }
      return { a: assessLine(h, leadTimeDays, asOf, band), h };
    });
}

/**
 * REQ-E14-02 per supplier over the window, sorted by supplier id.
 * @param {EngineDataset} data
 * @param {MeasureWindow} w
 * @param {ReliabilityOptions} [opts]
 * @returns {SupplierReliability[]}
 */
export function supplierReliability(data, w, opts = {}) {
  const assessed = assessAll(data, w.asOf, opts.band);
  const requirement = grossRequirement(
    data.sales.filter((s) => s.weekStart <= dayOf(w.asOf)),
    data.bom
  );
  const salesWeeks = [...new Set(data.sales.map((s) => s.weekStart))]
    .filter((d) => d <= dayOf(w.asOf))
    .sort();
  const lastWeek = mondayOf(dayOf(w.asOf));
  const historyWeeks = salesWeeks.filter((d) => d < lastWeek);
  const suppliers = [...new Set(data.sources.map((s) => s.supplierId))].sort();

  return suppliers.map((supplierId) => {
    const mine = assessed.filter((x) => x.a.supplierId === supplierId);
    const created = mine.filter((x) => inWindow(dayOf(x.h.line.createdAt), w));
    const changed = created.filter((x) => x.a.changedInsideLeadTime).length;

    /** @type {number[]} */
    const mascs = [];
    /** @type {number[]} */
    const mascIs = [];
    for (const src of data.sources.filter((s) => s.supplierId === supplierId)) {
      const series = historyWeeks.map(
        (d) => (requirement.get(src.materialCode)?.get(d) ?? 0) * src.share
      );
      const scale = seasonalNaiveScale(series);
      const r = planChangeForMaterial(
        data.planVersions.filter(
          (v) => v.supplierId === supplierId && v.materialCode === src.materialCode
        ),
        scale,
        w
      );
      mascs.push(...r.masc);
      if (r.mascI !== null) mascIs.push(r.mascI);
    }

    return {
      supplierId,
      confirmation: confirmationMeasure(mine, w),
      commitment: commitmentMeasure(mine, w),
      misses: missSplit(
        mine.map((x) => x.a),
        w
      ),
      planChange: {
        schedules: created.length,
        changedInsideLeadTime: changed,
        share: rate(changed, created.length),
        masc: mean(mascs),
        mascI: mean(mascIs)
      }
    };
  });
}

/**
 * The same measures over every supplier together (the portfolio line).
 * @param {readonly SupplierReliability[]} rows
 * @returns {Omit<SupplierReliability, 'supplierId' | 'planChange'> & { readonly planChange: Pick<PlanChangeMeasure, 'schedules' | 'changedInsideLeadTime' | 'share'>; }}
 */
export function portfolioReliability(rows) {
  /** @param {(r: SupplierReliability) => number} f */
  const sum = (f) => rows.reduce((s, r) => s + f(r), 0);
  const due = sum((r) => r.confirmation.due);
  const confirmed = sum((r) => r.confirmation.confirmed);
  const committedQty = sum((r) => r.commitment.committedQty);
  const onTimeQty = sum((r) => r.commitment.onTimeQty);
  const schedules = sum((r) => r.planChange.schedules);
  const changed = sum((r) => r.planChange.changedInsideLeadTime);
  return {
    confirmation: { due, confirmed, rate: rate(confirmed, due) },
    commitment: {
      lines: sum((r) => r.commitment.lines),
      committedQty,
      onTimeQty,
      rate: rate(onTimeQty, committedQty)
    },
    misses: {
      total: sum((r) => r.misses.total),
      neverConfirmed: sum((r) => r.misses.neverConfirmed),
      ptiCaused: sum((r) => r.misses.ptiCaused),
      supplierCaused: sum((r) => r.misses.supplierCaused)
    },
    planChange: { schedules, changedInsideLeadTime: changed, share: rate(changed, schedules) }
  };
}
