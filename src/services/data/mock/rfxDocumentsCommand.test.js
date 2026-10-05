// ────────────────────────────────────────────────────────────────────────────
// NR-1 — document requests and response documents through the REAL
// MockCommandService, read back through the REAL MockProcurementService.
// Every refusal is probed both ways: the known-bad and a known-good twin that
// differs in the one fact the rule is about.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import {
  resetRfxStores,
  rfiResponseStore,
  rfpEventStore,
  rfpResponseStore
} from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { rfxNow } from './rfxReadModel';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { prefillRfqItemsFromRfp } from '../../sourcing/rfxPrefill';
import { seedFromRfp } from '@pages-v2/sourcing/rfqDraft';
import {
  resetRfxTemplatesForTest,
  rfpTemplateStore,
  RFP_TEMPLATES_KEY
} from '../../sourcing/rfxTemplates';
/** @import { DocumentRequest } from '../../sourcing/types' */
/** @import { AttachmentMeta } from '../../attachments/sessionAttachments' */

const svc = new MockCommandService();
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
const sup007 = supplier('sup-007');
const sup008 = supplier('sup-008');

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
  window.localStorage.removeItem(RFP_TEMPLATES_KEY);
  resetRfxTemplatesForTest();
});

/** @param {number} offset */
const dayFromNow = (offset) =>
  new Date(Date.parse(rfxNow()) + offset * 86_400_000).toISOString().slice(0, 10);

/** @type {DocumentRequest} */
const HALAL = { id: 'dr-halal', name: 'Halal certificate', type: 'certificate', required: true };

/**
 * @param {string} name
 * @returns {AttachmentMeta}
 */
const file = (name, size = 120_000) => ({
  id: `f-${name}`,
  name,
  size,
  type: 'application/pdf',
  addedAt: '2026-09-20T00:00:00.000Z'
});

/** @param {string} supplierId */
const halalDoc = (supplierId) => ({
  id: `d-halal-${supplierId}`,
  requestId: HALAL.id,
  attachment: file(`halal-${supplierId}.pdf`),
  certificate: { number: 'ID00410000123', issuer: 'BPJPH', expiresOn: '2027-06-30' }
});

/**
 * A published RFP asking sup-007 and sup-008 for one required certificate.
 * @returns {Promise<string>}
 */
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

/**
 * @param {string} rfpId
 * @param {string} supplierId
 * @param {unknown[]} [documents]
 */
const answerPayload = (rfpId, supplierId, documents) => ({
  rfpId,
  supplierId,
  answers: [{ termId: 'paymentTerms', proposedValue: 'Net 30', stance: 'comply' }],
  pricing: { prices: [{ optionId: 'opt-1', qty: 10_000, unitPrice: 1_200 }], proposedOptions: [] },
  ...(documents ? { documents } : {})
});

/**
 * @param {QueryScope} scope
 * @param {string} rfpId
 * @param {string} supplierId
 * @param {unknown[]} [documents]
 */
async function save(scope, rfpId, supplierId, documents) {
  return svc.dispatch(scope, {
    transitionId: 't_rfpresponse_save',
    entity: 'rfpResponse',
    payload: answerPayload(rfpId, supplierId, documents)
  });
}

/**
 * @param {QueryScope} scope
 * @param {string} responseId
 */
async function submit(scope, responseId) {
  return svc.dispatch(scope, {
    transitionId: 't_rfpresponse_submit',
    entity: 'rfpResponse',
    entityId: responseId,
    payload: {}
  });
}

describe('NR-1 BR-02 / BR-03 / BR-04 — an RFP with a required Certificate request', () => {
  it('the create verb stores the request on the event', async () => {
    const rfpId = await publishedRfp();
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get(rfpId))
        .documentRequests
    ).toEqual([HALAL]);
  });

  it('KNOWN-BAD — submit without the certificate is refused, naming the request', async () => {
    const rfpId = await publishedRfp();
    const saved = await save(sup007, rfpId, 'sup-007');
    expect(saved.status, saved.reason).toBe('done');
    const res = await submit(
      sup007,
      /** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId)
    );
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/DOCUMENT_REQUIRED_MISSING: Halal certificate/);
    expect(
      /** @type {import('../../sourcing/types').RfpResponse} */ (
        rfpResponseStore.get(/** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId))
      ).status
    ).toBe('Draft');
  });

  it('KNOWN-BAD — a certificate file without its number is refused CERTIFICATE_FIELDS_MISSING', async () => {
    const rfpId = await publishedRfp();
    const noNumber = {
      ...halalDoc('sup-007'),
      certificate: { number: '', issuer: 'BPJPH', expiresOn: '2027-06-30' }
    };
    const saved = await save(sup007, rfpId, 'sup-007', [noNumber]);
    expect(saved.status, saved.reason).toBe('done');
    const res = await submit(
      sup007,
      /** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId)
    );
    expect(res.reason).toMatch(/CERTIFICATE_FIELDS_MISSING/);
  });

  it("KNOWN-GOOD — with number, issuer, expiry and a file, submit goes through and the upload time is the store's", async () => {
    const rfpId = await publishedRfp();
    const saved = await save(sup007, rfpId, 'sup-007', [
      { ...halalDoc('sup-007'), uploadedAt: '2000-01-01' }
    ]);
    expect(saved.status, saved.reason).toBe('done');
    const res = await submit(
      sup007,
      /** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId)
    );
    expect(res.status, res.reason).toBe('done');
    const row = /** @type {import('../../sourcing/types').RfpResponse} */ (
      rfpResponseStore.get(/** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId))
    );
    expect(row.status).toBe('Submitted');
    expect(row.documents).toHaveLength(1);
    expect(
      /** @type {NonNullable<typeof row.documents>} */ (row.documents)[0].certificate?.issuer
    ).toBe('BPJPH');
    expect(/** @type {NonNullable<typeof row.documents>} */ (row.documents)[0].uploadedAt).toBe(
      sdcClock.now()
    );
  });
});

describe('NR-1 BR-05 — a draft save checks the file limits only', () => {
  it('KNOWN-BAD — a ZIP is refused at save, and nothing is stored', async () => {
    const rfpId = await publishedRfp();
    const zip = { ...halalDoc('sup-007'), attachment: file('halal.zip') };
    const res = await save(sup007, rfpId, 'sup-007', [zip]);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/FILE_TYPE_NOT_ALLOWED/);
    expect(
      rfpResponseStore.all().some((r) => r.rfpId === rfpId && r.supplierId === 'sup-007')
    ).toBe(false);
  });

  it('KNOWN-GOOD — a draft missing the required certificate still saves', async () => {
    const rfpId = await publishedRfp();
    const other = { id: 'd-other', attachment: file('profile.pdf') };
    const res = await save(sup007, rfpId, 'sup-007', [other]);
    expect(res.status, res.reason).toBe('done');
  });
});

describe("NR-1 BR-06 / BR-07 — who reads a supplier's documents", () => {
  it("a supplier cannot read another supplier's documents", async () => {
    const rfpId = await publishedRfp();
    const saved = await save(sup007, rfpId, 'sup-007', [halalDoc('sup-007')]);
    expect(
      (await submit(sup007, /** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId)))
        .status
    ).toBe('done');

    const theirs = /** @type {import('../../sourcing/views').RfpEventView} */ (
      (await reads.getRfpEvents(sup008)).items.find((e) => e.id === rfpId)
    );
    expect(theirs.responses.every((r) => r.supplierId === 'sup-008')).toBe(true);
    expect(JSON.stringify(theirs)).not.toContain('halal-sup-007.pdf');
    // KNOWN-GOOD control — the author reads its own file.
    const mine = /** @type {import('../../sourcing/views').RfpEventView} */ (
      (await reads.getRfpEvents(sup007)).items.find((e) => e.id === rfpId)
    );
    expect(mine.responses[0].documents?.[0].attachment.name).toBe('halal-sup-007.pdf');
  });

  it('the buyer cannot read the documents of a Draft response, and reads them once Submitted', async () => {
    const rfpId = await publishedRfp();
    const saved = await save(sup007, rfpId, 'sup-007', [halalDoc('sup-007')]);
    const draftView = /** @type {import('../../sourcing/views').RfpEventView} */ (
      (await reads.getRfpEvents(buyer)).items.find((e) => e.id === rfpId)
    );
    expect(draftView.responses).toHaveLength(0);
    expect(JSON.stringify(draftView)).not.toContain('halal-sup-007.pdf');
    // The draft holding only a file reads as started, not as not started.
    expect(
      /** @type {import('../../sourcing/views').RfxInviteeView} */ (
        draftView.invitedSuppliers.find((i) => i.supplierId === 'sup-007')
      ).responseState
    ).toBe('draft');

    expect(
      (await submit(sup007, /** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId)))
        .status
    ).toBe('done');
    const sent = /** @type {import('../../sourcing/views').RfpEventView} */ (
      (await reads.getRfpEvents(buyer)).items.find((e) => e.id === rfpId)
    );
    expect(sent.responses[0].documents?.[0].attachment.name).toBe('halal-sup-007.pdf');
  });

  it('a confidential event hides its requests from a supplier who has not accepted', async () => {
    const rfpId = await publishedRfp();
    rfpEventStore.update(rfpId, (e) => ({ ...e, confidentiality: {} }));
    const locked = /** @type {import('../../sourcing/views').RfpEventView} */ (
      (await reads.getRfpEvents(sup007)).items.find((e) => e.id === rfpId)
    );
    expect(locked.documentRequests).toEqual([]);
    // KNOWN-GOOD control — the buyer reads them.
    const full = /** @type {import('../../sourcing/views').RfpEventView} */ (
      (await reads.getRfpEvents(buyer)).items.find((e) => e.id === rfpId)
    );
    expect(full.documentRequests).toEqual([HALAL]);
  });
});

describe('NR-1 BR-11 — requests travel to a follow-on event, documents never do', () => {
  it('RFP → RFQ pre-fill copies the requests and not the documents', async () => {
    const rfpId = await publishedRfp();
    const saved = await save(sup007, rfpId, 'sup-007', [halalDoc('sup-007')]);
    expect(
      (await submit(sup007, /** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId)))
        .status
    ).toBe('done');
    const rfp = /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get(rfpId));

    const prefill = prefillRfqItemsFromRfp(rfp, rfpResponseStore.all(), ['opt-1']);
    expect(prefill.documentRequests).toEqual([HALAL]);
    expect(prefill.invitedSupplierIds).toEqual(['sup-007']);
    expect(JSON.stringify(prefill)).not.toContain('halal-sup-007.pdf');

    const seed = seedFromRfp(prefill, rfp.eventNumber);
    expect(seed.documentRequests).toEqual([HALAL]);
    expect(JSON.stringify(seed)).not.toContain('halal-sup-007.pdf');
  });

  it('saving an RFP template keeps the requests, through a reload', () => {
    const saved = rfpTemplateStore.save(
      'Lip tint',
      {
        familyId: 'packaging',
        scope: 'Tube and cap',
        currency: 'IDR',
        terms: [{ termId: 'paymentTerms', requestedValue: 'Net 30' }],
        questions: [],
        customSections: [],
        confidential: false,
        documentRequests: [HALAL]
      },
      rfxNow()
    );
    expect(saved.ok, saved.ok ? '' : saved.reason).toBe(true);
    resetRfxTemplatesForTest();
    const [tpl] = rfpTemplateStore.readState().templates;
    expect(tpl.content.documentRequests).toEqual([HALAL]);
  });

  it('KNOWN-BAD — a template with a duplicate request name is refused by the authoring rule', () => {
    const res = rfpTemplateStore.save(
      'Lip tint',
      {
        familyId: 'packaging',
        scope: 'Tube and cap',
        currency: 'IDR',
        terms: [{ termId: 'paymentTerms', requestedValue: 'Net 30' }],
        questions: [],
        customSections: [],
        confidential: false,
        documentRequests: [HALAL, { ...HALAL, id: 'dr-2' }]
      },
      rfxNow()
    );
    expect(res.ok).toBe(false);
    expect(res.ok ? '' : res.reason).toMatch(/DOCUMENT_REQUEST_INVALID/);
  });
});

describe('NR-1 RFX-R2 — the authoring verbs refuse a malformed request, naming it', () => {
  it('KNOWN-BAD — an RFP request naming an item is refused (only an RFQ has items)', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfp_create',
      entity: 'rfpEvent',
      payload: {
        title: 'x',
        scope: 'x',
        materialCategory: 'Packaging',
        responseDeadline: dayFromNow(14),
        currency: 'IDR',
        invitedSupplierIds: ['sup-007'],
        terms: [{ termId: 'paymentTerms', requestedValue: 'Net 30' }],
        documentRequests: [{ ...HALAL, itemLineNo: 1 }]
      }
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/DOCUMENT_REQUEST_INVALID: "Halal certificate"/);
  });

  it('KNOWN-BAD — an RFQ request naming an item the RFQ does not have is refused; its own item passes', async () => {
    const base = {
      title: 'Sticker roll',
      materialCategory: 'Packaging',
      uom: 'PCS',
      totalQty: 10_000,
      responseDeadline: dayFromNow(14),
      invitedSupplierIds: ['sup-007'],
      currency: 'IDR',
      items: [
        {
          lineNo: 1,
          itemType: 'other',
          description: 'Sticker',
          variantCount: 1,
          uom: 'PCS',
          specFields: []
        }
      ],
      tiers: [{ qty: 10_000, basis: 'total' }]
    };
    const bad = await svc.dispatch(buyer, {
      transitionId: 't_rfq_create',
      entity: 'rfq',
      payload: { ...base, documentRequests: [{ ...HALAL, itemLineNo: 2 }] }
    });
    expect(bad.status).toBe('failed');
    expect(bad.reason).toMatch(/DOCUMENT_REQUEST_INVALID/);
    const good = await svc.dispatch(buyer, {
      transitionId: 't_rfq_create',
      entity: 'rfq',
      payload: { ...base, documentRequests: [{ ...HALAL, itemLineNo: 1 }] }
    });
    expect(good.status, good.reason).toBe('done');
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (
        rfqStore.get(/** @type {NonNullable<typeof good.entityId>} */ (good.entityId))
      ).documentRequests
    ).toEqual([{ ...HALAL, itemLineNo: 1 }]);
  });
});

describe('NR-1 BR-03 — the quotation submit verb', () => {
  /**
   * @param {string} rfqId
   * @param {unknown[]} [documents]
   */
  const quote = (rfqId, documents) => ({
    rfqId,
    supplierId: 'sup-007',
    unitPrice: 1_000,
    leadTimeDays: 20,
    currency: 'IDR',
    paymentTermsOffered: 'Net 30',
    validUntil: dayFromNow(30),
    ...(documents ? { documents } : {})
  });

  it('refuses a quote missing the required document, and accepts it with the document', async () => {
    const open = /** @type {import('../../../data/mockRfqs').RFQ} */ (
      rfqStore
        .all()
        .find(
          (r) =>
            r.status === 'Open' &&
            r.invitedSupplierIds.includes('sup-007') &&
            !(r.items ?? []).length
        )
    );
    rfqStore.update(open.id, (r) => ({ ...r, documentRequests: [HALAL] }));

    const bad = await svc.dispatch(sup007, {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: quote(open.id)
    });
    expect(bad.status).toBe('failed');
    expect(bad.reason).toMatch(/DOCUMENT_REQUIRED_MISSING: Halal certificate/);

    const good = await svc.dispatch(sup007, {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: quote(open.id, [halalDoc('sup-007')])
    });
    expect(good.status, good.reason).toBe('done');
    expect(
      /** @type {import('../../../data/mockQuotations').Quotation} */ (
        quotationStore.get(/** @type {NonNullable<typeof good.entityId>} */ (good.entityId))
      ).documents?.[0].requestId
    ).toBe(HALAL.id);
  });
});

// B4 — a revised quote in a negotiation round carries its files forward
// (NR-1 BR-09), so `t_quotation_revise` runs the same document rule as submit.
describe('NR-1 BR-03 / BR-09 — the quotation revise verb (negotiation round)', () => {
  /** @param {unknown[]} [documents] */
  const revise = (documents) => ({
    roundId: 'nr-0001',
    rfqId: 'rfq-014',
    supplierId: 'sup-007',
    roundNumber: 1,
    supersedesQuotationId: 'qt-014a',
    unitPrice: 1_000,
    leadTimeDays: 18,
    currency: 'IDR',
    ...(documents ? { documents } : {})
  });

  it('KNOWN-BAD — a revision missing the required document is refused, naming it', async () => {
    rfqStore.update('rfq-014', (r) => ({ ...r, documentRequests: [HALAL] }));
    const res = await svc.dispatch(sup007, {
      transitionId: 't_quotation_revise',
      entity: 'quotation',
      payload: revise()
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/DOCUMENT_REQUIRED_MISSING: Halal certificate/);
  });

  it('KNOWN-GOOD — the same revision carrying the certificate is accepted and stores it', async () => {
    rfqStore.update('rfq-014', (r) => ({ ...r, documentRequests: [HALAL] }));
    const res = await svc.dispatch(sup007, {
      transitionId: 't_quotation_revise',
      entity: 'quotation',
      payload: revise([halalDoc('sup-007')])
    });
    expect(res.status, res.reason).toBe('done');
    expect(
      /** @type {import('../../../data/mockQuotations').Quotation} */ (
        quotationStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
      ).documents?.[0].requestId
    ).toBe(HALAL.id);
  });

  it('KNOWN-BAD — a revision carrying a ZIP is refused by the file limits', async () => {
    const res = await svc.dispatch(sup007, {
      transitionId: 't_quotation_revise',
      entity: 'quotation',
      payload: revise([{ id: 'd-zip', attachment: file('samples.zip') }])
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/FILE_TYPE_NOT_ALLOWED: samples.zip/);
  });
});

describe('NR-1 — the RFI response verbs carry documents too', () => {
  it('an RFI draft save stores the documents, replacing them on the next save', async () => {
    // sup-013 holds a DRAFT on rfi-001 (sup-007's is Submitted, and a save on a
    // Submitted response is refused RESPONSE_ALREADY_SUBMITTED since B2).
    const sup013 = supplier('sup-013');
    /** @param {unknown[]} documents */
    const payload = (documents) => ({
      rfiId: 'rfi-001',
      supplierId: 'sup-013',
      answers: [],
      documents
    });
    const first = await svc.dispatch(sup013, {
      transitionId: 't_rfiresponse_save',
      entity: 'rfiResponse',
      payload: payload([{ id: 'd-a', attachment: file('a.pdf') }])
    });
    expect(first.status, first.reason).toBe('done');
    await svc.dispatch(sup013, {
      transitionId: 't_rfiresponse_save',
      entity: 'rfiResponse',
      payload: payload([{ id: 'd-b', attachment: file('b.pdf') }])
    });
    expect(
      /** @type {import('../../sourcing/types').RfiResponse} */ (
        rfiResponseStore.get(/** @type {NonNullable<typeof first.entityId>} */ (first.entityId))
      ).documents?.map((d) => d.attachment.name)
    ).toEqual(['b.pdf']);
  });
});
