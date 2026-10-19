import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
/** @import { RFQ, Quotation } from '@services/data/types' */
/** @import { RfpAwardView } from '@services/sourcing/views' */
/** @import { RfiQuestion } from '@services/sourcing/types' */
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { resetRfxStores } from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { resetRfqEngagementStores } from '@services/data/mock/stores/rfqEngagementStores';
import { sdcClock } from '@services/sdc';
import { formatDate, formatMoney } from '@lib/format';
import i18n from '@lib/i18n';
import { useToast } from '@hooks/useToast';
import { hubEn, hubId } from '@lib/i18n/hub';
import SupplierRFQs from '../SupplierRFQs';
import SupplierRfi from '../SupplierRfi';
import SupplierRfp from '../SupplierRfp';
import { QuestionField } from '../rfx/RfxQuestionForm';
import { rfpAwardedTo, supplierRowAction } from '../rfx/supplierRowState';
import { stepStates } from './components/RfqStepStrip';
import { specialRequirementsOf, tieredQuoteSummary, toOpenRfq } from './utils';

// ─────────────────────────────────────────────────────────────────────────────
// RFx UX lane 2C — supplier polish.
//   S-07  one 2-step entry strip on every RFQ card, terms as step 0
//   S-08  formatDate on the RFQ card, panel and toast, with days left
//   S-09  a tiered quote read back per item, not as a derived average
//   S-10  RFI and RFP rows: days left, button by state, "Awarded" pill
//   S-11  RFI form: comment folded, no half-bound text, PTI file wording
//   S-12  no placeholder special-requirements block on a legacy card
//   X-02  the supplier To do subtitle says lanes, by deadline
// Fixtures: rfq-010 legacy, open to sup-007; rfq-023 confidential and tiered;
// qt-021a sup-015's tiered Oslo quote (MOQ 3,000 per item); rfi-001 answered
// by sup-007 (window open), rfi-002 not started; rfi-002's oslo-defect has a
// maximum only and oslo-colours both bounds.
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  resetRfqEngagementStores();
  sdcClock.reset();
});

/**
 * @param {string} supplierId
 * @param {readonly string[]} [roles]
 * @returns {CurrentIdentity}
 */
const seat = (supplierId, roles = SEEDED_SEAT_ROLES.supplier) => ({
  personaType: 'supplier',
  supplierId,
  supplierName: supplierId,
  businessRoles: roles,
  actor: NO_PERSON
});

/** The toasts' descriptions, rendered so a spec can read them. */
const ToastProbe = () => {
  const { toasts } = useToast();
  return (
    <ul>
      {toasts.map((x) => (
        <li key={x.id}>{x.description}</li>
      ))}
    </ul>
  );
};

/** @param {string} id */
const rfqOf = (id) => /** @type {RFQ} */ (rfqStore.get(id));

/** @param {string} rfqId */
const card = async (rfqId) => within(await screen.findByTestId(`rfq-card-${rfqId}`));

describe('S-07 — one entry strip on every RFQ card', () => {
  it('the step states mark the first step not done as current', () => {
    expect(
      stepStates([
        { id: 'terms', label: 'a', done: true },
        { id: 'respond', label: 'b', done: false },
        { id: 'quote', label: 'c', done: false }
      ]).map((s) => s.state)
    ).toEqual(['done', 'current', 'todo']);
  });

  it('a legacy card reads "Step 1: Say if you will respond · Step 2: Quote", with no step 0', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    const legacy = await card('rfq-010');
    const strip = legacy.getByTestId('rfq-steps-rfq-010');
    expect(strip).toHaveTextContent('Step 1: Say if you will respond');
    expect(strip).toHaveTextContent('Step 2: Quote');
    expect(legacy.queryByTestId('rfq-steps-rfq-010-terms')).toBeNull();
    expect(legacy.getByTestId('rfq-steps-rfq-010-respond')).toHaveAttribute(
      'data-state',
      'current'
    );
    // Refusal half: no quote before step 1 …
    expect(legacy.queryByRole('button', { name: 'Submit quote' })).toBeNull();
    // … and the pass half: step 1 done opens it, and the strip moves on.
    fireEvent.click(legacy.getByTestId('intent-respond-rfq-010'));
    expect(await legacy.findByRole('button', { name: 'Submit quote' })).toBeInTheDocument();
    expect(legacy.getByTestId('rfq-steps-rfq-010-respond')).toHaveAttribute('data-state', 'done');
    expect(legacy.getByTestId('rfq-steps-rfq-010-quote')).toHaveAttribute('data-state', 'current');
  });

  it('a confidential card puts the terms first, as step 0', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    const redwood = await card('rfq-023');
    expect(redwood.getByTestId('rfq-steps-rfq-023-terms')).toHaveTextContent(
      'Step 0: Accept the confidentiality terms'
    );
    expect(redwood.getByTestId('rfq-steps-rfq-023-terms')).toHaveAttribute('data-state', 'current');
  });

  it('a declined card shows no strip', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    const legacy = await card('rfq-010');
    fireEvent.click(legacy.getByTestId('intent-decline-rfq-010'));
    fireEvent.change(legacy.getByLabelText('Reason'), { target: { value: 'noCapacity' } });
    fireEvent.change(legacy.getByLabelText('In your own words'), { target: { value: 'Full' } });
    fireEvent.click(legacy.getByTestId('decline-form-rfq-010-confirm'));
    await legacy.findByTestId('intent-declined-rfq-010');
    expect(legacy.queryByTestId('rfq-steps-rfq-010')).toBeNull();
  });
});

describe('S-08 — one date format on the supplier RFQ card, panel and toast', () => {
  it('Award by, Received and Deadline read formatDate, never ISO', async () => {
    const rfq = rfqOf('rfq-010');
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    const legacy = await card('rfq-010');
    const text = (await screen.findByTestId('rfq-card-rfq-010')).textContent ?? '';
    expect(text).toContain(`Award by: ${formatDate(rfq.awardDeadline)}`);
    expect(text).toContain(`Received ${formatDate(rfq.createdAt)}`);
    expect(text).toContain(`Deadline: ${formatDate(rfq.responseDeadline)}`);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    // The panel names the deadline the same way, with the days left.
    fireEvent.click(legacy.getByTestId('intent-respond-rfq-010'));
    fireEvent.click(await legacy.findByRole('button', { name: 'Submit quote' }));
    expect(await screen.findByTestId('quote-panel-days-left')).toHaveTextContent(
      /days? left|due today/
    );
  });

  it('the sent toast says "will review by" with a formatted date', async () => {
    const rfq = rfqOf('rfq-010');
    renderWithProviders(
      <>
        <SupplierRFQs />
        <ToastProbe />
      </>,
      { identity: SUPPLIER }
    );
    const legacy = await card('rfq-010');
    fireEvent.click(legacy.getByTestId('intent-respond-rfq-010'));
    fireEvent.click(await legacy.findByRole('button', { name: 'Submit quote' }));
    fireEvent.change(screen.getByLabelText('Unit price'), { target: { value: '15000' } });
    fireEvent.change(screen.getByLabelText('Lead time'), { target: { value: '14' } });
    fireEvent.change(screen.getByLabelText('Quote valid until'), {
      target: { value: '2026-06-30' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit quotation' }));
    await waitFor(() => expect(quotationStore.forRfq('rfq-010')).toHaveLength(1));
    expect(
      await screen.findByText(
        `Paragon procurement team will review by ${formatDate(rfq.responseDeadline)}.`
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/will review by \d{4}-/)).toBeNull();
  });

  it('toOpenRfq carries the formatted dates and the days left', () => {
    const rfq = rfqOf('rfq-010');
    const open = toOpenRfq(rfq, '2026-01-01T00:00:00Z', i18n.t);
    expect(open.awardBy).toBe(formatDate(rfq.awardDeadline));
    expect(open.deadlineText).toBe(formatDate(rfq.responseDeadline));
    expect(open.receivedDate).toBe(formatDate(rfq.createdAt));
    expect(open.daysLeft).toMatch(/days left/);
  });
});

describe('S-09 — a tiered quote reads back per item', () => {
  it('items priced, break-1 price per item and per-item MOQ; no derived average', () => {
    const rfq = rfqOf('rfq-021');
    const q = /** @type {Quotation} */ (quotationStore.all().find((x) => x.id === 'qt-021a'));
    const summary = tieredQuoteSummary(rfq, q, i18n.t);
    expect(summary?.priced).toBe(2);
    expect(summary?.total).toBe(2);
    expect(summary?.lines[0]?.break1Price).toBe(formatMoney(420, 'IDR'));
    expect(summary?.lines[0]?.moq).toMatch(/^3[.,]000 /);
  });

  it('KNOWN-BAD twin — a legacy single-price quote has no tiered summary', () => {
    const rfq = rfqOf('rfq-010');
    const q = /** @type {Quotation} */ (
      /** @type {unknown} */ ({ id: 'x', rfqId: 'rfq-010', unitPrice: 1, currency: 'IDR' })
    );
    expect(tieredQuoteSummary(rfq, q, i18n.t)).toBeNull();
  });

  it('My Quotes shows the items, not "Unit price" or "Same as RFQ qty", on a tiered quote', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: seat('sup-015') });
    fireEvent.click(await screen.findByRole('tab', { name: /My Quotes/i }));
    const items = await screen.findByTestId('quote-items-qt-021a');
    expect(within(items).getByTestId('quote-items-qt-021a-priced')).toHaveTextContent(
      '2 of 2 items priced'
    );
    expect(within(items).getByTestId('quote-items-qt-021a-item-1')).toHaveTextContent(
      `Break 1: ${formatMoney(420, 'IDR')}`
    );
    expect(within(items).getByTestId('quote-items-qt-021a-item-1')).toHaveTextContent(
      /MOQ: 3[.,]000/
    );
    const card21 = /** @type {HTMLElement} */ (items.parentElement?.parentElement);
    expect(within(card21).queryByText('Unit price')).toBeNull();
    expect(within(card21).queryByText('Same as RFQ qty')).toBeNull();
  });
});

describe('S-10 — supplier RFI and RFP rows', () => {
  it('the button by state: Answer, Revise, View', () => {
    const base = { submitted: false, windowOpen: true, closed: false, held: true };
    expect(supplierRowAction(base)).toBe('answer');
    expect(supplierRowAction({ ...base, submitted: true })).toBe('revise');
    expect(supplierRowAction({ ...base, submitted: true, windowOpen: false })).toBe('view');
    expect(supplierRowAction({ ...base, closed: true })).toBe('view');
    expect(supplierRowAction({ ...base, held: false })).toBe('view');
  });

  it('"Awarded" only for an award in force that names this supplier', () => {
    const award = (/** @type {string} */ status, /** @type {string} */ supplierId) =>
      /** @type {RfpAwardView} */ (/** @type {unknown} */ ({ status, lines: [{ supplierId }] }));
    expect(rfpAwardedTo([award('Active', 'sup-007')], 'sup-007')).toBe(true);
    expect(rfpAwardedTo([award('Cancelled', 'sup-007')], 'sup-007')).toBe(false);
    expect(rfpAwardedTo([award('Active', 'sup-015')], 'sup-007')).toBe(false);
  });

  it('RFI rows: "N days left" on an open row, Answer on a new one, Revise on a sent one', async () => {
    renderWithProviders(<SupplierRfi />, { identity: SUPPLIER });
    expect(await screen.findByTestId('supplier-rfi-open-rfi-002')).toHaveTextContent('Answer');
    expect(screen.getByTestId('supplier-rfi-days-left-rfi-002')).toHaveTextContent(/\d+ days left/);
    expect(screen.getByTestId('supplier-rfi-open-rfi-001')).toHaveTextContent('Revise');
    // A sent row is not counting down any more.
    expect(screen.queryByTestId('supplier-rfi-days-left-rfi-001')).toBeNull();
  });

  it('KNOWN-BAD twin — a seat that cannot answer reads View, never Answer', async () => {
    renderWithProviders(<SupplierRfi />, {
      identity: seat('sup-007', ['supplier', 'fulfilment'])
    });
    expect(await screen.findByTestId('supplier-rfi-open-rfi-002')).toHaveTextContent('View');
  });

  it('an RFP row with no award shows no "Awarded" pill', async () => {
    renderWithProviders(<SupplierRfp />, { identity: SUPPLIER });
    await screen.findByTestId('supplier-rfp-open-rfp-002');
    expect(screen.queryByTestId('supplier-rfp-awarded-rfp-002')).toBeNull();
  });
});

describe('S-11 — the supplier RFI form', () => {
  /**
   * @param {RfiQuestion} question
   * @param {boolean} [withDescription]
   */
  const field = (question, withDescription = true) =>
    render(
      <I18nextProvider i18n={i18n}>
        <QuestionField
          question={question}
          answer={undefined}
          disabled={false}
          withDescription={withDescription}
          onChange={() => {}}
        />
      </I18nextProvider>
    );
  const number = /** @type {RfiQuestion} */ (
    /** @type {unknown} */ ({
      id: 'n',
      promptKey: 'Colours',
      type: 'numberWithUnit',
      required: false
    })
  );

  it('both bounds set: "Between 1 and 10."', () => {
    field({ ...number, min: 1, max: 10 });
    expect(screen.getByTestId('rfi-field-n')).toHaveTextContent('Between 1 and 10.');
  });

  it('KNOWN-BAD twin — one bound missing: no "Between — and 5."', () => {
    field({ ...number, max: 5 });
    expect(screen.getByTestId('rfi-field-n')).not.toHaveTextContent('Between');
    expect(screen.getByTestId('rfi-field-n')).not.toHaveTextContent('—');
  });

  it('the comment waits behind "Add a comment"', () => {
    field(number);
    expect(screen.queryByLabelText('Colours — Description')).toBeNull();
    fireEvent.click(screen.getByTestId('rfi-field-add-comment-n'));
    expect(screen.getByLabelText('Colours — Description')).toBeInTheDocument();
  });

  it('PTI file not held: "PTI\'s file is not stored yet; ask your buyer for it"', async () => {
    renderWithProviders(<SupplierRfi />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByTestId('supplier-rfi-open-rfi-002'));
    const files = await screen.findByTestId('supplier-rfi-attachments-rfi-002');
    expect(files).toHaveTextContent("PTI's file is not stored yet; ask your buyer for it");
    expect(files).not.toHaveTextContent('not available in this session');
  });
});

describe('S-12 — no placeholder block on a legacy card', () => {
  it('a legacy RFQ states nothing, so the card has no special-requirements block', async () => {
    expect(specialRequirementsOf(rfqOf('rfq-010'), i18n.t)).toBeNull();
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    const legacy = await card('rfq-010');
    expect(legacy.queryByTestId('rfq-reqs-rfq-010')).toBeNull();
    expect(screen.queryByText(/sourcing packet/)).toBeNull();
  });

  it('KNOWN-GOOD twin — an RFQ that states requirements still shows them', () => {
    const rfq = rfqOf('rfq-021');
    expect(specialRequirementsOf({ ...rfq, allowAlternatives: true }, i18n.t)).toContain(
      'Alternative offers are welcome'
    );
  });
});

describe('X-02 — the supplier To do subtitle', () => {
  it('says the rows are grouped by area, nearest deadline first, in EN and ID', () => {
    expect(hubEn['hub.home.sup.subtitle']).toBe(
      'What Paragon is waiting for from you, grouped by area, nearest deadline first in each.'
    );
    expect(hubId['hub.home.sup.subtitle']).toBe(
      'Yang ditunggu Paragon dari Anda, dikelompokkan per area, tenggat terdekat di atas pada tiap area.'
    );
    expect(hubEn['hub.home.sup.subtitle']).not.toMatch(/most urgent/);
  });

  it('renders on the supplier Home', async () => {
    const { default: SupplierHome } = await import('../SupplierHome');
    renderWithProviders(<SupplierHome />, { identity: SUPPLIER, route: '/supplier/home' });
    await waitFor(() =>
      expect(screen.getByText(hubEn['hub.home.sup.subtitle'])).toBeInTheDocument()
    );
  });
});
