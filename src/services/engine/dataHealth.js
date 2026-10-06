// ─────────────────────────────────────────────────────────────────────────────
// DATA HEALTH — the quality checks on arrival and the freshness of each feed
// (REQ-E14-01 BR-01, BR-05, AC-01; BL-109).
//
// One report per engine dataset: for every feed the engine reads, its last
// arrival and age against its freshness limit, its record count, and each
// quality check `FORECAST-ENGINE-FEED-SPEC.md` §2 names for that entity, with
// the failing records BY KEY (a check that only counts cannot say which row to
// fix). Each feed also says which engine steps read it, directly or through a
// step that feeds another, so a failure names what it would affect.
//
// ── THE CHECKS (feed spec §2; "refuse by name, never assume", §1) ───────────
//   Every check is a pure predicate over the feed as it arrived. Two severities:
//     · refuse — the spec's rule: a failing record is kept out of the
//       calculation and listed here. ⚠️ The engine does not yet drop refused
//       records itself (ENG-B45); on the synthetic dataset none are refused.
//     · flag   — stock accuracy only (E14-01 BR-03, ENG-D2: flag, do not
//       block). The material's recommendations wait for the planner.
//   Beside the spec's per-entity checks, every feed is checked for a duplicate
//   key (the spec's key; §1.1 "a record keeps its key for life") and every
//   material code for resolving in the master (§1 "Material codes").
//
// ── FRESHNESS (BR-05) ───────────────────────────────────────────────────────
//   age = now − last arrival, in days. Stale when the age is above the feed's
//   limit; missing when the feed never arrived. The limits are the
//   administrator's (X-05) and arrive as an argument. A feed the spec gives no
//   limit (the Hub's own records; "on change" and "as counted" feeds) has none.
//   The stock feed is also judged per warehouse on its newest snapshot date —
//   the spec's example of one warehouse's stock being days old (E14-01
//   step-by-step 2–3), with the materials that stale stock would affect.
//
// ── PURITY (X-01) ───────────────────────────────────────────────────────────
//   Inputs in, report out. The clock (`now`), the arrivals, the limits, the
//   stock-accuracy tolerance and the material master arrive as arguments.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { Uom } from '../sdc/types' */
import { addDays, daysBetween, dayOf, DAY_MS, mondayOf } from './dates';
import { stockAccuracy } from './stock';
/** @import { EngineDataset, IsoDate, IsoInstant } from './types' */
import { lineKey } from './types';

// ── Feeds ───────────────────────────────────────────────────────────────────

/** A feed is one entity of the input contract — its field on `EngineDataset`. */
/** @typedef {Exclude<keyof EngineDataset, 'provenance' | 'materials'>} FeedId */

/**
 * The engine steps a feed can affect. E14-07 feeds only E14-09's range (BL-111):
 * SAP's plan stays E14-03's input (ENG-B66), and nothing reads the range yet.
 */
/** @typedef {'E14-02' | 'E14-03' | 'E14-04' | 'E14-05' | 'E14-07' | 'E14-09' | 'E14-13'} EngineStep */

/** Who delivers a feed: the Master Data Management team from SAP (ENG-D1), or the Hub itself. */
/** @typedef {'mdm' | 'hub'} FeedSource */

/** The refresh cadence the feed spec states. */
/** @typedef {'daily' | 'weekly' | 'monthly' | 'onChange' | 'asCounted' | 'hubRecord'} FeedRefresh */

/**
 * @typedef {object} FeedDef
 * @property {FeedId} feed
 * @property {string} entity -  The entity's name in the feed spec.
 * @property {FeedSource} source
 * @property {FeedRefresh} refresh
 * @property {boolean} limited -  Does the feed have a freshness limit (an administrator's value)?
 * @property {readonly EngineStep[]} readBy -  The steps that read the feed DIRECTLY (the closure is derived).
 */

/**
 * Every feed, in the feed spec's order (§2.1–§2.4). `readBy` is what each
 * engine module reads today (E14-02 `reliability.js`, E14-03 `requirement.js`,
 * E14-04 `safetyStock.js`, E14-05 `orderSizing.js`, E14-07 `demandForecast.js`,
 * E14-09 `demandRange.js` (the BOM and SAP's past plans; its sales come through
 * E14-07), E14-13 `reschedule.js`).
 * @type {readonly FeedDef[]}
 */
export const FEEDS = Object.freeze(
  /** @satisfies {readonly FeedDef[]} */ ([
    {
      feed: 'poLines',
      entity: 'PoLine',
      source: 'mdm',
      refresh: 'daily',
      limited: true,
      readBy: ['E14-02', 'E14-03', 'E14-04', 'E14-13']
    },
    {
      feed: 'scheduleChanges',
      entity: 'ScheduleChange',
      source: 'mdm',
      refresh: 'daily',
      limited: true,
      readBy: ['E14-02', 'E14-03', 'E14-04', 'E14-13']
    },
    {
      feed: 'confirmations',
      entity: 'Confirmation',
      source: 'hub',
      refresh: 'hubRecord',
      limited: false,
      readBy: ['E14-02', 'E14-03', 'E14-04', 'E14-13']
    },
    {
      feed: 'receipts',
      entity: 'Receipt',
      source: 'mdm',
      refresh: 'daily',
      limited: true,
      readBy: ['E14-02', 'E14-03', 'E14-04', 'E14-13']
    },
    {
      feed: 'planVersions',
      entity: 'PlanVersion',
      source: 'hub',
      refresh: 'hubRecord',
      limited: false,
      readBy: ['E14-02']
    },
    {
      feed: 'sources',
      entity: 'MaterialSource',
      source: 'mdm',
      refresh: 'weekly',
      limited: true,
      readBy: ['E14-02', 'E14-03', 'E14-04', 'E14-13']
    },
    {
      feed: 'bom',
      entity: 'BomLine',
      source: 'mdm',
      refresh: 'weekly',
      limited: true,
      readBy: ['E14-02', 'E14-03', 'E14-04', 'E14-09']
    },
    {
      feed: 'stock',
      entity: 'StockSnapshot',
      source: 'mdm',
      refresh: 'daily',
      limited: true,
      readBy: ['E14-03']
    },
    {
      feed: 'cycleCounts',
      entity: 'CycleCount',
      source: 'mdm',
      refresh: 'asCounted',
      limited: false,
      readBy: ['E14-03']
    },
    {
      feed: 'warehouses',
      entity: 'Warehouse',
      source: 'mdm',
      refresh: 'onChange',
      limited: false,
      readBy: ['E14-05']
    },
    {
      feed: 'volumes',
      entity: 'MaterialVolume',
      source: 'mdm',
      refresh: 'onChange',
      limited: false,
      readBy: ['E14-04', 'E14-05']
    },
    {
      feed: 'materialValues',
      entity: 'MaterialValue',
      source: 'mdm',
      refresh: 'monthly',
      limited: true,
      readBy: ['E14-05']
    },
    {
      feed: 'finishedGoods',
      entity: 'FinishedGood',
      source: 'mdm',
      refresh: 'weekly',
      limited: true,
      readBy: ['E14-07']
    },
    {
      feed: 'sales',
      entity: 'SalesWeek',
      source: 'mdm',
      refresh: 'weekly',
      limited: true,
      readBy: ['E14-02', 'E14-04', 'E14-07']
    },
    {
      feed: 'fgPlan',
      entity: 'FgPlanSnapshot',
      source: 'mdm',
      refresh: 'weekly',
      limited: true,
      readBy: ['E14-03', 'E14-04', 'E14-09']
    },
    {
      feed: 'salesOrders',
      entity: 'SalesOrderWeek',
      source: 'mdm',
      refresh: 'daily',
      limited: true,
      readBy: ['E14-03']
    },
    {
      feed: 'sapSafetyStock',
      entity: 'SapSafetyStock',
      source: 'mdm',
      refresh: 'weekly',
      limited: true,
      readBy: ['E14-04']
    }
  ])
);

/**
 * Which step feeds which (the Hub's chain, `MockProcurementService.engineSizing`
 * and `getReschedule`): E14-04's safety stock goes into E14-03's netting,
 * E14-03 into E14-05's sizing, E14-05's plan and E14-02's plan-change share
 * into E14-13; E14-07's forecast into E14-09's range.
 * @type {Readonly<Record<EngineStep, readonly EngineStep[]>>}
 */
const FEEDS_INTO = {
  'E14-02': ['E14-13'],
  'E14-03': ['E14-05'],
  'E14-04': ['E14-03'],
  'E14-05': ['E14-13'],
  'E14-07': ['E14-09'],
  'E14-09': [],
  'E14-13': []
};

/** @type {readonly EngineStep[]} */
const STEP_ORDER = ['E14-02', 'E14-03', 'E14-04', 'E14-05', 'E14-07', 'E14-09', 'E14-13'];

/**
 * Every step a failure in `readBy` reaches: the direct readers and everything downstream.
 * @param {readonly EngineStep[]} readBy
 * @returns {EngineStep[]}
 */
export function affectedSteps(readBy) {
  const out = /** @type {Set<EngineStep>} */ (new Set());
  /** @param {EngineStep} s */
  const walk = (s) => {
    if (out.has(s)) return;
    out.add(s);
    FEEDS_INTO[s].forEach(walk);
  };
  readBy.forEach(walk);
  return STEP_ORDER.filter((s) => out.has(s));
}

// ── Checks ──────────────────────────────────────────────────────────────────

/**
 * @typedef {| 'duplicateKey'
 *   | 'materialResolves'
 *   | 'uomMatchesMaster'
 *   | 'qtyPositive'
 *   | 'approvedSource'
 *   | 'lineExists'
 *   | 'fromDiffersTo'
 *   | 'afterLineCreated'
 *   | 'receivedNonZero'
 *   | 'leadTimePositive'
 *   | 'moqNonNegative'
 *   | 'multipleAtLeastOne'
 *   | 'sharesSumToOne'
 *   | 'qtyPerPositive'
 *   | 'componentResolves'
 *   | 'validityNoOverlap'
 *   | 'activeFgHasBom'
 *   | 'noBomCycle'
 *   | 'onHandNonNegative'
 *   | 'warehouseExists'
 *   | 'stockAccuracy'
 *   | 'capacityPositive'
 *   | 'unitsPerPalletPositive'
 *   | 'stockedHasVolume'
 *   | 'valuePositive'
 *   | 'purchasedHasValue'
 *   | 'brandKnown'
 *   | 'launchBeforeDiscontinue'
 *   | 'qtyNonNegative'
 *   | 'noWeekGaps'
 *   | 'fgKnown'} CheckId
 */

/** @typedef {'refuse' | 'flag'} CheckSeverity */

/** One failing record: its key as the feed spec names it, and what failed. */
/**
 * @typedef {object} CheckFailure
 * @property {string} key
 * @property {string} detail
 */

/**
 * @typedef {object} CheckResult
 * @property {CheckId} check
 * @property {CheckSeverity} severity
 * @property {number} checked -  Records (or, for a coverage check, the items) the check looked at.
 * @property {readonly CheckFailure[]} failures
 * @property {boolean} passed
 */

/**
 * @typedef {object} DataHealthContext
 * @property {(materialCode: string) => Uom | null} masterUom -  The material master's base unit for a code, or null when the master cannot resolve it (C8 §4.0).
 */

/** @typedef {'fresh' | 'stale' | 'missing' | 'noLimit'} Freshness */

/** The newest stock snapshot of one warehouse against the stock feed's limit. */
/**
 * @typedef {object} WarehouseStockCurrency
 * @property {string} warehouseId
 * @property {IsoDate | null} latestSnapshot
 * @property {number | null} ageDays
 * @property {Freshness} freshness
 * @property {readonly string[]} materials -  Materials whose stock that warehouse holds — what stale stock would mark in E14-03.
 */

/**
 * @typedef {object} FeedHealth
 * @property {FeedId} feed
 * @property {string} entity
 * @property {FeedSource} source
 * @property {FeedRefresh} refresh
 * @property {number} records
 * @property {IsoInstant | null} lastArrival
 * @property {number | null} ageDays -  Whole days since the last arrival (rounded down); null when it never arrived.
 * @property {number | null} limitDays
 * @property {Freshness} freshness
 * @property {readonly CheckResult[]} checks
 * @property {number} refusedRecords -  Distinct records failing a refuse check — kept out of the calculation by the spec's rule.
 * @property {number} flaggedRecords -  Distinct records failing a flag check.
 * @property {readonly EngineStep[]} readBy
 * @property {readonly EngineStep[]} affects -  The steps a failure here reaches (direct readers and downstream).
 * @property {readonly WarehouseStockCurrency[]} [warehouses] -  Stock only: per warehouse, the newest snapshot against the limit.
 */

/** @typedef {'clear' | 'flagged' | 'affected'} StepStatus */

/**
 * @typedef {object} StepHealth
 * @property {EngineStep} step
 * @property {StepStatus} status -  clear — no feed it reads failed; flagged — only flag checks; affected — a refuse check failed or a feed is stale or missing.
 * @property {readonly FeedId[]} byFeeds
 */

/**
 * @typedef {object} DataHealthReport
 * @property {IsoInstant} asOf
 * @property {number} stockAccuracyTolerance
 * @property {readonly FeedHealth[]} feeds
 * @property {readonly StepHealth[]} steps
 */

/**
 * @typedef {object} DataHealthInput
 * @property {EngineDataset} data
 * @property {IsoInstant} now -  The hub clock (X-01).
 * @property {Partial<Readonly<Record<FeedId, IsoInstant>>>} arrivals -  When each feed last arrived; a feed with no entry never arrived.
 * @property {Partial<Readonly<Record<FeedId, number>>>} limitsDays -  The administrator's freshness limit per limited feed, in days (X-05).
 * @property {number} stockAccuracyTolerance -  E14-01 BR-03 / ENG-D2.
 * @property {DataHealthContext} context
 */

// ── The per-feed checks ─────────────────────────────────────────────────────

/** @typedef {{ check: CheckId; severity: CheckSeverity; checked: number; failures: CheckFailure[] }} Check */

/**
 * @param {CheckId} check
 * @param {number} checked
 * @param {CheckFailure[]} failures
 * @returns {Check}
 */
const refuse = (check, checked, failures) => ({ check, severity: 'refuse', checked, failures });

/**
 * A per-record predicate: the detail string of the failure, or null when the record passes.
 * @template T
 * @param {CheckId} check
 * @param {readonly T[]} rows
 * @param {(r: T) => string} key
 * @param {(r: T) => string | null} fails
 * @returns {Check}
 */
function eachRecord(check, rows, key, fails) {
  /** @type {CheckFailure[]} */
  const failures = [];
  for (const r of rows) {
    const why = fails(r);
    if (why !== null) failures.push({ key: key(r), detail: why });
  }
  return refuse(check, rows.length, failures);
}

/**
 * @template T
 * @param {readonly T[]} rows
 * @param {(r: T) => string} key
 * @returns {Check}
 */
function duplicates(rows, key) {
  const seen = /** @type {Map<string, number>} */ (new Map());
  for (const r of rows) seen.set(key(r), (seen.get(key(r)) ?? 0) + 1);
  const failures = [...seen.entries()]
    .filter(([, n]) => n > 1)
    .map(([k, n]) => ({ key: k, detail: `${n} records` }));
  return refuse('duplicateKey', rows.length, failures);
}

/**
 * @template {{ readonly materialCode: string }} T
 * @param {readonly T[]} rows
 * @param {(r: T) => string} key
 * @param {DataHealthContext} ctx
 * @returns {Check}
 */
function resolves(rows, key, ctx) {
  return eachRecord('materialResolves', rows, key, (r) =>
    ctx.masterUom(r.materialCode) === null ? r.materialCode : null
  );
}

const KEYS = /** @satisfies {Record<FeedId, (r: never) => string>} */ ({
  /** @param {{ poNumber: string; line: number }} r */
  poLines: (r) => lineKey(r.poNumber, r.line),
  /** @param {{ poNumber: string; line: number; at: string; field: string }} r */
  scheduleChanges: (r) => `${lineKey(r.poNumber, r.line)} · ${r.at} · ${r.field}`,
  /** @param {{ poNumber: string; line: number; confirmedAt: string }} r */
  confirmations: (r) => `${lineKey(r.poNumber, r.line)} · ${r.confirmedAt}`,
  /** @param {{ grNumber: string; poNumber: string; line: number }} r */
  receipts: (r) => `${r.grNumber} · ${lineKey(r.poNumber, r.line)}`,
  /** @param {{ supplierId: string; materialCode: string; periodBucket: string; versionNo: number }} r */
  planVersions: (r) => `${r.supplierId} · ${r.materialCode} · ${r.periodBucket} · v${r.versionNo}`,
  /** @param {{ materialCode: string; supplierId: string }} r */
  sources: (r) => `${r.materialCode} · ${r.supplierId}`,
  /** @param {{ parentCode: string; componentCode: string; validFrom: string }} r */
  bom: (r) => `${r.parentCode} · ${r.componentCode} · ${r.validFrom}`,
  /** @param {{ materialCode: string; warehouseId: string; date: string }} r */
  stock: (r) => `${r.materialCode} · ${r.warehouseId} · ${r.date}`,
  /** @param {{ materialCode: string; warehouseId: string; countDate: string }} r */
  cycleCounts: (r) => `${r.materialCode} · ${r.warehouseId} · ${r.countDate}`,
  /** @param {{ warehouseId: string }} r */
  warehouses: (r) => r.warehouseId,
  /** @param {{ materialCode: string }} r */
  volumes: (r) => r.materialCode,
  /** @param {{ materialCode: string }} r */
  materialValues: (r) => r.materialCode,
  /** @param {{ skuCode: string }} r */
  finishedGoods: (r) => r.skuCode,
  /** @param {{ skuCode: string; weekStart: string }} r */
  sales: (r) => `${r.skuCode} · ${r.weekStart}`,
  /** @param {{ skuCode: string; madeAt: string; weekStart: string }} r */
  fgPlan: (r) => `${r.skuCode} · ${r.madeAt} · ${r.weekStart}`,
  /** @param {{ skuCode: string; weekStart: string }} r */
  salesOrders: (r) => `${r.skuCode} · ${r.weekStart}`,
  /** @param {{ materialCode: string }} r */
  sapSafetyStock: (r) => r.materialCode
});

/** @type {ReadonlySet<string>} */
const BRANDS = new Set(['Wardah', 'Emina', 'Make Over']);
/** Shares of one material add up to 1 within this (feed spec §2.2). */
export const SHARE_TOLERANCE = 0.001;

/**
 * A BOM line in force on `day`. ⚠️ `validTo` is EXCLUSIVE, as the contract
 * (`types.js`: "valid in [validFrom, validTo)") and the engine (`bom.js`,
 * `requirement.js`) read it — the feed spec §2.2 calls it the "last valid
 * day". The checks follow the contract the calculations use (ENG-B47).
 * @param {{ validFrom: string; validTo?: string }} b
 * @param {IsoDate} day
 */
const bomValidOn = (b, day) => b.validFrom <= day && (b.validTo === undefined || day < b.validTo);

/**
 * @param {FeedId} feed
 * @param {EngineDataset} d
 * @param {IsoInstant} now
 * @param {number} tolerance
 * @param {DataHealthContext} ctx
 * @returns {Check[]}
 */
function checksFor(feed, d, now, tolerance, ctx) {
  const today = dayOf(now);
  const linesByKey = new Map(d.poLines.map((l) => [lineKey(l.poNumber, l.line), l]));
  /**
   * @template {{ poNumber: string; line: number }} T
   * @param {readonly T[]} rows
   * @param {(r: T) => string} key
   */
  const lineExists = (rows, key) =>
    eachRecord('lineExists', rows, key, (r) =>
      linesByKey.has(lineKey(r.poNumber, r.line)) ? null : lineKey(r.poNumber, r.line)
    );
  const fgs = new Set(d.finishedGoods.map((f) => f.skuCode));
  /**
   * @template {{ skuCode: string }} T
   * @param {readonly T[]} rows
   * @param {(r: T) => string} key
   */
  const fgKnown = (rows, key) =>
    eachRecord('fgKnown', rows, key, (r) => (fgs.has(r.skuCode) ? null : r.skuCode));
  const warehouses = new Set(d.warehouses.map((w) => w.warehouseId));

  switch (feed) {
    case 'poLines': {
      const sourced = new Set(d.sources.map((s) => `${s.supplierId}|${s.materialCode}`));
      const k = KEYS.poLines;
      return [
        duplicates(d.poLines, k),
        resolves(d.poLines, k, ctx),
        eachRecord('uomMatchesMaster', d.poLines, k, (l) => {
          const u = ctx.masterUom(l.materialCode);
          return u !== null && u !== l.uom ? `${l.uom} ≠ ${u}` : null;
        }),
        eachRecord('qtyPositive', d.poLines, k, (l) =>
          l.orderedQty > 0 ? null : String(l.orderedQty)
        ),
        eachRecord('approvedSource', d.poLines, k, (l) =>
          sourced.has(`${l.supplierId}|${l.materialCode}`)
            ? null
            : `${l.supplierId} × ${l.materialCode}`
        )
      ];
    }
    case 'scheduleChanges': {
      const k = KEYS.scheduleChanges;
      return [
        duplicates(d.scheduleChanges, k),
        lineExists(d.scheduleChanges, k),
        eachRecord('fromDiffersTo', d.scheduleChanges, k, (c) =>
          c.from !== c.to ? null : `${c.from} → ${c.to}`
        ),
        eachRecord('afterLineCreated', d.scheduleChanges, k, (c) => {
          const l = linesByKey.get(lineKey(c.poNumber, c.line));
          return l && Date.parse(c.at) <= Date.parse(l.createdAt)
            ? `${c.at} ≤ ${l.createdAt}`
            : null;
        })
      ];
    }
    case 'confirmations':
      return [
        duplicates(d.confirmations, KEYS.confirmations),
        lineExists(d.confirmations, KEYS.confirmations)
      ];
    case 'receipts': {
      const k = KEYS.receipts;
      return [
        duplicates(d.receipts, k),
        lineExists(d.receipts, k),
        eachRecord('receivedNonZero', d.receipts, k, (r) => (r.receivedQty !== 0 ? null : '0'))
      ];
    }
    case 'planVersions':
      return [
        duplicates(d.planVersions, KEYS.planVersions),
        resolves(d.planVersions, KEYS.planVersions, ctx)
      ];
    case 'sources': {
      const k = KEYS.sources;
      const shares = /** @type {Map<string, number>} */ (new Map());
      for (const s of d.sources)
        shares.set(s.materialCode, (shares.get(s.materialCode) ?? 0) + s.share);
      return [
        duplicates(d.sources, k),
        resolves(d.sources, k, ctx),
        eachRecord('leadTimePositive', d.sources, k, (s) =>
          s.leadTimeDays > 0 ? null : String(s.leadTimeDays)
        ),
        eachRecord('moqNonNegative', d.sources, k, (s) => (s.moq >= 0 ? null : String(s.moq))),
        eachRecord('multipleAtLeastOne', d.sources, k, (s) =>
          s.orderMultiple >= 1 ? null : String(s.orderMultiple)
        ),
        eachRecord('sharesSumToOne', d.sources, k, (s) => {
          const total = /** @type {NonNullable<ReturnType<typeof shares.get>>} */ (
            shares.get(s.materialCode)
          );
          return Math.abs(total - 1) <= SHARE_TOLERANCE
            ? null
            : `Σ ${Math.round(total * 1000) / 1000}`;
        })
      ];
    }
    case 'bom': {
      const k = KEYS.bom;
      const parents = new Set(d.bom.map((b) => b.parentCode));
      // Overlap per parent–component pair: a line starting before an earlier
      // line's (exclusive) end overlaps it; both are listed.
      const overlapping = /** @type {Set<(typeof d.bom)[number]>} */ (new Set());
      const pairs = /** @type {Map<string, (typeof d.bom)[number][]>} */ (new Map());
      for (const b of d.bom) {
        const p = `${b.parentCode}|${b.componentCode}`;
        pairs.set(p, [...(pairs.get(p) ?? []), b]);
      }
      for (const rows of pairs.values()) {
        const sorted = [...rows].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
        for (let i = 1; i < sorted.length; i++) {
          for (let j = 0; j < i; j++) {
            const prev = sorted[j];
            if (prev.validTo === undefined || prev.validTo > sorted[i].validFrom) {
              overlapping.add(prev);
              overlapping.add(sorted[i]);
            }
          }
        }
      }
      // Cycles: a parent reachable from itself through components, at any depth.
      const children = /** @type {Map<string, Set<string>>} */ (new Map());
      for (const b of d.bom)
        children.set(
          b.parentCode,
          new Set([...(children.get(b.parentCode) ?? []), b.componentCode])
        );
      const inCycle = /** @type {Set<string>} */ (new Set());
      for (const start of children.keys()) {
        const seen = /** @type {Set<string>} */ (new Set());
        const stack = [...(children.get(start) ?? [])];
        while (stack.length > 0) {
          const n = /** @type {NonNullable<ReturnType<typeof stack.pop>>} */ (stack.pop());
          if (n === start) {
            inCycle.add(start);
            break;
          }
          if (seen.has(n)) continue;
          seen.add(n);
          stack.push(...(children.get(n) ?? []));
        }
      }
      const active = d.finishedGoods.filter(
        (f) =>
          f.launchDate <= today && (f.discontinueDate === undefined || f.discontinueDate >= today)
      );
      const withBom = new Set(d.bom.filter((b) => bomValidOn(b, today)).map((b) => b.parentCode));
      return [
        duplicates(d.bom, k),
        eachRecord('qtyPerPositive', d.bom, k, (b) => (b.qtyPer > 0 ? null : String(b.qtyPer))),
        // A component is a material the master resolves, or a bulk that is itself a parent.
        eachRecord('componentResolves', d.bom, k, (b) =>
          ctx.masterUom(b.componentCode) !== null || parents.has(b.componentCode)
            ? null
            : b.componentCode
        ),
        eachRecord('validityNoOverlap', d.bom, k, (b) =>
          overlapping.has(b) ? `${b.validFrom} – ${b.validTo ?? '…'}` : null
        ),
        eachRecord(
          'activeFgHasBom',
          active,
          (f) => f.skuCode,
          (f) => (withBom.has(f.skuCode) ? null : f.skuCode)
        ),
        eachRecord('noBomCycle', d.bom, k, (b) => (inCycle.has(b.parentCode) ? b.parentCode : null))
      ];
    }
    case 'stock': {
      const k = KEYS.stock;
      return [
        duplicates(d.stock, k),
        resolves(d.stock, k, ctx),
        eachRecord('onHandNonNegative', d.stock, k, (s) =>
          s.onHandQty >= 0 ? null : String(s.onHandQty)
        ),
        eachRecord('warehouseExists', d.stock, k, (s) =>
          warehouses.has(s.warehouseId) ? null : s.warehouseId
        )
      ];
    }
    case 'cycleCounts': {
      const k = KEYS.cycleCounts;
      // Stock accuracy on the LATEST count per material × warehouse (stock.js).
      const flagged = stockAccuracy(d.cycleCounts, tolerance).filter((a) => a.flagged);
      return [
        duplicates(d.cycleCounts, k),
        resolves(d.cycleCounts, k, ctx),
        {
          check: 'stockAccuracy',
          severity: 'flag',
          checked: stockAccuracy(d.cycleCounts, tolerance).length,
          failures: flagged.map((a) => ({
            key: `${a.materialCode} · ${a.warehouseId} · ${a.countDate}`,
            detail: a.gap === null ? 'system 0' : `${Math.round(a.gap * 1000) / 10}%`
          }))
        }
      ];
    }
    case 'warehouses':
      return [
        duplicates(d.warehouses, KEYS.warehouses),
        eachRecord('capacityPositive', d.warehouses, KEYS.warehouses, (w) =>
          w.capacityPallets > 0 ? null : String(w.capacityPallets)
        )
      ];
    case 'volumes': {
      const k = KEYS.volumes;
      const hasVolume = new Set(d.volumes.map((v) => v.materialCode));
      const stocked = [...new Set(d.stock.map((s) => s.materialCode))].sort();
      return [
        duplicates(d.volumes, k),
        resolves(d.volumes, k, ctx),
        eachRecord('unitsPerPalletPositive', d.volumes, k, (v) =>
          v.unitsPerPallet > 0 ? null : String(v.unitsPerPallet)
        ),
        eachRecord(
          'stockedHasVolume',
          stocked,
          (m) => m,
          (m) => (hasVolume.has(m) ? null : m)
        )
      ];
    }
    case 'materialValues': {
      const k = KEYS.materialValues;
      const valued = new Set(d.materialValues.map((v) => v.materialCode));
      const purchased = [...new Set(d.sources.map((s) => s.materialCode))].sort();
      return [
        duplicates(d.materialValues, k),
        resolves(d.materialValues, k, ctx),
        eachRecord('valuePositive', d.materialValues, k, (v) =>
          v.unitValueIdr > 0 ? null : String(v.unitValueIdr)
        ),
        eachRecord(
          'purchasedHasValue',
          purchased,
          (m) => m,
          (m) => (valued.has(m) ? null : m)
        )
      ];
    }
    case 'finishedGoods': {
      const k = KEYS.finishedGoods;
      return [
        duplicates(d.finishedGoods, k),
        eachRecord('brandKnown', d.finishedGoods, k, (f) => (BRANDS.has(f.brand) ? null : f.brand)),
        eachRecord('launchBeforeDiscontinue', d.finishedGoods, k, (f) =>
          f.discontinueDate === undefined || f.launchDate <= f.discontinueDate
            ? null
            : `${f.launchDate} > ${f.discontinueDate}`
        )
      ];
    }
    case 'sales': {
      const k = KEYS.sales;
      // No gaps: every Monday from a SKU's first week to its last has a record.
      const weeks = /** @type {Map<string, Set<IsoDate>>} */ (new Map());
      for (const s of d.sales)
        weeks.set(s.skuCode, new Set([...(weeks.get(s.skuCode) ?? []), s.weekStart]));
      /** @type {CheckFailure[]} */
      const gaps = [];
      for (const [sku, set] of [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const sorted = [...set].sort();
        for (let w = mondayOf(sorted[0]); w <= sorted[sorted.length - 1]; w = addDays(w, 7)) {
          if (!set.has(w)) gaps.push({ key: `${sku} · ${w}`, detail: sku });
        }
      }
      return [
        duplicates(d.sales, k),
        fgKnown(d.sales, k),
        eachRecord('qtyNonNegative', d.sales, k, (s) =>
          s.quantity >= 0 ? null : String(s.quantity)
        ),
        refuse('noWeekGaps', weeks.size, gaps)
      ];
    }
    case 'fgPlan':
      return [duplicates(d.fgPlan, KEYS.fgPlan), fgKnown(d.fgPlan, KEYS.fgPlan)];
    case 'salesOrders':
      return [
        duplicates(d.salesOrders, KEYS.salesOrders),
        fgKnown(d.salesOrders, KEYS.salesOrders)
      ];
    case 'sapSafetyStock':
      return [
        duplicates(d.sapSafetyStock, KEYS.sapSafetyStock),
        resolves(d.sapSafetyStock, KEYS.sapSafetyStock, ctx)
      ];
  }
}

// ── Freshness ───────────────────────────────────────────────────────────────

/**
 * Whole days from `from` to `now` (rounded down), never negative.
 * @param {IsoInstant} from
 * @param {IsoInstant} now
 * @returns {number}
 */
export const ageInDays = (from, now) =>
  Math.max(0, Math.floor((Date.parse(now) - Date.parse(from)) / DAY_MS));

/**
 * @param {number | null} ageDays
 * @param {number | null} limitDays
 * @returns {Freshness}
 */
export function freshnessOf(ageDays, limitDays) {
  if (limitDays === null) return 'noLimit';
  if (ageDays === null) return 'missing';
  return ageDays > limitDays ? 'stale' : 'fresh';
}

/**
 * @param {EngineDataset} d
 * @param {IsoDate} today
 * @param {number | null} limitDays
 * @returns {WarehouseStockCurrency[]}
 */
function warehouseCurrency(d, today, limitDays) {
  return [...d.warehouses]
    .sort((a, b) => a.warehouseId.localeCompare(b.warehouseId))
    .map((w) => {
      const rows = d.stock.filter((s) => s.warehouseId === w.warehouseId);
      const latest = rows.reduce(
        (m, s) => (m === null || s.date > m ? s.date : m),
        /** @type {IsoDate | null} */ (null)
      );
      const ageDays = latest === null ? null : Math.max(0, daysBetween(latest, today));
      return {
        warehouseId: w.warehouseId,
        latestSnapshot: latest,
        ageDays,
        freshness: freshnessOf(ageDays, limitDays),
        materials: [
          ...new Set(rows.filter((s) => s.date === latest).map((s) => s.materialCode))
        ].sort()
      };
    });
}

// ── The report ──────────────────────────────────────────────────────────────

/**
 * @param {DataHealthInput} input
 * @returns {DataHealthReport}
 */
export function dataHealth(input) {
  const { data, now, arrivals, limitsDays, stockAccuracyTolerance, context } = input;
  const today = dayOf(now);
  /** @type {FeedHealth[]} */
  const feeds = FEEDS.map((def) => {
    const lastArrival = arrivals[def.feed] ?? null;
    const ageDays = lastArrival === null ? null : ageInDays(lastArrival, now);
    const limitDays = def.limited ? (limitsDays[def.feed] ?? null) : null;
    if (def.limited && limitDays === null)
      throw new Error(
        `NO_FRESHNESS_LIMIT: feed '${def.feed}' has a limit in the feed spec but none was passed`
      );
    /** @type {CheckResult[]} */
    const checks = checksFor(def.feed, data, now, stockAccuracyTolerance, context).map((c) => ({
      ...c,
      passed: c.failures.length === 0
    }));
    /** @param {CheckSeverity} sev */
    const distinct = (sev) =>
      new Set(checks.filter((c) => c.severity === sev).flatMap((c) => c.failures.map((f) => f.key)))
        .size;
    let freshness = freshnessOf(ageDays, limitDays);
    const warehouses = def.feed === 'stock' ? warehouseCurrency(data, today, limitDays) : undefined;
    // A feed that arrived on time but carries a warehouse whose newest snapshot
    // is older than the limit is stale for that warehouse — and so, as a feed.
    if (
      freshness === 'fresh' &&
      warehouses?.some((w) => w.freshness === 'stale' || w.freshness === 'missing')
    )
      freshness = 'stale';
    return {
      feed: def.feed,
      entity: def.entity,
      source: def.source,
      refresh: def.refresh,
      records: data[def.feed].length,
      lastArrival,
      ageDays,
      limitDays,
      freshness,
      checks,
      refusedRecords: distinct('refuse'),
      flaggedRecords: distinct('flag'),
      readBy: def.readBy,
      affects: affectedSteps(def.readBy),
      ...(warehouses ? { warehouses } : {})
    };
  });

  /** @type {StepHealth[]} */
  const steps = STEP_ORDER.map((step) => {
    const reaching = feeds.filter((f) => f.affects.includes(step));
    const bad = reaching.filter(
      (f) => f.refusedRecords > 0 || f.freshness === 'stale' || f.freshness === 'missing'
    );
    const flagged = reaching.filter((f) => f.flaggedRecords > 0);
    return {
      step,
      status: bad.length > 0 ? 'affected' : flagged.length > 0 ? 'flagged' : 'clear',
      byFeeds: (bad.length > 0 ? bad : flagged).map((f) => f.feed)
    };
  });

  return { asOf: now, stockAccuracyTolerance, feeds, steps };
}
