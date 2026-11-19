// ────────────────────────────────────────────────────────────────────────────
// BL-339 (PSC-4) — BUFFERS, MODEL A, through the pure rules and the real
// services. Proved here, by named case:
//   • AC-01 — the figures the requirement names, at the TWO per-material
//     settings the owner ruled on 2026-11-19 (P = 4, coverage = 2): Protection
//     80, Strategic festive 90, Material 200, Strategic total 290;
//   • AC-02 — ROP Order adds Protection and the Strategic total ONCE each;
//   • AC-03 — a buffer whose input is missing reads "Not available" and is
//     not added (BR-08);
//   • AC-04 — the event calendar switches the Material Buffer on inside a
//     window and off outside it; the planner's override needs a reason;
//   • AC-06 — a cover setting moves ROP Order only and is recorded with the
//     figure's stored inputs and rules version (DRC-D16); an LTP A change
//     writes the DA's out-of-date cause instead (BR-10, Q2).
//
// ⚠️ **TWO SETTINGS (owner ruling 2026-11-19).** The Protection Buffer keeps
// its cover setting P (default 4). The Material Buffer has its OWN coverage
// weeks (default 2) and averages LTP A over those next N hub weeks. AC-01
// therefore holds exactly as the requirement wrote it.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import {
  COVERAGE_WEEKS_DEFAULT,
  COVER_WEEKS_DEFAULT,
  bufferModelA,
  festiveBuffer,
  materialBuffer,
  protectionBuffer,
  ropOrderAdders
} from '../../transitions/bufferModelA';
import {
  defaultTyphoonWindow,
  eventKey,
  eventRefusal,
  materialBufferSwitch
} from '../../transitions/eventCalendarRules';
import { osipRops } from '../../transitions/osipRopRules';
import { RULES_VERSION } from '../../transitions/osipRules';
import { ltpInputStore } from './stores/ltpInputStore';
import { osipParamStore } from './stores/osipParamStore';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
import { eventCalendarStore } from '../../transitions/eventCalendarStore';
import { ropOrderAuditStore } from './stores/ropOrderAuditStore';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const cmd = new MockCommandService();
const svc = new MockProcurementService();
/** @type {import('../types').QueryScope} */
const planning = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};
/** @type {import('../types').QueryScope} */
const admin = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['admin'],
  actor: NO_PERSON
};
const MAT = 'PK-PETB-8802';

beforeEach(() => {
  sdcClock.reset();
  ltpInputStore.reset();
  osipParamStore.reset();
  demandAnticipationStore.reset();
  eventCalendarStore.reset();
  ropOrderAuditStore.reset();
  demandAnticipationStore.all();
});

// ── AC-01 — the figures ──────────────────────────────────────────────────────
const A = [100, 100, 100];
const B = [120, 120, 120];
const FESTIVE = [130, 130, 130];

describe('AC-01 — Protection, Strategic festive and the Material Buffer', () => {
  it('Protection = max(0, AVG(B) − AVG(A)) × P = (120 − 100) × 4 = 80', () => {
    expect(protectionBuffer({ ltpA: A, ltpB: B, leadTimeWeeks: 3, coverWeeks: 4 })).toEqual({
      value: 80,
      avgA: 100,
      avgB: 120,
      difference: 20
    });
  });

  it('Strategic festive = Σ max(0, Festive − A) over 3 lead-time weeks = 30 × 3 = 90', () => {
    expect(festiveBuffer({ ltpA: A, ltpFestive: FESTIVE, leadTimeWeeks: 3 })).toEqual({
      value: 90,
      weeks: 3
    });
  });

  it('Material = its own coverage weeks × the average weekly LTP A over them: 2 × 100 = 200', () => {
    expect(materialBuffer({ ltpA: A, leadTimeWeeks: 3, coverageWeeks: 2 })).toEqual({
      value: 200,
      average: 100
    });
  });

  it('AC-01 as shipped: P = 4, coverage = 2 → 80 / 90 / 200 / 290', () => {
    const buffers = bufferModelA({
      ltpA: A,
      ltpB: B,
      ltpFestive: FESTIVE,
      leadTimeWeeks: 3,
      coverWeeks: 4,
      coverageWeeks: 2,
      materialOn: true
    });
    expect(buffers.protection.value).toBe(80);
    expect(buffers.festive.value).toBe(90);
    expect(buffers.material.value).toBe(200);
    expect(buffers.strategic.value).toBe(290);
    expect(buffers.strategic.missing).toEqual([]);
  });

  it('the two defaults are the ruling: cover 4 weeks, coverage 2 weeks', () => {
    const buffers = bufferModelA({ ltpA: A, ltpB: B, ltpFestive: FESTIVE, leadTimeWeeks: 3 });
    expect(COVER_WEEKS_DEFAULT).toBe(4);
    expect(COVERAGE_WEEKS_DEFAULT).toBe(2);
    expect(buffers.coverWeeks).toBe(4);
    expect(buffers.coverageWeeks).toBe(2);
  });

  it('a buffer never goes below 0: B below A reads 0, not a credit', () => {
    const p = protectionBuffer({
      ltpA: A,
      ltpB: [90, 90, 90],
      leadTimeWeeks: 3,
      coverWeeks: 4
    });
    expect(p.difference).toBe(-10);
    expect(p.value).toBe(0);
  });

  it('the lead time missing: all 3 components read "Not available"', () => {
    const buffers = bufferModelA({
      ltpA: A,
      ltpB: B,
      ltpFestive: FESTIVE,
      leadTimeWeeks: null,
      coverWeeks: 4,
      coverageWeeks: 2,
      materialOn: true
    });
    expect(buffers.protection.value).toBeNull();
    expect(buffers.festive.value).toBeNull();
    expect(buffers.material.value).toBeNull();
    expect(buffers.strategic.value).toBe(0);
  });
});

// ── AC-02 — ROP Order adds each component once ───────────────────────────────
/** A minimal `osipSafety` figure set, so `osipRops` can run without the engine. */
const safety = () => ({
  safetyOn: true,
  safetyOrder: { value: 0, sd: 0, roundTo: 1, unavailable: null },
  fisik: {
    value: 0,
    demandPerDay: 10,
    consumptionPerDay: 10,
    ltpPerDay: 10,
    f: 7,
    unavailable: null
  },
  flags: /** @type {const} */ ([])
});
/** @param {Record<string, unknown>} over */
const ropInput = (over) => ({
  supplierId: 'sup-x',
  materialCode: 'M-X',
  ltp: A,
  leadTimeWeeks: 3,
  mpq: 1,
  moq: 1,
  koli: 10,
  consumption: [],
  supplyArea: /** @type {const} */ ('import'),
  ...over
});

describe('AC-02 — ROP Order adds Protection and the Strategic total once each', () => {
  it('cycle 300 + safety 0 + Protection 80 + Strategic 290 = 670', () => {
    const fig = osipRops(
      ropInput({
        ltpB: B,
        ltpFestive: FESTIVE,
        coverWeeks: 4,
        coverageWeeks: 2,
        materialBufferOn: true
      }),
      safety(),
      4
    );
    expect(fig.ropOrder.cycleStock).toBe(300);
    expect(fig.ropOrder.protection).toBe(80);
    expect(fig.ropOrder.strategic).toBe(290);
    expect(fig.ropOrder.value).toBe(670);
    expect(ropOrderAdders(fig.buffers)).toBe(370);
  });

  it('no per-week LTP B − LTP A adder: a 3-week horizon adds ONE Protection quantity', () => {
    const fig = osipRops(ropInput({ ltpB: B, coverWeeks: 4, coverageWeeks: 2 }), safety(), 4);
    expect(fig.ropOrder.protection).toBe(80);
    // The retired per-week adder summed 20 × 3 = 60; the model A figure is 80,
    // and it is added once, not per week. The Material Buffer is off on this
    // input (no calendar state), so the Strategic total is the festive 0.
    expect(fig.ropOrder.value).toBe(300 + 0 + 80 + 0);
  });
});

// ── AC-03 — "Not available" ─────────────────────────────────────────────────
describe('AC-03 — a missing input reads "Not available" and is not added', () => {
  it('no LTP B: Protection is null and ROP Order excludes it', () => {
    const fig = osipRops(
      ropInput({ ltpFestive: FESTIVE, coverWeeks: 4, coverageWeeks: 2 }),
      safety(),
      4
    );
    expect(fig.buffers.protection.value).toBeNull();
    expect(fig.ropOrder.protection).toBeNull();
    // Strategic festive survives; the Material Buffer is off (no calendar data
    // on this input), so ROP Order = cycle + safety + festive.
    expect(fig.buffers.festive.value).toBe(90);
    expect(fig.ropOrder.value).toBe(300 + 0 + 0 + 90);
  });

  it('no LTP Festive: the festive component is null and named as missing', () => {
    const buffers = bufferModelA({
      ltpA: A,
      ltpB: B,
      ltpFestive: null,
      leadTimeWeeks: 3,
      coverWeeks: 4,
      coverageWeeks: 2,
      materialOn: true
    });
    expect(buffers.festive.value).toBeNull();
    expect(buffers.strategic.missing).toContain('festive');
  });

  it('a partial Festive series cannot give an average-backed sum: null, not a guessed 0', () => {
    expect(
      festiveBuffer({ ltpA: A, ltpFestive: [130, null, 130], leadTimeWeeks: 3 }).value
    ).toBeNull();
  });
});

// ── AC-04 — the event calendar's switch ─────────────────────────────────────
describe('AC-04 — CNY and Typhoon windows switch the Material Buffer', () => {
  const typhoon = defaultTyphoonWindow('2026-10-12');
  /** @type {import('../../transitions/eventCalendarRules').CalendarEventRow} */
  const window = {
    id: eventKey('Typhoon', typhoon.startsOn),
    kind: 'Typhoon',
    startsOn: typhoon.startsOn,
    endsOn: typhoon.endsOn,
    reason: 'Storm makes landfall on 12 October',
    setAt: '2026-08-31T12:00:00.000Z',
    setBy: NO_PERSON
  };

  it('the Typhoon window defaults to the 2 weeks before landfall (BL-332)', () => {
    expect(typhoon).toEqual({ startsOn: '2026-09-28', endsOn: '2026-10-12' });
  });

  it('on inside the window, off after it', () => {
    expect(materialBufferSwitch({ events: [window], week: '2026-09-28', override: null })).toEqual({
      on: true,
      source: 'calendar',
      event: window
    });
    expect(materialBufferSwitch({ events: [window], week: '2026-10-19', override: null })).toEqual({
      on: false,
      source: 'calendar',
      event: null
    });
  });

  it('the planner override decides alone and persists into the next window until cleared', () => {
    expect(
      materialBufferSwitch({ events: [window], week: '2026-09-28', override: false })
    ).toMatchObject({ on: false, source: 'override' });
    // After the window it still decides (the edge case: the next window cannot
    // override the manual choice until it is cleared).
    expect(
      materialBufferSwitch({ events: [window], week: '2026-10-19', override: true })
    ).toMatchObject({ on: true, source: 'override' });
    // Cleared: the calendar decides again.
    expect(
      materialBufferSwitch({ events: [window], week: '2026-10-19', override: null })
    ).toMatchObject({ on: false, source: 'calendar' });
  });

  it('the form predicate refuses a window that ends before it starts, and a blank reason', () => {
    expect(
      eventRefusal({
        kind: 'CNY',
        startsOn: '2027-02-14',
        endsOn: '2027-02-01',
        reason: 'Window'
      })
    ).toMatch(/EVENT_WINDOW_INVALID/);
    expect(
      eventRefusal({ kind: 'CNY', startsOn: '2027-02-01', endsOn: '2027-02-14', reason: '  ' })
    ).toMatch(/EVENT_REASON_REQUIRED/);
  });

  it('the verb writes a window for ADM and refuses the planner at the role gate', async () => {
    const vars = {
      transitionId: 't_eventcalendar_set',
      entity: 'eventCalendar',
      entityId: eventKey('CNY', '2027-02-01'),
      payload: {
        kind: 'CNY',
        startsOn: '2027-02-01',
        endsOn: '2027-02-14',
        reason: 'Chinese New Year window 2027',
        setBy: NO_PERSON
      }
    };
    expect((await cmd.dispatch(admin, vars)).status).toBe('done');
    expect(eventCalendarStore.inForce().some((r) => r.id === 'CNY|2027-02-01')).toBe(true);
    const audit = ropOrderAuditStore.all();
    expect(audit[audit.length - 1]?.field).toBe('eventWindow');
    // Planning holds no `eventcalendar:set`: the role gate refuses it, whether
    // by a failed result or a thrown DataError (both are the dispatcher's).
    let refused = false;
    try {
      refused = (await cmd.dispatch(planning, vars)).status === 'failed';
    } catch {
      refused = true;
    }
    expect(refused).toBe(true);
  });
});

// ── AC-06 — a DA version vs the DRC-D16 record ──────────────────────────────
describe('AC-06 — ROP-only changes record DRC-D16 and write no DA version', () => {
  const rowsOf = async () =>
    (await svc.getDemandAnticipation(planning)).items.filter((r) => r.materialCode === MAT);

  it('a cover-setting change moves ROP Order, records DRC-D16 and leaves the DA published', async () => {
    expect((await rowsOf()).every((r) => r.outOfDate === null)).toBe(true);
    const res = await cmd.dispatch(planning, {
      transitionId: 't_osipparam_set',
      entity: 'osipParam',
      entityId: `coverWeeks|${MAT}`,
      payload: { osipParamValue: 6 }
    });
    expect(res.status).toBe('done');
    // No DA version, no cause: the published DA is untouched.
    expect((await rowsOf()).every((r) => r.outOfDate === null)).toBe(true);
    // The ROP Order figure's stored inputs and rules version (DRC-D16).
    const audit = ropOrderAuditStore.all();
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ field: 'coverWeeks', value: 6, key: `coverWeeks|${MAT}` });
    expect(audit[0].figure.rulesVersion).toBe(RULES_VERSION);
    expect(audit[0].figure.inputs).toMatchObject({ coverWeeks: 6 });
  });

  it('an LTP A change that moves DA writes the DA version cause instead', async () => {
    const weeks = (await rowsOf())[0].weeks.map((w) => w.week);
    const res = await cmd.dispatch(planning, {
      transitionId: 't_ltpinput_set',
      entity: 'ltpInput',
      entityId: `upload|${MAT}|A`,
      payload: {
        weeks: Object.fromEntries(weeks.map((w) => [w, 9_999_999])),
        sourceFile: 'ltp-a.csv'
      }
    });
    expect(res.status).toBe('done');
    const marked = (await rowsOf()).filter((r) => r.outOfDate);
    expect(marked.length).toBeGreaterThan(0);
    expect(marked[0].outOfDate?.causes.map((c) => c.kind)).toContain('ltpA');
    // No ROP-only record: an LTP A change is a DA input, not a DRC-D16 change.
    expect(ropOrderAuditStore.all()).toHaveLength(0);
  });

  it('the protection buffer switch is ROP-only (Q2): DRC-D16, never a DA cause', async () => {
    const res = await cmd.dispatch(planning, {
      transitionId: 't_osipparam_set',
      entity: 'osipParam',
      entityId: `protectionBufferOn|${MAT}`,
      payload: { osipParamValue: false, osipParamReason: 'Supplier audit pending' }
    });
    expect(res.status).toBe('done');
    const audit = ropOrderAuditStore.all();
    expect(audit[audit.length - 1]).toMatchObject({
      field: 'protectionBufferOn',
      value: false,
      reason: 'Supplier audit pending'
    });
    expect((await rowsOf()).every((r) => r.outOfDate === null)).toBe(true);
  });
});
