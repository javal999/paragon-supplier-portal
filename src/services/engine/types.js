// ─────────────────────────────────────────────────────────────────────────────
// FORECAST ENGINE — THE INPUT CONTRACT (REQ-E14-01, BL-102).
//
// The inputs every E14 calculation reads, at the grain the Master Data
// Management team will feed from SAP (E14-01 BR-06, ENG-D1). Until that feed
// lands, the engine runs on the synthetic dataset in `./synthetic/` (BR-07),
// which produces exactly these shapes — so the feed replaces the generator and
// nothing downstream changes.
//
// ── PORTABILITY (X-01) ──────────────────────────────────────────────────────
//   Plain data, no classes, no Hub-only types beyond two re-used aliases. The
//   module imports nothing that reads a clock or a store, so the engine can move
//   into SOMO unchanged.
//
// ── NAMES ───────────────────────────────────────────────────────────────────
//   The entity and field names are the dispatch's (BL-102), kept deliberately
//   close to SAP's line grain. Where the Hub already has a name for the same
//   thing, the relation is stated at the type rather than the Hub name forced
//   onto an engine input:
//     · `MaterialSource` EXTENDS the Hub's `ForecastSource`
//       (`transitions/forecastRules.ts`: supplierId · materialCode · share) —
//       same triple, plus the purchasing-info-record fields the engine needs.
//     · `PoLine` is the SAP schedule-line grain. The Hub's `PurchaseOrder`
//       (`data/types.js`) is a header with `orderDate` / `requestedDeliveryDate`
//       / `confirmedDeliveryDate`; the engine keeps one row per line with
//       `createdAt` / `requestedDate` because a PTI change moves ONE line's date,
//       not the header's.
//     · `Receipt` carries `grNumber` exactly as the Hub's `GoodsReceipt` does.
//     · `PlanVersion` is a flattened line of the Hub's `ForecastPublication`
//       (one row per supplier × material × period × version) — the grain MASC
//       compares at (METHOD-SPEC G1).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { Uom } from '../sdc/types' */

/** YYYY-MM-DD. */
/** @typedef {string} IsoDate */
/** Full ISO instant, UTC (`…Z`). */
/** @typedef {string} IsoInstant */

/** @typedef {'Wardah' | 'Emina' | 'Make Over'} Brand */

/** A finished-good SKU. NOT a material: FGs are sold, not purchased. */
/**
 * @typedef {object} FinishedGood
 * @property {string} skuCode
 * @property {string} name
 * @property {Brand} brand
 * @property {string} category
 * @property {IsoDate} launchDate
 * @property {IsoDate} [discontinueDate]
 * @property {boolean} [oem] PTI makes this product for another brand (OEM). Its demand is that brand's
 *   POs, exploded as firm orders; the demand forecast (E14-07) does not forecast
 *   it (ENG-D20). Absent = one of PTI's own brands. The synthetic dataset
 *   carries no OEM product (ENG-B65).
 */

/** Weekly sell-in per SKU (E14-01 BR-02). `weekStart` is a Monday. */
/**
 * @typedef {object} SalesWeek
 * @property {string} skuCode
 * @property {IsoDate} weekStart
 * @property {number} quantity
 * @property {boolean} stockout -  The SKU was out of stock that week: a low figure is not low demand.
 */

/** One bill-of-materials line, FG → material, valid in [validFrom, validTo). */
/**
 * @typedef {object} BomLine
 * @property {string} parentCode
 * @property {string} componentCode
 * @property {number} qtyPer -  Component quantity per ONE parent unit, in `uom`.
 * @property {Uom} uom
 * @property {number} scrapPct -  Scrap as a fraction (0.02 = 2%).
 * @property {number} yieldPct Yield as a fraction (0.95 = 95%): the share of the component issued that
 *   ends up in good parent units (E14-03 BR-03, BL-115). The requirement is
 *   DIVIDED by it, beside scrap: qtyPer × (1 + scrap) ÷ yield. 1 = no loss.
 *   Must be above 0 and at most 1; the integrity check names any other value
 *   (`BOM_YIELD_OUT_OF_RANGE`). SYNTHETIC 1 until the BOM feed carries it (BL-103).
 * @property {IsoDate} validFrom
 * @property {IsoDate} [validTo]
 */

/**
 * A supplier's source of a material — the SAP purchasing info record.
 * Extends the Hub's `ForecastSource` triple (supplierId · materialCode · share).
 */
/**
 * @typedef {object} MaterialSource
 * @property {string} materialCode
 * @property {string} supplierId
 * @property {number} leadTimeDays
 * @property {number} moq
 * @property {number} orderMultiple
 * @property {number} share -  Share of the material's demand allocated to this supplier (0–1).
 */

/** @typedef {'packaging' | 'rawMaterial'} WarehouseKind */

/**
 * @typedef {object} Warehouse
 * @property {string} warehouseId
 * @property {WarehouseKind} kind
 * @property {number} capacityPallets
 */

/**
 * @typedef {object} MaterialVolume
 * @property {string} materialCode
 * @property {number} unitsPerPallet
 */

/**
 * @typedef {object} StockSnapshot
 * @property {string} materialCode
 * @property {string} warehouseId
 * @property {IsoDate} date
 * @property {number} onHandQty
 */

/**
 * @typedef {object} CycleCount
 * @property {string} materialCode
 * @property {string} warehouseId
 * @property {IsoDate} countDate
 * @property {number} systemQty
 * @property {number} countedQty
 */

/** One PO schedule line as PTI sent it. Later changes are `ScheduleChange` rows. */
/**
 * @typedef {object} PoLine
 * @property {string} poNumber
 * @property {number} line
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {number} orderedQty
 * @property {Uom} uom
 * @property {IsoDate} requestedDate
 * @property {IsoInstant} createdAt
 * @property {IsoInstant} confirmDeadline -  The supplier must confirm by this instant (REQ-E07-02 BR-01).
 */

/** Who changed a schedule line. */
/** @typedef {'PTI' | 'SUPPLIER'} ChangeParty */

/**
 * A change to one schedule line. A quantity change to 0 is a cancellation.
 * Typed per field so a date can never be compared as a quantity.
 */
/**
 * @typedef {| {
 *       readonly poNumber: string;
 *       readonly line: number;
 *       readonly at: IsoInstant;
 *       readonly field: 'quantity';
 *       readonly from: number;
 *       readonly to: number;
 *       readonly by: ChangeParty;
 *       readonly reason?: string;
 *     }
 *   | {
 *       readonly poNumber: string;
 *       readonly line: number;
 *       readonly at: IsoInstant;
 *       readonly field: 'date';
 *       readonly from: IsoDate;
 *       readonly to: IsoDate;
 *       readonly by: ChangeParty;
 *       readonly reason?: string;
 *     }} ScheduleChange
 */

/** A supplier's confirmation of a line. A later one supersedes (SCOR, BR-04). */
/**
 * @typedef {object} Confirmation
 * @property {string} poNumber
 * @property {number} line
 * @property {number} confirmedQty
 * @property {IsoDate} confirmedDate
 * @property {IsoInstant} confirmedAt
 */

/**
 * @typedef {object} Receipt
 * @property {string} grNumber
 * @property {string} poNumber
 * @property {number} line
 * @property {number} receivedQty
 * @property {IsoDate} receivedDate
 */

/**
 * One period of one plan version as the supplier saw it (the forecast history
 * MASC reads). `periodBucket` is the Monday of the week.
 */
/**
 * @typedef {object} PlanVersion
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {IsoDate} periodBucket
 * @property {number} versionNo
 * @property {IsoInstant} publishedAt
 * @property {number} quantity
 */

/** A material as the engine sees it: the master's identity plus its stream. */
/**
 * @typedef {object} EngineMaterial
 * @property {string} materialCode
 * @property {WarehouseKind} kind
 * @property {Uom} uom
 * @property {string} [materialGroup] The master's material group (E14-04 BR-03: safety lead time is per supplier
 *   × material group). Optional in the contract so a partial feed still loads;
 *   a material without one is treated as a group of its own.
 */

/**
 * One week of one snapshot of SAP's finished-goods plan (E14-03 input; E14-04
 * measures its errors). Until E14-07 exists the engine runs on SAP's plan
 * (ENG-1). `madeAt` is the Monday of the week the plan was made; a snapshot
 * covers `weekStart` ≥ `madeAt`. Past snapshots are kept so the plan's errors
 * against what actually sold can be measured at every past origin (M3).
 */
/**
 * @typedef {object} FgPlanSnapshot
 * @property {string} skuCode
 * @property {IsoDate} madeAt
 * @property {IsoDate} weekStart
 * @property {number} quantity
 */

/** Open sales-order quantity per SKU per week (M1 forecast consumption). */
/**
 * @typedef {object} SalesOrderWeek
 * @property {string} skuCode
 * @property {IsoDate} weekStart
 * @property {number} quantity
 */

/**
 * SAP's current safety stock per material, in the material's unit. The value
 * E14-04 compares against, and the one it falls back to while a material has
 * too little history (E14-04 BR-05).
 */
/**
 * @typedef {object} SapSafetyStock
 * @property {string} materialCode
 * @property {number} quantity
 */

/**
 * A material's value per ONE base unit, in rupiah — SAP's material valuation
 * (E14-05: the holding cost is a share of value per year, ENG-D6). Added with
 * E14-05; SYNTHETIC until the Master Data Management feed carries it.
 */
/**
 * @typedef {object} MaterialValue
 * @property {string} materialCode
 * @property {number} unitValueIdr
 */

/** Where the dataset came from — X-03: every result says so. */
/**
 * @typedef {object} DatasetProvenance
 * @property {'SIMULATED'} liveness
 * @property {'synthetic'} generator
 * @property {number} seed
 * @property {IsoDate} present -  The present the dataset was dated relative to (the hub's declared present).
 */

/** Everything the engine reads. */
/**
 * @typedef {object} EngineDataset
 * @property {DatasetProvenance} provenance
 * @property {readonly EngineMaterial[]} materials
 * @property {readonly FinishedGood[]} finishedGoods
 * @property {readonly SalesWeek[]} sales
 * @property {readonly BomLine[]} bom
 * @property {readonly MaterialSource[]} sources
 * @property {readonly Warehouse[]} warehouses
 * @property {readonly MaterialVolume[]} volumes
 * @property {readonly StockSnapshot[]} stock
 * @property {readonly CycleCount[]} cycleCounts
 * @property {readonly PoLine[]} poLines
 * @property {readonly ScheduleChange[]} scheduleChanges
 * @property {readonly Confirmation[]} confirmations
 * @property {readonly Receipt[]} receipts
 * @property {readonly PlanVersion[]} planVersions
 * @property {readonly FgPlanSnapshot[]} fgPlan -  SAP's finished-goods plan, every snapshot (E14-03, E14-04).
 * @property {readonly SalesOrderWeek[]} salesOrders -  Open sales orders (E14-03 BR-01, M1).
 * @property {readonly SapSafetyStock[]} sapSafetyStock -  SAP's safety stock per material (E14-04 BR-05 fallback and comparison).
 * @property {readonly MaterialValue[]} materialValues -  Value per unit per material (E14-05 holding cost).
 */

/**
 * The key that joins a line's changes, confirmations and receipts.
 * @param {string} poNumber
 * @param {number} line
 * @returns {string}
 */
export const lineKey = (poNumber, line) => `${poNumber}#${line}`;
