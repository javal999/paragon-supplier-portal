// ─────────────────────────────────────────────────────────────────────────────
// STABILISE THE PLAN BEFORE IT IS PUBLISHED — REQ-E14-06 (METHOD-SPEC G1, G4, M6).
//
// Pure functions. Every version's day, the zone lengths, the damping weights
// and the tolerance band are ARGUMENTS (X-01); nothing here reads a clock, a
// store or a setting.
//
// ── WHAT IS STABILISED (ENG-B29) ────────────────────────────────────────────
//   The quantity per supplier × material × week the engine would publish: the
//   material's NET requirement lot-for-lot (REQ-E06-01 BR-01) from E14-03's
//   netting — gross requirement, open receipts at their confirmed dates and
//   E14-04's safety stock —
//        need_t = max(0, GR_t + SS − (POH_{t−1} + SR_t)),
//        POH_t  = POH_{t−1} + SR_t + need_t − GR_t
//   split to each supplier by its source share (C8-FANOUT). E14-05's lot sizes
//   are NOT what is published: they become call-offs (REQ-E09-01), and a lot
//   that moves one week reads as a 100% change in two periods.
//
// ── ONE PERIOD, ONE RULE (BR-01 to BR-05) ───────────────────────────────────
//   With the value the supplier saw last version (`previous`) and the value
//   the cumulative cap is measured from (`first`, ENG-B31: the value the
//   supplier saw when the week entered the Trade-off zone — the first it was
//   asked to commit against; a Forecast-zone value is indicative and moves
//   freely — re-anchored when the planner publishes beyond the band with a
//   reason):
//     · new             — no previous value (a period entering the horizon, or
//                         the first version): published as calculated, not
//                         damped or band-checked (edge case).
//     · unchanged       — the engine's value equals the previous one.
//     · firmFrozen      — Firm zone (BR-01, BR-03): the previous value is kept.
//     · forecast        — Forecast zone: damped at the Forecast weight (0 by
//                         ENG-D9, so as calculated); no band.
//     · damped          — Trade-off (BR-04): damped = w·previous + (1−w)·new,
//                         and the damped value is inside the band.
//     · bandHeld        — Trade-off, the damped value beyond ±10% of the
//                         previous value (BR-05, ENG-D8): held at the band edge.
//     · cumulativeHeld  — Trade-off, beyond ±20% of the first value: held at
//                         the cumulative edge.
//     · override        — Trade-off beyond the band WITH the planner's reason:
//                         the damped value is published and the reason travels
//                         with it (BR-05, AC-02).
//   The allowed range is the intersection of the two bands,
//        [max(p(1−b), f(1−c)), min(p(1+b), f(1+c))];
//   the anchoring above keeps p inside the cumulative range, so the two always
//   meet; should they not, the period is held where it is. A previous value of
//   0 allows no move at all without a reason (ENG-B37): ±10% of nothing is
//   nothing.
//
// ── THE EFFECT ON PLAN CHANGE (E14-02, METHOD-SPEC G1) ──────────────────────
//   Replayed over the last versions at the stream's cadence, the raw sequence
//   (what suppliers would see if every run were published as calculated)
//   against the published one:
//     · MASC (`reliability.ts` `masc`): per consecutive version pair, the mean
//       absolute change over the weeks both carry ÷ the seasonal-naive scale.
//     · Plan-change share (RL.3.27 at forecast grain, ENG-B32): of the weeks
//       that sat inside the supplier's lead time in a later version, the share
//       whose quantity changed there.
//     · Trade-off revisions within the band (the requirement's leading metric),
//       against the same anchor (ENG-B31).
//
// Worked example (REQ-E14-06): previous 1,200, new 1,500, weight 0.5 → 1,350;
// band 1,080 to 1,320 → held at 1,320, or 1,350 with the reason "Promotion
// added". Cumulative: first 1,000, then 1,100 and 1,200; 1,300 is +8% on the
// last version but +30% on the first → held at 1,200. `stabilise.test.ts` runs
// both verbatim.
// ─────────────────────────────────────────────────────────────────────────────

import { daysBetween } from './dates';
import { DEFAULT_TOLERANCE_BAND, breachesToleranceBand, masc, type ToleranceBand } from './reliability';
import { zoneOf, type Zone } from './reschedule';
import type { IsoDate, WarehouseKind } from './types';

// ── Parameters ──────────────────────────────────────────────────────────────

export interface StabiliseParams {
  /** BR-04 / ENG-D9 — weight on the previous value in the Trade-off zone (0.5). The administrator's (X-05). */
  readonly tradeOffWeight: number;
  /** ENG-D9 — the Forecast zone's weight (0: no damping). */
  readonly forecastWeight: number;
  /** BR-05 / ENG-D8 — ±10% per version, ±20% cumulative (ENG-D8a still open: runs on ±20%). */
  readonly band: ToleranceBand;
}

export const DEFAULT_STABILISE_PARAMS: StabiliseParams = Object.freeze({
  tradeOffWeight: 0.5,
  forecastWeight: 0,
  band: DEFAULT_TOLERANCE_BAND,
});

/** The zones and lead time one supplier × material is judged by (REQ-E06-01 BR-05). */
export interface SeriesTerms {
  /** Firm zone length in days (BR-01: at least the lead time). */
  readonly firmDays: number;
  /** Trade-off zone length after Firm (BR-02). */
  readonly tradeOffDays: number;
  /** The supplier's lead time, for the plan-change share. */
  readonly leadTimeDays: number;
}

/** Two quantities closer than this (relative) are the same quantity. */
const EPS = 1e-9;
const same = (a: number, b: number): boolean => Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b));
/** Published quantities are kept to six decimals, so 1,200 × 1.1 reads 1,320. */
const round6 = (x: number): number => Math.round(x * 1e6) / 1e6;

// ── The quantity: net requirement lot-for-lot ───────────────────────────────

/**
 * The net requirement per week when every shortfall is met in its own week
 * (lot-for-lot): what the material needs from its suppliers, before E14-05
 * sizes it into orders.
 */
export function lotForLotNeed(
  startStock: number,
  gross: readonly number[],
  receipts: readonly number[],
  safetyStock: number,
): number[] {
  let onHand = startStock;
  return gross.map((g, t) => {
    const need = Math.max(0, g + safetyStock - (onHand + (receipts[t] ?? 0)));
    onHand = onHand + (receipts[t] ?? 0) + need - g;
    return need;
  });
}

// ── One period ──────────────────────────────────────────────────────────────

export type StabiliseRule = 'new' | 'unchanged' | 'firmFrozen' | 'forecast' | 'damped' | 'bandHeld' | 'cumulativeHeld' | 'override';
export const STABILISE_RULES: readonly StabiliseRule[] = [
  'new',
  'unchanged',
  'firmFrozen',
  'forecast',
  'damped',
  'bandHeld',
  'cumulativeHeld',
  'override',
];

/** BR-04 — the published value blended with the previous one. */
export const damp = (previous: number, next: number, weight: number): number => weight * previous + (1 - weight) * next;

export interface AllowedRange {
  readonly low: number;
  readonly high: number;
  /** Which band sets each edge. */
  readonly lowBy: 'perVersion' | 'cumulative';
  readonly highBy: 'perVersion' | 'cumulative';
}

/** BR-05 — the range a Trade-off period may move to this version: both bands at once. */
export function allowedRange(previous: number, first: number, band: ToleranceBand = DEFAULT_TOLERANCE_BAND): AllowedRange {
  const pLow = previous * (1 - band.perVersion);
  const pHigh = previous * (1 + band.perVersion);
  const cLow = first * (1 - band.cumulative);
  const cHigh = first * (1 + band.cumulative);
  const low = Math.max(pLow, cLow);
  const high = Math.min(pHigh, cHigh);
  if (low <= high + EPS * Math.max(1, Math.abs(high))) {
    return {
      low: round6(low),
      high: round6(high),
      lowBy: pLow >= cLow ? 'perVersion' : 'cumulative',
      highBy: pHigh <= cHigh ? 'perVersion' : 'cumulative',
    };
  }
  // The previous value sits outside the cumulative range (the anchoring in
  // `stabiliseSeries` prevents it): held where it is.
  const edge = round6(previous);
  return { low: edge, high: edge, lowBy: 'perVersion', highBy: 'perVersion' };
}

export interface PeriodInput {
  readonly period: IsoDate;
  readonly zone: Zone;
  /** The engine's value this version. */
  readonly raw: number;
  /** What the supplier saw last version; null for a new period. */
  readonly previous: number | null;
  /** The value the cumulative cap is measured from (ENG-B31); null for a new period. */
  readonly first: number | null;
  /** The planner's reason to publish beyond the band (BR-05). */
  readonly overrideReason?: string | null;
}

export interface PeriodResult {
  readonly period: IsoDate;
  readonly zone: Zone;
  readonly raw: number;
  readonly previous: number | null;
  readonly first: number | null;
  /** The damped value (Trade-off and Forecast); null where no damping applies. */
  readonly damped: number | null;
  /** The allowed range (Trade-off with a previous value); null elsewhere. */
  readonly range: AllowedRange | null;
  /** The damped value lies beyond the band — publishing it needs a reason (AC-02). */
  readonly beyondBand: boolean;
  readonly published: number;
  readonly rule: StabiliseRule;
  /** The planner's reason, published with the value (override only). */
  readonly reason: string | null;
  /** The period asks the supplier for a new commitment: new, or its quantity moved (REQ-E06-02 edge case). */
  readonly awaitingCommitment: boolean;
}

/** BR-01 to BR-05 for one period. */
export function stabilisePeriod(p: PeriodInput, params: StabiliseParams = DEFAULT_STABILISE_PARAMS): PeriodResult {
  const base = { period: p.period, zone: p.zone, raw: p.raw, previous: p.previous, first: p.first };
  const out = (
    published: number,
    rule: StabiliseRule,
    extra: Partial<Pick<PeriodResult, 'damped' | 'range' | 'beyondBand' | 'reason'>> = {},
  ): PeriodResult => ({
    ...base,
    damped: extra.damped ?? null,
    range: extra.range ?? null,
    beyondBand: extra.beyondBand ?? false,
    published,
    rule,
    reason: extra.reason ?? null,
    awaitingCommitment: p.previous === null || !same(published, p.previous),
  });

  if (p.previous === null) return out(p.raw, 'new');
  const previous = p.previous;
  if (same(p.raw, previous)) return out(previous, 'unchanged');
  if (p.zone === 'firm') return out(previous, 'firmFrozen');
  if (p.zone === 'forecast') {
    const d = round6(damp(previous, p.raw, params.forecastWeight));
    return out(d, 'forecast', { damped: d });
  }
  const d = round6(damp(previous, p.raw, params.tradeOffWeight));
  const first = p.first ?? previous;
  const range = allowedRange(previous, first, params.band);
  const beyondBand = breachesToleranceBand(previous, d, first, params.band);
  if (!beyondBand) return out(d, 'damped', { damped: d, range });
  const reason = p.overrideReason?.trim() ? p.overrideReason.trim() : null;
  if (reason) return out(d, 'override', { damped: d, range, beyondBand, reason });
  const high = d > range.high;
  const held = high ? range.high : range.low;
  const by = high ? range.highBy : range.lowBy;
  return out(held, by === 'cumulative' ? 'cumulativeHeld' : 'bandHeld', { damped: d, range, beyondBand });
}

// ── One supplier × material over its versions ───────────────────────────────

export interface VersionInput {
  /** The day the version is made (and would be published). */
  readonly asOf: IsoDate;
  /** Week → the engine's quantity. */
  readonly raw: ReadonlyMap<IsoDate, number>;
}

export interface StabilisedVersion {
  readonly asOf: IsoDate;
  readonly periods: readonly PeriodResult[];
  readonly published: ReadonlyMap<IsoDate, number>;
}

/** The zone of a week in a version made on `asOf`. */
export const zoneAt = (asOf: IsoDate, period: IsoDate, terms: Pick<SeriesTerms, 'firmDays' | 'tradeOffDays'>): Zone =>
  zoneOf(daysBetween(asOf, period), terms);

/**
 * The cumulative anchor of each week (ENG-B31), carried from version to
 * version: set to what the supplier saw when the week first sits outside the
 * Forecast zone (its previous value, or its own value if it is new there), and
 * reset to the published value when the planner publishes beyond the band with
 * a reason.
 */
function anchorFor(anchor: Map<IsoDate, number>, period: IsoDate, zone: Zone, previous: number | null): number | null {
  if (zone === 'forecast') return previous;
  if (!anchor.has(period) && previous !== null) anchor.set(period, previous);
  return anchor.get(period) ?? null;
}

/**
 * Every version in turn, oldest first: each is stabilised against what the
 * previous one PUBLISHED (not what it calculated). Reasons apply to the latest
 * version only — the one about to be published.
 */
export function stabiliseSeries(
  versions: readonly VersionInput[],
  terms: SeriesTerms,
  params: StabiliseParams = DEFAULT_STABILISE_PARAMS,
  reasons: ReadonlyMap<IsoDate, string> = new Map(),
): StabilisedVersion[] {
  const out: StabilisedVersion[] = [];
  const anchor = new Map<IsoDate, number>();
  let previous: ReadonlyMap<IsoDate, number> | null = null;
  versions.forEach((v, i) => {
    const latest = i === versions.length - 1;
    const periods = [...v.raw.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, raw]) => {
        const zone = zoneAt(v.asOf, period, terms);
        const before = previous?.get(period) ?? null;
        return stabilisePeriod(
          {
            period,
            zone,
            raw,
            previous: before,
            first: anchorFor(anchor, period, zone, before),
            overrideReason: latest ? (reasons.get(period) ?? null) : null,
          },
          params,
        );
      });
    for (const p of periods) {
      if (p.zone === 'forecast') continue;
      if (p.rule === 'new' || p.rule === 'override') anchor.set(p.period, p.published);
    }
    const published = new Map(periods.map((p) => [p.period, p.published] as const));
    out.push({ asOf: v.asOf, periods, published });
    previous = published;
  });
  return out;
}

// ── The effect on plan change ───────────────────────────────────────────────

export interface PlanChangeEffect {
  /** MASC per consecutive version pair (null pairs dropped). */
  readonly masc: readonly number[];
  /** Weeks that sat inside the lead time in a later version, and those that changed there. */
  readonly insideLeadTime: { readonly schedules: number; readonly changed: number };
  /** Trade-off revisions (a quantity that moved) and those inside the band. */
  readonly tradeOff: { readonly revisions: number; readonly withinBand: number };
}

/** The plan-change measures of a sequence of versions (oldest first). */
export function planChangeOf(
  versions: readonly { readonly asOf: IsoDate; readonly values: ReadonlyMap<IsoDate, number> }[],
  terms: SeriesTerms,
  scale: number | null,
  band: ToleranceBand = DEFAULT_TOLERANCE_BAND,
): PlanChangeEffect {
  const mascs: number[] = [];
  const anchor = new Map<IsoDate, number>();
  const schedules = new Set<IsoDate>();
  const changed = new Set<IsoDate>();
  let revisions = 0;
  let withinBand = 0;
  versions.forEach((v, i) => {
    if (i > 0) {
      const prev = versions[i - 1].values;
      const m = masc(prev, v.values, scale);
      if (m !== null) mascs.push(m);
      for (const [period, q] of v.values) {
        const before = prev.get(period);
        if (before === undefined) continue;
        const ahead = daysBetween(v.asOf, period);
        const zone = zoneOf(ahead, terms);
        const moved = !same(q, before);
        const first = anchorFor(anchor, period, zone, before) ?? before;
        if (ahead < terms.leadTimeDays) {
          schedules.add(period);
          if (moved) changed.add(period);
        }
        if (moved && zone === 'tradeOff') {
          revisions += 1;
          if (!breachesToleranceBand(before, q, first, band)) withinBand += 1;
        }
      }
    }
    // A week new outside the Forecast zone is anchored at its own first value.
    for (const [period, q] of v.values) {
      if (!anchor.has(period) && zoneOf(daysBetween(v.asOf, period), terms) !== 'forecast') anchor.set(period, q);
    }
  });
  return { masc: mascs, insideLeadTime: { schedules: schedules.size, changed: changed.size }, tradeOff: { revisions, withinBand } };
}

// ── The whole plan ──────────────────────────────────────────────────────────

export interface SeriesInput {
  readonly supplierId: string;
  readonly materialCode: string;
  readonly kind: WarehouseKind;
  readonly terms: SeriesTerms;
  /** The MASC scale (seasonal-naive MAE of the supplier's share of the requirement); null when it cannot scale. */
  readonly scale: number | null;
  /** The engine's versions at the stream's cadence, oldest first; the last is the one to publish now. */
  readonly versions: readonly VersionInput[];
}

export type RuleCounts = Readonly<Record<StabiliseRule, number>>;

export interface SeriesResult {
  readonly supplierId: string;
  readonly materialCode: string;
  readonly kind: WarehouseKind;
  readonly terms: SeriesTerms;
  readonly versionDates: readonly IsoDate[];
  /** The version to publish now, period by period (AC-03). */
  readonly latest: readonly PeriodResult[];
  /** Rules on the latest version. */
  readonly counts: RuleCounts;
  /** Rules over every version after the first (the first has no previous). */
  readonly replayCounts: RuleCounts;
  readonly raw: PlanChangeEffect;
  readonly stabilised: PlanChangeEffect;
}

export interface EffectTotals {
  /** Mean MASC over every supplier × material × version pair; null with none measurable. */
  readonly masc: number | null;
  readonly mascPairs: number;
  readonly insideLeadTime: { readonly schedules: number; readonly changed: number; readonly share: number | null };
  readonly tradeOff: { readonly revisions: number; readonly withinBand: number; readonly share: number | null };
}

export interface StabiliseRun {
  readonly params: StabiliseParams;
  readonly series: readonly SeriesResult[];
  readonly totals: {
    readonly raw: EffectTotals;
    readonly stabilised: EffectTotals;
    readonly counts: RuleCounts;
    readonly replayCounts: RuleCounts;
    /** Latest-version periods whose damped value is beyond the band (each needs a reason to publish it). */
    readonly beyondBand: number;
  };
}

export const emptyCounts = (): Record<StabiliseRule, number> =>
  Object.fromEntries(STABILISE_RULES.map((r) => [r, 0])) as Record<StabiliseRule, number>;

const countRules = (periods: readonly PeriodResult[], into: Record<StabiliseRule, number> = emptyCounts()) => {
  for (const p of periods) into[p.rule] += 1;
  return into;
};

const ratio = (num: number, den: number): number | null => (den > 0 ? num / den : null);

function totalsOf(effects: readonly PlanChangeEffect[]): EffectTotals {
  const all = effects.flatMap((e) => e.masc);
  const schedules = effects.reduce((s, e) => s + e.insideLeadTime.schedules, 0);
  const changed = effects.reduce((s, e) => s + e.insideLeadTime.changed, 0);
  const revisions = effects.reduce((s, e) => s + e.tradeOff.revisions, 0);
  const withinBand = effects.reduce((s, e) => s + e.tradeOff.withinBand, 0);
  return {
    masc: all.length > 0 ? all.reduce((s, x) => s + x, 0) / all.length : null,
    mascPairs: all.length,
    insideLeadTime: { schedules, changed, share: ratio(changed, schedules) },
    tradeOff: { revisions, withinBand, share: ratio(withinBand, revisions) },
  };
}

/** The key a planner's reason is held under. */
export const reasonKey = (supplierId: string, materialCode: string, period: IsoDate): string => `${supplierId}|${materialCode}|${period}`;

/** REQ-E14-06 over every supplier × material: stabilised versions, the latest to publish, and the effect on plan change. */
export function stabilisePlan(
  inputs: readonly SeriesInput[],
  params: StabiliseParams = DEFAULT_STABILISE_PARAMS,
  reasons: ReadonlyMap<string, string> = new Map(),
): StabiliseRun {
  const series: SeriesResult[] = inputs.map((s) => {
    const mine = new Map(
      [...reasons]
        .filter(([k]) => k.startsWith(`${s.supplierId}|${s.materialCode}|`))
        .map(([k, v]) => [k.slice(`${s.supplierId}|${s.materialCode}|`.length), v] as const),
    );
    const stabilised = stabiliseSeries(s.versions, s.terms, params, mine);
    const latest = stabilised[stabilised.length - 1]?.periods ?? [];
    const replay = emptyCounts();
    stabilised.slice(1).forEach((v) => countRules(v.periods, replay));
    return {
      supplierId: s.supplierId,
      materialCode: s.materialCode,
      kind: s.kind,
      terms: s.terms,
      versionDates: s.versions.map((v) => v.asOf),
      latest,
      counts: countRules(latest),
      replayCounts: replay,
      raw: planChangeOf(
        s.versions.map((v) => ({ asOf: v.asOf, values: v.raw })),
        s.terms,
        s.scale,
        params.band,
      ),
      stabilised: planChangeOf(
        stabilised.map((v) => ({ asOf: v.asOf, values: v.published })),
        s.terms,
        s.scale,
        params.band,
      ),
    };
  });
  const counts = emptyCounts();
  const replayCounts = emptyCounts();
  for (const s of series) {
    for (const r of STABILISE_RULES) {
      counts[r] += s.counts[r];
      replayCounts[r] += s.replayCounts[r];
    }
  }
  return {
    params,
    series,
    totals: {
      raw: totalsOf(series.map((s) => s.raw)),
      stabilised: totalsOf(series.map((s) => s.stabilised)),
      counts,
      replayCounts,
      beyondBand: series.reduce((n, s) => n + s.latest.filter((p) => p.beyondBand).length, 0),
    },
  };
}
