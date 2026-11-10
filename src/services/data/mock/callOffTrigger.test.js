// ─────────────────────────────────────────────────────────────────────────────
// BL-199 (DRC-13, DRC-D12) — the call-off trigger at ROP Fisik against the
// REAL stores and the REAL command service. An SOH update enters through the
// eWM refresh seam (`applyPtiStockRefresh`); every walk ends in the stores.
//
// RM-STEAR-7300 on the sample data: one supplier (sup-002, outside
// Jabodetabek, f = 2 days, MPQ = orderMultiple 25), ROP Fisik 1,400 (1,275 before BL-282: the safety stock reads the LTP weeks, now weekly), Max
// 1,400, one blanket line PO-2025-00116 with 15,000 KG of balance, and no
// released call-off on the way. Its seed SOH is 900 (J6).
//
// [Team F5, 2026-10-28] the call-off quantity is the supplier's minimum
// delivery: MDQ = MOQ 1,250, rounded like Max to the pallet (700) → 1,400.
// That never fits under Max at the trigger (Max 1,400 − SOH ≥ 0 < 1,400),
// so it is called off anyway, flagged ABOVE_MAX [Owner, 2026-10-28, BL-230].
// ─────────────────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it } from 'vitest';
import { MockCommandService, applyPtiStockRefresh } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { callOffStore } from './stores/callOffStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { ptiStockStore } from './stores/ptiStockStore';
import { callOffTriggerStore } from './stores/callOffTriggerStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { CALL_OFF_TRIGGER_RULES, PTI_PLANTS } from '../../transitions/callOffTriggerRules';
import { RULES_VERSION, replenishmentCycleDays } from '../../transitions/osipRules';
import { addDays, dayOf } from '../../engine/dates';
import { sdcClock } from '../../sdc';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { POStatus } from '../types';
/** @import { CallOff, QueryScope } from '../types' */

const MAT = 'RM-STEAR-7300';
const svc = new MockCommandService();
const reads = new MockProcurementService();

/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};
/** @type {QueryScope} */
const sup002 = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

afterEach(() => {
  callOffStore.reset();
  purchaseOrderStore.reset();
  ptiStockStore.reset();
  callOffTriggerStore.reset();
  goodsReceiptStore.reset();
});

/** @param {number} soh */
const setSoh = (soh) => applyPtiStockRefresh([{ materialCode: MAT, plant: 'J6', ptiSoh: soh }]);

// [Owner FSR-D6, 2026-11-03] BL-261 — DRC-B37, the switch's other variant,
// walked through the same seam.
const B37 = { ...CALL_OFF_TRIGGER_RULES, reArm: /** @type {const} */ ('aboveRopFisik') };
/** @param {number} soh */
const setSohB37 = (soh) =>
  applyPtiStockRefresh([{ materialCode: MAT, plant: 'J6', ptiSoh: soh }], B37);

/** @returns {CallOff[]} */
const triggered = () =>
  callOffStore.all().filter((c) => c.materialCode === MAT && c.origin === 'ropFisik');

/**
 * @param {string} transitionId
 * @param {string} entityId
 * @param {Record<string, unknown>} [payload]
 */
const verb = (transitionId, entityId, payload = {}) =>
  svc.dispatch(buyer, { transitionId, entity: 'callOff', entityId, payload });

describe('BR-01 — SOH dropping to ROP Fisik drafts a call-off, once', () => {
  it('the seed is not an update: commands alone draft nothing', async () => {
    // RM-STEAR-7300's seed SOH (900) already sits below ROP Fisik; no update
    // has been recorded, so the check has nothing to run on.
    const res = await verb('t_calloff_dismiss', 'co-0012', { reason: 'Not needed' });
    expect(res.status).toBe('done');
    expect(callOffStore.all().filter((c) => c.origin === 'ropFisik')).toEqual([]);
  });

  it('an update at or below ROP Fisik drafts on the oldest blanket line, figures stamped', () => {
    setSoh(1010);
    const drafts = triggered();
    expect(drafts).toHaveLength(1);
    const d = /** @type {CallOff} */ (drafts[0]);
    // Room Max 1,400 − (1,010 + 0) = 390; the call-off is the minimum delivery
    // CEILING(MOQ 1,250, pallet 700) = 1,400 [Team F5], above the room [Proposed].
    expect(d).toMatchObject({
      status: 'Draft',
      poNumber: 'PO-2025-00116',
      supplierId: 'sup-002',
      quantity: 1400,
      type: 'jit',
      // today + f, f = 2 days outside Jabodetabek (DRC-14 [Default B6]).
      needDate: addDays(dayOf(sdcClock.now()), replenishmentCycleDays('outsideJabodetabek'))
    });
    expect(d.trigger?.value).toMatchObject({
      soh: 1010,
      ropFisik: 1400,
      max: 1400,
      openSupply: 0,
      room: 390,
      quantity: 1400
    });
    expect(d.trigger?.value.flags).toContain('ABOVE_MAX');
    expect(d.trigger?.rulesVersion).toBe(RULES_VERSION);
    expect(d.trigger?.inputs).toMatchObject({ materialCode: MAT, sohSeq: expect.any(Number) });
  });

  it('an update above ROP Fisik drafts nothing', () => {
    setSoh(1401);
    expect(triggered()).toEqual([]);
    expect(callOffTriggerStore.lastFor(MAT)).toMatchObject({ state: 'above', armed: true });
  });

  // BL-282: ROP Fisik is now 1,400 = Max, so SOH exactly at ROP leaves no room
  // below Max (nothing to call) and the at-the-boundary case cannot be walked
  // here; `sohCheck`'s at-or-below is pinned in callOffTriggerRules.test.js.
  it('one below ROP Fisik drafts (at or below)', () => {
    setSoh(1399);
    expect(triggered().map((c) => c.quantity)).toEqual([1400]);
  });
});

describe('BR-01 — one open draft per material', () => {
  it('a further update while the draft is pending does not stack a second draft', () => {
    setSoh(1010);
    setSoh(800);
    setSoh(600);
    expect(triggered()).toHaveLength(1);
    expect(callOffTriggerStore.lastFor(MAT)).toMatchObject({ state: 'pending' });
  });

  it("[Owner FSR-D6] 'everyCheck' (default): a dismissed draft comes back on the next check while SOH is still at or below ROP Fisik", async () => {
    expect(CALL_OFF_TRIGGER_RULES.reArm).toBe('everyCheck');
    setSoh(1010);
    const first = /** @type {CallOff} */ (triggered()[0]);
    expect(callOffTriggerStore.lastFor(MAT)).toMatchObject({ state: 'drafted', armed: true });
    expect(
      (await verb('t_calloff_dismiss', first.id, { reason: 'Covered by a spot buy' })).status
    ).toBe('done');
    setSoh(900);
    const again = triggered().filter((c) => c.status === 'Draft');
    expect(again).toHaveLength(1);
    // The minimum delivery again: 1,400; no 'waiting' row anywhere in the ledger.
    expect(again[0]?.quantity).toBe(1400);
    expect(callOffTriggerStore.all().map((r) => r.state)).toEqual(['drafted', 'drafted']);
    // Still one open draft per material: the next drop does not stack a third.
    setSoh(800);
    expect(triggered().filter((c) => c.status === 'Draft')).toHaveLength(1);
    expect(callOffTriggerStore.lastFor(MAT)).toMatchObject({ state: 'pending' });
  });

  it("'aboveRopFisik' (DRC-B37): a dismissed draft returns only after SOH rises above ROP Fisik and falls again", async () => {
    setSohB37(1010);
    const first = /** @type {CallOff} */ (triggered()[0]);
    expect(callOffTriggerStore.lastFor(MAT)).toMatchObject({ state: 'drafted', armed: false });
    expect(
      (await verb('t_calloff_dismiss', first.id, { reason: 'Covered by a spot buy' })).status
    ).toBe('done');
    setSohB37(900);
    expect(triggered().filter((c) => c.status === 'Draft')).toEqual([]);
    expect(callOffTriggerStore.lastFor(MAT)).toMatchObject({ state: 'waiting', armed: false });
    setSohB37(1450);
    expect(triggered().filter((c) => c.status === 'Draft')).toEqual([]);
    setSohB37(1000);
    const again = triggered().filter((c) => c.status === 'Draft');
    expect(again).toHaveLength(1);
    // The minimum delivery again: 1,400.
    expect(again[0]?.quantity).toBe(1400);
    expect(callOffTriggerStore.lastFor(MAT)?.figures.inputs).toMatchObject({
      rules: { reArm: 'aboveRopFisik' }
    });
  });

  it('the planner approves by releasing the draft through the existing verb; released and not received, it covers the next drop', async () => {
    // The seeded receipt GR-2026-014 (10,000 KG of RM-STEAR-7300 from sup-002)
    // sits inside the delivery match window of any new call-off of the pair
    // (CR-06 matches by supplier, material and date), so on the plain sample
    // the trigger would read the released call-off as received. Its stearic
    // line is taken out of this walk so the rule, not the sample, is probed.
    goodsReceiptStore.update('gr-014', (g) => ({
      ...g,
      inspectionResults: g.inspectionResults.filter((r) => r.materialCode !== MAT)
    }));
    setSoh(1010);
    const d = /** @type {CallOff} */ (triggered()[0]);
    expect((await verb('t_calloff_release_draft', d.id)).status).toBe('done');
    expect(callOffStore.get(d.id)?.status).toBe('Awaiting Confirmation');
    // Released and not received: it is supply now (1,400 on its way), so the
    // next drop has no room below Max and is covered — under 'everyCheck' the
    // trigger is still armed, and this is what keeps the chain at Max (BR-03).
    setSoh(1000);
    expect(triggered()).toHaveLength(1);
    expect(callOffTriggerStore.lastFor(MAT)).toMatchObject({ state: 'covered', armed: true });
    expect(callOffTriggerStore.lastFor(MAT)?.figures.value).toMatchObject({
      openSupply: 1400,
      room: 0
    });
  });
});

describe('BR-02 — no umbrella PO balance: a PR recommendation, no draft', () => {
  const closeBlanket = () => {
    const po = purchaseOrderStore.all().find((p) => p.poNumber === 'PO-2025-00116');
    if (!po) throw new Error('PO-2025-00116 missing from the seed');
    purchaseOrderStore.update(po.id, (p) => ({ ...p, status: POStatus.CLOSED }));
  };

  it('recommends "Create a PR in SAP" for what it needs, once, PTI only', async () => {
    closeBlanket();
    setSoh(1010);
    expect(triggered()).toEqual([]);
    const page = await reads.getRopFisikPrRecommendations(buyer);
    expect(page.items.map((r) => [r.materialCode, r.prQty, r.uom])).toEqual([[MAT, 390, 'KG']]);
    expect(page.items[0]?.figures.rulesVersion).toBe(RULES_VERSION);
    expect((await reads.getRopFisikPrRecommendations(sup002)).items).toEqual([]);
    // Still low: the same recommendation, not a second one.
    setSoh(950);
    expect((await reads.getRopFisikPrRecommendations(buyer)).items).toHaveLength(1);
    // Recovered: it closes.
    setSoh(1450);
    expect((await reads.getRopFisikPrRecommendations(buyer)).items).toEqual([]);
  });
});

describe('BR-05 / DRC-D12 — plant stored, SOH compared all plants combined', () => {
  it('every PTI SOH record carries a plant', () => {
    expect(ptiStockStore.all().length).toBeGreaterThan(0);
    for (const r of ptiStockStore.all()) expect(PTI_PLANTS).toContain(r.plant);
    expect(ptiStockStore.forMaterial(MAT).map((r) => r.plant)).toEqual(['J6']);
    expect(ptiStockStore.forMaterial('PK-PETB-8801').map((r) => r.plant)).toEqual(['J2']);
  });

  it('J6 alone below ROP Fisik does not trigger when J6 + J2 is above it', async () => {
    applyPtiStockRefresh([
      { materialCode: MAT, plant: 'J6', ptiSoh: 1200 },
      { materialCode: MAT, plant: 'J2', ptiSoh: 200 }
    ]);
    expect(triggered()).toEqual([]);
    expect(ptiStockStore.forMaterial(MAT).map((r) => [r.plant, r.ptiSoh])).toEqual([
      ['J6', 1200],
      ['J2', 200]
    ]);
    // The inventory read takes the combined figure too.
    const inv = await reads.getInventory(buyer, { materialCode: MAT });
    expect(inv.items.map((p) => p.ptiSoh)).toEqual([1400]);
  });

  it('the two plants together at or below ROP Fisik trigger, each plant kept in the figures', () => {
    applyPtiStockRefresh([
      { materialCode: MAT, plant: 'J6', ptiSoh: 800 },
      { materialCode: MAT, plant: 'J2', ptiSoh: 300 }
    ]);
    const d = /** @type {CallOff} */ (triggered()[0]);
    expect(d.trigger?.value.soh).toBe(1100);
    expect(d.trigger?.value.plants).toEqual([
      { plant: 'J6', soh: 800 },
      { plant: 'J2', soh: 300 }
    ]);
    // The minimum delivery, 1,400, whatever the plants hold.
    expect(d.quantity).toBe(1400);
  });
});

describe('the figures behind a draft are PTI’s', () => {
  it('a supplier reads the released call-off without them', async () => {
    setSoh(1010);
    const d = /** @type {CallOff} */ (triggered()[0]);
    await verb('t_calloff_release_draft', d.id);
    const mine = (await reads.getCallOffs(sup002)).items.find((c) => c.id === d.id);
    expect(mine).toBeDefined();
    expect(mine && 'trigger' in mine).toBe(false);
    const pti = (await reads.getCallOffs(buyer)).items.find((c) => c.id === d.id);
    expect(pti?.trigger?.value.ropFisik).toBe(1400);
  });

  it('a dispatched draft cannot claim the ROP Fisik origin', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_calloff_draft',
      entity: 'callOff',
      payload: {
        poId: 'po-007',
        poLineId: 'li-007a',
        quantity: 1000,
        needDate: '2026-09-25',
        type: 'jit',
        origin: 'ropFisik',
        trigger: { value: {}, inputs: {}, rulesVersion: 'forged' }
      }
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/origin/);
  });
});
