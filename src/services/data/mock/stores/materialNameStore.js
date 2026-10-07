// ────────────────────────────────────────────────────────────────────────────
// SUPPLIER TRADE NAME STORE — Material C2 (MR-3 BR-01 to BR-06).
//
// One record per name a supplier submitted (or PTI loaded). A changed name is a
// NEW record (MAT-R3); an earlier record only ever changes STATE, through the
// verbs of `materialName.flow.js`, applied by its target. Nothing else writes
// here. Read through `materialNameReadModel.js`, never by a page.
//
// The sample rows are illustrative (SC-04): the names say "(sample)".
// ────────────────────────────────────────────────────────────────────────────

/** @import { MaterialNameState, SupplierMaterialName } from '../../types' */
import { NO_PERSON } from '@context/noPerson';

/** @type {readonly SupplierMaterialName[]} */
const SEED = Object.freeze(
  /** @satisfies {SupplierMaterialName[]} */ ([
    // sup-007 (the seeded supplier seat): one approved name, one rejected with its reason.
    {
      id: 'smn-0001',
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8810',
      tradeName: 'ClearForm PET 100 (sample)',
      supplierMaterialNo: 'SPP-PB-100',
      state: 'Approved',
      submittedBy: NO_PERSON,
      submittedAt: '2026-09-01T02:00:00.000Z',
      decidedBy: NO_PERSON,
      decidedAt: '2026-09-02T03:00:00.000Z'
    },
    {
      id: 'smn-0002',
      supplierId: 'sup-007',
      materialCode: 'PK-CAPF-8820',
      tradeName: 'Cap',
      state: 'Rejected',
      submittedBy: NO_PERSON,
      submittedAt: '2026-09-03T02:00:00.000Z',
      decidedBy: NO_PERSON,
      decidedAt: '2026-09-04T03:00:00.000Z',
      rejectionReason:
        'Too general to tell your caps apart (sample). Please give the product name on your quotation.'
    },
    // Two suppliers of the same PTI material, each with its own name (BR-01).
    {
      id: 'smn-0003',
      supplierId: 'sup-005',
      materialCode: 'RM-EMUL-3310',
      tradeName: 'OleoMul 3310 (sample)',
      state: 'Approved',
      submittedBy: NO_PERSON,
      submittedAt: '2026-09-05T02:00:00.000Z',
      decidedBy: NO_PERSON,
      decidedAt: '2026-09-05T06:00:00.000Z',
      loadedByPti: true
    },
    {
      id: 'smn-0004',
      supplierId: 'sup-002',
      materialCode: 'RM-EMUL-3310',
      tradeName: 'Emulsense 200 (sample)',
      supplierMaterialNo: 'EM-200-25KG',
      state: 'Awaiting approval',
      submittedBy: NO_PERSON,
      submittedAt: '2026-09-20T02:00:00.000Z'
    }
  ])
);

/** @type {SupplierMaterialName[]} */
let rows = [...SEED];
let seq = SEED.length;
let version = 0;
const listeners = /** @type {Set<() => void>} */ (new Set());

/** @returns {void} */
function changed() {
  version += 1;
  listeners.forEach((l) => l());
}

export const materialNameStore = {
  /**
   * Every record, oldest first.
   * @returns {readonly SupplierMaterialName[]}
   */
  all() {
    return rows;
  },
  /**
   * @param {string} id
   * @returns {SupplierMaterialName | undefined}
   */
  get(id) {
    return rows.find((r) => r.id === id);
  },
  /**
   * One supplier × material's records, oldest first.
   * @param {string} supplierId
   * @param {string} materialCode
   * @returns {readonly SupplierMaterialName[]}
   */
  forPair(supplierId, materialCode) {
    return rows.filter((r) => r.supplierId === supplierId && r.materialCode === materialCode);
  },
  /**
   * A new record with a store-assigned id. Called by the target's `create` only.
   * @param {Omit<SupplierMaterialName, 'id'>} row
   * @returns {SupplierMaterialName}
   */
  insert(row) {
    seq += 1;
    /** @type {SupplierMaterialName} */
    const full = { ...row, id: `smn-${String(seq).padStart(4, '0')}` };
    rows = [...rows, full];
    changed();
    return full;
  },
  /**
   * A record's state (and the decision that moved it). Called by the target's `applyTransition` only.
   * @param {string} id
   * @param {MaterialNameState} state
   * @param {Partial<Pick<SupplierMaterialName, 'decidedBy' | 'decidedAt' | 'rejectionReason'>>} [patch]
   * @returns {void}
   */
  decide(id, state, patch = {}) {
    rows = rows.map((r) => (r.id === id ? { ...r, ...patch, state } : r));
    changed();
  },
  /**
   * Back to the sample rows — test isolation.
   * @returns {void}
   */
  reset() {
    rows = [...SEED];
    seq = SEED.length;
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
