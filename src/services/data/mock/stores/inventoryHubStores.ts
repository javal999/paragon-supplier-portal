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

import type { CapacitySubmission, StockAccessGrant, StockSyncAttempt } from '../../types';
import type { AlertLedgerEntry } from '../../../transitions/inventoryAlertRules';
import { CAPACITY_SEED, STOCK_ACCESS_SEED, STOCK_SYNC_SEED } from '../fixtures/inventoryHub';

const cloneGrant = (g: StockAccessGrant): StockAccessGrant => ({
  ...g,
  materials: [...g.materials],
  log: g.log.map((e) => ({ ...e, materials: [...e.materials] })),
});

let grants: StockAccessGrant[] = STOCK_ACCESS_SEED.map(cloneGrant);

export const stockAccessStore = {
  all(): readonly StockAccessGrant[] {
    return grants;
  },
  get(supplierId: string): StockAccessGrant | undefined {
    return grants.find((g) => g.supplierId === supplierId);
  },
  /** Replace (or add) a supplier's grant. */
  put(grant: StockAccessGrant): void {
    grants = grants.some((g) => g.supplierId === grant.supplierId)
      ? grants.map((g) => (g.supplierId === grant.supplierId ? grant : g))
      : [...grants, grant];
  },
  reset(): void {
    grants = STOCK_ACCESS_SEED.map(cloneGrant);
  },
};

const cloneSubmission = (s: CapacitySubmission): CapacitySubmission => ({ ...s, weeks: s.weeks.map((w) => ({ ...w })) });

let submissions: CapacitySubmission[] = CAPACITY_SEED.map(cloneSubmission);
let capacitySeq = CAPACITY_SEED.length;

export const capacityStore = {
  all(): readonly CapacitySubmission[] {
    return submissions;
  },
  get(id: string): CapacitySubmission | undefined {
    return submissions.find((s) => s.id === id);
  },
  add(row: CapacitySubmission): void {
    submissions = [...submissions, row];
  },
  nextId(): string {
    capacitySeq += 1;
    return `cap-${String(capacitySeq).padStart(4, '0')}`;
  },
  reset(): void {
    submissions = CAPACITY_SEED.map(cloneSubmission);
    capacitySeq = CAPACITY_SEED.length;
  },
};

let syncs: StockSyncAttempt[] = STOCK_SYNC_SEED.map((a) => ({ ...a }));
let syncSeq = STOCK_SYNC_SEED.length;

export const stockSyncStore = {
  all(): readonly StockSyncAttempt[] {
    return syncs;
  },
  get(id: string): StockSyncAttempt | undefined {
    return syncs.find((a) => a.id === id);
  },
  add(row: StockSyncAttempt): void {
    syncs = [...syncs, row];
  },
  nextId(): string {
    syncSeq += 1;
    return `sync-${String(syncSeq).padStart(4, '0')}`;
  },
  reset(): void {
    syncs = STOCK_SYNC_SEED.map((a) => ({ ...a }));
    syncSeq = STOCK_SYNC_SEED.length;
  },
};

let ledger: AlertLedgerEntry[] = [];

export const inventoryAlertLedger = {
  all(): readonly AlertLedgerEntry[] {
    return ledger;
  },
  append(entries: readonly AlertLedgerEntry[]): void {
    if (entries.length > 0) ledger = [...ledger, ...entries];
  },
  reset(): void {
    ledger = [];
  },
};
