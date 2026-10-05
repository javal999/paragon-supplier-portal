// ────────────────────────────────────────────────────────────────────────────
// Material G2 — sourcing type and bidding eligibility (MR-10 BR-05 to BR-07,
// AC-03 to AC-05, edge cases 1 and 4; plan AR-16, AR-17), dispatched through
// the REAL MockCommandService and read back through the REAL
// MockProcurementService.
//
// ⚠️ BOTH MODES. Owner ruling 2026-09-29: while the list for the level an
// event needs is the placeholder, eligibility WARNS (publish passes and
// records the warning; an award needs a reason). Once Procurement and Quality
// save a real list, the same checks REFUSE. `realLists()` saves real lists:
//   Approved  = [Quality]
//   Preferred = [Quality, Halal]
// against the seeded documents, which makes sup-002 and sup-007 Preferred,
// sup-005 Approved only, and sup-001 / sup-013 Registered.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { awardStore, resetRfxStores, rfiEventStore, rfpEventStore } from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { qualificationRuleStore } from '../../transitions/qualificationRuleStore';
import { sourcingTypeStore } from '../../transitions/sourcingTypeStore';
import { resolvePolicyHook } from '../../transitions/policies';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { sdcClock } from '../../sdc';
import { qualificationFor } from './qualificationReadModel';
import { eventSourcingType } from './eligibilityReadModel';
import type { CommandTarget } from '../../transitions';
import type { QueryScope } from '../types';

const svc = new MockCommandService();
const reads = new MockProcurementService();

const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer, actor: NO_PERSON };
const procurement: QueryScope = { ...buyer, businessRoles: ['procurement'] };
const supplier = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
});

/** The refusal code a policy reason carries (`POLICY_REJECTED:<hook>:<CODE>: …`). */
const codeOf = (reason: string | undefined) => (reason ?? '').replace(/^POLICY_REJECTED:[a-z_]+:/, '').split(':')[0];

async function realLists(): Promise<void> {
  const a = await svc.dispatch(procurement, {
    transitionId: 't_qualification_rule_set', entity: 'qualificationRule', entityId: 'approved',
    payload: { requiredDocs: [{ category: 'Quality', label: 'GMP / ISO certificate' }] },
  });
  expect(a.status, a.reason).toBe('done');
  const p = await svc.dispatch(procurement, {
    transitionId: 't_qualification_rule_set', entity: 'qualificationRule', entityId: 'preferred',
    payload: {
      requiredDocs: [
        { category: 'Quality', label: 'GMP / ISO certificate' },
        { category: 'Halal Compliance', label: 'Halal certificate' },
      ],
    },
  });
  expect(p.status, p.reason).toBe('done');
}

const publishRfq = (rfqId: string) =>
  svc.dispatch(procurement, { transitionId: 't_rfq_publish', entity: 'rfq', entityId: rfqId });

const draftRfqId = () => rfqStore.all().find((r) => r.status === 'Draft')!.id;

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  qualificationRuleStore.reset();
  sourcingTypeStore.reset();
  sdcClock.reset();
});

describe('the premise — the levels the probes rely on', () => {
  it('on real lists: sup-002 and sup-007 Preferred, sup-005 Approved, sup-001 Registered', async () => {
    await realLists();
    expect(qualificationFor('sup-002').level).toBe('preferred');
    expect(qualificationFor('sup-007').level).toBe('preferred');
    expect(qualificationFor('sup-005').level).toBe('approved');
    expect(qualificationFor('sup-001').level).toBe('registered');
    expect(qualificationRuleStore.get('preferred').placeholder).toBe(false);
  });

  it('on the placeholder seed every list is a placeholder (warn-only mode)', () => {
    expect(qualificationRuleStore.all().every((r) => r.placeholder)).toBe(true);
  });
});

describe('AC-03 — a direct RFQ does not offer an Approved-only vendor, and the hook refuses it', () => {
  it('REAL LIST — the candidates for a direct event list sup-005 as refused (greyed), sup-002 as offered', async () => {
    await realLists();
    const { items } = await reads.getInviteeCandidates(buyer, { sourcingType: 'direct' });
    const byId = new Map(items.map((c) => [c.supplierId, c]));
    expect(byId.get('sup-005')?.eligibility?.state).toBe('refused');
    expect(byId.get('sup-005')?.eligibility?.missing.map((d) => d.category)).toEqual(['Halal Compliance']);
    expect(byId.get('sup-002')?.eligibility?.state).toBe('qualified');
    // The offered ones come first; every refused row sits after them.
    const firstRefused = items.findIndex((c) => c.eligibility?.state === 'refused');
    expect(items.slice(firstRefused).every((c) => c.eligibility?.state === 'refused')).toBe(true);
    // Status still comes first: a suspended vendor is not a candidate at all.
    expect(byId.has('sup-012')).toBe(false);
  });

  it('REAL LIST — publishing a direct RFQ with sup-005 invited is refused SUPPLIER_NOT_QUALIFIED, naming it', async () => {
    await realLists();
    const id = draftRfqId();
    rfqStore.update(id, (r) => ({ ...r, invitedSupplierIds: ['sup-002', 'sup-005'] }));
    const res = await publishRfq(id);
    expect(res.status).toBe('failed');
    expect(codeOf(res.reason)).toBe('SUPPLIER_NOT_QUALIFIED');
    expect(res.reason).toContain('sup-005');
    expect(res.reason).toContain('Halal certificate');
    expect(res.reason).not.toContain('sup-002');
    expect(rfqStore.get(id)!.status).toBe('Draft');
  });

  it('REAL LIST — KNOWN-GOOD twin: the same RFQ with Preferred invitees publishes, and stores its type', async () => {
    await realLists();
    const id = draftRfqId();
    rfqStore.update(id, (r) => ({ ...r, invitedSupplierIds: ['sup-002', 'sup-007'] }));
    const res = await publishRfq(id);
    expect(res.status, res.reason).toBe('done');
    const rfq = rfqStore.get(id)!;
    expect(rfq.status).toBe('Open');
    expect(rfq.sourcingType).toBe('direct');
    expect(rfq.qualificationWarnings).toBeUndefined();
  });

  it('PLACEHOLDER — the same invitee list publishes, and the event records the warning', async () => {
    const id = draftRfqId();
    rfqStore.update(id, (r) => ({ ...r, invitedSupplierIds: ['sup-005', 'sup-007'] }));
    const { items } = await reads.getInviteeCandidates(buyer, { sourcingType: 'direct' });
    expect(items.find((c) => c.supplierId === 'sup-005')?.eligibility?.state).toBe('warn');
    const res = await publishRfq(id);
    expect(res.status, res.reason).toBe('done');
    const rfq = rfqStore.get(id)!;
    expect(rfq.sourcingType).toBe('direct');
    expect(rfq.qualificationWarnings?.map((w) => w.supplierId)).toEqual(['sup-005']);
    expect(rfq.qualificationWarnings?.[0]?.requiredLevel).toBe('preferred');
    expect(rfq.qualificationWarnings?.[0]?.missing.length).toBeGreaterThan(0);
  });
});

describe('AR-16 — the first RFQ publish hook does not refuse the sample RFQs', () => {
  it('the hook passes on EVERY sample RFQ, published or draft, on today’s lists', () => {
    const hook = resolvePolicyHook(POLICY_HOOKS.RFX_INVITEES_QUALIFIED)!;
    // The hook reads the event through `readEntity` only; this is the RFQ read.
    const target = { readEntity: (id: string) => rfqStore.get(id) ?? null } as unknown as CommandTarget;
    const rfqs = rfqStore.all();
    expect(rfqs.length).toBeGreaterThan(5);
    for (const rfq of rfqs) {
      const decision = hook({ entityId: rfq.id, currentState: rfq.status, toState: 'Open', payload: {}, target, scope: buyer });
      expect(decision, rfq.id).toEqual({ ok: true });
    }
  });

  it('every sample Draft RFQ publishes through the real dispatcher', async () => {
    const drafts = rfqStore.all().filter((r) => r.status === 'Draft');
    expect(drafts.length).toBeGreaterThan(0);
    for (const d of drafts) {
      const res = await publishRfq(d.id);
      expect(res.status, `${d.id}: ${res.reason}`).toBe('done');
    }
  });
});

describe('AC-04 — an indirect RFP offers Approved and Preferred vendors', () => {
  it('REAL LIST — Approved and Preferred are offered, Registered is not', async () => {
    await realLists();
    const { items } = await reads.getInviteeCandidates(buyer, { sourcingType: 'indirect' });
    const state = (id: string) => items.find((c) => c.supplierId === id)?.eligibility?.state;
    expect(state('sup-005')).toBe('qualified');
    expect(state('sup-002')).toBe('qualified');
    expect(state('sup-007')).toBe('qualified');
    expect(state('sup-001')).toBe('refused');
  });

  it('REAL LIST — an RFP whose purchasing group Procurement mapped Indirect publishes with an Approved invitee', async () => {
    await realLists();
    const set = await svc.dispatch(procurement, {
      transitionId: 't_sourcingtype_set', entity: 'sourcingType', entityId: 'pg:104', payload: { sourcingType: 'indirect' },
    });
    expect(set.status, set.reason).toBe('done');
    rfpEventStore.update('rfp-004', (e) => ({ ...e, invitees: [{ supplierId: 'sup-005' }, { supplierId: 'sup-007' }] }));
    const res = await svc.dispatch(procurement, { transitionId: 't_rfp_publish', entity: 'rfpEvent', entityId: 'rfp-004' });
    expect(res.status, res.reason).toBe('done');
    expect(rfpEventStore.get('rfp-004')!.sourcingType).toBe('indirect');
  });

  it('REAL LIST — KNOWN-BAD twin: the same RFP left Direct refuses the Approved invitee', async () => {
    await realLists();
    rfpEventStore.update('rfp-004', (e) => ({ ...e, invitees: [{ supplierId: 'sup-005' }, { supplierId: 'sup-007' }] }));
    const res = await svc.dispatch(procurement, { transitionId: 't_rfp_publish', entity: 'rfpEvent', entityId: 'rfp-004' });
    expect(codeOf(res.reason)).toBe('SUPPLIER_NOT_QUALIFIED');
    expect(res.reason).toContain('sup-005');
  });

  it('PLACEHOLDER — an RFI publish records its warnings and passes', async () => {
    const res = await svc.dispatch(procurement, { transitionId: 't_rfi_publish', entity: 'rfiEvent', entityId: 'rfi-003' });
    expect(res.status, res.reason).toBe('done');
    const rfi = rfiEventStore.get('rfi-003')!;
    expect(rfi.sourcingType).toBe('direct');
    expect(rfi.qualificationWarnings?.map((w) => w.supplierId)).toEqual(['sup-013']);
  });
});

describe('BR-06 — the sourcing type is fixed after publish; older events read Direct', () => {
  it('a later map change moves a Draft, never a published event', async () => {
    const id = draftRfqId();
    const category = rfqStore.get(id)!.materialCategory;
    const res = await publishRfq(id);
    expect(res.status, res.reason).toBe('done');
    expect(rfqStore.get(id)!.sourcingType).toBe('direct');

    const set = await svc.dispatch(procurement, {
      transitionId: 't_sourcingtype_set', entity: 'sourcingType', entityId: `category:${category}`, payload: { sourcingType: 'indirect' },
    });
    expect(set.status, set.reason).toBe('done');
    expect(eventSourcingType(rfqStore.get(id)!)).toBe('direct');
    // BILATERAL CONTROL — the map change did land: a Draft of that category reads it.
    const draft = { ...rfqStore.get(id)!, status: 'Draft' as const, sourcingType: undefined };
    expect(eventSourcingType(draft)).toBe('indirect');
  });

  it('edge case 4 — a sample event published before G2 reads Direct, and keeps its invitees', () => {
    const open = rfqStore.get('rfq-001')!;
    expect(open.status).toBe('Open');
    expect(open.sourcingType).toBeUndefined();
    expect(eventSourcingType(open)).toBe('direct');
    expect(open.invitedSupplierIds).toEqual(['sup-005', 'sup-006', 'sup-009', 'sup-011']);
  });

  it('t_sourcingtype_set refuses an unknown key and a value that is not a type; a supplier cannot set it', async () => {
    // An unknown key is not a key of the map: NOT_FOUND, never a new key.
    await expect(
      svc.dispatch(procurement, {
        transitionId: 't_sourcingtype_set', entity: 'sourcingType', entityId: 'category:Nope', payload: { sourcingType: 'direct' },
      }),
    ).rejects.toThrow(/not found/);
    const bad = await svc.dispatch(procurement, {
      transitionId: 't_sourcingtype_set', entity: 'sourcingType', entityId: 'pg:101', payload: { sourcingType: 'both' },
    });
    expect(codeOf(bad.reason)).toBe('SOURCING_TYPE_INVALID');
    await expect(
      svc.dispatch(supplier('sup-002'), {
        transitionId: 't_sourcingtype_set', entity: 'sourcingType', entityId: 'pg:101', payload: { sourcingType: 'indirect' },
      }),
    ).rejects.toThrow(/denied for scope/);
    expect(sourcingTypeStore.changes()).toEqual([]);
  });
});

describe('AC-05 / BR-07 — a vendor that dropped a level cannot be awarded; it can still respond', () => {
  // rfq-003 (Emulsifiers, direct, Open): qt-003b is sup-002's quote.
  const awardSup002 = (reason = 'Second source for continuity.') =>
    svc.dispatch(procurement, {
      transitionId: 't_rfq_award', entity: 'rfq', entityId: 'rfq-003',
      payload: { awardedQuotationId: 'qt-003b', awardedSupplierId: 'sup-002', awardReason: reason },
    });

  /** Procurement adds BPOM to the Preferred list: sup-002 lacks it, so drops to Approved at once. */
  const dropSup002 = async () => {
    const res = await svc.dispatch(procurement, {
      transitionId: 't_qualification_rule_set', entity: 'qualificationRule', entityId: 'preferred',
      payload: {
        requiredDocs: [
          { category: 'Quality', label: 'GMP / ISO certificate' },
          { category: 'Halal Compliance', label: 'Halal certificate' },
          { category: 'BPOM Regulatory', label: 'BPOM notification' },
        ],
      },
    });
    expect(res.status, res.reason).toBe('done');
    expect(qualificationFor('sup-002').level).toBe('approved');
  };

  it('REAL LIST — KNOWN-GOOD: while sup-002 is Preferred the award is recorded', async () => {
    await realLists();
    const res = await awardSup002();
    expect(res.status, res.reason).toBe('done');
    const award = awardStore.all().find((a) => a.eventId === 'rfq-003')!;
    expect(award.qualificationWarnings).toBeUndefined();
  });

  it('REAL LIST — after it drops to Approved the award is refused AWARD_SUPPLIER_NOT_QUALIFIED, with the reason', async () => {
    await realLists();
    await dropSup002();
    const before = awardStore.all().length;
    const res = await awardSup002();
    expect(res.status).toBe('failed');
    expect(codeOf(res.reason)).toBe('AWARD_SUPPLIER_NOT_QUALIFIED');
    expect(res.reason).toContain('sup-002');
    expect(res.reason).toContain('is Approved; a direct event needs Preferred');
    expect(res.reason).toContain('BPOM notification');
    expect(awardStore.all().length).toBe(before);
  });

  it('REAL LIST — the gate view shows the reason on that supplier’s row (edge case 1)', async () => {
    await realLists();
    await dropSup002();
    const { items } = await reads.getRfqComplianceGate(buyer, 'rfq-003');
    const row = items.find((g) => g.supplierId === 'sup-002')!;
    expect(row.eligibility?.state).toBe('refused');
    expect(row.eligibility?.missing.map((d) => d.label)).toEqual(['BPOM notification']);
  });

  it('REAL LIST — a vendor below the level can still submit its quote (MAT-D14)', async () => {
    await realLists();
    expect(qualificationFor('sup-005').level).toBe('approved');
    expect(eventSourcingType(rfqStore.get('rfq-001')!)).toBe('direct');
    const res = await svc.dispatch(supplier('sup-005'), {
      transitionId: 't_quotation_submit', entity: 'quotation',
      payload: {
        rfqId: 'rfq-001', supplierId: 'sup-005', unitPrice: 190_000, currency: 'IDR',
        leadTimeDays: 30, paymentTermsOffered: 'Net 30', validUntil: '2026-12-31',
      },
    });
    expect(res.status, res.reason).toBe('done');
    expect(quotationStore.get(res.entityId!)!.supplierId).toBe('sup-005');
  });

  it('PLACEHOLDER — the award to a vendor below the level needs a reason, naming it', async () => {
    const res = await awardSup002('   ');
    expect(codeOf(res.reason)).toBe('AWARD_REASON_REQUIRED');
    expect(res.reason).toContain('sup-002');
    expect(res.reason).toContain('placeholder qualification rules');
  });

  it('PLACEHOLDER — with a reason it is recorded, and the award keeps the warning', async () => {
    const res = await awardSup002();
    expect(res.status, res.reason).toBe('done');
    const award = awardStore.all().find((a) => a.eventId === 'rfq-003')!;
    expect(award.qualificationWarnings?.map((w) => w.supplierId)).toEqual(['sup-002']);
    expect(award.qualificationWarnings?.[0]?.sourcingType).toBe('direct');
  });
});

describe('BL-147 (MAT-R4) — the stored warnings reach the buyer; a supplier reads only its own row', () => {
  const warned = (id: string) => ({
    supplierId: id,
    sourcingType: 'direct' as const,
    level: 'registered' as const,
    requiredLevel: 'preferred' as const,
    missing: ['Halal certificate'],
  });

  it('RFI publish (rfi-003): the buyer reads sup-013 warned; sup-013 its own row; sup-007 none, and no other invitee eligibility', async () => {
    const res = await svc.dispatch(procurement, { transitionId: 't_rfi_publish', entity: 'rfiEvent', entityId: 'rfi-003' });
    expect(res.status, res.reason).toBe('done');
    const buyerRead = (await reads.getRfiEvents(buyer)).items.find((e) => e.id === 'rfi-003')!;
    expect(buyerRead.qualificationWarnings?.map((w) => w.supplierId)).toEqual(['sup-013']);
    expect(buyerRead.invitedSuppliers.find((i) => i.supplierId === 'sup-013')?.eligibility?.state).toBe('warn');

    const own = (await reads.getRfiEvents(supplier('sup-013'))).items.find((e) => e.id === 'rfi-003')!;
    expect(own.qualificationWarnings?.map((w) => w.supplierId)).toEqual(['sup-013']);
    expect(own.invitedSuppliers.find((i) => i.supplierId === 'sup-007')?.eligibility).toBeUndefined();

    const other = (await reads.getRfiEvents(supplier('sup-007'))).items.find((e) => e.id === 'rfi-003')!;
    expect(other.qualificationWarnings).toBeUndefined();
    expect(other.invitedSuppliers.find((i) => i.supplierId === 'sup-013')?.eligibility).toBeUndefined();
    // Nothing on sup-007's wire carries another vendor's level (its own row may).
    const othersRows = { ...other, invitedSuppliers: other.invitedSuppliers.filter((i) => i.supplierId !== 'sup-007') };
    expect(JSON.stringify(othersRows)).not.toContain('"requiredLevel"');
    expect(JSON.stringify(buyerRead)).toContain('"requiredLevel"');
  });

  it('RFQ publish: sup-005 is warned; sup-007 reads the RFQ without it, sup-005 with its own row', async () => {
    const id = draftRfqId();
    rfqStore.update(id, (r) => ({ ...r, invitedSupplierIds: ['sup-005', 'sup-007'] }));
    expect((await publishRfq(id)).status).toBe('done');
    const rfqOf = async (scope: QueryScope) => (await reads.getRFQs(scope)).items.find((r) => r.id === id)!;
    expect((await rfqOf(buyer)).qualificationWarnings?.map((w) => w.supplierId)).toEqual(['sup-005']);
    expect((await rfqOf(supplier('sup-005'))).qualificationWarnings?.map((w) => w.supplierId)).toEqual(['sup-005']);
    expect((await rfqOf(supplier('sup-007'))).qualificationWarnings).toBeUndefined();
  });

  it('RFQ award (placeholder): the buyer reads the warning; a supplier the award names not-awarded reads none', async () => {
    const res = await svc.dispatch(procurement, {
      transitionId: 't_rfq_award', entity: 'rfq', entityId: 'rfq-003',
      payload: { awardedQuotationId: 'qt-003b', awardedSupplierId: 'sup-002', awardReason: 'Second source.' },
    });
    expect(res.status, res.reason).toBe('done');
    const rec = awardStore.all().find((a) => a.eventId === 'rfq-003')!;
    const buyerView = (await reads.getAwards(buyer)).items.find((a) => a.id === rec.id)!;
    expect(buyerView.qualificationWarnings?.map((w) => w.supplierId)).toEqual(['sup-002']);
    const winner = (await reads.getAwards(supplier('sup-002'))).items.find((a) => a.id === rec.id)!;
    expect(winner.qualificationWarnings?.map((w) => w.supplierId)).toEqual(['sup-002']);
    const loserId = rec.notAwardedSupplierIds[0]!;
    expect(loserId).toBeDefined();
    const loser = (await reads.getAwards(supplier(loserId))).items.find((a) => a.id === rec.id)!;
    expect(loser.qualificationWarnings).toBeUndefined();
  });

  it('RFP award view: the buyer reads every warned vendor; a supplier only its own', async () => {
    const id = awardStore.nextId();
    awardStore.add({
      id,
      eventType: 'rfp',
      eventId: 'rfp-002',
      awardedAt: '2026-09-29T00:00:00.000Z',
      lines: [
        { supplierId: 'sup-007', optionRef: 'opt-full-set', firmOfferId: 'fo-x', sharePct: 60, quantity: 30, awardTierQty: 50 },
        { supplierId: 'sup-015', optionRef: 'opt-full-set', firmOfferId: 'fo-y', sharePct: 40, quantity: 20, awardTierQty: 50 },
      ],
      reason: 'Dual source.',
      notAwardedSupplierIds: [],
      qualificationWarnings: [warned('sup-007'), warned('sup-015')],
    });
    const buyerView = (await reads.getRfpAwards(buyer)).items.find((a) => a.id === id)!;
    expect(buyerView.qualificationWarnings?.map((w) => w.supplierId)).toEqual(['sup-007', 'sup-015']);
    const own = (await reads.getRfpAwards(supplier('sup-015'))).items.find((a) => a.id === id)!;
    expect(own.qualificationWarnings?.map((w) => w.supplierId)).toEqual(['sup-015']);
  });
});
