// ─────────────────────────────────────────────────────────────────────────────
// BL-268 — DA VERSIONS (PEX-6), SC-HUB-PLAN-EXECUTION-REQUIREMENTS-2026-11.
//
// A DA version is a publication, as today (BR-01). When an input changes AND
// that moves a DA figure, the published DA is marked out of date with the
// cause; the next publication stores the causes since the previous one: which
// input, old value, new value, who, when (BR-02). An input change that moves no
// DA figure stays on its ledger and is not a version (BR-03).
//
// Inputs this reads (the ledgers that exist): LTP A, LTP Festive, LTP B and the
// safety stock values Z and g (`osipParams`). PSC-4 (BL-339) — the LTP CHOICE
// cause is RETIRED with the choice itself as a DA input (BR-01; PEX-6 BR-01
// "after": "The LTP choice cause is retired"), and LTP B and Festive reach DA
// only as the series in use, which is LTP A now: a B or Festive upload moves no
// DA week on its own. PSC-4 BR-10 keeps the model A buffers out of the versions:
// the cover setting, the event window, the Material Buffer switch and the
// protection buffer switch move ROP Order only, so they are recorded with
// DRC-D16 (the ROP Order figure's stored inputs and rules version) and write no
// DA version (owner ruling 2026-11-19, Q2).
//
// PEX-13 BR-03: the safety stock switch (`safetyStockOn`) is a cause; turning it
// off zeroes DA's safety order, so it moves DA. The protection buffer switch
// (`protectionBufferOn`) is NOT one: it acts on ROP Order only and moves no DA
// week, and PEX-6 BR-03 keeps an input that moves no DA figure out of the
// versions. If a rule later lets it reach DA, add its kind here.
//
// "Moves a DA figure" = a DA week of the figure differs from the figure it is
// set against (the published one for an out-of-date mark, the previous one for
// a publication's causes). A cause counts only when it can have moved it: an
// upload of a series only when that series is the one in use; a change of Z or g
// only when a week moved.
//
// "Since" is a position in the ledgers, not a time: a publication records how
// many rows each ledger held when it was made (`LedgerMark`), and its causes are
// the rows after that mark. The hub clock is one declared instant, so a time
// window would drop every change made in the same instant.
//
// Pure: ledger rows and figures in, causes out.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { LtpInputRow, LtpSeries } from './ltpInputRules' */

/**
 * @typedef {'ltpA' | 'ltpFestive' | 'ltpB' | 'safetyStock' | 'safetySwitch'} DaCauseKind
 */

/** The kinds, in the order a list shows them. @type {readonly DaCauseKind[]} */
export const DA_CAUSE_KINDS = Object.freeze(
  /** @type {DaCauseKind[]} */ (['ltpA', 'ltpFestive', 'ltpB', 'safetyStock', 'safetySwitch'])
);

/**
 * `before` / `after`: a series' total quantity over its uploaded weeks, a choice
 * ('A', 'Festive', 'B') or a safety stock value (Z or g); null: none before.
 * `detail`: for safety stock, which value ('z' or 'g').
 * `safetySwitch` (PEX-13 BR-03): `before` / `after` are 'on' or 'off'; `reason` is the free text the switch change carried.
 * @typedef {{
 *   readonly kind: DaCauseKind;
 *   readonly detail: string | null;
 *   readonly before: number | string | null;
 *   readonly after: number | string | null;
 *   readonly at: string;
 *   readonly by: ActorAttribution;
 *   readonly reason?: string | null;
 * }} DaCause
 */

/**
 * How many rows the ledgers held (LTP inputs, OSIP values) — what a publication
 * records, so the next one can tell which changes came after it.
 * @typedef {{ readonly ltp: number; readonly osip: number }} LedgerMark
 */

/** @type {Record<LtpSeries, DaCauseKind>} */
const KIND_OF_SERIES = { A: 'ltpA', Festive: 'ltpFestive', B: 'ltpB' };

/** @param {Readonly<Record<string, number>> | null} weeks */
const total = (weeks) => (weeks ? Object.values(weeks).reduce((n, q) => n + q, 0) : null);

/**
 * Whether any week the two figures share differs. A week only one has is not a
 * move: the horizon rolls.
 * @param {readonly { readonly week: string; readonly da: number }[]} before
 * @param {readonly { readonly week: string; readonly da: number }[]} after
 * @returns {boolean}
 */
export function daMoved(before, after) {
  const was = new Map(before.map((w) => [w.week, w.da]));
  return after.some((w) => was.has(w.week) && was.get(w.week) !== w.da);
}

/**
 * The causes set against a figure: every ledger change of the material after
 * the `since` mark that can have moved DA, oldest first. Empty when no DA
 * week moved (`moved` false): then the changes are input changes only (BR-03).
 * `osipRows` are the ledger rows of Z and g (`key` like `z|<material>`).
 * @param {{
 *   readonly materialCode: string;
 *   readonly since: LedgerMark;
 *   readonly moved: boolean;
 *   readonly ltpRows: readonly LtpInputRow[];
 *   readonly osipRows: readonly { readonly key: string; readonly param: string; readonly value: number | boolean | null; readonly previous: number | boolean | null; readonly reason?: string | null; readonly setAt: string; readonly setBy: ActorAttribution }[];
 * }} input
 * @returns {DaCause[]}
 */
export function daCauses({ materialCode, since, moved, ltpRows, osipRows }) {
  if (!moved) return [];
  /** @type {DaCause[]} */
  const out = [];
  /** @type {Map<LtpSeries, number | null>} */
  const lastTotal = new Map();
  ltpRows.forEach((r, i) => {
    if (r.materialCode !== materialCode) return;
    const inWindow = i >= since.ltp;
    if (r.kind === 'upload' && r.series) {
      const before = lastTotal.get(r.series) ?? null;
      lastTotal.set(r.series, total(r.weeks));
      if (!inWindow) return;
      // PSC-4 BR-01 — LTP A is the only series DA reads; a B or Festive upload
      // moves no DA week.
      if (r.series !== 'A') return;
      out.push({
        kind: KIND_OF_SERIES[r.series],
        detail: null,
        before,
        after: total(r.weeks),
        at: r.setAt,
        by: r.setBy
      });
    }
    // A `choice` row is history only (BR-01): it is no DA cause.
  });
  osipRows.forEach((r, i) => {
    if (r.key.split('|')[1] !== materialCode || i < since.osip) return;
    if (r.param === 'safetyStockOn') {
      // PEX-13 BR-01: on unless the row says off (null: back to the default, on).
      out.push({
        kind: 'safetySwitch',
        detail: null,
        before: r.previous === false ? 'off' : 'on',
        after: r.value === false ? 'off' : 'on',
        at: r.setAt,
        by: r.setBy,
        reason: r.reason ?? null
      });
      return;
    }
    if (r.param !== 'z' && r.param !== 'g') return;
    out.push({
      kind: 'safetyStock',
      detail: r.param,
      before: typeof r.previous === 'boolean' ? null : r.previous,
      after: typeof r.value === 'boolean' ? null : r.value,
      at: r.setAt,
      by: r.setBy
    });
  });
  // Ledger order within each ledger; the two ledgers merge by their stamps.
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * A cause as one line of plain text for a list, a CSV or a toast:
 * "LTP choice A → Festive", "LTP A 3,000 → 3,600", "Safety stock Z 1.65 → 2".
 * `label` names the kind in the caller's language.
 * @param {DaCause} c
 * @param {(kind: DaCauseKind) => string} label
 * @param {(n: number) => string} [fmt]
 * @returns {string}
 */
export function daCauseText(c, label, fmt = String) {
  /** @param {number | string | null} v */
  const show = (v) => (v === null ? '—' : typeof v === 'number' ? fmt(v) : v);
  const name = c.detail ? `${label(c.kind)} ${c.detail.toUpperCase()}` : label(c.kind);
  return `${name} ${show(c.before)} → ${show(c.after)}`;
}

/**
 * Two versions side by side, week by week: DA in each and the difference
 * (second − first). Weeks one version lacks read null.
 * @param {readonly { readonly week: string; readonly da: number; readonly ltp: number; readonly safety: number }[]} a
 * @param {readonly { readonly week: string; readonly da: number; readonly ltp: number; readonly safety: number }[]} b
 * @returns {{ week: string; a: { da: number; ltp: number; safety: number } | null; b: { da: number; ltp: number; safety: number } | null; delta: number | null }[]}
 */
export function compareVersions(a, b) {
  const weeks = [...new Set([...a.map((w) => w.week), ...b.map((w) => w.week)])].sort();
  return weeks.map((week) => {
    const x = a.find((w) => w.week === week) ?? null;
    const y = b.find((w) => w.week === week) ?? null;
    return {
      week,
      a: x ? { da: x.da, ltp: x.ltp, safety: x.safety } : null,
      b: y ? { da: y.da, ltp: y.ltp, safety: y.safety } : null,
      delta: x && y ? y.da - x.da : null
    };
  });
}
