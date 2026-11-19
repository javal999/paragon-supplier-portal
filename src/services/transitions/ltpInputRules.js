// ─────────────────────────────────────────────────────────────────────────────
// BL-267 — LTP INPUTS (PEX-5), SC-HUB-PLAN-EXECUTION-REQUIREMENTS-2026-11.
//
// Four inputs per material, all from outside the hub (BR-01): LTP A, LTP
// Festive and LTP B (a quantity per hub week) and the LTP CHOICE (A, Festive or
// B). Until a feed exists the planner uploads them from a file on the DA page
// [Proposed, PEX-D12]; each upload is stamped with who, when and the source
// file name (BR-02). Pure: rows in, figures out.
//
//   DA(w)             = the chosen LTP(w)                              (BR-04)
//   strategic buffer  = LTP Festive − LTP A, when Festive is given     (BR-05)
//   protection buffer = LTP B − LTP A, when B is given, ROP Order only (BR-06)
//   the hub never picks the LTP; no choice reads LTP A                 (BR-07)
//
// MY CALLS (listed in the MR; none is in the requirements doc):
//   · An upload replaces the whole series of its material: the latest upload of
//     a series is the one in force; earlier ones stay on the ledger.
//   · A buffer is never below 0 (DRC-9a's rule), per week.
//   · A week the chosen series has no quantity for reads LTP A (or the source
//     forecast when A is not uploaded), flagged `CHOICE_WEEK_EMPTY`.
//   · ROP Order adds the protection buffer summed over the horizon weeks, as
//     cycle stock is a horizon total.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'A' | 'Festive' | 'B'} LtpSeries */

/** The three series, in the order the grid shows them. @type {readonly LtpSeries[]} */
export const LTP_SERIES = Object.freeze(/** @type {LtpSeries[]} */ (['A', 'Festive', 'B']));

/** BR-07 — a material with no choice uses LTP A. @type {LtpSeries} */
export const DEFAULT_LTP_CHOICE = 'A';

/** @param {unknown} s @returns {s is LtpSeries} */
export const isLtpSeries = (s) =>
  typeof s === 'string' && LTP_SERIES.includes(/** @type {any} */ (s));

/**
 * The ledger keys: `upload|<material>|<series>` and `choice|<material>`.
 * @typedef {{ readonly kind: 'upload'; readonly materialCode: string; readonly series: LtpSeries }
 *   | { readonly kind: 'choice'; readonly materialCode: string }} LtpInputKey
 */

/** @param {string} materialCode @param {LtpSeries} series @returns {string} */
export const ltpUploadKey = (materialCode, series) => `upload|${materialCode}|${series}`;
/** @param {string} materialCode @returns {string} */
export const ltpChoiceKey = (materialCode) => `choice|${materialCode}`;

/**
 * @param {string} key
 * @returns {LtpInputKey | null}
 */
export function parseLtpInputKey(key) {
  const [kind, materialCode, series, ...rest] = key.split('|');
  if (rest.length > 0 || !materialCode) return null;
  if (kind === 'choice' && series === undefined) return { kind, materialCode };
  if (kind === 'upload' && isLtpSeries(series)) return { kind, materialCode, series };
  return null;
}

/** @param {string} day @returns {boolean} a Monday, YYYY-MM-DD */
function isMonday(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.getUTCDay() === 1 && d.toISOString().slice(0, 10) === day;
}

/**
 * Why a payload is refused, or null. The one predicate the policy hook and the
 * page's form both call.
 * @param {LtpInputKey} key
 * @param {{ readonly weeks?: unknown; readonly sourceFile?: unknown; readonly ltpChoice?: unknown }} payload
 * @returns {string | null}
 */
export function ltpInputRefusal(key, payload) {
  if (key.kind === 'choice') {
    return isLtpSeries(payload.ltpChoice)
      ? null
      : 'LTP_CHOICE_INVALID: the choice is A, Festive or B';
  }
  return ltpUploadRefusal(payload);
}

/**
 * Why an upload's file name and weeks are refused, or null. The part of
 * `ltpInputRefusal` that does not depend on which material or series it is for.
 * @param {{ readonly weeks?: unknown; readonly sourceFile?: unknown }} payload
 * @returns {string | null}
 */
export function ltpUploadRefusal(payload) {
  if (typeof payload.sourceFile !== 'string' || payload.sourceFile.trim() === '')
    return 'LTP_SOURCE_FILE_REQUIRED: name the file the quantities come from';
  const weeks = payload.weeks;
  if (typeof weeks !== 'object' || weeks === null || Array.isArray(weeks))
    return 'LTP_WEEKS_INVALID: a quantity per week is expected';
  const entries = Object.entries(weeks);
  if (entries.length === 0) return 'LTP_WEEKS_INVALID: the file holds no week';
  for (const [week, qty] of entries) {
    if (!isMonday(week)) return `LTP_WEEKS_INVALID: ${week} is not a Monday (YYYY-MM-DD)`;
    if (typeof qty !== 'number' || !Number.isFinite(qty) || qty < 0)
      return `LTP_WEEKS_INVALID: the quantity of ${week} is not a number from 0`;
  }
  return null;
}

/**
 * One ledger row, as stored.
 * @typedef {{
 *   readonly key: string;
 *   readonly kind: 'upload' | 'choice';
 *   readonly materialCode: string;
 *   readonly series: LtpSeries | null;
 *   readonly weeks: Readonly<Record<string, number>> | null;
 *   readonly sourceFile: string | null;
 *   readonly choice: LtpSeries | null;
 *   readonly previousChoice: LtpSeries | null;
 *   readonly setAt: string;
 *   readonly setBy: import('@lib/enforcement').ActorAttribution;
 * }} LtpInputRow
 */

/**
 * The upload in force for a material and series: the latest row, or null.
 * @param {readonly LtpInputRow[]} rows oldest first
 * @param {string} materialCode
 * @param {LtpSeries} series
 * @returns {LtpInputRow | null}
 */
export function uploadInForce(rows, materialCode, series) {
  const mine = rows.filter(
    (r) => r.kind === 'upload' && r.materialCode === materialCode && r.series === series
  );
  return mine.length > 0 ? mine[mine.length - 1] : null;
}

/**
 * The choice in force for a material (BR-07: A with none).
 * @param {readonly LtpInputRow[]} rows oldest first
 * @param {string} materialCode
 * @returns {LtpSeries}
 */
export function choiceInForce(rows, materialCode) {
  const mine = rows.filter((r) => r.kind === 'choice' && r.materialCode === materialCode);
  return mine.length > 0
    ? (mine[mine.length - 1].choice ?? DEFAULT_LTP_CHOICE)
    : DEFAULT_LTP_CHOICE;
}

/**
 * `qty` per week for each series: null where the series is not uploaded or has
 * no quantity for that week.
 * @typedef {{
 *   readonly materialCode: string;
 *   readonly choice: LtpSeries;
 *   readonly hasUpload: boolean;
 *   readonly uploads: Readonly<Record<LtpSeries, LtpInputRow | null>>;
 * }} MaterialLtpInputs
 */

/**
 * @param {readonly LtpInputRow[]} rows oldest first
 * @param {string} materialCode
 * @returns {MaterialLtpInputs}
 */
export function materialLtpInputs(rows, materialCode) {
  const uploads = {
    A: uploadInForce(rows, materialCode, 'A'),
    Festive: uploadInForce(rows, materialCode, 'Festive'),
    B: uploadInForce(rows, materialCode, 'B')
  };
  return {
    materialCode,
    choice: choiceInForce(rows, materialCode),
    hasUpload: uploads.A !== null || uploads.Festive !== null || uploads.B !== null,
    uploads
  };
}

/**
 * One supplier × material's LTP weeks, with the three series, the chosen one,
 * and the buffers (BR-03 to BR-06). `source` is the weekly figure the hub read
 * before (the Foresight commitment `forecastQty`, spread by week) and stays the
 * LTP A until A is uploaded (BR-02). `share` splits a material's uploaded
 * quantity to this supplier [my call, see the MR].
 *
 * @typedef {'CHOICE_WEEK_EMPTY' | 'CHOICE_SERIES_NOT_UPLOADED'} LtpInputFlag
 * @typedef {{
 *   readonly choice: LtpSeries;
 *   readonly aFromUpload: boolean;
 *   readonly a: readonly number[];
 *   readonly festive: readonly (number | null)[];
 *   readonly b: readonly (number | null)[];
 *   readonly used: readonly number[];
 *   readonly strategicBuffer: readonly (number | null)[];
 *   readonly protectionBuffer: readonly (number | null)[];
 *   readonly flags: readonly LtpInputFlag[];
 * }} LtpWeeks
 */

/**
 * @param {readonly string[]} weeks hub Mondays
 * @param {readonly number[]} source today's per-week LTP for the pair
 * @param {MaterialLtpInputs | null} inputs null: nothing uploaded, nothing chosen
 * @param {number} share the supplier's share of the material, 0 to 1
 * @returns {LtpWeeks}
 */
export function ltpWeeks(weeks, source, inputs, share) {
  /** @type {LtpInputFlag[]} */
  const flags = [];
  /** @param {LtpSeries} s @returns {(number | null)[]} */
  const series = (s) => {
    const up = inputs?.uploads[s] ?? null;
    if (!up?.weeks) return weeks.map(() => null);
    const w = up.weeks;
    return weeks.map((wk) => (wk in w ? Math.round(w[wk] * share) : null));
  };
  const aUp = series('A');
  const aFromUpload = inputs?.uploads.A != null;
  // BR-02 — until A is uploaded, the forecast source stays; a week the upload
  // leaves out also reads the source.
  const a = weeks.map((_, i) => aUp[i] ?? source[i] ?? 0);
  const festive = series('Festive');
  const b = series('B');
  const choice = inputs?.choice ?? DEFAULT_LTP_CHOICE;
  const chosen = choice === 'Festive' ? festive : choice === 'B' ? b : null;
  if (chosen !== null && inputs?.uploads[choice] == null) flags.push('CHOICE_SERIES_NOT_UPLOADED');
  const used = weeks.map((_, i) => {
    if (chosen === null) return a[i];
    if (chosen[i] === null) {
      if (inputs?.uploads[choice] != null && !flags.includes('CHOICE_WEEK_EMPTY'))
        flags.push('CHOICE_WEEK_EMPTY');
      return a[i];
    }
    return /** @type {number} */ (chosen[i]);
  });
  return {
    choice,
    aFromUpload,
    a,
    festive,
    b,
    used,
    // BR-05 / BR-06, never below 0 [my call].
    strategicBuffer: festive.map((f, i) => (f === null ? null : Math.max(0, f - a[i]))),
    protectionBuffer: b.map((x, i) => (x === null ? null : Math.max(0, x - a[i]))),
    flags
  };
}

/**
 * BR-06 — the protection buffer ROP Order adds, summed over `horizon` weeks;
 * 0 when LTP B is not given.
 * @param {LtpWeeks} w
 * @param {number} horizon
 * @returns {number}
 */
export function protectionForRopOrder(w, horizon) {
  let total = 0;
  for (const v of w.protectionBuffer.slice(0, horizon)) total += v ?? 0;
  return total;
}

/**
 * The protection buffer of the BL-205 uplift (`protectionUplift`) is replaced by
 * LTP B − LTP A when LTP B is given (BR-06). True when the figure comes from B.
 * @param {MaterialLtpInputs | null} inputs
 * @returns {boolean}
 */
export const protectionFromInputs = (inputs) => inputs?.uploads.B != null;

/**
 * BR-05 — true when the strategic buffer comes from LTP Festive; false: the
 * DRC-9a calculation (LTP − baseline) is the fallback.
 * @param {MaterialLtpInputs | null} inputs
 * @returns {boolean}
 */
export const strategicFromInputs = (inputs) => inputs?.uploads.Festive != null;

/** Characters a pasted figure can carry that no one can see (see parseLtpCsv). */
const INVISIBLE_CHARS = /[\u200B-\u200D\u2060\uFEFF]/g;

/**
 * PEX-5 BR-02 — the planner's per-material upload file: one line per week,
 * `week,quantity` (`YYYY-MM-DD` Monday, a quantity from 0), comma or semicolon,
 * a header line optional. Returns the weeks, or the reason the file is refused.
 * Superseded on screen by the batch file below (PSC-3 BR-01); kept because the
 * per-material format is what its own parser's tests pin.
 *
 * Invisible characters are removed first (zero-width space U+200B, joiners
 * U+200C/U+200D, word joiner U+2060, byte-order mark U+FEFF): they come in when
 * figures are pasted from a web page or a chat, `trim()` keeps U+200B to U+2060,
 * and `Number('20067\u200B')` is NaN. Found on a planner's LTP A file for
 * 2000028400 (2026-11-12), where every quantity ended in U+200B.
 * @param {string} text
 * @returns {{ readonly weeks: Record<string, number> } | { readonly refusal: string }}
 */
export function parseLtpCsv(text) {
  /** @type {Record<string, number>} */
  const weeks = {};
  const lines = text
    .replace(INVISIBLE_CHARS, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '');
  lines.forEach((line, i) => {
    const [week, qty, ...rest] = line.split(/[,;\t]/).map((c) => c.trim());
    if (i === 0 && !/^\d/.test(week)) return; // a header
    weeks[week] = rest.length > 0 || qty === undefined || qty === '' ? Number.NaN : Number(qty);
  });
  const refusal = ltpUploadRefusal({ weeks, sourceFile: 'x' });
  return refusal ? { refusal } : { weeks };
}

/**
 * PSC-3 BR-01 (BL-338) — one material's rows in a batch file, collapsed: the
 * last row of a material × week is the one kept (the edge case below).
 * @typedef {{ readonly materialCode: string; readonly weeks: Readonly<Record<string, number>> }} LtpBatchMaterial
 */

/**
 * A material × week the file repeats, so the page can list it (PSC-3 edge
 * case: a repeated material takes the last row and the page lists the repeat).
 * @typedef {{ readonly materialCode: string; readonly week: string }} LtpBatchRepeat
 */

/**
 * PSC-3 BR-01 (BL-338) — the batch upload file: one row per material × week,
 * `material,week,quantity` (`YYYY-MM-DD` Monday, a quantity from 0), comma,
 * semicolon or tab, a header line optional. The one CSV per series.
 *
 * A material repeated for the same week keeps its LAST row (the last row wins,
 * PSC-3 edge case) and the repeat is listed in `repeated`; a material's weeks
 * are returned in the order the file first names them, one entry per material.
 * A first line is a header only when its week cell is not a Monday AND its
 * quantity cell is not a number — so a file with no header is read as data
 * from its first line, and a data line with a bad week is refused, not skipped.
 *
 * [My call, listed in the report: the column order and these refusal tokens.]
 * @param {string} text
 * @returns {{ readonly materials: readonly LtpBatchMaterial[]; readonly repeated: readonly LtpBatchRepeat[] } | { readonly refusal: string }}
 */
export function parseLtpBatchCsv(text) {
  /** @type {Map<string, Record<string, number>>} */
  const byMaterial = new Map();
  /** @type {LtpBatchRepeat[]} */
  const repeated = [];
  /** @type {Set<string>} */
  const seen = new Set();
  const lines = text
    .replace(INVISIBLE_CHARS, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '');
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split(/[,;\t]/).map((c) => c.trim());
    // A header names its columns (its quantity cell is not a number); a data
    // line with a bad week is NOT a header and is refused below.
    if (i === 0 && !isMonday(cells[1] ?? '') && Number.isNaN(Number(cells[2]))) continue;
    if (cells.length !== 3)
      return { refusal: `LTP_BATCH_ROW_INVALID: line ${i + 1} needs material, week and quantity` };
    const [materialCode, week, qty] = cells;
    if (materialCode === '')
      return { refusal: `LTP_BATCH_MATERIAL_REQUIRED: line ${i + 1} names no material` };
    if (!isMonday(week))
      return { refusal: `LTP_WEEKS_INVALID: ${week} is not a Monday (YYYY-MM-DD)` };
    const n = qty === '' ? Number.NaN : Number(qty);
    if (!Number.isFinite(n) || n < 0)
      return { refusal: `LTP_WEEKS_INVALID: the quantity of ${week} is not a number from 0` };
    const key = `${materialCode}|${week}`;
    if (seen.has(key)) repeated.push({ materialCode, week });
    seen.add(key);
    const weeks = byMaterial.get(materialCode) ?? {};
    weeks[week] = n;
    byMaterial.set(materialCode, weeks);
  }
  if (byMaterial.size === 0) return { refusal: 'LTP_BATCH_EMPTY: the file holds no row' };
  return {
    materials: [...byMaterial].map(([materialCode, weeks]) => ({ materialCode, weeks })),
    repeated
  };
}

/**
 * One week's uploaded figure beside the computed total (PSC-3 BR-02, BR-04).
 * `computed` null: the hub has no total for the week ("Not available"), and
 * the difference is null with it; when both exist the difference is
 * `uploaded − computed` and the upload wins (PSC-3 edge case).
 * @typedef {{
 *   readonly week: string;
 *   readonly uploaded: number;
 *   readonly computed: number | null;
 *   readonly difference: number | null;
 * }} LtpBatchComparison
 */

/**
 * PSC-3 BR-02 / BR-04 — the uploaded figures against the computed totals,
 * week by week, sorted by week. The page renders both and the difference;
 * none of the arithmetic happens there.
 * @param {Readonly<Record<string, number>>} uploaded
 * @param {Readonly<Record<string, number | null | undefined>>} computed
 * @returns {readonly LtpBatchComparison[]}
 */
export function compareLtpBatch(uploaded, computed) {
  return Object.keys(uploaded)
    .sort()
    .map((week) => {
      const c = computed[week] ?? null;
      const up = uploaded[week];
      return { week, uploaded: up, computed: c, difference: c === null ? null : up - c };
    });
}

/**
 * PSC-3 BR-04 — whether the hub holds a computed total for a material at all:
 * false when the FG demand read is unavailable, or when every finished good
 * that uses the material carries no plan row (so the total would be 0 only
 * because the plan is missing). A material no finished good uses has no plan
 * behind it either. The page reads this, never re-derives it.
 * @param {{ readonly fgDemandAvailable?: boolean; readonly fgUsers?: readonly string[]; readonly noPlanFgs?: readonly string[] }} row
 * @returns {boolean}
 */
export function ltpComputedAvailable(row) {
  if (row.fgDemandAvailable === false) return false;
  const users = row.fgUsers ?? [];
  const noPlan = row.noPlanFgs ?? [];
  return users.length > noPlan.length;
}
