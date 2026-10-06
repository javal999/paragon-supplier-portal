// ────────────────────────────────────────────────────────────────────────────
// RFX-R4 — A SUPPLIER NEVER READS ANOTHER INVITEE'S OTIF.
//
// Every supplier-scoped RFx read that carries per-supplier performance figures,
// read through the REAL MockProcurementService (the RFI and RFP boards are in
// `inviteeRosterNarrowing.test.js`). Each read is probed both ways:
// supplier A's read never holds supplier B's figure (the known-bad), and the
// buyer's read of the same event still holds B's figure (the known-good), so a
// read that simply dropped OTIF for everyone would fail the control.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockProcurementService } from './MockProcurementService';
import { resetRfxStores } from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { rfxSupplierOtif } from './rfxReadModel';
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

// A = the reader, B = a rival invited to the same events.
const A = 'sup-007';
const B = 'sup-008';

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

describe('RFX-R4 — the population the narrowing is probed against', () => {
  it('A and B both have a MEASURED OTIF, so an absent figure cannot pass as "No history"', () => {
    expect(typeof rfxSupplierOtif(A)).toBe('number');
    expect(typeof rfxSupplierOtif(B)).toBe('number');
  });
});

// The RFI and RFP boards no longer hand a supplier ANY other invitee's row, so
// no rival OTIF can ride on one: `inviteeRosterNarrowing.test.js` proves that.

describe('RFX-R4 — the RFQ reads that carry OTIF-derived figures', () => {
  it("the compliance gate (judged on OTIF): the buyer reads B's row, supplier A reads nothing", async () => {
    const rfq = /** @type {import('@data/mockRfqs').RFQ} */ (
      rfqStore
        .all()
        .find((r) => r.invitedSupplierIds.includes(A) && r.invitedSupplierIds.includes(B))
    );
    expect(rfq).toBeDefined();
    const seen = (await reads.getRfqComplianceGate(buyer, rfq.id)).items;
    expect(seen.map((g) => g.supplierId)).toContain(B);
    expect((await reads.getRfqComplianceGate(supplier(A), rfq.id)).items).toEqual([]);
  });

  it("the invitee search (lists every OTIF): the buyer reads B's figure, supplier A reads nothing", async () => {
    const seen = (await reads.getInviteeCandidates(buyer)).items;
    expect(seen.find((c) => c.supplierId === B)?.otif).toBe(rfxSupplierOtif(B));
    expect((await reads.getInviteeCandidates(supplier(A))).items).toEqual([]);
  });

  it("quotations (the reliability axis): the buyer reads B's quote, supplier A only its own", async () => {
    const all = (await reads.getQuotations(buyer)).items;
    const rfqId = all.find(
      (q) => q.supplierId === A && all.some((o) => o.rfqId === q.rfqId && o.supplierId === B)
    )?.rfqId;
    expect(rfqId).toBeDefined();
    expect(all.filter((q) => q.rfqId === rfqId).map((q) => q.supplierId)).toContain(B);
    const mine = (await reads.getQuotations(supplier(A), { rfqId })).items;
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((q) => q.supplierId === A)).toBe(true);
  });
});
