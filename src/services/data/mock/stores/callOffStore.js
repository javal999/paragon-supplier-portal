// ────────────────────────────────────────────────────────────────────────────
// Mutable call-off store (REQ-E09-03). The hub is the record for call-offs.
//
// Same immutable-update contract as the other stores: commands swap in new
// objects, reads resolve from here, `reset()` restores the seed for tests.
// Numbers are store-assigned on creation.
// ────────────────────────────────────────────────────────────────────────────

import { CALL_OFF_SEED } from '../fixtures/callOffs';
// BL-64 — the delivery history behind the compliance gate's OTIF boundary.
import { GATE_DEMO_CALL_OFFS } from '../fixtures/gateDemo';
// E2E walkthrough 2026-11-12 — the pair's two call-offs, numbered after the gate demo.
import { SSTP_CALL_OFFS } from '../fixtures/walkthroughSstp';
/** @import { CallOff } from '../../types' */

/**
 * @param {CallOff} c
 * @returns {CallOff}
 */
const clone = (c) => ({
  ...c,
  ...(c.confirmation
    ? {
        confirmation: {
          ...c.confirmation,
          deliveries: c.confirmation.deliveries.map((d) => ({ ...d }))
        }
      }
    : {}),
  dispatches: c.dispatches.map((d) => ({ ...d })),
  notes: c.notes.map((n) => ({ ...n }))
});

/** @type {readonly CallOff[]} */
const SEED = [...CALL_OFF_SEED, ...GATE_DEMO_CALL_OFFS, ...SSTP_CALL_OFFS];

/** @type {CallOff[]} */
let rows = SEED.map(clone);
let seq = SEED.length;

export const callOffStore = {
  /** @returns {readonly CallOff[]} */
  all() {
    return rows;
  },
  /**
   * @param {string} id
   * @returns {CallOff | undefined}
   */
  get(id) {
    return rows.find((c) => c.id === id);
  },
  /**
   * @param {CallOff} row
   * @returns {void}
   */
  add(row) {
    rows = [...rows, row];
  },
  /**
   * @param {string} id
   * @param {(c: CallOff) => CallOff} next
   * @returns {void}
   */
  update(id, next) {
    rows = rows.map((c) => (c.id === id ? next(c) : c));
  },
  /**
   * Store-assigned id and number for a new call-off.
   * @returns {{ id: string; callOffNumber: string }}
   */
  nextIdentity() {
    seq += 1;
    const n = String(seq).padStart(4, '0');
    return { id: `co-${n}`, callOffNumber: `CO-2026-${n}` };
  },
  /** @returns {void} */
  reset() {
    rows = SEED.map(clone);
    seq = SEED.length;
  }
};
