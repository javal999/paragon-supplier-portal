// ─────────────────────────────────────────────────────────────────────────────
// BL-199 (DRC-13, DRC-D12) — the call-off trigger at ROP Fisik against the
// REAL stores and the REAL command service. An SOH update enters through the
// eWM refresh seam (`applyPtiStockRefresh`); every walk ends in the stores.
//
// RM-STEAR-7300 on the sample data: one supplier (sup-002, outside
// Jabodetabek, f = 2 days, MPQ = orderMultiple 25), ROP Fisik 1,275, Max
// 1,400, one blanket line PO-2025-00116 with 15,000 KG of balance, and no
// released call-off on the way. Its seed SOH is 900 (J6).
// ─────────────────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it } from 'vitest';
import { MockCommandService, applyPtiStockRefresh } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { callOffStore } from './stores/callOffStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { ptiStockStore } from './stores/ptiStockStore';
import { callOffTriggerStore } from './stores/callOffTriggerStore';
import { PTI_PLANTS } from '../../transitions/callOffTriggerRules';
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
});

/** @param {number} soh */
const setSoh = (soh) => applyPtiStockRefresh([{ materialCode: MAT, plant: 'J6', ptiSoh: soh }]);

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
    // Max 1,400 − (1,010 + 0) = 390 → CEILING(390, 25) = 400 would pass Max,
    // so the largest whole MPQ that fits: 375.
    expect(d).toMatchObject({
      status: 'Draft',
      poNumber: 'PO-2025-00116',
      supplierId: 'sup-002',
      quantity: 375,
      type: 'jit',
      // today + f, f = 2 days outside Jabodetabek (DRC-14 [Default B6]).
      needDate: addDays(dayOf(sdcClock.now()), replenishmentCycleDays('outsideJabodetabek'))
    });
    expect(d.trigger?.value).toMatchObject({
      soh: 1010,
      ropFisik: 1275,
      max: 1400,
      openSupply: 0,
      room: 390,
      quantity: 375
    });
    expect(d.trigger?.rulesVersion).toBe(RULES_VERSION);
    expect(d.trigger?.inputs).toMatchObject({ materialCode: MAT, sohSeq: expect.any(Number) });
  });

  it('an update above ROP Fisik drafts nothing', () => {
    setSoh(1276);
    expect(triggered()).toEqual([]);
    expect(callOffTriggerStore.lastFor(MAT)).toMatchObject({ state: 'above', armed: true });
  });

  it('exactly at ROP Fisik drafts (at or below)', () => {
    setSoh(1275);
    expect(triggered().map((c) => c.quantity)).toEqual([125]);
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

  it('a dismissed draft returns only after SOH rises above ROP Fisik and falls again', async () => {
    setSoh(1010);
    const first = /** @type {CallOff} */ (triggered()[0]);
    expect(
      (await verb('t_calloff_dismiss', first.id, { reason: 'Covered by a spot buy' })).status
    ).toBe('done');
    setSoh(900);
    expect(triggered().filter((c) => c.status === 'Draft')).toEqual([]);
    expect(callOffTriggerStore.lastFor(MAT)).toMatchObject({ state: 'waiting', armed: false });
    setSoh(1300);
    expect(triggered().filter((c) => c.status === 'Draft')).toEqual([]);
    setSoh(1000);
    const again = triggered().filter((c) => c.status === 'Draft');
    expect(again).toHaveLength(1);
    // Max 1,400 − 1,000 = 400, a whole MPQ.
    expect(again[0]?.quantity).toBe(400);
  });

  it('the planner approves by releasing the draft through the existing verb', async () => {
    setSoh(1010);
    const d = /** @type {CallOff} */ (triggered()[0]);
    expect((await verb('t_calloff_release_draft', d.id)).status).toBe('done');
    expect(callOffStore.get(d.id)?.status).toBe('Awaiting Confirmation');
    // Released and not received: it is supply now, so the next drop is covered
    // by it and waits for a recovery.
    setSoh(1000);
    expect(triggered()).toHaveLength(1);
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
    setSoh(1300);
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
    // Max 1,400 − 1,100 = 300.
    expect(d.quantity).toBe(300);
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
    expect(pti?.trigger?.value.ropFisik).toBe(1275);
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
