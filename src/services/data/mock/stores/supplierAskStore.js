// ────────────────────────────────────────────────────────────────────────────
// "ASK SUPPLIER" STORE — INV-D9 (Inventory UX S-04, P-02, P-03, P-05, P-07).
//
// One row per ask PTI raised. Only the `supplierAsk` target writes here: its
// `create` inserts a row, its `applyTransition` moves the state and APPENDS a
// step to the row's history — an earlier step is never changed (RFX-R3).
//
// SAMPLE DATA: the store opens with two asks to sup-007 (a production date on
// PK-PETB-8802 and a capacity week on pg-MG-20), marked `sample: true`, so the
// supplier's "PTI is asking" block is not empty in the demo. The pages that
// show them carry the "Sample data" badge. BL-258: the sample rows carry their
// question's i18n key, so the question reads in the reader's language.
// ────────────────────────────────────────────────────────────────────────────

/** @import { SupplierAsk, SupplierAskEvent } from '../../types' */
import { NO_PERSON } from '@context/noPerson';

/** @returns {SupplierAsk[]} */
const seed = () => [
  {
    id: 'ask-0001',
    supplierId: 'sup-007',
    materialCode: 'PK-PETB-8802',
    topic: 'productionDate',
    riskClass: 'high',
    // BL-258 (U-19) — the reader's language renders the key; `question` is the fallback.
    questionKey: 'supplierAsk.sample.coverageProductionDate',
    question:
      'Your stock and incoming do not cover the next 30 days of PTI demand. When does production of this material start?',
    dueDate: '2026-09-03',
    state: 'Open',
    history: [
      {
        kind: 'raised',
        at: '2026-08-31T03:00:00.000Z',
        actor: NO_PERSON,
        text: 'Your stock and incoming do not cover the next 30 days of PTI demand. When does production of this material start?'
      }
    ],
    sample: true
  },
  {
    id: 'ask-0002',
    supplierId: 'sup-007',
    planningGroupId: 'pg-MG-20',
    // PEX-D22 — the sample's short week moved from 14 Sep to 7 Sep (inside
    // Zone Liability); the ask follows it, so it still names a gap week.
    week: '2026-09-07',
    topic: 'capacityGap',
    questionKey: 'supplierAsk.default.capacityGap',
    question:
      'Your capacity for this week is below PTI demand. Can you add capacity, and how much?',
    state: 'Open',
    history: [
      {
        kind: 'raised',
        at: '2026-08-31T03:05:00.000Z',
        actor: NO_PERSON,
        text: 'Your capacity for this week is below PTI demand. Can you add capacity, and how much?'
      }
    ],
    sample: true
  }
];

/** @type {SupplierAsk[]} */
let rows = seed();
let seq = rows.length;
let version = 0;
const listeners = /** @type {Set<() => void>} */ (new Set());

/** @returns {void} */
function changed() {
  version += 1;
  listeners.forEach((l) => l());
}

export const supplierAskStore = {
  /**
   * Every ask, oldest first.
   * @returns {readonly SupplierAsk[]}
   */
  all() {
    return rows;
  },
  /**
   * @param {string} id
   * @returns {SupplierAsk | undefined}
   */
  get(id) {
    return rows.find((r) => r.id === id);
  },
  /**
   * A new ask with a store-assigned id. Called by the target's `create` only.
   * @param {Omit<SupplierAsk, 'id'>} row
   * @returns {SupplierAsk}
   */
  insert(row) {
    seq += 1;
    /** @type {SupplierAsk} */
    const full = Object.freeze({ ...row, id: `ask-${String(seq).padStart(4, '0')}` });
    rows = [...rows, full];
    changed();
    return full;
  },
  /**
   * Moves an ask to `state` and appends `event` to its history. The earlier
   * steps are kept as they were. Called by the target's `applyTransition` only.
   * @param {string} id
   * @param {SupplierAsk['state']} state
   * @param {SupplierAskEvent} event
   * @returns {void}
   */
  append(id, state, event) {
    rows = rows.map((r) =>
      r.id === id ? Object.freeze({ ...r, state, history: [...r.history, event] }) : r
    );
    changed();
  },
  /**
   * Back to the sample rows — test isolation.
   * @returns {void}
   */
  reset() {
    rows = seed();
    seq = rows.length;
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
