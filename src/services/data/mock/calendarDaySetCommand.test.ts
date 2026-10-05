// ────────────────────────────────────────────────────────────────────────────
// t_calendar_day_set — the Hub administrator rules one date working or
// non-working (BL-50), THROUGH THE REAL DISPATCHER AND THE REAL STORE.
//
// Proved here, by named case:
//   • it is a DISPATCHED verb, so every ruling lands in the DR-10 trail;
//   • `calendar:set` is held by `compliance` and by `admin` (ADM), and REFUSED
//     at the role gate to the lanes the deadlines measure — planning,
//     procurement — and to every supplier (at scope: the calendar is PTI's);
//   • the policy refuses a date outside the SAP load, a kind that is not one,
//     a blank reason and a malformed attribution — each by name;
//   • `setAt` is MINTED by the store: a payload cannot backdate a ruling;
//   • the ruling takes effect on the calendar every deadline reads.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { DataError, type QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES, SYSTEM_ROLES, rolesHolding } from '../../transitions/businessRoles';
import { hubWorkingCalendar, workingCalendarStore } from '../../transitions/workingCalendarStore';
import { isWorkingDay } from '@lib/workingCalendar';
import { getKnownFlows } from '../../transitions';

const svc = new MockCommandService();
const NOBODY = { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' } as const;

const seat = (...roles: string[]): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  actor: NOBODY,
});
const supplier: QueryScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NOBODY,
};

const rule = (date: string, over: Record<string, unknown> = {}) => ({
  transitionId: 't_calendar_day_set',
  entity: 'workingCalendar',
  entityId: date,
  payload: { kind: 'non-working', reason: 'Plant shutdown for maintenance', setBy: NOBODY, ...over },
});

/** The refusal KIND: `failed/<PREFIX>` for a returned refusal, `throw/<code>`
 *  for a thrown `DataError` (the scope and existence gates throw). */
async function outcomeOf(scope: QueryScope, cmd: ReturnType<typeof rule>): Promise<string> {
  try {
    const r = await svc.dispatch(scope, cmd);
    return r.status === 'failed' ? `failed/${(r.reason ?? '').split(':')[0]}` : `ok/${r.status}`;
  } catch (e) {
    return e instanceof DataError ? `throw/${e.code}` : `throw/${(e as Error).name}`;
  }
}

beforeEach(() => {
  workingCalendarStore.reset();
  commandAuditSink.clear();
});

describe('BL-50 · t_calendar_day_set — the recorded act', () => {
  it('BL50-VERB-01 · the flow is registered and the verb is surfaced (a person fires it on a screen)', () => {
    const flow = getKnownFlows().find((f) => f.entity === 'workingCalendar');
    const t = flow?.transitions.find((x) => x.id === 't_calendar_day_set');
    expect(t?.requiredRole).toBe('calendar:set');
    expect(t?.statePreserving).toBe(true);
    expect(t?.surfaceable).toEqual({ surfaced: true });
  });

  it('BL50-VERB-02 · the administrator lane records a ruling, and it changes the calendar in force', async () => {
    expect(isWorkingDay('2026-09-09', hubWorkingCalendar())).toBe(true); // control
    const r = await svc.dispatch(seat('compliance'), rule('2026-09-09'));
    expect(r.status, r.reason).toBe('done');
    expect(isWorkingDay('2026-09-09', hubWorkingCalendar())).toBe(false);
    expect(workingCalendarStore.rulings()[workingCalendarStore.rulings().length - 1]).toMatchObject({
      date: '2026-09-09',
      kind: 'non-working',
      reason: 'Plant shutdown for maintenance',
      setBy: NOBODY,
    });
  });

  it('BL50-VERB-03 · the ruling lands in the DR-10 trail', async () => {
    await svc.dispatch(seat('compliance'), rule('2026-09-09'));
    const events = commandAuditSink.byEvent('t_calendar_day_set');
    expect(events).toHaveLength(1);
    expect(events[0].outcome).toBe('done');
    expect(events[0].scope.businessRoles).toEqual(['compliance']);
  });

  it('BL50-VERB-04 · setAt is minted by the store; a payload setAt is ignored', async () => {
    await svc.dispatch(seat('compliance'), rule('2026-09-09', { setAt: '1999-01-01T00:00:00.000Z' }));
    expect(workingCalendarStore.rulings()[workingCalendarStore.rulings().length - 1]?.setAt).not.toBe('1999-01-01T00:00:00.000Z');
  });
});

describe('BL-50 · who may rule — the role atom, both ways', () => {
  it('BL50-ROLE-01 · compliance and admin (ADM) hold calendar:set; the measured lanes do not', () => {
    // `rolesHolding` names the OWNING lanes and leaves the superset seats out
    // by design, so ADM's hold is asserted on its own bundle.
    expect(rolesHolding('calendar:set')).toEqual(['compliance']);
    expect(SYSTEM_ROLES.admin).toContain('calendar:set');
    // The lanes the deadlines measure must NOT hold it.
    for (const lane of ['planning', 'procurement', 'receiving', 'finance', 'requisitioner'] as const) {
      expect(SYSTEM_ROLES[lane], lane).not.toContain('calendar:set');
    }
    for (const lane of PERSONA_SYSTEM_ROLES.supplier) {
      expect(SYSTEM_ROLES[lane], lane).not.toContain('calendar:set');
    }
  });

  it('BL50-ROLE-02 · the Hub administrator seat (admin) can rule a day', async () => {
    const r = await svc.dispatch(seat('admin'), rule('2026-09-09'));
    expect(r.status, r.reason).toBe('done');
  });

  it('BL50-ROLE-03 · a planner is refused at the ROLE gate — a party may not set the clock it is timed on', async () => {
    const r = await svc.dispatch(seat('planning'), rule('2026-09-09'));
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/^ROLE_NOT_PERMITTED/);
    expect(isWorkingDay('2026-09-09', hubWorkingCalendar())).toBe(true);
  });

  it('BL50-ROLE-04 · procurement is refused at the ROLE gate', async () => {
    const r = await svc.dispatch(seat('procurement'), rule('2026-09-09'));
    expect(r.reason).toMatch(/^ROLE_NOT_PERMITTED/);
  });

  it('BL50-ROLE-05 · a supplier is refused, and nothing is recorded', async () => {
    const before = workingCalendarStore.rulings().length;
    expect(await outcomeOf(supplier, rule('2026-09-09'))).toBe('throw/SCOPE_DENIED');
    expect(workingCalendarStore.rulings()).toHaveLength(before);
  });
});

describe('BL-50 · the policy — each refusal names what it refused', () => {
  it('BL50-POL-01 · a date outside the SAP load is NOT_FOUND, never a silently created ruling', async () => {
    const before = workingCalendarStore.rulings().length;
    expect(await outcomeOf(seat('compliance'), rule('2027-01-04'))).toBe('throw/NOT_FOUND');
    expect(workingCalendarStore.rulings()).toHaveLength(before);
  });

  it('BL50-POL-02 · a kind that is neither working nor non-working is refused', async () => {
    const r = await svc.dispatch(seat('compliance'), rule('2026-09-09', { kind: 'holiday' }));
    expect(r.reason).toMatch(/kind 'holiday'/);
  });

  it('BL50-POL-03 · a blank reason is refused — presence is not substance', async () => {
    const r = await svc.dispatch(seat('compliance'), rule('2026-09-09', { reason: '   ' }));
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/reason/);
  });

  it('BL50-POL-04 · a malformed attribution is refused', async () => {
    const r = await svc.dispatch(seat('compliance'), rule('2026-09-09', { setBy: { kind: 'SYSTEM' } }));
    expect(r.reason).toMatch(/setBy/);
  });

  it('BL50-POL-05 · a working ruling on a Saturday is accepted (a make-up day)', async () => {
    const r = await svc.dispatch(seat('compliance'), rule('2026-09-12', { kind: 'working', reason: 'Make-up working day' }));
    expect(r.status, r.reason).toBe('done');
    expect(isWorkingDay('2026-09-12', hubWorkingCalendar())).toBe(true);
  });
});
