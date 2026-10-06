// ────────────────────────────────────────────────────────────────────────────
// Inventory & capacity sample data (REQ-E08-01 to REQ-E08-05) — PTI's side of
// the inventory model, dated relative to the declared present.
//
// What lives here, and what does not:
//   · Supplier stock submissions are NOT here. They are the InventoryDeclaration
//     store, seeded from `src/data/mockInventory.js` and the SDC-0 rows.
//   · PTI stock on hand and PTI reorder point per material — from SAP (BR-04);
//     the hub never calculates a ROP.
//   · Which supplier supplies which material (the assignment a stock row is
//     checked against), and the planning estimate of daily demand used where
//     no forecast line exists (CR-01 fallback).
//   · API-connected suppliers and the deterministic result of a sync.
//   · Seeded supplier access to PTI stock, capacity submissions, and one earlier
//     failed sync, so every state is visible at the declared present.
//
// What each seed shows at the declared present (derived, never stored):
//   sup-007 PT Sample Packaging Indonesia — PK-PETB-8802 Critical (4 days) and
//     below its own ROP; PK-PETB-8810 stale (last figure weeks old); PTI stock
//     access granted on the 2 consignment bottles; capacity for rigid plastic
//     packaging with a gap week; no capacity yet for closures.
//   sup-002 PT Sample Specialty Fats (raw material) — RM-STEAR-7300 Critical,
//     PTI below ROP with a projected stock-out; RM-EMUL-3310 stale; capacity
//     for emollients confirmed.
//   sup-001 PT Sample Oleochemicals — API connected; a sync succeeds.
//   sup-003 Sample Fragrance House — API connected; the last sync failed, so its
//     figures are kept and flagged stale, and a new sync fails the same way.
// ────────────────────────────────────────────────────────────────────────────

import { DECLARED_PRESENT } from '../../fixturePresent';
/** @import { CapacitySubmission, StockAccessGrant, StockSyncAttempt } from '../../types' */
/** @import { PtiStockRecord } from '../../../transitions/inventoryRules' */
import { defaultPlanningGroupId } from '../../../sdc/materialMaster';

const DAY_MS = 86_400_000;
const P = Date.parse(`${DECLARED_PRESENT}T00:00:00.000Z`);

/**
 * `YYYY-MM-DD`, `offset` days from the declared present.
 * @param {number} offset
 */
const day = (offset) => new Date(P + offset * DAY_MS).toISOString().slice(0, 10);
/**
 * An instant on that day at `hourUtc` (WIB is UTC+7).
 * @param {number} offset
 * @param {number} hourUtc
 */
const at = (offset, hourUtc) => new Date(P + offset * DAY_MS + hourUtc * 3_600_000).toISOString();
/**
 * Monday of the declared present's week, plus `weeks`.
 * @param {number} weeks
 */
const week = (weeks) => {
  const dow = new Date(P).getUTCDay();
  const monday = P + (dow === 0 ? -6 : 1 - dow) * DAY_MS;
  return new Date(monday + weeks * 7 * DAY_MS).toISOString().slice(0, 10);
};

/**
 * PTI stock on hand and reorder point per material (SAP, BR-04).
 * @type {readonly PtiStockRecord[]}
 */
export const PTI_STOCK = [
  { materialCode: 'RM-COCO-8200', ptiSoh: 12000, ptiRop: 10000, consignment: false },
  { materialCode: 'RM-LAURIC-7200', ptiSoh: 3000, ptiRop: 5000, consignment: false },
  { materialCode: 'RM-EMUL-9410', ptiSoh: 1800, ptiRop: 1500, consignment: false },
  { materialCode: 'RM-STEAR-7300', ptiSoh: 900, ptiRop: 2500, consignment: false },
  { materialCode: 'RM-EMUL-3310', ptiSoh: 5000, ptiRop: 4000, consignment: false },
  { materialCode: 'RM-EMUL-9430', ptiSoh: 150, ptiRop: 200, consignment: false },
  { materialCode: 'FR-WARD-4410', ptiSoh: 60, ptiRop: 40, consignment: false },
  { materialCode: 'FR-EMIN-4420', ptiSoh: 150, ptiRop: 100, consignment: false },
  { materialCode: 'AI-NIAC-6601', ptiSoh: 2500, ptiRop: 1500, consignment: false },
  { materialCode: 'AI-HYALU-6610', ptiSoh: 40, ptiRop: 30, consignment: false },
  { materialCode: 'AI-VITC-6720', ptiSoh: 90, ptiRop: 60, consignment: false },
  { materialCode: 'AI-VITC-6730', ptiSoh: 400, ptiRop: 300, consignment: false },
  { materialCode: 'AI-PANTO-6640', ptiSoh: 700, ptiRop: 400, consignment: false },
  { materialCode: 'PK-PETB-8801', ptiSoh: 30000, ptiRop: 40000, consignment: true },
  { materialCode: 'PK-PETB-8802', ptiSoh: 55000, ptiRop: 50000, consignment: true },
  { materialCode: 'PK-PETB-8810', ptiSoh: 20000, ptiRop: 15000, consignment: false },
  { materialCode: 'PK-CAPF-8820', ptiSoh: 80000, ptiRop: 60000, consignment: true },
  { materialCode: 'PK-CART-9901', ptiSoh: 300000, ptiRop: 150000, consignment: false }
];

/**
 * Which supplier supplies which material — the rows of the inventory view.
 * @type {readonly { readonly supplierId: string; readonly materialCode: string }[]}
 */
export const SUPPLY_ASSIGNMENTS = [
  { supplierId: 'sup-001', materialCode: 'RM-COCO-8200' },
  { supplierId: 'sup-001', materialCode: 'RM-LAURIC-7200' },
  { supplierId: 'sup-002', materialCode: 'RM-EMUL-9410' },
  { supplierId: 'sup-002', materialCode: 'RM-STEAR-7300' },
  { supplierId: 'sup-002', materialCode: 'RM-EMUL-3310' },
  { supplierId: 'sup-003', materialCode: 'FR-WARD-4410' },
  { supplierId: 'sup-003', materialCode: 'FR-EMIN-4420' },
  { supplierId: 'sup-005', materialCode: 'AI-NIAC-6601' },
  { supplierId: 'sup-005', materialCode: 'AI-HYALU-6610' },
  { supplierId: 'sup-005', materialCode: 'RM-EMUL-3310' },
  { supplierId: 'sup-006', materialCode: 'AI-VITC-6720' },
  { supplierId: 'sup-007', materialCode: 'PK-PETB-8801' },
  { supplierId: 'sup-007', materialCode: 'PK-PETB-8802' },
  { supplierId: 'sup-007', materialCode: 'PK-PETB-8810' },
  { supplierId: 'sup-007', materialCode: 'PK-CAPF-8820' },
  { supplierId: 'sup-008', materialCode: 'PK-CART-9901' },
  { supplierId: 'sup-009', materialCode: 'AI-VITC-6730' },
  { supplierId: 'sup-009', materialCode: 'AI-PANTO-6640' },
  { supplierId: 'sup-010', materialCode: 'RM-EMUL-9430' }
];

/**
 * Planning estimate of daily demand, where the forecast has no line (CR-01 fallback).
 * @type {Readonly<Record<string, number>>}
 */
export const PLANNING_DAILY_DEMAND = {
  'sup-001|RM-COCO-8200': 621,
  'sup-001|RM-LAURIC-7200': 607,
  'sup-002|RM-EMUL-9410': 145,
  'sup-002|RM-STEAR-7300': 420,
  'sup-002|RM-EMUL-3310': 100,
  'sup-003|FR-WARD-4410': 24,
  'sup-003|FR-EMIN-4420': 70,
  'sup-005|AI-NIAC-6601': 200,
  'sup-005|AI-HYALU-6610': 12,
  'sup-005|RM-EMUL-3310': 60,
  'sup-006|AI-VITC-6720': 15,
  'sup-007|PK-PETB-8801': 5000,
  'sup-007|PK-PETB-8802': 5500,
  'sup-007|PK-PETB-8810': 1500,
  'sup-007|PK-CAPF-8820': 2000,
  'sup-008|PK-CART-9901': 13778,
  'sup-009|AI-VITC-6730': 30,
  'sup-009|AI-PANTO-6640': 29,
  'sup-010|RM-EMUL-9430': 70
};

/**
 * CR-24 — the supplier's lead time per supplier × material, in days. SAMPLE
 * master data (the real figure comes from the supplier master / SAP purchasing
 * info record, not yet integrated). A pair with no entry has NO lead time on
 * record: its risk class falls back to the CR-02 bands and it raises the
 * "lead time missing" alert.
 *
 * BL-46 demo cases (days of cover are the planning estimate's, so they do not
 * move with the clock — pinned in inventoryRules.test.js by name):
 *   · High        sup-002 RM-STEAR-7300  10 days vs lead time 21 (below 1×)
 *   · Medium      sup-007 PK-PETB-8801   17 days vs lead time 14 (1× to 1.5×)
 *   · Low         sup-008 PK-CART-9901   ~45 days vs lead time 14
 *   · Exactly 1×  sup-009 AI-VITC-6730   25 days vs lead time 25 → Medium
 *   · Exactly 1.5× sup-006 AI-VITC-6720  12 days vs lead time 8  → Low
 *     (Critical under the old CR-02 bands — the case that changed most)
 *   · Missing     sup-010 RM-EMUL-9430   6 days, no lead time → CR-02 Critical
 *     → High, and a "lead time missing" alert
 * @type {Readonly<Record<string, number>>}
 */
export const SUPPLIER_LEAD_TIME_DAYS = {
  'sup-001|RM-COCO-8200': 14,
  'sup-001|RM-LAURIC-7200': 10,
  'sup-002|RM-EMUL-9410': 21,
  'sup-002|RM-STEAR-7300': 21,
  'sup-002|RM-EMUL-3310': 21,
  'sup-003|FR-WARD-4410': 30,
  'sup-003|FR-EMIN-4420': 30,
  'sup-005|AI-NIAC-6601': 45,
  'sup-005|AI-HYALU-6610': 45,
  'sup-005|RM-EMUL-3310': 45,
  'sup-006|AI-VITC-6720': 8,
  'sup-007|PK-PETB-8801': 14,
  'sup-007|PK-PETB-8802': 14,
  'sup-007|PK-PETB-8810': 14,
  'sup-007|PK-CAPF-8820': 14,
  'sup-008|PK-CART-9901': 14,
  'sup-009|AI-VITC-6730': 25,
  'sup-009|AI-PANTO-6640': 20
  // sup-010 RM-EMUL-9430 deliberately absent — the lead-time-missing case.
};

/** One material's figures in a supplier's API response. */
/**
 * `completionInDays`:  Days after the sync that production completes.
 *
 * @typedef {{
 *   readonly materialCode: string;
 *   readonly soh: number;
 *   readonly supplierRop?: number;
 *   readonly inProductionQty?: number;
 *   readonly completionInDays?: number;
 * }} ApiStockFigure
 */

/**
 * SIMULATED pull outcomes: what a sync of each listed supplier's system returns
 * (deterministic for tests). Material A1 (AR-06): this list no longer decides
 * WHETHER a supplier is API-connected — its governed stock update mode does
 * (`stockUpdateModeOf`). Membership here is only the default for a supplier the
 * administrator has never set, and an API supplier with no entry pulls
 * `NO_ENDPOINT`.
 * @type {Readonly< Record<string, { readonly outcome: 'success'; readonly figures: readonly ApiStockFigure[] } | { readonly outcome: 'failed'; readonly errorKey: string }> >}
 */
export const API_CONNECTIONS = {
  // A DP Group-like supplier whose ERP answers the sync.
  'sup-001': {
    outcome: 'success',
    figures: [
      {
        materialCode: 'RM-COCO-8200',
        soh: 17500,
        supplierRop: 15000,
        inProductionQty: 20000,
        completionInDays: 3
      },
      { materialCode: 'RM-LAURIC-7200', soh: 9000, supplierRop: 6000 }
    ]
  },
  // A connected supplier whose system does not answer.
  'sup-003': { outcome: 'failed', errorKey: 'timeout' }
};

/**
 * Earlier sync attempts: sup-003's failed this morning, after its last figures.
 * @type {readonly StockSyncAttempt[]}
 */
export const STOCK_SYNC_SEED = [
  { id: 'sync-0001', supplierId: 'sup-003', at: at(0, 6), outcome: 'failed', errorKey: 'timeout' }
];

/**
 * Supplier access to PTI stock: sup-007 sees the 2 consignment bottles it supplies.
 * @type {readonly StockAccessGrant[]}
 */
export const STOCK_ACCESS_SEED = [
  {
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    active: true,
    materials: ['PK-PETB-8801', 'PK-PETB-8802'],
    log: [
      {
        action: 'grant',
        materials: ['PK-PETB-8801', 'PK-PETB-8802'],
        at: at(-5, 3),
        actor: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' }
      }
    ]
  }
];

/**
 * @param {(i: number) => number} allocated
 * @param {(i: number) => Partial<CapacitySubmission['weeks'][number]>} [extra]
 */
const weeks = (allocated, extra = () => ({})) =>
  Array.from({ length: 13 }, (_, i) => ({ week: week(i), allocated: allocated(i), ...extra(i) }));

/**
 * Capacity submissions (REQ-E08-04). Material C5 (MR-8 BR-02, AR-15) — keyed on
 * each SAP group's default planning group, so the figures are today's.
 * @type {readonly CapacitySubmission[]}
 */
export const CAPACITY_SEED = [
  {
    // Rigid plastic packaging: week 3 falls short of demand for a material reason.
    id: 'cap-0001',
    supplierId: 'sup-007',
    planningGroupId: defaultPlanningGroupId('MG-20'),
    submittedAt: at(-2, 4),
    weeks: weeks(
      (i) => (i === 2 ? 60000 : 90000),
      (i) =>
        i === 2 ? { reason: /** @type {const} */ ('material') } : i === 5 ? { upside: 10000 } : {}
    )
  },
  {
    // Emollients: every week covers demand.
    id: 'cap-0002',
    supplierId: 'sup-002',
    planningGroupId: defaultPlanningGroupId('MG-02'),
    submittedAt: at(-1, 3),
    weeks: weeks(() => 1200)
  },
  // BL-77 — a second supplier in each group that carries demand, so the
  // filters have something to separate. Since BL-133 the LTP is the one
  // capacity demand, so only MG-02, MG-10 and MG-20 have any. MG-02: sup-005
  // short in weeks 7 and 8 for a capacity reason (400 KG against ~497), with
  // 150 KG of additional capacity, so those weeks are amber ("needs the
  // additional capacity") rather than a second red group, beside sup-002
  // confirmed and sup-010 not submitted yet. MG-20: sup-012 covering
  // every week, beside sup-007's gap. "Gaps only" then shows two suppliers.
  {
    id: 'cap-0003',
    supplierId: 'sup-005',
    planningGroupId: defaultPlanningGroupId('MG-02'),
    submittedAt: at(-3, 2),
    weeks: weeks(
      (i) => (i === 6 || i === 7 ? 400 : 520),
      (i) => (i === 6 || i === 7 ? { reason: /** @type {const} */ ('capacity'), upside: 150 } : {})
    )
  },
  {
    id: 'cap-0004',
    supplierId: 'sup-012',
    planningGroupId: defaultPlanningGroupId('MG-20'),
    submittedAt: at(-1, 5),
    weeks: weeks(() => 17000)
  }
];

/** The first Monday of the capacity horizon (exported for tests). */
export const CAPACITY_FIRST_WEEK = week(0);
export const INVENTORY_HUB_TODAY = day(0);
