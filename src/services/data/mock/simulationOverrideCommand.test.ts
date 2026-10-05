// ────────────────────────────────────────────────────────────────────────────
// Material E1 — `t_simulation_override_set` at the COMMAND layer (MR-7 BR-08),
// dispatched through the REAL MockCommandService: the planner records an
// input with who and when, a supplier seat cannot, the policy hook refuses a
// bad input by name, and the supplier's stock record is never touched.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { simulationOverrideStore } from './stores/simulationOverrideStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const svc = new MockCommandService();
const planner: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: ['planning'], actor: NO_PERSON };
const procurement: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: ['procurement'], actor: NO_PERSON };
const sup002: QueryScope = { personaType: 'supplier', supplierId: 'sup-002', businessRoles: PERSONA_SYSTEM_ROLES.supplier, actor: NO_PERSON };

const set = (payload: Record<string, unknown>, scope: QueryScope = planner) =>
  svc.dispatch(scope, { transitionId: 't_simulation_override_set', entity: 'simulationOverride', payload });

const GOOD = { supplierId: 'sup-002', materialCode: 'RM-EMUL-3310', field: 'inProduction', value: 1200, date: '2026-10-09' };

beforeEach(() => {
  simulationOverrideStore.reset();
  inventoryDeclarationStore.reset();
  sdcClock.reset();
});

describe('t_simulation_override_set', () => {
  it('the planner records an input, stamped with the session actor and the hub clock', async () => {
    const before = inventoryDeclarationStore.all();
    const res = await set(GOOD);
    expect(res.status, res.reason).toBe('done');
    const row = simulationOverrideStore.get(res.entityId!)!;
    expect(row).toMatchObject({ ...GOOD, enteredBy: NO_PERSON, enteredAt: sdcClock.now() });
    // BR-08 — the supplier's stock record is not touched.
    expect(inventoryDeclarationStore.all()).toBe(before);
  });

  it('a later input is a new row, never an edit of the earlier one', async () => {
    const a = await set(GOOD);
    const b = await set({ ...GOOD, value: 900 });
    expect(a.entityId).not.toBe(b.entityId);
    expect(simulationOverrideStore.all().map((r) => r.value)).toEqual([1200, 900]);
  });

  it('a supplier seat and a seat without `inventory:simulate` are refused, and nothing is stored', async () => {
    // An owner-less creation denies every supplier at SCOPE (§86).
    await expect(set(GOOD, sup002)).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    expect((await set(GOOD, procurement)).status).toBe('failed');
    expect(simulationOverrideStore.all()).toEqual([]);
  });

  it('the policy hook refuses a bad input by name (the same rule the page calls)', async () => {
    const res = await set({ ...GOOD, date: undefined });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('DATE_REQUIRED');
    const unknown = await set({ ...GOOD, materialCode: 'RM-NOPE-0000' });
    expect(unknown.reason).toContain('UNKNOWN_MATERIAL');
    expect(simulationOverrideStore.all()).toEqual([]);
  });
});
