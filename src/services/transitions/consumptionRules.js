// ─────────────────────────────────────────────────────────────────────────────
// RECORDED CONSUMPTION AND ABSORBING THE EXCESS — CAP-11 (BL-180),
// SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10 §5 (CAP-D14), with the fixed 4-week
// horizons of CAP-D17. Requirements §8 CAP-11 BR-01 to BR-05.
//
// Consumption is recorded by the planner per MATERIAL × week (typed or
// uploaded; later the SAP goods-issue feed). It is never derived from stock
// changes: the sample stock series is calibrated to warehouse fill, not
// balanced against receipts, so the result would be wrong unseen (brief §5).
//
//   1. IN FORCE. A later record for the same material × week supersedes the
//      earlier one at read; both stay stored (append-only).
//   2. SPLIT (CAP-D14, [Placeholder]). A material's weekly consumption is
//      shared across its suppliers by each one's share of that week's FROZEN
//      demand anticipation (`consumptionSplit`), in whole units.
//   3. EXCESS (BR-01). Per supplier × material × fixed horizon: the sum, over
//      the horizon's frozen weeks that HAVE consumption recorded, of
//      max(0, frozen demand anticipation − consumption). A week with no
//      consumption recorded adds nothing (AC-03).
//   4. ABSORB (BR-02, BR-03, CAP-D17). Into the NEXT horizon's weeks, spread
//      evenly (whole units, the remainder on the earliest weeks), never below
//      0 in a week; what a week cannot take moves on to the next week. What is
//      still left after the next horizon's last week is UNABSORBED (BR-04).
//   5. A FROZEN WEEK NEVER CHANGES. Absorbing touches only the next horizon's
//      weeks no publication froze. When the next horizon is published, its
//      weeks freeze WITH the absorption (`absorbed` on the frozen entry), and
//      that frozen absorption counts as already absorbed at every later read,
//      so it is never taken twice. A larger excess found after that freeze
//      can no longer be absorbed: it is unabsorbed and raises the alert.
//
// Everything here is pure: the records, the publications, today's figures
// and the hub clock's now are inputs. Every [Placeholder] is in the one
// `DEMAND_ANTICIPATION_RULES` block.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { DemandAnticipationAbsorbed, DemandAnticipationPublication, DemandAnticipationRowCore, DemandAnticipationSeries, DemandAnticipationWeekView } from './demandAnticipationRules' */
import { normalizeQty } from '@lib/localeNumber';
import {
  DEMAND_ANTICIPATION_RULES,
  horizonAnchor,
  horizonContaining
} from './demandAnticipationRules';
import { addDays, dayOf, mondayOf } from './inventoryRules';

/** @typedef {'manual' | 'upload' | 'sap'} ConsumptionSource */

/**
 * One recorded consumption of a material in a week (the store's row).
 * `week`:  The week's Monday.
 * `source`:  `manual` (typed), `upload` (the template) or `sap` (the goods-issue
 *   feed, not built yet: the verb refuses it from a planner).
 * `recordedAt`:  The hub clock when it was recorded.
 * `actor`:  Who recorded it.
 *
 * @typedef {{
 *   readonly id: string;
 *   readonly materialCode: string;
 *   readonly week: string;
 *   readonly qty: number;
 *   readonly unit: string;
 *   readonly source: ConsumptionSource;
 *   readonly recordedAt: string;
 *   readonly actor: ActorAttribution;
 * }} ConsumptionRecord
 */

/** The sources a planner may record from. `sap` is reserved for the feed. */
export const PLANNER_CONSUMPTION_SOURCES = /** @type {const} */ (['manual', 'upload']);

/**
 * @typedef {| 'UNKNOWN_MATERIAL'
 *   | 'NOT_A_WEEK'
 *   | 'FUTURE_WEEK'
 *   | 'NOT_A_QUANTITY'
 *   | 'UNIT_MISMATCH'
 *   | 'BAD_SOURCE'} ConsumptionRefusal
 */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {unknown} v
 * @returns {v is string}
 */
const isDay = (v) =>
  typeof v === 'string' &&
  ISO_DAY.test(v) &&
  !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) &&
  new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;

/**
 * The record verb's refusal, or null when it may proceed.
 *   · UNKNOWN_MATERIAL — not in the material master.
 *   · NOT_A_WEEK — not a calendar date, or not a Monday (weeks are named by their Monday).
 *   · FUTURE_WEEK — after the current hub week: consumption is what was used.
 *   · NOT_A_QUANTITY — not a finite number, or below zero. Zero is accepted:
 *     a week with no use is real, and it gives the largest excess.
 *   · UNIT_MISMATCH — not the material's unit in the master.
 *   · BAD_SOURCE — not `manual` or `upload` (`sap` is the feed's, not a planner's).
 * @param {{ readonly materialCode?: unknown; readonly week?: unknown; readonly qty?: unknown; readonly unit?: unknown; readonly source?: unknown }} payload
 * @param {{ readonly uomOf: (materialCode: string) => string | null; readonly nowIso: string }} ctx
 * @returns {ConsumptionRefusal | null}
 */
export function consumptionRefusal(payload, ctx) {
  const uom = typeof payload.materialCode === 'string' ? ctx.uomOf(payload.materialCode) : null;
  if (uom === null) return 'UNKNOWN_MATERIAL';
  if (!isDay(payload.week) || mondayOf(payload.week) !== payload.week) return 'NOT_A_WEEK';
  if (payload.week > mondayOf(dayOf(ctx.nowIso))) return 'FUTURE_WEEK';
  if (typeof payload.qty !== 'number' || !Number.isFinite(payload.qty) || payload.qty < 0)
    return 'NOT_A_QUANTITY';
  if (payload.unit !== uom) return 'UNIT_MISMATCH';
  if (!(/** @type {readonly unknown[]} */ (PLANNER_CONSUMPTION_SOURCES).includes(payload.source)))
    return 'BAD_SOURCE';
  return null;
}

/**
 * @param {string} materialCode
 * @param {string} week
 */
const mwKey = (materialCode, week) => `${materialCode}|${week}`;
/**
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string} week
 */
const smwKey = (supplierId, materialCode, week) => `${supplierId}|${materialCode}|${week}`;

/**
 * 1 — the record in force per material × week: the LATEST appended (the store
 * keeps them oldest first). Earlier records stay stored; they are only followed.
 * @param {readonly ConsumptionRecord[]} records
 * @returns {Map<string, ConsumptionRecord>}  keyed `materialCode|week`
 */
export function consumptionInForce(records) {
  /** @type {Map<string, ConsumptionRecord>} */
  const out = new Map();
  for (const r of records) out.set(mwKey(r.materialCode, r.week), r);
  return out;
}

/**
 * 2 — each supplier's share of a material's week (CAP-D14). By frozen demand
 * anticipation; evenly when the setting says so or when the week's total is 0.
 * @param {readonly { readonly supplierId: string; readonly qty: number }[]} holders
 * @returns {Map<string, number>}
 */
export function consumptionShares(holders) {
  const total = holders.reduce((n, h) => n + Math.max(0, h.qty), 0);
  const even = DEMAND_ANTICIPATION_RULES.consumptionSplit === 'even' || total <= 0;
  return new Map(
    holders.map((h) => [h.supplierId, even ? 1 / holders.length : Math.max(0, h.qty) / total])
  );
}

/**
 * 4 — spread `total` over weeks that can take at most `caps[i]` each: evenly
 * (whole units, the remainder on the earliest weeks), never below 0 in a
 * week, and what a week cannot take moves on to the next week.
 * @param {number} total
 * @param {readonly number[]} caps
 * @returns {{ takes: number[]; left: number }}
 */
export function spreadExcess(total, caps) {
  const whole = Math.max(0, Math.round(total));
  if (caps.length === 0) return { takes: [], left: whole };
  const base = Math.floor(whole / caps.length);
  const extra = whole - base * caps.length;
  let carry = 0;
  const takes = caps.map((cap, i) => {
    const want = base + (i < extra ? 1 : 0) + carry;
    const take = Math.min(want, Math.max(0, cap));
    carry = want - take;
    return take;
  });
  return { takes, left: carry };
}

/**
 * The supplier's share of a material's recorded week.
 * `qty`:  The supplier's share, whole units.
 * `materialQty`:  The material's recorded quantity, all suppliers.
 *
 * @typedef {{
 *   readonly qty: number;
 *   readonly materialQty: number;
 *   readonly share: number;
 *   readonly record: ConsumptionRecord;
 * }} ConsumptionShare
 */

/**
 * One supplier × material horizon whose excess is not fully absorbed (BR-04).
 * `fromWeeks`:  The horizon the excess arose in.
 * `intoWeeks`:  The next horizon it was absorbed into.
 * `remaining`:  What is left after the next horizon's last week.
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly fromWeeks: readonly string[];
 *   readonly intoWeeks: readonly string[];
 *   readonly excess: number;
 *   readonly remaining: number;
 * }} UnabsorbedExcess
 */

/**
 * @typedef {{
 *   readonly consumption: ReadonlyMap<string, ConsumptionShare>;
 *   readonly absorbed: ReadonlyMap<string, DemandAnticipationAbsorbed>;
 *   readonly unabsorbed: readonly UnabsorbedExcess[];
 * }} AbsorptionPlan
 */

/**
 * 2 to 5 — the consumption shares, the absorption per supplier × material ×
 * week (`supplierId|materialCode|week`), and what stays unabsorbed. A frozen
 * week's absorption is the one it froze with; an open week's is computed now
 * against today's figure.
 * @param {{
 *   readonly publications: readonly DemandAnticipationPublication[];
 *   readonly today: readonly DemandAnticipationSeries[];
 *   readonly records: readonly ConsumptionRecord[];
 * }} input
 * @param {string} nowIso
 * @returns {AbsorptionPlan}
 */
export function absorptionPlan({ publications, today, records }, nowIso) {
  const anchor = horizonAnchor(publications, nowIso);
  const n = DEMAND_ANTICIPATION_RULES.horizonWeeks;
  /** @param {string} start */
  const horizonOf = (start) => horizonContaining(anchor, start);

  // The frozen figure per supplier × material × week: the FIRST publication's.
  /** @type {Map<string, DemandAnticipationPublication['entries'][number]>} */
  const frozen = new Map();
  /** @type {Map<string, { supplierId: string; qty: number }[]>} */
  const holders = new Map();
  for (const p of publications)
    for (const e of p.entries) {
      const k = smwKey(e.supplierId, e.materialCode, e.week);
      if (frozen.has(k)) continue;
      frozen.set(k, e);
      const mw = mwKey(e.materialCode, e.week);
      holders.set(mw, [...(holders.get(mw) ?? []), { supplierId: e.supplierId, qty: e.qty }]);
    }

  // 2 — the split, over the suppliers frozen in that week.
  /** @type {Map<string, ConsumptionShare>} */
  const consumption = new Map();
  for (const [mw, record] of consumptionInForce(records)) {
    const of = holders.get(mw) ?? [];
    const shares = consumptionShares(of);
    for (const h of of) {
      const share = shares.get(h.supplierId) ?? 0;
      consumption.set(smwKey(h.supplierId, record.materialCode, record.week), {
        qty: Math.round(record.qty * share),
        materialQty: record.qty,
        share,
        record
      });
    }
  }

  // 3 — the excess per supplier × material × horizon.
  /** @type {Map<string, { supplierId: string; materialCode: string; from: string[]; qty: number }>} */
  const excess = new Map();
  for (const [k, c] of consumption) {
    const e = /** @type {NonNullable<ReturnType<typeof frozen.get>>} */ (frozen.get(k));
    const from = horizonOf(e.week);
    const hk = smwKey(e.supplierId, e.materialCode, from[0]);
    const prev = excess.get(hk) ?? {
      supplierId: e.supplierId,
      materialCode: e.materialCode,
      from,
      qty: 0
    };
    excess.set(hk, { ...prev, qty: prev.qty + Math.max(0, e.qty - c.qty) });
  }

  // Today's figure per supplier × material × week (what an open week can take).
  /** @type {Map<string, number>} */
  const figure = new Map();
  for (const s of today)
    for (const w of s.weeks) figure.set(smwKey(s.supplierId, s.materialCode, w.week), w.qty);

  // 5 — the absorption frozen weeks carry.
  /** @type {Map<string, DemandAnticipationAbsorbed>} */
  const absorbed = new Map();
  for (const [k, e] of frozen)
    if (e.absorbed && e.absorbed.qty > 0)
      absorbed.set(k, { ...e.absorbed, fromWeeks: horizonOf(e.absorbed.fromHorizonStart) });

  // 4 — absorb into the next horizon's open weeks.
  /** @type {UnabsorbedExcess[]} */
  const unabsorbed = [];
  for (const x of [...excess.values()].sort((a, b) =>
    `${a.supplierId}|${a.materialCode}|${a.from[0]}`.localeCompare(
      `${b.supplierId}|${b.materialCode}|${b.from[0]}`
    )
  )) {
    if (x.qty <= 0) continue;
    const into = horizonOf(addDays(x.from[0], n * 7));
    const keys = into.map((w) => smwKey(x.supplierId, x.materialCode, w));
    const already = keys.reduce((sum, k) => {
      const a = frozen.get(k)?.absorbed;
      return sum + (a && a.fromHorizonStart === x.from[0] ? a.qty : 0);
    }, 0);
    const open = keys.filter((k) => !frozen.has(k));
    const { takes, left } = spreadExcess(
      x.qty - already,
      open.map((k) => figure.get(k) ?? 0)
    );
    open.forEach((k, i) => {
      if (takes[i] > 0)
        absorbed.set(k, { qty: takes[i], fromHorizonStart: x.from[0], fromWeeks: x.from });
    });
    if (left > 0)
      unabsorbed.push({
        supplierId: x.supplierId,
        materialCode: x.materialCode,
        fromWeeks: x.from,
        intoWeeks: into,
        excess: x.qty,
        remaining: left
      });
  }
  return { consumption, absorbed, unabsorbed };
}

/**
 * The figures a publication made now freezes: today's, less the absorption of
 * each open week, carrying that absorption so it is never taken twice (5).
 * @param {readonly DemandAnticipationSeries[]} today
 * @param {AbsorptionPlan} plan
 * @returns {DemandAnticipationSeries[]}
 */
export function seriesInForce(today, plan) {
  return today.map((s) => ({
    ...s,
    weeks: s.weeks.map((w) => {
      const a = plan.absorbed.get(smwKey(s.supplierId, s.materialCode, w.week));
      return a
        ? {
            ...w,
            qty: w.qty - a.qty,
            absorbed: { qty: a.qty, fromHorizonStart: a.fromHorizonStart }
          }
        : w;
    })
  }));
}

/**
 * The page's rows with consumption and absorption (CAP-11). An open week's
 * `qty` — the figure in force — is today's figure less what it absorbs; a
 * frozen week keeps its published figure, and its "would be" carries the
 * absorption it froze with, so the two compare like for like.
 * @template {DemandAnticipationRowCore} R
 * @param {readonly R[]} rows
 * @param {AbsorptionPlan} plan
 * @returns {R[]}
 */
export function rowsInForce(rows, plan) {
  return rows.map((r) => ({
    ...r,
    weeks: r.weeks.map((w) => {
      const k = smwKey(r.supplierId, r.materialCode, w.week);
      const c = plan.consumption.get(k) ?? null;
      const a = plan.absorbed.get(k) ?? null;
      /** @type {DemandAnticipationWeekView} */
      const view = {
        ...w,
        consumption: c ? c.qty : null,
        consumptionRecord: c
          ? {
              materialQty: c.materialQty,
              share: c.share,
              source: c.record.source,
              recordedAt: c.record.recordedAt,
              recordId: c.record.id
            }
          : null,
        absorbed: a
      };
      if (!a) return view;
      if (w.frozen) {
        const wouldBe = w.wouldBe === null ? null : Math.max(0, w.wouldBe - a.qty);
        return {
          ...view,
          wouldBe,
          delta: wouldBe !== null && w.published !== null ? wouldBe - w.published : null
        };
      }
      return { ...view, qty: w.qty === null ? null : w.qty - a.qty };
    })
  }));
}

// ── The upload template ─────────────────────────────────────────────────────

/** @typedef {'materialCode' | 'week' | 'qty' | 'unit'} ConsumptionTemplateField */

/** The template's columns, in order, with their EN and ID headers. */
export const CONSUMPTION_TEMPLATE_FIELDS = /** @type {const} */ ([
  { field: 'materialCode', en: 'Material code', id: 'Kode material' },
  { field: 'week', en: 'Week (Monday)', id: 'Minggu (Senin)' },
  { field: 'qty', en: 'Consumption', id: 'Pemakaian' },
  { field: 'unit', en: 'Unit', id: 'Satuan' }
]);

/** @param {string} h */
const normHeader = (h) => h.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * The template as CSV text: one row per material and week, prefilled with the
 * code, the Monday and the unit; the consumption is left for the planner.
 * @param {readonly { readonly materialCode: string; readonly uom: string }[]} materials
 * @param {readonly string[]} weeks
 * @param {'en' | 'id'} language
 * @returns {string}
 */
export function consumptionTemplateCsv(materials, weeks, language) {
  const header = CONSUMPTION_TEMPLATE_FIELDS.map((f) => f[language]).join(',');
  const rows = materials.flatMap((m) => weeks.map((w) => `${m.materialCode},${w},,${m.uom}`));
  return [header, ...rows].join('\n') + '\n';
}

/**
 * @typedef {| 'unknownMaterial'
 *   | 'notAWeek'
 *   | 'futureWeek'
 *   | 'notANumber'
 *   | 'ambiguousNumber'
 *   | 'unitMismatch'
 *   | 'duplicateRow'} ConsumptionRowRefusal
 */

/**
 * `row`:  The spreadsheet row number (the header is row 1).
 * @typedef {{ readonly row: number; readonly materialCode: string; readonly reason: ConsumptionRowRefusal }} RefusedConsumptionRow
 */

/**
 * @typedef {{ readonly row: number; readonly materialCode: string; readonly week: string; readonly qty: number; readonly unit: string }} ConsumptionDraft
 */

/**
 * Check an uploaded file. A file without every template column is not the
 * template (an old or unrelated file) and is refused whole: `notTemplate`
 * names the missing columns. Otherwise each row is checked on its own with the
 * verb's own rule; a date inside a week counts as that week's Monday; blank
 * consumption rows are skipped (the template is prefilled).
 * @param {readonly string[]} headers
 * @param {readonly Record<string, string>[]} rows
 * @param {{ readonly uomOf: (materialCode: string) => string | null; readonly nowIso: string }} ctx
 * @returns {{ ok: false; missing: ConsumptionTemplateField[] } | { ok: true; accepted: ConsumptionDraft[]; refused: RefusedConsumptionRow[] }}
 */
export function validateConsumptionRows(headers, rows, ctx) {
  /** @type {Map<ConsumptionTemplateField, string>} */
  const column = new Map();
  for (const h of headers) {
    const f = CONSUMPTION_TEMPLATE_FIELDS.find(
      (x) => normHeader(x.en) === normHeader(h) || normHeader(x.id) === normHeader(h)
    );
    if (f && !column.has(f.field)) column.set(f.field, h);
  }
  const missing = CONSUMPTION_TEMPLATE_FIELDS.map((f) => f.field).filter((f) => !column.has(f));
  if (missing.length > 0) return { ok: false, missing };
  /** @param {Record<string, string>} r @param {ConsumptionTemplateField} f */
  const cell = (r, f) => (r[/** @type {string} */ (column.get(f))] ?? '').trim();

  /** @type {RefusedConsumptionRow[]} */
  const refused = [];
  /** @type {ConsumptionDraft[]} */
  const drafts = [];
  rows.forEach((r, i) => {
    const row = i + 2;
    const materialCode = cell(r, 'materialCode');
    const rawQty = cell(r, 'qty');
    if (rawQty === '') return;
    /** @param {ConsumptionRowRefusal} reason */
    const refuse = (reason) => refused.push({ row, materialCode, reason });
    const day = cell(r, 'week');
    const week = isDay(day) ? mondayOf(day) : day;
    const read = normalizeQty(rawQty);
    const qty = read.ok ? read.value : NaN;
    const verdict = consumptionRefusal(
      { materialCode, week, qty, unit: cell(r, 'unit'), source: 'upload' },
      ctx
    );
    if (verdict === 'UNKNOWN_MATERIAL') return refuse('unknownMaterial');
    if (verdict === 'NOT_A_WEEK') return refuse('notAWeek');
    if (verdict === 'FUTURE_WEEK') return refuse('futureWeek');
    // `normalizeQty` reads no sign, so a refused quantity is unreadable, never negative.
    if (verdict === 'NOT_A_QUANTITY')
      return refuse(read.ok || read.reason !== 'AMBIGUOUS_QTY' ? 'notANumber' : 'ambiguousNumber');
    if (verdict !== null) return refuse('unitMismatch');
    drafts.push({ row, materialCode, week, qty, unit: cell(r, 'unit') });
  });
  // Two rows for one material × week: neither is taken, since the file does not say which.
  const count = new Map();
  for (const d of drafts)
    count.set(mwKey(d.materialCode, d.week), (count.get(mwKey(d.materialCode, d.week)) ?? 0) + 1);
  const accepted = drafts.filter((d) => count.get(mwKey(d.materialCode, d.week)) === 1);
  for (const d of drafts)
    if (count.get(mwKey(d.materialCode, d.week)) > 1)
      refused.push({ row: d.row, materialCode: d.materialCode, reason: 'duplicateRow' });
  refused.sort((a, b) => a.row - b.row);
  return { ok: true, accepted, refused };
}
