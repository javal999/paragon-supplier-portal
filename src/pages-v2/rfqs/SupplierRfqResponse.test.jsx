// ────────────────────────────────────────────────────────────────────────────
// The supplier's response to a tiered RFQ, at the SURFACE (RFx spec
// 2026-09-21): intent, the confidentiality gate, the quote grid, clarification
// Q&A — and the buyer's read-only view on the RFQ event page (moved off the
// side panel by RFx UX B-02, owner ruling 2026-10-19). The rules themselves
// are probed at the verb in `rfqEngagementCommand.test.js`; what these add is
// that the supplier is TOLD, and that the grid sends what the verb accepts.
// ────────────────────────────────────────────────────────────────────────────

import { Routes, Route } from 'react-router-dom';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import SupplierRFQs from '../SupplierRFQs';
import BuyerSourcingEvent from '../BuyerSourcingEvent';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import {
  rfqClarificationStore,
  rfqIntentStore,
  resetRfqEngagementStores
} from '@services/data/mock/stores/rfqEngagementStores';
import { rfxNow } from '@services/data/mock/rfxReadModel';
import { sdcClock } from '@services/sdc';

beforeEach(() => {
  rfqStore.reset();
  quotationStore.reset();
  resetRfqEngagementStores();
  sdcClock.reset();
});

const DAY_MS = 86_400_000;
/** @param {number} offset */
const dayFromNow = (offset) =>
  new Date(Date.parse(rfxNow()) + offset * DAY_MS).toISOString().slice(0, 10);
const BREAKS = [3000, 5000, 7000, 10000, 25000, 50000];

/** @param {string} rfqId */
const card = async (rfqId) => within(await screen.findByTestId(`rfq-card-${rfqId}`));

/** Say "I will respond" on Oslo and open its quote grid. */
const openOsloGrid = async () => {
  renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
  const oslo = await card('rfq-021');
  // The grid waits for intent: no Submit on a tiered RFQ yet.
  expect(oslo.queryByRole('button', { name: 'Submit quote' })).toBeNull();
  expect(oslo.getByTestId('quote-waits-rfq-021')).toHaveTextContent(
    /Say if you will respond first/
  );
  fireEvent.click(oslo.getByTestId('intent-respond-rfq-021'));
  const submit = await oslo.findByRole('button', { name: 'Submit quote' });
  fireEvent.click(submit);
  return screen.findByTestId('tiered-quote-form');
};

/**
 * @param {string} testId
 * @param {string} value
 */
const type = (testId, value) => fireEvent.change(screen.getByTestId(testId), { target: { value } });

/**
 * Fill the whole Oslo grid, leaving out the one break named, if any.
 * @param {{ item: number; qty: number }} [skip]
 */
const fillOslo = (skip) => {
  for (const item of [1, 2]) {
    for (const [i, qty] of BREAKS.entries()) {
      if (skip && skip.item === item && skip.qty === qty) continue;
      type(`grid-item-${item}-price-${qty}`, String(400 - i * 20));
    }
    type(`grid-item-${item}-lead`, '21');
    type(`grid-item-${item}-spec-dieCutType`, 'flexible');
    type(`grid-item-${item}-cost-dieCutPlate`, '1000000');
    type(`grid-item-${item}-cost-printingPlate`, '0');
  }
  fireEvent.change(
    screen.getByLabelText(/Can goods ship in the 2nd week of October\?/, { selector: 'select' }),
    { target: { value: 'yes' } }
  );
  fireEvent.change(
    screen.getByLabelText(/Sample ready date/, { selector: '#rfq-q-q-sample-ready' }),
    {
      target: { value: dayFromNow(7) }
    }
  );
  // S-06 — Oslo's buyer question already asks the sample ready date, so the
  // sample offer asks only Yes or No and takes the date from that answer.
  fireEvent.click(within(screen.getByTestId('sample-offer')).getByRole('button', { name: 'Yes' }));
  expect(screen.getByTestId('sample-offer-date-copied')).toHaveTextContent('Sample ready date');
  fireEvent.change(screen.getByLabelText('Quote valid until'), {
    target: { value: dayFromNow(45) }
  });
};

// S-02 (RFx UX 2026-10) — a gap is said where it sits and in the banner, all
// at once, and Submit is off while it stands; nothing is sent to be refused.
describe('the quote grid — refused out loud, accepted whole', () => {
  it('a missing price at one break is said on the field and in the banner, and mints nothing', async () => {
    await openOsloGrid();
    fillOslo({ item: 1, qty: 50000 });
    const before = quotationStore.forRfq('rfq-021').length;
    expect(screen.getByTestId('grid-item-1-price-50000-note')).toHaveTextContent('Still missing');
    expect(screen.getByTestId('quote-problems')).toHaveTextContent(/Item 1: price at 50/);
    expect(screen.getByTestId('quote-send-reason')).toHaveTextContent(/1 answer is given or fixed/);
    const submit = screen.getByRole('button', { name: 'Submit quotation' });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(quotationStore.forRfq('rfq-021')).toHaveLength(before);
  });

  it('a missing required supplier spec field is named on its own field', async () => {
    await openOsloGrid();
    fillOslo();
    type('grid-item-2-spec-dieCutType', '');
    expect(screen.getByTestId('grid-item-2-spec-dieCutType-note')).toHaveTextContent(
      'Still missing'
    );
    expect(screen.getByRole('button', { name: 'Submit quotation' })).toBeDisabled();
  });

  it('a requested one-time cost left blank is refused; zero is an answer', async () => {
    await openOsloGrid();
    fillOslo();
    // Zero is an answer: the printing plate at 0 raises nothing.
    expect(screen.queryByTestId('grid-item-1-cost-printingPlate-note')).toBeNull();
    type('grid-item-1-cost-printingPlate', '');
    expect(screen.getByTestId('grid-item-1-cost-printingPlate-note')).toHaveTextContent(
      'Still missing'
    );
    expect(screen.getByRole('button', { name: 'Submit quotation' })).toBeDisabled();
  });

  it('KNOWN-GOOD: the full grid is sent and stored, with the sample offer and an added cost', async () => {
    await openOsloGrid();
    fillOslo();
    fireEvent.click(screen.getByTestId('grid-item-1-add-cost'));
    fireEvent.change(screen.getByLabelText('Other cost 1, name'), {
      target: { value: 'Colour proofing' }
    });
    fireEvent.change(screen.getByLabelText('Other cost 1, amount'), {
      target: { value: '250000' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit quotation' }));
    await waitFor(() =>
      expect(quotationStore.forRfq('rfq-021').some((q) => q.supplierId === 'sup-007')).toBe(true)
    );
    const mine = /** @type {import('@data/mockQuotations').Quotation} */ (
      quotationStore.forRfq('rfq-021').find((q) => q.supplierId === 'sup-007')
    );
    expect(mine.itemQuotes?.[0]?.tierPrices).toHaveLength(6);
    expect(mine.itemQuotes?.[0]?.oneTimeCosts).toEqual([
      { name: 'Die-cut plate', amount: 1_000_000, costId: 'dieCutPlate' },
      { name: 'Printing plate or cylinder', amount: 0, costId: 'printingPlate' },
      { name: 'Colour proofing', amount: 250_000 }
    ]);
    expect(mine.sampleOffer).toEqual({ canSample: true, readyDate: dayFromNow(7) });
    expect(mine.paymentTermsOffered).toBe('Net 60');
    expect(mine.leadTimeDays).toBe(21);
  });
});

describe('intent and the confidentiality gate, on the card', () => {
  it('decline needs a reason and words, and the card then says so instead of offering a quote', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    const legacy = await card('rfq-010');
    fireEvent.click(legacy.getByTestId('intent-decline-rfq-010'));
    const confirm = legacy.getByTestId('decline-form-rfq-010-confirm');
    expect(confirm).toBeDisabled();
    fireEvent.change(legacy.getByLabelText('Reason'), { target: { value: 'noCapacity' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(legacy.getByLabelText('In your own words'), {
      target: { value: 'Line full until December' }
    });
    fireEvent.click(confirm);
    expect(await legacy.findByTestId('intent-declined-rfq-010')).toHaveTextContent(
      'No capacity — Line full until December'
    );
    expect(legacy.queryByRole('button', { name: 'Submit quote' })).toBeNull();
    expect(
      rfqIntentStore.all().find((r) => r.rfqId === 'rfq-010' && r.supplierId === 'sup-007')?.intent
    ).toBe('decline');
  });

  // RFx UX S-07 — the legacy card follows the same 2-step entry as a tiered
  // one (it used to quote with no intent); its quote is still single-price.
  it('a LEGACY RFQ opens its single-price quote after step 1, like every card, and no grid', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    const legacy = await card('rfq-010');
    expect(legacy.queryByRole('button', { name: 'Submit quote' })).toBeNull();
    expect(legacy.getByTestId('quote-waits-rfq-010')).toHaveTextContent(
      /Say if you will respond first/
    );
    fireEvent.click(legacy.getByTestId('intent-respond-rfq-010'));
    fireEvent.click(await legacy.findByRole('button', { name: 'Submit quote' }));
    expect(await screen.findByLabelText('Unit price')).toBeInTheDocument();
    expect(screen.queryByTestId('tiered-quote-form')).toBeNull();
  });

  it('Redwood 2.0 withholds its spec until the terms are accepted — then the grid opens', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    const redwood = await card('rfq-023');
    expect(redwood.getByTestId('terms-gate-rfq-023')).toHaveTextContent(/hidden until you accept/);
    fireEvent.click(redwood.getByTestId('intent-respond-rfq-023'));
    expect(await redwood.findByTestId('quote-waits-rfq-023')).toHaveTextContent(
      /Accept the confidentiality terms/
    );
    fireEvent.click(redwood.getByTestId('terms-accept-rfq-023'));
    expect(await redwood.findByTestId('terms-accepted-rfq-023')).toBeInTheDocument();
    fireEvent.click(await redwood.findByRole('button', { name: 'Submit quote' }));
    const form = await screen.findByTestId('tiered-quote-form');
    // The buyer's values are there now: the READ stopped masking them.
    expect(within(form).getByTestId('grid-item-1')).toHaveTextContent('ABS');
  });
});

describe('clarification Q&A on the card', () => {
  it('the published answer is shown without its asker; the private one is not shown at all', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    const oslo = await card('rfq-021');
    const published = await oslo.findByTestId('clarification-rc-0001');
    expect(published).toHaveTextContent('Asked by an invited supplier');
    expect(published).toHaveTextContent(/One die-cut plate serves all 8 variants/);
    expect(published).not.toHaveTextContent(/Sample Supplier|sup-015/);
    expect(oslo.queryByTestId('clarification-rc-0002')).toBeNull();
  });

  it('Ask question sends a real question, which waits for an answer', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    const oslo = await card('rfq-021');
    fireEvent.click(oslo.getByRole('button', { name: 'Ask question' }));
    fireEvent.change(oslo.getByTestId('clarification-input-rfq-021'), {
      target: { value: 'Is the roll core 76 mm?' }
    });
    fireEvent.click(oslo.getByTestId('clarification-send-rfq-021'));
    await waitFor(() =>
      expect(
        rfqClarificationStore
          .all()
          .some((c) => c.askedBy === 'sup-007' && c.question === 'Is the roll core 76 mm?')
      ).toBe(true)
    );
    expect(await oslo.findByText('Waiting for an answer')).toBeInTheDocument();
  });
});

describe("a seat without the atoms reads the wait, in each control's own slot", () => {
  it('a fulfilment-only seat: intent and the question box name Commercial; the box still opens', async () => {
    renderWithProviders(<SupplierRFQs />, {
      identity: { ...SUPPLIER, businessRoles: ['supplier', 'fulfilment'] }
    });
    const oslo = await card('rfq-021');
    expect(oslo.getByTestId('handoff-rfqintent-declare')).toBeInTheDocument();
    expect(oslo.queryByTestId('intent-respond-rfq-021')).toBeNull();
    fireEvent.click(oslo.getByRole('button', { name: 'Ask question' }));
    expect(oslo.getByTestId('handoff-rfqclarification-ask')).toBeInTheDocument();
    expect(oslo.queryByTestId('clarification-send-rfq-021')).toBeNull();
  });
});

describe("the buyer's event page — read-only intent, and the answer", () => {
  it('shows the decline with its reason and words, and answers a question published with the asker hidden', async () => {
    rfqClarificationStore.add({
      id: 'rc-test',
      rfqId: 'rfq-021',
      askedBy: 'sup-007',
      askedAt: rfxNow(),
      question: 'Is the roll core 76 mm?',
      visibility: 'private'
    });
    // RFx UX B-02 — driven on the event page, where the section now lives.
    renderWithProviders(
      <Routes>
        <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
      </Routes>,
      { identity: BUYER, route: '/buyer/rfq/rfq-021' }
    );
    await waitFor(() =>
      expect(screen.getByTestId('engagement-row-sup-008')).toHaveTextContent(
        /Declined\s*Lead time too short — Our flexo line is booked until the end of October/
      )
    );
    expect(screen.getByTestId('engagement-row-sup-007')).toHaveTextContent('No answer yet');
    // The buyer reads the asker by name; the supplier view never does.
    expect(await screen.findByTestId('buyer-clarification-rc-test')).toHaveTextContent(
      'Asked by PT Sample Packaging Indonesia'
    );
    const form = within(screen.getByTestId('answer-form-rc-test'));
    fireEvent.change(form.getByLabelText('Your answer'), { target: { value: 'Yes, 76 mm.' } });
    fireEvent.click(form.getByLabelText('Share with all invitees (asker not named)'));
    fireEvent.click(form.getByTestId('answer-send-rc-test'));
    await waitFor(() =>
      expect(rfqClarificationStore.get('rc-test')).toMatchObject({
        answer: 'Yes, 76 mm.',
        visibility: 'published'
      })
    );
  });
});
