import { describe, it, expect, beforeEach } from 'vitest';
import { maxStockFor, maxStockRefusal, maxStockStore } from './maxStock';
import { MockCommandService, commandAuditSink } from '../data/mock/MockCommandService';
import { MockProcurementService } from '../data/mock/MockProcurementService';
/** @import { QueryScope } from '../data/types' */
import { DataError } from '../data/types';
import { SYSTEM_ROLES, rolesHolding, PERSONA_SYSTEM_ROLES } from './businessRoles';
import { getKnownFlows } from './index';
import { NO_PERSON } from '@context/noPerson';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E06-04 BR-06 (owner, 2026-09-29) — the maximum stock per supplier ×
// material is maintained by Procurement through `t_maxstock_set`, append-only,
// and read by the fixed stock reconcile. Probed both ways: procurement sets it;
// a planner-only seat is refused at the ROLE gate and a supplier at SCOPE, by name.
// ─────────────────────────────────────────────────────────────────────────────

const svc = new MockCommandService();
const reads = new MockProcurementService();
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
/**
 * @param {string} supplierId
 * @returns {QueryScope}
 */
const supplierSeat = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: [...PERSONA_SYSTEM_ROLES.supplier],
  actor: NO_PERSON
});
/**
 * @param {string} entityId
 * @param {unknown} quantity
 */
const setCmd = (entityId, quantity) => ({
  transitionId: 't_maxstock_set',
  entity: 'maxStock',
  entityId,
  payload: { quantity, setBy: NO_PERSON }
});
const PAIR = 'sup-007|PK-PETB-8801';
const ROW = 'packaging|2026-08-31|sup-007|PK-PETB-8801';
const rowOf = async () =>
  /** @type {NonNullable<ReturnType<((Awaited<ReturnType<typeof reads.getFixedStockReconcile>>)['items'])['find']>>} */ (
    (await reads.getFixedStockReconcile(buyerSeat('planning'))).items.find((r) => r.key === ROW)
  );

beforeEach(() => {
  maxStockStore.reset();
  commandAuditSink.clear();
});

describe('the verb and who holds it', () => {
  it('t_maxstock_set is registered, surfaced, statePreserving, on the maxstock:set atom', () => {
    const t = getKnownFlows()
      .find((f) => f.entity === 'maxStock')
      ?.transitions.find((x) => x.id === 't_maxstock_set');
    expect(t?.requiredRole).toBe('maxstock:set');
    expect(t?.statePreserving).toBe(true);
    expect(t?.surfaceable).toEqual({ surfaced: true });
  });

  it('procurement holds maxstock:set; planning and every supplier lane do not', () => {
    expect(rolesHolding('maxstock:set')).toEqual(['procurement']);
    expect(SYSTEM_ROLES.planning).not.toContain('maxstock:set');
    for (const lane of PERSONA_SYSTEM_ROLES.supplier)
      expect(SYSTEM_ROLES[lane], lane).not.toContain('maxstock:set');
  });
});

describe('procurement sets, changes and clears it — append-only', () => {
  it('a procurement seat sets 90,000; the reconcile row reads it and caps nothing it does not need to', async () => {
    expect((await rowOf()).maxStock).toBeNull();
    const res = await svc.dispatch(buyerSeat('procurement'), setCmd(PAIR, 90_000));
    expect(res.status, res.reason).toBe('done');
    expect(maxStockFor('sup-007', 'PK-PETB-8801')).toBe(90_000);
    expect(await rowOf()).toMatchObject({
      maxStock: 90_000,
      held: 85_000,
      aboveMaxQty: 0,
      liabilityQty: 54_500
    });
  });

  it('a lower max caps the liability and shows the stock above it as the supplier’s own', async () => {
    await svc.dispatch(buyerSeat('procurement'), setCmd(PAIR, 50_000));
    expect(await rowOf()).toMatchObject({
      maxStock: 50_000,
      liabilityQty: 50_000,
      aboveMaxQty: 35_000,
      outcome: 'underCalled'
    });
  });

  it('every change is kept with the value before it; clearing goes back to "no max stock agreed"', async () => {
    await svc.dispatch(buyerSeat('procurement'), setCmd(PAIR, 90_000));
    await svc.dispatch(buyerSeat('procurement'), setCmd(PAIR, 80_000));
    const cleared = await svc.dispatch(buyerSeat('procurement'), setCmd(PAIR, null));
    expect(cleared.status, cleared.reason).toBe('done');
    expect(
      maxStockStore.history('sup-007', 'PK-PETB-8801').map((c) => [c.previous, c.quantity])
    ).toEqual([
      [null, 90_000],
      [90_000, 80_000],
      [80_000, null]
    ]);
    expect(maxStockFor('sup-007', 'PK-PETB-8801')).toBeNull();
    expect((await rowOf()).maxStock).toBeNull();
  });
});

describe('refused, by name', () => {
  it('a planner-only seat is refused at the ROLE gate and nothing is recorded', async () => {
    const res = await svc.dispatch(buyerSeat('planning'), setCmd(PAIR, 90_000));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/^ROLE_NOT_PERMITTED/);
    expect(maxStockStore.changes()).toHaveLength(0);
  });

  it('a supplier is denied at SCOPE — the value is a term PTI keeps', async () => {
    await expect(svc.dispatch(supplierSeat('sup-007'), setCmd(PAIR, 90_000))).rejects.toMatchObject(
      { code: 'SCOPE_DENIED' }
    );
    await expect(
      svc.dispatch(supplierSeat('sup-007'), setCmd(PAIR, 90_000))
    ).rejects.toBeInstanceOf(DataError);
    expect(maxStockStore.changes()).toHaveLength(0);
  });

  it('a pair the hub does not assign is NOT_FOUND, never a silently created value', async () => {
    await expect(
      svc.dispatch(buyerSeat('procurement'), setCmd('sup-007|NOT-A-MATERIAL', 5))
    ).rejects.toMatchObject({
      code: 'NOT_FOUND'
    });
  });

  it.each([
    [0, 'above zero'],
    [-5, 'above zero'],
    [12.5, 'whole number'],
    ['90000', 'must be a number']
  ])('quantity %s is refused by the policy (%s)', async (quantity, why) => {
    const res = await svc.dispatch(buyerSeat('procurement'), setCmd(PAIR, quantity));
    expect(res.status).toBe('failed');
    expect(res.reason).toContain(why);
    expect(maxStockStore.changes()).toHaveLength(0);
  });

  it('an omitted quantity is refused rather than read as "cleared"', async () => {
    const res = await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_maxstock_set',
      entity: 'maxStock',
      entityId: PAIR,
      payload: { setBy: NO_PERSON }
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('quantity is required');
  });

  it('the rule accepts what the form offers (known-good) and refuses what it does not', () => {
    expect(maxStockRefusal(90_000)).toBeNull();
    expect(maxStockRefusal(null)).toBeNull();
    expect(maxStockRefusal(0)).not.toBeNull();
  });
});
