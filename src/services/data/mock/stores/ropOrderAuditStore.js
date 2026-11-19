// ────────────────────────────────────────────────────────────────────────────
// PSC-4 BR-10 (BL-339) — THE ROP-ORDER-ONLY AUDIT LEDGER (DRC-D16).
//
//   > A change that moves only ROP Order (the cover setting, the event window,
//   > the Material Buffer switch) is recorded with the ROP Order figure's stored
//   > inputs and rules version (DRC-D16) and does not write a DA version.
//
// DRC-D16 (`SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10`): "Each figure keeps its
// inputs and rules version; recalculate forward only". ROP Order is computed at
// read and stored nowhere (law 0.5), so what is kept here is the STAMP of the
// change: the input that moved, its new value, the inputs the ROP Order figure
// was reading at that moment, and `RULES_VERSION`. It is append-only.
//
// Written where the change is made — `t_osipparam_set` for the cover setting,
// the Material Buffer switch and the protection buffer switch, and
// `t_eventcalendar_set` for a window — never by a page.
//
// The field name is the builder's call (PSC-4 open items); this one names the
// figure it audits: `ropOrder`.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { Stamped } from '../../../transitions/osipRules' */

/**
 * `field`: which ROP-only input moved. `value`: its new value (null: cleared).
 * `figure`: the ROP Order figure's inputs and rules version (DRC-D16).
 * @typedef {{
 *   readonly key: string;
 *   readonly field: 'coverWeeks' | 'coverageWeeks' | 'materialBufferOn' | 'protectionBufferOn' | 'eventWindow';
 *   readonly value: number | boolean | null;
 *   readonly reason: string | null;
 *   readonly figure: Stamped<null>;
 *   readonly setAt: string;
 *   readonly setBy: ActorAttribution;
 * }} RopOrderAuditRow
 */

/** @type {RopOrderAuditRow[]} */
let rows = [];

export const ropOrderAuditStore = {
  /** @returns {readonly RopOrderAuditRow[]} oldest first */
  all() {
    return rows;
  },
  /** @param {RopOrderAuditRow} row @returns {void} */
  append(row) {
    rows = [...rows, row];
  },
  /**
   * TEST SEAM — back to nothing audited.
   * @returns {void}
   */
  reset() {
    rows = [];
  }
};
