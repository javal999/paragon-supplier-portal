// ─────────────────────────────────────────────────────────────────────────────
// DEMAND ANTICIPATION HISTORY — DRC-3 (BL-189), SC-HUB-DA-ROP-CALLOFF-
// REQUIREMENTS-2026-10 §3, decision DRC-D16, [Owner A10]: all history is kept,
// and Procurement and Finance audit it.
//
// A READ-ONLY view over the append-only publication store (DRC-2, BL-188). One
// row per publication × supplier × material: who published it and when, the
// planning week it records, each horizon week's figure and its parts (LTP, the
// safety order, the remainders carried in and the week each came from), OSPO,
// the additional PO, the call-offs of the planning week, the remainder and
// where it went, the supplier's agreement to carry outside the horizon, and
// the rules version the figure was stamped with (DRC-D16). Nothing here
// recomputes a figure: every number is the one the publication stored.
//
// SUPERSEDED IS SHOWN, NOT HIDDEN. Re-publishing a planning week appends a
// newer record that supersedes the earlier one at read (DRC-B21); both stay in
// the store, so both are rows here, the earlier one marked superseded and
// naming the publication that superseded it.
//
// DRC-5 (BL-191) — THE ADJUSTMENT AND ITS ORIGIN. A call-off delayed for an LTP
// drop moves its need date only when the supplier approves; the next
// publication's figures then carry it (the planning week's call-offs, the
// remainder and its carry are read from released call-offs by need-date
// week). Each row lists the approved delays of its supplier × material answered
// since that pair's previous publication — the call-off, its old and new need
// date, and who proposed and approved it — so the auditor sees why the figure
// moved. Computed at read from the call-offs' stored delay records (law 0.5).
//
// WHO MAY READ IT [Owner A10]: PTI's planning, procurement and finance seats,
// and the two superset roles (`SUPERSET_ROLES`). A supplier never: the
// publication is PTI's own plan (DRC-D10 holds the supplier view, BL-204).
// Reads in this hub hold no atom (§75e: atoms are the `requiredRole`s of
// transitions, and a read is not one), so the gate is the seat's BUSINESS
// ROLES — the narrowest read access the existing patterns allow.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { CallOff } from '../data/types' */
/** @import { Carry } from './osipRules' */
/** @import { DemandAnticipationPublication, RollingDaFlag } from './demandAnticipationRules' */
import { SUPERSET_ROLES } from './businessRoles';
import { addDays, dayOf, mondayOf } from './inventoryRules';

/**
 * The view's own values.
 *   · historyWeeksBack: [MoM 1A] the page opens on at least this many planning
 *                       weeks back from the current one. The store keeps every
 *                       publication; this is only the default date range.
 *   · readRoles:        [Owner A10] the business roles that read the history
 *                       (the planners, Procurement and Finance), besides the
 *                       superset roles.
 */
export const DA_HISTORY_RULES = Object.freeze({
  historyWeeksBack: 52,
  readRoles: Object.freeze(
    /** @type {readonly string[]} */ (['planning', 'procurement', 'finance'])
  )
});

/**
 * Why a seat may not read the history, or null when it may.
 *   · SUPPLIER — a supplier seat: the publication is PTI's own plan.
 *   · ROLE — a PTI seat holding none of the read roles.
 * @param {{ readonly personaType: string; readonly businessRoles?: readonly string[] }} scope
 * @returns {'SUPPLIER' | 'ROLE' | null}
 */
export function daHistoryReadRefusal(scope) {
  if (scope.personaType !== 'buyer') return 'SUPPLIER';
  const roles = scope.businessRoles ?? [];
  const allowed = roles.some(
    (r) =>
      DA_HISTORY_RULES.readRoles.includes(r) ||
      /** @type {ReadonlySet<string>} */ (SUPERSET_ROLES).has(r)
  );
  return allowed ? null : 'ROLE';
}

/**
 * One horizon week of a published figure, as stored.
 * `da`:  The week's demand anticipation as `rollingDaWeek` built it (LTP + safety + carried in).
 * `daInForce`:  After the plan check absorbed a surplus in the last week (DRC-4, DRC-B7).
 *
 * @typedef {{
 *   readonly week: string;
 *   readonly ltp: number;
 *   readonly safety: number;
 *   readonly carriedIn: readonly { readonly qty: number; readonly fromWeek: string }[];
 *   readonly da: number;
 *   readonly daInForce: number;
 * }} DaHistoryWeek
 */

/**
 * DRC-5 — a delay the supplier approved, reflected by the publication.
 * @typedef {{
 *   readonly callOffId: string;
 *   readonly callOffNumber: string;
 *   readonly quantity: number;
 *   readonly fromNeedDate: string;
 *   readonly toNeedDate: string;
 *   readonly fromWeek: string;
 *   readonly toWeek: string;
 *   readonly reasonCode: string;
 *   readonly proposedAt: string;
 *   readonly proposedBy: ActorAttribution;
 *   readonly approvedAt: string;
 *   readonly approvedBy: ActorAttribution | null;
 * }} DaHistoryAdjustment
 */

/**
 * One row of the history: one publication's figure for one supplier × material.
 * `inForce`:  The latest publication of its planning week (DRC-B21).
 * `supersededBy`:  The publication that superseded it, or null when in force.
 * `agreedFirstOutside`:  The supplier agreed to take the remainder in the first week outside the horizon [Owner A8].
 * `rulesVersion` / `inputs`:  The stamp (DRC-D16).
 *
 * @typedef {{
 *   readonly id: string;
 *   readonly publicationId: string;
 *   readonly publishedAt: string;
 *   readonly actor: ActorAttribution;
 *   readonly source: DemandAnticipationPublication['source'];
 *   readonly planningWeek: string;
 *   readonly inForce: boolean;
 *   readonly supersededBy: string | null;
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly weeks: readonly DaHistoryWeek[];
 *   readonly totalDa: number;
 *   readonly safetyOrder: number;
 *   readonly ospo: number;
 *   readonly additionalPo: number;
 *   readonly callOff: number;
 *   readonly remainder: number;
 *   readonly carry: Carry | null;
 *   readonly uncarried: number;
 *   readonly carryTarget: 'lastWeek' | 'firstOutside';
 *   readonly agreedFirstOutside: boolean;
 *   readonly flags: readonly RollingDaFlag[];
 *   readonly rulesVersion: string;
 *   readonly inputs: Readonly<Record<string, unknown>>;
 *   readonly adjustments: readonly DaHistoryAdjustment[];
 * }} DaHistoryRowCore
 */

/**
 * A row with names for the page (`getDemandAnticipationHistory`).
 * @typedef {DaHistoryRowCore & {
 *   readonly supplierName: string;
 *   readonly materialLabel: string;
 *   readonly uom: string;
 * }} DaHistoryRow
 */

/** @param {string} iso */
const weekOf = (iso) => mondayOf(dayOf(iso));

/**
 * DRC-5 — the approved delays of one supplier × material answered in
 * (`after`, `upTo`]; `after` null = from the beginning.
 * @param {readonly Pick<CallOff, 'id' | 'callOffNumber' | 'supplierId' | 'materialCode' | 'delays'>[]} callOffs
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string | null} after
 * @param {string} upTo
 * @returns {DaHistoryAdjustment[]}
 */
export function approvedDelaysBetween(callOffs, supplierId, materialCode, after, upTo) {
  return callOffs
    .filter((c) => c.supplierId === supplierId && c.materialCode === materialCode)
    .flatMap((c) =>
      (c.delays ?? [])
        .filter(
          (d) =>
            d.answer === 'approved' &&
            d.answeredAt !== undefined &&
            (after === null || d.answeredAt > after) &&
            d.answeredAt <= upTo
        )
        .map((d) => ({
          callOffId: c.id,
          callOffNumber: c.callOffNumber,
          quantity: d.quantity,
          fromNeedDate: d.fromNeedDate,
          toNeedDate: d.toNeedDate,
          fromWeek: weekOf(d.fromNeedDate),
          toWeek: weekOf(d.toNeedDate),
          reasonCode: d.reasonCode,
          proposedAt: d.proposedAt,
          proposedBy: d.proposedBy,
          approvedAt: /** @type {string} */ (d.answeredAt),
          approvedBy: d.answeredBy ?? null
        }))
    )
    .sort((a, b) => a.approvedAt.localeCompare(b.approvedAt));
}

/**
 * Every publication × supplier × material, newest publication first, pairs in
 * key order within one publication.
 * @param {readonly DemandAnticipationPublication[]} publications  Oldest first, as the store keeps them.
 * @param {readonly Pick<CallOff, 'id' | 'callOffNumber' | 'supplierId' | 'materialCode' | 'delays'>[]} callOffs
 * @returns {DaHistoryRowCore[]}
 */
export function daHistoryRows(publications, callOffs) {
  /** @type {DaHistoryRowCore[][]} */
  const groups = [];
  publications.forEach((pub, i) => {
    /** @type {DaHistoryRowCore[]} */
    const out = [];
    groups.push(out);
    const later = publications.slice(i + 1);
    const superseding = later.find((p) => p.planningWeek === pub.planningWeek) ?? null;
    const entries = [...pub.entries].sort((a, b) =>
      `${a.supplierId}|${a.materialCode}`.localeCompare(`${b.supplierId}|${b.materialCode}`)
    );
    for (const e of entries) {
      const f = e.figure.value;
      const previous =
        [...publications.slice(0, i)]
          .reverse()
          .find((p) =>
            p.entries.some(
              (x) => x.supplierId === e.supplierId && x.materialCode === e.materialCode
            )
          ) ?? null;
      out.push({
        id: `${pub.id}|${e.supplierId}|${e.materialCode}`,
        publicationId: pub.id,
        publishedAt: pub.publishedAt,
        actor: pub.actor,
        source: pub.source,
        planningWeek: pub.planningWeek,
        inForce: superseding === null,
        supersededBy: superseding ? superseding.id : null,
        supplierId: e.supplierId,
        materialCode: e.materialCode,
        weeks: f.weeks.map((w, k) => ({
          week: w.week,
          ltp: w.ltp,
          safety: w.safety,
          carriedIn: w.carriedIn,
          da: w.da,
          daInForce: f.daInForce[k] ?? w.da
        })),
        totalDa: f.totalDa,
        safetyOrder: f.safetyOrder,
        ospo: f.ospo,
        additionalPo: f.additionalPo,
        callOff: f.callOff,
        remainder: f.remainder,
        carry: f.carry,
        uncarried: f.uncarried,
        carryTarget: f.carryTarget,
        agreedFirstOutside: pub.agreedFirstOutside.includes(`${e.supplierId}|${e.materialCode}`),
        flags: f.flags,
        rulesVersion: e.figure.rulesVersion,
        inputs: e.figure.inputs,
        adjustments: approvedDelaysBetween(
          callOffs,
          e.supplierId,
          e.materialCode,
          previous ? previous.publishedAt : null,
          pub.publishedAt
        )
      });
    }
  });
  // Newest publication first: the store's order, reversed (two publications
  // can share a timestamp, so the order is the store's, not the clock's).
  return groups.reverse().flat();
}

/**
 * [MoM 1A] — the default date range of the view: the current planning week and
 * `historyWeeksBack` weeks before it, by planning week.
 * @param {string} nowIso
 * @returns {{ from: string; to: string }}
 */
export function defaultHistoryRange(nowIso) {
  const to = weekOf(nowIso);
  return { from: addDays(to, -7 * DA_HISTORY_RULES.historyWeeksBack), to };
}

/**
 * The view's filters: supplier, material and a planning-week date range (both
 * ends inclusive; a date inside a week counts its whole week). An empty filter
 * keeps everything.
 * @template {Pick<DaHistoryRowCore, 'supplierId' | 'materialCode' | 'planningWeek'>} R
 * @param {readonly R[]} rows
 * @param {{ readonly supplierId?: string | null; readonly materialCode?: string | null; readonly from?: string | null; readonly to?: string | null }} f
 * @returns {R[]}
 */
export function filterDaHistory(rows, f) {
  const from = f.from ? weekOf(f.from) : null;
  const to = f.to ? weekOf(f.to) : null;
  return rows.filter(
    (r) =>
      (!f.supplierId || r.supplierId === f.supplierId) &&
      (!f.materialCode || r.materialCode === f.materialCode) &&
      (from === null || r.planningWeek >= from) &&
      (to === null || r.planningWeek <= to)
  );
}

/** @param {unknown} v */
const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * The columns of the CSV, in order. The page passes the translated header for each.
 */
export const DA_HISTORY_CSV_COLUMNS = Object.freeze(
  /** @type {const} */ ([
    'publicationId',
    'publishedAt',
    'publishedBy',
    'status',
    'planningWeek',
    'supplierId',
    'supplierName',
    'materialCode',
    'week',
    'ltp',
    'safety',
    'carriedIn',
    'carriedFrom',
    'demandAnticipation',
    'demandAnticipationInForce',
    'ospo',
    'additionalPo',
    'callOff',
    'remainder',
    'carriedTo',
    'agreedFirstOutside',
    'rulesVersion'
  ])
);

/**
 * The filtered rows as CSV text, one line per publication × supplier × material
 * × horizon week, headed by the given (translated) column labels. `actorText`
 * and `statusText` render the attribution and in-force / superseded state.
 * @param {readonly DaHistoryRow[]} rows
 * @param {readonly string[]} header  One label per `DA_HISTORY_CSV_COLUMNS` entry.
 * @param {(a: ActorAttribution) => string} actorText
 * @param {(r: DaHistoryRow) => string} statusText
 * @returns {string}
 */
export function daHistoryCsv(rows, header, actorText, statusText) {
  const body = rows.flatMap((r) =>
    r.weeks.map((w) =>
      [
        r.publicationId,
        r.publishedAt,
        actorText(r.actor),
        statusText(r),
        r.planningWeek,
        r.supplierId,
        r.supplierName,
        r.materialCode,
        w.week,
        w.ltp,
        w.safety,
        w.carriedIn.reduce((s, c) => s + c.qty, 0),
        w.carriedIn.map((c) => c.fromWeek).join(' '),
        w.da,
        w.daInForce,
        r.ospo,
        r.additionalPo,
        r.callOff,
        r.remainder,
        r.carry ? r.carry.week : '',
        r.agreedFirstOutside ? 'yes' : 'no',
        r.rulesVersion
      ]
        .map(csvCell)
        .join(',')
    )
  );
  return [header.map(csvCell).join(','), ...body].join('\n');
}
