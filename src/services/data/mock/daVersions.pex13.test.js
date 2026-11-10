// PEX-13 BR-03 — a safety stock switch change that moves a DA figure marks the published
// DA out of date and the next publication records the switch as its cause (PEX-6).
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
  osipParamStore.reset();
  ltpInputStore.reset();
  sdcClock.reset();
});

const rows = async () =>
  (await svc.getDemandAnticipation(planning)).items.filter((r) => r.materialCode === MAT);
/** @param {string} param @param {boolean | null} value @param {string} [reason] */
const setSwitch = (param, value, reason = 'Supplier audit pending') =>
  cmd.dispatch(planning, {
    transitionId: 't_osipparam_set',
    entity: 'osipParam',
    entityId: `${param}|${MAT}`,
    payload: { osipParamValue: value, osipParamReason: reason }
  });
const publish = () =>
  cmd.dispatch(planning, {
    transitionId: 't_demandanticipation_publish',
    entity: 'demandAnticipation',
    payload: { planningWeek: hubWeeks(sdcClock.now(), 1)[0], agreedFirstOutside: [] }
  });

describe('safety stock switch as a DA version cause', () => {
  it('off: the published DA is out of date, cause "Safety stock switch on → off" with the reason', async () => {
    const before = await rows();
    expect(before.length).toBeGreaterThan(0);
    expect((await setSwitch('safetyStockOn', false)).status).toBe('done');
    const marked = (await rows()).filter((r) => r.outOfDate);
    expect(marked.length).toBeGreaterThan(0);
    for (const r of marked) {
      const c = r.outOfDate?.causes.find((x) => x.kind === 'safetySwitch');
      expect(c).toMatchObject({ before: 'on', after: 'off', reason: 'Supplier audit pending' });
    }
  });

  it('the next publication stores the switch as the cause and numbers version 2', async () => {
    await setSwitch('safetyStockOn', false);
    expect((await publish()).status).toBe('done');
    for (const r of await rows()) expect(r.outOfDate).toBeNull();
    const hist = allDemandAnticipationHistory().filter((h) => h.materialCode === MAT);
    const v2 = hist.filter((h) => h.version === 2 && h.causes.length > 0);
    expect(v2.length).toBeGreaterThan(0);
    expect(v2[0].causes.some((c) => c.kind === 'safetySwitch')).toBe(true);
    // The figure really moved: the safety part of some week fell.
    const v1 = hist.find((h) => h.version === 1 && h.supplierId === v2[0].supplierId);
    expect(v2[0].weeks.some((w, i) => w.da !== v1?.weeks[i].da)).toBe(true);
    expect(v2[0].weeks.every((w) => w.safety === 0)).toBe(true);
  });

  it('back on: the cause reads off → on', async () => {
    await setSwitch('safetyStockOn', false);
    await publish();
    await setSwitch('safetyStockOn', true);
    const c = (await rows())
      .flatMap((r) => r.outOfDate?.causes ?? [])
      .find((x) => x.kind === 'safetySwitch');
    expect(c).toMatchObject({ before: 'off', after: 'on' });
  });

  it('the protection buffer switch moves no DA figure, so nothing is marked', async () => {
    await setSwitch('protectionBufferOn', false);
    for (const r of await rows()) expect(r.outOfDate).toBeNull();
    await publish();
    const hist = allDemandAnticipationHistory().filter((h) => h.materialCode === MAT);
    expect(hist.every((h) => h.causes.length === 0)).toBe(true);
  });
});
