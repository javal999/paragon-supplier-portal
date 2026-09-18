// ─────────────────────────────────────────────────────────────────────────────
// FORECAST COLLABORATION RULES — REQ-E06-01, REQ-E06-02, REQ-E06-03.
//
// Pure functions only: data in, view out, nothing reads a clock unless the
// instant is passed in. Settings live in `forecastConfig.ts`.
//
//   · Publication (E06-01): the period grid per material type (weekly for 13
//     weeks then monthly for packaging; monthly for raw material), the zone of
//     each period per supplier × material group, version comparison, and the
//     forecast download.
//   · Commitment (E06-02): the below-forecast reason rule (the verb's policy
//     calls it), CR-21 tolerance per zone, the split deadline and its
//     reminder, the commitment template and row-by-row upload check, and the
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

import type {
  DisputeEntry,
  ForecastLine,
  ForecastPublication,
  ForecastStream,
  MaterialMasterEntry,
  Provenance,
  RequirementResponse,
} from '../sdc/types';
import type { CapacityReason, CommitmentState, ForecastCommitmentLine, ForecastZone } from '../data/types';
import { addWorkingDays, DEFAULT_WORKING_CALENDAR } from '../../lib/workingCalendar';
import { normalizeQty } from '../../lib/localeNumber';
import {
  COMMITMENT_REASONS,
  COMMITMENT_TOLERANCE,
  FIRM_DEADLINE_WORKING_DAYS,
  FORECAST_HORIZON,
  GAP_COLOUR_THRESHOLDS,
  OTHER_DEADLINE_DAYS,
  REMINDER_FRACTION,
  STREAM_MATERIAL_TYPE,
  isCommitmentReason,
  zoneLengthsFor,
  type ZoneLengths,
} from './forecastConfig';

const DAY_MS = 86_400_000;

// ── Calendar days (`YYYY-MM-DD`) ─────────────────────────────────────────────

const addDay = (day: string, n: number): string =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + n * DAY_MS).toISOString().slice(0, 10);

const daysFrom = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS);

/** The calendar date of an instant in PTI's working-calendar zone (WIB). */
export const publicationDay = (iso: string): string =>
  new Date(Date.parse(iso) + DEFAULT_WORKING_CALENDAR.utcOffsetHours * 3_600_000).toISOString().slice(0, 10);

const lastDayOfMonth = (day: string): string => {
  const [y, m] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

const addMonths = (day: string, n: number): string => {
  const [y, m, d] = day.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d, last))).toISOString().slice(0, 10);
};

/** The Monday on or after `day`. */
export function mondayOnOrAfter(day: string): string {
  const dow = new Date(`${day}T00:00:00.000Z`).getUTCDay(); // 0 = Sunday
  return addDay(day, dow === 1 ? 0 : dow === 0 ? 1 : 8 - dow);
}

/** The first day of a month on or after `day`. */
export function firstOfMonthOnOrAfter(day: string): string {
  return day.endsWith('-01') ? day : addDay(lastDayOfMonth(day), 1);
}

// ── Periods (REQ-E06-01 BR-03) ───────────────────────────────────────────────

export type PeriodKind = 'week' | 'month';

export interface ForecastPeriod {
  /** A week is named by its Monday (`YYYY-MM-DD`); a month by `YYYY-MM`. */
  readonly id: string;
  readonly kind: PeriodKind;
  readonly start: string;
  readonly end: string;
}

export const periodKindOf = (bucket: string): PeriodKind => (/^\d{4}-\d{2}-\d{2}$/.test(bucket) ? 'week' : 'month');

/** The calendar bounds of a bucket as named (a month bucket is the whole month). */
export function periodBounds(bucket: string): { start: string; end: string } {
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
 */
export function generatePeriods(
  stream: ForecastStream,
  publishedAt: string,
  horizon: { readonly weeklyPeriods: number; readonly horizonMonths: number } = FORECAST_HORIZON[stream],
): ForecastPeriod[] {
  const day = publicationDay(publishedAt);
  const periods: ForecastPeriod[] = [];
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
    if (daysFrom(cursor, monthEnd) + 1 < 7 && addDay(monthEnd, 1) <= horizonEnd) monthEnd = lastDayOfMonth(addDay(monthEnd, 1));
    periods.push({ id: monthEnd.slice(0, 7), kind: 'month', start: cursor, end: monthEnd });
    cursor = addDay(monthEnd, 1);
  }
  return periods;
}

// ── Zones (REQ-E06-01 BR-04, BR-05) ──────────────────────────────────────────

/** The zone of a period that starts on `periodStart`, for a publication on `publishedDay`. */
export function zoneFor(periodStart: string, publishedDay: string, lengths: ZoneLengths): ForecastZone {
  const offset = daysFrom(publishedDay, periodStart);
  if (offset < lengths.firmDays) return 'firm';
  if (offset < lengths.firmDays + lengths.tradeOffDays) return 'tradeOff';
  return 'forecast';
}

/** The requirement's zone names over the SDC commitment classes. */
export const zoneOfClass = (cls: ForecastLine['commitmentClass']): ForecastZone =>
  cls === 'firm' ? 'firm' : cls === 'semi-firm' ? 'tradeOff' : 'forecast';

export const classOfZone = (zone: ForecastZone): ForecastLine['commitmentClass'] =>
  zone === 'firm' ? 'firm' : zone === 'tradeOff' ? 'semi-firm' : 'visibility-only';

// ── Building a version (REQ-E06-01) ──────────────────────────────────────────

/** One supplier's share of a material's demand. */
export interface ForecastSource {
  readonly supplierId: string;
  readonly materialCode: string;
  /** Share of the material's demand allocated to this supplier (0–1). */
  readonly share: number;
}

const PROV_SEED: Provenance = Object.freeze({ source: 'SOMO', liveness: 'SIMULATED', planState: 'PLANNED' });

const roundTo100 = (n: number): number => Math.round(n / 100) * 100;

export interface BuildVersionInput {
  readonly stream: ForecastStream;
  readonly version: number;
  readonly publishedAt: string;
  readonly sources: readonly ForecastSource[];
  readonly master: (materialCode: string) => MaterialMasterEntry | null;
  /** Total demand for a material in a period (before the supplier split). */
  readonly demand: (materialCode: string, period: ForecastPeriod, index: number) => number;
  readonly emergency?: boolean;
  readonly changeNote?: string;
}

export const publicationIdFor = (stream: ForecastStream, version: number): string =>
  `FC-${stream === 'packaging' ? 'PK' : 'RM'}-V${version}`;

/** A published version: every source × period with its zone and quantity. */
export function buildVersion(input: BuildVersionInput): ForecastPublication {
  const periods = generatePeriods(input.stream, input.publishedAt);
  const day = publicationDay(input.publishedAt);
  const type = STREAM_MATERIAL_TYPE[input.stream];
  const lines: ForecastLine[] = [];
  for (const source of input.sources) {
    const entry = input.master(source.materialCode);
    if (!entry || entry.materialType !== type) continue;
    periods.forEach((period, index) => {
      const total = input.demand(source.materialCode, period, index);
      const zone = zoneFor(period.start, day, zoneLengthsFor(source.supplierId, entry.materialGroup, entry.materialType));
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
          ...(zone === 'firm' ? { approvedBy: 'planner', approvedAt: input.publishedAt } : {}),
        },
        provenance: PROV_SEED,
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
    ...(input.changeNote ? { changeNote: input.changeNote } : {}),
  };
}

/** Versions of one stream, oldest first. */
export function streamVersions(publications: readonly ForecastPublication[], stream: ForecastStream): ForecastPublication[] {
  return publications
    .filter((p) => p.stream === stream)
    .sort((a, b) => (a.version ?? 0) - (b.version ?? 0) || a.publishedAt.localeCompare(b.publishedAt));
}

const sameLine = (a: ForecastLine, b: Pick<ForecastLine, 'supplierId' | 'materialCode' | 'periodBucket'>) =>
  a.supplierId === b.supplierId && a.materialCode === b.materialCode && a.periodBucket === b.periodBucket;

/**
 * The simulated next plan from SAP for a re-publication: a new period grid from
 * `publishedAt`. Firm quantities never change (BR-04); a period already
 * published keeps its quantity and supplier split (including a planner's
 * reassignment), except that every third later period moves 5% (a
 * deterministic stand-in for the planning run); a new period takes the base
 * demand split by the sources.
 */
export function republishVersion(
  current: ForecastPublication,
  input: Omit<BuildVersionInput, 'stream' | 'version' | 'demand'> & {
    readonly baseDemand: (materialCode: string, period: ForecastPeriod) => number;
  },
): ForecastPublication {
  const stream = current.stream ?? 'packaging';
  const version = (current.version ?? 0) + 1;
  const draft = buildVersion({
    ...input,
    stream,
    version,
    demand: (code, period) => input.baseDemand(code, period),
  });
  const lines = draft.lines.flatMap((line) => {
    const previous = current.lines.find((l) => sameLine(l, line));
    if (!previous) {
      // A period the current version already plans for this material, but not
      // with this supplier, was moved away by the planner: it stays moved.
      const planned = current.lines.some((l) => l.materialCode === line.materialCode && l.periodBucket === line.periodBucket);
      return planned || line.forecastQty === 0 ? [] : [line];
    }
    const index = draft.horizon.indexOf(line.periodBucket);
    const moves = zoneOfClass(line.commitmentClass) !== 'firm' && index % 3 === version % 3;
    const forecastQty = moves ? roundTo100(previous.forecastQty * 1.05) : previous.forecastQty;
    return [{ ...line, forecastQty, allocation: { ...line.allocation, materialPeriodTotal: Math.max(line.allocation.materialPeriodTotal, forecastQty) } }];
  });
  return { ...draft, lines };
}

/**
 * REQ-E06-03 BR-05 — move one period's quantity from one supplier to another
 * that supplies the material, as a new version. The receiving supplier gets a
 * new line (or an increased one) in the same zone; every other line is copied.
 */
export function reassignVersion(
  current: ForecastPublication,
  move: {
    readonly materialCode: string;
    readonly periodBucket: string;
    readonly fromSupplierId: string;
    readonly toSupplierId: string;
    readonly note: string;
  },
  publishedAt: string,
): ForecastPublication | null {
  const from = current.lines.find((l) => sameLine(l, { ...move, supplierId: move.fromSupplierId }));
  if (!from || move.fromSupplierId === move.toSupplierId) return null;
  const existing = current.lines.find((l) => sameLine(l, { ...move, supplierId: move.toSupplierId }));
  const lines: ForecastLine[] = current.lines
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
    emergency: undefined,
  };
}

// ── Version comparison (REQ-E06-01 BR-06) ────────────────────────────────────

export type ChangeKind = 'changed' | 'added' | 'removed';

export interface PeriodChange {
  readonly supplierId: string;
  readonly materialCode: string;
  readonly periodBucket: string;
  readonly kind: ChangeKind;
  readonly previousQty: number | null;
  readonly currentQty: number | null;
}

/**
 * The periods whose quantity moved between two versions, for one supplier (or
 * all). A period that simply rolled off the start of the horizon is not a
 * change.
 */
export function versionChanges(
  current: ForecastPublication,
  previous: ForecastPublication | null,
  supplierId?: string,
): PeriodChange[] {
  if (!previous) return [];
  const mine = (l: ForecastLine) => supplierId === undefined || l.supplierId === supplierId;
  const firstStart = current.horizon.length > 0 ? periodBounds(current.horizon[0]).start : '';
  const out: PeriodChange[] = [];
  for (const line of current.lines.filter(mine)) {
    const prev = previous.lines.find((l) => sameLine(l, line));
    if (!prev) out.push({ ...pick(line), kind: 'added', previousQty: null, currentQty: line.forecastQty });
    else if (prev.forecastQty !== line.forecastQty)
      out.push({ ...pick(line), kind: 'changed', previousQty: prev.forecastQty, currentQty: line.forecastQty });
  }
  for (const prev of previous.lines.filter(mine)) {
    if (current.lines.some((l) => sameLine(l, prev))) continue;
    if (periodBounds(prev.periodBucket).end < firstStart) continue;
    out.push({ ...pick(prev), kind: 'removed', previousQty: prev.forecastQty, currentQty: null });
  }
  return out.sort(
    (a, b) => a.materialCode.localeCompare(b.materialCode) || a.periodBucket.localeCompare(b.periodBucket) || a.supplierId.localeCompare(b.supplierId),
  );
}

const pick = (l: ForecastLine) => ({ supplierId: l.supplierId, materialCode: l.materialCode, periodBucket: l.periodBucket });

// ── Commitment rules (REQ-E06-02) ────────────────────────────────────────────

export type ShortfallRefusal = 'reasonRequired' | 'noteRequired';

/**
 * BR-04 / AC-02 — a commitment below forecast needs a starter reason code, and
 * `other` needs a note. The verb's policy calls this, so the rule holds for
 * every channel (screen, upload, or a hand-made dispatch).
 */
export function shortfallRefusal(
  forecastQty: number,
  committedQty: number,
  rootCause: { readonly level1?: unknown; readonly note?: unknown } | undefined,
): ShortfallRefusal | null {
  if (committedQty >= forecastQty) return null;
  if (!rootCause || !isCommitmentReason(rootCause.level1)) return 'reasonRequired';
  if (rootCause.level1 === 'other' && (typeof rootCause.note !== 'string' || rootCause.note.trim() === '')) return 'noteRequired';
  return null;
}

export type ToleranceOutcome = 'within' | 'outside' | 'acknowledgementOnly';

/**
 * CR-21 — Firm: any shortfall is an exception. Trade-off: up to 10% below
 * forecast is accepted automatically (exactly 10% is within). Forecast:
 * acknowledgement only.
 */
export function toleranceOutcome(zone: ForecastZone, forecastQty: number, committedQty: number): ToleranceOutcome {
  if (zone === 'forecast') return 'acknowledgementOnly';
  const allowed = zone === 'firm' ? COMMITMENT_TOLERANCE.firmShortfall : COMMITMENT_TOLERANCE.tradeOffShortfall;
  const shortfall = forecastQty - committedQty;
  return shortfall <= forecastQty * allowed + 1e-9 ? 'within' : 'outside';
}

/**
 * BR-07 — Firm periods are due 1 working day after publication (§3.4
 * calendar); Trade-off and Forecast periods 7 days after.
 */
export function commitmentDueAt(zone: ForecastZone, publishedAt: string): string {
  if (zone === 'firm') return addWorkingDays(publishedAt, FIRM_DEADLINE_WORKING_DAYS).toISOString();
  return new Date(Date.parse(publishedAt) + OTHER_DEADLINE_DAYS * DAY_MS).toISOString();
}

/** REQ-E06-03 BR-06 — the first reminder, at half the time to the deadline. */
export function commitmentReminderAt(publishedAt: string, dueAt: string): string {
  const start = Date.parse(publishedAt);
  return new Date(start + (Date.parse(dueAt) - start) * REMINDER_FRACTION).toISOString();
}

export type DeadlineState = 'open' | 'dueSoon' | 'overdue';

/**
 * Where a line stands against its deadline now. Only a line still awaiting the
 * supplier has one; overdue is the escalation to the planner. Never stored.
 */
export function deadlineState(
  line: Pick<ForecastCommitmentLine, 'state' | 'dueAt' | 'reminderAt'>,
  nowIso: string,
): DeadlineState | null {
  if (line.state !== 'awaiting') return null;
  const now = Date.parse(nowIso);
  if (now >= Date.parse(line.dueAt)) return 'overdue';
  if (now >= Date.parse(line.reminderAt)) return 'dueSoon';
  return 'open';
}

/** The state of a line from the response that stands for its current quantity. */
export function commitmentState(zone: ForecastZone, forecastQty: number, response: RequirementResponse | null): CommitmentState {
  if (!response) return 'awaiting';
  if (zone === 'forecast') return 'acknowledged';
  if (response.acknowledgment || !response.forecastConfirmation) return 'awaiting';
  if (response.status === 'Accepted') return 'acceptedByPlanner';
  if (response.status === 'Disputed') return 'revisionRequested';
  return toleranceOutcome(zone, forecastQty, response.forecastConfirmation.confirmedQty) === 'within' ? 'accepted' : 'exception';
}

// ── The commitment lines (join, carry-forward) ───────────────────────────────

export interface CommitmentInputs {
  readonly publications: readonly ForecastPublication[];
  readonly responses: readonly RequirementResponse[];
  readonly master: (materialCode: string) => MaterialMasterEntry | null;
  readonly supplierName: (supplierId: string) => string;
  /** Include this supplier's own drafts (never PTI's view — BR-10). */
  readonly draftsFor?: string | null;
  /** Suppliers qualified for a material (REQ-E06-03 BR-05). */
  readonly qualifiedSuppliers?: (materialCode: string) => readonly string[];
}

const lineKey = (l: Pick<ForecastLine, 'supplierId' | 'materialCode' | 'periodBucket'>) =>
  `${l.supplierId}|${l.materialCode}|${l.periodBucket}`;

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
 */
export function buildCommitmentLines(input: CommitmentInputs): ForecastCommitmentLine[] {
  const out: ForecastCommitmentLine[] = [];
  const streams = [...new Set(input.publications.map((p) => p.stream).filter((s): s is ForecastStream => !!s))];
  for (const stream of streams) {
    const versions = streamVersions(input.publications, stream);
    const current = versions[versions.length - 1];
    const previous = versions.length > 1 ? versions[versions.length - 2] : null;
    const ids = new Set(versions.map((v) => v.publicationId));
    const ordered = input.responses
      .map((r, index) => ({ r, index }))
      .filter(({ r }) => ids.has(r.publicationId))
      .sort((a, b) => (b.r.submittedAt ?? '').localeCompare(a.r.submittedAt ?? '') || a.index - b.index)
      .map(({ r }) => r);

    for (const line of current.lines) {
      const entry = input.master(line.materialCode);
      const zone = zoneOfClass(line.commitmentClass);
      const bounds = periodBounds(line.periodBucket);
      const mine = ordered.filter((r) => lineKey(r) === lineKey(line));
      let response: RequirementResponse | null = null;
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
      }
      const draft =
        input.draftsFor && input.draftsFor === line.supplierId
          ? (mine.find((r) => r.status === 'Draft' && r.publicationId === current.publicationId) ?? null)
          : null;
      const log: DisputeEntry[] = mine
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
        carriedForward,
        draft,
        committedQty: response?.forecastConfirmation?.confirmedQty ?? null,
        log,
        otherQualifiedSuppliers: (input.qualifiedSuppliers?.(line.materialCode) ?? [])
          .filter((id) => id !== line.supplierId)
          .map((supplierId) => ({ supplierId, supplierName: input.supplierName(supplierId) })),
      });
    }
  }
  return out.sort(
    (a, b) =>
      a.stream.localeCompare(b.stream) ||
      a.supplierName.localeCompare(b.supplierName) ||
      a.materialCode.localeCompare(b.materialCode) ||
      a.periodStart.localeCompare(b.periodStart),
  );
}

// ── Gap monitoring (REQ-E06-03) ──────────────────────────────────────────────

export type GapColour = 'green' | 'amber' | 'red';

/** CR-22 — commitment ÷ forecast: Green at 1.0 or more; Amber from 0.8 to below 1.0; Red below 0.8. */
export function gapColour(ratio: number): GapColour {
  if (ratio >= GAP_COLOUR_THRESHOLDS.greenFrom) return 'green';
  if (ratio >= GAP_COLOUR_THRESHOLDS.amberFrom) return 'amber';
  return 'red';
}

export interface CommitmentGap {
  /** Commitment − forecast. */
  readonly qty: number;
  /** (commitment − forecast) ÷ forecast. */
  readonly pct: number;
  readonly ratio: number;
  readonly colour: GapColour;
  /** Edge case — more than forecast in the Firm zone: information, not an error. */
  readonly overCommit: boolean;
}

/** BR-01 / BR-02 — the gap of one period. No forecast counts as covered. */
export function commitmentGap(zone: ForecastZone, forecastQty: number, committedQty: number): CommitmentGap {
  const ratio = forecastQty > 0 ? committedQty / forecastQty : 1;
  return {
    qty: committedQty - forecastQty,
    pct: forecastQty > 0 ? (committedQty - forecastQty) / forecastQty : 0,
    ratio,
    colour: gapColour(ratio),
    overCommit: zone === 'firm' && committedQty > forecastQty,
  };
}

/** BR-03 — cumulative forecast and commitment over the periods that need a commitment. */
export function cumulativeCommitment(
  lines: readonly Pick<ForecastCommitmentLine, 'periodBucket' | 'periodStart' | 'zone' | 'forecastQty' | 'committedQty' | 'state'>[],
): { periodBucket: string; cumulativeForecast: number; cumulativeCommitment: number }[] {
  let f = 0;
  let c = 0;
  const byPeriod = new Map<string, { start: string; forecast: number; commit: number }>();
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

/** An exception for the planner: outside tolerance, or a commitment missing past its deadline. */
export function isException(line: ForecastCommitmentLine, nowIso: string): boolean {
  return line.state === 'exception' || deadlineState(line, nowIso) === 'overdue';
}

/**
 * BR-04 — exceptions ranked: overdue first, then Firm zone, then the lowest
 * days of supply (CR-01) for the material; then the earliest period.
 */
export function rankExceptions(
  lines: readonly ForecastCommitmentLine[],
  nowIso: string,
  daysOfSupplyOf: (materialCode: string) => number | null,
): ForecastCommitmentLine[] {
  const dos = (code: string) => daysOfSupplyOf(code) ?? Number.POSITIVE_INFINITY;
  return lines
    .filter((l) => isException(l, nowIso))
    .sort(
      (a, b) =>
        Number(deadlineState(b, nowIso) === 'overdue') - Number(deadlineState(a, nowIso) === 'overdue') ||
        Number(b.zone === 'firm') - Number(a.zone === 'firm') ||
        dos(a.materialCode) - dos(b.materialCode) ||
        a.periodStart.localeCompare(b.periodStart) ||
        a.supplierName.localeCompare(b.supplierName),
    );
}

/** REQ-E08-05 BR-01 — committed below forecast beyond tolerance, per supplier × material. */
export function commitmentAlertSubjects(
  lines: readonly ForecastCommitmentLine[],
): { supplierId: string; supplierName: string; materialCode: string; materialLabel: string; firm: boolean }[] {
  const out = new Map<string, { supplierId: string; supplierName: string; materialCode: string; materialLabel: string; firm: boolean }>();
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
      firm: (prev?.firm ?? false) || l.zone === 'firm',
    });
  }
  return [...out.values()];
}

/** REQ-E07-03 — the foresight answer a line gives the Order summary. */
export function foresightAnswerOf(line: Pick<ForecastCommitmentLine, 'zone' | 'state'>): 'awaiting' | 'confirmed' | 'gap' | 'notRequired' {
  if (line.zone === 'forecast') return 'notRequired';
  if (line.state === 'exception' || line.state === 'revisionRequested') return 'gap';
  if (line.state === 'accepted' || line.state === 'acceptedByPlanner') return 'confirmed';
  return 'awaiting';
}

// ── Spreadsheets: forecast download and commitment upload ───────────────────

const quote = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** AC-03 — the forecast as a spreadsheet (CSV), one row per material × period. */
export function forecastCsv(
  lines: readonly ForecastCommitmentLine[],
  headers: { readonly [K in 'materialCode' | 'material' | 'period' | 'periodStart' | 'zone' | 'forecastQty' | 'unit' | 'previousQty' | 'dueAt']: string },
  zoneLabel: (zone: ForecastZone) => string,
): string {
  const cols = ['materialCode', 'material', 'period', 'periodStart', 'zone', 'forecastQty', 'unit', 'previousQty', 'dueAt'] as const;
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
      l.dueAt.slice(0, 10),
    ]
      .map(quote)
      .join(','),
  );
  return [cols.map((c) => quote(headers[c])).join(','), ...rows].join('\n') + '\n';
}

export type CommitmentTemplateField =
  | 'materialCode'
  | 'period'
  | 'zone'
  | 'forecastQty'
  | 'unit'
  | 'committedQty'
  | 'commitmentDate'
  | 'upsideQty'
  | 'reason'
  | 'note';

/** The fixed commitment template, in column order. Headers are matched in EN or ID. */
export const COMMITMENT_TEMPLATE_FIELDS: readonly { readonly field: CommitmentTemplateField; readonly en: string; readonly id: string }[] = [
  { field: 'materialCode', en: 'Material code', id: 'Kode material' },
  { field: 'period', en: 'Period', id: 'Periode' },
  { field: 'zone', en: 'Zone', id: 'Zona' },
  { field: 'forecastQty', en: 'Forecast quantity', id: 'Kuantitas prakiraan' },
  { field: 'unit', en: 'Unit', id: 'Satuan' },
  { field: 'committedQty', en: 'Committed quantity', id: 'Kuantitas komitmen' },
  { field: 'commitmentDate', en: 'Commitment date (YYYY-MM-DD)', id: 'Tanggal komitmen (YYYY-MM-DD)' },
  { field: 'upsideQty', en: 'Upside quantity', id: 'Kuantitas tambahan' },
  { field: 'reason', en: 'Reason (capacity, material, logistics, quality, other)', id: 'Alasan (capacity, material, logistics, quality, other)' },
  { field: 'note', en: 'Note', id: 'Catatan' },
];

const normHeader = (h: string) => h.toLowerCase().replace(/\(.*\)/g, '').replace(/[^a-z0-9]+/g, '');

export function commitmentFieldFor(header: string): CommitmentTemplateField | null {
  const n = normHeader(header);
  return COMMITMENT_TEMPLATE_FIELDS.find((f) => normHeader(f.en) === n || normHeader(f.id) === n)?.field ?? null;
}

/** BR-06 / BR-09 — the template for the current version, pre-filled with the forecast quantity. */
export function commitmentTemplateCsv(lines: readonly ForecastCommitmentLine[], language: 'en' | 'id'): string {
  const header = COMMITMENT_TEMPLATE_FIELDS.map((f) => quote(f[language])).join(',');
  const rows = lines.map((l) =>
    [l.materialCode, l.periodBucket, l.zone, String(l.forecastQty), l.uom, l.zone === 'forecast' ? '' : String(l.forecastQty), l.zone === 'forecast' ? '' : l.periodStart, '', '', '']
      .map(quote)
      .join(','),
  );
  return [header, ...rows].join('\n') + '\n';
}

export type CommitmentRowRefusal =
  | 'missingField'
  | 'notInForecast'
  | 'duplicateRow'
  | 'notANumber'
  | 'ambiguousNumber'
  | 'unitMismatch'
  | 'invalidDate'
  | 'reasonRequired'
  | 'noteRequired';

export interface RefusedCommitmentRow {
  /** 1-based row number as the supplier sees it (the header is row 1). */
  readonly row: number;
  readonly materialCode: string;
  readonly period: string;
  readonly reason: CommitmentRowRefusal;
  readonly field?: CommitmentTemplateField;
}

/** One checked row, ready for the verbs. */
export type CommitmentDraft =
  | {
      readonly kind: 'commit';
      readonly row: number;
      readonly line: ForecastCommitmentLine;
      readonly committedQty: number;
      readonly commitmentDate: string;
      readonly upsideQty?: number;
      readonly reason?: CapacityReason;
      readonly note?: string;
    }
  | { readonly kind: 'acknowledge'; readonly row: number; readonly line: ForecastCommitmentLine; readonly note?: string };

const isIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00.000Z`));

type NumberRead = { ok: true; value: number | null } | { ok: false; reason: 'notANumber' | 'ambiguousNumber' };

/** CR-18 — a number that reads differently in Indonesian and English format is refused. */
export function readCommitmentNumber(raw: string | undefined): NumberRead {
  const s = (raw ?? '').trim();
  if (s === '') return { ok: true, value: null };
  const r = normalizeQty(s);
  if (r.ok) return { ok: true, value: r.value };
  return { ok: false, reason: r.reason === 'AMBIGUOUS_QTY' ? 'ambiguousNumber' : 'notANumber' };
}

const reasonOf = (raw: string): CapacityReason | null => {
  const v = raw.trim().toLowerCase();
  return (COMMITMENT_REASONS as readonly string[]).includes(v) ? (v as CapacityReason) : null;
};

/**
 * Check an uploaded commitment file row by row. Each row is one material ×
 * period of the supplier's CURRENT version and is accepted or refused on its
 * own: a refused row is listed with its number and reason and never holds the
 * other rows back.
 */
export function validateCommitmentRows(
  rows: readonly Record<string, string>[],
  lines: readonly ForecastCommitmentLine[],
): { accepted: CommitmentDraft[]; refused: RefusedCommitmentRow[] } {
  const accepted: CommitmentDraft[] = [];
  const refused: RefusedCommitmentRow[] = [];
  const seen = new Set<string>();
  rows.forEach((raw, index) => {
    const row = index + 2;
    const rec: Partial<Record<CommitmentTemplateField, string>> = {};
    for (const [header, value] of Object.entries(raw)) {
      const f = commitmentFieldFor(header);
      if (f) rec[f] = (value ?? '').trim();
    }
    const code = rec.materialCode ?? '';
    const period = rec.period ?? '';
    const refuse = (reason: CommitmentRowRefusal, field?: CommitmentTemplateField) =>
      refused.push({ row, materialCode: code, period, reason, ...(field ? { field } : {}) });
    if (code === '') return refuse('missingField', 'materialCode');
    if (period === '') return refuse('missingField', 'period');
    const line = lines.find((l) => l.materialCode === code && l.periodBucket === period);
    if (!line) return refuse('notInForecast');
    // A period already taken by an accepted row; a refused row does not block a corrected one.
    if (seen.has(`${code}|${period}`)) return refuse('duplicateRow');
    if ((rec.unit ?? '') !== '' && rec.unit!.toUpperCase() !== line.uom.toUpperCase()) return refuse('unitMismatch', 'unit');
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
    const date = rec.commitmentDate ?? '';
    if (date === '') return refuse('missingField', 'commitmentDate');
    if (!isIsoDate(date)) return refuse('invalidDate', 'commitmentDate');
    const reason = reasonOf(rec.reason ?? '');
    const refusal = shortfallRefusal(line.forecastQty, committed.value, reason ? { level1: reason, note } : undefined);
    if (refusal) return refuse(refusal, refusal === 'reasonRequired' ? 'reason' : 'note');
    seen.add(`${code}|${period}`);
    accepted.push({
      kind: 'commit',
      row,
      line,
      committedQty: committed.value,
      commitmentDate: date,
      ...(upside.value !== null ? { upsideQty: upside.value } : {}),
      ...(reason && committed.value < line.forecastQty ? { reason } : {}),
      ...(note ? { note } : {}),
    });
  });
  return { accepted, refused };
}
