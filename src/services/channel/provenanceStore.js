// ─────────────────────────────────────────────────────────────────────────────
// C2 — the channel-side PROVENANCE store (append-only).
//
// After a confirmed inbound reply dispatches through the spine, its linkage —
// channelMessageId → sessionId / causationAnchor (C1a's `ChannelProvenanceRef`) —
// is recorded HERE, on the channel side. Provenance points INTO sdc's stable ids;
// sdc types stay untouched, and the ref never enters a payload (so it cannot spoof
// identity). Same store shape as `outboundRequestStore`: append-only + reset.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { ChannelProvenanceRef } from './types' */

/** @type {ChannelProvenanceRef[]} */
let rows = [];

export const channelProvenanceStore = {
  /**
   * Every recorded message→dispatch linkage.
   * @returns {readonly ChannelProvenanceRef[]}
   */
  all() {
    return rows;
  },
  /**
   * The linkages recorded for one inbound message.
   * @param {string} channelMessageId
   * @returns {readonly ChannelProvenanceRef[]}
   */
  forMessage(channelMessageId) {
    return rows.filter((r) => r.channelMessageId === channelMessageId);
  },
  /**
   * IMMUTABLE APPEND — a new array; refs are never edited.
   * @param {ChannelProvenanceRef} ref
   * @returns {void}
   */
  append(ref) {
    rows = [...rows, ref];
  },
  /**
   * Clear all recorded linkages (test isolation — the seed is empty).
   * @returns {void}
   */
  reset() {
    rows = [];
  }
};
