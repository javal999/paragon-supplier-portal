// ────────────────────────────────────────────────────────────────────────────
// CAP-12 (BL-181) — open supply and the gap through the REAL services: the
// demand anticipation read carries them per week (no new method), a draft
// dispatched through the real MockCommandService is not supply, and releasing
// it is — the gap falls by exactly the released quantity.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { callOffStore } from './stores/callOffStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
import { forecastVersionStore } from './stores/forecastHubStores';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES, SEEDED_SEAT_ROLES } from '../../transitions/businessRoles';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const cmd = new MockCommandService();
const svc = new MockProcurementService();
/** @type {QueryScope} */
const planner = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: SEEDED_SEAT_ROLES.buyer,
  actor: NO_PERSON
};
/** @type {QueryScope} */
const supplier = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

// Week 6 from the hub's present (Monday 31 August 2026, W36): W41.
const W6 = '2026-10-05';

beforeEach(() => {
  sdcClock.reset();
  callOffStore.reset();
  purchaseOrderStore.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
});

const weekOf = async (/** @type {string} */ week) => {
  const page = await svc.getDemandAnticipation(planner);
  const row = page.items.find(
    (r) => r.supplierId === 'sup-007' && r.materialCode === 'PK-PETB-8801'
  );
  const w = row?.weeks.find((x) => x.week === week);
  if (!w) throw new Error(`no week ${week}`);
  return w;
};

describe('CAP-12 — the demand anticipation read carries open supply and the gap', () => {
  it('every week of every row has openSupply, gap and (where there is a gap) a proposal', async () => {
    const page = await svc.getDemandAnticipation(planner);
    expect(page.items.length).toBeGreaterThan(0);
    for (const r of page.items)
      for (const w of r.weeks) {
        expect(typeof w.openSupply).toBe('number');
        expect(w.gap === null ? null : w.gap).toBe(
          w.qty === null ? null : Math.max(0, w.qty - w.openSupply)
        );
        expect(w.proposal === null).toBe(!(w.gap !== null && w.gap > 0));
      }
  });

  it('sup-007 × PK-PETB-8801 in W36 nets the released call-offs needed that week (35,000)', async () => {
    // Seeded: 10,000 (2 Sep, Confirmed with Changes) + 10,000 (3 Sep) + 15,000 (4 Sep);
    // the 120,000 on 27 Aug is W35, before the shown weeks.
    const w = await weekOf('2026-08-31');
    expect(w.openSupply).toBe(35_000);
    expect(w.gap).toBe(Math.max(0, /** @type {number} */ (w.qty) - 35_000));
  });

  it('a supplier reads no row', async () => {
    expect((await svc.getDemandAnticipation(supplier)).items).toEqual([]);
  });
});

describe('CAP-12 — a draft is not supply; releasing it is', () => {
  it('drafting 10,000 for W41 leaves the gap; releasing it lowers the gap by 10,000', async () => {
    const before = await weekOf(W6);
    expect(before.gap).toBeGreaterThan(10_000);
    const line = /** @type {NonNullable<typeof before.proposal>} */ (before.proposal).callOffs[0];
    expect(line).toBeDefined();
    const drafted = await cmd.dispatch(planner, {
      transitionId: 't_calloff_draft',
      entity: 'callOff',
      payload: {
        poId: line?.poId,
        poLineId: line?.lineId,
        quantity: 10_000,
        needDate: W6,
        type: 'forecast'
      }
    });
    expect(drafted.status).not.toBe('failed');
    const afterDraft = await weekOf(W6);
    expect(afterDraft.openSupply).toBe(before.openSupply);
    expect(afterDraft.gap).toBe(before.gap);

    // The seed already holds a 37,000 Draft for W41 (not supply either); this is the new one.
    const before10k = callOffStore
      .all()
      .filter((c) => c.status === 'Draft' && c.quantity === 10_000);
    expect(before10k).toHaveLength(1);
    const id = /** @type {string} */ (before10k[0]?.id);
    const released = await cmd.dispatch(planner, {
      transitionId: 't_calloff_release_draft',
      entity: 'callOff',
      entityId: id,
      payload: {}
    });
    expect(released.status).not.toBe('failed');
    const afterRelease = await weekOf(W6);
    expect(afterRelease.openSupply).toBe(before.openSupply + 10_000);
    expect(afterRelease.gap).toBe(/** @type {number} */ (before.gap) - 10_000);
  });
});
