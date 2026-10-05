// ────────────────────────────────────────────────────────────────────────────
// CE-11i / NR-1 BR-10 — WHO uploaded each response file, through the REAL
// MockCommandService and read back through the REAL MockProcurementService,
// on every verb that stores response documents: RFI and RFP response save /
// submit / revise, quotation submit, and quotation revise in a negotiation
// round.
//
// The session actor is varied per call (two test-only RESOLVED actors, outside
// the reserved demo-person namespace of C10 §6.3), so "stamped from the
// session" is distinguishable from "stamped from the payload" and from
// "re-stamped on carry". The payload
// always claims a THIRD, forged actor and a backdated time; it must never land.
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
import { NO_PERSON } from '@context/noPerson';
import type { ActorAttribution } from '@lib/enforcement';
import type { DocumentRequest } from '../../sourcing/types';
import type { AttachmentMeta } from '../../attachments/sessionAttachments';

const svc = new MockCommandService();
const reads = new MockProcurementService();

const person = (id: string, name: string): ActorAttribution => ({
  kind: 'RESOLVED',
  person: { personId: id, displayName: name },
});
const FIRST = person('p-uploader-first', 'First uploader');
const SECOND = person('p-uploader-second', 'Second uploader');
const FORGED = person('p-forged', 'Forged in the payload');
const BACKDATED = '1999-01-01T00:00:00.000Z';

const supplier = (supplierId: string, actor: ActorAttribution = NO_PERSON): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor,
});
const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON,
};

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

const DAY_MS = 86_400_000;
const dayFromNow = (offset: number) =>
  new Date(Date.parse(rfxNow()) + offset * DAY_MS).toISOString().slice(0, 10);
const travel = (days: number) => sdcClock.set(new Date(Date.parse(rfxNow()) + days * DAY_MS).toISOString());

const HALAL: DocumentRequest = { id: 'dr-halal', name: 'Halal certificate', type: 'certificate', required: true };

const file = (name: string): AttachmentMeta => ({
  id: `f-${name}`,
  name,
  size: 120_000,
  type: 'application/pdf',
  addedAt: '2026-09-20T00:00:00.000Z',
});

/** A document as a payload carries it, CLAIMING a forged uploader and a backdated time. */
const claiming = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  attachment: file(`${id}.pdf`),
  uploadedBy: FORGED,
  uploadedAt: BACKDATED,
  ...over,
});
const halal = (supplierId: string) =>
  claiming(`d-halal-${supplierId}`, {
    requestId: HALAL.id,
    certificate: { number: 'ID00410000123', issuer: 'BPJPH', expiresOn: '2027-06-30' },
  });

const noForgery = (value: unknown) => {
  expect(JSON.stringify(value)).not.toContain('p-forged');
  expect(JSON.stringify(value)).not.toContain(BACKDATED);
};

// ── RFP ─────────────────────────────────────────────────────────────────────

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

const proposal = (documents: unknown[]) => ({
  answers: [{ termId: 'paymentTerms', proposedValue: 'Net 30', stance: 'comply' }],
  pricing: { prices: [{ optionId: 'opt-1', qty: 10_000, unitPrice: 1_200 }], proposedOptions: [] },
  documents,
});

async function submittedProposal(scope: QueryScope, rfpId: string, supplierId: string): Promise<string> {
  const saved = await svc.dispatch(scope, {
    transitionId: 't_rfpresponse_save',
    entity: 'rfpResponse',
    payload: { rfpId, supplierId, ...proposal([halal(supplierId)]) },
  });
  expect(saved.status, saved.reason).toBe('done');
  const sent = await svc.dispatch(scope, {
    transitionId: 't_rfpresponse_submit',
    entity: 'rfpResponse',
    entityId: saved.entityId!,
    payload: {},
  });
  expect(sent.status, sent.reason).toBe('done');
  return saved.entityId!;
}

describe('CE-11i — RFP response save / submit / revise', () => {
  it('save stamps the SESSION actor and the store clock; the payload\'s forged uploader never lands', async () => {
    const rfpId = await publishedRfp();
    const responseId = await submittedProposal(supplier('sup-007', FIRST), rfpId, 'sup-007');
    const stored = rfpResponseStore.get(responseId)!;
    expect(stored.documents![0]!.uploadedBy).toEqual(FIRST);
    expect(stored.documents![0]!.uploadedAt).toBe(rfxNow());
    // Version 1 holds the same stamp — the version is a copy of the response.
    expect(stored.versions![0]!.documents![0]!.uploadedBy).toEqual(FIRST);
    noForgery(stored);
  });

  it('revise: the CARRIED file keeps its first stamp; the NEW file is stamped with the reviser', async () => {
    const rfpId = await publishedRfp();
    const responseId = await submittedProposal(supplier('sup-007', FIRST), rfpId, 'sup-007');
    const firstAt = rfpResponseStore.get(responseId)!.documents![0]!.uploadedAt;

    travel(2);
    const res = await svc.dispatch(supplier('sup-007', SECOND), {
      transitionId: 't_rfpresponse_revise',
      entity: 'rfpResponse',
      entityId: responseId,
      payload: proposal([halal('sup-007'), claiming('d-profile')]),
    });
    expect(res.status, res.reason).toBe('done');

    const stored = rfpResponseStore.get(responseId)!;
    const byId = new Map(stored.documents!.map((d) => [d.id, d]));
    expect(byId.get('d-halal-sup-007')!.uploadedBy).toEqual(FIRST);
    expect(byId.get('d-halal-sup-007')!.uploadedAt).toBe(firstAt);
    expect(byId.get('d-profile')!.uploadedBy).toEqual(SECOND);
    expect(byId.get('d-profile')!.uploadedAt).toBe(rfxNow());
    expect(byId.get('d-profile')!.uploadedAt).not.toBe(firstAt);
    // Version 2 records the same thing; version 1 is untouched.
    expect(stored.versions!.map((v) => v.documents!.map((d) => d.id))).toEqual([
      ['d-halal-sup-007'],
      ['d-halal-sup-007', 'd-profile'],
    ]);
    noForgery(stored);
  });

  it('the buyer reads each supplier\'s uploader; a supplier reads only its own (never a competitor\'s)', async () => {
    const rfpId = await publishedRfp();
    await submittedProposal(supplier('sup-007', FIRST), rfpId, 'sup-007');
    await submittedProposal(supplier('sup-008', SECOND), rfpId, 'sup-008');

    const board = (await reads.getRfpEvents(buyer)).items.find((e) => e.id === rfpId)!;
    const seen = new Map(board.responses.map((r) => [r.supplierId, r.documents![0]!.uploadedBy]));
    expect(seen.get('sup-007')).toEqual(FIRST);
    expect(seen.get('sup-008')).toEqual(SECOND);

    const theirs = (await reads.getRfpEvents(supplier('sup-008'))).items.find((e) => e.id === rfpId)!;
    expect(theirs.responses.map((r) => r.supplierId)).toEqual(['sup-008']);
    expect(JSON.stringify(theirs)).not.toContain('p-uploader-first');
    // KNOWN-GOOD control — the same read DOES carry its own uploader, so the
    // absence above is narrowing, not a view that never holds the field.
    expect(JSON.stringify(theirs)).toContain('p-uploader-second');
  });
});

// ── RFI ─────────────────────────────────────────────────────────────────────

describe('CE-11i — RFI response save and revise', () => {
  it('a draft save stamps the session actor', async () => {
    const res = await svc.dispatch(supplier('sup-013', FIRST), {
      transitionId: 't_rfiresponse_save',
      entity: 'rfiResponse',
      payload: { rfiId: 'rfi-001', supplierId: 'sup-013', answers: [], documents: [claiming('d-a')] },
    });
    expect(res.status, res.reason).toBe('done');
    const doc = rfiResponseStore.get(res.entityId!)!.documents![0]!;
    expect(doc.uploadedBy).toEqual(FIRST);
    expect(doc.uploadedAt).toBe(rfxNow());
    noForgery(doc);
  });

  it('a second save keeps the carried file\'s stamp and stamps the new one', async () => {
    const payload = (documents: unknown[]) => ({ rfiId: 'rfi-001', supplierId: 'sup-013', answers: [], documents });
    const first = await svc.dispatch(supplier('sup-013', FIRST), {
      transitionId: 't_rfiresponse_save',
      entity: 'rfiResponse',
      payload: payload([claiming('d-a')]),
    });
    expect(first.status, first.reason).toBe('done');
    const firstAt = rfiResponseStore.get(first.entityId!)!.documents![0]!.uploadedAt;
    travel(1);
    const second = await svc.dispatch(supplier('sup-013', SECOND), {
      transitionId: 't_rfiresponse_save',
      entity: 'rfiResponse',
      payload: payload([claiming('d-a'), claiming('d-b')]),
    });
    expect(second.status, second.reason).toBe('done');
    const docs = rfiResponseStore.get(first.entityId!)!.documents!;
    expect(docs.map((d) => [d.id, d.uploadedBy, d.uploadedAt])).toEqual([
      ['d-a', FIRST, firstAt],
      ['d-b', SECOND, rfxNow()],
    ]);
  });

  it('revise of a seeded Submitted response: the new file is stamped; a later revise carries it unchanged', async () => {
    const seed = rfiResponseStore.get('rfi-resp-001')!;
    const one = await svc.dispatch(supplier('sup-007', FIRST), {
      transitionId: 't_rfiresponse_revise',
      entity: 'rfiResponse',
      entityId: 'rfi-resp-001',
      payload: { answers: seed.answers, documents: [claiming('d-brochure')] },
    });
    expect(one.status, one.reason).toBe('done');
    const firstAt = rfiResponseStore.get('rfi-resp-001')!.documents![0]!.uploadedAt;

    travel(1);
    const two = await svc.dispatch(supplier('sup-007', SECOND), {
      transitionId: 't_rfiresponse_revise',
      entity: 'rfiResponse',
      entityId: 'rfi-resp-001',
      payload: { answers: seed.answers, documents: [claiming('d-brochure'), claiming('d-spec')] },
    });
    expect(two.status, two.reason).toBe('done');
    const stored = rfiResponseStore.get('rfi-resp-001')!;
    expect(stored.documents!.map((d) => [d.id, d.uploadedBy, d.uploadedAt])).toEqual([
      ['d-brochure', FIRST, firstAt],
      ['d-spec', SECOND, rfxNow()],
    ]);
    noForgery(stored);
  });
});

// ── Quotation ───────────────────────────────────────────────────────────────

describe('CE-11i — quotation submit and negotiation-round revise', () => {
  it('submit stamps the session actor; a competitor cannot read it, the buyer can', async () => {
    const open = rfqStore
      .all()
      .find(
        (r) =>
          r.status === 'Open' &&
          r.invitedSupplierIds.includes('sup-007') &&
          r.invitedSupplierIds.length > 1 &&
          !(r.items ?? []).length,
      )!;
    const res = await svc.dispatch(supplier('sup-007', FIRST), {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: {
        rfqId: open.id,
        supplierId: 'sup-007',
        unitPrice: 1_000,
        leadTimeDays: 20,
        currency: 'IDR',
        paymentTermsOffered: 'Net 30',
        validUntil: dayFromNow(30),
        documents: [claiming('d-quote')],
      },
    });
    expect(res.status, res.reason).toBe('done');
    const doc = quotationStore.get(res.entityId!)!.documents![0]!;
    expect(doc.uploadedBy).toEqual(FIRST);
    expect(doc.uploadedAt).toBe(rfxNow());
    noForgery(doc);

    const buyerSees = (await reads.getQuotations(buyer, { rfqId: open.id })).items.find((q) => q.id === res.entityId);
    expect(buyerSees!.documents![0]!.uploadedBy).toEqual(FIRST);
    const competitor = open.invitedSupplierIds.find((s) => s !== 'sup-007')!;
    const theirs = (await reads.getQuotations(supplier(competitor), { rfqId: open.id })).items;
    expect(theirs.some((q) => q.id === res.entityId)).toBe(false);
    expect(JSON.stringify(theirs)).not.toContain('p-uploader-first');
    // KNOWN-GOOD control — the author's own read carries it.
    const mine = (await reads.getQuotations(supplier('sup-007'), { rfqId: open.id })).items;
    expect(mine.find((q) => q.id === res.entityId)!.documents![0]!.uploadedBy).toEqual(FIRST);
  });

  it('a round revise carries the earlier quote\'s file with its FIRST stamp and stamps the new file', async () => {
    // qt-014a is sup-007's quote on rfq-014; give it a file sent earlier.
    const firstAt = '2026-09-22T04:00:00.000Z';
    quotationStore.update('qt-014a', (q) => ({
      ...q,
      documents: [{ id: 'd-spec', attachment: file('d-spec.pdf'), uploadedAt: firstAt, uploadedBy: FIRST }],
    }));
    const res = await svc.dispatch(supplier('sup-007', SECOND), {
      transitionId: 't_quotation_revise',
      entity: 'quotation',
      payload: {
        roundId: 'nr-0001',
        rfqId: 'rfq-014',
        supplierId: 'sup-007',
        roundNumber: 1,
        supersedesQuotationId: 'qt-014a',
        unitPrice: 1_000,
        leadTimeDays: 18,
        currency: 'IDR',
        documents: [claiming('d-spec'), claiming('d-new')],
      },
    });
    expect(res.status, res.reason).toBe('done');
    const docs = quotationStore.get(res.entityId!)!.documents!;
    expect(docs.map((d) => [d.id, d.uploadedBy, d.uploadedAt])).toEqual([
      ['d-spec', FIRST, firstAt],
      ['d-new', SECOND, rfxNow()],
    ]);
    noForgery(docs);
  });

  it('KNOWN-BAD — another supplier\'s earlier file is not "carried": a same-id file on a competitor\'s quote is stamped new', async () => {
    // qt-014b is sup-015's quote on the same RFQ; its file must not lend sup-007 a stamp.
    const competitorQuote = quotationStore.all().find((q) => q.rfqId === 'rfq-014' && q.supplierId !== 'sup-007')!;
    quotationStore.update(competitorQuote.id, (q) => ({
      ...q,
      documents: [{ id: 'd-spec', attachment: file('d-spec.pdf'), uploadedAt: BACKDATED, uploadedBy: FORGED }],
    }));
    const res = await svc.dispatch(supplier('sup-007', SECOND), {
      transitionId: 't_quotation_revise',
      entity: 'quotation',
      payload: {
        roundId: 'nr-0001',
        rfqId: 'rfq-014',
        supplierId: 'sup-007',
        roundNumber: 1,
        supersedesQuotationId: competitorQuote.id,
        unitPrice: 1_000,
        leadTimeDays: 18,
        currency: 'IDR',
        documents: [{ id: 'd-spec', attachment: file('d-spec.pdf') }],
      },
    });
    expect(res.status, res.reason).toBe('done');
    const doc = quotationStore.get(res.entityId!)!.documents![0]!;
    expect(doc.uploadedBy).toEqual(SECOND);
    expect(doc.uploadedAt).toBe(rfxNow());
  });
});
