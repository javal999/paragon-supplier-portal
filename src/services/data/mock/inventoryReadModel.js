// ────────────────────────────────────────────────────────────────────────────
// The inventory & capacity read model over the mock stores (REQ-E08-01 to 05).
//
// ONE place gathers the stores and hands them to the pure rules
// (`inventoryRules`, `capacityRules`, `inventoryAlertRules`), so the read
// service, the command targets (sync, capacity, alert close) and the alert
// ledger all see the same positions. Nothing computed here is stored — except
// the alert ledger's `cleared` marks, appended by `observeAlertConditions`,
// which is what lets a closed alert reopen only after its condition cleared.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CapacityPlan, InventoryAlert, InventoryPosition, StockAccessGrant } from '../types' */
import { mockSuppliers } from '@data/mockSuppliers';
import {
  FORECAST_PUBLICATIONS,
  SUPPLIER_MATERIAL_RELATIONSHIPS,
  currentPublication,
  materialEntry,
  sdcClock
} from '../../sdc';
import { callOffCoverSubjects, callOffViews } from '../../transitions/callOffRules';
import { buildInventoryPositions } from '../../transitions/inventoryRules';
import { buildCapacityPlans } from '../../transitions/capacityRules';
import { commitmentAlertSubjects } from '../../transitions/forecastRules';
import { allCommitmentLines } from './forecastReadModel';
/** @import { AlertCondition } from '../../transitions/inventoryAlertRules' */
import {
  alertsFromLedger,
  clearedSince,
  deriveAlertConditions,
  discontinuedSubjects
} from '../../transitions/inventoryAlertRules';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { asnStore } from './stores/asnStore';
import { callOffStore } from './stores/callOffStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import {
  capacityStore,
  inventoryAlertLedger,
  stockAccessStore,
  stockSyncStore
} from './stores/inventoryHubStores';
/** @import { ApiStockFigure } from './fixtures/inventoryHub' */
import {
  API_CONNECTIONS,
  PLANNING_DAILY_DEMAND,
  PTI_STOCK,
  SUPPLIER_LEAD_TIME_DAYS,
  SUPPLY_ASSIGNMENTS
} from './fixtures/inventoryHub';
import { stockUpdateModeOf } from './supplierMaster';
import { hubWorkingCalendar } from '../../transitions/workingCalendarStore';
import { planningGroupMoves } from './planningGroupReadModel';

/**
 * @param {string} supplierId
 * @returns {string}
 */
export const supplierNameOf = (supplierId) =>
  mockSuppliers.find((s) => s.id === supplierId)?.name ?? supplierId;

/**
 * Material A1 (AR-06) — THE one answer to "is this supplier API-connected?":
 * its governed stock update mode, through the supplier resolver. Every reader
 * (the positions, the pages through them, the sync verbs' policy hook) asks
 * this, never the sample connection list.
 * @param {string} supplierId
 * @returns {boolean}
 */
export const isApiConnected = (supplierId) => stockUpdateModeOf(supplierId) === 'api';

/** What one simulated pull of a supplier's system returns. */
/**
 * @typedef {| { readonly outcome: 'success'; readonly figures: readonly ApiStockFigure[] }
 *   | { readonly outcome: 'failed'; readonly errorKey: string }} SimulatedPull
 */

/**
 * THE SYNC OUTCOME READ — the only place the sample connection list is read by
 * key. An API supplier the list holds answers as the list says; one it does not
 * hold has no connection details at all, so the pull fails with `NO_ENDPOINT`
 * rather than `timeout` ("we have no endpoint" is not "their system did not
 * answer", and the planner acts differently on each).
 * @param {string} supplierId
 * @returns {SimulatedPull}
 */
export const simulatedPullOf = (supplierId) =>
  Object.prototype.hasOwnProperty.call(API_CONNECTIONS, supplierId)
    ? API_CONNECTIONS[supplierId]
    : { outcome: 'failed', errorKey: 'NO_ENDPOINT' };

/**
 * Is this material assigned to the supplier? The hub's supply assignments, or
 * a material PTI already collaborates with the supplier on (a relationship or a
 * forecast line) — the same membership the stock declaration verb accepts.
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {boolean}
 */
export function isAssignedMaterial(supplierId, materialCode) {
  return (
    SUPPLY_ASSIGNMENTS.some(
      (a) => a.supplierId === supplierId && a.materialCode === materialCode
    ) ||
    SUPPLIER_MATERIAL_RELATIONSHIPS.some(
      (r) => r.supplierId === supplierId && r.materialCode === materialCode
    ) ||
    FORECAST_PUBLICATIONS.some((p) =>
      p.lines.some((l) => l.supplierId === supplierId && l.materialCode === materialCode)
    )
  );
}

/**
 * Material C2 — the materials assigned to a supplier (the same membership as
 * `isAssignedMaterial`), known to the material master, sorted by code.
 * @param {string} supplierId
 * @returns {string[]}
 */
export function assignedMaterialCodesOf(supplierId) {
  const codes = /** @type {Set<string>} */ (new Set());
  for (const a of SUPPLY_ASSIGNMENTS) if (a.supplierId === supplierId) codes.add(a.materialCode);
  for (const r of SUPPLIER_MATERIAL_RELATIONSHIPS)
    if (r.supplierId === supplierId) codes.add(r.materialCode);
  for (const p of FORECAST_PUBLICATIONS)
    for (const l of p.lines) if (l.supplierId === supplierId) codes.add(l.materialCode);
  return [...codes].filter((c) => materialEntry(c)).sort();
}

/**
 * The inventory rows: every supply assignment, plus any pair a supplier has
 * submitted stock for. Material E2 — the stock simulation lists the same pairs.
 * @returns {{ supplierId: string; materialCode: string }[]}
 */
export function assignments() {
  const pairs = /** @type {Map<string, { supplierId: string; materialCode: string }>} */ (
    new Map()
  );
  for (const a of SUPPLY_ASSIGNMENTS) pairs.set(`${a.supplierId}|${a.materialCode}`, a);
  for (const d of inventoryDeclarationStore.all()) {
    const k = `${d.supplierId}|${d.materialCode}`;
    if (!pairs.has(k) && materialEntry(d.materialCode))
      pairs.set(k, { supplierId: d.supplierId, materialCode: d.materialCode });
  }
  return [...pairs.values()];
}

/**
 * Material B3 — the supplier × material pairs the weekly update is judged on:
 * the inventory rows, so the compliance measure counts the materials the stock
 * page shows (MR-2 BR-02).
 * @returns {{ supplierId: string; materialCode: string }[]}
 */
export const stockUpdateAssignments = () => assignments();

/**
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {number | null}
 */
const planningEstimate = (supplierId, materialCode) =>
  PLANNING_DAILY_DEMAND[`${supplierId}|${materialCode}`] ?? null;

/**
 * CR-24 — the supplier lead time on record, or null (sample master data).
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {number | null}
 */
export const leadTimeOf = (supplierId, materialCode) =>
  SUPPLIER_LEAD_TIME_DAYS[`${supplierId}|${materialCode}`] ?? null;

const forecastLines = () => currentPublication(FORECAST_PUBLICATIONS)?.lines ?? [];

/**
 * PTI's unmasked view of every position, as of the simulated clock.
 * @param {string} [nowIso]
 * @returns {InventoryPosition[]}
 */
export function allPositions(nowIso = sdcClock.now()) {
  return buildInventoryPositions(
    {
      assignments: assignments(),
      declarations: inventoryDeclarationStore.all(),
      currentDeclaration: (s, m) => inventoryDeclarationStore.latestFor(s, m),
      master: materialEntry,
      supplierName: supplierNameOf,
      ptiStock: PTI_STOCK,
      forecastLines: forecastLines(),
      planningEstimate,
      leadTime: leadTimeOf,
      asns: asnStore.all(),
      callOffViews: callOffViews(
        callOffStore.all(),
        asnStore.all(),
        goodsReceiptStore.all(),
        nowIso
      ),
      apiConnected: isApiConnected,
      syncAttempts: stockSyncStore.all(),
      updateModeAt: stockUpdateModeOf,
      calendar: hubWorkingCalendar()
    },
    nowIso
  );
}

/**
 * The capacity rows: every inventory row, plus every supplier × material the
 * current forecast versions give an LTP to. BL-133 (ENG-D19): a supplier cannot
 * submit a commitment until it has confirmed the week's capacity, so every
 * group it has an LTP in must be a group it CAN confirm capacity for.
 * @returns {{ supplierId: string; materialCode: string }[]}
 */
function capacityAssignments() {
  const pairs = new Map(assignments().map((a) => [`${a.supplierId}|${a.materialCode}`, a]));
  for (const l of allCommitmentLines(null)) {
    const k = `${l.supplierId}|${l.materialCode}`;
    if (!pairs.has(k) && materialEntry(l.materialCode))
      pairs.set(k, { supplierId: l.supplierId, materialCode: l.materialCode });
  }
  return [...pairs.values()];
}

/**
 * Every supplier × planning group with capacity against demand (MR-8 BR-04).
 * @param {string} [nowIso]
 * @returns {CapacityPlan[]}
 */
export function allCapacityPlans(nowIso = sdcClock.now()) {
  return buildCapacityPlans(
    {
      assignments: capacityAssignments(),
      master: materialEntry,
      supplierName: supplierNameOf,
      submissions: capacityStore.all(),
      // Owner, 2026-09-29 — the LTP is the one capacity demand figure.
      ltpLines: allCommitmentLines(null),
      // Material C5 (MR-8 BR-05) — the planning-group moves, for "Needs re-entry".
      moves: planningGroupMoves()
    },
    nowIso
  );
}

/**
 * The active alert conditions now.
 * @param {string} [nowIso]
 * @returns {AlertCondition[]}
 */
export function activeAlertConditions(nowIso = sdcClock.now()) {
  const plans = allCapacityPlans(nowIso);
  const lines = allCommitmentLines();
  return deriveAlertConditions(
    allPositions(nowIso),
    plans,
    nowIso,
    // REQ-E08-05 BR-01 — commitments below forecast beyond tolerance (REQ-E06-03).
    commitmentAlertSubjects(lines),
    // MR-6 BR-13 (AR-13) — confirmed call-offs the supplier's stock must cover.
    callOffCoverSubjects(
      callOffViews(callOffStore.all(), asnStore.all(), goodsReceiptStore.all(), nowIso)
    ),
    // CAP-4 BR-03 (CAP-D2) — a Discontinued reason: find another source.
    discontinuedSubjects(plans, lines, (code) => materialEntry(code)?.label ?? code, nowIso)
  );
}

/**
 * Every alert (open and closed) with the ledger applied.
 * @param {string} [nowIso]
 * @returns {InventoryAlert[]}
 */
export function allAlerts(nowIso = sdcClock.now()) {
  return alertsFromLedger(activeAlertConditions(nowIso), inventoryAlertLedger.all());
}

/**
 * Record, for every closed alert whose condition is no longer active, the moment
 * it cleared (REQ-E08-05 BR-05). Called after each successful command, because
 * only a command can change the figures a condition reads.
 * @param {string} [nowIso]
 * @returns {void}
 */
export function observeAlertConditions(nowIso = sdcClock.now()) {
  if (inventoryAlertLedger.all().length === 0) return;
  const active = new Set(activeAlertConditions(nowIso).map((c) => c.key));
  inventoryAlertLedger.append(clearedSince(active, inventoryAlertLedger.all(), nowIso));
}

/**
 * A supplier's grant, or undefined.
 * @param {string} supplierId
 * @returns {StockAccessGrant | undefined}
 */
export const grantFor = (supplierId) => stockAccessStore.get(supplierId);

/**
 * Suppliers that appear in the inventory model (for the access page).
 * @returns {{ supplierId: string; supplierName: string; materials: string[] }[]}
 */
export function suppliersWithAssignments() {
  const bySupplier = /** @type {Map<string, string[]>} */ (new Map());
  for (const a of assignments())
    bySupplier.set(a.supplierId, [...(bySupplier.get(a.supplierId) ?? []), a.materialCode]);
  return [...bySupplier.entries()]
    .map(([supplierId, materials]) => ({
      supplierId,
      supplierName: supplierNameOf(supplierId),
      materials: materials.sort()
    }))
    .sort((a, b) => a.supplierName.localeCompare(b.supplierName));
}
