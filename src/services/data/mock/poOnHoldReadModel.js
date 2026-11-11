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
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { consumptionStore } from './stores/consumptionStore';
import { poOnHoldStore } from './stores/poOnHoldStore';
import { withLeadTime } from './leadTimeReadModel';
import { maxStockFor } from '../../transitions/maxStock';
import { osipParamKey } from '../../transitions/osipParams';
import { blanketBalances, openSupplyIndex } from '../../transitions/supplyBelowDemandRules';
import { isReleased } from '../../transitions/callOffRules';
import { mondayOf, dayOf } from '../../transitions/inventoryRules';
import { lastMovementDay, POSTED_RECEIPT_STATUSES } from '../../transitions/stockMovement';
import { executionStanding, planExecution } from '../../transitions/poOnHoldExecution';
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
 * `execution`:  PEX-8 BR-02/BR-05 — the end of the grace period: `scheduled` (grace running), `due`, `blocked` (a fact is missing, see `plan.blocked`) or `executed`. `plan` is the read-only preview (what it would do now, or what it did); `record` is the ledger row once it ran.
 * `closed`:  True for a line that left hold after its execution: kept so the panel still says what was created.
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
 *   readonly pipoIsDefault: boolean;
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
 *   readonly closed: boolean;
 *   readonly execution: {
 *     readonly status: 'scheduled' | 'due' | 'blocked' | 'executed';
 *     readonly runsOn: string;
 *     readonly plan: import('../../transitions/poOnHoldExecution').ExecutionPlan | null;
 *     readonly record: {
 *       readonly at: string;
 *       readonly actor: 'system';
 *       readonly standing: 'chosen' | 'noSupplierResponse';
 *       readonly callOffIds: readonly string[];
 *     } | null;
 *   };
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
  // Call-offs an execution made (`origin: 'poOnHold'`) are the remainder itself,
  // not supply DA already counts: left out of the DA week figures, so the
  // quantity they took leaves hold (OSPO falls, DA not yet called off does not).
  const supply = openSupplyIndex(callOffs.filter((c) => c.origin !== 'poOnHold'));
  // FG absorbed on a PO line (PEX-8 BR-03) is no longer open PO quantity.
  /** @type {Map<string, number>} */
  const absorbedOnLine = new Map();
  for (const e of poOnHoldStore.executions())
    for (const a of e.plan.absorbed)
      absorbedOnLine.set(a.lineId, (absorbedOnLine.get(a.lineId) ?? 0) + a.qty);
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
    const lines = blanketBalances(pos, callOffs, supplierId, materialCode).map((l) => ({
      poId: l.poId,
      poNumber: l.poNumber,
      lineId: l.lineId,
      balance: Math.max(0, l.balance - (absorbedOnLine.get(l.lineId) ?? 0))
    }));
    const ospo = lines.reduce((n, l) => n + l.balance, 0);
    // The need date a week's call-off already has: the earliest, from regular call-offs.
    /** @type {Map<string, string>} */
    const needOf = new Map();
    for (const c of callOffs)
      if (
        c.supplierId === supplierId &&
        c.materialCode === materialCode &&
        c.origin !== 'poOnHold' &&
        isReleased(c)
      ) {
        const w = mondayOf(dayOf(c.needDate));
        const cur = needOf.get(w);
        if (cur === undefined || dayOf(c.needDate) < cur) needOf.set(w, dayOf(c.needDate));
      }
    const weeks = da
      ? da.plan.horizonWeeks.map((w, i) => ({
          week: w,
          needDate: needOf.get(w) ?? null,
          da: da.plan.daInForce[i] ?? 0,
          calledOff: supply.get(`${supplierId}|${materialCode}|${w}`) ?? 0
        }))
      : [];
    const notCalled = daNotCalledOff(weeks);
    const qty = poOnHoldQty({ ospo, daNotCalledOff: notCalled });
    if (qty > 0)
      figures.push({ key, supplierId, materialCode, ospo, notCalled, qty, weeks, lines });
  }
  const firstDays = poOnHoldStore.observe(
    figures.map((f) => f.key),
    day
  );

  const live = figures
    .map((f) => {
      const entry = materialEntry(f.materialCode);
      const grace = settingOf('grace', f.supplierId, f.materialCode);
      const noMove = settingOf('noMove', f.supplierId, f.materialCode);
      const firstDay = firstDays.get(f.key) ?? day;
      const gs = graceState(day, firstDay, grace.days);
      const demand = f.weeks.reduce((n, w) => n + w.da, 0);
      // PEX-7 BR-03 [Proposed]: a goods receipt posted or goods issue recorded
      // on the material in the last N working days. Not a balance change.
      const lastMove = lastMovementDay({
        receiptDays: goodsReceiptStore
          .all()
          .filter((g) => POSTED_RECEIPT_STATUSES.includes(g.status))
          .filter((g) =>
            pos.some(
              (po) =>
                po.poNumber === g.poNumber &&
                po.lineItems.some((l) => l.materialCode === f.materialCode)
            )
          )
          .map((g) => g.receivedDate),
        consumptionWeeks: consumptionStore
          .all()
          .filter((c) => c.materialCode === f.materialCode && c.qty > 0)
          .map((c) => c.week),
        today: day
      });
      const daysSinceMovement = lastMove === null ? null : workingDaysBetween(lastMove, day);
      const sohPti = pti.find((r) => r.materialCode === f.materialCode)?.ptiSoh ?? null;
      const sohSupplier =
        positions.find((p) => p.supplierId === f.supplierId && p.materialCode === f.materialCode)
          ?.supplierSoh ?? null;
      const maxSupplier = maxStockFor(f.supplierId, f.materialCode);
      // PIPO flag per material (default no) and Max PTI per supplier × material
      // (none until a planner sets it), both in `t_osipparam_set` [Proposed].
      const pipoSet = osipParamStore.valueOf(
        osipParamKey('pipo', { materialCode: f.materialCode })
      );
      const pipo = typeof pipoSet === 'boolean' ? pipoSet : false;
      const maxPtiSet = osipParamStore.valueOf(
        osipParamKey('maxPti', { supplierId: f.supplierId, materialCode: f.materialCode })
      );
      const maxPti = typeof maxPtiSet === 'number' ? maxPtiSet : null;
      const cap = fgCap({ maxPti, maxSupplier, sohSupplier, sohPti });
      const facts = {
        pipo,
        demand,
        daysSinceMovement,
        noMoveDays: noMove.days,
        capKnown: cap !== null
      };
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
      // PEX-8 BR-02/BR-05 — the end of the grace period. The plan is what it
      // would do now (the planner's read-only preview), or what it did.
      const leadTimeDays = withLeadTime(
        /** @type {{ supplierId: string; materialCode: string; leadTimeDays?: number }} */ ({
          supplierId: f.supplierId,
          materialCode: f.materialCode
        })
      ).leadTimeDays;
      const previewOption = standing.effective ?? stored?.suggested ?? null;
      const ran = stored ? poOnHoldStore.executionOf(stored.id) : undefined;
      const plan =
        ran?.plan ??
        (previewOption
          ? planExecution({
              option: previewOption,
              qty: f.qty,
              cap,
              graceEndDay: gs.dueDay,
              leadTimeDays,
              lines: f.lines,
              weeks: f.weeks
            })
          : null);
      const execution = {
        status: executionStanding({
          executed: ran !== undefined,
          graceEnded: gs.ended && standing.effective !== null,
          blocked: plan?.blocked ?? null
        }),
        runsOn: gs.dueDay,
        plan,
        record: ran
          ? {
              at: ran.at,
              actor: ran.actor,
              standing: ran.standing,
              callOffIds: ran.callOffIds
            }
          : null
      };
      return withLeadTime({
        closed: false,
        execution,
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
        pipo,
        pipoIsDefault: typeof pipoSet !== 'boolean',
        daysSinceMovement,
        maxPti,
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
  // An executed line whose quantity has left hold (FS: the call-off took it all)
  // is kept, so the panel still says what the execution created.
  const closed = poOnHoldStore
    .executions()
    .filter(
      (e) =>
        !live.some(
          (r) =>
            r.supplierId === e.supplierId &&
            r.materialCode === e.materialCode &&
            r.grace.firstDay === e.firstDay
        )
    )
    .map((e) => {
      const snap = /** @type {PoOnHoldRow} */ (/** @type {unknown} */ (e.snapshot));
      return {
        ...snap,
        key: `${snap.key}|done|${e.decisionId}`,
        closed: true,
        qty: 0,
        decision: snap.decision
          ? {
              ...snap.decision,
              history: [
                ...snap.decision.history,
                /** @type {import('../../transitions/poOnHold').DecisionEvent} */ ({
                  kind: 'executed',
                  option: e.option,
                  at: e.at,
                  actor: e.actor
                })
              ]
            }
          : null,
        execution: {
          status: /** @type {const} */ ('executed'),
          runsOn: snap.execution.runsOn,
          plan: e.plan,
          record: {
            at: e.at,
            actor: e.actor,
            standing: e.standing,
            callOffIds: e.callOffIds
          }
        }
      };
    });
  return [...live, ...closed];
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
    (r) => !r.closed && r.supplierId === supplierId && r.materialCode === materialCode
  );
}
