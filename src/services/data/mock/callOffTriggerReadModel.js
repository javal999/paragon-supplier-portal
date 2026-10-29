// ────────────────────────────────────────────────────────────────────────────
// BL-199 (DRC-13, DRC-D12) — the call-off trigger at ROP Fisik, against the
// hub's stores.
//
// ONE place gathers what the pure rules (`callOffTriggerRules`) read:
//   · PTI SOH per plant — `ptiStockStore`, the hub's stock records until the
//     eWM feed is connected (BR-04 [Owner F2]);
//   · ROP Fisik and Max per supplier — Task A's `osipRops` over wave 2's
//     `osipSafety`, at the level in force and the NPD rule in force, exactly as
//     `systemRopSuppliers` reads them; summed per material (`materialRop`);
//   · the blanket lines with balance — CAP-12's `blanketBalances` per supplier,
//     each with that supplier's MPQ (orderMultiple, the wave 2 default), its
//     replenishment cycle f (its own, else by supply area; DRC-14, Team B6),
//     and [Team F5] its minimum delivery quantity (MDQ = MOQ) with the unit
//     max stock rounds to (`maxRoundingUnit`);
//   · released call-offs not yet received — the call-off store against the
//     goods receipts (`deliveryResults`).
//
// `observeCallOffTriggers` runs the check for every material whose SOH record
// changed since the last check (BR-04: "the check runs on every PTI SOH
// update"). It runs around every command, the `observeNpdTags` precedent, and
// on the eWM refresh seam (`applyPtiStockRefresh`, MockCommandService). It
// creates drafts through the call-off target's own creation — the existing
// draft act — passed in as `createDraft`, so no second way to make a call-off
// exists. Nothing reaches SAP or a supplier: a draft waits for the planner
// [Owner F2], and a PR recommendation is a recommendation.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CallOffType } from '../types' */
/** @import { PrRecommendationView, SupplierRop, TriggerCallOff, TriggerFigures, TriggerLine, TriggerRow } from '../../transitions/callOffTriggerRules' */
/** @import { Stamped } from '../../transitions/osipRules' */
import { mockSuppliers } from '@data/mockSuppliers';
import { MATERIAL_MASTER, sdcClock } from '../../sdc';
import { addDays, dayOf } from '../../engine/dates';
import { RULES_VERSION, maxRoundingUnit, stamp, supplyAreaOf } from '../../transitions/osipRules';
import { cycleDaysOf } from '../../transitions/osipParams';
import { OSIP_ROP_READ, osipRops } from '../../transitions/osipRopRules';
import { osipSafety } from '../../transitions/osipSafetyRules';
import { deliveryResults, receiptEvents } from '../../transitions/callOffRules';
import { blanketBalances } from '../../transitions/supplyBelowDemandRules';
import {
  CALL_OFF_TRIGGER_RULES,
  allocateCallOffs,
  materialRop,
  openPrRecommendations,
  releasedNotReceived,
  sohCheck,
  triggerStep
} from '../../transitions/callOffTriggerRules';
import { osipSafetyInputs } from './osipSafetyReadModel';
import { osipRopInputs } from './osipRopReadModel';
import { callOffStore } from './stores/callOffStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { asnStore } from './stores/asnStore';
import { ptiStockStore } from './stores/ptiStockStore';
import { callOffTriggerStore } from './stores/callOffTriggerStore';

/**
 * What the draft act is handed: the `t_calloff_draft` fields, the origin and
 * the stamped figures behind the draft.
 * @typedef {{
 *   readonly poId: string;
 *   readonly poLineId: string;
 *   readonly quantity: number;
 *   readonly needDate: string;
 *   readonly type: CallOffType;
 *   readonly origin: 'ropFisik';
 *   readonly trigger: Stamped<TriggerFigures>;
 * }} TriggerDraftPayload
 */

/** @typedef {(payload: TriggerDraftPayload) => { entityId: string }} CreateTriggerDraft */

/**
 * One draft's own figures: its quantity and minimum delivery, and
 * `BELOW_MIN_DELIVERY` only when this draft is the short one (BL-232).
 * @param {TriggerFigures} figures
 * @param {TriggerCallOff} c
 * @returns {TriggerFigures}
 */
function draftFigures(figures, c) {
  const flags = figures.flags.filter((f) => f !== 'BELOW_MIN_DELIVERY');
  return {
    ...figures,
    quantity: c.qty,
    minDelivery: c.minDelivery,
    flags: c.belowMinDelivery ? [...flags, 'BELOW_MIN_DELIVERY'] : flags
  };
}

/**
 * One supplier's ROP inputs for the trigger.
 * `mdq` / `roundTo` / `f`: [Team F5, B6] the call-off quantity's inputs and the cycle.
 * @typedef {SupplierRop & {
 *   readonly mpq: number;
 *   readonly demandPerDay: number | null;
 *   readonly leadTimeDays: number;
 *   readonly mdq: number | null;
 *   readonly roundTo: number;
 *   readonly f: number | null;
 * }} SupplierTriggerRop
 */

/**
 * BL-196 — each supplier's ROP Fisik and Max per material, under the default
 * rules, the level in force and the NPD rule in force (the same read as
 * `systemRopSuppliers`).
 * @param {readonly string[]} materialCodes
 * @param {string} nowIso
 * @returns {Map<string, SupplierTriggerRop[]>}
 */
function supplierRops(materialCodes, nowIso) {
  const osip = osipSafetyInputs(nowIso);
  const codes = materialCodes.filter((c) => osip.has(c));
  const rop = osipRopInputs(codes, nowIso);
  /** @type {Map<string, SupplierTriggerRop[]>} */
  const out = new Map();
  for (const code of codes) {
    const m = /** @type {import('../../transitions/osipSafetyRules').MaterialOsipInputs} */ (
      osip.get(code)
    );
    const r = /** @type {import('../../transitions/osipRopRules').MaterialRopInputs} */ (
      rop.get(code)
    );
    const npd = r.npd[OSIP_ROP_READ.npdRule].npd;
    out.set(
      code,
      m.suppliers.map((s) => {
        const safety = osipSafety({ ...s, npd });
        const figs = osipRops(s, safety, r.level.level);
        return {
          supplierId: s.supplierId,
          ropFisik: figs.ropFisik.value,
          max: figs.max.value,
          // [Default] MPQ = orderMultiple until the master data feed carries MPQ (wave 2 default).
          mpq: s.mpq,
          demandPerDay: safety.fisik.demandPerDay,
          leadTimeDays: s.leadTimeWeeks * 7,
          // [Proposed, owner 2026-10-28] MDQ = MOQ until the master data feed carries MDQ.
          mdq: OSIP_ROP_READ.mdqSource === 'moq' && s.moq > 0 ? s.moq : null,
          roundTo: maxRoundingUnit({ area: s.supplyArea, koli: s.koli, moq: s.moq }),
          f: cycleDaysOf(s.fDays, s.supplyArea)
        };
      })
    );
  }
  return out;
}

/**
 * BR-01a — DRC-14 [Team B6]: the replenishment cycle f in days of a supplier
 * holding a blanket line but no source of the material: its supply area's.
 * @param {string} supplierId
 * @returns {number | null}
 */
function areaCycleDays(supplierId) {
  const supplier = mockSuppliers.find((s) => s.id === supplierId);
  return cycleDaysOf(null, supplier ? supplyAreaOf(supplier) : null);
}

/**
 * BR-01a — every blanket line of the material with its balance, across every
 * supplier holding one (CAP-12's balances, CAP-9's order).
 * @param {string} materialCode
 * @param {readonly SupplierTriggerRop[]} rops
 * @returns {TriggerLine[]}
 */
function triggerLines(materialCode, rops) {
  const pos = purchaseOrderStore.all();
  const suppliers = [
    ...new Set(
      pos
        .filter((po) => po.lineItems.some((l) => l.materialCode === materialCode))
        .map((po) => po.supplierId)
    )
  ];
  return suppliers.flatMap((supplierId) => {
    const r = rops.find((x) => x.supplierId === supplierId);
    const mpq = r?.mpq ?? null;
    const f = r ? r.f : areaCycleDays(supplierId);
    return blanketBalances(pos, callOffStore.all(), supplierId, materialCode).map((b) => ({
      ...b,
      supplierId,
      mpq,
      f,
      mdq: r?.mdq ?? null,
      roundTo: r?.roundTo ?? 0
    }));
  });
}

/**
 * The blanket line a draft was made on, for its stamped inputs.
 * @param {TriggerCallOff} c
 * @returns {Readonly<Record<string, unknown>>}
 */
const lineOf = (c) => ({
  poNumber: c.poNumber,
  lineId: c.lineId,
  supplierId: c.supplierId,
  balance: c.balance,
  mpq: c.mpq,
  f: c.f
});

/**
 * DRC-13 BR-04 — run the trigger for every material whose PTI SOH record
 * changed since the last check. A draft is created through `createDraft` (the
 * call-off target's creation, status Draft); a row is appended to the trigger
 * ledger when the outcome changed or the update drafted or recommended a PR.
 * @param {CreateTriggerDraft} createDraft
 * @param {string} [nowIso]
 * @returns {void}
 */
export function observeCallOffTriggers(createDraft, nowIso = sdcClock.now()) {
  const seen = callOffTriggerStore.seenSeq();
  const latest = ptiStockStore.latestSeq();
  if (latest <= seen) return;
  const changed = [
    ...new Set(
      ptiStockStore
        .all()
        .filter((r) => r.seq > seen)
        .map((r) => r.materialCode)
    )
  ].sort();
  callOffTriggerStore.markSeen(latest);
  if (changed.length === 0) return;

  const today = dayOf(nowIso);
  const ropsByMaterial = supplierRops(changed, nowIso);
  const callOffs = callOffStore.all();
  const results = deliveryResults(
    callOffs,
    receiptEvents(goodsReceiptStore.all()),
    asnStore.all(),
    nowIso
  );
  /** @type {TriggerRow[]} */
  const rows = [];
  for (const code of changed) {
    const records = ptiStockStore.forMaterial(code);
    const sohSeq = Math.max(...records.map((r) => r.seq));
    const rops = ropsByMaterial.get(code) ?? [];
    const rop = materialRop(rops);
    const check = sohCheck(records, rop?.ropFisik ?? 0);
    const openSupply = releasedNotReceived(callOffStore.all(), results, code);
    const lines = triggerLines(code, rops);
    const allocation = allocateCallOffs({
      max: rop?.max ?? 0,
      soh: check.soh,
      openSupply,
      lines
    });
    const prev = callOffTriggerStore.lastFor(code);
    const step = triggerStep(prev, {
      ropAvailable: rop !== null,
      atOrBelow: check.atOrBelow,
      pendingDraft: callOffStore.all().some((c) => c.materialCode === code && c.status === 'Draft'),
      allocation
    });
    const demands = rops.map((r) => r.demandPerDay).filter((d) => d !== null);
    /** @type {TriggerFigures} */
    const figures = {
      soh: check.soh,
      plants: check.plants,
      ropFisik: rop?.ropFisik ?? null,
      max: rop?.max ?? null,
      openSupply,
      room: allocation.room,
      quantity: step.draft ? allocation.callOffs.reduce((n, c) => n + c.qty, 0) : 0,
      prQty: step.prQty,
      demandPerDay: demands.length > 0 ? demands.reduce((n, d) => n + d, 0) : null,
      leadTimeDays: rops.length > 0 ? Math.max(...rops.map((r) => r.leadTimeDays)) : null,
      flags: [...check.flags, ...(rop?.flags ?? []), ...allocation.flags]
    };
    const inputs = {
      materialCode: code,
      at: nowIso,
      sohSeq,
      records: records.map((r) => ({ plant: r.plant, ptiSoh: r.ptiSoh })),
      suppliers: rops,
      lines: lines.map((l) => ({
        poNumber: l.poNumber,
        lineId: l.lineId,
        supplierId: l.supplierId,
        balance: l.balance,
        mpq: l.mpq,
        f: l.f,
        mdq: l.mdq ?? null,
        roundTo: l.roundTo ?? 0
      })),
      rules: CALL_OFF_TRIGGER_RULES
    };
    /** @type {string[]} */
    const callOffIds = [];
    if (step.draft) {
      for (const c of allocation.callOffs) {
        callOffIds.push(
          createDraft({
            poId: c.poId,
            poLineId: c.lineId,
            quantity: c.qty,
            needDate: addDays(today, c.f ?? 0),
            type: CALL_OFF_TRIGGER_RULES.callOffType,
            origin: 'ropFisik',
            trigger: stamp(draftFigures(figures, c), { ...inputs, line: lineOf(c) })
          }).entityId
        );
      }
    }
    const changedOutcome =
      prev === undefined ||
      prev.state !== step.state ||
      prev.armed !== step.armed ||
      step.draft ||
      step.prQty > 0;
    if (changedOutcome)
      rows.push({
        materialCode: code,
        observedAt: nowIso,
        sohSeq,
        state: step.state,
        armed: step.armed,
        callOffIds,
        prQty: step.prQty,
        figures: stamp(figures, inputs, RULES_VERSION)
      });
  }
  if (rows.length > 0) callOffTriggerStore.append(rows);
}

/**
 * DRC-13 BR-02 — the open "Create a PR in SAP" recommendations.
 * @returns {PrRecommendationView[]}
 */
export function ropFisikPrRecommendations() {
  return openPrRecommendations(callOffTriggerStore.all()).map((r) => {
    const m = MATERIAL_MASTER[r.materialCode];
    return { ...r, materialLabel: m?.label ?? r.materialCode, uom: m?.canonicalUom ?? '' };
  });
}
