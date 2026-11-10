// BL-277 (PEX-15) — the sandbox's Festive and Protection buffer scenarios read the
// LTP inputs through the real services: uploads in, scenario series out.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { ltpInputStore } from './stores/ltpInputStore';
import { whatIfSandbox } from './whatIfSandboxReadModel';
import { scenarioAvailability, scenarioLtp } from '../../transitions/whatIfLevels';
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
});
afterEach(() => {
  ltpInputStore.reset();
  sdcClock.reset();
});

const pair = async () => {
  const row = (await svc.getDemandAnticipation(planning)).items.find((r) => r.materialCode === MAT);
  if (!row) throw new Error('no DA row for the test material');
  return row.supplierId;
};
/** @param {string} supplierId */
const box = (supplierId) => {
  const b = whatIfSandbox(supplierId, MAT);
  if (!b) throw new Error('sandbox does not offer the pair');
  return b;
};
/** @param {string} series @param {Record<string, number>} weeks */
const upload = (series, weeks) =>
  cmd.dispatch(planning, {
    transitionId: 't_ltpinput_set',
    entity: 'ltpInput',
    entityId: `upload|${MAT}|${series}`,
    payload: { weeks, sourceFile: `${series}.csv` }
  });

describe('scenario series from the LTP inputs (PEX-15 BR-02)', () => {
  it('with nothing uploaded only Baseline loads, and it is the live LTP', async () => {
    const b = box(await pair());
    expect(scenarioAvailability(b.ltpSeries)).toEqual([
      { scenario: 'baseline', available: true },
      { scenario: 'festive', available: false },
      { scenario: 'protection', available: false }
    ]);
    expect(b.ltpSeries.A).toEqual(b.live.ltp);
  });

  it('LTP Festive uploaded: the Festive scenario loads it; Protection stays unavailable', async () => {
    const supplierId = await pair();
    const weeks = box(supplierId).live.weeks;
    await upload('Festive', Object.fromEntries(weeks.map((w) => [w, 1_000_000])));
    const b = box(supplierId);
    const festive = scenarioLtp('festive', b.ltpSeries);
    expect(festive).not.toBeNull();
    expect(festive?.length).toBe(weeks.length);
    expect(festive?.every((q) => q > 0)).toBe(true);
    expect(scenarioLtp('protection', b.ltpSeries)).toBeNull();
    expect(scenarioLtp('baseline', b.ltpSeries)).toEqual(b.live.ltp);
  });

  it('LTP B uploaded: the Protection buffer scenario loads it', async () => {
    const supplierId = await pair();
    const weeks = box(supplierId).live.weeks;
    await upload('B', Object.fromEntries(weeks.map((w) => [w, 2_000_000])));
    const b = box(supplierId);
    expect(scenarioLtp('protection', b.ltpSeries)?.length).toBe(weeks.length);
    expect(scenarioLtp('festive', b.ltpSeries)).toBeNull();
  });

  it('LTP A uploaded replaces the forecast as Baseline (PEX-5 BR-02)', async () => {
    const supplierId = await pair();
    const weeks = box(supplierId).live.weeks;
    await upload('A', Object.fromEntries(weeks.map((w) => [w, 3_000_000])));
    const b = box(supplierId);
    expect(b.ltpSeries.A).not.toEqual(b.live.ltp);
    expect(b.ltpSeries.A?.every((q) => q > 0)).toBe(true);
  });

  it('a week the Festive upload leaves out reads LTP A, as the DA page does', async () => {
    const supplierId = await pair();
    const weeks = box(supplierId).live.weeks;
    await upload('Festive', { [weeks[1]]: 9_000_000 });
    const b = box(supplierId);
    const festive = b.ltpSeries.Festive ?? [];
    expect(festive[0]).toBe(b.ltpSeries.A?.[0]);
    expect(festive[1]).toBeGreaterThan(b.ltpSeries.A?.[1] ?? 0);
  });

  it('the LTP choice does not move a scenario: each names its series', async () => {
    const supplierId = await pair();
    const weeks = box(supplierId).live.weeks;
    await upload('B', Object.fromEntries(weeks.map((w) => [w, 2_000_000])));
    const before = box(supplierId).ltpSeries;
    await cmd.dispatch(planning, {
      transitionId: 't_ltpinput_set',
      entity: 'ltpInput',
      entityId: `choice|${MAT}`,
      payload: { ltpChoice: 'B' }
    });
    expect(box(supplierId).ltpSeries).toEqual(before);
  });
});
