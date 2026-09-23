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
//        GR_c,t = Σ_p release_p,t × qtyPer_p,c × (1 + scrap_p,c)
//      A finished good's release is its demand (the finished-goods plan is the
//      production plan); an intermediate (bulk) passes its gross on lot-for-lot
//      in the same week. Every gross figure keeps its PEGS — the finished good,
//      its week and quantity behind each part — so it can be traced (AC-03).
//      (The contract has no yield field yet, so BR-03's "÷ yield" is 1.)
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
//   5. PLANNED ORDER (M2 step 5, BR-06). ⚠️ INTERIM SIZING: the net requirement
//      rounded UP to the order multiple, and at least the MOQ. E14-05 (order
//      sizing within warehouse space) replaces this; every result says so.
//   6. RELEASE (M2 step 6, BR-05). Release week = need week − ⌈(lead time +
//      safety lead time) ÷ 7⌉ weeks. A release week already past is "late to
//      release", shown with its shortfall week — never silently moved.
//
// Worked example (REQ-E14-03): gross 20,000 × 1 × 1.02 = 20,400; net 20,400 +
// 3,000 − (5,000 + 6,000) = 12,400; MOQ 10,000, multiple 5,000 → 15,000;
// released week 10 − 4 = week 6; projected end 5,000 + 6,000 + 15,000 −
// 20,400 = 5,600. `requirement.test.ts` runs it verbatim.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays, mondayOf } from './dates';
import { latestConfirmation, lineHistories, receivedBy, requirementAt, type LineHistory } from './lines';
import { DEFAULT_STOCK_ACCURACY_TOLERANCE, stockAccuracy } from './stock';
import type {
  BomLine,
  EngineDataset,
  EngineMaterial,
  IsoDate,
  MaterialSource,
  SalesOrderWeek,
  WarehouseKind,
} from './types';
import type { Uom } from '../sdc/types';

// ── 1 · Forecast consumption (M1) ───────────────────────────────────────────

export interface ConsumptionWindow {
  /** Weeks before the order's week whose forecast it may consume. */
  readonly backwardWeeks: number;
  /** Weeks after the order's week whose forecast it may consume. */
  readonly forwardWeeks: number;
}

/** Until the planner sets a window per SKU group (BR-01): the order's own week only. */
export const DEFAULT_CONSUMPTION_WINDOW: ConsumptionWindow = Object.freeze({ backwardWeeks: 0, forwardWeeks: 0 });

/** A quantity of one SKU in one week. */
export interface SkuWeek {
  readonly skuCode: string;
  readonly weekStart: IsoDate;
  readonly quantity: number;
}

export interface ConsumedWeek {
  readonly skuCode: string;
  readonly weekStart: IsoDate;
  readonly forecast: number;
  readonly orders: number;
  /** Forecast in THIS week consumed by orders (from this or a nearby week). */
  readonly consumed: number;
  /** orders + (forecast − consumed). */
  readonly demand: number;
}

/**
 * M1 — sales orders replace the forecast they fall inside, so the two are not
 * counted twice. Orders are applied oldest week first.
 */
export function consumeForecast(
  forecast: readonly SkuWeek[],
  orders: readonly SalesOrderWeek[],
  window: ConsumptionWindow = DEFAULT_CONSUMPTION_WINDOW,
): ConsumedWeek[] {
  const key = (sku: string, w: IsoDate) => `${sku}|${w}`;
  const f = new Map<string, number>();
  const o = new Map<string, number>();
  for (const r of forecast) f.set(key(r.skuCode, r.weekStart), (f.get(key(r.skuCode, r.weekStart)) ?? 0) + r.quantity);
  for (const r of orders) o.set(key(r.skuCode, r.weekStart), (o.get(key(r.skuCode, r.weekStart)) ?? 0) + r.quantity);
  const remaining = new Map(f);
  const consumed = new Map<string, number>();
  const orderRows = [...orders].sort((a, b) => a.weekStart.localeCompare(b.weekStart) || a.skuCode.localeCompare(b.skuCode));
  for (const r of orderRows) {
    let need = r.quantity;
    const candidates = [r.weekStart];
    for (let i = 1; i <= window.backwardWeeks; i += 1) candidates.push(addDays(r.weekStart, -7 * i));
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
    return { skuCode, weekStart, forecast: fq, orders: oq, consumed: cq, demand: oq + Math.max(0, fq - cq) };
  });
}

// ── 2 · Low-level codes (M2 step 1) ─────────────────────────────────────────

/**
 * Each item's low-level code: 0 for an item no BOM line consumes, otherwise one
 * more than its deepest parent. Every validity version counts (an item's
 * deepest position in ANY bill). A cycle throws `BOM_CYCLE`, naming the path.
 */
export function lowLevelCodes(bom: readonly BomLine[]): Map<string, number> {
  const children = new Map<string, Set<string>>();
  const items = new Set<string>();
  for (const b of bom) {
    items.add(b.parentCode);
    items.add(b.componentCode);
    const set = children.get(b.parentCode) ?? new Set<string>();
    set.add(b.componentCode);
    children.set(b.parentCode, set);
  }
  // Depth-first, with the path on the stack so a cycle can be named.
  const state = new Map<string, 'open' | 'done'>();
  const order: string[] = [];
  const visit = (item: string, path: string[]) => {
    const s = state.get(item);
    if (s === 'done') return;
    if (s === 'open') {
      const from = path.indexOf(item);
      throw new Error(`BOM_CYCLE: ${[...path.slice(from), item].join(' → ')} — the bill of materials cannot be exploded`);
    }
    state.set(item, 'open');
    for (const c of [...(children.get(item) ?? [])].sort()) visit(c, [...path, item]);
    state.set(item, 'done');
    order.push(item);
  };
  for (const item of [...items].sort()) visit(item, []);
  // `order` is post-order: children before parents. Reversed, parents first.
  const llc = new Map<string, number>([...items].map((i) => [i, 0]));
  for (const parent of order.reverse()) {
    for (const c of children.get(parent) ?? []) llc.set(c, Math.max(llc.get(c)!, llc.get(parent)! + 1));
  }
  return llc;
}

// ── 3 · Gross requirement with pegging (M2 step 2) ──────────────────────────

/** One finished-good part of a gross requirement (AC-03). */
export interface Peg {
  readonly skuCode: string;
  /** The finished-good week the requirement comes from. */
  readonly fgWeek: IsoDate;
  /** The finished-good quantity in that week. */
  readonly fgQuantity: number;
  /** This part of the item's gross requirement, in the item's unit. */
  readonly quantity: number;
}

export interface GrossCell {
  readonly quantity: number;
  readonly pegs: readonly Peg[];
}

/** item → week → gross requirement with its pegs. */
export type PeggedRequirement = Map<string, Map<IsoDate, GrossCell>>;

const validIn = (b: BomLine, w: IsoDate) => w >= b.validFrom && (b.validTo === undefined || w < b.validTo);

/**
 * Explode finished-goods demand through the BOM in low-level-code order. A
 * finished good releases its demand; an item that is neither a finished good
 * nor `isPurchased` (a bulk) passes its gross on lot-for-lot in the same week.
 * Purchased items are the leaves the netting step plans; one that is itself a
 * BOM parent is REFUSED by name (`BOM_PURCHASED_PARENT`) rather than exploded
 * from a gross figure it has not netted.
 */
export function explode(
  demand: readonly SkuWeek[],
  bom: readonly BomLine[],
  isPurchased: (code: string) => boolean,
): PeggedRequirement {
  const llc = lowLevelCodes(bom);
  const byParent = new Map<string, BomLine[]>();
  for (const b of bom) byParent.set(b.parentCode, [...(byParent.get(b.parentCode) ?? []), b]);
  for (const parent of byParent.keys()) {
    if (isPurchased(parent)) throw new Error(`BOM_PURCHASED_PARENT: '${parent}' is purchased and also a BOM parent`);
  }
  // Releases per item and week, with pegs. Finished goods: their demand.
  const gross: PeggedRequirement = new Map();
  const add = (item: string, w: IsoDate, qty: number, pegs: readonly Peg[]) => {
    const series = gross.get(item) ?? new Map<IsoDate, GrossCell>();
    const cell = series.get(w);
    series.set(w, { quantity: (cell?.quantity ?? 0) + qty, pegs: [...(cell?.pegs ?? []), ...pegs] });
    gross.set(item, series);
  };
  for (const d of demand) {
    if (d.quantity <= 0) continue;
    add(d.skuCode, d.weekStart, d.quantity, [{ skuCode: d.skuCode, fgWeek: d.weekStart, fgQuantity: d.quantity, quantity: d.quantity }]);
  }
  const itemsInOrder = [...new Set([...llc.keys(), ...demand.map((d) => d.skuCode)])].sort(
    (a, b) => (llc.get(a) ?? 0) - (llc.get(b) ?? 0) || a.localeCompare(b),
  );
  for (const item of itemsInOrder) {
    const lines = byParent.get(item);
    const series = gross.get(item);
    if (!lines || !series) continue;
    for (const [w, cell] of [...series.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      for (const b of lines) {
        if (!validIn(b, w)) continue;
        const factor = b.qtyPer * (1 + b.scrapPct);
        add(
          b.componentCode,
          w,
          cell.quantity * factor,
          cell.pegs.map((p) => ({ ...p, quantity: p.quantity * factor })),
        );
      }
    }
  }
  // Only what a BOM line produced is a gross requirement; the finished goods'
  // own demand rows were the seed, not a requirement.
  for (const d of demand) if (!llc.has(d.skuCode) || (llc.get(d.skuCode) ?? 0) === 0) gross.delete(d.skuCode);
  return gross;
}

// ── 4 · Open receipts (BR-04, AC-02) ────────────────────────────────────────

export interface OpenReceipt {
  readonly poNumber: string;
  readonly line: number;
  readonly supplierId: string;
  readonly materialCode: string;
  /** Still to arrive: the confirmed (or, if included, requested) quantity less what was received. */
  readonly quantity: number;
  /** The supplier-confirmed date; PTI's requested date for an included unconfirmed line. */
  readonly date: IsoDate;
  /** The week it is netted in (an overdue line lands in the current week). */
  readonly weekStart: IsoDate;
  readonly confirmed: boolean;
  /** Its date has passed and it is still open. */
  readonly overdue: boolean;
}

export interface ReceiptOptions {
  /** Count unconfirmed lines at PTI's requested date and quantity (AC-02). Default: no. */
  readonly includeUnconfirmed: boolean;
  /** An open line whose date passed more than this many days ago is treated as closed. */
  readonly overdueGraceDays: number;
}

export const DEFAULT_RECEIPT_OPTIONS: ReceiptOptions = Object.freeze({ includeUnconfirmed: false, overdueGraceDays: 14 });

/** Open PO lines as receipts, at the supplier-confirmed date and quantity. */
export function openReceipts(
  histories: readonly LineHistory[],
  asOf: IsoDate,
  options: ReceiptOptions = DEFAULT_RECEIPT_OPTIONS,
): OpenReceipt[] {
  const currentWeek = mondayOf(asOf);
  const oldest = addDays(asOf, -options.overdueGraceDays);
  const out: OpenReceipt[] = [];
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
      overdue: basis.date < asOf,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.poNumber.localeCompare(b.poNumber) || a.line - b.line);
}

// ── 5 · Interim order sizing (BR-06 — E14-05 replaces it) ───────────────────

/**
 * ⚠️ INTERIM: the net requirement rounded UP to the order multiple, and at
 * least the MOQ. No warehouse-space or cost trade-off — that is E14-05.
 */
export function interimOrderSize(net: number, moq: number, orderMultiple: number): number {
  if (net <= 0) return 0;
  const step = orderMultiple > 0 ? orderMultiple : 1;
  // Guard float noise (12,400.0000001 must not become the next multiple).
  const rounded = Math.ceil(net / step - 1e-9) * step;
  return Math.max(moq, rounded);
}

// ── 6 · Netting and time-phasing (M2 steps 3–6) ─────────────────────────────

export interface NettingInput {
  /** The planning weeks, Mondays, oldest first. */
  readonly weeks: readonly IsoDate[];
  /** The week the plan runs in: a release before it is late. */
  readonly currentWeek: IsoDate;
  readonly startStock: number;
  readonly gross: ReadonlyMap<IsoDate, number>;
  readonly receipts: ReadonlyMap<IsoDate, number>;
  readonly safetyStock: number;
  readonly leadTimeDays: number;
  readonly safetyLeadTimeDays: number;
  readonly moq: number;
  readonly orderMultiple: number;
}

export interface NettedWeek {
  readonly weekStart: IsoDate;
  readonly gross: number;
  /** Projected stock at the start of the week (POH_{t−1}). */
  readonly projectedStart: number;
  readonly receipts: number;
  readonly safetyStock: number;
  readonly net: number;
  readonly plannedReceipt: number;
  /** Monday of the week the planned order must be released; null with no order. */
  readonly releaseWeek: IsoDate | null;
  readonly lateToRelease: boolean;
  /** Projected stock at the end of the week (POH_t). */
  readonly projectedEnd: number;
}

/** Whole weeks the order is released ahead: ⌈(lead time + safety lead time) ÷ 7⌉. */
export const offsetWeeks = (leadTimeDays: number, safetyLeadTimeDays: number): number =>
  Math.ceil((leadTimeDays + safetyLeadTimeDays) / 7);

export function netMaterial(input: NettingInput): NettedWeek[] {
  const offset = offsetWeeks(input.leadTimeDays, input.safetyLeadTimeDays);
  let poh = input.startStock;
  return input.weeks.map((w) => {
    const gross = input.gross.get(w) ?? 0;
    const receipts = input.receipts.get(w) ?? 0;
    const net = Math.max(0, gross + input.safetyStock - (poh + receipts));
    const plannedReceipt = interimOrderSize(net, input.moq, input.orderMultiple);
    const releaseWeek = plannedReceipt > 0 ? addDays(w, -7 * offset) : null;
    const end = poh + receipts + plannedReceipt - gross;
    const row: NettedWeek = {
      weekStart: w,
      gross,
      projectedStart: poh,
      receipts,
      safetyStock: input.safetyStock,
      net,
      plannedReceipt,
      releaseWeek,
      lateToRelease: releaseWeek !== null && releaseWeek < input.currentWeek,
      projectedEnd: end,
    };
    poh = end;
    return row;
  });
}

// ── The run over a dataset ──────────────────────────────────────────────────

/** Where a material's safety stock came from — shown beside the figure. */
export type SafetyStockSource =
  | 'engine' // E14-04, from the plan's own errors
  | 'sap' // E14-04 BR-05: too little history, SAP's value
  | 'sapPlaceholder' // before E14-04 was wired: SAP's value as a placeholder input
  | 'none';

/** Where a safety lead time came from. */
export type SafetyLeadTimeSource = 'supplier' | 'groupDefault' | 'none';

export interface SafetyStockInput {
  readonly quantity: number;
  readonly source: SafetyStockSource;
}

export interface SafetyLeadTimeInput {
  readonly days: number;
  readonly source: SafetyLeadTimeSource;
}

export interface MaterialRequirementOptions {
  /** The present, as a day (the hub clock's, passed in). */
  readonly asOf: IsoDate;
  readonly horizonWeeks: number;
  readonly consumptionWindow: ConsumptionWindow;
  readonly receipts: ReceiptOptions;
  /** E14-01 BR-03 (ENG-D2). */
  readonly stockAccuracyTolerance: number;
  /** Per material (E14-04). A material not in the map has none, marked. */
  readonly safetyStock: ReadonlyMap<string, SafetyStockInput>;
  /** Per `supplierId|materialCode` (E14-04 BR-03). Absent: none. */
  readonly safetyLeadTime: ReadonlyMap<string, SafetyLeadTimeInput>;
}

export const DEFAULT_HORIZON_WEEKS = 26;

export interface MaterialWeek extends NettedWeek {
  /** The finished goods behind the gross requirement (AC-03). */
  readonly pegs: readonly Peg[];
  /** Part of `receipts` from unconfirmed lines the planner included (AC-02). */
  readonly unconfirmedReceipts: number;
}

export interface MaterialPlan {
  readonly materialCode: string;
  readonly kind: WarehouseKind;
  readonly uom: Uom;
  readonly materialGroup: string | null;
  /** The source the planned order goes to: the largest share (ties: supplier id). */
  readonly supplierId: string | null;
  readonly leadTimeDays: number;
  readonly moq: number;
  readonly orderMultiple: number;
  readonly safetyStock: number;
  readonly safetyStockSource: SafetyStockSource;
  readonly safetyLeadTimeDays: number;
  readonly safetyLeadTimeSource: SafetyLeadTimeSource;
  readonly startStock: number;
  /** Date of the stock snapshot netted against; null when there is none (treated as 0). */
  readonly stockDate: IsoDate | null;
  /** Latest cycle count off by more than the tolerance, or no stock record (E14-01 BR-03). */
  readonly stockFlagged: boolean;
  /** Recommendations wait for the planner — never released automatically. */
  readonly reviewRequired: boolean;
  readonly receipts: readonly OpenReceipt[];
  readonly weeks: readonly MaterialWeek[];
  readonly totals: {
    readonly gross: number;
    readonly net: number;
    readonly planned: number;
    readonly plannedOrders: number;
    readonly lateToRelease: number;
  };
}

export interface MaterialRequirementRun {
  readonly asOf: IsoDate;
  /** The finished-goods plan snapshot the run used (SAP's, until E14-07). */
  readonly planMadeAt: IsoDate | null;
  readonly weeks: readonly IsoDate[];
  readonly method: { readonly name: 'MRP gross-to-net'; readonly spec: 'METHOD-SPEC M1, M2, M7'; readonly version: 1 };
  /** ⚠️ E14-05 is not built: planned orders are rounded up to MOQ and multiple only. */
  readonly sizing: 'interim';
  readonly parameters: {
    readonly horizonWeeks: number;
    readonly consumptionWindow: ConsumptionWindow;
    readonly includeUnconfirmed: boolean;
    readonly overdueGraceDays: number;
    readonly stockAccuracyTolerance: number;
  };
  readonly materials: readonly MaterialPlan[];
}

/** The source a material's planned orders go to: the largest share, ties by supplier id. */
export function primarySource(sources: readonly MaterialSource[], materialCode: string): MaterialSource | null {
  const mine = sources.filter((s) => s.materialCode === materialCode);
  mine.sort((a, b) => b.share - a.share || a.supplierId.localeCompare(b.supplierId));
  return mine[0] ?? null;
}

/** The snapshot in force: the latest made on or before the present. */
export function planInForce(data: Pick<EngineDataset, 'fgPlan'>, asOf: IsoDate): IsoDate | null {
  let best: IsoDate | null = null;
  for (const p of data.fgPlan) if (p.madeAt <= asOf && (best === null || p.madeAt > best)) best = p.madeAt;
  return best;
}

/** Latest stock per material: the sum over warehouses on its latest snapshot date on or before `asOf`. */
function latestStock(data: Pick<EngineDataset, 'stock'>, asOf: IsoDate): Map<string, { qty: number; date: IsoDate }> {
  const latestDate = new Map<string, IsoDate>();
  for (const s of data.stock) {
    if (s.date > asOf) continue;
    const d = latestDate.get(s.materialCode);
    if (!d || s.date > d) latestDate.set(s.materialCode, s.date);
  }
  const out = new Map<string, { qty: number; date: IsoDate }>();
  for (const s of data.stock) {
    if (latestDate.get(s.materialCode) !== s.date) continue;
    const prev = out.get(s.materialCode);
    out.set(s.materialCode, { qty: (prev?.qty ?? 0) + s.onHandQty, date: s.date });
  }
  return out;
}

export const slKey = (supplierId: string, materialCode: string): string => `${supplierId}|${materialCode}`;

/** REQ-E14-03 over a dataset: every material, every week of the horizon. */
export function materialRequirement(data: EngineDataset, options: MaterialRequirementOptions): MaterialRequirementRun {
  const currentWeek = mondayOf(options.asOf);
  const weeks = Array.from({ length: options.horizonWeeks }, (_, i) => addDays(currentWeek, 7 * i));
  const last = weeks[weeks.length - 1];
  const planMadeAt = planInForce(data, options.asOf);
  const forecast: SkuWeek[] = planMadeAt
    ? data.fgPlan.filter((p) => p.madeAt === planMadeAt && p.weekStart >= currentWeek && p.weekStart <= last)
    : [];
  const orders = data.salesOrders.filter((o) => o.weekStart >= currentWeek && o.weekStart <= last);
  const demand = consumeForecast(forecast, orders, options.consumptionWindow).map((c) => ({
    skuCode: c.skuCode,
    weekStart: c.weekStart,
    quantity: c.demand,
  }));
  const purchased = new Set(data.materials.map((m) => m.materialCode));
  const gross = explode(demand, data.bom, (code) => purchased.has(code));

  const stock = latestStock(data, options.asOf);
  const flagged = new Set(
    stockAccuracy(data.cycleCounts, options.stockAccuracyTolerance)
      .filter((a) => a.flagged)
      .map((a) => a.materialCode),
  );
  const receipts = openReceipts(lineHistories(data), options.asOf, options.receipts);

  const materials = [...data.materials]
    .sort((a, b) => a.materialCode.localeCompare(b.materialCode))
    .map((m: EngineMaterial): MaterialPlan => {
      const src = primarySource(data.sources, m.materialCode);
      const ss = options.safetyStock.get(m.materialCode) ?? { quantity: 0, source: 'none' as const };
      const slt = (src && options.safetyLeadTime.get(slKey(src.supplierId, m.materialCode))) ?? { days: 0, source: 'none' as const };
      const onHand = stock.get(m.materialCode);
      const mine = receipts.filter((r) => r.materialCode === m.materialCode && r.weekStart <= last);
      const byWeek = new Map<IsoDate, number>();
      const unconfirmed = new Map<IsoDate, number>();
      for (const r of mine) {
        byWeek.set(r.weekStart, (byWeek.get(r.weekStart) ?? 0) + r.quantity);
        if (!r.confirmed) unconfirmed.set(r.weekStart, (unconfirmed.get(r.weekStart) ?? 0) + r.quantity);
      }
      const series = gross.get(m.materialCode) ?? new Map<IsoDate, GrossCell>();
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
      });
      const stockFlagged = flagged.has(m.materialCode) || onHand === undefined;
      const rows: MaterialWeek[] = netted.map((n) => ({
        ...n,
        pegs: series.get(n.weekStart)?.pegs ?? [],
        unconfirmedReceipts: unconfirmed.get(n.weekStart) ?? 0,
      }));
      return {
        materialCode: m.materialCode,
        kind: m.kind,
        uom: m.uom,
        materialGroup: m.materialGroup ?? null,
        supplierId: src?.supplierId ?? null,
        leadTimeDays: src?.leadTimeDays ?? 0,
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
          lateToRelease: rows.filter((r) => r.lateToRelease).length,
        },
      };
    });

  return {
    asOf: options.asOf,
    planMadeAt,
    weeks,
    method: { name: 'MRP gross-to-net', spec: 'METHOD-SPEC M1, M2, M7', version: 1 },
    sizing: 'interim',
    parameters: {
      horizonWeeks: options.horizonWeeks,
      consumptionWindow: options.consumptionWindow,
      includeUnconfirmed: options.receipts.includeUnconfirmed,
      overdueGraceDays: options.receipts.overdueGraceDays,
      stockAccuracyTolerance: options.stockAccuracyTolerance,
    },
    materials,
  };
}

/** The options the Hub runs with, before E14-04 supplies safety stock. */
export function defaultRequirementOptions(asOf: IsoDate): MaterialRequirementOptions {
  return {
    asOf,
    horizonWeeks: DEFAULT_HORIZON_WEEKS,
    consumptionWindow: DEFAULT_CONSUMPTION_WINDOW,
    receipts: DEFAULT_RECEIPT_OPTIONS,
    stockAccuracyTolerance: DEFAULT_STOCK_ACCURACY_TOLERANCE,
    safetyStock: new Map(),
    safetyLeadTime: new Map(),
  };
}
