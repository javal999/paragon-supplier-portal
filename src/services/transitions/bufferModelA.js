// ─────────────────────────────────────────────────────────────────────────────
// PSC-4 (BL-339) — BUFFERS, MODEL A. The three buffers on ONE baseline, LTP A,
// and ROP Order adding each of them once.
//
//   DA(w)             = LTP A(w)                                  (BR-01, BR-02)
//   Protection        = max(0, AVG(LTP B over the lead-time weeks)
//                              − AVG(LTP A over them)) × P         (BR-03)
//   Strategic festive = Σ over the lead-time weeks of
//                       max(0, LTP Festive(w) − LTP A(w))          (BR-04)
//   Material          = the coverage weeks × the average weekly LTP A
//                       over those coverage weeks (the next N hub weeks)  (BR-05)
//   Strategic total   = festive + material                         (BR-06)
//   ROP Order         = LTP A × lead time + safety order
//                       + Protection + Strategic total             (BR-06)
//
// ⚠️ **TWO PER-MATERIAL SETTINGS (owner ruling 2026-11-19).** The Protection
// Buffer keeps its cover setting `P`, default 4 weeks. The Material Buffer has
// ITS OWN coverage weeks, default 2. This restores PEX-5 AC-01 exactly: with
// P = 4 and coverage 2 the example reads Protection 80, Strategic festive 90,
// Material 200 and a Strategic total of 290.
//   The earlier Q1 reading (ONE setting for both) is superseded by this ruling.
//
// ⚠️ **THE MATERIAL BUFFER'S WINDOW IS THE NEXT N HUB WEEKS**, not the
// lead-time weeks: N is the coverage setting, and the average is taken over the
// first N weeks of the LTP A series from the planning week.
//
// ⚠️ **A BUFFER THE INPUT CANNOT SUPPORT READS NULL, NEVER 0** (BR-08): LTP B or
// LTP Festive missing over the lead-time weeks, or the lead time missing, gives
// null, and ROP Order adds nothing for it. The page renders "Not available".
// The missing-lead-time edge case (PSC-4) still reads all three as
// "Not available", the Material Buffer included.
//
// Pure: series in, figures out. No clock, no store. Computed at read, so none is
// stamped; the ROP-only AUDIT record (DRC-D16) is written where the change is
// made, not here.
// ─────────────────────────────────────────────────────────────────────────────

/** The default cover setting P, in weeks (BR-03). */
export const COVER_WEEKS_DEFAULT = 4;

/** The default Material Buffer coverage, in weeks (owner ruling 2026-11-19). */
export const COVERAGE_WEEKS_DEFAULT = 2;

/** The bounds a per-material one of the two settings accepts, in weeks. */
export const COVER_WEEKS_MIN = 1;
export const COVER_WEEKS_MAX = 52;

/**
 * `x`: the mean of `values`; null when there is no value or any is missing.
 * A missing week is NOT zero: a short series cannot produce a full average.
 * @param {readonly (number | null | undefined)[]} values
 * @returns {number | null}
 */
export function meanOf(values) {
  if (values.length === 0) return null;
  let total = 0;
  for (const v of values) {
    if (v === null || v === undefined || !Number.isFinite(v)) return null;
    total += v;
  }
  return total / values.length;
}

/**
 * `value`: the quantity, rounded to whole units; `difference`: AVG(B) − AVG(A)
 * before the `max(0, …) × P`; both null when the series or the lead time is
 * missing (BR-08).
 * @typedef {{
 *   readonly value: number | null;
 *   readonly avgA: number | null;
 *   readonly avgB: number | null;
 *   readonly difference: number | null;
 * }} ProtectionBuffer
 */

/** @returns {ProtectionBuffer} */
const none = () => ({ value: null, avgA: null, avgB: null, difference: null });

/**
 * BR-03 — Protection Buffer = max(0, AVG(B) − AVG(A)) × P over the lead-time
 * weeks. Never negative (the edge case: B below A reads 0, not a credit).
 * @param {{ readonly ltpA: readonly number[]; readonly ltpB: readonly (number | null)[] | null; readonly leadTimeWeeks: number | null; readonly coverWeeks: number }} input
 * @returns {ProtectionBuffer}
 */
export function protectionBuffer({ ltpA, ltpB, leadTimeWeeks, coverWeeks }) {
  if (leadTimeWeeks === null || ltpB === null) return none();
  const n = Math.max(0, Math.round(leadTimeWeeks));
  const avgA = meanOf(ltpA.slice(0, n));
  const avgB = meanOf(ltpB.slice(0, n));
  if (avgA === null || avgB === null) return none();
  const difference = avgB - avgA;
  return {
    value: Math.round(Math.max(0, difference) * coverWeeks),
    avgA,
    avgB,
    difference
  };
}

/**
 * `value`: the sum, rounded to whole units; `weeks`: how many lead-time weeks
 * it summed. Both null when LTP Festive or the lead time is missing.
 * @typedef {{ readonly value: number | null; readonly weeks: number | null }} FestiveBuffer
 */

/**
 * BR-04 — the festive component: Σ max(0, LTP Festive(w) − LTP A(w)) over the
 * lead-time weeks. A week Festive is below A contributes 0, never a credit.
 * @param {{ readonly ltpA: readonly number[]; readonly ltpFestive: readonly (number | null)[] | null; readonly leadTimeWeeks: number | null }} input
 * @returns {FestiveBuffer}
 */
export function festiveBuffer({ ltpA, ltpFestive, leadTimeWeeks }) {
  if (leadTimeWeeks === null || ltpFestive === null) return { value: null, weeks: null };
  const n = Math.max(0, Math.round(leadTimeWeeks));
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    const f = ltpFestive[i];
    const a = ltpA[i];
    if (f === null || a === undefined || !Number.isFinite(a)) return { value: null, weeks: null };
    total += Math.max(0, f - a);
  }
  return { value: Math.round(total), weeks: n };
}

/**
 * `value`: the quantity, rounded to whole units; `average`: the weekly LTP A it
 * multiplied; both null when the input cannot support them (BR-08).
 * @typedef {{ readonly value: number | null; readonly average: number | null }} MaterialBuffer
 */

/**
 * BR-05 (owner ruling 2026-11-19) — the Material Buffer = its own coverage weeks
 * × the average weekly LTP A over those coverage weeks (the next N hub weeks).
 * The event calendar's switch decides whether it is ADDED (BR-07); this function
 * computes its size.
 * ⚠️ The lead time is still read for the missing-lead-time edge case (PSC-4):
 * with none, the buffer reads "Not available" like the other two.
 * @param {{ readonly ltpA: readonly number[]; readonly leadTimeWeeks: number | null; readonly coverageWeeks: number }} input
 * @returns {MaterialBuffer}
 */
export function materialBuffer({ ltpA, leadTimeWeeks, coverageWeeks }) {
  if (leadTimeWeeks === null) return { value: null, average: null };
  const n = Math.max(0, Math.round(coverageWeeks));
  if (n === 0) return { value: null, average: null };
  const average = meanOf(ltpA.slice(0, n));
  if (average === null) return { value: null, average: null };
  return { value: Math.round(average * n), average };
}

/**
 * BR-06 — the Strategic Buffer total = festive + material. A component that is
 * missing (null) adds nothing and is named in `missing`, so the page can say
 * which one (BR-08: "not available" and "not added").
 * @typedef {{
 *   readonly value: number | null;
 *   readonly missing: readonly ('festive' | 'material')[];
 * }} StrategicTotal
 */

/**
 * @param {FestiveBuffer} festive
 * @param {MaterialBuffer} material
 * @param {boolean} materialOn  BR-07 — the Material Buffer switch (calendar or override).
 * @returns {StrategicTotal}
 */
export function strategicTotal(festive, material, materialOn) {
  /** @type {('festive' | 'material')[]} */
  const missing = [];
  if (festive.value === null) missing.push('festive');
  const materialValue = materialOn ? material.value : 0;
  if (materialOn && materialValue === null) missing.push('material');
  return { value: (festive.value ?? 0) + (materialValue ?? 0), missing };
}

/**
 * The four figures of one supplier × material at one week, as the page and the
 * ROP Order read them. `coverWeeks` is the Protection setting P; `coverageWeeks`
 * is the Material Buffer's own coverage (owner ruling 2026-11-19).
 * @typedef {{
 *   readonly coverWeeks: number;
 *   readonly coverageWeeks: number;
 *   readonly protection: ProtectionBuffer;
 *   readonly festive: FestiveBuffer;
 *   readonly material: MaterialBuffer;
 *   readonly materialOn: boolean;
 *   readonly strategic: StrategicTotal;
 * }} BufferModelA
 */

/**
 * BR-03 to BR-07 — every buffer of one supplier × material, from its LTP A, B
 * and Festive series and its two per-material settings.
 * @param {{
 *   readonly ltpA: readonly number[];
 *   readonly ltpB: readonly (number | null)[] | null;
 *   readonly ltpFestive: readonly (number | null)[] | null;
 *   readonly leadTimeWeeks: number | null;
 *   readonly coverWeeks?: number | null;
 *   readonly coverageWeeks?: number | null;
 *   readonly materialOn?: boolean;
 * }} input
 * @returns {BufferModelA}
 */
export function bufferModelA(input) {
  const coverWeeks = input.coverWeeks ?? COVER_WEEKS_DEFAULT;
  const coverageWeeks = input.coverageWeeks ?? COVERAGE_WEEKS_DEFAULT;
  const protection = protectionBuffer({
    ltpA: input.ltpA,
    ltpB: input.ltpB,
    leadTimeWeeks: input.leadTimeWeeks,
    coverWeeks
  });
  const festive = festiveBuffer({
    ltpA: input.ltpA,
    ltpFestive: input.ltpFestive,
    leadTimeWeeks: input.leadTimeWeeks
  });
  const material = materialBuffer({
    ltpA: input.ltpA,
    leadTimeWeeks: input.leadTimeWeeks,
    coverageWeeks
  });
  const materialOn = input.materialOn === true;
  return {
    coverWeeks,
    coverageWeeks,
    protection,
    festive,
    material,
    materialOn,
    strategic: strategicTotal(festive, material, materialOn)
  };
}

/**
 * BR-06 — the quantity ROP Order adds: Protection + the Strategic total, each
 * once, and 0 for a buffer the inputs cannot support (BR-08).
 * @param {BufferModelA} buffers
 * @returns {number}
 */
export const ropOrderAdders = (buffers) =>
  (buffers.protection.value ?? 0) + (buffers.strategic.value ?? 0);
