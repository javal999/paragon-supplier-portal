// ─────────────────────────────────────────────────────────────────────────────
// RECORDED CONSUMPTION — CAP-11 (BL-180) BR-01 and BR-05, kept under DRC-D13;
// SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10 §5 (CAP-D14).
//
// Consumption is recorded by the planner per MATERIAL × week (typed or
// uploaded; later the SAP goods-issue feed). It is never derived from stock
// changes: the sample stock series is calibrated to warehouse fill, not
// balanced against receipts, so the result would be wrong unseen (brief §5).
//
//   1. IN FORCE. A later record for the same material × week supersedes the
//      earlier one at read; both stay stored (append-only).
//   2. SPLIT (CAP-D14, `consumptionSplit`). A material's weekly consumption is
//      shared across its suppliers by each one's demand anticipation in force
//      that week, in whole units.
//
// ⚠️ ABSORBING THE EXCESS OVER WEEKS 5 TO 8 IS RETIRED. CAP-11 BR-02 and BR-03
// (and `absorptionPlan`, `spreadExcess`, `seriesInForce`, `rowsInForce`) are
// superseded by DRC-4 BR-02 (BL-190): supply above the demand anticipation is
// absorbed in the LAST week of the rolling horizon (`planCheck`, osipRules.js,
// read by `demandAnticipationRules`). The consumption record and its upload
// stay; they feed the grid's "Recorded consumption" row and the DRC-18 moving
// average.
//
// Everything here is pure: the records and the rows are inputs.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { DemandAnticipationRowCore, DemandAnticipationWeekView } from './demandAnticipationRules' */
import { normalizeQty } from '@lib/localeNumber';
import { DEMAND_ANTICIPATION_RULES } from './demandAnticipationRules';
import { dayOf, mondayOf } from './inventoryRules';

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
 * 2 — each supplier's share of a material's week (CAP-D14). By its demand
 * anticipation in force that week; evenly when the setting says so or when the week's total is 0.
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
 * CAP-11 BR-05 (kept) — every row's weeks with the supplier's share of the
 * material's recorded consumption, split across the material's suppliers by
 * their demand anticipation in force that week (CAP-D14).
 * @template {DemandAnticipationRowCore} R
 * @param {readonly R[]} rows
 * @param {readonly ConsumptionRecord[]} records
 * @returns {R[]}
 */
export function withConsumption(rows, records) {
  const inForce = consumptionInForce(records);
  /** @type {Map<string, ConsumptionShare>} */
  const byPairWeek = new Map();
  for (const [mw, record] of inForce) {
    const holders = rows.flatMap((r) =>
      r.materialCode === record.materialCode
        ? r.weeks
            .filter((w) => w.week === record.week)
            .map((w) => ({ supplierId: r.supplierId, qty: w.qty ?? 0 }))
        : []
    );
    const shares = consumptionShares(holders);
    for (const h of holders) {
      const share = shares.get(h.supplierId) ?? 0;
      byPairWeek.set(`${h.supplierId}|${mw}`, {
        qty: Math.round(record.qty * share),
        materialQty: record.qty,
        share,
        record
      });
    }
  }
  return rows.map((r) => ({
    ...r,
    weeks: r.weeks.map((w) => {
      const c = byPairWeek.get(`${r.supplierId}|${mwKey(r.materialCode, w.week)}`) ?? null;
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
          : null
      };
      return view;
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
