// ────────────────────────────────────────────────────────────────────────────
// PSC-1 (BL-336) — THE DA CONFIRMATION READ MODEL.
//
// One place gathers the append-only confirmation records and hands them to the
// pure rules (`daConfirmationRules.js`), so the supplier's DA page, the stock
// page's pre-fill and the target's policy hook read the same state.
//
// A CARRIED-FORWARD WEEK HAS NO ROW (PSC-1 BR-05): the state is derived —
// "no record for this week, an earlier one exists" — and the values in force
// are the latest earlier record's. Nothing here writes.
// ────────────────────────────────────────────────────────────────────────────

/** @import { DaConfirmation } from '../types' */
import { daConfirmationStore } from './stores/daConfirmationStore';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
import { supplierDaRows } from '../../transitions/supplierDaView';
import { daConfirmationStatus } from '../../transitions/daConfirmationRules';
/** @import { DaConfirmationStatus } from '../../transitions/daConfirmationRules' */

/**
 * Every confirmation record, oldest first.
 * @returns {readonly DaConfirmation[]}
 */
export const daConfirmationRows = () => daConfirmationStore.all();

/**
 * The record in force for one supplier × week, or undefined (append-only: the
 * last one written for the week wins).
 * @param {string} supplierId
 * @param {string} week
 * @returns {DaConfirmation | undefined}
 */
export function daConfirmationFor(supplierId, week) {
  return [...daConfirmationStore.all()]
    .reverse()
    .find((r) => r.supplierId === supplierId && r.week === week);
}

/**
 * The latest record before `week` — what a carried-forward week carries.
 * @param {string} supplierId
 * @param {string} week
 * @returns {DaConfirmation | undefined}
 */
export function daCarriedFrom(supplierId, week) {
  return [...daConfirmationStore.all()]
    .filter((r) => r.supplierId === supplierId && r.week < week)
    .sort((a, b) => b.week.localeCompare(a.week))[0];
}

/**
 * PSC-1 BR-06 — the SOH figure per material that PRE-FILLS the stock page: the
 * current week's confirmed figures, else the carried-forward ones. Null when
 * the supplier never confirmed.
 * @param {string} supplierId
 * @param {string} week
 * @returns {Readonly<Record<string, number>> | null}
 */
export function daPrefillSoh(supplierId, week) {
  const inForce = daConfirmationFor(supplierId, week) ?? daCarriedFrom(supplierId, week);
  if (!inForce) return null;
  /** @type {Record<string, number>} */
  const out = {};
  for (const s of inForce.soh) out[s.materialCode] = s.soh;
  return out;
}

/**
 * What the supplier's DA page shows for one week: the status, the record in
 * force, and the figures per material.
 * `carriedFromWeek`:  the week the values were last confirmed in, when this
 *   week carries forward; null otherwise.
 * `soh`:  the confirmed figure per material, from this week's record or the
 *   carried-forward one.
 *
 * @typedef {{
 *   readonly status: DaConfirmationStatus;
 *   readonly carriedFromWeek: string | null;
 *   readonly confirmedAt: string | null;
 *   readonly changedFields: readonly string[];
 *   readonly soh: Readonly<Record<string, number>>;
 * }} DaConfirmationView
 */

/**
 * @param {string} supplierId
 * @param {string} week
 * @returns {DaConfirmationView}
 */
export function daConfirmationView(supplierId, week) {
  const current = daConfirmationFor(supplierId, week);
  const { status, carriedFromWeek } = daConfirmationStatus(
    daConfirmationStore.all(),
    supplierId,
    week
  );
  const inForce = current ?? daCarriedFrom(supplierId, week);
  /** @type {Record<string, number>} */
  const soh = {};
  for (const s of inForce?.soh ?? []) soh[s.materialCode] = s.soh;
  return {
    status,
    carriedFromWeek,
    confirmedAt: current?.recordedAt ?? null,
    changedFields: current?.changedFields ?? [],
    soh
  };
}

/**
 * The figures in force per material BEFORE a submission — the stock record
 * when one exists (BR-06: it is the single source), else the last confirmed
 * figure. BR-08 reads the difference against these.
 * @param {string} supplierId
 * @param {string} week
 * @param {readonly string[]} materialCodes
 * @param {(supplierId: string, materialCode: string) => number | null} stockSoh
 * @returns {Record<string, number | null>}
 */
export function daSohBefore(supplierId, week, materialCodes, stockSoh) {
  const confirmed = daPrefillSoh(supplierId, week) ?? {};
  /** @type {Record<string, number | null>} */
  const out = {};
  for (const code of materialCodes)
    out[code] = stockSoh(supplierId, code) ?? confirmed[code] ?? null;
  return out;
}

// ── UCX-P4 v2 (BL-365) — THE WEEKLY PAGE'S PUBLICATION IDENTITY ─────────────
//
// The weekly page confirms the week through the EXISTING DA confirmation verb
// (PSC-1 BR-10; no new verb, UCX-D18), so it needs the publication's identity:
// the planning week, its id, the materials it holds and whether this week is
// already confirmed. It needs NO demand figures — DRC-D10 keeps the supplier DA
// view off, and this read deliberately carries no `qty`, `ltp`, `safety` or
// `totalDa`: the weekly page shows the DA as a carried item, never as a row.
// That is what keeps the read compatible with the flag while the confirmation
// verb stays usable.
/**
 * `materialCodes`:  The supplier's materials the publication holds, sorted.
 * `confirmedAt`:  When this week's confirmation was recorded; null when not yet.
 *
 * @typedef {{
 *   readonly week: string;
 *   readonly publicationId: string;
 *   readonly publishedAt: string;
 *   readonly materialCodes: readonly string[];
 *   readonly confirmedAt: string | null;
 * }} SupplierWeeklyPublication
 */

/**
 * The current publication's identity for one supplier's weekly page, or null
 * when no publication holds a pair of its materials.
 * @param {string} supplierId
 * @returns {SupplierWeeklyPublication | null}
 */
export function supplierWeeklyPublication(supplierId) {
  const own = supplierDaRows(demandAnticipationStore.all()).filter(
    (r) => r.supplierId === supplierId
  );
  if (own.length === 0) return null;
  // The newest publication (a re-publication of the same week supersedes the
  // earlier one at read), then only the pairs that publication itself holds.
  const latest = [...own].sort(
    (a, b) =>
      b.publishedAt.localeCompare(a.publishedAt) || b.planningWeek.localeCompare(a.planningWeek)
  )[0];
  const codes = [
    ...new Set(
      own.filter((r) => r.publicationId === latest.publicationId).map((r) => r.materialCode)
    )
  ].sort();
  return {
    week: latest.planningWeek,
    publicationId: latest.publicationId,
    publishedAt: latest.publishedAt,
    materialCodes: codes,
    confirmedAt: daConfirmationFor(supplierId, latest.planningWeek)?.recordedAt ?? null
  };
}
