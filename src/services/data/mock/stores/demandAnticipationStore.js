// ────────────────────────────────────────────────────────────────────────────
// CAP-10 (CAP-D13) — the demand anticipation publications.
//
// Append-only, like `forecastVersionStore`: `add` appends a publication and
// nothing ever edits or removes one. A week's frozen figure is the FIRST
// publication's that holds it (`frozenEntryOf`), so an older publication is
// never overwritten, only followed.
//
// THE SEED. The page must open frozen (brief §4), so the store opens with ONE
// publication at the hub's present. Its figures are not authored: the read
// model registers a seeder that computes them with `demandAnticipationWeeks`
// over the sample LTP and PTI stock, at the hub clock's now, the first time
// the store is read. It is marked `source: 'sampleSeed'` and attributed
// `UNATTRIBUTED: NO_PERSON_IN_SESSION` — nobody published it, and the page
// says "Sample publication" rather than naming an act. `reset()` drops every
// publication and re-seeds on the next read (tests).
//
// Held in memory for the session, as the forecast versions are.
// ────────────────────────────────────────────────────────────────────────────

/** @import { DemandAnticipationPublication } from '../../../transitions/demandAnticipationRules' */

/** @typedef {Omit<DemandAnticipationPublication, 'id'>} NewPublication */

/** @type {DemandAnticipationPublication[] | null} */
let publications = null;
let seq = 0;
/** @type {(() => NewPublication | null) | null} */
let seeder = null;

/**
 * @param {NewPublication} row
 * @returns {DemandAnticipationPublication}
 */
const mint = (row) => {
  seq += 1;
  return Object.freeze({ ...row, id: `dap-${String(seq).padStart(4, '0')}` });
};

/** @returns {DemandAnticipationPublication[]} */
const rows = () => {
  if (publications === null) {
    publications = [];
    seq = 0;
    const seed = seeder ? seeder() : null;
    if (seed) publications = [mint(seed)];
  }
  return publications;
};

export const demandAnticipationStore = {
  /** @returns {readonly DemandAnticipationPublication[]} Every publication, oldest first. */
  all() {
    return rows();
  },
  /**
   * @param {string} id
   * @returns {DemandAnticipationPublication | undefined}
   */
  get(id) {
    return rows().find((p) => p.id === id);
  },
  /**
   * Append a publication; returns it with its id.
   * @param {NewPublication} row
   * @returns {DemandAnticipationPublication}
   */
  add(row) {
    const made = mint(row);
    publications = [...rows(), made];
    return made;
  },
  /**
   * The read model's seed, computed at the first read (see the header).
   * @param {() => NewPublication | null} fn
   * @returns {void}
   */
  useSeeder(fn) {
    seeder = fn;
  },
  /** @returns {void} */
  reset() {
    publications = null;
    seq = 0;
  }
};
