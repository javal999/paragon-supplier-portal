// ─────────────────────────────────────────────────────────────────────────────
// THE SYNTHETIC ENGINE DATASET (BL-102; REQ-E14-01 BR-07, owner decision ENG-D1).
//
// ⚠️ HONESTY: EVERY ROW THIS PRODUCES IS INVENTED. Until the Master Data
// Management team connects SAP, the engine runs on this dataset so the screens
// and measures behave realistically. Results on it prove the CALCULATIONS, not
// the business answer (BR-07). It is registered SIMULATED in the liveness
// registry (`engineDataset`), and its provenance travels on the dataset itself.
//
// ── WHAT IT IS BUILT TO REPRODUCE (the owner's "Challenge & Gaps") ──────────
//   confirmation by deadline ≈ 67% · CFOT (by definition) ≈ 36% · packaging
//   warehouse 121–142% of capacity over the latest 13 weekly snapshots · raw
//   material ≈ 106% over the latest 3 · never-confirmed the largest class of
//   missed line · PTI changes inside lead time on ~15–20% of schedules ·
//   10–20% of materials with a cycle-count gap above 2%. The calibration test
//   MEASURES each of these with the engine's own functions; nothing here
//   asserts a figure.
//
// ── IDENTITIES ──────────────────────────────────────────────────────────────
//   · Materials: the caller passes the ONE material master (C8 §4.0). The
//     stream (packaging / raw material) comes from its `materialType`, never
//     from the code's prefix — `materialCode` is contractually opaque (C9 §3),
//     so the actives (`AI-`) and fragrances (`FR-`) are raw materials too.
//   · Suppliers: the caller passes the Hub's sample supplier set and every
//     existing supplier–material relationship; each relationship becomes a
//     source (with its share, where the Hub states one). Materials with no
//     relationship draw suppliers of the matching category.
//   · Finished goods: NEW synthetic identities, prefixed `SYN-FG-` so they can
//     never be mistaken for a SAP SKU or a material code. They are not
//     materials and never enter the material master.
//   · Documents: `SYN-PO-…` / `SYN-GR-…`, for the same reason.
//
// ── SAP'S FINISHED-GOODS PLAN, OPEN SALES ORDERS, SAP SAFETY STOCK ──────────
//   Stand-ins for SAP inputs E14-03 and E14-04 read until E14-07 exists (the
//   engine runs on "SAP's plan", ENG-1). The plan is a weekly snapshot made at
//   each of the last `fgPlanOrigins` Mondays and at this Monday, each covering
//   `fgPlanHorizonWeeks`. It is a deliberately imperfect forecast: a
//   deseasonalised level from the 8 weeks before the origin, re-seasonalised,
//   times a per-SKU bias and a noise that grows with the horizon — so the
//   plan's errors against the generated sales EXIST and E14-04 can measure
//   them. Open sales orders fill part of the next two weeks, sometimes more
//   than the plan (M1 consumption then has work to do). SAP's safety stock is a
//   static two to four weeks of recent requirement — SAP's cover rule, which
//   E14-04 compares its own figure against.
//
//   ⚠️ These three draw from a SEPARATE seeded stream (`seed ^ PLAN_STREAM`),
//   generated after everything else, so adding them moved no existing row: the
//   BL-102 calibration measures are exactly what they were.
//
// ── MATERIAL VALUE (E14-05) ─────────────────────────────────────────────────
//   Rupiah per unit per material, for the holding cost order sizing weighs.
//   Invented bands by BOM slot. Its own stream (`seed ^ VALUE_STREAM`), drawn
//   last, for the same reason: no earlier row moves.
//
// ── PURITY (X-01) ───────────────────────────────────────────────────────────
//   Inputs in, dataset out. The present, the lead-time rule and the
//   confirmation-deadline rule are ARGUMENTS; there is no clock read, no store
//   read and no `Math.random` — the seeded `Rng` is the only source of noise,
//   so the same seed always yields the same dataset.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { MaterialType, Uom } from '../../sdc/types' */
import { grossRequirement } from '../bom';
import { addDays, addHours, dayOf, daysBetween, instantOn, isWeekend, mondayOf } from '../dates';
/** @import { BomLine, Brand, Confirmation, CycleCount, EngineDataset, EngineMaterial, FgPlanSnapshot, FinishedGood, IsoDate, IsoInstant, MaterialSource, MaterialValue, MaterialVolume, PlanVersion, PoLine, Receipt, SalesOrderWeek, SalesWeek, SapSafetyStock, ScheduleChange, StockSnapshot, Warehouse, WarehouseKind } from '../types' */
/** @import { Rng } from './prng' */
import { createRng } from './prng';
/** @import { SupplierProfile } from './profiles' */

// ── Inputs ──────────────────────────────────────────────────────────────────

/**
 * @typedef {object} GeneratorMaterial
 * @property {string} materialCode
 * @property {MaterialType} materialType
 * @property {string} materialGroup
 * @property {Uom} canonicalUom
 */

/**
 * @typedef {object} GeneratorSupplier
 * @property {string} supplierId
 * @property {string} category -  The supplier master's category ('Packaging', 'Raw Material', …).
 */

/**
 * @typedef {object} GeneratorRelationship
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {number} [share] -  The share the Hub already allocates, when it states one.
 */

/**
 * @typedef {object} GeneratorSizes
 * @property {number} finishedGoods
 * @property {number} salesWeeks -  Weeks of sell-in history (E14-01 BR-02: 2 to 3 years).
 * @property {number} poWeeks -  Weeks of PO history ending at the present.
 * @property {number} openWeeks -  Weeks of open (future) PO lines past the present.
 * @property {number} planVersions -  Weekly plan versions published, ending at the present.
 * @property {number} planHorizonWeeks -  Weeks each plan version covers.
 * @property {number} stockWeeks -  Weekly stock snapshots ending at the present.
 * @property {number} fgPlanOrigins -  Past weekly origins of SAP's finished-goods plan (plus this week's).
 * @property {number} fgPlanHorizonWeeks -  Weeks each finished-goods plan snapshot covers.
 */

/** @type {GeneratorSizes} */
export const DEFAULT_SIZES = Object.freeze({
  finishedGoods: 20,
  salesWeeks: 104,
  poWeeks: 26,
  openWeeks: 4,
  planVersions: 13,
  planHorizonWeeks: 8,
  stockWeeks: 26,
  fgPlanOrigins: 52,
  fgPlanHorizonWeeks: 26
});

/** XOR-ed into the seed for the plan stream, so it never shares draws with the rest. */
const PLAN_STREAM = 0x5eed0e14;
/** XOR-ed into the seed for the material-value stream (E14-05), for the same reason. */
const VALUE_STREAM = 0x5eed0e15;

/** The calibration targets the generator steers at (the calibration test measures them). */
export const WAREHOUSE_TARGETS = Object.freeze({
  /** Latest N weekly snapshots of the packaging warehouse sit in this band. */
  packaging: { recentWeeks: 13, min: 1.24, max: 1.39 },
  /** Latest N weekly snapshots of the raw-material warehouse sit in this band. */
  rawMaterial: { recentWeeks: 3, min: 1.045, max: 1.075 }
});

/** Share of materials whose latest cycle count is off by more than 2% (ENG-D2 context). */
export const FLAGGED_COUNT_SHARE = 0.15;

/**
 * @typedef {object} GeneratorInput
 * @property {number} seed
 * @property {IsoInstant} now -  The hub's present (an instant). Everything is dated relative to it; nothing after it happens.
 * @property {readonly GeneratorMaterial[]} materials
 * @property {readonly GeneratorSupplier[]} suppliers
 * @property {readonly GeneratorRelationship[]} relationships
 * @property {(supplierId: string, material: GeneratorMaterial) => number} leadTimeDays -  The Hub's lead-time rule for a supplier × material (reused, not restated).
 * @property {(createdAt: IsoInstant) => IsoInstant} confirmDeadline -  The Hub's PO response-deadline rule (reused, not restated).
 * @property {Readonly<Record<string, SupplierProfile>>} profiles
 * @property {SupplierProfile} defaultProfile
 * @property {Partial<GeneratorSizes>} [sizes]
 */

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * @param {MaterialType} t
 * @returns {WarehouseKind}
 */
const kindOf = (t) => (t === 'VERP' ? 'packaging' : 'rawMaterial');

/**
 * The supplier category that supplies a material, read from its GROUP (never its code).
 * @param {GeneratorMaterial} m
 * @returns {string}
 */
function categoryFor(m) {
  if (m.materialType === 'VERP') return 'Packaging';
  if (m.materialGroup === 'MG-04' || m.materialGroup === 'MG-06') return 'Active Ingredient';
  if (m.materialGroup === 'MG-05') return 'Fragrance';
  return 'Raw Material';
}

/** The BOM slot a material fills, read from its group. */
/** @typedef {'container' | 'closure' | 'carton' | 'base' | 'feedstock' | 'active' | 'fragrance'} Slot */
/**
 * @param {GeneratorMaterial} m
 * @returns {Slot}
 */
function slotOf(m) {
  if (m.materialType === 'VERP') {
    if (m.materialGroup === 'MG-21') return 'closure';
    if (m.materialGroup === 'MG-23' || m.materialGroup === 'MG-24') return 'carton';
    return 'container';
  }
  if (m.materialGroup === 'MG-04' || m.materialGroup === 'MG-06') return 'active';
  if (m.materialGroup === 'MG-05') return 'fragrance';
  if (m.materialGroup === 'MG-10') return 'feedstock';
  return 'base';
}

/**
 * kg (or units) of a component per finished unit, by slot.
 * @param {Slot} slot
 * @param {Rng} rng
 * @returns {number}
 */
function qtyPerFor(slot, rng) {
  switch (slot) {
    case 'container':
    case 'closure':
    case 'carton':
      return 1;
    case 'base':
      return round4(rng.range(0.01, 0.03));
    case 'feedstock':
      return round4(rng.range(0.005, 0.02));
    case 'active':
      return round4(rng.range(0.0005, 0.003));
    case 'fragrance':
      return round4(rng.range(0.0005, 0.002));
  }
}

/** @param {number} n */
function round4(n) {
  return Math.round(n * 10_000) / 10_000;
}
/**
 * @param {number} n
 * @param {number} step
 */
const roundUpTo = (n, step) => Math.max(step, Math.ceil(n / step) * step);
/**
 * @param {number} n
 * @param {number} step
 */
const roundDownTo = (n, step) => Math.max(step, Math.floor(n / step) * step);

/**
 * Units per pallet, by slot and unit.
 * @param {Slot} slot
 * @param {Uom} uom
 * @param {Rng} rng
 * @returns {number}
 */
function unitsPerPalletFor(slot, uom, rng) {
  if (uom !== 'PCS') return rng.int(6, 10) * 100; // KG: 600–1,000 kg a pallet
  if (slot === 'closure') return rng.int(20, 40) * 1000;
  if (slot === 'carton') return rng.int(15, 25) * 100;
  return rng.int(30, 50) * 100;
}

/**
 * Week-of-year seasonality: the pre-Lebaran sell-in peak and the year-end promotions.
 * @param {IsoDate} weekStart
 * @returns {number}
 */
function seasonality(weekStart) {
  const d = new Date(`${weekStart}T00:00:00.000Z`);
  const doy = Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000);
  /**
   * @param {number} centre
   * @param {number} width
   * @param {number} height
   */
  const bump = (centre, width, height) => {
    const dist = Math.min(Math.abs(doy - centre), 365 - Math.abs(doy - centre));
    return height * Math.exp(-(dist * dist) / (2 * width * width));
  };
  return 1 + bump(55, 18, 0.45) + bump(330, 14, 0.2);
}

// ── Finished goods, BOM, sales ──────────────────────────────────────────────

/** @type {readonly Brand[]} */
const BRANDS = ['Wardah', 'Emina', 'Make Over'];
const CATEGORIES = /** @type {const} */ ([
  'Skincare',
  'Cleanser',
  'Body care',
  'Hair care',
  'Fragrance'
]);
/** @type {Readonly<Record<(typeof CATEGORIES)[number], readonly string[]>>} */
const FG_WORDS = {
  Skincare: [
    'Hydrating Serum',
    'Brightening Cream',
    'Day Moisturiser',
    'Night Cream',
    'Sunscreen Gel'
  ],
  Cleanser: ['Facial Wash', 'Micellar Water', 'Cleansing Foam'],
  'Body care': ['Body Lotion', 'Body Serum', 'Hand Cream'],
  'Hair care': ['Shampoo', 'Hair Tonic'],
  Fragrance: ['Eau de Parfum', 'Body Mist']
};

/**
 * @param {number} n
 * @param {Rng} rng
 * @param {IsoDate} today
 * @param {IsoDate} salesStart
 * @returns {FinishedGood[]}
 */
function buildFinishedGoods(n, rng, today, salesStart) {
  /** @type {FinishedGood[]} */
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const brand = BRANDS[i % BRANDS.length];
    const category = CATEGORIES[i % CATEGORIES.length];
    const word = FG_WORDS[category][Math.floor(i / CATEGORIES.length) % FG_WORDS[category].length];
    // Every 5th SKU launched inside the last year: less than one season of
    // history, so E14-08 (launch method) rather than E14-07 applies (BR-04).
    const recent = i % 5 === 4;
    const launchDate = recent
      ? mondayOf(addDays(today, -rng.int(12, 45) * 7))
      : mondayOf(addDays(salesStart, -rng.int(4, 150) * 7));
    /** @type {FinishedGood} */
    const fg = {
      skuCode: `SYN-FG-${String(i + 1).padStart(3, '0')}`,
      name: `${brand} ${word} (synthetic)`,
      brand,
      category,
      launchDate
    };
    // One SKU was discontinued eight weeks ago.
    out.push(i === 7 ? { ...fg, discontinueDate: mondayOf(addDays(today, -56)) } : fg);
  }
  return out;
}

/**
 * @param {readonly FinishedGood[]} fgs
 * @param {readonly GeneratorMaterial[]} materials
 * @param {Rng} rng
 * @param {IsoDate} bomChangeDate
 * @returns {BomLine[]}
 */
function buildBom(fgs, materials, rng, bomChangeDate) {
  const bySlot = /** @type {Map<Slot, GeneratorMaterial[]>} */ (new Map());
  for (const m of materials) {
    const s = slotOf(m);
    bySlot.set(s, [...(bySlot.get(s) ?? []), m]);
  }
  const used = /** @type {Set<string>} */ (new Set());
  /** @type {BomLine[]} */
  const out = [];
  /**
   * @param {FinishedGood} fg
   * @param {GeneratorMaterial} m
   * @param {Slot} slot
   * @param {IsoDate} validFrom
   * @param {IsoDate} [validTo]
   */
  const add = (fg, m, slot, validFrom, validTo) => {
    used.add(m.materialCode);
    const qtyPer =
      slot === 'carton' && fg.brand === 'Emina' && rng.chance(0.5)
        ? round4(1 / 12) // a shipper box holds twelve
        : qtyPerFor(slot, rng);
    out.push({
      parentCode: fg.skuCode,
      componentCode: m.materialCode,
      qtyPer,
      uom: m.canonicalUom,
      scrapPct: round4(rng.range(0.005, 0.03)),
      // BL-115 — no yield loss until the BOM feed carries yield (BL-103). A
      // constant, not a draw: drawing would shift every later draw of the
      // seeded stream and move every calibrated figure (ENG-B51).
      yieldPct: 1,
      validFrom,
      ...(validTo ? { validTo } : {})
    });
  };
  /** @type {readonly Slot[]} */
  const recipe = [
    'container',
    'closure',
    'carton',
    'base',
    'base',
    'feedstock',
    'active',
    'fragrance'
  ];
  fgs.forEach((fg, i) => {
    for (const slot of recipe) {
      const pool = bySlot.get(slot);
      if (!pool || pool.length === 0) continue;
      if (slot === 'carton' && rng.chance(0.3)) continue;
      const m = rng.pick(pool);
      if (out.some((b) => b.parentCode === fg.skuCode && b.componentCode === m.materialCode))
        continue;
      // Two SKUs changed their closure mid-history (E14-01 edge case: the
      // version valid in each week is used).
      if (slot === 'closure' && i < 2 && pool.length > 1) {
        const next = /** @type {GeneratorMaterial} */ (
          pool.find((x) => x.materialCode !== m.materialCode)
        );
        add(fg, m, slot, fg.launchDate, bomChangeDate);
        add(fg, next, slot, bomChangeDate);
        continue;
      }
      add(fg, m, slot, fg.launchDate);
    }
  });
  // Every master material is used somewhere — a material nothing consumes would
  // have no requirement and no purchase history.
  for (const m of materials) {
    if (used.has(m.materialCode)) continue;
    const slot = slotOf(m);
    const fg = fgs[rng.int(0, fgs.length - 1)];
    add(fg, m, slot, fg.launchDate);
  }
  return out;
}

/**
 * @param {readonly FinishedGood[]} fgs
 * @param {readonly IsoDate[]} weeks
 * @param {Rng} rng
 * @returns {SalesWeek[]}
 */
function buildSales(fgs, weeks, rng) {
  /** @type {SalesWeek[]} */
  const out = [];
  for (const fg of fgs) {
    const base = rng.int(30, 200) * 100;
    const trend = rng.range(-0.002, 0.004);
    weeks.forEach((w, i) => {
      if (w < fg.launchDate) return;
      if (fg.discontinueDate && w >= fg.discontinueDate) return;
      const sinceLaunch = daysBetween(fg.launchDate, w) / 7;
      const ramp = sinceLaunch < 8 ? 0.4 + (0.6 * sinceLaunch) / 8 : 1;
      const expected = base * seasonality(w) * (1 + trend * i) * ramp;
      const stockout = rng.chance(0.03);
      const noisy = expected * (1 + 0.12 * rng.normal()) * (stockout ? rng.range(0.2, 0.5) : 1);
      out.push({
        skuCode: fg.skuCode,
        weekStart: w,
        quantity: Math.max(0, Math.round(noisy)),
        stockout
      });
    });
  }
  return out;
}

// ── Sources ─────────────────────────────────────────────────────────────────

/**
 * @param {GeneratorInput} input
 * @param {Rng} rng
 * @param {Map<string, number>} baseline
 * @returns {MaterialSource[]}
 */
function buildSources(input, rng, baseline) {
  const supplierIds = new Set(input.suppliers.map((s) => s.supplierId));
  /** @type {MaterialSource[]} */
  const out = [];
  const chosenBy = /** @type {Map<string, { supplierId: string; share: number }[]>} */ (new Map());
  for (const m of input.materials) {
    const rels = input.relationships.filter(
      (r, i, all) =>
        r.materialCode === m.materialCode &&
        supplierIds.has(r.supplierId) &&
        all.findIndex((x) => x.materialCode === r.materialCode && x.supplierId === r.supplierId) ===
          i
    );
    /** @type {{ supplierId: string; share: number }[]} */
    let chosen;
    if (rels.length > 0) {
      const stated =
        rels.every((r) => r.share !== undefined) &&
        Math.abs(rels.reduce((s, r) => s + (r.share ?? 0), 0) - 1) < 1e-9;
      const defaults = rels.length === 1 ? [1] : rels.length === 2 ? [0.6, 0.4] : [0.5, 0.3, 0.2];
      chosen = rels.slice(0, 3).map((r, i) => ({
        supplierId: r.supplierId,
        share: stated ? /** @type {number} */ (r.share) : defaults[i]
      }));
    } else {
      const cat = categoryFor(m);
      const pool = input.suppliers.filter((s) => s.category === cat).map((s) => s.supplierId);
      const from = pool.length > 0 ? pool : input.suppliers.map((s) => s.supplierId);
      const picks = rng.shuffle(from).slice(0, rng.chance(0.4) && from.length > 1 ? 2 : 1);
      chosen =
        picks.length === 1
          ? [{ supplierId: picks[0], share: 1 }]
          : [
              { supplierId: picks[0], share: 0.7 },
              { supplierId: picks[1], share: 0.3 }
            ];
    }
    chosenBy.set(m.materialCode, chosen);
  }
  // Every supplier in the set trades: one left without a material becomes the
  // 30% second source of the first single-source material of its category that
  // no relationship fixes (deterministic — no draw).
  const trading = new Set([...chosenBy.values()].flat().map((c) => c.supplierId));
  const fixed = new Set(input.relationships.map((r) => r.materialCode));
  for (const s of input.suppliers) {
    if (trading.has(s.supplierId)) continue;
    const m = input.materials.find(
      (x) =>
        categoryFor(x) === s.category &&
        !fixed.has(x.materialCode) &&
        chosenBy.get(x.materialCode)?.length === 1
    );
    if (!m) continue;
    const [only] = /** @type {NonNullable<ReturnType<typeof chosenBy.get>>} */ (
      chosenBy.get(m.materialCode)
    );
    chosenBy.set(m.materialCode, [
      { supplierId: only.supplierId, share: 0.7 },
      { supplierId: s.supplierId, share: 0.3 }
    ]);
    trading.add(s.supplierId);
  }
  for (const m of input.materials) {
    const chosen = /** @type {NonNullable<ReturnType<typeof chosenBy.get>>} */ (
      chosenBy.get(m.materialCode)
    );
    const weekly = baseline.get(m.materialCode) ?? 0;
    for (const c of chosen) {
      const orderMultiple = m.canonicalUom === 'PCS' ? 1000 : 25;
      const typical = weekly * c.share * (kindOf(m.materialType) === 'packaging' ? 1 : 2);
      out.push({
        materialCode: m.materialCode,
        supplierId: c.supplierId,
        leadTimeDays: input.leadTimeDays(c.supplierId, m),
        moq: roundUpTo(typical * 0.5, orderMultiple),
        orderMultiple,
        share: c.share
      });
    }
  }
  return out;
}

// ── Warehouses, stock, counts ───────────────────────────────────────────────

/** @type {readonly Warehouse[]} */
const WAREHOUSES = Object.freeze([
  { warehouseId: 'SYN-WH-PK', kind: 'packaging', capacityPallets: 1800 },
  { warehouseId: 'SYN-WH-RM', kind: 'rawMaterial', capacityPallets: 1200 }
]);

/**
 * @param {readonly EngineMaterial[]} materials
 * @param {ReadonlyMap<string, number>} volumes
 * @param {ReadonlyMap<string, number>} baseline
 * @param {readonly IsoDate[]} dates
 * @param {Rng} rng
 * @returns {StockSnapshot[]}
 */
function buildStock(materials, volumes, baseline, dates, rng) {
  /** @type {StockSnapshot[]} */
  const out = [];
  for (const wh of WAREHOUSES) {
    const mats = materials.filter((m) => m.kind === wh.kind);
    const target = WAREHOUSE_TARGETS[wh.kind];
    // Relative pallet footprint: weeks of cover × weekly requirement in pallets.
    const weight = new Map(
      mats.map((m) => [
        m.materialCode,
        (((baseline.get(m.materialCode) ?? 0) + 1) /
          /** @type {NonNullable<ReturnType<typeof volumes.get>>} */ (
            volumes.get(m.materialCode)
          )) *
          rng.range(3, 10)
      ])
    );
    const n = dates.length;
    dates.forEach((date, i) => {
      const recent = i >= n - target.recentWeeks;
      const early =
        wh.kind === 'packaging'
          ? 0.95 + (0.22 * i) / (n - target.recentWeeks)
          : 0.86 + (0.14 * i) / (n - target.recentWeeks);
      const u = recent ? rng.range(target.min, target.max) : early + rng.range(-0.03, 0.03);
      const raw = mats.map(
        (m) =>
          /** @type {NonNullable<ReturnType<typeof weight.get>>} */ (weight.get(m.materialCode)) *
          rng.range(0.92, 1.08)
      );
      const sum = raw.reduce((s, x) => s + x, 0);
      mats.forEach((m, j) => {
        const pallets = (u * wh.capacityPallets * raw[j]) / sum;
        out.push({
          materialCode: m.materialCode,
          warehouseId: wh.warehouseId,
          date,
          onHandQty: Math.round(
            pallets *
              /** @type {NonNullable<ReturnType<typeof volumes.get>>} */ (
                volumes.get(m.materialCode)
              )
          )
        });
      });
    });
  }
  return out;
}

/**
 * @param {readonly EngineMaterial[]} materials
 * @param {readonly StockSnapshot[]} stock
 * @param {IsoDate} today
 * @param {Rng} rng
 * @returns {CycleCount[]}
 */
function buildCycleCounts(materials, stock, today, rng) {
  const flaggedN = Math.round(materials.length * FLAGGED_COUNT_SHARE);
  const flagged = new Set(rng.shuffle(materials.map((m) => m.materialCode)).slice(0, flaggedN));
  /** @type {CycleCount[]} */
  const out = [];
  for (const m of materials) {
    const wh = /** @type {Warehouse} */ (WAREHOUSES.find((w) => w.kind === m.kind));
    for (const weeksAgo of [20, 5]) {
      const countDate = addDays(today, -weeksAgo * 7 + rng.int(0, 4));
      const snap = stock
        .filter((s) => s.materialCode === m.materialCode && s.date <= countDate)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const systemQty = snap?.onHandQty ?? 0;
      const latest = weeksAgo === 5;
      const gap = latest
        ? flagged.has(m.materialCode)
          ? (rng.chance(0.5) ? -1 : 1) * rng.range(0.025, 0.09)
          : rng.range(-0.015, 0.015)
        : rng.range(-0.03, 0.03);
      out.push({
        materialCode: m.materialCode,
        warehouseId: wh.warehouseId,
        countDate,
        systemQty,
        countedQty: Math.round(systemQty * (1 + gap))
      });
    }
  }
  return out;
}

// ── Plan versions ───────────────────────────────────────────────────────────

/**
 * @param {readonly MaterialSource[]} sources
 * @param {ReadonlyMap<string, ReadonlyMap<IsoDate, number>>} requirement
 * @param {ReadonlyMap<string, number>} baseline
 * @param {IsoDate} thisMonday
 * @param {GeneratorSizes} sizes
 * @param {Rng} rng
 * @returns {PlanVersion[]}
 */
function buildPlanVersions(sources, requirement, baseline, thisMonday, sizes, rng) {
  /** @type {PlanVersion[]} */
  const out = [];
  for (const src of sources) {
    const vol = rng.range(0.05, 0.3);
    const bias = rng.range(-0.05, 0.1);
    const lastError = /** @type {Map<IsoDate, number>} */ (new Map());
    for (let v = 0; v < sizes.planVersions; v += 1) {
      const publishedOn = addDays(thisMonday, -(sizes.planVersions - 1 - v) * 7);
      const publishedAt = instantOn(publishedOn, 2);
      for (let h = 1; h <= sizes.planHorizonWeeks; h += 1) {
        const period = addDays(publishedOn, h * 7);
        const truth =
          (requirement.get(src.materialCode)?.get(period) ??
            (baseline.get(src.materialCode) ?? 0) * seasonality(period)) * src.share;
        const prev = lastError.get(period);
        const e =
          prev === undefined ? bias + vol * rng.normal() : 0.5 * prev + vol * 0.8 * rng.normal();
        lastError.set(period, e);
        out.push({
          supplierId: src.supplierId,
          materialCode: src.materialCode,
          periodBucket: period,
          versionNo: v + 1,
          publishedAt,
          quantity: Math.max(0, Math.round(truth * (1 + e)))
        });
      }
    }
  }
  return out;
}

// ── PO lines and what happened to them ──────────────────────────────────────

/**
 * @typedef {object} LineOutcome
 * @property {PoLine} line
 * @property {ScheduleChange[]} changes
 * @property {Confirmation[]} confirmations
 * @property {Omit<Receipt, 'grNumber'>[]} receipts
 */

/**
 * @param {PoLine} line
 * @param {number} leadTimeDays
 * @param {number} multiple
 * @param {SupplierProfile} profile
 * @param {IsoInstant} now
 * @param {Rng} rng
 * @returns {LineOutcome}
 */
function simulateLine(line, leadTimeDays, multiple, profile, now, rng) {
  const today = dayOf(now);
  /** @type {ScheduleChange[]} */
  const changes = [];
  /** @type {Confirmation[]} */
  const confirmations = [];
  let qty = line.orderedQty;
  let date = line.requestedDate;

  // PTI's changes, in time order: an outside-lead-time adjustment (small, or
  // occasionally beyond the tolerance band), then an inside-lead-time change.
  /** @typedef {{ at: IsoInstant; kind: 'outsideSmall' | 'outsideBreach' | 'inside' }} Planned */
  /** @type {Planned[]} */
  const planned = [];
  const outsideLatest = addDays(line.requestedDate, -leadTimeDays - 1);
  const outsideEarliest = addDays(dayOf(line.createdAt), 1);
  if (outsideEarliest <= outsideLatest) {
    const span = daysBetween(outsideEarliest, outsideLatest);
    if (rng.chance(0.1))
      planned.push({
        at: instantOn(addDays(outsideEarliest, rng.int(0, span)), rng.range(1, 9)),
        kind: 'outsideSmall'
      });
    else if (rng.chance(0.03))
      planned.push({
        at: instantOn(addDays(outsideEarliest, rng.int(0, span)), rng.range(1, 9)),
        kind: 'outsideBreach'
      });
  }
  if (rng.chance(profile.ptiChange) && leadTimeDays > 1) {
    const at = instantOn(
      addDays(line.requestedDate, -rng.int(1, leadTimeDays - 1)),
      rng.range(1, 9)
    );
    if (at > line.confirmDeadline) planned.push({ at, kind: 'inside' });
  }

  // The supplier's first answer.
  const r = rng.next();
  const firstAt =
    r < profile.confirmOnTime
      ? addHours(
          line.createdAt,
          rng.range(
            1,
            Math.max(
              1.5,
              (Date.parse(line.confirmDeadline) - Date.parse(line.createdAt)) / 3_600_000 - 0.5
            )
          )
        )
      : r < profile.confirmOnTime + profile.confirmLate
        ? addHours(line.confirmDeadline, rng.range(4, 96))
        : null;
  const partial = rng.chance(profile.partial);
  const later = rng.chance(profile.laterDate);
  /** @param {IsoInstant} at */
  const confirmNow = (at) => {
    if (at > now) return;
    confirmations.push({
      poNumber: line.poNumber,
      line: line.line,
      confirmedQty: partial ? roundDownTo(qty * rng.range(0.55, 0.85), multiple) : qty,
      confirmedDate: later ? addDays(date, rng.int(2, 6)) : date,
      confirmedAt: at
    });
  };

  let answered = false;
  let unreconfirmed = false; // a PTI change inside lead time / beyond tolerance the supplier has not re-confirmed
  for (const ev of planned.sort((a, b) => a.at.localeCompare(b.at))) {
    if (!answered && firstAt !== null && firstAt < ev.at) {
      confirmNow(firstAt);
      answered = true;
    }
    if (ev.at > now) continue;
    if (ev.kind === 'inside' && rng.chance(0.35)) {
      const from = date;
      const to = rng.chance(0.7) ? addDays(date, -rng.int(2, 6)) : addDays(date, rng.int(2, 6));
      changes.push({
        poNumber: line.poNumber,
        line: line.line,
        at: ev.at,
        field: 'date',
        from,
        to,
        by: 'PTI',
        reason: 'plan'
      });
      date = to;
    } else {
      const up = ev.kind === 'outsideBreach' || rng.chance(ev.kind === 'inside' ? 0.7 : 0.5);
      const size =
        ev.kind === 'outsideSmall'
          ? rng.range(0.02, 0.08)
          : ev.kind === 'outsideBreach'
            ? rng.range(0.25, 0.35)
            : rng.range(0.1, 0.4);
      const to = roundUpTo(qty * (up ? 1 + size : 1 - size), multiple);
      if (to !== qty) {
        changes.push({
          poNumber: line.poNumber,
          line: line.line,
          at: ev.at,
          field: 'quantity',
          from: qty,
          to,
          by: 'PTI',
          reason: 'demand'
        });
        qty = to;
      }
    }
    if (answered) {
      const small = ev.kind === 'outsideSmall';
      if (
        small ||
        rng.chance(ev.kind === 'outsideBreach' ? profile.reconfirm * 0.5 : profile.reconfirm)
      ) {
        confirmNow(addHours(ev.at, rng.range(3, 36)));
        unreconfirmed = false;
      } else if (confirmations.length > 0 && confirmations[0].confirmedAt <= line.confirmDeadline) {
        unreconfirmed = true;
      }
    }
  }
  if (!answered && firstAt !== null) confirmNow(firstAt);

  // The delivery, decided along the same three branches E14-02 BR-03 measures.
  const onTimeFirst =
    confirmations.length > 0 && confirmations[0].confirmedAt <= line.confirmDeadline;
  const latest = confirmations[confirmations.length - 1];
  /** @type {{ qty: number; date: IsoDate }} */
  let target;
  /** @type {boolean} */
  let miss;
  if (!onTimeFirst) {
    target = { qty, date };
    miss = rng.chance(0.97);
  } else if (unreconfirmed) {
    // The supplier delivers what it committed; whether that misses what PTI
    // now needs depends on the change (an increase or pull-in does).
    target = { qty: latest.confirmedQty, date: latest.confirmedDate };
    miss = false;
  } else {
    target = { qty: latest.confirmedQty, date: latest.confirmedDate };
    miss = rng.chance(profile.supplierMiss);
  }
  /** @type {Omit<Receipt, 'grNumber'>[]} */
  const receipts = [];
  /**
   * @param {number} q
   * @param {IsoDate} d
   */
  const receive = (q, d) => {
    if (q > 0 && d <= today)
      receipts.push({ poNumber: line.poNumber, line: line.line, receivedQty: q, receivedDate: d });
  };
  if (!miss) {
    const d = addDays(target.date, -rng.int(0, 3));
    if (rng.chance(0.2) && target.qty >= 2 * multiple) {
      const first = roundDownTo(target.qty / 2, multiple);
      receive(first, addDays(d, -rng.int(0, 2)));
      receive(target.qty - first, d);
    } else receive(target.qty, d);
  } else if (!onTimeFirst || rng.chance(0.9)) {
    receive(target.qty, addDays(target.date, rng.int(2, 14)));
  } else {
    const onTime = roundDownTo(target.qty * rng.range(0.4, 0.9), multiple);
    receive(onTime, addDays(target.date, -rng.int(0, 2)));
    if (rng.chance(0.5)) receive(target.qty - onTime, addDays(target.date, rng.int(3, 10)));
  }
  return { line, changes, confirmations, receipts };
}

/**
 * @param {GeneratorInput} input
 * @param {ReadonlyMap<string, GeneratorMaterial>} materials
 * @param {readonly MaterialSource[]} sources
 * @param {ReadonlyMap<string, ReadonlyMap<IsoDate, number>>} requirement
 * @param {ReadonlyMap<string, number>} baseline
 * @param {IsoDate} thisMonday
 * @param {GeneratorSizes} sizes
 * @param {Rng} rng
 * @returns {Pick<EngineDataset, 'poLines' | 'scheduleChanges' | 'confirmations' | 'receipts'>}
 */
function buildPurchasing(input, materials, sources, requirement, baseline, thisMonday, sizes, rng) {
  /** @type {PoLine[]} */
  const poLines = [];
  /** @type {ScheduleChange[]} */
  const scheduleChanges = [];
  /** @type {Confirmation[]} */
  const confirmations = [];
  /** @type {Receipt[]} */
  const receipts = [];
  let poSeq = 0;
  let grSeq = 0;
  const suppliers = [...new Set(sources.map((s) => s.supplierId))].sort();
  for (let w = -(sizes.poWeeks - 1); w <= sizes.openWeeks; w += 1) {
    const weekStart = addDays(thisMonday, w * 7);
    for (const supplierId of suppliers) {
      // Packaging is ordered weekly, raw material every other week (the
      // publication cadence, REQ-E06-01 BR-02).
      const mine = sources.filter((s) => {
        const m = /** @type {GeneratorMaterial} */ (materials.get(s.materialCode));
        return (
          s.supplierId === supplierId && (kindOf(m.materialType) === 'packaging' || w % 2 === 0)
        );
      });
      if (mine.length === 0) continue;
      const requestedDate = addDays(weekStart, rng.int(0, 4));
      const maxLt = Math.max(...mine.map((s) => s.leadTimeDays));
      let created = addDays(requestedDate, -(maxLt + rng.int(3, 10)));
      while (isWeekend(created)) created = addDays(created, -1);
      const createdAt = instantOn(created, 2);
      if (createdAt > input.now) continue;
      poSeq += 1;
      const poNumber = `SYN-PO-${String(poSeq).padStart(5, '0')}`;
      const confirmDeadline = input.confirmDeadline(createdAt);
      const profile = input.profiles[supplierId] ?? input.defaultProfile;
      mine.forEach((src, i) => {
        const m = /** @type {GeneratorMaterial} */ (materials.get(src.materialCode));
        const cadence = kindOf(m.materialType) === 'packaging' ? 1 : 2;
        const weekly =
          requirement.get(src.materialCode)?.get(weekStart) ?? baseline.get(src.materialCode) ?? 0;
        const orderedQty = roundUpTo(
          Math.max(src.moq, weekly * src.share * cadence * rng.range(0.9, 1.1)),
          src.orderMultiple
        );
        /** @type {PoLine} */
        const line = {
          poNumber,
          line: (i + 1) * 10,
          supplierId,
          materialCode: src.materialCode,
          orderedQty,
          uom: m.canonicalUom,
          requestedDate,
          createdAt,
          confirmDeadline
        };
        const out = simulateLine(
          line,
          src.leadTimeDays,
          src.orderMultiple,
          profile,
          input.now,
          rng
        );
        poLines.push(out.line);
        scheduleChanges.push(...out.changes);
        confirmations.push(...out.confirmations);
        for (const r of out.receipts) {
          grSeq += 1;
          receipts.push({ grNumber: `SYN-GR-${String(grSeq).padStart(5, '0')}`, ...r });
        }
      });
    }
  }
  return { poLines, scheduleChanges, confirmations, receipts };
}

// ── SAP's finished-goods plan, open sales orders, SAP safety stock ──────────

/** How many weeks before an origin the plan's level is read from. */
const PLAN_LEVEL_WEEKS = 8;

/**
 * @param {readonly FinishedGood[]} fgs
 * @param {readonly SalesWeek[]} sales
 * @param {IsoDate} thisMonday
 * @param {GeneratorSizes} sizes
 * @param {Rng} rng
 * @returns {FgPlanSnapshot[]}
 */
function buildFgPlan(fgs, sales, thisMonday, sizes, rng) {
  const bySku = /** @type {Map<string, Map<IsoDate, SalesWeek>>} */ (new Map());
  for (const s of sales) {
    const m = bySku.get(s.skuCode) ?? /** @type {Map<IsoDate, SalesWeek>} */ (new Map());
    m.set(s.weekStart, s);
    bySku.set(s.skuCode, m);
  }
  /** @type {FgPlanSnapshot[]} */
  const out = [];
  for (const fg of fgs) {
    const history = bySku.get(fg.skuCode) ?? /** @type {Map<IsoDate, SalesWeek>} */ (new Map());
    // SAP's plan for this SKU leans one way — some over-plan, some under.
    const bias = rng.range(-0.12, 0.15);
    for (let k = sizes.fgPlanOrigins; k >= 0; k -= 1) {
      const madeAt = addDays(thisMonday, -k * 7);
      // The level SAP planned from: the deseasonalised mean of the in-stock
      // weeks before the origin.
      /** @type {number[]} */
      const seen = [];
      for (let j = 1; j <= PLAN_LEVEL_WEEKS; j += 1) {
        const w = addDays(madeAt, -j * 7);
        const s = history.get(w);
        if (s && !s.stockout) seen.push(s.quantity / seasonality(w));
      }
      const level = seen.length >= 4 ? seen.reduce((a, b) => a + b, 0) / seen.length : null;
      for (let h = 0; h < sizes.fgPlanHorizonWeeks; h += 1) {
        const w = addDays(madeAt, h * 7);
        const noise = 1 + (0.08 + 0.01 * h) * rng.normal();
        if (w < fg.launchDate || (fg.discontinueDate && w >= fg.discontinueDate)) continue;
        // A SKU without enough history is planned from marketing's launch
        // figure — stood in for by what it went on to sell, with the same bias.
        const basis = level !== null ? level * seasonality(w) : (history.get(w)?.quantity ?? null);
        if (basis === null) continue;
        out.push({
          skuCode: fg.skuCode,
          madeAt,
          weekStart: w,
          quantity: Math.max(0, Math.round(basis * (1 + bias) * noise))
        });
      }
    }
  }
  return out;
}

/**
 * @param {readonly FgPlanSnapshot[]} plan
 * @param {IsoDate} thisMonday
 * @param {Rng} rng
 * @returns {SalesOrderWeek[]}
 */
function buildSalesOrders(plan, thisMonday, rng) {
  /** @type {SalesOrderWeek[]} */
  const out = [];
  const current = plan.filter(
    (p) => p.madeAt === thisMonday && p.weekStart <= addDays(thisMonday, 7)
  );
  for (const p of current) {
    // This week mostly booked (sometimes above plan); next week partly.
    const share = p.weekStart === thisMonday ? rng.range(0.7, 1.15) : rng.range(0.2, 0.6);
    const quantity = Math.round(p.quantity * share);
    if (quantity > 0) out.push({ skuCode: p.skuCode, weekStart: p.weekStart, quantity });
  }
  return out;
}

/**
 * @param {readonly EngineMaterial[]} materials
 * @param {ReadonlyMap<string, number>} baseline
 * @param {Rng} rng
 * @returns {SapSafetyStock[]}
 */
function buildSapSafetyStock(materials, baseline, rng) {
  return materials.map((m) => ({
    materialCode: m.materialCode,
    // SAP's static cover: two to four weeks of recent requirement.
    quantity: Math.round((baseline.get(m.materialCode) ?? 0) * rng.range(2, 4))
  }));
}

/**
 * Rupiah per base unit, by BOM slot (E14-05: holding cost = a share of value
 * per year). Invented bands of the right order for Indonesian cosmetics
 * packaging and ingredients: a closure a few hundred rupiah, a bottle a few
 * thousand; a kilogram of base oil tens of thousands, of an active hundreds of
 * thousands. Rounded to Rp 50 (PCS) or Rp 1,000 (KG).
 * @type {Readonly<Record<Slot, readonly [number, number]>>}
 */
const VALUE_BANDS = Object.freeze({
  container: [1_200, 4_000],
  closure: [300, 1_200],
  carton: [600, 2_500],
  base: [18_000, 45_000],
  feedstock: [25_000, 70_000],
  active: [350_000, 1_200_000],
  fragrance: [300_000, 900_000]
});

/**
 * @param {readonly GeneratorMaterial[]} materials
 * @param {Rng} rng
 * @returns {MaterialValue[]}
 */
function buildMaterialValues(materials, rng) {
  return materials.map((m) => {
    const [lo, hi] = VALUE_BANDS[slotOf(m)];
    const step = m.canonicalUom === 'PCS' ? 50 : 1_000;
    return {
      materialCode: m.materialCode,
      unitValueIdr: Math.round(rng.range(lo, hi) / step) * step
    };
  });
}

// ── The dataset ─────────────────────────────────────────────────────────────

/**
 * @param {GeneratorInput} input
 * @returns {EngineDataset}
 */
export function generateEngineDataset(input) {
  /** @type {GeneratorSizes} */
  const sizes = { ...DEFAULT_SIZES, ...input.sizes };
  const rng = createRng(input.seed);
  const today = dayOf(input.now);
  const thisMonday = mondayOf(today);
  const salesWeeks = Array.from({ length: sizes.salesWeeks }, (_, i) =>
    addDays(thisMonday, -(sizes.salesWeeks - i) * 7)
  );

  /** @type {EngineMaterial[]} */
  const materials = [...input.materials]
    .sort((a, b) => a.materialCode.localeCompare(b.materialCode))
    .map((m) => ({
      materialCode: m.materialCode,
      kind: kindOf(m.materialType),
      uom: m.canonicalUom,
      materialGroup: m.materialGroup
    }));
  const byCode = new Map(input.materials.map((m) => [m.materialCode, m]));
  const sortedInput = materials.map(
    (m) => /** @type {GeneratorMaterial} */ (byCode.get(m.materialCode))
  );

  const finishedGoods = buildFinishedGoods(sizes.finishedGoods, rng, today, salesWeeks[0]);
  const bom = buildBom(finishedGoods, sortedInput, rng, addDays(thisMonday, -20 * 7));
  const sales = buildSales(finishedGoods, salesWeeks, rng);
  const requirement = grossRequirement(sales, bom);
  const recent = salesWeeks.slice(-13);
  const baseline = new Map(
    materials.map((m) => {
      const series = requirement.get(m.materialCode);
      const mean = recent.reduce((s, w) => s + (series?.get(w) ?? 0), 0) / recent.length;
      return /** @type {const} */ ([m.materialCode, mean]);
    })
  );

  const sources = buildSources({ ...input, materials: sortedInput }, rng, baseline);
  const volumeMap = new Map(
    sortedInput.map((m) => [m.materialCode, unitsPerPalletFor(slotOf(m), m.canonicalUom, rng)])
  );
  /** @type {MaterialVolume[]} */
  const volumes = [...volumeMap.entries()].map(([materialCode, unitsPerPallet]) => ({
    materialCode,
    unitsPerPallet
  }));
  const stockDates = Array.from({ length: sizes.stockWeeks }, (_, i) =>
    addDays(thisMonday, -(sizes.stockWeeks - 1 - i) * 7)
  );
  const stock = buildStock(materials, volumeMap, baseline, stockDates, rng);
  const cycleCounts = buildCycleCounts(materials, stock, today, rng);
  const planVersions = buildPlanVersions(sources, requirement, baseline, thisMonday, sizes, rng);
  const purchasing = buildPurchasing(
    input,
    byCode,
    sources,
    requirement,
    baseline,
    thisMonday,
    sizes,
    rng
  );

  // The plan stream — after everything above, on its own seed (see header).
  const planRng = createRng((input.seed ^ PLAN_STREAM) >>> 0);
  const fgPlan = buildFgPlan(finishedGoods, sales, thisMonday, sizes, planRng);
  const salesOrders = buildSalesOrders(fgPlan, thisMonday, planRng);
  const sapSafetyStock = buildSapSafetyStock(materials, baseline, planRng);
  // The value stream (E14-05) — last, on its own seed: no earlier row moves.
  const materialValues = buildMaterialValues(
    sortedInput,
    createRng((input.seed ^ VALUE_STREAM) >>> 0)
  );

  return {
    provenance: { liveness: 'SIMULATED', generator: 'synthetic', seed: input.seed, present: today },
    materials,
    finishedGoods,
    sales,
    bom,
    sources,
    warehouses: WAREHOUSES,
    volumes,
    stock,
    cycleCounts,
    ...purchasing,
    planVersions,
    fgPlan,
    salesOrders,
    sapSafetyStock,
    materialValues
  };
}
