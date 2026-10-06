// ────────────────────────────────────────────────────────────────────────────
// THE SOURCING TYPE MAP — Material G2 (MR-10 BR-06; plan AR-17; MAT-D13).
//
// Each sourcing category and purchasing group → Direct or Indirect, as
// Procurement sets it. Seeded with `DEFAULT_SOURCING_TYPE_MAP` (all Direct).
//
// APPEND ONLY (MAT-R3): every change is a new row and the latest row per key is
// in force, so the store is its own history. Written by the
// `t_sourcingtype_set` target and nothing else. An event's type is stored on
// the event at publish, so a later change here never moves a published event.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { SourcingType, SourcingTypeKey, SourcingTypeMap } from '../sourcing/sourcingType' */
import { DEFAULT_SOURCING_TYPE_MAP } from '../sourcing/sourcingType';

/** One change of one key, as recorded. Never edited. */
/**
 * `setAt`:  Store-assigned from the hub clock, never a payload field.
 * `setBy`:  From the session, never from the form.
 *
 * @typedef {{
 *   readonly key: SourcingTypeKey;
 *   readonly sourcingType: SourcingType;
 *   readonly setAt: string;
 *   readonly setBy: ActorAttribution;
 * }} SourcingTypeChange
 */

/** @type {SourcingTypeChange[]} */
let changes = [];
let version = 0;
const listeners = /** @type {Set<() => void>} */ (new Set());

/** @returns {void} */
function changed() {
  version += 1;
  listeners.forEach((l) => l());
}

/** @type {{ version: number; map: SourcingTypeMap } | null} */
let cached = null;

export const sourcingTypeStore = {
  /**
   * The map in force: the seed with the latest change per key applied.
   * @returns {SourcingTypeMap}
   */
  map() {
    if (cached?.version !== version) {
      /** @type {Record<string, SourcingType>} */
      const next = { ...DEFAULT_SOURCING_TYPE_MAP };
      for (const c of changes) next[c.key] = c.sourcingType;
      cached = { version, map: Object.freeze(next) };
    }
    return cached.map;
  },
  /**
   * @param {SourcingTypeKey} key
   * @returns {SourcingType | undefined}
   */
  get(key) {
    return this.map()[key];
  },
  /**
   * Every change on record, oldest first.
   * @returns {readonly SourcingTypeChange[]}
   */
  changes() {
    return changes;
  },
  /**
   * APPEND ONLY — called by the `t_sourcingtype_set` target and nothing else.
   * @param {SourcingTypeChange} change
   * @returns {void}
   */
  append(change) {
    changes = [...changes, change];
    changed();
  },
  /**
   * Back to the seed — test isolation.
   * @returns {void}
   */
  reset() {
    changes = [];
    changed();
  },
  /** @returns {number} */
  version() {
    return version;
  },
  /**
   * @param {() => void} listener
   * @returns {() => void}
   */
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
