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
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { rfxNow } from './rfxReadModel';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';
/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { DocumentRequest } from '../../sourcing/types' */
/** @import { AttachmentMeta } from '../../attachments/sessionAttachments' */

const svc = new MockCommandService();
const reads = new MockProcurementService();

/**
 * @param {string} id
 * @param {string} name
 * @returns {ActorAttribution}
 */
const person = (id, name) => ({
  kind: 'RESOLVED',
  person: { personId: id, displayName: name }
});
const FIRST = person('p-uploader-first', 'First uploader');
const SECOND = person('p-uploader-second', 'Second uploader');
const FORGED = person('p-forged', 'Forged in the payload');
const BACKDATED = '1999-01-01T00:00:00.000Z';

/**
 * @param {string} supplierId
 * @param {ActorAttribution} [actor]
 * @returns {QueryScope}
 */
const supplier = (supplierId, actor = NO_PERSON) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor
});
/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

const DAY_MS = 86_400_000;
/** @param {number} offset */
const dayFromNow = (offset) =>
  new Date(Date.parse(rfxNow()) + offset * DAY_MS).toISOString().slice(0, 10);
/** @param {number} days */
const travel = (days) => sdcClock.set(new Date(Date.parse(rfxNow()) + days * DAY_MS).toISOString());

/** @type {DocumentRequest} */
const HALAL = { id: 'dr-halal', name: 'Halal certificate', type: 'certificate', required: true };

/**
 * @param {string} name
 * @returns {AttachmentMeta}
 */
const file = (name) => ({
  id: `f-${name}`,
  name,
  size: 120_000,
  type: 'application/pdf',
  addedAt: '2026-09-20T00:00:00.000Z'
});

/**
 * A document as a payload carries it, CLAIMING a forged uploader and a backdated time.
 * @param {string} id
 * @param {Record<string, unknown>} [over]
 */
const claiming = (id, over = {}) => ({
  id,
  attachment: file(`${id}.pdf`),
  uploadedBy: FORGED,
  uploadedAt: BACKDATED,
  ...over
});
/** @param {string} supplierId */
const halal = (supplierId) =>
  claiming(`d-halal-${supplierId}`, {
    requestId: HALAL.id,
    certificate: { number: 'ID00410000123', issuer: 'BPJPH', expiresOn: '2027-06-30' }
  });

/** @param {unknown} value */
const noForgery = (value) => {
  expect(JSON.stringify(value)).not.toContain('p-forged');
  expect(JSON.stringify(value)).not.toContain(BACKDATED);
};

// ── RFP ─────────────────────────────────────────────────────────────────────

/** @returns {Promise<string>} */
async function publishedRfp() {
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
        samplesRequested: false
      }
    }
  });
  expect(created.status, created.reason).toBe('done');
  const published = await svc.dispatch(buyer, {
    transitionId: 't_rfp_publish',
    entity: 'rfpEvent',
    entityId: /** @type {NonNullable<typeof created.entityId>} */ (created.entityId),
    payload: {}
  });
  expect(published.status, published.reason).toBe('done');
  return /** @type {NonNullable<typeof created.entityId>} */ (created.entityId);
}

/** @param {unknown[]} documents */
const proposal = (documents) => ({
  answers: [{ termId: 'paymentTerms', proposedValue: 'Net 30', stance: 'comply' }],
  pricing: { prices: [{ optionId: 'opt-1', qty: 10_000, unitPrice: 1_200 }], proposedOptions: [] },
  documents
});

/**
 * @param {QueryScope} scope
 * @param {string} rfpId
 * @param {string} supplierId
 * @returns {Promise<string>}
 */
async function submittedProposal(scope, rfpId, supplierId) {
  const saved = await svc.dispatch(scope, {
    transitionId: 't_rfpresponse_save',
    entity: 'rfpResponse',
    payload: { rfpId, supplierId, ...proposal([halal(supplierId)]) }
  });
  expect(saved.status, saved.reason).toBe('done');
  const sent = await svc.dispatch(scope, {
    transitionId: 't_rfpresponse_submit',
    entity: 'rfpResponse',
    entityId: /** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId),
    payload: {}
  });
  expect(sent.status, sent.reason).toBe('done');
  return /** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId);
}

describe('CE-11i — RFP response save / submit / revise', () => {
  it("save stamps the SESSION actor and the store clock; the payload's forged uploader never lands", async () => {
    const rfpId = await publishedRfp();
    const responseId = await submittedProposal(supplier('sup-007', FIRST), rfpId, 'sup-007');
    const stored = /** @type {import('../../sourcing/types').RfpResponse} */ (
      rfpResponseStore.get(responseId)
    );
    expect(
      /** @type {import('../../sourcing/types').ResponseDocument} */ (
        /** @type {NonNullable<typeof stored.documents>} */ (stored.documents)[0]
      ).uploadedBy
    ).toEqual(FIRST);
    expect(
      /** @type {import('../../sourcing/types').ResponseDocument} */ (
        /** @type {NonNullable<typeof stored.documents>} */ (stored.documents)[0]
      ).uploadedAt
    ).toBe(rfxNow());
    // Version 1 holds the same stamp — the version is a copy of the response.
    expect(
      /** @type {import('../../sourcing/types').ResponseDocument} */ (
        /** @type {NonNullable<(NonNullable<(NonNullable<typeof stored.versions>)[number]>)['documents']>} */ (
          /** @type {NonNullable<(NonNullable<typeof stored.versions>)[number]>} */ (
            /** @type {NonNullable<typeof stored.versions>} */ (stored.versions)[0]
          ).documents
        )[0]
      ).uploadedBy
    ).toEqual(FIRST);
    noForgery(stored);
  });

  it('revise: the CARRIED file keeps its first stamp; the NEW file is stamped with the reviser', async () => {
    const rfpId = await publishedRfp();
    const responseId = await submittedProposal(supplier('sup-007', FIRST), rfpId, 'sup-007');
    const firstAt = /** @type {import('../../sourcing/types').ResponseDocument} */ (
      /** @type {NonNullable<(NonNullable<ReturnType<typeof rfpResponseStore.get>>)['documents']>} */ (
        /** @type {import('../../sourcing/types').RfpResponse} */ (rfpResponseStore.get(responseId))
          .documents
      )[0]
    ).uploadedAt;

    travel(2);
    const res = await svc.dispatch(supplier('sup-007', SECOND), {
      transitionId: 't_rfpresponse_revise',
      entity: 'rfpResponse',
      entityId: responseId,
      payload: proposal([halal('sup-007'), claiming('d-profile')])
    });
    expect(res.status, res.reason).toBe('done');

    const stored = /** @type {import('../../sourcing/types').RfpResponse} */ (
      rfpResponseStore.get(responseId)
    );
    const byId = new Map(
      /** @type {NonNullable<typeof stored.documents>} */ (stored.documents).map((d) => [d.id, d])
    );
    expect(
      /** @type {import('../../sourcing/types').ResponseDocument} */ (byId.get('d-halal-sup-007'))
        .uploadedBy
    ).toEqual(FIRST);
    expect(
      /** @type {import('../../sourcing/types').ResponseDocument} */ (byId.get('d-halal-sup-007'))
        .uploadedAt
    ).toBe(firstAt);
    expect(
      /** @type {import('../../sourcing/types').ResponseDocument} */ (byId.get('d-profile'))
        .uploadedBy
    ).toEqual(SECOND);
    expect(
      /** @type {import('../../sourcing/types').ResponseDocument} */ (byId.get('d-profile'))
        .uploadedAt
    ).toBe(rfxNow());
    expect(
      /** @type {import('../../sourcing/types').ResponseDocument} */ (byId.get('d-profile'))
        .uploadedAt
    ).not.toBe(firstAt);
    // Version 2 records the same thing; version 1 is untouched.
    expect(
      /** @type {NonNullable<typeof stored.versions>} */ (stored.versions).map((v) =>
        /** @type {NonNullable<typeof v.documents>} */ (v.documents).map((d) => d.id)
      )
    ).toEqual([['d-halal-sup-007'], ['d-halal-sup-007', 'd-profile']]);
    noForgery(stored);
  });

  it("the buyer reads each supplier's uploader; a supplier reads only its own (never a competitor's)", async () => {
    const rfpId = await publishedRfp();
    await submittedProposal(supplier('sup-007', FIRST), rfpId, 'sup-007');
    await submittedProposal(supplier('sup-008', SECOND), rfpId, 'sup-008');

    const board = /** @type {import('../../sourcing/views').RfpEventView} */ (
      (await reads.getRfpEvents(buyer)).items.find((e) => e.id === rfpId)
    );
    const seen = new Map(
      board.responses.map((r) => [
        r.supplierId,
        /** @type {import('../../sourcing/types').ResponseDocument} */ (
          /** @type {NonNullable<typeof r.documents>} */ (r.documents)[0]
        ).uploadedBy
      ])
    );
    expect(seen.get('sup-007')).toEqual(FIRST);
    expect(seen.get('sup-008')).toEqual(SECOND);

    const theirs = /** @type {import('../../sourcing/views').RfpEventView} */ (
      (await reads.getRfpEvents(supplier('sup-008'))).items.find((e) => e.id === rfpId)
    );
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
      payload: {
        rfiId: 'rfi-001',
        supplierId: 'sup-013',
        answers: [],
        documents: [claiming('d-a')]
      }
    });
    expect(res.status, res.reason).toBe('done');
    const doc = /** @type {import('../../sourcing/types').ResponseDocument} */ (
      /** @type {NonNullable<(NonNullable<ReturnType<typeof rfiResponseStore.get>>)['documents']>} */ (
        /** @type {import('../../sourcing/types').RfiResponse} */ (
          rfiResponseStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
        ).documents
      )[0]
    );
    expect(doc.uploadedBy).toEqual(FIRST);
    expect(doc.uploadedAt).toBe(rfxNow());
    noForgery(doc);
  });

  it("a second save keeps the carried file's stamp and stamps the new one", async () => {
    /** @param {unknown[]} documents */
    const payload = (documents) => ({
      rfiId: 'rfi-001',
      supplierId: 'sup-013',
      answers: [],
      documents
    });
    const first = await svc.dispatch(supplier('sup-013', FIRST), {
      transitionId: 't_rfiresponse_save',
      entity: 'rfiResponse',
      payload: payload([claiming('d-a')])
    });
    expect(first.status, first.reason).toBe('done');
    const firstAt = /** @type {import('../../sourcing/types').ResponseDocument} */ (
      /** @type {NonNullable<(NonNullable<ReturnType<typeof rfiResponseStore.get>>)['documents']>} */ (
        /** @type {import('../../sourcing/types').RfiResponse} */ (
          rfiResponseStore.get(/** @type {NonNullable<typeof first.entityId>} */ (first.entityId))
        ).documents
      )[0]
    ).uploadedAt;
    travel(1);
    const second = await svc.dispatch(supplier('sup-013', SECOND), {
      transitionId: 't_rfiresponse_save',
      entity: 'rfiResponse',
      payload: payload([claiming('d-a'), claiming('d-b')])
    });
    expect(second.status, second.reason).toBe('done');
    const docs =
      /** @type {NonNullable<(NonNullable<ReturnType<typeof rfiResponseStore.get>>)['documents']>} */ (
        /** @type {import('../../sourcing/types').RfiResponse} */ (
          rfiResponseStore.get(/** @type {NonNullable<typeof first.entityId>} */ (first.entityId))
        ).documents
      );
    expect(docs.map((d) => [d.id, d.uploadedBy, d.uploadedAt])).toEqual([
      ['d-a', FIRST, firstAt],
      ['d-b', SECOND, rfxNow()]
    ]);
  });

  it('revise of a seeded Submitted response: the new file is stamped; a later revise carries it unchanged', async () => {
    const seed = /** @type {import('../../sourcing/types').RfiResponse} */ (
      rfiResponseStore.get('rfi-resp-001')
    );
    const one = await svc.dispatch(supplier('sup-007', FIRST), {
      transitionId: 't_rfiresponse_revise',
      entity: 'rfiResponse',
      entityId: 'rfi-resp-001',
      payload: { answers: seed.answers, documents: [claiming('d-brochure')] }
    });
    expect(one.status, one.reason).toBe('done');
    const firstAt = /** @type {import('../../sourcing/types').ResponseDocument} */ (
      /** @type {NonNullable<(NonNullable<ReturnType<typeof rfiResponseStore.get>>)['documents']>} */ (
        /** @type {import('../../sourcing/types').RfiResponse} */ (
          rfiResponseStore.get('rfi-resp-001')
        ).documents
      )[0]
    ).uploadedAt;

    travel(1);
    const two = await svc.dispatch(supplier('sup-007', SECOND), {
      transitionId: 't_rfiresponse_revise',
      entity: 'rfiResponse',
      entityId: 'rfi-resp-001',
      payload: { answers: seed.answers, documents: [claiming('d-brochure'), claiming('d-spec')] }
    });
    expect(two.status, two.reason).toBe('done');
    const stored = /** @type {import('../../sourcing/types').RfiResponse} */ (
      rfiResponseStore.get('rfi-resp-001')
    );
    expect(
      /** @type {NonNullable<typeof stored.documents>} */ (stored.documents).map((d) => [
        d.id,
        d.uploadedBy,
        d.uploadedAt
      ])
    ).toEqual([
      ['d-brochure', FIRST, firstAt],
      ['d-spec', SECOND, rfxNow()]
    ]);
    noForgery(stored);
  });
});

// ── Quotation ───────────────────────────────────────────────────────────────

describe('CE-11i — quotation submit and negotiation-round revise', () => {
  it('submit stamps the session actor; a competitor cannot read it, the buyer can', async () => {
    const open = /** @type {import('../../../data/mockRfqs').RFQ} */ (
      rfqStore
        .all()
        .find(
          (r) =>
            r.status === 'Open' &&
            r.invitedSupplierIds.includes('sup-007') &&
            r.invitedSupplierIds.length > 1 &&
            !(r.items ?? []).length
        )
    );
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
        documents: [claiming('d-quote')]
      }
    });
    expect(res.status, res.reason).toBe('done');
    const doc = /** @type {import('../../sourcing/types').ResponseDocument} */ (
      /** @type {NonNullable<(NonNullable<ReturnType<typeof quotationStore.get>>)['documents']>} */ (
        /** @type {import('../../../data/mockQuotations').Quotation} */ (
          quotationStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
        ).documents
      )[0]
    );
    expect(doc.uploadedBy).toEqual(FIRST);
    expect(doc.uploadedAt).toBe(rfxNow());
    noForgery(doc);

    const buyerSees = (await reads.getQuotations(buyer, { rfqId: open.id })).items.find(
      (q) => q.id === res.entityId
    );
    expect(
      /** @type {import('../../sourcing/types').ResponseDocument} */ (
        /** @type {NonNullable<(NonNullable<typeof buyerSees>)['documents']>} */ (
          /** @type {import('../../../data/mockQuotations').Quotation} */ (buyerSees).documents
        )[0]
      ).uploadedBy
    ).toEqual(FIRST);
    const competitor = /** @type {NonNullable<ReturnType<typeof open.invitedSupplierIds.find>>} */ (
      open.invitedSupplierIds.find((s) => s !== 'sup-007')
    );
    const theirs = (await reads.getQuotations(supplier(competitor), { rfqId: open.id })).items;
    expect(theirs.some((q) => q.id === res.entityId)).toBe(false);
    expect(JSON.stringify(theirs)).not.toContain('p-uploader-first');
    // KNOWN-GOOD control — the author's own read carries it.
    const mine = (await reads.getQuotations(supplier('sup-007'), { rfqId: open.id })).items;
    expect(
      /** @type {import('../../sourcing/types').ResponseDocument} */ (
        /** @type {NonNullable<(NonNullable<ReturnType<typeof mine.find>>)['documents']>} */ (
          /** @type {import('../../../data/mockQuotations').Quotation} */ (
            mine.find((q) => q.id === res.entityId)
          ).documents
        )[0]
      ).uploadedBy
    ).toEqual(FIRST);
  });

  it("a round revise carries the earlier quote's file with its FIRST stamp and stamps the new file", async () => {
    // qt-014a is sup-007's quote on rfq-014; give it a file sent earlier.
    const firstAt = '2026-09-22T04:00:00.000Z';
    quotationStore.update('qt-014a', (q) => ({
      ...q,
      documents: [
        { id: 'd-spec', attachment: file('d-spec.pdf'), uploadedAt: firstAt, uploadedBy: FIRST }
      ]
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
        documents: [claiming('d-spec'), claiming('d-new')]
      }
    });
    expect(res.status, res.reason).toBe('done');
    const docs =
      /** @type {NonNullable<(NonNullable<ReturnType<typeof quotationStore.get>>)['documents']>} */ (
        /** @type {import('../../../data/mockQuotations').Quotation} */ (
          quotationStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
        ).documents
      );
    expect(docs.map((d) => [d.id, d.uploadedBy, d.uploadedAt])).toEqual([
      ['d-spec', FIRST, firstAt],
      ['d-new', SECOND, rfxNow()]
    ]);
    noForgery(docs);
  });

  it('KNOWN-BAD — another supplier\'s earlier file is not "carried": a same-id file on a competitor\'s quote is stamped new', async () => {
    // qt-014b is sup-015's quote on the same RFQ; its file must not lend sup-007 a stamp.
    const competitorQuote = /** @type {import('../../../data/mockQuotations').Quotation} */ (
      quotationStore.all().find((q) => q.rfqId === 'rfq-014' && q.supplierId !== 'sup-007')
    );
    quotationStore.update(competitorQuote.id, (q) => ({
      ...q,
      documents: [
        { id: 'd-spec', attachment: file('d-spec.pdf'), uploadedAt: BACKDATED, uploadedBy: FORGED }
      ]
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
        documents: [{ id: 'd-spec', attachment: file('d-spec.pdf') }]
      }
    });
    expect(res.status, res.reason).toBe('done');
    const doc = /** @type {import('../../sourcing/types').ResponseDocument} */ (
      /** @type {NonNullable<(NonNullable<ReturnType<typeof quotationStore.get>>)['documents']>} */ (
        /** @type {import('../../../data/mockQuotations').Quotation} */ (
          quotationStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
        ).documents
      )[0]
    );
    expect(doc.uploadedBy).toEqual(SECOND);
    expect(doc.uploadedAt).toBe(rfxNow());
  });
});
