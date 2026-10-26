// ─────────────────────────────────────────────────────────────────────────────
// RAISING, SENDING AND CLOSING A PROPOSAL REQUEST — section 3.6a, REQ-E03-04.
//
// Same gap as the RFI's and the same shape of proof: the RFP verbs existed and no
// screen called them. Every assertion runs through the real dispatcher and the
// real stores.
//
// ⚠️ THE LOAD-BEARING ONE IS THE THIRD: **the supplier's form asks for EXACTLY
// the terms PTI picked, and no others.** A wizard that dispatched a term list the
// answer form ignored would pass a create-succeeded assertion and still ship a
// broken document, so the picked set is asserted on the SUPPLIER's page, both
// what is there and what is not.
// ─────────────────────────────────────────────────────────────────────────────

import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerRfxRoutes from '@test/buyerRfxRoutes';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { resetRfxStores, rfpEventStore } from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { sdcClock } from '@services/sdc';
import { rfpEventViews } from '@services/data/mock/rfxReadModel';
import { mockDataService } from '@services/data/mock/mockDataService';
import SupplierRfp from '../SupplierRfp';
import { rfxNow } from './rfxDisplay';

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/**
 * A seat holding neither rfp atom — CE-06's two permissions, withheld.
 * @type {CurrentIdentity}
 */
const DRAFTER_SEAT = { ...BUYER, businessRoles: ['requisitioner'] };
/**
 * @param {string} supplierId
 * @param {string} supplierName
 * @returns {CurrentIdentity}
 */
const supplierSeat = (supplierId, supplierName) => ({
  personaType: 'supplier',
  supplierId,
  supplierName,
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
});
const SUP_007 = supplierSeat('sup-007', 'PT Sample Packaging Indonesia');
/** The invitee still to answer rfp-001 — sup-015's proposal is already SUBMITTED,
 *  which would lock its form for a reason that has nothing to do with closing. */
const SUP_013 = supplierSeat('sup-013', 'PT Sample Preform Works');

/**
 * @param {number} days
 * @returns {string}
 */
const dayFromNow = (days) =>
  new Date(Date.parse(rfxNow()) + days * 86_400_000).toISOString().slice(0, 10);

const TITLE = 'Q1 2027 bottle supply proposal';

/** @param {CurrentIdentity} [identity] */
const openWizard = async (identity = BUYER_SEAT) => {
  renderWithProviders(<BuyerRfxRoutes />, { identity, route: '/buyer/rfp' });
  fireEvent.click(await screen.findByTestId('rfp-new'));
};

const fillScope = (deadline = dayFromNow(21)) => {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: TITLE } });
  fireEvent.change(screen.getByTestId('rfp-new-family'), { target: { value: 'packaging' } });
  fireEvent.change(screen.getByLabelText('Response deadline'), { target: { value: deadline } });
};

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));

/**
 * Pick one term and state PTI's requested value for it.
 * @param {string} termId
 * @param {string} label
 * @param {string} value
 */
const pickTerm = (termId, label, value) => {
  const row = screen.getByTestId(`rfp-new-term-${termId}`);
  fireEvent.click(within(row).getByLabelText(`${label} — Ask for this term`));
  fireEvent.change(within(row).getByLabelText(`${label} — PTI asks for`), {
    target: { value }
  });
};

/** Past the two OPTIONAL steps (indicative pricing, questions), left empty. */
const skipOptionalSteps = async () => {
  await screen.findByTestId('rfp-new-pricing');
  next();
  await screen.findByTestId('rfp-new-oneoff');
  next();
};

/** Scope → Terms (two picked, both valued) → [pricing, questions] → Invitees (one ticked) → Review. */
const walkToReview = async () => {
  fillScope();
  next();
  await screen.findByTestId('rfp-new-term-paymentTerms');
  pickTerm('paymentTerms', 'Payment terms (days)', '60');
  pickTerm('leadTime', 'Standard lead time (days)', '21');
  next();
  await skipOptionalSteps();
  fireEvent.click(await screen.findByTestId('rfp-new-invitee-row-sup-007'));
  next();
  next(); // + the Documents step (B3), optional, so it passes empty
  await screen.findByTestId('rfp-new-review');
};

describe('section 3.6a — the buyer raises a proposal request', () => {
  it('CE-01 · it is created and SENT with the picked terms and PTI’s requested values', async () => {
    await openWizard();
    await walkToReview();

    // The review restates each picked term with the value PTI asked for.
    expect(screen.getByTestId('rfp-new-review-term-paymentTerms')).toHaveTextContent('60');
    expect(screen.getByTestId('rfp-new-review-term-leadTime')).toHaveTextContent('21');

    fireEvent.click(screen.getByRole('button', { name: 'Send to suppliers' }));

    await screen.findByTestId('rfp-detail-rfp-0005');
    // RFx UX 2F — the number, title and status are the page header's (the
    // About card no longer repeats them).
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(TITLE);
    expect(screen.getByText('RFP-2026-005')).toBeInTheDocument();
    expect(screen.getByTestId('rfp-event-status')).toHaveTextContent('Open');
    // An Open event offers Close, never Send again.
    expect(screen.queryByTestId('rfp-send-rfp-0005')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfp-close-rfp-0005')).toBeInTheDocument();

    // The store holds the terms in the STANDARD LIST's order, values trimmed.
    expect(rfpEventStore.get('rfp-0005')?.terms).toEqual([
      { termId: 'paymentTerms', requestedValue: '60' },
      { termId: 'leadTime', requestedValue: '21' }
    ]);
  });

  it('⚠️ the answering supplier is asked EXACTLY the picked terms, and no others', async () => {
    await openWizard();
    await walkToReview();
    fireEvent.click(screen.getByRole('button', { name: 'Send to suppliers' }));
    await screen.findByTestId('rfp-detail-rfp-0005');

    cleanup();
    renderWithProviders(<SupplierRfp />, { identity: SUP_007 });
    fireEvent.click(await screen.findByTestId('supplier-rfp-open-rfp-0005'));

    const payment = await screen.findByTestId('supplier-rfp-term-paymentTerms');
    expect(payment).toHaveTextContent('Payment terms (days)');
    expect(payment).toHaveTextContent('60');
    expect(screen.getByTestId('supplier-rfp-term-leadTime')).toHaveTextContent('21');
    // KNOWN-BAD TWIN — a standard term PTI did NOT pick is not asked. Without
    // this the spec would pass against a form that rendered the whole list.
    expect(screen.queryByTestId('supplier-rfp-term-priceValidity')).not.toBeInTheDocument();
    expect(screen.queryByTestId('supplier-rfp-term-incoterms')).not.toBeInTheDocument();
  });

  it('CE-06 · "Save draft" is the second act — a DRAFT reaches no supplier', async () => {
    await openWizard();
    await walkToReview();
    fireEvent.click(screen.getByTestId('rfp-new-save-draft'));

    await screen.findByTestId('rfp-detail-rfp-0005');
    expect(screen.getByTestId('rfp-event-status')).toHaveTextContent('Draft');
    expect(screen.getByTestId('rfp-draft-notice-rfp-0005')).toBeInTheDocument();
    expect(screen.getByTestId('rfp-send-rfp-0005')).toBeInTheDocument();
    expect(screen.queryByTestId('rfp-close-rfp-0005')).not.toBeInTheDocument();

    // The read path hides it from the invitee, and DOES return its real one.
    const supplierIds = rfpEventViews(rfxNow(), 'sup-007').map((e) => e.id);
    expect(supplierIds).not.toContain('rfp-0005');
    expect(supplierIds).toContain('rfp-001');

    cleanup();
    renderWithProviders(<SupplierRfp />, { identity: SUP_007 });
    await screen.findByTestId('supplier-rfp-rfp-001');
    expect(screen.queryByTestId('supplier-rfp-rfp-0005')).not.toBeInTheDocument();
  });

  it('a Draft can be SENT from the board afterwards — creating and sending stay apart', async () => {
    await openWizard();
    await walkToReview();
    fireEvent.click(screen.getByTestId('rfp-new-save-draft'));
    await screen.findByTestId('rfp-detail-rfp-0005');

    fireEvent.click(screen.getByTestId('rfp-send-rfp-0005'));
    await waitFor(() => expect(rfpEventStore.get('rfp-0005')?.status).toBe('Open'));
    expect(await screen.findByTestId('rfp-close-rfp-0005')).toBeInTheDocument();
  });

  it('CE-07 · no deadline in the future ⇒ the wizard will not advance; a future one unblocks it', async () => {
    await openWizard();
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: TITLE } });
    fireEvent.change(screen.getByTestId('rfp-new-family'), { target: { value: 'packaging' } });
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    // Nothing entered yet ⇒ the step stays shut, but no refusal shouts at a
    // blank field the buyer has not reached.
    expect(screen.queryByTestId('rfp-new-deadline-refusal')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Response deadline'), {
      target: { value: dayFromNow(-2) }
    });
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    // A past date entered and the field left ⇒ the refusal names why (RFX-D32:
    // the RFP checks on blur, as the RFI does).
    fireEvent.blur(screen.getByLabelText('Response deadline'));
    expect(screen.getByTestId('rfp-new-deadline-refusal')).toBeInTheDocument();

    // POSITIVE TWIN.
    fireEvent.change(screen.getByLabelText('Response deadline'), {
      target: { value: dayFromNow(12) }
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled());
    expect(screen.queryByTestId('rfp-new-deadline-refusal')).not.toBeInTheDocument();
  });

  it('a request with no proposals yet says so — not that no request exists', async () => {
    await openWizard();
    await walkToReview();
    fireEvent.click(screen.getByTestId('rfp-new-save-draft'));
    const detail = await screen.findByTestId('rfp-detail-rfp-0005');
    expect(within(detail).getByTestId('rfp-no-proposals')).toHaveTextContent(
      'No proposals received yet.'
    );
    expect(within(detail).queryByText('No proposal request yet.')).not.toBeInTheDocument();
  });

  it('REQ-E03-04 · a picked term with no requested value blocks the walk, and is NAMED', async () => {
    await openWizard();
    fillScope();
    next();
    await screen.findByTestId('rfp-new-term-paymentTerms');
    // Nothing picked at all is its own refusal.
    expect(screen.getByTestId('rfp-new-no-terms')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    // Picked, valueless — the refusal names the term rather than disabling silently.
    const row = screen.getByTestId('rfp-new-term-paymentTerms');
    fireEvent.click(within(row).getByLabelText('Payment terms (days) — Ask for this term'));
    await waitFor(() =>
      expect(screen.getByTestId('rfp-new-missing-values')).toHaveTextContent('Payment terms (days)')
    );
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    // POSITIVE TWIN — stating the value clears it.
    fireEvent.change(within(row).getByLabelText('Payment terms (days) — PTI asks for'), {
      target: { value: '45 days' }
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled());
    expect(screen.queryByTestId('rfp-new-missing-values')).not.toBeInTheDocument();
  });

  it('CE-07 · no invitee ⇒ it cannot be sent, and the step says so', async () => {
    await openWizard();
    fillScope();
    next();
    await screen.findByTestId('rfp-new-term-paymentTerms');
    pickTerm('paymentTerms', 'Payment terms (days)', '45');
    next();
    await skipOptionalSteps();
    await screen.findByTestId('rfp-new-invitee-row-sup-007');

    expect(screen.getByTestId('rfp-new-invitee-none')).toHaveTextContent(
      'Invite at least one supplier'
    );
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    // POSITIVE TWIN.
    fireEvent.click(screen.getByTestId('rfp-new-invitee-row-sup-007'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled());
  });

  it('CE-06 · a seat holding neither atom reads WHOSE act each one is', async () => {
    renderWithProviders(<BuyerRfxRoutes />, { identity: DRAFTER_SEAT, route: '/buyer/rfp' });
    await screen.findByTestId('rfp-row-rfp-001');
    expect(screen.queryByTestId('rfp-new')).not.toBeInTheDocument();
    expect(screen.getByTestId('handoff-rfp-create')).toHaveAttribute('data-handoff', 'withheld');
    expect(screen.getByTestId('handoff-rfp-publish')).toHaveAttribute('data-handoff', 'withheld');

    // POSITIVE TWIN.
    cleanup();
    renderWithProviders(<BuyerRfxRoutes />, { identity: BUYER_SEAT, route: '/buyer/rfp' });
    expect(await screen.findByTestId('rfp-new')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfp-create')).not.toBeInTheDocument();
  });
});

describe('REQ-E03-04 — closing the window stops the proposals', () => {
  it('a closed RFP is still readable, and the term boxes are shut', async () => {
    renderWithProviders(<BuyerRfxRoutes />, { identity: BUYER_SEAT, route: '/buyer/rfp' });
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-001'));
    fireEvent.click(await screen.findByTestId('rfp-close-rfp-001'));
    // RFx UX 1C (B-05) — the close is dispatched from its confirmation sheet.
    fireEvent.click(await screen.findByTestId('rfp-close-confirm-rfp-001'));
    await waitFor(() => expect(rfpEventStore.get('rfp-001')?.status).toBe('Closed'));
    // Closed no longer offers Close, and still offers Extend.
    expect(screen.queryByTestId('rfp-close-rfp-001')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfp-extend-btn-rfp-001')).toBeInTheDocument();

    cleanup();
    renderWithProviders(<SupplierRfp />, { identity: SUP_013 });
    fireEvent.click(await screen.findByTestId('supplier-rfp-open-rfp-001'));
    expect(await screen.findByTestId('supplier-rfp-closed-rfp-001')).toHaveTextContent(
      /response window is closed/i
    );
    expect(screen.getByTestId('supplier-rfp-save-rfp-001')).toBeDisabled();
    expect(screen.getByTestId('supplier-rfp-submit-rfp-001')).toBeDisabled();
  });

  it('POSITIVE TWIN — while it is Open the same supplier may still save a draft', async () => {
    renderWithProviders(<SupplierRfp />, { identity: SUP_013 });
    fireEvent.click(await screen.findByTestId('supplier-rfp-open-rfp-001'));
    // BL-132 — the form opens once the supplier says it will respond.
    fireEvent.click(await screen.findByTestId('supplier-rfp-rfp-001-intent-respond'));
    expect(screen.queryByTestId('supplier-rfp-closed-rfp-001')).not.toBeInTheDocument();
    expect(await screen.findByTestId('supplier-rfp-save-rfp-001')).not.toBeDisabled();
  });
});

describe('NR-1 BR-02 — the buyer asks for documents on the RFP (B3)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('a required Certificate request is dispatched with the sent RFP and listed on the review', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    await openWizard();
    fillScope();
    next();
    await screen.findByTestId('rfp-new-term-paymentTerms');
    pickTerm('paymentTerms', 'Payment terms (days)', '60');
    next();
    await skipOptionalSteps();
    fireEvent.click(await screen.findByTestId('rfp-new-invitee-row-sup-007'));
    next();

    // The Documents step, just before the review.
    fireEvent.click(await screen.findByTestId('rfp-new-doc-add'));
    fireEvent.change(screen.getByTestId('rfp-new-doc-doc-1-name'), {
      target: { value: 'Halal certificate' }
    });
    fireEvent.change(screen.getByTestId('rfp-new-doc-doc-1-type'), {
      target: { value: 'certificate' }
    });
    fireEvent.click(screen.getByTestId('rfp-new-doc-doc-1-required'));
    next();

    const listed = within(await screen.findByTestId('rfp-new-review')).getByTestId(
      'rfp-new-review-doc-doc-1'
    );
    expect(listed).toHaveTextContent('Halal certificate');
    expect(listed).toHaveTextContent('Certificate');
    expect(listed).toHaveTextContent('Required');

    fireEvent.click(screen.getByRole('button', { name: 'Send to suppliers' }));
    await screen.findByTestId('rfp-detail-rfp-0005');

    const REQUEST = { id: 'doc-1', name: 'Halal certificate', type: 'certificate', required: true };
    const create = dispatch.mock.calls
      .map(([, input]) => input)
      .find((i) => i.transitionId === 't_rfp_create');
    expect(create?.payload).toMatchObject({ documentRequests: [REQUEST] });
    expect(rfpEventStore.get('rfp-0005')?.documentRequests).toEqual([REQUEST]);
    expect(rfpEventStore.get('rfp-0005')?.status).toBe('Open');
  });
});
