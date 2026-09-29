// ────────────────────────────────────────────────────────────────────────────
// RFX-R4 — A SUPPLIER NEVER READS ANOTHER INVITEE'S OTIF.
//
// Every supplier-scoped RFx read that carries per-supplier performance figures,
// read through the REAL MockProcurementService. Each read is probed both ways:
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
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '../../../context/noPerson';

const reads = new MockProcurementService();

const supplier = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
});
const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON,
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

describe.each([
  ['RFI board', 'rfi-001', (s: QueryScope) => reads.getRfiEvents(s)],
  ['RFP board', 'rfp-001', (s: QueryScope) => reads.getRfpEvents(s)],
] as const)('RFX-R4 — the %s invitee rows', (_label, eventId, read) => {
  it('control: the buyer reads every invitee, B included, with its OTIF', async () => {
    const event = (await read(buyer)).items.find((e) => e.id === eventId)!;
    const b = event.invitedSuppliers.find((i) => i.supplierId === B)!;
    expect(b.otif).toBe(rfxSupplierOtif(B));
    const a = event.invitedSuppliers.find((i) => i.supplierId === A)!;
    expect(a.otif).toBe(rfxSupplierOtif(A));
  });

  it('supplier A reads its own OTIF and never B\'s', async () => {
    const event = (await read(supplier(A))).items.find((e) => e.id === eventId)!;
    const own = event.invitedSuppliers.find((i) => i.supplierId === A)!;
    expect(own.otif).toBe(rfxSupplierOtif(A));
    const rival = event.invitedSuppliers.find((i) => i.supplierId === B)!;
    // Absent, not null: null would say B has no history.
    expect('otif' in rival).toBe(false);
    // And no other invitee's figure rides along on any row.
    for (const row of event.invitedSuppliers.filter((i) => i.supplierId !== A)) {
      expect(row).not.toHaveProperty('otif');
    }
  });

  it('the same rule holds from B\'s seat: B never reads A\'s OTIF', async () => {
    const event = (await read(supplier(B))).items.find((e) => e.id === eventId)!;
    expect(event.invitedSuppliers.find((i) => i.supplierId === B)!.otif).toBe(rfxSupplierOtif(B));
    expect(event.invitedSuppliers.find((i) => i.supplierId === A)).not.toHaveProperty('otif');
  });
});

describe('RFX-R4 — the RFQ reads that carry OTIF-derived figures', () => {
  it('the compliance gate (judged on OTIF): the buyer reads B\'s row, supplier A reads nothing', async () => {
    const rfq = rfqStore.all().find((r) => r.invitedSupplierIds.includes(A) && r.invitedSupplierIds.includes(B))!;
    expect(rfq).toBeDefined();
    const seen = (await reads.getRfqComplianceGate(buyer, rfq.id)).items;
    expect(seen.map((g) => g.supplierId)).toContain(B);
    expect((await reads.getRfqComplianceGate(supplier(A), rfq.id)).items).toEqual([]);
  });

  it('the invitee search (lists every OTIF): the buyer reads B\'s figure, supplier A reads nothing', async () => {
    const seen = (await reads.getInviteeCandidates(buyer)).items;
    expect(seen.find((c) => c.supplierId === B)?.otif).toBe(rfxSupplierOtif(B));
    expect((await reads.getInviteeCandidates(supplier(A))).items).toEqual([]);
  });

  it('quotations (the reliability axis): the buyer reads B\'s quote, supplier A only its own', async () => {
    const all = (await reads.getQuotations(buyer)).items;
    const rfqId = all.find((q) => q.supplierId === A && all.some((o) => o.rfqId === q.rfqId && o.supplierId === B))
      ?.rfqId;
    expect(rfqId).toBeDefined();
    expect(all.filter((q) => q.rfqId === rfqId).map((q) => q.supplierId)).toContain(B);
    const mine = (await reads.getQuotations(supplier(A), { rfqId })).items;
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((q) => q.supplierId === A)).toBe(true);
  });
});
