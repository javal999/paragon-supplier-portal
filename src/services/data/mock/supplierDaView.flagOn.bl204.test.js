// ────────────────────────────────────────────────────────────────────────────
// BL-204 (DRC-1, DRC-8 Incoming DA) — with `SUPPLIER_DA_VIEW_ENABLED` switched
// ON for this file only (the shipped value is false; see
// `supplierDaView.bl204.test.js`). A supplier reads exactly its own pairs,
// never another supplier's, and every figure equals what the planner's read
// shows as published for that pair. The Incoming DA confirmation is stored
// with the feedstock confirmation, naming the publication it confirmed.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
import { feedstockConfirmationStore } from './stores/feedstockConfirmationStore';
import { forecastVersionStore } from './stores/forecastHubStores';
import { currentVersion } from './forecastReadModel';
import { assignedMaterialCodesOf } from './inventoryReadModel';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { SUPPLIER_DA_VIEW_ENABLED } from '../../transitions/supplierDaView';
import { dayOf } from '../../transitions/inventoryRules';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

vi.mock('../../transitions/supplierDaView', async (importOriginal) => ({
  .../** @type {object} */ (await importOriginal()),
  SUPPLIER_DA_VIEW_ENABLED: true
}));

const svc = new MockProcurementService();
const cmd = new MockCommandService();
/** @type {QueryScope} */
const planning = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};
/** @param {string} supplierId @returns {QueryScope} */
const supplier = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
});

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
  feedstockConfirmationStore.reset();
  demandAnticipationStore.all();
});

/**
 * The planner's published figures per pair, from the planner's own read.
 * @returns {Promise<Map<string, { week: string; qty: number | null }[]>>}
 */
const plannerPublished = async () => {
  const page = await svc.getDemandAnticipation(planning);
  return new Map(
    page.items.map((r) => [
      `${r.supplierId}|${r.materialCode}`,
      r.weeks.filter((w) => w.published !== null).map((w) => ({ week: w.week, qty: w.published }))
    ])
  );
};

describe('BL-204 · flag on — the supplier view (DRC-1)', () => {
  it('the mock took: the flag reads true in this file', () => {
    expect(SUPPLIER_DA_VIEW_ENABLED).toBe(true);
  });

  it('each supplier reads exactly its own pairs, never another supplier’s', async () => {
    const all = (await svc.getSupplierDemandAnticipation(planning)).items;
    const suppliers = [...new Set(all.map((r) => r.supplierId))];
    // Control: at least two suppliers hold published pairs, named.
    expect(suppliers).toEqual(expect.arrayContaining(['sup-002', 'sup-007']));
    for (const sid of suppliers) {
      const own = (await svc.getSupplierDemandAnticipation(supplier(sid))).items;
      expect(own.length).toBeGreaterThan(0);
      expect(own.every((r) => r.supplierId === sid)).toBe(true);
      expect(own.map((r) => r.materialCode)).toEqual(
        all.filter((r) => r.supplierId === sid).map((r) => r.materialCode)
      );
    }
    const petb = (await svc.getSupplierDemandAnticipation(supplier('sup-007'))).items;
    expect(petb.map((r) => r.materialCode)).toContain('PK-PETB-8802');
    expect(petb.some((r) => r.materialCode === 'RM-EMUL-9410')).toBe(false);
  });

  it('every own figure equals the planner’s published figure for the pair', async () => {
    const planner = await plannerPublished();
    const own = (await svc.getSupplierDemandAnticipation(supplier('sup-007'))).items;
    expect(own.length).toBeGreaterThan(0);
    for (const r of own) {
      const expected = planner.get(`${r.supplierId}|${r.materialCode}`);
      expect(expected?.length, `${r.materialCode} has published weeks`).toBeGreaterThan(0);
      expect(r.weeks.map((w) => ({ week: w.week, qty: w.qty }))).toEqual(expected);
      expect(r.totalDa).toBe(
        /** @type {{ qty: number }[]} */ (expected).reduce((n, w) => n + w.qty, 0)
      );
    }
  });

  it('a re-publication supersedes: the supplier reads the newer figures, still equal to the planner’s', async () => {
    // A new packaging version raising week 2 of sup-007 × PK-PETB-8802 by 10,000.
    const current = /** @type {import('../../sdc/types').ForecastPublication} */ (
      currentVersion('packaging')
    );
    forecastVersionStore.add({
      ...current,
      publicationId: 'FC-PK-BL204-PROBE',
      version: (current.version ?? 0) + 1,
      publishedAt: '2026-08-31T10:00:00.000Z',
      lines: current.lines.map((l) =>
        l.supplierId === 'sup-007' &&
        l.materialCode === 'PK-PETB-8802' &&
        l.periodBucket === '2026-09-07'
          ? { ...l, forecastQty: l.forecastQty + 10_000 }
          : l
      )
    });
    const before = (await svc.getSupplierDemandAnticipation(supplier('sup-007'))).items.find(
      (r) => r.materialCode === 'PK-PETB-8802'
    );
    const published = await cmd.dispatch(planning, {
      transitionId: 't_demandanticipation_publish',
      entity: 'demandAnticipation',
      payload: { planningWeek: '2026-08-31', agreedFirstOutside: [] }
    });
    expect(published.status, published.reason).toBe('done');
    const after = (await svc.getSupplierDemandAnticipation(supplier('sup-007'))).items.find(
      (r) => r.materialCode === 'PK-PETB-8802'
    );
    expect(after?.publicationId).not.toBe(before?.publicationId);
    // The total rises (the LTP and the safety order it drives both move); the
    // planner's read is the authority on the exact figures.
    expect(after?.totalDa ?? 0).toBeGreaterThan(before?.totalDa ?? 0);
    const planner = await plannerPublished();
    expect(after?.weeks.map((w) => ({ week: w.week, qty: w.qty }))).toEqual(
      planner.get('sup-007|PK-PETB-8802')
    );
  });
});

describe('BL-204 · flag on — Incoming DA with the feedstock confirmation (DRC-8)', () => {
  const today = () => dayOf(sdcClock.now());

  it('is stored with the confirmation, naming the publication it confirmed', async () => {
    const r = await cmd.dispatch(supplier('sup-007'), {
      transitionId: 't_feedstock_confirm',
      entity: 'feedstockConfirmation',
      payload: {
        supplierId: 'sup-007',
        materialCode: 'PK-PETB-8802',
        feedstockQty: 25,
        confirmedOn: today(),
        incomingDaConfirmed: true
      }
    });
    expect(r.status, r.reason).toBe('done');
    const da = (await svc.getSupplierDemandAnticipation(supplier('sup-007'))).items.find(
      (x) => x.materialCode === 'PK-PETB-8802'
    );
    expect(feedstockConfirmationStore.all()).toMatchObject([
      {
        supplierId: 'sup-007',
        materialCode: 'PK-PETB-8802',
        feedstockQty: 25,
        incomingDa: {
          publicationId: da?.publicationId,
          planningWeek: da?.planningWeek,
          totalDa: da?.totalDa
        }
      }
    ]);
    // Read back on the supplier's own stock row, beside the feedstock.
    const inv = await svc.getInventory(supplier('sup-007'));
    expect(inv.items.find((p) => p.materialCode === 'PK-PETB-8802')?.feedstock?.incomingDa).toEqual(
      feedstockConfirmationStore.all()[0].incomingDa
    );
  });

  it('is refused for an assigned material no publication holds, and when not a boolean', async () => {
    const published = new Set(
      (await svc.getSupplierDemandAnticipation(supplier('sup-007'))).items.map(
        (r) => r.materialCode
      )
    );
    const unpublished = [...assignedMaterialCodesOf('sup-007')].find((m) => !published.has(m));
    expect(unpublished, 'sup-007 has an assigned material with no publication').toBeDefined();
    const base = {
      supplierId: 'sup-007',
      feedstockQty: 5,
      confirmedOn: today()
    };
    const noDa = await cmd.dispatch(supplier('sup-007'), {
      transitionId: 't_feedstock_confirm',
      entity: 'feedstockConfirmation',
      payload: { ...base, materialCode: unpublished, incomingDaConfirmed: true }
    });
    expect(noDa.reason).toMatch(/INCOMING_DA_NOT_AVAILABLE$/);
    const bad = await cmd.dispatch(supplier('sup-007'), {
      transitionId: 't_feedstock_confirm',
      entity: 'feedstockConfirmation',
      payload: { ...base, materialCode: 'PK-PETB-8802', incomingDaConfirmed: 'yes' }
    });
    expect(bad.reason).toMatch(/INCOMING_DA_INVALID$/);
    expect(feedstockConfirmationStore.all()).toEqual([]);
  });
});
