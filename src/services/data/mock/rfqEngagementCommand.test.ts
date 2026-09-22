// ────────────────────────────────────────────────────────────────────────────
// THE SUPPLIER'S SIDE OF A TIERED RFQ, through the REAL dispatcher and read
// back through the REAL procurement service (RFx spec 2026-09-21).
//
// ⚠️ **EVERY RULE IS PROBED BOTH WAYS.** Each refusal is a known-bad refused
// BY NAME beside a known-good, one field away, that goes through — so "the rule
// fired" cannot be confused with "the verb refuses everything". The
// confidentiality gate is probed at the READ in both directions: withheld
// before the acceptance, shown after it, and never withheld on a
// non-confidential RFQ.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import {
  rfqClarificationStore,
  rfqIntentStore,
  resetRfqEngagementStores,
} from './stores/rfqEngagementStores';
import { resetRfxStores } from './stores/rfxStores';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { sdcClock } from '../../sdc';
import { currentQuotesFor, rfxNow } from './rfxReadModel';
import { comparisonRows } from '../../sourcing/rfqComparison';
import { NO_PERSON } from '../../../context/noPerson';
import { deriveQuoteHeader, type QuotationItemQuote } from '../../sourcing/rfqModel';

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
const sup013 = supplier('sup-013');
const sup015 = supplier('sup-015');

beforeEach(() => {
  rfqStore.reset();
  quotationStore.reset();
  resetRfxStores();
  resetRfqEngagementStores();
  sdcClock.reset();
});

const DAY_MS = 86_400_000;
const dayFromNow = (offset: number) => new Date(Date.parse(rfxNow()) + offset * DAY_MS).toISOString().slice(0, 10);

const intent = (scope: QueryScope, transitionId: string, payload: Record<string, unknown>, entityId?: string) =>
  svc.dispatch(scope, { transitionId, entity: 'rfqIntent', payload, ...(entityId ? { entityId } : {}) });

// ── The Oslo quote sup-007 is invited to give ───────────────────────────────

const OSLO_BREAKS = [3_000, 5_000, 7_000, 10_000, 25_000, 50_000];
const prices = (base: number) => OSLO_BREAKS.map((tierQty, i) => ({ tierQty, unitPrice: base - i * 20 }));
const osloItem = (itemLineNo: number, overrides: Partial<QuotationItemQuote> = {}): QuotationItemQuote => ({
  itemLineNo,
  specValues: [{ key: 'dieCutType', value: 'flexible' }],
  tierPrices: prices(400),
  moq: 3_000,
  leadTimeDays: 20,
  oneTimeCosts: [
    { name: 'Die-cut plate', amount: 1_000_000, costId: 'dieCutPlate' },
    { name: 'Printing plate', amount: 2_000_000, costId: 'printingPlate' },
  ],
  ...overrides,
});
const osloQuote = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  rfqId: 'rfq-021',
  supplierId: 'sup-007',
  unitPrice: 1,
  leadTimeDays: 20,
  currency: 'IDR',
  validUntil: dayFromNow(40),
  paymentTermsOffered: 'Net 45',
  itemQuotes: [osloItem(1), osloItem(2)],
  answers: [
    { questionId: 'q-ship-oct-w2', value: 'yes' },
    { questionId: 'q-sample-ready', value: dayFromNow(8) },
  ],
  sampleOffer: { canSample: true, readyDate: dayFromNow(8) },
  ...overrides,
});
const submit = (scope: QueryScope, payload: Record<string, unknown>) =>
  svc.dispatch(scope, { transitionId: 't_quotation_submit', entity: 'quotation', payload });

// ─────────────────────────────────────────────────────────────────────────────

describe('POPULATION — the seeded records the rules are probed against', () => {
  it('Oslo carries a decline with its reason and a published clarification; sup-007 has said nothing', () => {
    const declined = rfqIntentStore.all().filter((r) => r.rfqId === 'rfq-021' && r.intent === 'decline');
    expect(declined.map((r) => [r.supplierId, r.intent === 'decline' ? r.reason : null])).toEqual([
      ['sup-008', 'leadTimeTooShort'],
    ]);
    expect(rfqClarificationStore.all().filter((c) => c.visibility === 'published').map((c) => c.id)).toEqual(['rc-0001']);
    expect(rfqIntentStore.all().some((r) => r.supplierId === 'sup-007')).toBe(false);
    expect(rfqStore.get('rfq-023')?.confidential).toBe(true);
    expect(rfqStore.get('rfq-021')?.confidential).toBe(false);
  });
});

describe('t_rfqintent_* — "I will respond" or a reasoned decline', () => {
  it('respond goes through and the buyer reads it', async () => {
    const res = await intent(sup007, 't_rfqintent_respond', { rfqId: 'rfq-021', supplierId: 'sup-007' });
    expect(res.status).toBe('done');
    const row = (await reads.getRfqEngagement(buyer)).items.find((e) => e.rfqId === 'rfq-021' && e.supplierId === 'sup-007');
    expect(row?.intent?.intent).toBe('respond');
  });

  it('a second intent is refused by name (INTENT_ALREADY_STATED)', async () => {
    await intent(sup007, 't_rfqintent_respond', { rfqId: 'rfq-021', supplierId: 'sup-007' });
    const again = await intent(sup007, 't_rfqintent_decline', {
      rfqId: 'rfq-021', supplierId: 'sup-007', reason: 'noCapacity', text: 'Changed our mind',
    });
    expect(again.status).toBe('failed');
    expect(again.reason).toMatch(/INTENT_ALREADY_STATED/);
  });

  it('a decline needs a listed reason AND words — both refused by name, the sound one passes', async () => {
    const unknown = await intent(sup007, 't_rfqintent_decline', {
      rfqId: 'rfq-021', supplierId: 'sup-007', reason: 'tooBusy', text: 'Line is full',
    });
    expect(unknown.reason).toMatch(/DECLINE_REASON_UNKNOWN/);
    const blank = await intent(sup007, 't_rfqintent_decline', {
      rfqId: 'rfq-021', supplierId: 'sup-007', reason: 'noCapacity', text: '   ',
    });
    // Spaces satisfy `requiredFields`; the policy is what refuses them.
    expect(blank.reason).toMatch(/DECLINE_TEXT_MISSING/);
    const good = await intent(sup007, 't_rfqintent_decline', {
      rfqId: 'rfq-021', supplierId: 'sup-007', reason: 'noCapacity', text: 'Line is full until November',
    });
    expect(good.status).toBe('done');
    const mine = (await reads.getRfqEngagement(sup007)).items;
    expect(mine.map((e) => e.intent)).toEqual([
      expect.objectContaining({ intent: 'decline', reason: 'noCapacity', text: 'Line is full until November' }),
    ]);
  });

  it('an uninvited supplier is refused at scope, an invited one is not', async () => {
    await expect(
      intent(sup015, 't_rfqintent_respond', { rfqId: 'rfq-023', supplierId: 'sup-015' }),
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    const ok = await intent(sup013, 't_rfqintent_respond', { rfqId: 'rfq-023', supplierId: 'sup-013' });
    expect(ok.status).toBe('done');
  });

  it('withdraw turns "respond" into a decline — refused once a live quote stands', async () => {
    const r = await intent(sup015, 't_rfqintent_withdraw', { reason: 'noCapacity', text: 'x' }, 'ri-0001');
    // sup-015 has qt-021a live on Oslo.
    expect(r.reason).toMatch(/QUOTE_ALREADY_SUBMITTED/);
    const mine = await intent(sup007, 't_rfqintent_respond', { rfqId: 'rfq-021', supplierId: 'sup-007' });
    const w = await intent(sup007, 't_rfqintent_withdraw', { reason: 'specUnclear', text: 'The ink standard is unclear' }, mine.entityId);
    expect(w.status).toBe('done');
    expect(rfqIntentStore.get(mine.entityId!)).toMatchObject({ intent: 'decline', reason: 'specUnclear' });
  });

  it('a supplier that declined cannot quote (INTENT_DECLINED)', async () => {
    await intent(sup007, 't_rfqintent_decline', {
      rfqId: 'rfq-021', supplierId: 'sup-007', reason: 'noCapacity', text: 'Line is full',
    });
    const res = await submit(sup007, osloQuote());
    expect(res.reason).toMatch(/INTENT_DECLINED/);
  });
});

describe('the confidentiality gate — probed both ways, at the READ', () => {
  const redwoodFor = async (scope: QueryScope) =>
    (await reads.getRFQs(scope)).items.find((r) => r.id === 'rfq-023')!;

  it('before acceptance the spec values, notes and attachments are withheld; after, they are shown', async () => {
    const before = await redwoodFor(sup007);
    expect(before.items?.[0]?.specFields.find((f) => f.key === 'material')?.value).toBeUndefined();
    // The shape stays readable: which fields exist, who fills them.
    expect(before.items?.[0]?.specFields.map((f) => f.key)).toContain('material');

    const res = await svc.dispatch(sup007, {
      transitionId: 't_rfqconfidentiality_accept',
      entity: 'rfqConfidentiality',
      payload: { rfqId: 'rfq-023', supplierId: 'sup-007' },
    });
    expect(res.status).toBe('done');
    const after = await redwoodFor(sup007);
    expect(after.items?.[0]?.specFields.find((f) => f.key === 'material')?.value).toBe('ABS');
    const row = (await reads.getRfqEngagement(sup007)).items.find((e) => e.rfqId === 'rfq-023');
    expect(row?.confidentialityAcceptedAt).toBe(rfxNow());
  });

  it('a supplier that accepted reads the values; the buyer always does; a non-confidential RFQ is never masked', async () => {
    expect((await redwoodFor(sup013)).items?.[0]?.specFields.find((f) => f.key === 'material')?.value).toBe('ABS');
    expect((await redwoodFor(buyer)).items?.[0]?.specFields.find((f) => f.key === 'material')?.value).toBe('ABS');
    const oslo = (await reads.getRFQs(sup007)).items.find((r) => r.id === 'rfq-021')!;
    expect(oslo.items?.[0]?.specFields.find((f) => f.key === 'material')?.value).toBe('PP white gloss 60 mic');
    expect(oslo.items?.[0]?.note).toMatch(/Amplify/);
  });

  it('accepting twice, or on a non-confidential RFQ, is refused by name', async () => {
    const twice = await svc.dispatch(sup013, {
      transitionId: 't_rfqconfidentiality_accept',
      entity: 'rfqConfidentiality',
      payload: { rfqId: 'rfq-023', supplierId: 'sup-013' },
    });
    expect(twice.reason).toMatch(/ALREADY_ACCEPTED/);
    const open = await svc.dispatch(sup007, {
      transitionId: 't_rfqconfidentiality_accept',
      entity: 'rfqConfidentiality',
      payload: { rfqId: 'rfq-021', supplierId: 'sup-007' },
    });
    expect(open.reason).toMatch(/NOT_CONFIDENTIAL/);
  });

  it('a confidential RFQ is not quoted before its terms are accepted (CONFIDENTIALITY_NOT_ACCEPTED)', async () => {
    const res = await submit(sup007, {
      rfqId: 'rfq-023', supplierId: 'sup-007', unitPrice: 1, leadTimeDays: 10, currency: 'IDR', validUntil: dayFromNow(30),
    });
    expect(res.reason).toMatch(/CONFIDENTIALITY_NOT_ACCEPTED/);
  });
});

describe('quotation_tiered_well_formed — the grid, refused by name and accepted whole', () => {
  it('KNOWN-GOOD: the full Oslo quote goes through and is stored whole, header derived', async () => {
    const payload = osloQuote({
      alternatives: [{ itemLineNo: 2, description: 'Paper back label', tierPrices: prices(300) }],
      attachments: [{ id: 'att-1', name: 'quote.pdf', size: 1200, type: 'application/pdf', addedAt: rfxNow() }],
    });
    const res = await submit(sup007, payload);
    expect(res.status).toBe('done');
    const stored = quotationStore.get(res.entityId!)!;
    expect(stored.itemQuotes).toEqual(payload.itemQuotes);
    expect(stored.alternatives).toEqual(payload.alternatives);
    expect(stored.answers).toEqual(payload.answers);
    expect(stored.attachments?.map((a) => a.name)).toEqual(['quote.pdf']);
    expect(stored.paymentTermsOffered).toBe('Net 45');
    // The header is DERIVED from the grid, never the payload's placeholder 1.
    const header = deriveQuoteHeader(rfqStore.get('rfq-021')!, payload.itemQuotes as QuotationItemQuote[])!;
    expect(stored.unitPrice).toBe(header.unitPrice);
    expect(stored.totalPrice).toBe(header.totalPrice);
    expect(stored.unitPrice).not.toBe(1);
  });

  it('the sample offer is SAVED — the field that used to be dropped', async () => {
    const res = await submit(sup007, osloQuote());
    expect(quotationStore.get(res.entityId!)?.sampleOffer).toEqual({ canSample: true, readyDate: dayFromNow(8) });
    // …and an Oslo quote without one is refused, because Oslo asks for samples.
    const missing = await submit(sup007, osloQuote({ sampleOffer: undefined }));
    expect(missing.reason).toMatch(/SAMPLE_OFFER_MISSING/);
  });

  it('a missing price at one break is refused (TIER_PRICE_MISSING)', async () => {
    const res = await submit(
      sup007,
      osloQuote({ itemQuotes: [osloItem(1, { tierPrices: prices(400).slice(0, 5) }), osloItem(2)] }),
    );
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/TIER_PRICE_MISSING: item 1 needs a price at 50000/);
  });

  it('a missing required supplier field is refused (SPEC_VALUE_MISSING); an optional one is not', async () => {
    const bad = await submit(sup007, osloQuote({ itemQuotes: [osloItem(1, { specValues: [] }), osloItem(2)] }));
    expect(bad.reason).toMatch(/SPEC_VALUE_MISSING: item 1 needs dieCutType/);
    const good = await submit(sup007, osloQuote({
      itemQuotes: [osloItem(1, { specValues: [{ key: 'dieCutType', value: 'flatbed' }] }), osloItem(2)],
    }));
    expect(good.status).toBe('done');
  });

  it('one-time costs: every requested cost answered, zero allowed, a blank name refused', async () => {
    const missing = await submit(sup007, osloQuote({
      itemQuotes: [osloItem(1, { oneTimeCosts: [{ name: 'Die-cut plate', amount: 1, costId: 'dieCutPlate' }] }), osloItem(2)],
    }));
    expect(missing.reason).toMatch(/ONE_TIME_COST_MISSING: item 1 needs an amount for printingPlate/);
    const unnamed = await submit(sup007, osloQuote({
      itemQuotes: [osloItem(1, { oneTimeCosts: [...osloItem(1).oneTimeCosts!, { name: ' ', amount: 5 }] }), osloItem(2)],
    }));
    expect(unnamed.reason).toMatch(/ONE_TIME_COST_INVALID/);
    const zeroAndExtra = await submit(sup007, osloQuote({
      itemQuotes: [
        osloItem(1, {
          oneTimeCosts: [
            { name: 'Die-cut plate', amount: 0, costId: 'dieCutPlate' },
            { name: 'Printing plate', amount: 2_000_000, costId: 'printingPlate' },
            { name: 'Colour proofing', amount: 250_000 },
          ],
        }),
        osloItem(2),
      ],
    }));
    expect(zeroAndExtra.status).toBe('done');
  });

  it('an alternative is refused where the buyer did not allow one, and on an incomplete one', async () => {
    const incomplete = await submit(sup007, osloQuote({ alternatives: [{ itemLineNo: 1, description: '', tierPrices: prices(300) }] }));
    expect(incomplete.reason).toMatch(/ALTERNATIVE_INCOMPLETE/);
    // Iron does not allow alternatives; sup-015 is invited to it.
    const ironItem = { itemLineNo: 1, tierPrices: [10_000, 15_000, 20_000, 25_000, 30_000].map((tierQty) => ({ tierQty, unitPrice: 900 })), leadTimeDays: 14, oneTimeCosts: [
      { name: 'Die-cut plate', amount: 1, costId: 'dieCutPlate' }, { name: 'Printing plate', amount: 1, costId: 'printingPlate' },
    ] };
    const iron = (extra: Record<string, unknown>) =>
      submit(sup015, { rfqId: 'rfq-022', supplierId: 'sup-015', unitPrice: 1, leadTimeDays: 14, currency: 'IDR', validUntil: dayFromNow(30), itemQuotes: [ironItem], ...extra });
    expect((await iron({ alternatives: [{ itemLineNo: 1, description: 'Kraft board', tierPrices: ironItem.tierPrices }] })).reason).toMatch(/ALTERNATIVES_NOT_ALLOWED/);
    expect((await iron({})).status).toBe('done');
  });

  it('answers are judged in their type, and a required one cannot be skipped', async () => {
    const wrong = await submit(sup007, osloQuote({
      answers: [{ questionId: 'q-ship-oct-w2', value: 'maybe' }, { questionId: 'q-sample-ready', value: dayFromNow(8) }],
    }));
    expect(wrong.reason).toMatch(/ANSWER_INVALID/);
    const skipped = await submit(sup007, osloQuote({ answers: [{ questionId: 'q-ship-oct-w2', value: 'no' }] }));
    expect(skipped.reason).toMatch(/ANSWER_MISSING: Sample ready date/);
  });

  it('a tiered RFQ is not quoted as one figure, and a legacy RFQ is not quoted per item', async () => {
    const flat = await submit(sup007, osloQuote({ itemQuotes: undefined }));
    expect(flat.reason).toMatch(/TIERED_QUOTE_REQUIRED/);
    // rfq-010 is a legacy RFQ sup-007 is invited to.
    const legacy = { rfqId: 'rfq-010', supplierId: 'sup-007', unitPrice: 15_000, leadTimeDays: 14, currency: 'IDR', validUntil: dayFromNow(30) };
    expect((await submit(sup007, { ...legacy, itemQuotes: [osloItem(1)] })).reason).toMatch(/NOT_TIERED/);
    // KNOWN-GOOD: the legacy single-price quote still passes, and now keeps its
    // sample offer and payment terms instead of dropping them.
    const ok = await submit(sup007, { ...legacy, paymentTermsOffered: 'Net 30', sampleOffer: { canSample: false } });
    expect(ok.status).toBe('done');
    expect(quotationStore.get(ok.entityId!)).toMatchObject({
      unitPrice: 15_000, paymentTermsOffered: 'Net 30', sampleOffer: { canSample: false },
    });
    expect(quotationStore.get(ok.entityId!)?.itemQuotes).toBeUndefined();
  });

  it('revising before the deadline keeps both versions', async () => {
    const first = await submit(sup007, osloQuote());
    const second = await submit(sup007, osloQuote({
      supersedesQuotationId: first.entityId,
      itemQuotes: [osloItem(1, { tierPrices: prices(380) }), osloItem(2)],
    }));
    expect(second.status).toBe('done');
    expect(quotationStore.get(first.entityId!)).toBeDefined();
    expect(quotationStore.get(second.entityId!)?.supersedesQuotationId).toBe(first.entityId);
    expect(quotationStore.get(second.entityId!)!.unitPrice).toBeLessThan(quotationStore.get(first.entityId!)!.unitPrice);
  });
});

describe('clarification Q&A — who reads what', () => {
  const clarFor = async (scope: QueryScope) => (await reads.getRfqClarifications(scope)).items.filter((c) => c.rfqId === 'rfq-021');

  it('a published answer reaches every invitee with the asker hidden; a private one only the asker', async () => {
    const seen007 = await clarFor(sup007);
    expect(seen007.map((c) => c.id)).toEqual(['rc-0001']);
    expect(seen007[0]).not.toHaveProperty('askedBy');
    expect(seen007[0]).not.toHaveProperty('askedByName');
    expect(seen007[0]?.mine).toBe(false);
    // sup-013 asked rc-0002 and reads its own private answer, with itself named.
    const seen013 = await clarFor(sup013);
    expect(seen013.map((c) => c.id)).toEqual(['rc-0001', 'rc-0002']);
    expect(seen013.find((c) => c.id === 'rc-0002')).toMatchObject({ mine: true, askedBy: 'sup-013' });
    // The buyer reads both, with the asker named.
    const seenBuyer = await clarFor(buyer);
    expect(seenBuyer.map((c) => [c.id, c.askedBy])).toEqual([
      ['rc-0001', 'sup-015'],
      ['rc-0002', 'sup-013'],
    ]);
  });

  it('ask → answer privately → only the asker reads it; answer published → everyone does, asker hidden', async () => {
    const asked = await svc.dispatch(sup007, {
      transitionId: 't_rfqclarification_ask', entity: 'rfqClarification',
      payload: { rfqId: 'rfq-021', supplierId: 'sup-007', question: 'Is the roll core 76 mm?' },
    });
    expect(asked.status).toBe('done');
    // Unanswered: the asker and the buyer see it, another invitee does not.
    expect((await clarFor(sup007)).some((c) => c.id === asked.entityId)).toBe(true);
    expect((await clarFor(sup013)).some((c) => c.id === asked.entityId)).toBe(false);

    const answered = await svc.dispatch(buyer, {
      transitionId: 't_rfqclarification_answer', entity: 'rfqClarification', entityId: asked.entityId!,
      payload: { answer: 'Yes, 76 mm cores.', visibility: 'published' },
    });
    expect(answered.status).toBe('done');
    const seen = (await clarFor(sup013)).find((c) => c.id === asked.entityId);
    expect(seen).toMatchObject({ answer: 'Yes, 76 mm cores.', visibility: 'published', mine: false });
    expect(seen).not.toHaveProperty('askedBy');
  });

  it('a blank question, a blank answer, an unknown visibility and a second answer are refused by name', async () => {
    const blank = await svc.dispatch(sup007, {
      transitionId: 't_rfqclarification_ask', entity: 'rfqClarification',
      payload: { rfqId: 'rfq-021', supplierId: 'sup-007', question: '  ' },
    });
    expect(blank.reason).toMatch(/QUESTION_EMPTY/);
    const asked = await svc.dispatch(sup007, {
      transitionId: 't_rfqclarification_ask', entity: 'rfqClarification',
      payload: { rfqId: 'rfq-021', supplierId: 'sup-007', question: 'Roll core size?' },
    });
    const answer = (payload: Record<string, unknown>) =>
      svc.dispatch(buyer, { transitionId: 't_rfqclarification_answer', entity: 'rfqClarification', entityId: asked.entityId!, payload });
    expect((await answer({ answer: ' ', visibility: 'private' })).reason).toMatch(/ANSWER_EMPTY/);
    expect((await answer({ answer: '76 mm', visibility: 'everyone' })).reason).toMatch(/VISIBILITY_UNKNOWN/);
    expect((await answer({ answer: '76 mm', visibility: 'private' })).status).toBe('done');
    // The second answer is illegal from `Answered` — the machine refuses it.
    expect((await answer({ answer: 'Again', visibility: 'private' })).status).toBe('failed');
  });

  it('a supplier cannot answer (role), and cannot ask on an RFQ it is not invited to (scope)', async () => {
    const byBuyerOnly = await svc.dispatch(sup013, {
      transitionId: 't_rfqclarification_answer', entity: 'rfqClarification', entityId: 'rc-0002',
      payload: { answer: 'self-answered', visibility: 'published' },
    }).catch((e: { code?: string }) => ({ status: 'failed', reason: e.code }));
    expect(byBuyerOnly.status).toBe('failed');
    await expect(
      svc.dispatch(sup015, {
        transitionId: 't_rfqclarification_ask', entity: 'rfqClarification',
        payload: { rfqId: 'rfq-023', supplierId: 'sup-015', question: 'Cavities?' },
      }),
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
  });
});

describe("the grid's quote is what B4's comparison and award read", () => {
  it('sup-007\'s grid quote lands in the per-item comparison with its costs and payment terms; the decliner is nowhere in it', async () => {
    const res = await submit(sup007, osloQuote({
      alternatives: [{ itemLineNo: 2, description: 'Paper back label', tierPrices: prices(300) }],
    }));
    expect(res.status).toBe('done');
    const oslo = rfqStore.get('rfq-021')!;
    const current = currentQuotesFor('rfq-021');
    const rows = comparisonRows(oslo, current, (id) => id).filter((r) => r.supplier === 'sup-007');
    // 2 items × 6 breaks, each carrying the item's one-time costs.
    expect(rows).toHaveLength(12);
    expect(rows.find((r) => r.item.startsWith('1 ') && r.breakQty === 3000)).toMatchObject({
      unitPrice: 400,
      oneTimeCosts: 3_000_000,
      leadTimeDays: 20,
    });
    const mine = current.find((q) => q.supplierId === 'sup-007')!;
    expect(mine.paymentTermsOffered).toBe('Net 45');
    expect(mine.alternatives?.[0]?.description).toBe('Paper back label');
    // sup-008 declined Oslo: it holds no current quote, so no comparison row
    // and no award line can name it (an award line must name a quote on the event).
    expect(current.some((q) => q.supplierId === 'sup-008')).toBe(false);
    // …and a supplier that has quoted cannot slip into "declined" afterwards.
    await intent(sup007, 't_rfqintent_respond', { rfqId: 'rfq-021', supplierId: 'sup-007' });
    const w = await intent(sup007, 't_rfqintent_withdraw', { reason: 'noCapacity', text: 'x' }, rfqIntentStore.all().find((r) => r.supplierId === 'sup-007')!.id);
    expect(w.reason).toMatch(/QUOTE_ALREADY_SUBMITTED/);
  });
});
