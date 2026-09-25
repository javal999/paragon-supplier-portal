// ────────────────────────────────────────────────────────────────────────────
// NR-1 BR-08 / AC-06 / AC-07 (D-6, AR-05) — a supplier revises a SUBMITTED
// RFI or RFP response until the deadline, and every submitted version stays
// on the response. Through the REAL MockCommandService, read back through the
// REAL MockProcurementService. Each refusal is probed both ways.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { resetRfxStores, rfiResponseStore, rfpResponseStore } from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { rfxNow } from './rfxReadModel';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '../../../context/noPerson';
import type { DocumentRequest } from '../../sourcing/types';
import type { AttachmentMeta } from '../../attachments/sessionAttachments';

const svc = new MockCommandService();
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
const sup007 = supplier('sup-007');
const sup008 = supplier('sup-008');

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

const DAY_MS = 86_400_000;
const dayFromNow = (offset: number) =>
  new Date(Date.parse(rfxNow()) + offset * DAY_MS).toISOString().slice(0, 10);
/** Moves the simulated clock `days` forward from the default now. */
const travel = (days: number) => sdcClock.set(new Date(Date.parse(rfxNow()) + days * DAY_MS).toISOString());

const HALAL: DocumentRequest = { id: 'dr-halal', name: 'Halal certificate', type: 'certificate', required: true };

const file = (name: string): AttachmentMeta => ({
  id: `f-${name}`,
  name,
  size: 120_000,
  type: 'application/pdf',
  addedAt: '2026-09-20T00:00:00.000Z',
});

const halalDoc = {
  id: 'd-halal-sup-007',
  requestId: HALAL.id,
  attachment: file('halal-sup-007.pdf'),
  certificate: { number: 'ID00410000123', issuer: 'BPJPH', expiresOn: '2027-06-30' },
};

/** A published RFP, deadline in 14 days, asking sup-007 and sup-008 for one required certificate. */
async function publishedRfp(): Promise<string> {
  const created = await svc.dispatch(buyer, {
    transitionId: 't_rfp_create',
    entity: 'rfpEvent',
    payload: {
      title: 'Lip tint packaging',
      scope: 'Tube and cap',
      materialCategory: 'Packaging',
      responseDeadline: dayFromNow(14),
      currency: 'IDR',
      invitedSupplierIds: ['sup-007', 'sup-008'],
      terms: [{ termId: 'paymentTerms', requestedValue: 'Net 30' }],
      documentRequests: [HALAL],
      pricing: {
        options: [{ id: 'opt-1', title: 'Tube and cap' }],
        quantityPoints: [10_000],
        quantityBasis: 'total',
        samplesRequested: false,
      },
    },
  });
  expect(created.status, created.reason).toBe('done');
  const published = await svc.dispatch(buyer, {
    transitionId: 't_rfp_publish',
    entity: 'rfpEvent',
    entityId: created.entityId!,
    payload: {},
  });
  expect(published.status, published.reason).toBe('done');
  return created.entityId!;
}

const proposal = (unitPrice: number, documents: unknown[] = [halalDoc]) => ({
  answers: [{ termId: 'paymentTerms', proposedValue: 'Net 30', stance: 'comply' }],
  pricing: { prices: [{ optionId: 'opt-1', qty: 10_000, unitPrice }], proposedOptions: [] },
  documents,
});

/** sup-007's proposal, saved and submitted at 1,200 per unit: version 1. */
async function submittedProposal(rfpId: string): Promise<string> {
  const saved = await svc.dispatch(sup007, {
    transitionId: 't_rfpresponse_save',
    entity: 'rfpResponse',
    payload: { rfpId, supplierId: 'sup-007', ...proposal(1_200) },
  });
  expect(saved.status, saved.reason).toBe('done');
  const sent = await svc.dispatch(sup007, {
    transitionId: 't_rfpresponse_submit',
    entity: 'rfpResponse',
    entityId: saved.entityId!,
    payload: {},
  });
  expect(sent.status, sent.reason).toBe('done');
  return saved.entityId!;
}

const revise = (scope: QueryScope, responseId: string, payload: Record<string, unknown>) =>
  svc.dispatch(scope, { transitionId: 't_rfpresponse_revise', entity: 'rfpResponse', entityId: responseId, payload });

describe('NR-1 BR-08 / AC-06 — a supplier revises a submitted RFP response before the deadline', () => {
  it('version 2 exists, version 1 is unchanged, and the buyer reads version 2', async () => {
    const rfpId = await publishedRfp();
    const responseId = await submittedProposal(rfpId);
    const v1 = rfpResponseStore.get(responseId)!.versions!;
    expect(v1).toHaveLength(1);
    expect(v1[0]!.number).toBe(1);
    const v1Before = structuredClone(v1[0]);

    travel(2);
    const res = await revise(sup007, responseId, proposal(1_050));
    expect(res.status, res.reason).toBe('done');

    const stored = rfpResponseStore.get(responseId)!;
    expect(stored.status).toBe('Submitted');
    expect(stored.versions!.map((v) => v.number)).toEqual([1, 2]);
    // Version 1 is untouched: same price, same file, same submission time.
    expect(stored.versions![0]).toEqual(v1Before);
    expect(stored.versions![0]!.pricing!.prices[0]!.unitPrice).toBe(1_200);
    expect(stored.versions![1]!.pricing!.prices[0]!.unitPrice).toBe(1_050);
    expect(stored.versions![1]!.submittedAt).toBe(rfxNow());
    expect(stored.versions![0]!.submittedAt).not.toBe(stored.versions![1]!.submittedAt);
    // The file kept its original upload time: it was not re-uploaded.
    expect(stored.versions![1]!.documents![0]!.uploadedAt).toBe(v1Before!.documents![0]!.uploadedAt);

    // The buyer reads the latest as the response, and the earlier one beside it.
    const board = (await reads.getRfpEvents(buyer)).items.find((e) => e.id === rfpId)!;
    const seen = board.responses.find((r) => r.id === responseId)!;
    expect(seen.pricing!.prices[0]!.unitPrice).toBe(1_050);
    expect(seen.submittedAt).toBe(rfxNow());
    expect(seen.versions.map((v) => v.number)).toEqual([1, 2]);
    expect(seen.versions[0]!.pricing!.prices[0]!.unitPrice).toBe(1_200);
  });

  it('a seeded Submitted response, which carries no versions, is read as version 1 and revised to version 2', async () => {
    const seed = rfpResponseStore.get('rfp-resp-001')!;
    expect(seed.status).toBe('Submitted');
    expect(seed.versions).toBeUndefined();
    const board = (await reads.getRfpEvents(buyer)).items.find((e) => e.id === 'rfp-001')!;
    const seenSeed = board.responses.find((r) => r.id === 'rfp-resp-001')!;
    expect(seenSeed.versions.map((v) => v.number)).toEqual([1]);
    expect(seenSeed.versions[0]!.answers).toEqual(seed.answers);

    const res = await revise(sup007, 'rfp-resp-001', { answers: seed.answers, otherTerms: 'Free pallet return.' });
    expect(res.status, res.reason).toBe('done');
    const stored = rfpResponseStore.get('rfp-resp-001')!;
    expect(stored.otherTerms).toBe('Free pallet return.');
    expect(stored.versions!.map((v) => v.number)).toEqual([1, 2]);
    expect(stored.versions![0]!.otherTerms).toBeUndefined();
    expect(stored.versions![0]!.submittedAt).toBe(seed.submittedAt);
    expect(stored.versions![1]!.otherTerms).toBe('Free pallet return.');
  });

  it('a supplier reads only its own versions', async () => {
    const rfpId = await publishedRfp();
    const responseId = await submittedProposal(rfpId);
    expect((await revise(sup007, responseId, proposal(1_050))).status).toBe('done');

    const mine = (await reads.getRfpEvents(sup007)).items.find((e) => e.id === rfpId)!;
    expect(mine.responses.map((r) => r.id)).toEqual([responseId]);
    expect(mine.responses[0]!.versions).toHaveLength(2);
    const theirs = (await reads.getRfpEvents(sup008)).items.find((e) => e.id === rfpId)!;
    expect(theirs.responses).toEqual([]);
  });
});

describe('NR-1 AC-07 — RESPONSE_DEADLINE_PASSED, at the verb', () => {
  it('KNOWN-BAD — revising after the deadline is refused, and no version is added', async () => {
    const rfpId = await publishedRfp();
    const responseId = await submittedProposal(rfpId);
    travel(20);
    const res = await revise(sup007, responseId, proposal(1_050));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/RESPONSE_DEADLINE_PASSED/);
    const stored = rfpResponseStore.get(responseId)!;
    expect(stored.versions).toHaveLength(1);
    expect(stored.pricing!.prices[0]!.unitPrice).toBe(1_200);
  });

  it('KNOWN-GOOD twin — an extension granted to THIS supplier reopens its window', async () => {
    const rfpId = await publishedRfp();
    const responseId = await submittedProposal(rfpId);
    travel(20);
    const extended = await svc.dispatch(buyer, {
      transitionId: 't_rfp_extend',
      entity: 'rfpEvent',
      entityId: rfpId,
      payload: { deadline: dayFromNow(5), supplierIds: ['sup-007'] },
    });
    expect(extended.status, extended.reason).toBe('done');
    const res = await revise(sup007, responseId, proposal(1_050));
    expect(res.status, res.reason).toBe('done');
    expect(rfpResponseStore.get(responseId)!.versions).toHaveLength(2);
  });

  it('KNOWN-BAD — revising once the event is no longer Open is refused by the same code', async () => {
    const rfpId = await publishedRfp();
    const responseId = await submittedProposal(rfpId);
    const closed = await svc.dispatch(buyer, {
      transitionId: 't_rfp_close',
      entity: 'rfpEvent',
      entityId: rfpId,
      payload: {},
    });
    expect(closed.status, closed.reason).toBe('done');
    const res = await revise(sup007, responseId, proposal(1_050));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/RESPONSE_DEADLINE_PASSED: the event is Closed/);
  });

  it('KNOWN-BAD — a draft save after the deadline is refused too (it did not refuse before B2)', async () => {
    const rfpId = await publishedRfp();
    travel(20);
    const res = await svc.dispatch(sup008, {
      transitionId: 't_rfpresponse_save',
      entity: 'rfpResponse',
      payload: { rfpId, supplierId: 'sup-008', ...proposal(1_100) },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/RESPONSE_DEADLINE_PASSED/);
    expect(rfpResponseStore.all().some((r) => r.rfpId === rfpId && r.supplierId === 'sup-008')).toBe(false);
  });

  it('KNOWN-GOOD twin — the same draft save before the deadline goes through', async () => {
    const rfpId = await publishedRfp();
    const res = await svc.dispatch(sup008, {
      transitionId: 't_rfpresponse_save',
      entity: 'rfpResponse',
      payload: { rfpId, supplierId: 'sup-008', ...proposal(1_100) },
    });
    expect(res.status, res.reason).toBe('done');
  });
});

describe('RFX-R4 — another supplier cannot revise it', () => {
  it('KNOWN-BAD — sup-008 revising sup-007’s response is refused at scope, and nothing changes', async () => {
    const rfpId = await publishedRfp();
    const responseId = await submittedProposal(rfpId);
    const before = structuredClone(rfpResponseStore.get(responseId));
    await expect(revise(sup008, responseId, proposal(900))).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    expect(rfpResponseStore.get(responseId)).toEqual(before);
  });
});

describe('NR-1 BR-03 on revise — the B1 document rule still binds', () => {
  it('KNOWN-BAD — a revise that drops the required certificate is refused, naming the request', async () => {
    const rfpId = await publishedRfp();
    const responseId = await submittedProposal(rfpId);
    const res = await revise(sup007, responseId, proposal(1_050, []));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/DOCUMENT_REQUIRED_MISSING: Halal certificate/);
    const stored = rfpResponseStore.get(responseId)!;
    expect(stored.versions).toHaveLength(1);
    expect(stored.documents).toHaveLength(1);
  });

  it('KNOWN-BAD — a revise that breaks a submit rule (a deviation without a comment) is refused', async () => {
    const rfpId = await publishedRfp();
    const responseId = await submittedProposal(rfpId);
    const res = await revise(sup007, responseId, {
      ...proposal(1_050),
      answers: [{ termId: 'paymentTerms', proposedValue: 'Net 60', stance: 'deviate' }],
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/DEVIATION_NEEDS_COMMENT/);
  });
});

describe('NR-1 BR-08 — the RFI response revises the same way', () => {
  it('a seeded Submitted RFI response is revised to version 2; version 1 keeps the seed answers', async () => {
    const seed = rfiResponseStore.get('rfi-resp-001')!;
    expect(seed.status).toBe('Submitted');
    const res = await svc.dispatch(sup007, {
      transitionId: 't_rfiresponse_revise',
      entity: 'rfiResponse',
      entityId: 'rfi-resp-001',
      payload: { answers: seed.answers, documents: [{ id: 'd-brochure', attachment: file('brochure.pdf') }] },
    });
    expect(res.status, res.reason).toBe('done');
    const stored = rfiResponseStore.get('rfi-resp-001')!;
    expect(stored.versions!.map((v) => v.number)).toEqual([1, 2]);
    expect(stored.versions![0]!.documents).toBeUndefined();
    expect(stored.versions![1]!.documents!.map((d) => d.id)).toEqual(['d-brochure']);

    const board = (await reads.getRfiEvents(buyer)).items.find((e) => e.id === 'rfi-001')!;
    const seen = board.responses.find((r) => r.id === 'rfi-resp-001')!;
    expect(seen.documents!.map((d) => d.id)).toEqual(['d-brochure']);
    expect(seen.versions).toHaveLength(2);
  });

});

describe('NR-1 BR-08 / BR-10 — a save never changes a Submitted response (RESPONSE_ALREADY_SUBMITTED)', () => {
  it('KNOWN-BAD — a save on a Submitted RFP response is refused; the response and its versions are unchanged', async () => {
    const rfpId = await publishedRfp();
    const responseId = await submittedProposal(rfpId);
    const before = structuredClone(rfpResponseStore.get(responseId));
    const res = await svc.dispatch(sup007, {
      transitionId: 't_rfpresponse_save',
      entity: 'rfpResponse',
      payload: { rfpId, supplierId: 'sup-007', ...proposal(900) },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/RESPONSE_ALREADY_SUBMITTED: use revise/);
    expect(rfpResponseStore.get(responseId)).toEqual(before);
  });

  it('KNOWN-BAD — a save on a Submitted RFI response is refused; the response and its versions are unchanged', async () => {
    const seed = rfiResponseStore.get('rfi-resp-001')!;
    expect(seed.status).toBe('Submitted');
    const before = structuredClone(seed);
    const res = await svc.dispatch(sup007, {
      transitionId: 't_rfiresponse_save',
      entity: 'rfiResponse',
      payload: { rfiId: seed.rfiId, supplierId: 'sup-007', answers: [] },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/RESPONSE_ALREADY_SUBMITTED: use revise/);
    expect(rfiResponseStore.get('rfi-resp-001')).toEqual(before);
  });

  it('KNOWN-GOOD twin — a save on a Draft response still replaces the draft', async () => {
    const rfpId = await publishedRfp();
    const first = await svc.dispatch(sup007, {
      transitionId: 't_rfpresponse_save',
      entity: 'rfpResponse',
      payload: { rfpId, supplierId: 'sup-007', ...proposal(1_200) },
    });
    expect(first.status, first.reason).toBe('done');
    const again = await svc.dispatch(sup007, {
      transitionId: 't_rfpresponse_save',
      entity: 'rfpResponse',
      payload: { rfpId, supplierId: 'sup-007', ...proposal(1_100) },
    });
    expect(again.status, again.reason).toBe('done');
    expect(again.entityId).toBe(first.entityId);
    const stored = rfpResponseStore.get(first.entityId!)!;
    expect(stored.status).toBe('Draft');
    expect(stored.pricing!.prices[0]!.unitPrice).toBe(1_100);
  });
});

describe('revise is only for a SUBMITTED response', () => {
  it('KNOWN-BAD — a Draft proposal cannot be revised: a draft is sent with submit', async () => {
    const rfpId = await publishedRfp();
    const saved = await svc.dispatch(sup007, {
      transitionId: 't_rfpresponse_save',
      entity: 'rfpResponse',
      payload: { rfpId, supplierId: 'sup-007', ...proposal(1_200) },
    });
    expect(saved.status, saved.reason).toBe('done');
    const res = await revise(sup007, saved.entityId!, proposal(1_050));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ILLEGAL_TRANSITION/);
    expect(rfpResponseStore.get(saved.entityId!)!.versions).toBeUndefined();
  });
});
