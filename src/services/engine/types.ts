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
//       (`data/types.ts`) is a header with `orderDate` / `requestedDeliveryDate`
//       / `confirmedDeliveryDate`; the engine keeps one row per line with
//       `createdAt` / `requestedDate` because a PTI change moves ONE line's date,
//       not the header's.
//     · `Receipt` carries `grNumber` exactly as the Hub's `GoodsReceipt` does.
//     · `PlanVersion` is a flattened line of the Hub's `ForecastPublication`
//       (one row per supplier × material × period × version) — the grain MASC
//       compares at (METHOD-SPEC G1).
// ─────────────────────────────────────────────────────────────────────────────

import type { Uom } from '../sdc/types';

/** YYYY-MM-DD. */
export type IsoDate = string;
/** Full ISO instant, UTC (`…Z`). */
export type IsoInstant = string;

export type Brand = 'Wardah' | 'Emina' | 'Make Over';

/** A finished-good SKU. NOT a material: FGs are sold, not purchased. */
export interface FinishedGood {
  readonly skuCode: string;
  readonly name: string;
  readonly brand: Brand;
  readonly category: string;
  readonly launchDate: IsoDate;
  readonly discontinueDate?: IsoDate;
}

/** Weekly sell-in per SKU (E14-01 BR-02). `weekStart` is a Monday. */
export interface SalesWeek {
  readonly skuCode: string;
  readonly weekStart: IsoDate;
  readonly quantity: number;
  /** The SKU was out of stock that week: a low figure is not low demand. */
  readonly stockout: boolean;
}

/** One bill-of-materials line, FG → material, valid in [validFrom, validTo). */
export interface BomLine {
  readonly parentCode: string;
  readonly componentCode: string;
  /** Component quantity per ONE parent unit, in `uom`. */
  readonly qtyPer: number;
  readonly uom: Uom;
  /** Scrap as a fraction (0.02 = 2%). */
  readonly scrapPct: number;
  readonly validFrom: IsoDate;
  readonly validTo?: IsoDate;
}

/**
 * A supplier's source of a material — the SAP purchasing info record.
 * Extends the Hub's `ForecastSource` triple (supplierId · materialCode · share).
 */
export interface MaterialSource {
  readonly materialCode: string;
  readonly supplierId: string;
  readonly leadTimeDays: number;
  readonly moq: number;
  readonly orderMultiple: number;
  /** Share of the material's demand allocated to this supplier (0–1). */
  readonly share: number;
}

export type WarehouseKind = 'packaging' | 'rawMaterial';

export interface Warehouse {
  readonly warehouseId: string;
  readonly kind: WarehouseKind;
  readonly capacityPallets: number;
}

export interface MaterialVolume {
  readonly materialCode: string;
  readonly unitsPerPallet: number;
}

export interface StockSnapshot {
  readonly materialCode: string;
  readonly warehouseId: string;
  readonly date: IsoDate;
  readonly onHandQty: number;
}

export interface CycleCount {
  readonly materialCode: string;
  readonly warehouseId: string;
  readonly countDate: IsoDate;
  readonly systemQty: number;
  readonly countedQty: number;
}

/** One PO schedule line as PTI sent it. Later changes are `ScheduleChange` rows. */
export interface PoLine {
  readonly poNumber: string;
  readonly line: number;
  readonly supplierId: string;
  readonly materialCode: string;
  readonly orderedQty: number;
  readonly uom: Uom;
  readonly requestedDate: IsoDate;
  readonly createdAt: IsoInstant;
  /** The supplier must confirm by this instant (REQ-E07-02 BR-01). */
  readonly confirmDeadline: IsoInstant;
}

/** Who changed a schedule line. */
export type ChangeParty = 'PTI' | 'SUPPLIER';

/**
 * A change to one schedule line. A quantity change to 0 is a cancellation.
 * Typed per field so a date can never be compared as a quantity.
 */
export type ScheduleChange =
  | {
      readonly poNumber: string;
      readonly line: number;
      readonly at: IsoInstant;
      readonly field: 'quantity';
      readonly from: number;
      readonly to: number;
      readonly by: ChangeParty;
      readonly reason?: string;
    }
  | {
      readonly poNumber: string;
      readonly line: number;
      readonly at: IsoInstant;
      readonly field: 'date';
      readonly from: IsoDate;
      readonly to: IsoDate;
      readonly by: ChangeParty;
      readonly reason?: string;
    };

/** A supplier's confirmation of a line. A later one supersedes (SCOR, BR-04). */
export interface Confirmation {
  readonly poNumber: string;
  readonly line: number;
  readonly confirmedQty: number;
  readonly confirmedDate: IsoDate;
  readonly confirmedAt: IsoInstant;
}

export interface Receipt {
  readonly grNumber: string;
  readonly poNumber: string;
  readonly line: number;
  readonly receivedQty: number;
  readonly receivedDate: IsoDate;
}

/**
 * One period of one plan version as the supplier saw it (the forecast history
 * MASC reads). `periodBucket` is the Monday of the week.
 */
export interface PlanVersion {
  readonly supplierId: string;
  readonly materialCode: string;
  readonly periodBucket: IsoDate;
  readonly versionNo: number;
  readonly publishedAt: IsoInstant;
  readonly quantity: number;
}

/** A material as the engine sees it: the master's identity plus its stream. */
export interface EngineMaterial {
  readonly materialCode: string;
  readonly kind: WarehouseKind;
  readonly uom: Uom;
  /**
   * The master's material group (E14-04 BR-03: safety lead time is per supplier
   * × material group). Optional in the contract so a partial feed still loads;
   * a material without one is treated as a group of its own.
   */
  readonly materialGroup?: string;
}

/**
 * One week of one snapshot of SAP's finished-goods plan (E14-03 input; E14-04
 * measures its errors). Until E14-07 exists the engine runs on SAP's plan
 * (ENG-1). `madeAt` is the Monday of the week the plan was made; a snapshot
 * covers `weekStart` ≥ `madeAt`. Past snapshots are kept so the plan's errors
 * against what actually sold can be measured at every past origin (M3).
 */
export interface FgPlanSnapshot {
  readonly skuCode: string;
  readonly madeAt: IsoDate;
  readonly weekStart: IsoDate;
  readonly quantity: number;
}

/** Open sales-order quantity per SKU per week (M1 forecast consumption). */
export interface SalesOrderWeek {
  readonly skuCode: string;
  readonly weekStart: IsoDate;
  readonly quantity: number;
}

/**
 * SAP's current safety stock per material, in the material's unit. The value
 * E14-04 compares against, and the one it falls back to while a material has
 * too little history (E14-04 BR-05).
 */
export interface SapSafetyStock {
  readonly materialCode: string;
  readonly quantity: number;
}

/** Where the dataset came from — X-03: every result says so. */
export interface DatasetProvenance {
  readonly liveness: 'SIMULATED';
  readonly generator: 'synthetic';
  readonly seed: number;
  /** The present the dataset was dated relative to (the hub's declared present). */
  readonly present: IsoDate;
}

/** Everything the engine reads. */
export interface EngineDataset {
  readonly provenance: DatasetProvenance;
  readonly materials: readonly EngineMaterial[];
  readonly finishedGoods: readonly FinishedGood[];
  readonly sales: readonly SalesWeek[];
  readonly bom: readonly BomLine[];
  readonly sources: readonly MaterialSource[];
  readonly warehouses: readonly Warehouse[];
  readonly volumes: readonly MaterialVolume[];
  readonly stock: readonly StockSnapshot[];
  readonly cycleCounts: readonly CycleCount[];
  readonly poLines: readonly PoLine[];
  readonly scheduleChanges: readonly ScheduleChange[];
  readonly confirmations: readonly Confirmation[];
  readonly receipts: readonly Receipt[];
  readonly planVersions: readonly PlanVersion[];
  /** SAP's finished-goods plan, every snapshot (E14-03, E14-04). */
  readonly fgPlan: readonly FgPlanSnapshot[];
  /** Open sales orders (E14-03 BR-01, M1). */
  readonly salesOrders: readonly SalesOrderWeek[];
  /** SAP's safety stock per material (E14-04 BR-05 fallback and comparison). */
  readonly sapSafetyStock: readonly SapSafetyStock[];
}

/** The key that joins a line's changes, confirmations and receipts. */
export const lineKey = (poNumber: string, line: number): string => `${poNumber}#${line}`;
