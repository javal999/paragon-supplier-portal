// ────────────────────────────────────────────────────────────────────────────
// Mutable stores for inventory & capacity collaboration (REQ-E08-02 to 05).
//
// Same contract as the other mock stores: commands swap in new objects, reads
// resolve from here, `reset()` restores the seed for tests. Every store is
// append-only or replace-whole-row, so a log or a submission is never edited in
// place:
//   · stockAccessStore       — supplier access to PTI stock, with its log
//   · capacityStore          — capacity submissions (latest per group wins at read)
//   · stockSyncStore         — API sync attempts (success or failure, with time)
//   · inventoryAlertLedger   — planner closures and the moment a condition cleared
// ────────────────────────────────────────────────────────────────────────────

/** @import { CapacitySubmission, StockAccessGrant, StockSyncAttempt } from '../../types' */
/** @import { AlertLedgerEntry } from '../../../transitions/inventoryAlertRules' */
import { CAPACITY_SEED, STOCK_ACCESS_SEED, STOCK_SYNC_SEED } from '../fixtures/inventoryHub';

/**
 * @param {StockAccessGrant} g
 * @returns {StockAccessGrant}
 */
const cloneGrant = (g) => ({
  ...g,
  materials: [...g.materials],
  log: g.log.map((e) => ({ ...e, materials: [...e.materials] }))
});

/** @type {StockAccessGrant[]} */
let grants = STOCK_ACCESS_SEED.map(cloneGrant);

export const stockAccessStore = {
  /** @returns {readonly StockAccessGrant[]} */
  all() {
    return grants;
  },
  /**
   * @param {string} supplierId
   * @returns {StockAccessGrant | undefined}
   */
  get(supplierId) {
    return grants.find((g) => g.supplierId === supplierId);
  },
  /**
   * Replace (or add) a supplier's grant.
   * @param {StockAccessGrant} grant
   * @returns {void}
   */
  put(grant) {
    grants = grants.some((g) => g.supplierId === grant.supplierId)
      ? grants.map((g) => (g.supplierId === grant.supplierId ? grant : g))
      : [...grants, grant];
  },
  /** @returns {void} */
  reset() {
    grants = STOCK_ACCESS_SEED.map(cloneGrant);
  }
};

/**
 * @param {CapacitySubmission} s
 * @returns {CapacitySubmission}
 */
const cloneSubmission = (s) => ({ ...s, weeks: s.weeks.map((w) => ({ ...w })) });

/** @type {CapacitySubmission[]} */
let submissions = CAPACITY_SEED.map(cloneSubmission);
let capacitySeq = CAPACITY_SEED.length;

export const capacityStore = {
  /** @returns {readonly CapacitySubmission[]} */
  all() {
    return submissions;
  },
  /**
   * @param {string} id
   * @returns {CapacitySubmission | undefined}
   */
  get(id) {
    return submissions.find((s) => s.id === id);
  },
  /**
   * @param {CapacitySubmission} row
   * @returns {void}
   */
  add(row) {
    submissions = [...submissions, row];
  },
  /** @returns {string} */
  nextId() {
    capacitySeq += 1;
    return `cap-${String(capacitySeq).padStart(4, '0')}`;
  },
  /** @returns {void} */
  reset() {
    submissions = CAPACITY_SEED.map(cloneSubmission);
    capacitySeq = CAPACITY_SEED.length;
  }
};

/** @type {StockSyncAttempt[]} */
let syncs = STOCK_SYNC_SEED.map((a) => ({ ...a }));
let syncSeq = STOCK_SYNC_SEED.length;

export const stockSyncStore = {
  /** @returns {readonly StockSyncAttempt[]} */
  all() {
    return syncs;
  },
  /**
   * @param {string} id
   * @returns {StockSyncAttempt | undefined}
   */
  get(id) {
    return syncs.find((a) => a.id === id);
  },
  /**
   * @param {StockSyncAttempt} row
   * @returns {void}
   */
  add(row) {
    syncs = [...syncs, row];
  },
  /** @returns {string} */
  nextId() {
    syncSeq += 1;
    return `sync-${String(syncSeq).padStart(4, '0')}`;
  },
  /** @returns {void} */
  reset() {
    syncs = STOCK_SYNC_SEED.map((a) => ({ ...a }));
    syncSeq = STOCK_SYNC_SEED.length;
  }
};

/** @type {AlertLedgerEntry[]} */
let ledger = [];

export const inventoryAlertLedger = {
  /** @returns {readonly AlertLedgerEntry[]} */
  all() {
    return ledger;
  },
  /**
   * @param {readonly AlertLedgerEntry[]} entries
   * @returns {void}
   */
  append(entries) {
    if (entries.length > 0) ledger = [...ledger, ...entries];
  },
  /** @returns {void} */
  reset() {
    ledger = [];
  }
};
