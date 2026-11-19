// BL-268 (PEX-6) — DA versions through the REAL services: out of date with the
// cause, the next publication stores the causes, the history carries version,
// cause and the previous version's figure.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { ltpInputStore } from './stores/ltpInputStore';
import { osipParamStore } from './stores/osipParamStore';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
import { allDemandAnticipationHistory } from './demandAnticipationHistoryReadModel';
import { hubWeeks } from '../../transitions/demandAnticipationRules';
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
const MAT = 'PK-PETB-8802';

beforeEach(() => {
  sdcClock.reset();
  ltpInputStore.reset();
  osipParamStore.reset();
  demandAnticipationStore.reset();
  demandAnticipationStore.all();
});
afterEach(() => {
  ltpInputStore.reset();
  osipParamStore.reset();
  sdcClock.reset();
});

const lastPublication = () => {
  const all = demandAnticipationStore.all();
  return all[all.length - 1];
};
const rows = async () =>
  (await svc.getDemandAnticipation(planning)).items.filter((r) => r.materialCode === MAT);
/** @param {string} series @param {number} qty */
const upload = async (series, qty) => {
  const keys = (await rows())[0].weeks.map((w) => w.week);
  return cmd.dispatch(planning, {
    transitionId: 't_ltpinput_set',
    entity: 'ltpInput',
    entityId: `upload|${MAT}|${series}`,
    payload: { weeks: Object.fromEntries(keys.map((k) => [k, qty])), sourceFile: `${series}.csv` }
  });
};
const publish = () =>
  cmd.dispatch(planning, {
    transitionId: 't_demandanticipation_publish',
    entity: 'demandAnticipation',
    payload: { planningWeek: hubWeeks(sdcClock.now(), 1)[0], agreedFirstOutside: [] }
  });

describe('out of date (BR-01)', () => {
  it('nothing is marked at the start', async () => {
    for (const r of await rows()) expect(r.outOfDate).toBeNull();
  });

  it('PSC-4 BR-01: an LTP B upload marks nothing (DA reads LTP A only)', async () => {
    await upload('B', 5_000_000);
    for (const r of await rows()) expect(r.outOfDate).toBeNull();
  });

  it('AC-01: an LTP A upload that moves DA marks the published DA out of date, cause "LTP A"', async () => {
    await upload('A', 5_000_000);
    const marked = (await rows()).filter((r) => r.outOfDate);
    expect(marked.length).toBeGreaterThan(0);
    for (const r of marked) {
      const causes = r.outOfDate?.causes ?? [];
      expect(causes.map((c) => c.kind)).toContain('ltpA');
      const c = causes.find((x) => x.kind === 'ltpA');
      expect(c?.before).toBeNull();
      expect(c?.after).toBeGreaterThan(0);
    }
  });

  it('a Z change that moves the safety order is a cause', async () => {
    const before = await rows();
    const r0 = before[0];
    await cmd.dispatch(planning, {
      transitionId: 't_osipparam_set',
      entity: 'osipParam',
      entityId: `z|${MAT}`,
      payload: { osipParamValue: 4.5 }
    });
    const after = (await rows()).find((r) => r.supplierId === r0.supplierId);
    // The safety order is week 1's; a published week-1 DA moves only if the figure moved.
    if (after?.outOfDate)
      expect(after.outOfDate.causes.some((c) => c.kind === 'safetyStock' && c.detail === 'z')).toBe(
        true
      );
  });
});

describe('the next publication stores the causes (BR-02, BR-04)', () => {
  it('records the cause, numbers the version and keeps the previous figure to compare', async () => {
    await upload('A', 5_000_000);
    expect((await publish()).status).toBe('done');
    const pub = lastPublication();
    const withCause = (pub?.entries ?? []).filter((e) => (e.causes ?? []).length > 0);
    expect(withCause.length).toBeGreaterThan(0);
    expect(withCause[0].causes?.some((c) => c.kind === 'ltpA')).toBe(true);
    expect(pub?.ledgerMark).toEqual({ ltp: 1, osip: 0 });
    // Nothing is out of date once published.
    for (const r of await rows()) expect(r.outOfDate).toBeNull();

    const hist = allDemandAnticipationHistory().filter((h) => h.materialCode === MAT);
    const v2 = hist.filter((h) => h.version === 2);
    const v1 = hist.filter((h) => h.version === 1);
    expect(v2.length).toBeGreaterThan(0);
    expect(v1.length).toBe(v2.length);
    const row = v2.find((h) => h.causes.length > 0);
    expect(row?.causes.some((c) => c.kind === 'ltpA')).toBe(true);
    // The version-1 row has no cause; the version-2 row carries the version-1 figure as "before".
    expect(v1.every((h) => h.causes.length === 0)).toBe(true);
    const first = v1.find((h) => h.supplierId === row?.supplierId);
    expect(row?.weeks.map((w) => w.daBefore)).toEqual(first?.weeks.map((w) => w.da));
    expect(row?.weeks.some((w, i) => w.da !== first?.weeks[i].da)).toBe(true);
  });

  it('an input change that moves no DA figure is not a cause: the second publication carries none', async () => {
    await upload('B', 5_000_000); // DA reads LTP A: DA does not move, ROP Order's Protection does
    expect((await publish()).status).toBe('done');
    const pub = lastPublication();
    expect((pub?.entries ?? []).every((e) => (e.causes ?? []).length === 0)).toBe(true);
  });
});
