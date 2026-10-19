// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL REQUIREMENT — REQ-E14-03 (METHOD-SPEC M1, M2; M7 for release timing).
//
// Pure functions over the engine input contract (`./types`). The present
// ("as of") and every parameter are ARGUMENTS (X-01); nothing here reads a
// clock or a store.
//
// ── THE CHAIN, ONE WEEKLY BUCKET AT A TIME ──────────────────────────────────
//   1. FORECAST CONSUMPTION (M1, BR-01). Per SKU and week:
//        demand_t = orders_t + max(0, F_t − consumed_t)
//      An order consumes forecast in its own week first, then up to B weeks
//      back, then up to F weeks forward (the window; BR-01 sets it per SKU
//      group — until the planner does, same week only, B = F = 0).
//   2. LOW-LEVEL CODES (M2 step 1). Each item's deepest position in any bill
//      of materials, by a topological sort of the BOM graph. A cycle is REFUSED
//      by name (`BOM_CYCLE`), never planned around. Items are exploded in
//      low-level-code order, so an item's full requirement is known before it
//      is passed on (BR-02).
//   3. GROSS REQUIREMENT (M2 step 2, BR-03). For a component c of parent p in
//      week t, using the BOM line valid in t:
//        GR_c,t = Σ_p release_p,t × qtyPer_p,c × (1 + scrap_p,c) ÷ yield_p,c
//      A finished good's release is its demand (the finished-goods plan is the
//      production plan); an intermediate (bulk) passes its gross on lot-for-lot
//      in the same week. Every gross figure keeps its PEGS — the finished good,
//      its week and quantity behind each part — so it can be traced (AC-03).
//      Yield (BL-115) divides beside scrap, on the BOM line: a component
//      that loses 5% in the parent's production is needed ÷ 0.95. BR-03's
//      text puts "÷ yield" on the ORDER quantity (METHOD-SPEC M2 step 5);
//      it is applied here instead because yield is a property of each BOM
//      line, and a material used by several parents can have several yields —
//      one order-level divisor could not honour them (ENG-B50). A yield of 1
//      leaves every figure exactly as before.
//   4. NETTING (M2 steps 3–4, BR-04). Per purchased material:
//        NR_t  = max(0, GR_t + SS − (POH_{t−1} + SR_t))
//        POH_t = POH_{t−1} + SR_t + PR_t − GR_t
//      POH_{−1} is the LATEST stock snapshot; a material whose latest cycle
//      count failed the E14-01 BR-03 tolerance (2%, ENG-D2) is still netted
//      but marked for review — never released automatically (flag, not block).
//      SR_t are open PO lines at the SUPPLIER-CONFIRMED date and quantity
//      (latest confirmation, less what was already received). An unconfirmed
//      line counts ONLY when the planner includes it, at PTI's requested date
//      and quantity, and is then marked (AC-02). SS is E14-04's safety stock.
//   5. PLANNED ORDER (M2 step 5, BR-06). Sized by E14-05 (`orderSizing.js`):
//      the caller passes the planned receipts E14-05 chose (`plannedReceipts`)
//      and the netting re-runs on them, so every figure reconciles by the same
//      formula. Without them the INTERIM sizing applies — the net requirement
//      rounded UP to the order multiple, and at least the MOQ — which is also
//      E14-05's last-resort fallback. Every result says which (`sizing`).
//   6. RELEASE (M2 step 6, BR-05). Release week = need week − ⌈(lead time +
//      safety lead time) ÷ 7⌉ weeks. A release week already past is "late to
//      release", shown with its shortfall week — never silently moved.
//
// Worked example (REQ-E14-03): gross 20,000 × 1 × 1.02 = 20,400; net 20,400 +
// 3,000 − (5,000 + 6,000) = 12,400; MOQ 10,000, multiple 5,000 → 15,000;
// released week 10 − 4 = week 6; projected end 5,000 + 6,000 + 15,000 −
// 20,400 = 5,600. `requirement.test.js` runs it verbatim.
// ─────────────────────────────────────────────────────────────────────────────

import { componentFactor } from './bom';
import { addDays, mondayOf } from './dates';
/** @import { LeadTimeBreakdown } from './leadTimeSteps' */
import { leadTimeBreakdown } from './leadTimeSteps';
/** @import { LineHistory } from './lines' */
import { latestConfirmation, lineHistories, receivedBy, requirementAt } from './lines';
import { DEFAULT_STOCK_ACCURACY_TOLERANCE, stockAccuracy } from './stock';
/** @import { BomLine, EngineDataset, EngineMaterial, IsoDate, MaterialSource, SalesOrderWeek, WarehouseKind } from './types' */
/** @import { Uom } from '../sdc/types' */

// ── 1 · Forecast consumption (M1) ───────────────────────────────────────────

/**
 * @typedef {object} ConsumptionWindow
 * @property {number} backwardWeeks -  Weeks before the order's week whose forecast it may consume.
 * @property {number} forwardWeeks -  Weeks after the order's week whose forecast it may consume.
 */

/**
 * Until the planner sets a window per SKU group (BR-01): the order's own week only.
 * @type {ConsumptionWindow}
 */
export const DEFAULT_CONSUMPTION_WINDOW = Object.freeze({ backwardWeeks: 0, forwardWeeks: 0 });

/** A quantity of one SKU in one week. */
/**
 * @typedef {object} SkuWeek
 * @property {string} skuCode
 * @property {IsoDate} weekStart
 * @property {number} quantity
 */

/**
 * @typedef {object} ConsumedWeek
 * @property {string} skuCode
 * @property {IsoDate} weekStart
 * @property {number} forecast
 * @property {number} orders
 * @property {number} consumed -  Forecast in THIS week consumed by orders (from this or a nearby week).
 * @property {number} demand -  orders + (forecast − consumed).
 */

/**
 * M1 — sales orders replace the forecast they fall inside, so the two are not
 * counted twice. Orders are applied oldest week first.
 * @param {readonly SkuWeek[]} forecast
 * @param {readonly SalesOrderWeek[]} orders
 * @param {ConsumptionWindow} [window]
 * @returns {ConsumedWeek[]}
 */
export function consumeForecast(forecast, orders, window = DEFAULT_CONSUMPTION_WINDOW) {
  /**
   * @param {string} sku
   * @param {IsoDate} w
   */
  const key = (sku, w) => `${sku}|${w}`;
  const f = /** @type {Map<string, number>} */ (new Map());
  const o = /** @type {Map<string, number>} */ (new Map());
  for (const r of forecast)
    f.set(key(r.skuCode, r.weekStart), (f.get(key(r.skuCode, r.weekStart)) ?? 0) + r.quantity);
  for (const r of orders)
    o.set(key(r.skuCode, r.weekStart), (o.get(key(r.skuCode, r.weekStart)) ?? 0) + r.quantity);
  const remaining = new Map(f);
  const consumed = /** @type {Map<string, number>} */ (new Map());
  const orderRows = [...orders].sort(
    (a, b) => a.weekStart.localeCompare(b.weekStart) || a.skuCode.localeCompare(b.skuCode)
  );
  for (const r of orderRows) {
    let need = r.quantity;
    const candidates = [r.weekStart];
    for (let i = 1; i <= window.backwardWeeks; i += 1)
      candidates.push(addDays(r.weekStart, -7 * i));
    for (let i = 1; i <= window.forwardWeeks; i += 1) candidates.push(addDays(r.weekStart, 7 * i));
    for (const w of candidates) {
      if (need <= 0) break;
      const k = key(r.skuCode, w);
      const take = Math.min(need, remaining.get(k) ?? 0);
      if (take <= 0) continue;
      remaining.set(k, (remaining.get(k) ?? 0) - take);
      consumed.set(k, (consumed.get(k) ?? 0) + take);
      need -= take;
    }
  }
  const keys = [...new Set([...f.keys(), ...o.keys()])].sort();
  return keys.map((k) => {
    const [skuCode, weekStart] = k.split('|');
    const fq = f.get(k) ?? 0;
    const oq = o.get(k) ?? 0;
    const cq = consumed.get(k) ?? 0;
    return {
      skuCode,
      weekStart,
      forecast: fq,
      orders: oq,
      consumed: cq,
      demand: oq + Math.max(0, fq - cq)
    };
  });
}

// ── 2 · Low-level codes (M2 step 1) ─────────────────────────────────────────

/**
 * Each item's low-level code: 0 for an item no BOM line consumes, otherwise one
 * more than its deepest parent. Every validity version counts (an item's
 * deepest position in ANY bill). A cycle throws `BOM_CYCLE`, naming the path.
 * @param {readonly BomLine[]} bom
 * @returns {Map<string, number>}
 */
export function lowLevelCodes(bom) {
  const children = /** @type {Map<string, Set<string>>} */ (new Map());
  const items = /** @type {Set<string>} */ (new Set());
  for (const b of bom) {
    items.add(b.parentCode);
    items.add(b.componentCode);
    const set = children.get(b.parentCode) ?? /** @type {Set<string>} */ (new Set());
    set.add(b.componentCode);
    children.set(b.parentCode, set);
  }
  // Depth-first, with the path on the stack so a cycle can be named.
  const state = /** @type {Map<string, 'open' | 'done'>} */ (new Map());
  /** @type {string[]} */
  const order = [];
  /**
   * @param {string} item
   * @param {string[]} path
   */
  const visit = (item, path) => {
    const s = state.get(item);
    if (s === 'done') return;
    if (s === 'open') {
      const from = path.indexOf(item);
      throw new Error(
        `BOM_CYCLE: ${[...path.slice(from), item].join(' → ')} — the bill of materials cannot be exploded`
      );
    }
    state.set(item, 'open');
    for (const c of [...(children.get(item) ?? [])].sort()) visit(c, [...path, item]);
    state.set(item, 'done');
    order.push(item);
  };
  for (const item of [...items].sort()) visit(item, []);
  // `order` is post-order: children before parents. Reversed, parents first.
  const llc = /** @type {Map<string, number>} */ (new Map([...items].map((i) => [i, 0])));
  for (const parent of order.reverse()) {
    for (const c of children.get(parent) ?? [])
      llc.set(
        c,
        Math.max(
          /** @type {NonNullable<ReturnType<typeof llc.get>>} */ (llc.get(c)),
          /** @type {NonNullable<ReturnType<typeof llc.get>>} */ (llc.get(parent)) + 1
        )
      );
  }
  return llc;
}

// ── 3 · Gross requirement with pegging (M2 step 2) ──────────────────────────

/** One finished-good part of a gross requirement (AC-03). */
/**
 * @typedef {object} Peg
 * @property {string} skuCode
 * @property {IsoDate} fgWeek -  The finished-good week the requirement comes from.
 * @property {number} fgQuantity -  The finished-good quantity in that week.
 * @property {number} quantity -  This part of the item's gross requirement, in the item's unit.
 * @property {number} [scrapPct] The scrap and yield of the BOM line this part came through into the item
 *   (the last step of the explosion), as fractions — shown beside the part so
 *   the planner sees what raised it (BR-03, BL-115). Absent only on a finished
 *   good's own demand, which no BOM line produced.
 * @property {number} [yieldPct]
 */

/**
 * @typedef {object} GrossCell
 * @property {number} quantity
 * @property {readonly Peg[]} pegs
 */

/** item → week → gross requirement with its pegs. */
/** @typedef {Map<string, Map<IsoDate, GrossCell>>} PeggedRequirement */

/**
 * @param {BomLine} b
 * @param {IsoDate} w
 */
const validIn = (b, w) => w >= b.validFrom && (b.validTo === undefined || w < b.validTo);

/**
 * Explode finished-goods demand through the BOM in low-level-code order. A
 * finished good releases its demand; an item that is neither a finished good
 * nor `isPurchased` (a bulk) passes its gross on lot-for-lot in the same week.
 * Purchased items are the leaves the netting step plans; one that is itself a
 * BOM parent is REFUSED by name (`BOM_PURCHASED_PARENT`) rather than exploded
 * from a gross figure it has not netted.
 * @param {readonly SkuWeek[]} demand
 * @param {readonly BomLine[]} bom
 * @param {(code: string) => boolean} isPurchased
 * @returns {PeggedRequirement}
 */
export function explode(demand, bom, isPurchased) {
  const llc = lowLevelCodes(bom);
  const byParent = /** @type {Map<string, BomLine[]>} */ (new Map());
  for (const b of bom) byParent.set(b.parentCode, [...(byParent.get(b.parentCode) ?? []), b]);
  for (const parent of byParent.keys()) {
    if (isPurchased(parent))
      throw new Error(`BOM_PURCHASED_PARENT: '${parent}' is purchased and also a BOM parent`);
  }
  // Releases per item and week, with pegs. Finished goods: their demand.
  /** @type {PeggedRequirement} */
  const gross = new Map();
  /**
   * @param {string} item
   * @param {IsoDate} w
   * @param {number} qty
   * @param {readonly Peg[]} pegs
   */
  const add = (item, w, qty, pegs) => {
    const series = gross.get(item) ?? /** @type {Map<IsoDate, GrossCell>} */ (new Map());
    const cell = series.get(w);
    series.set(w, {
      quantity: (cell?.quantity ?? 0) + qty,
      pegs: [...(cell?.pegs ?? []), ...pegs]
    });
    gross.set(item, series);
  };
  for (const d of demand) {
    if (d.quantity <= 0) continue;
    add(d.skuCode, d.weekStart, d.quantity, [
      { skuCode: d.skuCode, fgWeek: d.weekStart, fgQuantity: d.quantity, quantity: d.quantity }
    ]);
  }
  const itemsInOrder = [...new Set([...llc.keys(), ...demand.map((d) => d.skuCode)])].sort(
    (a, b) => (llc.get(a) ?? 0) - (llc.get(b) ?? 0) || a.localeCompare(b)
  );
  for (const item of itemsInOrder) {
    const lines = byParent.get(item);
    const series = gross.get(item);
    if (!lines || !series) continue;
    for (const [w, cell] of [...series.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      for (const b of lines) {
        if (!validIn(b, w)) continue;
        const factor = componentFactor(b);
        add(
          b.componentCode,
          w,
          cell.quantity * factor,
          cell.pegs.map((p) => ({
            ...p,
            quantity: p.quantity * factor,
            scrapPct: b.scrapPct,
            yieldPct: b.yieldPct
          }))
        );
      }
    }
  }
  // Only what a BOM line produced is a gross requirement; the finished goods'
  // own demand rows were the seed, not a requirement.
  for (const d of demand)
    if (!llc.has(d.skuCode) || (llc.get(d.skuCode) ?? 0) === 0) gross.delete(d.skuCode);
  return gross;
}

// ── 4 · Open receipts (BR-04, AC-02) ────────────────────────────────────────

/**
 * @typedef {object} OpenReceipt
 * @property {string} poNumber
 * @property {number} line
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {number} quantity -  Still to arrive: the confirmed (or, if included, requested) quantity less what was received.
 * @property {IsoDate} date -  The supplier-confirmed date; PTI's requested date for an included unconfirmed line.
 * @property {IsoDate} weekStart -  The week it is netted in (an overdue line lands in the current week).
 * @property {boolean} confirmed
 * @property {boolean} overdue -  Its date has passed and it is still open.
 */

/**
 * @typedef {object} ReceiptOptions
 * @property {boolean} includeUnconfirmed -  Count unconfirmed lines at PTI's requested date and quantity (AC-02). Default: no.
 * @property {number} overdueGraceDays -  An open line whose date passed more than this many days ago is treated as closed.
 */

/** @type {ReceiptOptions} */
export const DEFAULT_RECEIPT_OPTIONS = Object.freeze({
  includeUnconfirmed: false,
  overdueGraceDays: 14
});

/**
 * Open PO lines as receipts, at the supplier-confirmed date and quantity.
 * @param {readonly LineHistory[]} histories
 * @param {IsoDate} asOf
 * @param {ReceiptOptions} [options]
 * @returns {OpenReceipt[]}
 */
export function openReceipts(histories, asOf, options = DEFAULT_RECEIPT_OPTIONS) {
  const currentWeek = mondayOf(asOf);
  const oldest = addDays(asOf, -options.overdueGraceDays);
  /** @type {OpenReceipt[]} */
  const out = [];
  for (const h of histories) {
    const asked = requirementAt(h);
    if (asked.qty === 0) continue; // cancelled
    const c = latestConfirmation(h);
    if (!c && !options.includeUnconfirmed) continue;
    const basis = c ? { qty: c.confirmedQty, date: c.confirmedDate } : asked;
    const open = basis.qty - receivedBy(h, asOf);
    if (open <= 0 || basis.date < oldest) continue;
    const week = mondayOf(basis.date);
    out.push({
      poNumber: h.line.poNumber,
      line: h.line.line,
      supplierId: h.line.supplierId,
      materialCode: h.line.materialCode,
      quantity: open,
      date: basis.date,
      weekStart: week < currentWeek ? currentWeek : week,
      confirmed: c !== null,
      overdue: basis.date < asOf
    });
  }
  return out.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.poNumber.localeCompare(b.poNumber) || a.line - b.line
  );
}

// ── 5 · Interim order sizing (BR-06 — E14-05 replaces it) ───────────────────

/**
 * ⚠️ INTERIM: the net requirement rounded UP to the order multiple, and at
 * least the MOQ. No warehouse-space or cost trade-off — that is E14-05.
 * @param {number} net
 * @param {number} moq
 * @param {number} orderMultiple
 * @returns {number}
 */
export function interimOrderSize(net, moq, orderMultiple) {
  if (net <= 0) return 0;
  const step = orderMultiple > 0 ? orderMultiple : 1;
  // Guard float noise (12,400.0000001 must not become the next multiple).
  const rounded = Math.ceil(net / step - 1e-9) * step;
  return Math.max(moq, rounded);
}

// ── 6 · Netting and time-phasing (M2 steps 3–6) ─────────────────────────────

/**
 * @typedef {object} NettingInput
 * @property {readonly IsoDate[]} weeks -  The planning weeks, Mondays, oldest first.
 * @property {IsoDate} currentWeek -  The week the plan runs in: a release before it is late.
 * @property {number} startStock
 * @property {ReadonlyMap<IsoDate, number>} gross
 * @property {ReadonlyMap<IsoDate, number>} receipts
 * @property {number} safetyStock
 * @property {number} leadTimeDays
 * @property {number} safetyLeadTimeDays
 * @property {number} moq
 * @property {number} orderMultiple
 * @property {ReadonlyMap<IsoDate, number>} [plannedReceipts] E14-05's planned receipts per week. When given, they ARE the planned
 *   orders (a week absent from the map has none); when absent, the interim
 *   round-up sizes each week's net requirement.
 */

/**
 * @typedef {object} NettedWeek
 * @property {IsoDate} weekStart
 * @property {number} gross
 * @property {number} projectedStart -  Projected stock at the start of the week (POH_{t−1}).
 * @property {number} receipts
 * @property {number} safetyStock
 * @property {number} net
 * @property {number} plannedReceipt
 * @property {IsoDate | null} releaseWeek -  Monday of the week the planned order must be released; null with no order.
 * @property {boolean} lateToRelease
 * @property {number} projectedEnd -  Projected stock at the end of the week (POH_t).
 */

/**
 * Whole weeks the order is released ahead: ⌈(lead time + safety lead time) ÷ 7⌉.
 * @param {number} leadTimeDays
 * @param {number} safetyLeadTimeDays
 * @returns {number}
 */
export const offsetWeeks = (leadTimeDays, safetyLeadTimeDays) =>
  Math.ceil((leadTimeDays + safetyLeadTimeDays) / 7);

/**
 * @param {NettingInput} input
 * @returns {NettedWeek[]}
 */
export function netMaterial(input) {
  const offset = offsetWeeks(input.leadTimeDays, input.safetyLeadTimeDays);
  let poh = input.startStock;
  return input.weeks.map((w) => {
    const gross = input.gross.get(w) ?? 0;
    const receipts = input.receipts.get(w) ?? 0;
    const net = Math.max(0, gross + input.safetyStock - (poh + receipts));
    const plannedReceipt = input.plannedReceipts
      ? (input.plannedReceipts.get(w) ?? 0)
      : interimOrderSize(net, input.moq, input.orderMultiple);
    const releaseWeek = plannedReceipt > 0 ? addDays(w, -7 * offset) : null;
    const end = poh + receipts + plannedReceipt - gross;
    /** @type {NettedWeek} */
    const row = {
      weekStart: w,
      gross,
      projectedStart: poh,
      receipts,
      safetyStock: input.safetyStock,
      net,
      plannedReceipt,
      releaseWeek,
      lateToRelease: releaseWeek !== null && releaseWeek < input.currentWeek,
      projectedEnd: end
    };
    poh = end;
    return row;
  });
}

// ── The run over a dataset ──────────────────────────────────────────────────

/** Where a material's safety stock came from — shown beside the figure. */
/**
 * E14-04, from the plan's own errors
 * E14-04 BR-05: too little history, SAP's value
 * before E14-04 was wired: SAP's value as a placeholder input
 *
 * @typedef {| 'engine'
 *   | 'sap'
 *   | 'sapPlaceholder'
 *   | 'none'} SafetyStockSource
 */

/** Where a safety lead time came from. */
/** @typedef {'supplier' | 'groupDefault' | 'none'} SafetyLeadTimeSource */

/**
 * @typedef {object} SafetyStockInput
 * @property {number} quantity
 * @property {SafetyStockSource} source
 */

/**
 * @typedef {object} SafetyLeadTimeInput
 * @property {number} days
 * @property {SafetyLeadTimeSource} source
 */

/**
 * @typedef {object} MaterialRequirementOptions
 * @property {IsoDate} asOf -  The present, as a day (the hub clock's, passed in).
 * @property {number} horizonWeeks
 * @property {ConsumptionWindow} consumptionWindow
 * @property {ReceiptOptions} receipts
 * @property {number} stockAccuracyTolerance -  E14-01 BR-03 (ENG-D2).
 * @property {ReadonlyMap<string, SafetyStockInput>} safetyStock -  Per material (E14-04). A material not in the map has none, marked.
 * @property {ReadonlyMap<string, SafetyLeadTimeInput>} safetyLeadTime -  Per `supplierId|materialCode` (E14-04 BR-03). Absent: none.
 * @property {ReadonlyMap<string, ReadonlyMap<IsoDate, number>>} [plannedReceipts] E14-05's planned receipts per material and week (`plannedReceiptsOf`). A
 *   material in the map is sized by E14-05; one absent is sized by the interim
 *   round-up. Absent altogether: the whole run is interim.
 */

export const DEFAULT_HORIZON_WEEKS = 26;

/**
 * `pegs`:  The finished goods behind the gross requirement (AC-03).
 * `unconfirmedReceipts`:  Part of `receipts` from unconfirmed lines the planner included (AC-02).
 *
 * @typedef {NettedWeek & {
 *     readonly pegs: readonly Peg[];
 *     readonly unconfirmedReceipts: number;
 *   }} MaterialWeek
 */

/**
 * @typedef {object} MaterialPlan
 * @property {string} materialCode
 * @property {WarehouseKind} kind
 * @property {Uom} uom
 * @property {string | null} materialGroup
 * @property {string | null} supplierId -  The source the planned order goes to: the largest share (ties: supplier id).
 * @property {number} leadTimeDays
 * @property {LeadTimeBreakdown | null} leadTimeSteps DRC-6 (BL-192) — the source's lead time by
 *   step, for display only (the netting reads `leadTimeDays`). Null with no source.
 * @property {number} moq
 * @property {number} orderMultiple
 * @property {number} safetyStock
 * @property {SafetyStockSource} safetyStockSource
 * @property {number} safetyLeadTimeDays
 * @property {SafetyLeadTimeSource} safetyLeadTimeSource
 * @property {number} startStock
 * @property {IsoDate | null} stockDate -  Date of the stock snapshot netted against; null when there is none (treated as 0).
 * @property {boolean} stockFlagged -  Latest cycle count off by more than the tolerance, or no stock record (E14-01 BR-03).
 * @property {boolean} reviewRequired -  Recommendations wait for the planner — never released automatically.
 * @property {readonly OpenReceipt[]} receipts
 * @property {readonly MaterialWeek[]} weeks
 * @property {{ readonly gross: number; readonly net: number; readonly planned: number; readonly plannedOrders: number; readonly lateToRelease: number; }} totals
 */

/**
 * @typedef {object} MaterialRequirementRun
 * @property {IsoDate} asOf
 * @property {IsoDate | null} planMadeAt -  The finished-goods plan snapshot the run used (SAP's, until E14-07).
 * @property {readonly IsoDate[]} weeks
 * @property {{ readonly name: 'MRP gross-to-net'; readonly spec: 'METHOD-SPEC M1, M2, M7'; readonly version: 1 }} method
 * @property {'interim' | 'orderSizing'} sizing `orderSizing`: planned orders come from E14-05 (MOQ, multiple, warehouse
 *   space, cost). `interim`: rounded up to MOQ and multiple only.
 * @property {{ readonly horizonWeeks: number; readonly consumptionWindow: ConsumptionWindow; readonly includeUnconfirmed: boolean; readonly overdueGraceDays: number; readonly stockAccuracyTolerance: number; }} parameters
 * @property {readonly MaterialPlan[]} materials
 */

/**
 * The source a material's planned orders go to: the largest share, ties by supplier id.
 * @param {readonly MaterialSource[]} sources
 * @param {string} materialCode
 * @returns {MaterialSource | null}
 */
export function primarySource(sources, materialCode) {
  const mine = sources.filter((s) => s.materialCode === materialCode);
  mine.sort((a, b) => b.share - a.share || a.supplierId.localeCompare(b.supplierId));
  return mine[0] ?? null;
}

/**
 * The snapshot in force: the latest made on or before the present.
 * @param {Pick<EngineDataset, 'fgPlan'>} data
 * @param {IsoDate} asOf
 * @returns {IsoDate | null}
 */
export function planInForce(data, asOf) {
  /** @type {IsoDate | null} */
  let best = null;
  for (const p of data.fgPlan)
    if (p.madeAt <= asOf && (best === null || p.madeAt > best)) best = p.madeAt;
  return best;
}

/**
 * Latest stock per material: the sum over warehouses on its latest snapshot date on or before `asOf`.
 * @param {Pick<EngineDataset, 'stock'>} data
 * @param {IsoDate} asOf
 * @returns {Map<string, { qty: number; date: IsoDate }>}
 */
function latestStock(data, asOf) {
  const latestDate = /** @type {Map<string, IsoDate>} */ (new Map());
  for (const s of data.stock) {
    if (s.date > asOf) continue;
    const d = latestDate.get(s.materialCode);
    if (!d || s.date > d) latestDate.set(s.materialCode, s.date);
  }
  const out = /** @type {Map<string, { qty: number; date: IsoDate }>} */ (new Map());
  for (const s of data.stock) {
    if (latestDate.get(s.materialCode) !== s.date) continue;
    const prev = out.get(s.materialCode);
    out.set(s.materialCode, { qty: (prev?.qty ?? 0) + s.onHandQty, date: s.date });
  }
  return out;
}

/**
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {string}
 */
export const slKey = (supplierId, materialCode) => `${supplierId}|${materialCode}`;

/**
 * REQ-E14-03 over a dataset: every material, every week of the horizon.
 * @param {EngineDataset} data
 * @param {MaterialRequirementOptions} options
 * @returns {MaterialRequirementRun}
 */
export function materialRequirement(data, options) {
  const currentWeek = mondayOf(options.asOf);
  const weeks = Array.from({ length: options.horizonWeeks }, (_, i) => addDays(currentWeek, 7 * i));
  const last = weeks[weeks.length - 1];
  const planMadeAt = planInForce(data, options.asOf);
  /** @type {SkuWeek[]} */
  const forecast = planMadeAt
    ? data.fgPlan.filter(
        (p) => p.madeAt === planMadeAt && p.weekStart >= currentWeek && p.weekStart <= last
      )
    : [];
  const orders = data.salesOrders.filter((o) => o.weekStart >= currentWeek && o.weekStart <= last);
  const demand = consumeForecast(forecast, orders, options.consumptionWindow).map((c) => ({
    skuCode: c.skuCode,
    weekStart: c.weekStart,
    quantity: c.demand
  }));
  const purchased = new Set(data.materials.map((m) => m.materialCode));
  const gross = explode(demand, data.bom, (code) => purchased.has(code));

  const stock = latestStock(data, options.asOf);
  const flagged = new Set(
    stockAccuracy(data.cycleCounts, options.stockAccuracyTolerance)
      .filter((a) => a.flagged)
      .map((a) => a.materialCode)
  );
  const receipts = openReceipts(lineHistories(data), options.asOf, options.receipts);

  const materials = [...data.materials]
    .sort((a, b) => a.materialCode.localeCompare(b.materialCode))
    .map(
      /** @param {EngineMaterial} m @returns {MaterialPlan} */ (m) => {
        const src = primarySource(data.sources, m.materialCode);
        const ss = options.safetyStock.get(m.materialCode) ?? {
          quantity: 0,
          source: /** @type {const} */ ('none')
        };
        const slt = (src && options.safetyLeadTime.get(slKey(src.supplierId, m.materialCode))) ?? {
          days: 0,
          source: /** @type {const} */ ('none')
        };
        const onHand = stock.get(m.materialCode);
        const mine = receipts.filter(
          (r) => r.materialCode === m.materialCode && r.weekStart <= last
        );
        const byWeek = /** @type {Map<IsoDate, number>} */ (new Map());
        const unconfirmed = /** @type {Map<IsoDate, number>} */ (new Map());
        for (const r of mine) {
          byWeek.set(r.weekStart, (byWeek.get(r.weekStart) ?? 0) + r.quantity);
          if (!r.confirmed)
            unconfirmed.set(r.weekStart, (unconfirmed.get(r.weekStart) ?? 0) + r.quantity);
        }
        const series =
          gross.get(m.materialCode) ?? /** @type {Map<IsoDate, GrossCell>} */ (new Map());
        const netted = netMaterial({
          weeks,
          currentWeek,
          startStock: onHand?.qty ?? 0,
          gross: new Map([...series.entries()].map(([w, c]) => [w, c.quantity])),
          receipts: byWeek,
          safetyStock: ss.quantity,
          leadTimeDays: src?.leadTimeDays ?? 0,
          safetyLeadTimeDays: slt.days,
          moq: src?.moq ?? 0,
          orderMultiple: src?.orderMultiple ?? 1,
          plannedReceipts: options.plannedReceipts?.get(m.materialCode)
        });
        const stockFlagged = flagged.has(m.materialCode) || onHand === undefined;
        /** @type {MaterialWeek[]} */
        const rows = netted.map((n) => ({
          ...n,
          pegs: series.get(n.weekStart)?.pegs ?? [],
          unconfirmedReceipts: unconfirmed.get(n.weekStart) ?? 0
        }));
        return {
          materialCode: m.materialCode,
          kind: m.kind,
          uom: m.uom,
          materialGroup: m.materialGroup ?? null,
          supplierId: src?.supplierId ?? null,
          leadTimeDays: src?.leadTimeDays ?? 0,
          leadTimeSteps: src ? leadTimeBreakdown(src) : null,
          moq: src?.moq ?? 0,
          orderMultiple: src?.orderMultiple ?? 1,
          safetyStock: ss.quantity,
          safetyStockSource: ss.source,
          safetyLeadTimeDays: slt.days,
          safetyLeadTimeSource: slt.source,
          startStock: onHand?.qty ?? 0,
          stockDate: onHand?.date ?? null,
          stockFlagged,
          reviewRequired: stockFlagged,
          receipts: mine,
          weeks: rows,
          totals: {
            gross: rows.reduce((s, r) => s + r.gross, 0),
            net: rows.reduce((s, r) => s + r.net, 0),
            planned: rows.reduce((s, r) => s + r.plannedReceipt, 0),
            plannedOrders: rows.filter((r) => r.plannedReceipt > 0).length,
            lateToRelease: rows.filter((r) => r.lateToRelease).length
          }
        };
      }
    );

  return {
    asOf: options.asOf,
    planMadeAt,
    weeks,
    method: { name: 'MRP gross-to-net', spec: 'METHOD-SPEC M1, M2, M7', version: 1 },
    sizing: options.plannedReceipts ? 'orderSizing' : 'interim',
    parameters: {
      horizonWeeks: options.horizonWeeks,
      consumptionWindow: options.consumptionWindow,
      includeUnconfirmed: options.receipts.includeUnconfirmed,
      overdueGraceDays: options.receipts.overdueGraceDays,
      stockAccuracyTolerance: options.stockAccuracyTolerance
    },
    materials
  };
}

/**
 * The options the Hub runs with, before E14-04 supplies safety stock.
 * @param {IsoDate} asOf
 * @returns {MaterialRequirementOptions}
 */
export function defaultRequirementOptions(asOf) {
  return {
    asOf,
    horizonWeeks: DEFAULT_HORIZON_WEEKS,
    consumptionWindow: DEFAULT_CONSUMPTION_WINDOW,
    receipts: DEFAULT_RECEIPT_OPTIONS,
    stockAccuracyTolerance: DEFAULT_STOCK_ACCURACY_TOLERANCE,
    safetyStock: new Map(),
    safetyLeadTime: new Map()
  };
}
