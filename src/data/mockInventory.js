/** @import { StockChannel } from '@services/sdc/types' */
import { shiftFields, shiftIso } from '@services/data/fixturePresent';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER STOCK SUBMISSIONS — the seed of the ONE inventory model (REQ-E08-01,
// REQ-E08-02). INVENTORY-REFERENT-01 is closed: this list is no longer a second
// inventory the pages read beside the InventoryDeclaration store. Each row is a
// supplier's stock submission and is loaded INTO that store
// (`inventoryDeclarationStore`), so the planner's page, the supplier's page,
// the alerts and the capacity view all read the same figures.
//
// What left this file, and why:
//   · `qtyAvailable` / `qtyReserved` — REQ-E08-01 BR-01 / AC-02: no "available"
//     figure anywhere.
//   · `daysOfSupply` / `avgDailyDemand` / `stockStatus` — days of supply is
//     CR-01 (SOH ÷ forecast demand), derived at read; the stored number and its
//     <7/7–13/14–30 status contradicted CR-02. The planning estimate that stood
//     in for demand moved to the PTI planning fixture (`inventoryHub.js`).
//   · `qtyInTransit` — in transit is the submitted ASNs and call-off dispatch
//     notices (BR-06), not a supplier-typed number.
//   · `supplierName` / `materialDescription` / `location` — names come from the
//     supplier list and the material master, never a copy.
//   · `dataSource` — became `channel` (template, manual, API, PTI on behalf).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} SupplierStockSeed
 * @property {string} id
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {number} qtyOnHand
 * @property {string} lastUpdated
 * @property {StockChannel} channel
 * @property {number} [supplierRop]
 * @property {number} [inProductionQty]
 * @property {string} [productionCompletionDate]
 * @property {{ quantity: number; completionDate?: string }[]} [inProductionRuns]
 */

/** @type {SupplierStockSeed[]} */
const items = [
  {
    id: 'inv-0101',
    supplierId: 'sup-001',
    materialCode: 'RM-COCO-8200',
    qtyOnHand: 18000,
    lastUpdated: '2025-04-06',
    channel: 'api',
    supplierRop: 15000,
    inProductionQty: 20000,
    productionCompletionDate: '2025-04-10'
  },
  {
    id: 'inv-0102',
    supplierId: 'sup-001',
    materialCode: 'RM-LAURIC-7200',
    qtyOnHand: 8500,
    lastUpdated: '2025-04-05',
    channel: 'api',
    supplierRop: 6000
  },
  {
    id: 'inv-0103',
    supplierId: 'sup-002',
    materialCode: 'RM-EMUL-9410',
    qtyOnHand: 3200,
    lastUpdated: '2025-04-06',
    channel: 'manual',
    supplierRop: 2000
  },
  {
    id: 'inv-0104',
    supplierId: 'sup-002',
    materialCode: 'RM-STEAR-7300',
    qtyOnHand: 4200,
    lastUpdated: '2025-04-04',
    channel: 'manual',
    supplierRop: 5000,
    inProductionQty: 6000,
    productionCompletionDate: '2025-04-12'
  },
  {
    id: 'inv-0105',
    supplierId: 'sup-003',
    materialCode: 'FR-WARD-4410',
    qtyOnHand: 120,
    lastUpdated: '2025-04-06',
    channel: 'api'
  },
  {
    id: 'inv-0106',
    supplierId: 'sup-003',
    materialCode: 'FR-EMIN-4420',
    qtyOnHand: 210,
    lastUpdated: '2025-04-06',
    channel: 'api'
  },
  {
    id: 'inv-0107',
    supplierId: 'sup-005',
    materialCode: 'AI-NIAC-6601',
    qtyOnHand: 3800,
    lastUpdated: '2025-04-05',
    channel: 'template'
  },
  {
    id: 'inv-0108',
    supplierId: 'sup-005',
    materialCode: 'AI-HYALU-6610',
    qtyOnHand: 95,
    lastUpdated: '2025-04-05',
    channel: 'template'
  },
  {
    id: 'inv-0109',
    supplierId: 'sup-006',
    materialCode: 'AI-VITC-6720',
    qtyOnHand: 180,
    lastUpdated: '2025-04-03',
    channel: 'manual'
  },
  {
    // BL-358 — TWO production runs, so the real mock read (not only a seeded
    // test read) carries N runs through the drawer and the download. They sum to
    // the 60,000 the single pair carried, and the later date is unchanged, so
    // every total and "latest ETA" that read the pair stays true.
    id: 'inv-0110',
    supplierId: 'sup-007',
    materialCode: 'PK-PETB-8801',
    qtyOnHand: 85000,
    lastUpdated: '2025-04-06',
    channel: 'template',
    supplierRop: 60000,
    inProductionRuns: [
      { quantity: 20000, completionDate: '2025-04-10' },
      { quantity: 40000, completionDate: '2025-04-16' }
    ]
  },
  {
    id: 'inv-0111',
    supplierId: 'sup-007',
    materialCode: 'PK-PETB-8802',
    qtyOnHand: 22000,
    lastUpdated: '2025-04-05',
    channel: 'template',
    supplierRop: 30000
  },
  {
    id: 'inv-0112',
    supplierId: 'sup-008',
    materialCode: 'PK-CART-9901',
    qtyOnHand: 620000,
    lastUpdated: '2025-04-04',
    channel: 'manual'
  },
  {
    id: 'inv-0113',
    supplierId: 'sup-009',
    materialCode: 'AI-VITC-6730',
    qtyOnHand: 750,
    lastUpdated: '2025-04-02',
    channel: 'template'
  },
  {
    id: 'inv-0114',
    supplierId: 'sup-009',
    materialCode: 'AI-PANTO-6640',
    qtyOnHand: 1100,
    lastUpdated: '2025-04-03',
    channel: 'template'
  },
  {
    // REQ-E08-02 BR-08 — the supplier replied by WhatsApp; a planner recorded it.
    id: 'inv-0115',
    supplierId: 'sup-010',
    materialCode: 'RM-EMUL-9430',
    qtyOnHand: 420,
    lastUpdated: '2025-04-05',
    channel: 'pti'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// THE DECLARED PRESENT — FIXTURE-PRESENT-01 (d).
//
// ⚠️ **THIS FAMILY MOVES FURTHEST, AND THAT IS THE MEASUREMENT THAT KILLED THE
// FIXTURE REFRESH.** Its own rows declare its as-of date — `lastUpdated` runs
// 2025-04-02..2025-04-06, a full YEAR behind every other family in the tree. A
// uniform "refresh everything to one date" would have left this set a year
// adrift from the cluster instead of the four months it was; anchoring it on its
// own declared date is what lets it land beside the others without inventing a
// past it never had. The production completion dates ride the same anchor, so
// they stay the same number of days after each submission.
// ─────────────────────────────────────────────────────────────────────────────
const shifted = shiftFields(items, 'inventory', ['lastUpdated', 'productionCompletionDate']);

// BL-358 — each run's own completion date shifts with the family, like every
// other date in it. `shiftFields` moves top-level fields only, so the nested
// list is shifted here with the same `shiftIso` rather than hand-computed.
/** @type {SupplierStockSeed[]} */
export const mockInventory = shifted.map((row) =>
  row.inProductionRuns
    ? {
        ...row,
        inProductionRuns: row.inProductionRuns.map((run) => ({
          ...run,
          ...(run.completionDate
            ? { completionDate: shiftIso(run.completionDate, 'inventory') }
            : {})
        }))
      }
    : row
);
