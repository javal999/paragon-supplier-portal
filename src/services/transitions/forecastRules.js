// ─────────────────────────────────────────────────────────────────────────────
// FORECAST COLLABORATION RULES — REQ-E06-01, REQ-E06-02, REQ-E06-03.
//
// Pure functions only: data in, view out, nothing reads a clock unless the
// instant is passed in. Settings live in `forecastConfig.js`.
//
//   · Publication (E06-01): the period grid per material type (weekly for 13
//     weeks then monthly for packaging; monthly for raw material), the zone of
//     each period per supplier × material group, version comparison, and the
//     forecast download.
//   · Commitment (E06-02): the below-forecast reason rule (the verb's policy
//     calls it), CR-21 tolerance per zone, the CR-26 split deadline (1 or 3
//     working days on the hub calendar) with its reminder and lateness, the
//     commitment template and row-by-row upload check, and the
//     re-publication carry-forward: a commitment stays with a period whose
//     quantity did not change, and a changed period returns to awaiting.
//   · Gap monitoring (E06-03): gap quantity and percentage, the CR-22 colour,
//     cumulative forecast against commitment, the ranked exception list, and
//     the demand move to another supplier.
//
// A commitment is a RequirementResponse (the SDC spine): drafts, the planner's
// revision log and the snapshot binding are that object's. Every state below —
// awaiting, accepted, exception, overdue — is derived at read time.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { DisputeEntry, ForecastLine, ForecastPublication, ForecastStream, MaterialMasterEntry, Provenance, RequirementResponse } from '../sdc/types' */
/** @import { CapacityReason, CommitmentState, ForecastCommitmentLine, ForecastZone } from '../data/types' */
/** @import { WorkingCalendar } from '@lib/workingCalendar' */
import { addWorkingDays } from '@lib/workingCalendar';
import { hubWorkingCalendar } from './workingCalendarStore';
import { normalizeQty } from '@lib/localeNumber';
/** @import { ZoneLengths } from './forecastConfig' */
import {
  commitmentDeadlineWorkingDays,
  commitmentTolerance,
  FORECAST_HORIZON,
  gapColourThresholds,
  REMINDER_FRACTION,
  STREAM_MATERIAL_TYPE,
  zoneLengthsFor
} from './forecastConfig';
import { isActiveReasonCode } from './reasonCodes';

const DAY_MS = 86_400_000;

// ── Calendar days (`YYYY-MM-DD`) ─────────────────────────────────────────────

/**
 * @param {string} day
 * @param {number} n
 * @returns {string}
 */
const addDay = (day, n) =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + n * DAY_MS).toISOString().slice(0, 10);

/**
 * @param {string} from
 * @param {string} to
 * @returns {number}
 */
const daysFrom = (from, to) =>
  Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS);

/**
 * The calendar date of an instant in PTI's working-calendar zone (WIB).
 * @param {string} iso
 * @returns {string}
 */
export const publicationDay = (iso) =>
  new Date(Date.parse(iso) + hubWorkingCalendar().utcOffsetHours * 3_600_000)
    .toISOString()
    .slice(0, 10);

/**
 * @param {string} day
 * @returns {string}
 */
const lastDayOfMonth = (day) => {
  const [y, m] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

/**
 * @param {string} day
 * @param {number} n
 * @returns {string}
 */
const addMonths = (day, n) => {
  const [y, m, d] = day.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d, last)))
    .toISOString()
    .slice(0, 10);
};

/**
 * The Monday on or after `day`.
 * @param {string} day
 * @returns {string}
 */
export function mondayOnOrAfter(day) {
  const dow = new Date(`${day}T00:00:00.000Z`).getUTCDay(); // 0 = Sunday
  return addDay(day, dow === 1 ? 0 : dow === 0 ? 1 : 8 - dow);
}

/**
 * The first day of a month on or after `day`.
 * @param {string} day
 * @returns {string}
 */
export function firstOfMonthOnOrAfter(day) {
  return day.endsWith('-01') ? day : addDay(lastDayOfMonth(day), 1);
}

// ── Periods (REQ-E06-01 BR-03) ───────────────────────────────────────────────

/** @typedef {'week' | 'month'} PeriodKind */

/**
 * `id`:  A week is named by its Monday (`YYYY-MM-DD`); a month by `YYYY-MM`.
 *
 * @typedef {{
 *     readonly id: string;
 *     readonly kind: PeriodKind;
 *     readonly start: string;
 *     readonly end: string;
 *   }} ForecastPeriod
 */

/**
 * @param {string} bucket
 * @returns {PeriodKind}
 */
export const periodKindOf = (bucket) => (/^\d{4}-\d{2}-\d{2}$/.test(bucket) ? 'week' : 'month');

/**
 * The calendar bounds of a bucket as named (a month bucket is the whole month).
 * @param {string} bucket
 * @returns {{ start: string; end: string }}
 */
export function periodBounds(bucket) {
  if (periodKindOf(bucket) === 'week') return { start: bucket, end: addDay(bucket, 6) };
  const start = `${bucket}-01`;
  return { start, end: lastDayOfMonth(start) };
}

/**
 * The period grid for a publication. Packaging: 13 weekly periods from the
 * Monday on or after publication, then monthly periods up to 6 months from the
 * first period. Raw material: 6 monthly periods from the first of the month on
 * or after publication. A leftover of fewer than 7 days between the last week
 * and the next month joins that month, so every day of the horizon belongs to
 * exactly one period.
 * @param {ForecastStream} stream
 * @param {string} publishedAt
 * @param {{ readonly weeklyPeriods: number; readonly horizonMonths: number }} [horizon]
 * @returns {ForecastPeriod[]}
 */
export function generatePeriods(stream, publishedAt, horizon = FORECAST_HORIZON[stream]) {
  const day = publicationDay(publishedAt);
  /** @type {ForecastPeriod[]} */
  const periods = [];
  const first = horizon.weeklyPeriods > 0 ? mondayOnOrAfter(day) : firstOfMonthOnOrAfter(day);
  const horizonEnd = addDay(addMonths(first, horizon.horizonMonths), -1);
  for (let i = 0; i < horizon.weeklyPeriods; i++) {
    const start = addDay(first, i * 7);
    periods.push({ id: start, kind: 'week', start, end: addDay(start, 6) });
  }
  let cursor = horizon.weeklyPeriods > 0 ? addDay(first, horizon.weeklyPeriods * 7) : first;
  while (cursor <= horizonEnd) {
    let monthEnd = lastDayOfMonth(cursor);
    // A stub shorter than a week joins the following month.
    if (daysFrom(cursor, monthEnd) + 1 < 7 && addDay(monthEnd, 1) <= horizonEnd)
      monthEnd = lastDayOfMonth(addDay(monthEnd, 1));
    periods.push({ id: monthEnd.slice(0, 7), kind: 'month', start: cursor, end: monthEnd });
    cursor = addDay(monthEnd, 1);
  }
  return periods;
}

// ── Zones (REQ-E06-01 BR-04, BR-05) ──────────────────────────────────────────

/**
 * The zone of a period that starts on `periodStart`, for a publication on `publishedDay`.
 * @param {string} periodStart
 * @param {string} publishedDay
 * @param {ZoneLengths} lengths
 * @returns {ForecastZone}
 */
export function zoneFor(periodStart, publishedDay, lengths) {
  const offset = daysFrom(publishedDay, periodStart);
  if (offset < lengths.firmDays) return 'firm';
  if (offset < lengths.firmDays + lengths.tradeOffDays) return 'tradeOff';
  return 'forecast';
}

/**
 * The requirement's zone names over the SDC commitment classes.
 * @param {ForecastLine['commitmentClass']} cls
 * @returns {ForecastZone}
 */
export const zoneOfClass = (cls) =>
  cls === 'firm' ? 'firm' : cls === 'semi-firm' ? 'tradeOff' : 'forecast';

/**
 * @param {ForecastZone} zone
 * @returns {ForecastLine['commitmentClass']}
 */
export const classOfZone = (zone) =>
  zone === 'firm' ? 'firm' : zone === 'tradeOff' ? 'semi-firm' : 'visibility-only';

// ── Building a version (REQ-E06-01) ──────────────────────────────────────────

/** One supplier's share of a material's demand. */
/**
 * `share`:  Share of the material's demand allocated to this supplier (0–1).
 *
 * @typedef {{
 *     readonly supplierId: string;
 *     readonly materialCode: string;
 *     readonly share: number;
 *   }} ForecastSource
 */

/** @type {Provenance} */
const PROV_SEED = Object.freeze({ source: 'SOMO', liveness: 'SIMULATED', planState: 'PLANNED' });

/**
 * @param {number} n
 * @returns {number}
 */
const roundTo100 = (n) => Math.round(n / 100) * 100;

/**
 * `demand`:  Total demand for a material in a period (before the supplier split).
 *
 * @typedef {{
 *     readonly stream: ForecastStream;
 *     readonly version: number;
 *     readonly publishedAt: string;
 *     readonly sources: readonly ForecastSource[];
 *     readonly master: (materialCode: string) => MaterialMasterEntry | null;
 *     readonly demand: (materialCode: string, period: ForecastPeriod, index: number) => number;
 *     readonly emergency?: boolean;
 *     readonly changeNote?: string;
 *   }} BuildVersionInput
 */

/**
 * @param {ForecastStream} stream
 * @param {number} version
 * @returns {string}
 */
export const publicationIdFor = (stream, version) =>
  `FC-${stream === 'packaging' ? 'PK' : 'RM'}-V${version}`;

/**
 * A published version: every source × period with its zone and quantity.
 * @param {BuildVersionInput} input
 * @returns {ForecastPublication}
 */
export function buildVersion(input) {
  const periods = generatePeriods(input.stream, input.publishedAt);
  const day = publicationDay(input.publishedAt);
  const type = STREAM_MATERIAL_TYPE[input.stream];
  /** @type {ForecastLine[]} */
  const lines = [];
  for (const source of input.sources) {
    const entry = input.master(source.materialCode);
    if (!entry || entry.materialType !== type) continue;
    periods.forEach((period, index) => {
      const total = input.demand(source.materialCode, period, index);
      const zone = zoneFor(
        period.start,
        day,
        zoneLengthsFor(source.supplierId, entry.materialGroup, entry.materialType)
      );
      lines.push({
        materialCode: source.materialCode,
        supplierId: source.supplierId,
        periodBucket: period.id,
        forecastQty: roundTo100(total * source.share),
        uom: entry.canonicalUom,
        commitmentClass: classOfZone(zone),
        allocation: {
          materialPeriodTotal: roundTo100(total),
          basis: 'quota',
          ...(zone === 'firm' ? { approvedBy: 'planner', approvedAt: input.publishedAt } : {})
        },
        provenance: PROV_SEED
      });
    });
  }
  return {
    publicationId: publicationIdFor(input.stream, input.version),
    planVersion: `${input.stream === 'packaging' ? 'PK' : 'RM'}-${publicationDay(input.publishedAt)}-V${input.version}`,
    publishedAt: input.publishedAt,
    horizon: periods.map((p) => p.id),
    lines,
    provenance: PROV_SEED,
    stream: input.stream,
    version: input.version,
    ...(input.emergency ? { emergency: true } : {}),
    ...(input.changeNote ? { changeNote: input.changeNote } : {})
  };
}

/**
 * Versions of one stream, oldest first.
 * @param {readonly ForecastPublication[]} publications
 * @param {ForecastStream} stream
 * @returns {ForecastPublication[]}
 */
export function streamVersions(publications, stream) {
  return publications
    .filter((p) => p.stream === stream)
    .sort(
      (a, b) => (a.version ?? 0) - (b.version ?? 0) || a.publishedAt.localeCompare(b.publishedAt)
    );
}

/**
 * @param {ForecastLine} a
 * @param {Pick<ForecastLine, 'supplierId' | 'materialCode' | 'periodBucket'>} b
 */
const sameLine = (a, b) =>
  a.supplierId === b.supplierId &&
  a.materialCode === b.materialCode &&
  a.periodBucket === b.periodBucket;

/**
 * The simulated next plan from SAP for a re-publication: a new period grid from
 * `publishedAt`. Firm quantities never change (BR-04); a period already
 * published keeps its quantity and supplier split (including a planner's
 * reassignment), except that every third later period moves 5% (a
 * deterministic stand-in for the planning run); a new period takes the base
 * demand split by the sources.
 * @param {ForecastPublication} current
 * @param {Omit<BuildVersionInput, 'stream' | 'version' | 'demand'> & { readonly baseDemand: (materialCode: string, period: ForecastPeriod) => number; }} input
 * @returns {ForecastPublication}
 */
export function republishVersion(current, input) {
  const stream = current.stream ?? 'packaging';
  const version = (current.version ?? 0) + 1;
  const draft = buildVersion({
    ...input,
    stream,
    version,
    demand: (code, period) => input.baseDemand(code, period)
  });
  const lines = draft.lines.flatMap((line) => {
    const previous = current.lines.find((l) => sameLine(l, line));
    if (!previous) {
      // A period the current version already plans for this material, but not
      // with this supplier, was moved away by the planner: it stays moved.
      const planned = current.lines.some(
        (l) => l.materialCode === line.materialCode && l.periodBucket === line.periodBucket
      );
      return planned || line.forecastQty === 0 ? [] : [line];
    }
    const index = draft.horizon.indexOf(line.periodBucket);
    const moves = zoneOfClass(line.commitmentClass) !== 'firm' && index % 3 === version % 3;
    const forecastQty = moves ? roundTo100(previous.forecastQty * 1.05) : previous.forecastQty;
    return [
      {
        ...line,
        forecastQty,
        allocation: {
          ...line.allocation,
          materialPeriodTotal: Math.max(line.allocation.materialPeriodTotal, forecastQty)
        }
      }
    ];
  });
  return { ...draft, lines };
}

/**
 * REQ-E06-03 BR-05 — move one period's quantity from one supplier to another
 * that supplies the material, as a new version. The receiving supplier gets a
 * new line (or an increased one) in the same zone; every other line is copied.
 * @param {ForecastPublication} current
 * @param {{ readonly materialCode: string; readonly periodBucket: string; readonly fromSupplierId: string; readonly toSupplierId: string; readonly note: string; }} move
 * @param {string} publishedAt
 * @returns {ForecastPublication | null}
 */
export function reassignVersion(current, move, publishedAt) {
  const from = current.lines.find((l) => sameLine(l, { ...move, supplierId: move.fromSupplierId }));
  if (!from || move.fromSupplierId === move.toSupplierId) return null;
  const existing = current.lines.find((l) =>
    sameLine(l, { ...move, supplierId: move.toSupplierId })
  );
  /** @type {ForecastLine[]} */
  const lines = current.lines
    .filter((l) => l !== from)
    .map((l) => (l === existing ? { ...l, forecastQty: l.forecastQty + from.forecastQty } : l));
  if (!existing) lines.push({ ...from, supplierId: move.toSupplierId });
  const version = (current.version ?? 0) + 1;
  const stream = current.stream ?? 'packaging';
  return {
    ...current,
    publicationId: publicationIdFor(stream, version),
    planVersion: `${stream === 'packaging' ? 'PK' : 'RM'}-${publicationDay(publishedAt)}-V${version}`,
    publishedAt,
    version,
    lines,
    changeNote: move.note,
    emergency: undefined
  };
}

// ── Version comparison (REQ-E06-01 BR-06) ────────────────────────────────────

/** @typedef {'changed' | 'added' | 'removed'} ChangeKind */

/**
 * @typedef {{
 *     readonly supplierId: string;
 *     readonly materialCode: string;
 *     readonly periodBucket: string;
 *     readonly kind: ChangeKind;
 *     readonly previousQty: number | null;
 *     readonly currentQty: number | null;
 *   }} PeriodChange
 */

/**
 * The periods whose quantity moved between two versions, for one supplier (or
 * all). A period that simply rolled off the start of the horizon is not a
 * change.
 * @param {ForecastPublication} current
 * @param {ForecastPublication | null} previous
 * @param {string} [supplierId]
 * @returns {PeriodChange[]}
 */
export function versionChanges(current, previous, supplierId) {
  if (!previous) return [];
  /** @param {ForecastLine} l */
  const mine = (l) => supplierId === undefined || l.supplierId === supplierId;
  const firstStart = current.horizon.length > 0 ? periodBounds(current.horizon[0]).start : '';
  /** @type {PeriodChange[]} */
  const out = [];
  for (const line of current.lines.filter(mine)) {
    const prev = previous.lines.find((l) => sameLine(l, line));
    if (!prev)
      out.push({ ...pick(line), kind: 'added', previousQty: null, currentQty: line.forecastQty });
    else if (prev.forecastQty !== line.forecastQty)
      out.push({
        ...pick(line),
        kind: 'changed',
        previousQty: prev.forecastQty,
        currentQty: line.forecastQty
      });
  }
  for (const prev of previous.lines.filter(mine)) {
    if (current.lines.some((l) => sameLine(l, prev))) continue;
    if (periodBounds(prev.periodBucket).end < firstStart) continue;
    out.push({ ...pick(prev), kind: 'removed', previousQty: prev.forecastQty, currentQty: null });
  }
  return out.sort(
    (a, b) =>
      a.materialCode.localeCompare(b.materialCode) ||
      a.periodBucket.localeCompare(b.periodBucket) ||
      a.supplierId.localeCompare(b.supplierId)
  );
}

/** @param {ForecastLine} l */
function pick(l) {
  return {
    supplierId: l.supplierId,
    materialCode: l.materialCode,
    periodBucket: l.periodBucket
  };
}

// ── Commitment rules (REQ-E06-02) ────────────────────────────────────────────

/** @typedef {'reasonRequired' | 'noteRequired'} ShortfallRefusal */

/**
 * BR-04 / AC-02 — a commitment below forecast needs a starter reason code, and
 * `other` needs a note. The verb's policy calls this, so the rule holds for
 * every channel (screen, upload, or a hand-made dispatch).
 * @param {number} forecastQty
 * @param {number} committedQty
 * @param {{ readonly level1?: unknown; readonly note?: unknown } | undefined} rootCause
 * @returns {ShortfallRefusal | null}
 */
export function shortfallRefusal(forecastQty, committedQty, rootCause) {
  if (committedQty >= forecastQty) return null;
  if (!rootCause || !isActiveReasonCode('commitmentShortfall', rootCause.level1))
    return 'reasonRequired';
  if (
    rootCause.level1 === 'other' &&
    (typeof rootCause.note !== 'string' || rootCause.note.trim() === '')
  )
    return 'noteRequired';
  return null;
}

/** @typedef {'within' | 'outside' | 'acknowledgementOnly'} ToleranceOutcome */

/**
 * CR-21 — Firm: any shortfall is an exception. Trade-off: up to 10% below
 * forecast is accepted automatically (exactly 10% is within). Forecast:
 * acknowledgement only.
 * @param {ForecastZone} zone
 * @param {number} forecastQty
 * @param {number} committedQty
 * @returns {ToleranceOutcome}
 */
export function toleranceOutcome(zone, forecastQty, committedQty) {
  if (zone === 'forecast') return 'acknowledgementOnly';
  const tol = commitmentTolerance();
  const allowed = zone === 'firm' ? tol.firmShortfall : tol.tradeOffShortfall;
  const shortfall = forecastQty - committedQty;
  return shortfall <= forecastQty * allowed + 1e-9 ? 'within' : 'outside';
}

/**
 * CR-26 / BR-07 — Firm periods are due 1 working day after publication;
 * Trade-off and Forecast periods 3 working days after. Both count on the hub's
 * working calendar (BL-50), so a holiday the administrator adds moves them.
 * @param {ForecastZone} zone
 * @param {string} publishedAt
 * @param {WorkingCalendar} [cal]
 * @returns {string}
 */
export function commitmentDueAt(zone, publishedAt, cal = hubWorkingCalendar()) {
  const deadlines = commitmentDeadlineWorkingDays();
  const days = zone === 'firm' ? deadlines.firm : deadlines.other;
  return addWorkingDays(publishedAt, days, cal).toISOString();
}

/**
 * REQ-E06-03 BR-06 — the first reminder, at half the time to the deadline.
 * @param {string} publishedAt
 * @param {string} dueAt
 * @returns {string}
 */
export function commitmentReminderAt(publishedAt, dueAt) {
  const start = Date.parse(publishedAt);
  return new Date(start + (Date.parse(dueAt) - start) * REMINDER_FRACTION).toISOString();
}

/** @typedef {'open' | 'dueSoon' | 'overdue'} DeadlineState */

/**
 * Where a line stands against its deadline now. Only a line still awaiting the
 * supplier has one; overdue is the escalation to the planner. Never stored.
 * @param {Pick<ForecastCommitmentLine, 'state' | 'dueAt' | 'reminderAt'>} line
 * @param {string} nowIso
 * @returns {DeadlineState | null}
 */
export function deadlineState(line, nowIso) {
  if (line.state !== 'awaiting') return null;
  const now = Date.parse(nowIso);
  if (now >= Date.parse(line.dueAt)) return 'overdue';
  if (now >= Date.parse(line.reminderAt)) return 'dueSoon';
  return 'open';
}

/**
 * CR-26 · BL-48 — where a line stands against its deadline, as the screens say
 * it: time left, late by, or whether the standing commitment arrived in time.
 * DERIVED AT READ from the instant passed in; nothing here is stored (law 0.5).
 *
 * The window closes AT the deadline instant, as `deadlineState` has it: the
 * last on-time moment is one millisecond before `dueAt`. A submitted
 * commitment is judged against the deadline of the version it ANSWERED
 * (`responseDueAt`), so a commitment carried forward from an earlier version
 * keeps the verdict it earned there.
 */
/**
 * @typedef {| { readonly kind: 'open'; readonly msLeft: number }
 *   | { readonly kind: 'late'; readonly msLate: number }
 *   | { readonly kind: 'submittedOnTime' }
 *   | { readonly kind: 'submittedLate'; readonly msLate: number }} CommitmentTiming
 */

/**
 * @param {Pick<ForecastCommitmentLine, 'state' | 'dueAt' | 'response' | 'responseDueAt'>} line
 * @param {string} nowIso
 * @returns {CommitmentTiming}
 */
export function commitmentTiming(line, nowIso) {
  const submittedAt = line.response?.submittedAt;
  if (line.state !== 'awaiting' && submittedAt) {
    const due = Date.parse(line.responseDueAt ?? line.dueAt);
    const at = Date.parse(submittedAt);
    return at >= due ? { kind: 'submittedLate', msLate: at - due } : { kind: 'submittedOnTime' };
  }
  const diff = Date.parse(line.dueAt) - Date.parse(nowIso);
  // `Math.abs`, not `-diff`: at the deadline instant `-0` would leak out.
  return diff > 0 ? { kind: 'open', msLeft: diff } : { kind: 'late', msLate: Math.abs(diff) };
}

/**
 * The state of a line from the response that stands for its current quantity.
 * @param {ForecastZone} zone
 * @param {number} forecastQty
 * @param {RequirementResponse | null} response
 * @returns {CommitmentState}
 */
export function commitmentState(zone, forecastQty, response) {
  if (!response) return 'awaiting';
  if (zone === 'forecast') return 'acknowledged';
  if (response.acknowledgment || !response.forecastConfirmation) return 'awaiting';
  if (response.status === 'Accepted') return 'acceptedByPlanner';
  if (response.status === 'Disputed') return 'revisionRequested';
  return toleranceOutcome(zone, forecastQty, response.forecastConfirmation.confirmedQty) ===
    'within'
    ? 'accepted'
    : 'exception';
}

// ── The commitment lines (join, carry-forward) ───────────────────────────────

/**
 * `draftsFor`:  Include this supplier's own drafts (never PTI's view — BR-10).
 * `qualifiedSuppliers`:  Suppliers qualified for a material (REQ-E06-03 BR-05).
 *
 * @typedef {{
 *     readonly publications: readonly ForecastPublication[];
 *     readonly responses: readonly RequirementResponse[];
 *     readonly master: (materialCode: string) => MaterialMasterEntry | null;
 *     readonly supplierName: (supplierId: string) => string;
 *     readonly draftsFor?: string | null;
 *     readonly qualifiedSuppliers?: (materialCode: string) => readonly string[];
 *   }} CommitmentInputs
 */

/** @param {Pick<ForecastLine, 'supplierId' | 'materialCode' | 'periodBucket'>} l */
const lineKey = (l) => `${l.supplierId}|${l.materialCode}|${l.periodBucket}`;

/**
 * Every line of the CURRENT version of each stream with its commitment state.
 *
 * Re-publication (REQ-E06-02 edge case): a submitted commitment to an earlier
 * version still stands when that period's quantity did not change; when it
 * changed, the period returns to awaiting commitment. This is the SDC-1
 * carry-forward rule (`consolidationRows`), applied per stream.
 *
 * Deadlines count from the current version's publication (BR-07): a period
 * still awaiting a commitment is asked for again with every new version.
 * @param {CommitmentInputs} input
 * @returns {ForecastCommitmentLine[]}
 */
export function buildCommitmentLines(input) {
  /** @type {ForecastCommitmentLine[]} */
  const out = [];
  const streams = [
    ...new Set(
      input.publications
        .map((p) => p.stream)
        .filter(/** @returns {s is ForecastStream} */ (s) => !!s)
    )
  ];
  for (const stream of streams) {
    const versions = streamVersions(input.publications, stream);
    const current = versions[versions.length - 1];
    const previous = versions.length > 1 ? versions[versions.length - 2] : null;
    const ids = new Set(versions.map((v) => v.publicationId));
    const ordered = input.responses
      .map((r, index) => ({ r, index }))
      .filter(({ r }) => ids.has(r.publicationId))
      .sort(
        (a, b) => (b.r.submittedAt ?? '').localeCompare(a.r.submittedAt ?? '') || a.index - b.index
      )
      .map(({ r }) => r);

    for (const line of current.lines) {
      const entry = input.master(line.materialCode);
      const zone = zoneOfClass(line.commitmentClass);
      const bounds = periodBounds(line.periodBucket);
      const mine = ordered.filter((r) => lineKey(r) === lineKey(line));
      /** @type {RequirementResponse | null} */
      let response = null;
      /** @type {string | null} */
      let responseDueAt = null;
      let carriedForward = false;
      const submitted = mine.find((r) => r.status !== 'Draft');
      if (submitted) {
        const answered = versions.find((v) => v.publicationId === submitted.publicationId);
        const answeredLine = answered?.lines.find((l) => sameLine(l, line));
        if (submitted.publicationId === current.publicationId) response = submitted;
        else if (answeredLine && answeredLine.forecastQty === line.forecastQty) {
          response = submitted;
          carriedForward = true;
        }
        // CR-26 — the deadline the standing commitment ANSWERED: its own
        // version's publication and its line's zone in that version.
        if (response && answered && answeredLine) {
          responseDueAt = commitmentDueAt(
            zoneOfClass(answeredLine.commitmentClass),
            answered.publishedAt
          );
        }
      }
      const draft =
        input.draftsFor && input.draftsFor === line.supplierId
          ? (mine.find((r) => r.status === 'Draft' && r.publicationId === current.publicationId) ??
            null)
          : null;
      /** @type {DisputeEntry[]} */
      const log = mine
        .flatMap((r) => r.disputeResponse ?? [])
        .sort((a, b) => a.at.localeCompare(b.at));
      const dueAt = commitmentDueAt(zone, current.publishedAt);
      out.push({
        key: `${current.publicationId}|${lineKey(line)}`,
        stream,
        publicationId: current.publicationId,
        planVersion: current.planVersion,
        version: current.version ?? 0,
        supplierId: line.supplierId,
        supplierName: input.supplierName(line.supplierId),
        materialCode: line.materialCode,
        materialLabel: entry?.label ?? line.materialCode,
        materialGroup: entry?.materialGroup ?? '',
        uom: line.uom,
        periodBucket: line.periodBucket,
        periodStart: bounds.start,
        periodEnd: bounds.end,
        zone,
        forecastQty: line.forecastQty,
        previousQty: previous?.lines.find((l) => sameLine(l, line))?.forecastQty ?? null,
        publishedAt: current.publishedAt,
        dueAt,
        reminderAt: commitmentReminderAt(current.publishedAt, dueAt),
        state: commitmentState(zone, line.forecastQty, response),
        response,
        responseDueAt,
        carriedForward,
        draft,
        committedQty: response?.forecastConfirmation?.confirmedQty ?? null,
        log,
        otherQualifiedSuppliers: (input.qualifiedSuppliers?.(line.materialCode) ?? [])
          .filter((id) => id !== line.supplierId)
          .map((supplierId) => ({ supplierId, supplierName: input.supplierName(supplierId) }))
      });
    }
  }
  return out.sort(
    (a, b) =>
      a.stream.localeCompare(b.stream) ||
      a.supplierName.localeCompare(b.supplierName) ||
      a.materialCode.localeCompare(b.materialCode) ||
      a.periodStart.localeCompare(b.periodStart)
  );
}

// ── Gap monitoring (REQ-E06-03) ──────────────────────────────────────────────

/** @typedef {'green' | 'amber' | 'red'} GapColour */

/**
 * CR-22 — commitment ÷ forecast: Green at 1.0 or more; Amber from 0.8 to below 1.0; Red below 0.8.
 * @param {number} ratio
 * @returns {GapColour}
 */
export function gapColour(ratio) {
  const colours = gapColourThresholds();
  if (ratio >= colours.greenFrom) return 'green';
  if (ratio >= colours.amberFrom) return 'amber';
  return 'red';
}

/**
 * `qty`:  Commitment − forecast.
 * `pct`:  (commitment − forecast) ÷ forecast.
 * `overCommit`:  Edge case — more than forecast in the Firm zone: information, not an error.
 *
 * @typedef {{
 *     readonly qty: number;
 *     readonly pct: number;
 *     readonly ratio: number;
 *     readonly colour: GapColour;
 *     readonly overCommit: boolean;
 *   }} CommitmentGap
 */

/**
 * BR-01 / BR-02 — the gap of one period. No forecast counts as covered.
 * @param {ForecastZone} zone
 * @param {number} forecastQty
 * @param {number} committedQty
 * @returns {CommitmentGap}
 */
export function commitmentGap(zone, forecastQty, committedQty) {
  const ratio = forecastQty > 0 ? committedQty / forecastQty : 1;
  return {
    qty: committedQty - forecastQty,
    pct: forecastQty > 0 ? (committedQty - forecastQty) / forecastQty : 0,
    ratio,
    colour: gapColour(ratio),
    overCommit: zone === 'firm' && committedQty > forecastQty
  };
}

/**
 * BR-03 — cumulative forecast and commitment over the periods that need a commitment.
 * @param {readonly Pick<ForecastCommitmentLine, 'periodBucket' | 'periodStart' | 'zone' | 'forecastQty' | 'committedQty' | 'state'>[]} lines
 * @returns {{ periodBucket: string; cumulativeForecast: number; cumulativeCommitment: number }[]}
 */
export function cumulativeCommitment(lines) {
  let f = 0;
  let c = 0;
  const byPeriod = /** @type {Map<string, { start: string; forecast: number; commit: number }>} */ (
    new Map()
  );
  for (const l of lines) {
    if (l.zone === 'forecast') continue;
    const p = byPeriod.get(l.periodBucket) ?? { start: l.periodStart, forecast: 0, commit: 0 };
    p.forecast += l.forecastQty;
    p.commit += l.state === 'awaiting' ? 0 : (l.committedQty ?? 0);
    byPeriod.set(l.periodBucket, p);
  }
  return [...byPeriod.entries()]
    .sort((a, b) => a[1].start.localeCompare(b[1].start))
    .map(([periodBucket, p]) => {
      f += p.forecast;
      c += p.commit;
      return { periodBucket, cumulativeForecast: f, cumulativeCommitment: c };
    });
}

/**
 * An exception for the planner: outside tolerance, or a commitment missing past its deadline.
 * @param {ForecastCommitmentLine} line
 * @param {string} nowIso
 * @returns {boolean}
 */
export function isException(line, nowIso) {
  return line.state === 'exception' || deadlineState(line, nowIso) === 'overdue';
}

/**
 * BR-04 — exceptions ranked: overdue first, then Firm zone, then the lowest
 * days of supply (CR-01) for the material; then the earliest period.
 * @param {readonly ForecastCommitmentLine[]} lines
 * @param {string} nowIso
 * @param {(materialCode: string) => number | null} daysOfSupplyOf
 * @returns {ForecastCommitmentLine[]}
 */
export function rankExceptions(lines, nowIso, daysOfSupplyOf) {
  /** @param {string} code */
  const dos = (code) => daysOfSupplyOf(code) ?? Number.POSITIVE_INFINITY;
  return lines
    .filter((l) => isException(l, nowIso))
    .sort(
      (a, b) =>
        Number(deadlineState(b, nowIso) === 'overdue') -
          Number(deadlineState(a, nowIso) === 'overdue') ||
        Number(b.zone === 'firm') - Number(a.zone === 'firm') ||
        dos(a.materialCode) - dos(b.materialCode) ||
        a.periodStart.localeCompare(b.periodStart) ||
        a.supplierName.localeCompare(b.supplierName)
    );
}

/**
 * REQ-E08-05 BR-01 — committed below forecast beyond tolerance, per supplier × material.
 * @param {readonly ForecastCommitmentLine[]} lines
 * @returns {{ supplierId: string; supplierName: string; materialCode: string; materialLabel: string; firm: boolean }[]}
 */
export function commitmentAlertSubjects(lines) {
  const out =
    /** @type {Map<string, { supplierId: string; supplierName: string; materialCode: string; materialLabel: string; firm: boolean }>} */ (
      new Map()
    );
  for (const l of lines) {
    if (l.state !== 'exception' && l.state !== 'revisionRequested') continue;
    if (l.committedQty === null || l.committedQty >= l.forecastQty) continue;
    const k = `${l.supplierId}|${l.materialCode}`;
    const prev = out.get(k);
    out.set(k, {
      supplierId: l.supplierId,
      supplierName: l.supplierName,
      materialCode: l.materialCode,
      materialLabel: l.materialLabel,
      firm: (prev?.firm ?? false) || l.zone === 'firm'
    });
  }
  return [...out.values()];
}

/**
 * REQ-E07-03 — the foresight answer a line gives the Order summary.
 * @param {Pick<ForecastCommitmentLine, 'zone' | 'state'>} line
 * @returns {'awaiting' | 'confirmed' | 'gap' | 'notRequired'}
 */
export function foresightAnswerOf(line) {
  if (line.zone === 'forecast') return 'notRequired';
  if (line.state === 'exception' || line.state === 'revisionRequested') return 'gap';
  if (line.state === 'accepted' || line.state === 'acceptedByPlanner') return 'confirmed';
  return 'awaiting';
}

// ── Spreadsheets: forecast download and commitment upload ───────────────────

/** @param {string} v */
const quote = (v) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/**
 * AC-03 — the forecast as a spreadsheet (CSV), one row per material × period.
 * @param {readonly ForecastCommitmentLine[]} lines
 * @param {{ readonly [K in 'materialCode' | 'material' | 'period' | 'periodStart' | 'zone' | 'forecastQty' | 'unit' | 'previousQty' | 'dueAt']: string }} headers
 * @param {(zone: ForecastZone) => string} zoneLabel
 * @returns {string}
 */
export function forecastCsv(lines, headers, zoneLabel) {
  const cols = /** @type {const} */ ([
    'materialCode',
    'material',
    'period',
    'periodStart',
    'zone',
    'forecastQty',
    'unit',
    'previousQty',
    'dueAt'
  ]);
  const rows = lines.map((l) =>
    [
      l.materialCode,
      l.materialLabel,
      l.periodBucket,
      l.periodStart,
      zoneLabel(l.zone),
      String(l.forecastQty),
      l.uom,
      l.previousQty === null ? '' : String(l.previousQty),
      l.dueAt.slice(0, 10)
    ]
      .map(quote)
      .join(',')
  );
  return [cols.map((c) => quote(headers[c])).join(','), ...rows].join('\n') + '\n';
}

/**
 * @typedef {| 'materialCode'
 *   | 'period'
 *   | 'zone'
 *   | 'forecastQty'
 *   | 'unit'
 *   | 'committedQty'
 *   | 'upsideQty'
 *   | 'reason'
 *   | 'note'} CommitmentTemplateField
 */

/**
 * The fixed commitment template, in column order. Headers are matched in EN or ID.
 * CAP-6 (BL-175) BR-03 — no commitment date column: a commitment is a quantity
 * per period. An older file that still has "Commitment date" parses; the
 * header matches no field, so the column is ignored.
 * @type {readonly { readonly field: CommitmentTemplateField; readonly en: string; readonly id: string }[]}
 */
export const COMMITMENT_TEMPLATE_FIELDS = [
  { field: 'materialCode', en: 'Material code', id: 'Kode material' },
  { field: 'period', en: 'Period', id: 'Periode' },
  { field: 'zone', en: 'Zone', id: 'Zona' },
  { field: 'forecastQty', en: 'Forecast quantity', id: 'Kuantitas prakiraan' },
  { field: 'unit', en: 'Unit', id: 'Satuan' },
  { field: 'committedQty', en: 'Committed quantity', id: 'Kuantitas komitmen' },
  { field: 'upsideQty', en: 'Upside quantity', id: 'Kuantitas tambahan' },
  {
    field: 'reason',
    en: 'Reason (capacity, material, logistics, quality, other)',
    id: 'Alasan (capacity, material, logistics, quality, other)'
  },
  { field: 'note', en: 'Note', id: 'Catatan' }
];

/** @param {string} h */
const normHeader = (h) =>
  h
    .toLowerCase()
    .replace(/\(.*\)/g, '')
    .replace(/[^a-z0-9]+/g, '');

/**
 * @param {string} header
 * @returns {CommitmentTemplateField | null}
 */
export function commitmentFieldFor(header) {
  const n = normHeader(header);
  return (
    COMMITMENT_TEMPLATE_FIELDS.find((f) => normHeader(f.en) === n || normHeader(f.id) === n)
      ?.field ?? null
  );
}

/**
 * BR-06 / BR-09 — the template for the current version, pre-filled with the forecast quantity.
 * @param {readonly ForecastCommitmentLine[]} lines
 * @param {'en' | 'id'} language
 * @returns {string}
 */
export function commitmentTemplateCsv(lines, language) {
  const header = COMMITMENT_TEMPLATE_FIELDS.map((f) => quote(f[language])).join(',');
  const rows = lines.map((l) =>
    [
      l.materialCode,
      l.periodBucket,
      l.zone,
      String(l.forecastQty),
      l.uom,
      l.zone === 'forecast' ? '' : String(l.forecastQty),
      '',
      '',
      ''
    ]
      .map(quote)
      .join(',')
  );
  return [header, ...rows].join('\n') + '\n';
}

/**
 * @typedef {| 'missingField'
 *   | 'notInForecast'
 *   | 'duplicateRow'
 *   | 'notANumber'
 *   | 'ambiguousNumber'
 *   | 'unitMismatch'
 *   | 'reasonRequired'
 *   | 'noteRequired'} CommitmentRowRefusal
 */

/**
 * `row`:  1-based row number as the supplier sees it (the header is row 1).
 *
 * @typedef {{
 *     readonly row: number;
 *     readonly materialCode: string;
 *     readonly period: string;
 *     readonly reason: CommitmentRowRefusal;
 *     readonly field?: CommitmentTemplateField;
 *   }} RefusedCommitmentRow
 */

/** One checked row, ready for the verbs. */
/**
 * @typedef {| {
 *       readonly kind: 'commit';
 *       readonly row: number;
 *       readonly line: ForecastCommitmentLine;
 *       readonly committedQty: number;
 *       readonly upsideQty?: number;
 *       readonly reason?: CapacityReason;
 *       readonly note?: string;
 *     }
 *   | { readonly kind: 'acknowledge'; readonly row: number; readonly line: ForecastCommitmentLine; readonly note?: string }} CommitmentDraft
 */

/**
 * Named for this module: a JSDoc typedef is exported, unlike the TS `type` it
 * replaced, and inventoryRules.js declares its own `NumberRead` — both reach
 * transitions/index.js through `export *`, where one name would collide.
 * @typedef {{ ok: true; value: number | null } | { ok: false; reason: 'notANumber' | 'ambiguousNumber' }} CommitmentNumberRead
 */

/**
 * CR-18 — a number that reads differently in Indonesian and English format is refused.
 * @param {string | undefined} raw
 * @returns {CommitmentNumberRead}
 */
export function readCommitmentNumber(raw) {
  const s = (raw ?? '').trim();
  if (s === '') return { ok: true, value: null };
  const r = normalizeQty(s);
  if (r.ok) return { ok: true, value: r.value };
  return { ok: false, reason: r.reason === 'AMBIGUOUS_QTY' ? 'ambiguousNumber' : 'notANumber' };
}

/**
 * An uploaded reason: an ACTIVE code of the commitment list in force (BL-32).
 * @param {string} raw
 * @returns {CapacityReason | null}
 */
const reasonOf = (raw) => {
  const v = raw.trim().toLowerCase();
  return isActiveReasonCode('commitmentShortfall', v) ? v : null;
};

/**
 * Check an uploaded commitment file row by row. Each row is one material ×
 * period of the supplier's CURRENT version and is accepted or refused on its
 * own: a refused row is listed with its number and reason and never holds the
 * other rows back.
 * @param {readonly Record<string, string>[]} rows
 * @param {readonly ForecastCommitmentLine[]} lines
 * @returns {{ accepted: CommitmentDraft[]; refused: RefusedCommitmentRow[] }}
 */
export function validateCommitmentRows(rows, lines) {
  /** @type {CommitmentDraft[]} */
  const accepted = [];
  /** @type {RefusedCommitmentRow[]} */
  const refused = [];
  const seen = /** @type {Set<string>} */ (new Set());
  rows.forEach((raw, index) => {
    const row = index + 2;
    /** @type {Partial<Record<CommitmentTemplateField, string>>} */
    const rec = {};
    for (const [header, value] of Object.entries(raw)) {
      const f = commitmentFieldFor(header);
      if (f) rec[f] = (value ?? '').trim();
    }
    const code = rec.materialCode ?? '';
    const period = rec.period ?? '';
    /**
     * @param {CommitmentRowRefusal} reason
     * @param {CommitmentTemplateField} [field]
     */
    const refuse = (reason, field) =>
      refused.push({ row, materialCode: code, period, reason, ...(field ? { field } : {}) });
    if (code === '') return refuse('missingField', 'materialCode');
    if (period === '') return refuse('missingField', 'period');
    const line = lines.find((l) => l.materialCode === code && l.periodBucket === period);
    if (!line) return refuse('notInForecast');
    // A period already taken by an accepted row; a refused row does not block a corrected one.
    if (seen.has(`${code}|${period}`)) return refuse('duplicateRow');
    if (
      (rec.unit ?? '') !== '' &&
      /** @type {NonNullable<typeof rec.unit>} */ (rec.unit).toUpperCase() !==
        line.uom.toUpperCase()
    )
      return refuse('unitMismatch', 'unit');
    const note = (rec.note ?? '').trim();
    if (line.zone === 'forecast') {
      seen.add(`${code}|${period}`);
      accepted.push({ kind: 'acknowledge', row, line, ...(note ? { note } : {}) });
      return;
    }
    const committed = readCommitmentNumber(rec.committedQty);
    if (!committed.ok) return refuse(committed.reason, 'committedQty');
    if (committed.value === null) return refuse('missingField', 'committedQty');
    const upside = readCommitmentNumber(rec.upsideQty);
    if (!upside.ok) return refuse(upside.reason, 'upsideQty');
    const reason = reasonOf(rec.reason ?? '');
    const refusal = shortfallRefusal(
      line.forecastQty,
      committed.value,
      reason ? { level1: reason, note } : undefined
    );
    if (refusal) return refuse(refusal, refusal === 'reasonRequired' ? 'reason' : 'note');
    seen.add(`${code}|${period}`);
    accepted.push({
      kind: 'commit',
      row,
      line,
      committedQty: committed.value,
      ...(upside.value !== null ? { upsideQty: upside.value } : {}),
      ...(reason && committed.value < line.forecastQty ? { reason } : {}),
      ...(note ? { note } : {})
    });
  });
  return { accepted, refused };
}
