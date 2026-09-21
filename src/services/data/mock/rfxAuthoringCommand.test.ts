// ────────────────────────────────────────────────────────────────────────────
// RFx authoring through the REAL MockCommandService and read back through the
// REAL MockProcurementService: the confidentiality gate and the T&C gate
// (probed from both sides — the read AND the write), custom terms at the create
// verb, typed answers and indicative pricing at the submit verb.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { resetRfxStores, rfpEventStore, rfpResponseStore, rfiResponseStore } from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { rfxNow } from './rfxReadModel';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '../../../context/noPerson';

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

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

const dayFromNow = (offset: number) =>
  new Date(Date.parse(rfxNow()) + offset * 86_400_000).toISOString().slice(0, 10);

const icyFor = async (scope: QueryScope) =>
  (await reads.getRfpEvents(scope)).items.find((e) => e.id === 'rfp-003')!;

describe('fixtures — the Paragon-shaped events this batch seeds', () => {
  it('Tundra: two options × 10K/50K/100K, a reference image, and sup-007 proposing its own option', () => {
    const tundra = rfpEventStore.get('rfp-002')!;
    expect(tundra.pricing?.options.map((o) => o.title)).toEqual([
      'Full set: bottle, pump and cap',
      'Pump and cap only',
    ]);
    expect(tundra.pricing?.quantityPoints).toEqual([10_000, 50_000, 100_000]);
    expect(tundra.attachments?.[0].type).toBe('image/jpeg');
    const answer = rfpResponseStore.all().find((r) => r.rfpId === 'rfp-002' && r.supplierId === 'sup-007')!;
    expect(answer.status).toBe('Submitted');
    expect(answer.pricing?.proposedOptions.map((o) => o.id)).toEqual(['sup-opt-1']);
  });

  it('ICY: formula and pack options at 25K/50K PER VARIANT, confidential, with a T&C', () => {
    const icy = rfpEventStore.get('rfp-003')!;
    expect(icy.pricing?.quantityPoints).toEqual([25_000, 50_000]);
    expect(icy.pricing?.quantityBasis).toBe('perVariant');
    expect(icy.pricing?.options.map((o) => o.id)).toEqual([
      'opt-formula-1',
      'opt-formula-2',
      'opt-pack-1',
      'opt-pack-2',
      'opt-pack-3',
    ]);
    expect(icy.confidentiality).toBeDefined();
    expect(icy.termsDocument?.text).toMatch(/indicative/);
  });
});

describe('the confidentiality gate — withheld at the READ, refused at the WRITE', () => {
  it('⚠️ READ — before accepting, the supplier is handed NO scope, terms, questions, pricing or files', async () => {
    const icy = await icyFor(sup007);
    expect(icy.confidentialityLocked).toBe(true);
    expect(icy.scope).toBe('');
    expect(icy.terms).toEqual([]);
    expect(icy.questions).toEqual([]);
    expect(icy.pricing).toBeUndefined();
    expect(icy.termsDocument).toBeUndefined();
    // KNOWN-GOOD CONTROL — the buyer reads the full event, so the empties above
    // are a withheld read and not an empty fixture.
    const buyerView = await icyFor(buyer);
    expect(buyerView.confidentialityLocked).toBe(false);
    expect(buyerView.terms.length).toBeGreaterThan(0);
    expect(buyerView.pricing?.options).toHaveLength(5);
  });

  it('⚠️ WRITE — a save carrying answers before acceptance is refused by name, and stores nothing', async () => {
    const res = await svc.dispatch(sup007, {
      transitionId: 't_rfpresponse_save',
      entity: 'rfpResponse',
      payload: {
        rfpId: 'rfp-003',
        supplierId: 'sup-007',
        answers: [{ termId: 'paymentTerms', proposedValue: '45', stance: 'comply' }],
      },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/CONFIDENTIALITY_NOT_ACCEPTED/);
    expect(rfpResponseStore.all().some((r) => r.rfpId === 'rfp-003' && r.supplierId === 'sup-007')).toBe(false);
  });

  it('ACCEPTING records the time (store-assigned), reveals the content, and the buyer sees who accepted', async () => {
    const accepted = await svc.dispatch(sup007, {
      transitionId: 't_rfpresponse_save',
      entity: 'rfpResponse',
      // A payload time is ignored: the store assigns it.
      payload: { rfpId: 'rfp-003', supplierId: 'sup-007', acceptConfidentiality: true, confidentialityAcceptedAt: '2000-01-01' },
    });
    expect(accepted.status, accepted.reason).toBe('done');
    const row = rfpResponseStore.get(accepted.entityId!)!;
    expect(row.confidentialityAcceptedAt).toBe(sdcClock.now());
    expect(row.answers).toEqual([]);

    const icy = await icyFor(sup007);
    expect(icy.confidentialityLocked).toBe(false);
    expect(icy.scope).toMatch(/lip product/);

    const buyerView = await icyFor(buyer);
    const inv = buyerView.invitedSuppliers.find((i) => i.supplierId === 'sup-007')!;
    expect(inv.confidentialityAcceptedAt).toBe(sdcClock.now());
    // An acceptance is not a started answer.
    expect(inv.responseState).toBe('notStarted');
    // KNOWN-BAD twin — the invitee that has not accepted reads as not accepted.
    expect(buyerView.invitedSuppliers.find((i) => i.supplierId === 'sup-015')!.confidentialityAcceptedAt).toBeNull();
  });

  it('T&C — after confidentiality, answers are still refused until the T&C is accepted', async () => {
    await svc.dispatch(sup007, {
      transitionId: 't_rfpresponse_save',
      entity: 'rfpResponse',
      payload: { rfpId: 'rfp-003', supplierId: 'sup-007', acceptConfidentiality: true },
    });
    const answers = [{ termId: 'paymentTerms', proposedValue: '45', stance: 'comply' }];
    const refused = await svc.dispatch(sup007, {
      transitionId: 't_rfpresponse_save',
      entity: 'rfpResponse',
      payload: { rfpId: 'rfp-003', supplierId: 'sup-007', answers },
    });
    expect(refused.status).toBe('failed');
    expect(refused.reason).toMatch(/TC_NOT_ACCEPTED/);

    const ok = await svc.dispatch(sup007, {
      transitionId: 't_rfpresponse_save',
      entity: 'rfpResponse',
      payload: { rfpId: 'rfp-003', supplierId: 'sup-007', answers, acceptTerms: true },
    });
    expect(ok.status, ok.reason).toBe('done');
    expect(rfpResponseStore.get(ok.entityId!)!.termsAcceptedAt).toBe(sdcClock.now());
  });

  it('an RFI raised confidential withholds its questions the same way', async () => {
    const created = await svc.dispatch(buyer, {
      transitionId: 't_rfi_create',
      entity: 'rfiEvent',
      payload: {
        title: 'Confidential capability survey',
        templateId: 'packaging',
        materialCategory: 'Packaging',
        responseDeadline: dayFromNow(10),
        invitedSupplierIds: ['sup-007'],
        confidentiality: {},
      },
    });
    expect(created.status, created.reason).toBe('done');
    await svc.dispatch(buyer, { transitionId: 't_rfi_publish', entity: 'rfiEvent', entityId: created.entityId!, payload: {} });
    const locked = (await reads.getRfiEvents(sup007)).items.find((e) => e.id === created.entityId)!;
    expect(locked.confidentialityLocked).toBe(true);
    expect(locked.questions).toEqual([]);

    const answer = await svc.dispatch(sup007, {
      transitionId: 't_rfiresponse_save',
      entity: 'rfiResponse',
      payload: { rfiId: created.entityId, supplierId: 'sup-007', answers: [{ questionId: 'a-testing', value: 'yes' }] },
    });
    expect(answer.reason).toMatch(/CONFIDENTIALITY_NOT_ACCEPTED/);

    await svc.dispatch(sup007, {
      transitionId: 't_rfiresponse_save',
      entity: 'rfiResponse',
      payload: { rfiId: created.entityId, supplierId: 'sup-007', acceptConfidentiality: true },
    });
    const open = (await reads.getRfiEvents(sup007)).items.find((e) => e.id === created.entityId)!;
    expect(open.questions.length).toBeGreaterThan(0);
    expect(rfiResponseStore.all().find((r) => r.rfiId === created.entityId)!.confidentialityAcceptedAt).toBeDefined();
  });
});

describe('custom terms at the create verb', () => {
  const base = {
    title: 'Custom-term probe',
    scope: 'Probe.',
    materialCategory: 'Packaging',
    responseDeadline: dayFromNow(14),
    currency: 'IDR',
    invitedSupplierIds: ['sup-007'],
  };

  it('KNOWN-BAD — a custom number term asked in words is refused by name', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfp_create',
      entity: 'rfpEvent',
      payload: {
        ...base,
        terms: [{ termId: 'custom-1', label: 'Shelf life', valueKind: 'numberWithUnit', unit: 'months', requestedValue: 'two years' }],
      },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/TERM_VALUE_INVALID/);
  });

  it('KNOWN-GOOD — the same term asked as a number is stored with its label and kind', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfp_create',
      entity: 'rfpEvent',
      payload: {
        ...base,
        terms: [{ termId: 'custom-1', label: 'Shelf life', valueKind: 'numberWithUnit', unit: 'months', requestedValue: '24' }],
      },
    });
    expect(res.status, res.reason).toBe('done');
    expect(rfpEventStore.get(res.entityId!)!.terms[0]).toMatchObject({ label: 'Shelf life', valueKind: 'numberWithUnit' });
  });

  it('a sourceRfiId that names no RFI is refused; a real one is stored', async () => {
    const terms = [{ termId: 'paymentTerms', requestedValue: '60' }];
    const bad = await svc.dispatch(buyer, {
      transitionId: 't_rfp_create',
      entity: 'rfpEvent',
      payload: { ...base, terms, sourceRfiId: 'rfi-999' },
    });
    expect(bad.reason).toMatch(/UNKNOWN_SOURCE_RFI/);
    const good = await svc.dispatch(buyer, {
      transitionId: 't_rfp_create',
      entity: 'rfpEvent',
      payload: { ...base, terms, sourceRfiId: 'rfi-001' },
    });
    expect(good.status, good.reason).toBe('done');
    expect(rfpEventStore.get(good.entityId!)!.sourceRfiId).toBe('rfi-001');
    const view = (await reads.getRfpEvents(buyer)).items.find((e) => e.id === good.entityId)!;
    expect(view.sourceRfiNumber).toBe('RFI-2026-001');
  });
});

describe('indicative pricing at the submit verb (Tundra, sup-015 still to answer)', () => {
  const termAnswers = [
    { termId: 'priceValidity', proposedValue: '6 months', stance: 'comply' },
    { termId: 'paymentTerms', proposedValue: '60', stance: 'comply' },
    { termId: 'leadTime', proposedValue: '45', stance: 'comply' },
    { termId: 'custom-dosage', proposedValue: '1.5', stance: 'comply' },
    { termId: 'custom-pcr', proposedValue: 'yes', stance: 'comply' },
  ];
  const submit = async (pricing: unknown) => {
    const sup015 = supplier('sup-015');
    const saved = await svc.dispatch(sup015, {
      transitionId: 't_rfpresponse_save',
      entity: 'rfpResponse',
      payload: { rfpId: 'rfp-002', supplierId: 'sup-015', answers: termAnswers, pricing },
    });
    expect(saved.status, saved.reason).toBe('done');
    return svc.dispatch(sup015, { transitionId: 't_rfpresponse_submit', entity: 'rfpResponse', entityId: saved.entityId!, payload: {} });
  };

  it('KNOWN-BAD — a proposal with no indicative price is refused by name', async () => {
    const res = await submit({ prices: [], proposedOptions: [], sample: { canSample: false } });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/PRICING_EMPTY/);
  });

  it('KNOWN-GOOD — one priced option and a sample answer is sent', async () => {
    const res = await submit({
      prices: [{ optionId: 'opt-pump-cap', qty: 50_000, unitPrice: 2_400 }],
      proposedOptions: [],
      sample: { canSample: false },
    });
    expect(res.status, res.reason).toBe('done');
  });
});
