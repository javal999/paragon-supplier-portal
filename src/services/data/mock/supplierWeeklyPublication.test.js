// ─────────────────────────────────────────────────────────────────────────────
// UCX-P4 v2 (BL-365) — the weekly page's publication identity read.
//
// PSC-1 BR-10: the week-level confirmation names the publication and its
// materials, so the weekly page needs the publication's IDENTITY. DRC-D10 keeps
// the supplier DA view off, so this read must carry NO figure — the test pins
// the exact key set, which is what makes a future `qty` join a defect rather
// than a quiet widening.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { mockDataService } from './mockDataService';
import { daConfirmationStore } from './stores/daConfirmationStore';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
import { supplierWeeklyPublication } from './daConfirmationReadModel';
import { SEEDED_SEAT_ROLES } from '../../transitions/businessRoles';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';
/** @import { QueryScope } from '../types' */

/** @type {QueryScope} */
const supplierScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
};

/** @type {QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: SEEDED_SEAT_ROLES.buyer,
  actor: NO_PERSON
};

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  daConfirmationStore.reset();
});

describe('UCX-P4 · the publication identity carries no demand figure', () => {
  it('returns the week, the publication id, the published date and its materials', () => {
    const publication = supplierWeeklyPublication('sup-007');
    expect(publication).not.toBe(null);
    expect(publication?.week).toBe('2026-08-31');
    expect(publication?.publicationId).toBe('dap-0001');
    expect(publication?.publishedAt).toBeTruthy();
    expect(publication?.materialCodes).toEqual(['2000028400', 'PK-PETB-8801', 'PK-PETB-8802']);
    expect(publication?.confirmedAt).toBe(null);
  });

  it('the object has exactly the identity keys — no qty, ltp, safety or totalDa', () => {
    const publication = supplierWeeklyPublication('sup-007');
    expect(Object.keys(publication ?? {}).sort()).toEqual([
      'confirmedAt',
      'materialCodes',
      'publicationId',
      'publishedAt',
      'week'
    ]);
  });

  it('reports the confirmation time once the week is confirmed', () => {
    const before = supplierWeeklyPublication('sup-007');
    expect(before).not.toBe(null);
    daConfirmationStore.insert({
      supplierId: 'sup-007',
      week: '2026-08-31',
      publicationId: 'dap-0001',
      soh: [{ materialCode: 'PK-PETB-8802', soh: 22000 }],
      changedFields: [],
      recordedAt: '2026-08-31T03:00:00.000Z',
      recordedBy: NO_PERSON
    });
    expect(supplierWeeklyPublication('sup-007')?.confirmedAt).toBe('2026-08-31T03:00:00.000Z');
  });

  it('a supplier no publication holds reads null', () => {
    expect(supplierWeeklyPublication('sup-999')).toBe(null);
  });

  it('the newest publication supersedes: the read follows its id and its materials', () => {
    const seed = demandAnticipationStore.all()[0];
    expect(seed).toBeDefined();
    const ownEntry = seed.entries.find(
      (e) => e.supplierId === 'sup-007' && e.materialCode === 'PK-PETB-8802'
    );
    if (!ownEntry) throw new Error('the sample publication holds no sup-007 PK-PETB-8802 entry');
    demandAnticipationStore.add({
      // Later than the sample publication (which is stamped at the hub present).
      publishedAt: '2026-09-05T02:00:00.000Z',
      actor: seed.actor,
      source: 'publish',
      planningWeek: seed.planningWeek,
      agreedFirstOutside: [],
      entries: [ownEntry]
    });
    const after = supplierWeeklyPublication('sup-007');
    expect(after?.publicationId).not.toBe('dap-0001');
    expect(after?.materialCodes).toEqual(['PK-PETB-8802']);
    expect(after?.week).toBe('2026-08-31');
  });
});

describe('UCX-P4 · the service read is supplier-scoped', () => {
  it('a supplier reads its own publication identity; a buyer reads null', async () => {
    const own = await mockDataService.procurement.getSupplierWeeklyPublication(supplierScope);
    expect(own?.publicationId).toBe('dap-0001');
    expect(await mockDataService.procurement.getSupplierWeeklyPublication(buyerScope)).toBe(null);
  });
});
