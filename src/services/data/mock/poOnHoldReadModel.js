// ────────────────────────────────────────────────────────────────────────────
// PO ON HOLD — PEX-7 (BL-270, BL-272) and PEX-8 (BL-271): the read model over
// the mock stores. Hands the figures to the pure rules (`transitions/poOnHold`)
// and merges the stored first day and decision. Nothing computed here is stored
// except the first day a quantity appeared (`poOnHoldStore.observe`).
//
//   · OSPO        — the open PO quantity not yet called off: the balance of the
//                   pair's blanket lines, as the DA page reads it.
//   · DA          — the figure in force per horizon week (`allDemandAnticipation`),
//                   less the call-offs released for that week.
//   · grace, noMove — `t_osipparam_set` rows `grace|<supplier>|<material>` and
//                   `noMove|<supplier>|<material>`; 14 days when none is set.
//
// Facts the hub does not hold are passed as null, never invented, and the row
// says so: the PIPO flag (`pipo`), Max PTI (`maxPti`), and a stock movement
// record (`daysSinceMovement`, read from the PTI stock records' update time).
// ────────────────────────────────────────────────────────────────────────────

/** @import { DecisionStatus, DecisionEvent, GraceState, Outcome, PoOnHoldOption } from '../../transitions/poOnHold' */
import { materialEntry, sdcClock } from '../../sdc';
import { allDemandAnticipation } from './demandAnticipationReadModel';
import { allFeedstockRows } from './feedstockReadModel';
import { allPositions, supplierNameOf } from './inventoryReadModel';
import { callOffStore } from './stores/callOffStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { ptiStockStore } from './stores/ptiStockStore';
import { osipParamStore } from './stores/osipParamStore';
import { poOnHoldStore } from './stores/poOnHoldStore';
import { withLeadTime } from './leadTimeReadModel';
import { maxStockFor } from '../../transitions/maxStock';
import { osipParamKey } from '../../transitions/osipParams';
import { blanketBalances, openSupplyIndex } from '../../transitions/supplyBelowDemandRules';
import {
  PO_ON_HOLD_RULES,
  daNotCalledOff,
  decisionStanding,
  fgCap,
  graceState,
  workingDaysBetween,
  optionConditions,
  outcomeOf,
  poOnHoldQty,
  suggestOption
} from '../../transitions/poOnHold';

/**
 * `decision`:  The planner's suggestion and the supplier's choice for this episode; null before a suggestion.
 * `effective`:  The option that stands (PEX-8 BR-01, BR-06); null while the supplier may still choose.
 * `outcome`:  What the end of the grace period does with the quantity under `effective`.
 * `pipo`, `maxPti`, `daysSinceMovement`:  Null where the hub holds no such fact.
 *
 * @typedef {{
 *   readonly key: string;
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly materialCode: string;
 *   readonly materialLabel: string;
 *   readonly uom: string;
 *   readonly ospo: number;
 *   readonly daNotCalledOff: number;
 *   readonly demand: number;
 *   readonly qty: number;
 *   readonly grace: GraceState;
 *   readonly noMoveDays: number;
 *   readonly graceIsDefault: boolean;
 *   readonly noMoveIsDefault: boolean;
 *   readonly pipo: boolean | null;
 *   readonly daysSinceMovement: number | null;
 *   readonly maxPti: number | null;
 *   readonly maxSupplier: number | null;
 *   readonly sohPti: number | null;
 *   readonly sohSupplier: number | null;
 *   readonly cap: number | null;
 *   readonly conditions: Readonly<Record<PoOnHoldOption, boolean>>;
 *   readonly suggestion: PoOnHoldOption | null;
 *   readonly decision: {
 *     readonly id: string;
 *     readonly suggested: PoOnHoldOption;
 *     readonly chosen: PoOnHoldOption | null;
 *     readonly history: readonly DecisionEvent[];
 *   } | null;
 *   readonly status: DecisionStatus;
 *   readonly effective: PoOnHoldOption | null;
 *   readonly outcome: Outcome | null;
 *   readonly leadTimeDays?: number;
 *   readonly leadTimeIsDefault?: boolean;
 * }} PoOnHoldRow
 */

const pk = (/** @type {string} */ s, /** @type {string} */ m) => `${s}|${m}`;

/**
 * The days a setting holds for a pair: its ledger value, else the default.
 * @param {'grace' | 'noMove'} param
 * @param {string} supplierId
 * @param {string} materialCode
 */
function settingOf(param, supplierId, materialCode) {
  const v = osipParamStore.valueOf(osipParamKey(param, { supplierId, materialCode }));
  const dflt = param === 'grace' ? PO_ON_HOLD_RULES.graceDays : PO_ON_HOLD_RULES.noMoveDays;
  return typeof v === 'number' ? { days: v, isDefault: false } : { days: dflt, isDefault: true };
}

/**
 * Every supplier × material with a PO On Hold quantity above 0, on the hub's
 * current day. Reading records the first day of a newly appeared quantity.
 * @param {string} [nowIso]
 * @returns {PoOnHoldRow[]}
 */
export function allPoOnHold(nowIso = sdcClock.now()) {
  const day = nowIso.slice(0, 10);
  const pos = purchaseOrderStore.all();
  const callOffs = callOffStore.all();
  const supply = openSupplyIndex(callOffs);
  const das = new Map(
    allDemandAnticipation(nowIso).map((r) => [pk(r.supplierId, r.materialCode), r])
  );
  // Pairs: every pair DA names, and every pair with a PO (a PO with no DA at all is fully on hold).
  /** @type {Map<string, import('../../transitions/demandAnticipationRules').DemandAnticipationRow | undefined>} */
  const pairs = new Map(das);
  for (const f of allFeedstockRows(nowIso))
    if (!pairs.has(pk(f.supplierId, f.materialCode)))
      pairs.set(pk(f.supplierId, f.materialCode), undefined);

  const positions = allPositions(nowIso);
  const pti = ptiStockStore.combined();
  const figures = [];
  for (const [key, da] of pairs) {
    const [supplierId, materialCode] = key.split('|');
    const ospo = blanketBalances(pos, callOffs, supplierId, materialCode).reduce(
      (n, l) => n + l.balance,
      0
    );
    const weeks = da
      ? da.plan.horizonWeeks.map((w, i) => ({
          da: da.plan.daInForce[i] ?? 0,
          calledOff: supply.get(`${supplierId}|${materialCode}|${w}`) ?? 0
        }))
      : [];
    const notCalled = daNotCalledOff(weeks);
    const qty = poOnHoldQty({ ospo, daNotCalledOff: notCalled });
    if (qty > 0) figures.push({ key, supplierId, materialCode, ospo, notCalled, qty, weeks });
  }
  const firstDays = poOnHoldStore.observe(
    figures.map((f) => f.key),
    day
  );

  return figures
    .map((f) => {
      const entry = materialEntry(f.materialCode);
      const grace = settingOf('grace', f.supplierId, f.materialCode);
      const noMove = settingOf('noMove', f.supplierId, f.materialCode);
      const firstDay = firstDays.get(f.key) ?? day;
      const gs = graceState(day, firstDay, grace.days);
      const demand = f.weeks.reduce((n, w) => n + w.da, 0);
      const stamps = ptiStockStore
        .forMaterial(f.materialCode)
        .map((r) => r.updatedAt)
        .filter((s) => typeof s === 'string')
        .sort();
      const lastMove = stamps.length > 0 ? String(stamps[stamps.length - 1]).slice(0, 10) : null;
      const daysSinceMovement = lastMove === null ? null : workingDaysBetween(lastMove, day);
      const sohPti = pti.find((r) => r.materialCode === f.materialCode)?.ptiSoh ?? null;
      const sohSupplier =
        positions.find((p) => p.supplierId === f.supplierId && p.materialCode === f.materialCode)
          ?.supplierSoh ?? null;
      const maxSupplier = maxStockFor(f.supplierId, f.materialCode);
      // The hub holds no PIPO flag and stores no Max PTI per material: null, not a guess.
      const facts = { pipo: null, demand, daysSinceMovement, noMoveDays: noMove.days };
      const cap = fgCap({ maxPti: null, maxSupplier, sohSupplier, sohPti });
      const stored = poOnHoldStore
        .all()
        .filter(
          (d) =>
            d.supplierId === f.supplierId &&
            d.materialCode === f.materialCode &&
            d.firstDay === firstDay
        )
        .slice(-1)[0];
      const standing = decisionStanding({
        suggested: stored?.suggested ?? null,
        chosen: stored?.chosen ?? null,
        graceEnded: gs.ended
      });
      return withLeadTime({
        key: f.key,
        supplierId: f.supplierId,
        supplierName: supplierNameOf(f.supplierId),
        materialCode: f.materialCode,
        materialLabel: entry?.label ?? f.materialCode,
        uom: entry?.canonicalUom ?? '',
        ospo: f.ospo,
        daNotCalledOff: f.notCalled,
        demand,
        qty: f.qty,
        grace: gs,
        noMoveDays: noMove.days,
        graceIsDefault: grace.isDefault,
        noMoveIsDefault: noMove.isDefault,
        pipo: null,
        daysSinceMovement,
        maxPti: null,
        maxSupplier,
        sohPti,
        sohSupplier,
        cap,
        conditions: optionConditions(facts),
        suggestion: suggestOption(facts),
        decision: stored
          ? {
              id: stored.id,
              suggested: stored.suggested,
              chosen: stored.chosen,
              history: stored.history
            }
          : null,
        status: standing.status,
        effective: standing.effective,
        outcome: standing.effective ? outcomeOf(standing.effective, f.qty, cap) : null
      });
    })
    .sort(
      (a, b) =>
        a.supplierName.localeCompare(b.supplierName) || a.materialCode.localeCompare(b.materialCode)
    );
}

/**
 * One pair's line, or undefined when nothing is on hold for it.
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string} [nowIso]
 * @returns {PoOnHoldRow | undefined}
 */
export function poOnHoldFor(supplierId, materialCode, nowIso = sdcClock.now()) {
  return allPoOnHold(nowIso).find(
    (r) => r.supplierId === supplierId && r.materialCode === materialCode
  );
}
