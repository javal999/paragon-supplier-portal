// ────────────────────────────────────────────────────────────────────────────
// Material A1 — the supplier overlay verb (`t_supplier_set_update_mode`) and the
// ONE API-connected resolver (MR-1 BR-02, AC-06; plan AR-03, AR-04, AR-06),
// dispatched through the REAL MockCommandService and read back through the
// resolver, the inventory read model and the supplier read service. Every
// refusal code is probed both ways.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockSupplierService } from './MockSupplierService';
import { supplierOverlayStore } from './stores/supplierOverlayStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { stockSyncStore } from './stores/inventoryHubStores';
import { isApiConnected, simulatedPullOf } from './inventoryReadModel';
import { stockUpdateModeOf, supplierEntry } from './supplierMaster';
import { API_CONNECTIONS } from './fixtures/inventoryHub';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES, SYSTEM_ROLES, rolesHolding } from '../../transitions/businessRoles';
import { supplierUpdateModeRefusal } from '../../transitions/supplierOverlayRules';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const svc = new MockCommandService();
const suppliers = new MockSupplierService();

/**
 * @param {...string} businessRoles
 * @returns {QueryScope}
 */
const buyerSeat = (...businessRoles) => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles,
  actor: NO_PERSON
});
const admin = buyerSeat('compliance');
const planner = buyerSeat('planning');
/**
 * @param {string} supplierId
 * @returns {QueryScope}
 */
const supplierSeat = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
});

/**
 * @param {string} supplierId
 * @param {Record<string, unknown>} payload
 * @param {QueryScope} [scope]
 */
const setMode = (supplierId, payload, scope = admin) =>
  svc.dispatch(scope, {
    transitionId: 't_supplier_set_update_mode',
    entity: 'supplierOverlay',
    entityId: supplierId,
    payload
  });
/** @param {string} supplierId */
const sync = (supplierId) =>
  svc.dispatch(planner, {
    transitionId: 't_stocksync_run',
    entity: 'stockSync',
    payload: { supplierId }
  });

beforeEach(() => {
  supplierOverlayStore.reset();
  inventoryDeclarationStore.reset();
  stockSyncStore.reset();
  sdcClock.reset();
});

describe('the fixture cases this file rests on (population control)', () => {
  it('sup-001 is on the sample connection list; sup-007 is not, and both are master suppliers', () => {
    expect(Object.keys(API_CONNECTIONS)).toContain('sup-001');
    expect(Object.keys(API_CONNECTIONS)).not.toContain('sup-007');
    expect(supplierEntry('sup-001')?.name).toBe('PT Sample Oleochemicals');
    expect(supplierEntry('sup-007')).not.toBeNull();
  });
});

describe('no overlay row reproduces today exactly (default)', () => {
  it('API when on the connection list, manual otherwise', () => {
    expect(stockUpdateModeOf('sup-001')).toBe('api');
    expect(stockUpdateModeOf('sup-003')).toBe('api');
    expect(stockUpdateModeOf('sup-007')).toBe('manual');
    expect(isApiConnected('sup-001')).toBe(true);
    expect(isApiConnected('sup-007')).toBe(false);
    expect(supplierEntry('sup-007')?.stockUpdateMode).toBe('manual');
  });
});

describe('t_supplier_set_update_mode (MR-1 BR-02)', () => {
  it('setting manual makes isApiConnected false for a supplier on the connection list', async () => {
    expect(isApiConnected('sup-001')).toBe(true);
    const res = await setMode('sup-001', { stockUpdateMode: 'manual', reason: 'ERP link paused' });
    expect(res.status, res.reason).toBe('done');
    expect(isApiConnected('sup-001')).toBe(false);
    expect(supplierEntry('sup-001')?.stockUpdateMode).toBe('manual');
    // The sync verbs ask the same resolver, so the pull is now refused.
    expect((await sync('sup-001')).reason).toMatch(/NOT_API_CONNECTED/);
  });

  it('setting API for a supplier not on the list makes a sync record NO_ENDPOINT, not timeout', async () => {
    expect((await sync('sup-007')).reason).toMatch(/NOT_API_CONNECTED/);
    expect((await setMode('sup-007', { stockUpdateMode: 'api' })).status).toBe('done');
    expect(isApiConnected('sup-007')).toBe(true);
    const res = await sync('sup-007');
    expect(res.status, res.reason).toBe('done');
    expect(
      stockSyncStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
    ).toMatchObject({ supplierId: 'sup-007', outcome: 'failed', errorKey: 'NO_ENDPOINT' });
    // Nothing reached the stock store: a failed pull keeps the previous figures.
    expect(
      inventoryDeclarationStore.all().some((d) => d.supplierId === 'sup-007' && d.channel === 'api')
    ).toBe(false);
  });

  it('a listed supplier still pulls its fixture outcome (the other half of the outcome read)', async () => {
    expect(simulatedPullOf('sup-003')).toEqual({ outcome: 'failed', errorKey: 'timeout' });
    expect(simulatedPullOf('sup-001').outcome).toBe('success');
    const res = await sync('sup-003');
    expect(
      stockSyncStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
    ).toMatchObject({ outcome: 'failed', errorKey: 'timeout' });
  });

  it('UPDATE_MODE_INVALID: a value that is neither api nor manual is refused; a valid one passes', async () => {
    const bad = await setMode('sup-001', { stockUpdateMode: 'template' });
    expect(bad.status).toBe('failed');
    expect(bad.reason).toMatch(/:UPDATE_MODE_INVALID: /);
    expect(supplierOverlayStore.all()).toEqual([]);
    const good = await setMode('sup-001', { stockUpdateMode: 'api' });
    expect(good.status, good.reason).toBe('done');
  });

  it('UNKNOWN_SUPPLIER: an id the master does not hold is refused by name; a master supplier passes', async () => {
    const bad = await setMode('sup-999', { stockUpdateMode: 'manual' });
    expect(bad.status).toBe('failed');
    expect(bad.reason).toMatch(/:UNKNOWN_SUPPLIER: sup-999/);
    expect(supplierOverlayStore.all()).toEqual([]);
    expect((await setMode('sup-002', { stockUpdateMode: 'manual' })).status).toBe('done');
  });

  it('the page pre-check and the hook call the same rule, both ways', () => {
    /** @param {string} id */
    const known = (id) => id === 'sup-001';
    expect(supplierUpdateModeRefusal('sup-001', 'api', known)).toBeNull();
    expect(supplierUpdateModeRefusal('sup-001', 'manual', known)).toBeNull();
    expect(supplierUpdateModeRefusal('sup-001', 'API', known)).toMatch(/^UPDATE_MODE_INVALID/);
    expect(supplierUpdateModeRefusal('sup-404', 'api', known)).toMatch(/^UNKNOWN_SUPPLIER/);
  });
});

describe('only the Hub administrator lane may change the mode (MR-1 AC-06, AR-04)', () => {
  it('the atom sits in compliance only, and admin holds it by derivation', () => {
    expect(rolesHolding('supplier:set-update-mode')).toEqual(['compliance']);
    expect(SYSTEM_ROLES.admin).toContain('supplier:set-update-mode');
    expect(SYSTEM_ROLES.planning).not.toContain('supplier:set-update-mode');
  });

  it('a seat without supplier:set-update-mode is refused; the compliance seat passes', async () => {
    const refused = await setMode('sup-001', { stockUpdateMode: 'manual' }, planner);
    expect(refused.status).toBe('failed');
    expect(refused.reason).toMatch(/ROLE_NOT_PERMITTED/);
    expect(isApiConnected('sup-001')).toBe(true);
    expect((await setMode('sup-001', { stockUpdateMode: 'manual' }, admin)).status).toBe('done');
  });

  it('a supplier cannot set its own mode, nor another supplier’s', async () => {
    const own = await setMode('sup-007', { stockUpdateMode: 'api' }, supplierSeat('sup-007'));
    expect(own.status).toBe('failed');
    expect(own.reason).toMatch(/ROLE_NOT_PERMITTED/);
    await expect(
      setMode('sup-001', { stockUpdateMode: 'manual' }, supplierSeat('sup-007'))
    ).rejects.toMatchObject({
      code: 'SCOPE_DENIED'
    });
    expect(supplierOverlayStore.all()).toEqual([]);
  });
});

describe('the history keeps every row (append-only, MAT-R3)', () => {
  it('two changes leave two rows with who and when; the latest wins', async () => {
    await setMode('sup-001', { stockUpdateMode: 'manual', reason: '  ERP link paused  ' });
    sdcClock.set('2026-09-30T02:00:00.000Z');
    await setMode('sup-001', { stockUpdateMode: 'api' });
    const history = supplierOverlayStore.historyFor('sup-001');
    expect(history.map((r) => r.stockUpdateMode)).toEqual(['manual', 'api']);
    expect(history[0]).toMatchObject({ reason: 'ERP link paused', setBy: NO_PERSON });
    expect(history[1].reason).toBeUndefined();
    expect(history[1].setAt).toBe('2026-09-30T02:00:00.000Z');
    expect(history[0].setAt).not.toBe(history[1].setAt);
    expect(stockUpdateModeOf('sup-001')).toBe('api');
  });

  it('the supplier read: the buyer sees every supplier, a supplier only its own row', async () => {
    await setMode('sup-007', { stockUpdateMode: 'api' });
    const all = (await suppliers.getStockUpdateModes(planner)).items;
    const row7 = all.find((r) => r.supplierId === 'sup-007');
    expect(row7).toMatchObject({ stockUpdateMode: 'api', source: 'overlay' });
    expect(row7?.history).toHaveLength(1);
    expect(all.find((r) => r.supplierId === 'sup-001')).toMatchObject({
      stockUpdateMode: 'api',
      source: 'default'
    });
    const mine = (await suppliers.getStockUpdateModes(supplierSeat('sup-007'))).items;
    expect(mine.map((r) => r.supplierId)).toEqual(['sup-007']);
  });
});
