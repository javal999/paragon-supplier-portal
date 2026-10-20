// ────────────────────────────────────────────────────────────────────────────
// BL-204 (DRC-1, DRC-8 Incoming DA) — the SHIPPED state: `SUPPLIER_DA_VIEW_ENABLED`
// is false (DRC-D10), so the supplier read returns nothing and the verb refuses
// an Incoming DA confirmation. The flag-on behaviour is in
// `supplierDaView.flagOn.bl204.test.js`.
//
// Each "returns nothing" is paired with a control proving there WAS something
// to return (the planner read has the supplier's rows), so an empty page here
// cannot be an empty population.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
import { feedstockConfirmationStore } from './stores/feedstockConfirmationStore';
import { supplierDemandAnticipation } from './demandAnticipationReadModel';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { SUPPLIER_DA_VIEW_ENABLED, supplierDaRows } from '../../transitions/supplierDaView';
import { dayOf } from '../../transitions/inventoryRules';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const svc = new MockProcurementService();
const cmd = new MockCommandService();
/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};
/** @type {QueryScope} */
const sup007 = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  feedstockConfirmationStore.reset();
});

describe('BL-204 · the flag ships off (DRC-D10)', () => {
  it('SUPPLIER_DA_VIEW_ENABLED is false', () => {
    expect(SUPPLIER_DA_VIEW_ENABLED).toBe(false);
  });

  it('the supplier read returns nothing to a supplier, though its published rows exist', async () => {
    const planner = await svc.getDemandAnticipation(buyer);
    // Control: the planner's read holds sup-007 × PK-PETB-8802, published.
    expect(
      planner.items.some(
        (r) =>
          r.supplierId === 'sup-007' &&
          r.materialCode === 'PK-PETB-8802' &&
          r.planSource === 'published'
      )
    ).toBe(true);
    expect(supplierDemandAnticipation().some((r) => r.supplierId === 'sup-007')).toBe(true);
    expect((await svc.getSupplierDemandAnticipation(sup007)).items).toEqual([]);
    // Off for every scope: nobody reads the supplier view while it is off.
    expect((await svc.getSupplierDemandAnticipation(buyer)).items).toEqual([]);
  });

  it('the verb refuses an Incoming DA confirmation; a plain feedstock confirmation still works', async () => {
    const payload = {
      supplierId: 'sup-007',
      materialCode: 'PK-PETB-8802',
      feedstockQty: 10,
      confirmedOn: dayOf(sdcClock.now())
    };
    const refused = await cmd.dispatch(sup007, {
      transitionId: 't_feedstock_confirm',
      entity: 'feedstockConfirmation',
      payload: { ...payload, incomingDaConfirmed: true }
    });
    expect(refused.status).toBe('failed');
    expect(refused.reason).toMatch(/INCOMING_DA_NOT_AVAILABLE$/);
    expect(feedstockConfirmationStore.all()).toEqual([]);

    const done = await cmd.dispatch(sup007, {
      transitionId: 't_feedstock_confirm',
      entity: 'feedstockConfirmation',
      payload
    });
    expect(done.status, done.reason).toBe('done');
    const [row] = feedstockConfirmationStore.all();
    expect(row).toMatchObject({ supplierId: 'sup-007', materialCode: 'PK-PETB-8802' });
    expect(row.incomingDa).toBeUndefined();
  });
});

describe('BL-204 · supplierDaRows (pure)', () => {
  it('reads each pair from the LATEST publication holding it, with the stored figures', () => {
    const [seed] = demandAnticipationStore.all();
    const entry =
      /** @type {import('../../transitions/demandAnticipationRules').DemandAnticipationEntry} */ (
        seed.entries.find((e) => e.supplierId === 'sup-007' && e.materialCode === 'PK-PETB-8802')
      );
    const v = entry.figure.value;
    const later = {
      ...seed,
      id: 'dap-9999',
      publishedAt: '2026-09-01T00:00:00.000Z',
      entries: [
        {
          ...entry,
          figure: { ...entry.figure, value: { ...v, daInForce: v.daInForce.map((q) => q + 1) } }
        }
      ]
    };
    const rows = supplierDaRows([seed, later]);
    const petb = rows.find((r) => r.supplierId === 'sup-007' && r.materialCode === 'PK-PETB-8802');
    expect(petb?.publicationId).toBe('dap-9999');
    expect(petb?.weeks.map((w) => w.qty)).toEqual(v.daInForce.map((q) => q + 1));
    expect(petb?.weeks.map((w) => w.week)).toEqual(v.horizonWeeks);
    expect(petb?.totalDa).toBe(v.daInForce.reduce((n, q) => n + q + 1, 0));
    // A pair only the seed holds still reads from the seed.
    const other = rows.find((r) => r.publicationId === seed.id);
    expect(other).toBeDefined();
    // One row per pair.
    expect(new Set(rows.map((r) => `${r.supplierId}|${r.materialCode}`)).size).toBe(rows.length);
  });
});
