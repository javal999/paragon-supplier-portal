// ────────────────────────────────────────────────────────────────────────────
// RFX-R4 — A SUPPLIER NEVER READS THE ROSTER IT COMPETES AGAINST.
//
// On the RFI and RFP boards a supplier's `invitedSuppliers` holds its OWN row
// and no other: no rival's name, answer state, submission time, lateness,
// acceptances, OTIF or qualification. Read through the REAL
// MockProcurementService and probed both ways: supplier A's read never holds
// supplier B's row (the known-bad), and the buyer's read of the same event still
// holds B's row with B's submitted answer (the known-good), so a read that
// simply emptied the roster for everyone would fail the control.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockProcurementService } from './MockProcurementService';
import {
  resetRfxStores,
  rfiEventStore,
  rfiResponseStore,
  rfpEventStore,
  rfpResponseStore
} from './stores/rfxStores';
import { rfxSupplierName, rfxSupplierOtif } from './rfxReadModel';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const reads = new MockProcurementService();

/**
 * @param {string} supplierId
 * @returns {QueryScope}
 */
const supplier = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
});
/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};

// A = the reader, B = a rival invited to the same events, with a submitted answer.
const A = 'sup-007';
const B = 'sup-008';

beforeEach(() => {
  resetRfxStores();
  sdcClock.reset();
});

const boards = /** @type {const} */ ([
  {
    label: 'RFI board',
    eventId: 'rfi-001',
    /** @param {QueryScope} s */
    read: (s) => reads.getRfiEvents(s),
    invitees: () =>
      /** @type {import('../../sourcing/types').RfiEvent} */ (
        rfiEventStore.get('rfi-001')
      ).invitees.map((i) => i.supplierId),
    rivalSubmittedAt: () =>
      rfiResponseStore
        .all()
        .find((r) => r.rfiId === 'rfi-001' && r.supplierId === B && r.status === 'Submitted')
        ?.submittedAt
  },
  {
    label: 'RFP board',
    eventId: 'rfp-001',
    /** @param {QueryScope} s */
    read: (s) => reads.getRfpEvents(s),
    invitees: () =>
      /** @type {import('../../sourcing/types').RfpEvent} */ (
        rfpEventStore.get('rfp-001')
      ).invitees.map((i) => i.supplierId),
    rivalSubmittedAt: () =>
      rfpResponseStore
        .all()
        .find((r) => r.rfpId === 'rfp-001' && r.supplierId === B && r.status === 'Submitted')
        ?.submittedAt
  }
]);

describe.each(boards)(
  'RFX-R4 — the $label invitee roster',
  ({ eventId, read, invitees, rivalSubmittedAt }) => {
    it('population: A and B are both invited, and B has SUBMITTED, so B has a row worth leaking', () => {
      expect(invitees()).toEqual(expect.arrayContaining([A, B]));
      expect(invitees().length).toBeGreaterThan(2);
      expect(rivalSubmittedAt()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("control: the buyer reads every invitee, and B's row carries B's name and submitted answer", async () => {
      const event =
        /** @type {NonNullable<ReturnType<((Awaited<ReturnType<typeof read>>)['items'])['find']>>} */ (
          (await read(buyer)).items.find((e) => e.id === eventId)
        );
      expect(event.invitedSuppliers.map((i) => i.supplierId)).toEqual(invitees());
      const b = /** @type {import('../../sourcing/views').RfxInviteeView} */ (
        event.invitedSuppliers.find((i) => i.supplierId === B)
      );
      expect(b.supplierName).toBe(rfxSupplierName(B));
      expect(b.responseState).toBe('submitted');
      expect(b.submittedAt).toBe(rivalSubmittedAt());
      expect(b.otif).toBe(rfxSupplierOtif(B));
    });

    it('supplier A reads its own row only, and nothing of B reaches it', async () => {
      const event =
        /** @type {NonNullable<ReturnType<((Awaited<ReturnType<typeof read>>)['items'])['find']>>} */ (
          (await read(supplier(A))).items.find((e) => e.id === eventId)
        );
      expect(event.invitedSuppliers.map((i) => i.supplierId)).toEqual([A]);
      // What the supplier page reads (SupplierRfi / SupplierRfp): its own deadline.
      const own = /** @type {import('../../sourcing/views').RfxInviteeView} */ (
        event.invitedSuppliers[0]
      );
      expect(own.deadline).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(own.otif).toBe(rfxSupplierOtif(A));
      // No trace of B on the roster in any field — name or submission time.
      const roster = JSON.stringify(event.invitedSuppliers);
      expect(roster).not.toContain(B);
      expect(roster).not.toContain(rfxSupplierName(B));
      expect(roster).not.toContain(
        /** @type {NonNullable<ReturnType<typeof rivalSubmittedAt>>} */ (rivalSubmittedAt())
      );
    });

    it("the same rule from B's seat: B reads its own row and never A's", async () => {
      const event =
        /** @type {NonNullable<ReturnType<((Awaited<ReturnType<typeof read>>)['items'])['find']>>} */ (
          (await read(supplier(B))).items.find((e) => e.id === eventId)
        );
      expect(event.invitedSuppliers.map((i) => i.supplierId)).toEqual([B]);
    });
  }
);

describe("RFX-R4 — every event on a supplier's boards", () => {
  it("holds only the reader's own invitee row, on the RFI and the RFP board", async () => {
    const events = [
      ...(await reads.getRfiEvents(supplier(A))).items,
      ...(await reads.getRfpEvents(supplier(A))).items
    ];
    expect(events.map((e) => e.id)).toEqual(expect.arrayContaining(['rfi-001', 'rfp-001']));
    for (const e of events) expect(e.invitedSuppliers.map((i) => i.supplierId)).toEqual([A]);
  });
});
