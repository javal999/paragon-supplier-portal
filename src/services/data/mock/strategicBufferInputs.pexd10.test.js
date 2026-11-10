// PEX-D10 — the strategic buffer from LTP Festive − LTP A through the REAL services:
// the Capacity page's read agrees with the DA grid's weekly figures, a supplier reads
// none, a material with no Festive upload is absent (DRC-9a stays).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { ltpInputStore } from './stores/ltpInputStore';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
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
const supplier = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};
const MAT = 'PK-PETB-8802';

beforeEach(() => {
  sdcClock.reset();
  ltpInputStore.reset();
});
afterEach(() => ltpInputStore.reset());

/** @param {string} series @param {Record<string, number>} weeks */
const upload = (series, weeks) =>
  cmd.dispatch(planning, {
    transitionId: 't_ltpinput_set',
    entity: 'ltpInput',
    entityId: `upload|${MAT}|${series}`,
    payload: { weeks, sourceFile: `${series}.csv` }
  });

describe('the strategic buffer from the LTP inputs', () => {
  it('is empty until LTP Festive is uploaded', async () => {
    expect((await svc.getStrategicBufferInputs(planning)).items).toEqual([]);
    await upload('A', { '2026-08-31': 100, '2026-09-07': 100 });
    expect((await svc.getStrategicBufferInputs(planning)).items).toEqual([]);
  });

  it('with Festive and A uploaded, a month is Festive − A summed over its weeks, per supplier share', async () => {
    const weeks = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'];
    await upload('A', Object.fromEntries(weeks.map((w) => [w, 20_000])));
    await upload('Festive', Object.fromEntries(weeks.map((w) => [w, 26_000])));
    const items = (await svc.getStrategicBufferInputs(planning)).items.filter(
      (i) => i.materialCode === MAT
    );
    expect(items.length).toBeGreaterThan(0);
    const shares = (await svc.getDemandAnticipation(planning)).items
      .filter((r) => r.materialCode === MAT)
      .map((r) => [r.supplierId, r.share ?? 0]);
    for (const [supplierId, share] of shares) {
      const item = items.find((i) => i.supplierId === supplierId);
      // 4 Mondays, each Festive − A = 6,000 × share.
      expect(item?.months['2026-09']).toEqual({
        buffer: 4 * Math.round(6000 * Number(share)),
        weeks: 4
      });
    }
  });

  it('agrees with the DA grid: the weekly strategic buffers there sum to the Capacity page month', async () => {
    const weeks = ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21'];
    await upload('A', Object.fromEntries(weeks.map((w) => [w, 20_000])));
    await upload('Festive', Object.fromEntries(weeks.map((w) => [w, 27_500])));
    const rows = (await svc.getDemandAnticipation(planning)).items.filter(
      (r) => r.materialCode === MAT
    );
    const items = (await svc.getStrategicBufferInputs(planning)).items;
    for (const r of rows) {
      const grid = r.weeks
        .filter((w) => weeks.includes(w.week))
        .reduce((n, w) => n + (r.ltpInputs?.byWeek[w.week]?.strategicBuffer ?? 0), 0);
      const page = items.find((i) => i.supplierId === r.supplierId && i.materialCode === MAT);
      const pageTotal = Object.values(page?.months ?? {}).reduce((n, m) => n + m.buffer, 0);
      expect(pageTotal).toBe(grid);
      expect(pageTotal).toBeGreaterThan(0);
    }
  });

  it('a supplier reads none', async () => {
    await upload('Festive', { '2026-09-07': 26_000 });
    expect((await svc.getStrategicBufferInputs(supplier)).items).toEqual([]);
  });
});
