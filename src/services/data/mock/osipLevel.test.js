// ────────────────────────────────────────────────────────────────────────────
// DRC-D11 (BL-196) — the OSIP level verb, and DRC-12a (BL-198) — the NPD review
// task, dispatched through the REAL MockCommandService against the real stores
// and read back through the REAL service.
//
// Level: probed both ways — a Material Planning seat sets; a procurement and a
// finance seat are refused at the ROLE gate by name and a supplier at SCOPE;
// the refusal code fires once and passes once; every change is audited.
//
// NPD: RM-STEAR-7300's first order on the sample data (PO-2025-00116, 15,000
// KG) is 8,000 KG received, so the default rule tags it NPD. A goods receipt
// for the rest drops the tag: the task appears once, stays one task however
// often the hub looks, and is gone for good once the planner confirms the level.
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { osipLevelStore } from './stores/osipLevelStore';
import { npdTagStore } from './stores/npdTagStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { npdReviews, observeNpdTags, osipRopInputs } from './osipRopReadModel';
/** @import { QueryScope } from '../types' */
import { DataError } from '../types';
import { PERSONA_SYSTEM_ROLES, SYSTEM_ROLES } from '../../transitions/businessRoles';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { osipLevelFlow } from '../../transitions/flows/osipLevel.flow';
import { NO_PERSON } from '@context/noPerson';

const cmd = new MockCommandService();
const svc = new MockProcurementService();
/**
 * @param {readonly import('../../transitions/businessRoles').SystemRoleId[]} roles
 * @returns {QueryScope}
 */
const seat = (roles) => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  actor: NO_PERSON
});
const planning = seat(['planning']);
/** @type {QueryScope} */
const supplier = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

/**
 * @param {QueryScope} scope
 * @param {unknown} osipLevel
 * @param {string} [materialCode]
 */
const setLevel = (scope, osipLevel, materialCode = 'RM-STEAR-7300') =>
  cmd.dispatch(scope, {
    transitionId: 't_osiplevel_set',
    entity: 'osipLevel',
    entityId: materialCode,
    payload: { osipLevel }
  });

/** The rest of RM-STEAR-7300's first order, received and posted. */
const receiveRestOfFirstOrder = () =>
  goodsReceiptStore.add({
    id: 'gr-npd-probe',
    grNumber: 'GR-2026-NPD',
    asnId: 'asn-npd',
    asnNumber: 'ASN-NPD',
    poNumber: 'PO-2025-00116',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    receivedDate: '2026-08-28',
    receivedBy: 'Warehouse Supervisor',
    status: 'Posted to SAP',
    inspectionResults: [
      {
        materialCode: 'RM-STEAR-7300',
        description: 'Stearic acid',
        qtyExpected: 7000,
        qtyReceived: 7000,
        qtyAccepted: 7000,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass'
      }
    ],
    disposition: 'Accept'
  });

beforeEach(() => {
  osipLevelStore.reset();
  npdTagStore.reset();
  goodsReceiptStore.reset();
  commandAuditSink.clear();
});
afterEach(() => {
  osipLevelStore.reset();
  npdTagStore.reset();
  goodsReceiptStore.reset();
});

describe('DRC-D11 — the level verb', () => {
  it('is statePreserving on one state, gated by osiplevel:set and OSIP_LEVEL_VALID', () => {
    expect(osipLevelFlow.transitions).toEqual([
      expect.objectContaining({
        id: 't_osiplevel_set',
        from: ['Maintained'],
        to: 'Maintained',
        statePreserving: true,
        requiredRole: 'osiplevel:set',
        requiredFields: ['osipLevel'],
        policyHooks: [POLICY_HOOKS.OSIP_LEVEL_VALID]
      })
    ]);
  });

  it('the atom is in the Material Planning bundle and in no supplier lane, procurement or finance', () => {
    const holders = Object.entries(SYSTEM_ROLES)
      .filter(([, atoms]) => /** @type {readonly string[]} */ (atoms).includes('osiplevel:set'))
      .map(([id]) => id);
    expect(holders).toContain('planning');
    for (const not of [
      'procurement',
      'finance',
      'supplier',
      'commercial',
      'fulfilment',
      'back_office'
    ])
      expect(holders).not.toContain(not);
  });

  it('known-good: the planner sets level 5; the row keeps the level before it, the source, time and actor; the read follows; the act is audited', async () => {
    expect(osipRopInputs(['RM-STEAR-7300']).get('RM-STEAR-7300')?.level).toEqual({
      level: 4,
      source: 'default',
      setAt: null
    });
    const res = await setLevel(planning, 5);
    expect(res.status, res.reason).toBe('done');
    expect(osipLevelStore.all()).toEqual([
      expect.objectContaining({
        materialCode: 'RM-STEAR-7300',
        level: 5,
        previous: 4,
        source: 'planner',
        setBy: NO_PERSON
      })
    ]);
    expect(osipRopInputs(['RM-STEAR-7300']).get('RM-STEAR-7300')?.level.level).toBe(5);
    const view = /** @type {import('../types').SafetyStockView} */ (
      await svc.getSafetyStock(seat(PERSONA_SYSTEM_ROLES.buyer))
    );
    expect(view.materials.find((m) => m.materialCode === 'RM-STEAR-7300')?.rop.level.level).toBe(5);
    expect(
      commandAuditSink.byEvent('t_osiplevel_set').filter((e) => e.outcome === 'done')
    ).toHaveLength(1);
  });

  it('known-bad: a procurement seat and a finance seat are refused at the ROLE gate by name; nothing recorded', async () => {
    for (const s of [seat(['procurement']), seat(['finance'])]) {
      const res = await setLevel(s, 5);
      expect(res.status).toBe('failed');
      expect(res.reason).toMatch(/^ROLE_NOT_PERMITTED/);
      expect(res.reason).toMatch(/osiplevel:set/);
    }
    expect(osipLevelStore.all()).toEqual([]);
  });

  it('known-bad: a supplier is refused at SCOPE; an unknown material is NOT_FOUND', async () => {
    await expect(setLevel(supplier, 5)).rejects.toBeInstanceOf(DataError);
    await expect(setLevel(planning, 5, 'NOT-A-MATERIAL')).rejects.toBeInstanceOf(DataError);
    expect(osipLevelStore.all()).toEqual([]);
  });

  it('BL-208 — a confirmed suggestion records source classification; any other levelSource records planner', async () => {
    /** @param {unknown} levelSource @param {number} osipLevel */
    const confirm = (levelSource, osipLevel) =>
      cmd.dispatch(planning, {
        transitionId: 't_osiplevel_set',
        entity: 'osipLevel',
        entityId: 'RM-STEAR-7300',
        payload: { osipLevel, levelSource }
      });
    expect((await confirm('classification', 3)).status).toBe('done');
    expect((await confirm('system', 5)).status).toBe('done');
    expect(osipLevelStore.all().map((r) => [r.level, r.previous, r.source])).toEqual([
      [3, 4, 'classification'],
      [5, 3, 'planner']
    ]);
    expect(osipRopInputs(['RM-STEAR-7300']).get('RM-STEAR-7300')?.level.source).toBe('planner');
    expect(
      commandAuditSink.byEvent('t_osiplevel_set').filter((e) => e.outcome === 'done')
    ).toHaveLength(2);
  });

  it('BL-208 — a confirmed suggestion is still refused for a seat without osiplevel:set', async () => {
    const res = await cmd.dispatch(seat(['procurement']), {
      transitionId: 't_osiplevel_set',
      entity: 'osipLevel',
      entityId: 'RM-STEAR-7300',
      payload: { osipLevel: 3, levelSource: 'classification' }
    });
    expect(res.reason).toMatch(/^ROLE_NOT_PERMITTED/);
    expect(osipLevelStore.all()).toEqual([]);
  });

  it('OSIP_LEVEL_INVALID fires on 7 and passes on 6', async () => {
    const bad = await setLevel(planning, 7);
    expect(bad.status).toBe('failed');
    expect(bad.reason).toMatch(/OSIP_LEVEL_INVALID/);
    expect((await setLevel(planning, 6)).status).toBe('done');
    expect(osipLevelStore.all().map((r) => r.level)).toEqual([6]);
  });
});

describe('DRC-12a — the review task appears once when the tag drops, and not again', () => {
  const buyer = seat(PERSONA_SYSTEM_ROLES.buyer);
  /** @returns {Promise<string[]>} */
  const tasks = async () => (await svc.getNpdReviews(buyer)).items.map((r) => r.materialCode);

  it('NPD on the sample data until the first order is fully received', () => {
    expect(osipRopInputs(['RM-STEAR-7300']).get('RM-STEAR-7300')).toMatchObject({
      npd: { firstOrderFulfilled: { npd: true, basis: 'FIRST_ORDER_OPEN' } },
      firstOrder: { firstPo: 'PO-2025-00116', ordered: 15000, received: 8000 }
    });
  });

  it('a command before the receipt is the baseline; the receipt drops the tag; the next command raises the task once', async () => {
    // Any command observes the tags before and after it (MockCommandService).
    expect((await setLevel(planning, 4, 'PK-PETB-8801')).status).toBe('done');
    expect(await tasks()).toEqual([]);
    receiveRestOfFirstOrder();
    expect((await setLevel(planning, 5, 'PK-PETB-8801')).status).toBe('done');
    expect(await tasks()).toEqual(['RM-STEAR-7300']);
    // Looking again — more commands, direct observations — adds nothing.
    observeNpdTags();
    await setLevel(planning, 6, 'PK-PETB-8801');
    expect(await tasks()).toEqual(['RM-STEAR-7300']);
    expect(
      npdTagStore
        .all()
        .filter((r) => r.dropped)
        .map((r) => r.materialCode)
    ).toEqual(['RM-STEAR-7300']);
    // The stored tag keeps its inputs and the rules version (DRC-D16).
    const drop = npdTagStore.all().find((r) => r.dropped);
    expect(drop?.tag).toMatchObject({
      value: { npd: false, basis: 'FIRST_ORDER_FULFILLED', until: '2026-08-28' },
      inputs: { materialCode: 'RM-STEAR-7300', rule: 'firstOrderFulfilled' }
    });
    expect(drop?.tag.rulesVersion).toMatch(/^osip-/);
  });

  it('confirming the level closes it, and it does not come back', async () => {
    observeNpdTags();
    receiveRestOfFirstOrder();
    observeNpdTags();
    expect(npdReviews().map((r) => r.materialCode)).toEqual(['RM-STEAR-7300']);
    expect((await setLevel(planning, 4)).status).toBe('done'); // same level: a confirmation
    expect(await tasks()).toEqual([]);
    observeNpdTags();
    await setLevel(planning, 4, 'PK-PETB-8801');
    expect(await tasks()).toEqual([]);
  });

  it('BL-208 — confirming the suggested level (source classification) closes it too', async () => {
    observeNpdTags();
    receiveRestOfFirstOrder();
    observeNpdTags();
    expect(npdReviews().map((r) => r.materialCode)).toEqual(['RM-STEAR-7300']);
    const res = await cmd.dispatch(planning, {
      transitionId: 't_osiplevel_set',
      entity: 'osipLevel',
      entityId: 'RM-STEAR-7300',
      payload: { osipLevel: 4, levelSource: 'classification' }
    });
    expect(res.status, res.reason).toBe('done');
    expect(await tasks()).toEqual([]);
  });

  it('a supplier reads no task', async () => {
    observeNpdTags();
    receiveRestOfFirstOrder();
    observeNpdTags();
    expect((await svc.getNpdReviews(supplier)).items).toEqual([]);
  });
});
