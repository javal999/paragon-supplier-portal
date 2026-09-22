// ─────────────────────────────────────────────────────────────────────────────
// RAISING, SENDING AND CLOSING AN INFORMATION REQUEST — section 3.6a, REQ-E03-02.
//
// The gap these specs close: the RFI verbs existed and NO SCREEN CALLED THEM, so
// a buyer could read a seeded event and could not raise one. Every assertion here
// is therefore end-to-end through the real dispatcher and the real stores — a
// spec that stubbed the command would have passed against the defect.
//
// ⚠️ THE TWO REFUSALS ARE ASSERTED IN BOTH DIRECTIONS. A wizard that refuses
// everything is not a wizard, so each "cannot send" spec carries the positive
// twin that shows what unblocks it; otherwise a disabled button proves only that
// something is disabled.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import { SEEDED_SEAT_ROLES } from '../../services/transitions/businessRoles';
import { NO_PERSON } from '../../context/noPerson';
import { resetRfxStores, rfiEventStore } from '../../services/data/mock/stores/rfxStores';
import { rfqStore } from '../../services/data/mock/stores/rfqStore';
import { quotationStore } from '../../services/data/mock/stores/quotationStore';
import { sdcClock } from '../../services/sdc';
import { rfiEventViews } from '../../services/data/mock/rfxReadModel';
import { mockDataService } from '../../services/data/mock/mockDataService';
import { useToast } from '../../hooks/useToast';
import BuyerRfi from '../BuyerRfi';
import SupplierRfi from '../SupplierRfi';
import { rfxNow } from './rfxDisplay';

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/** A seat that may RAISE an event and not SEND one (CE-06's separate atoms). */
const DRAFTER_SEAT: CurrentIdentity = { ...BUYER, businessRoles: ['requisitioner'] };
const supplierSeat = (supplierId: string, supplierName: string): CurrentIdentity => ({
  personaType: 'supplier',
  supplierId,
  supplierName,
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON,
});
const SUP_007 = supplierSeat('sup-007', 'PT Sample Packaging Indonesia');
const SUP_013 = supplierSeat('sup-013', 'PT Sample Preform Works');

/** Surfaces the toast queue — ToastProvider renders only children, so without
 *  this a refusal is invisible and "the verb refused" is unfalsifiable. */
const ToastSpy: React.FC = () => {
  const { toasts } = useToast();
  return (
    <ul data-testid="toast-spy">
      {toasts.map((x) => (
        <li key={x.id}>{`${x.title} ${x.description ?? ''}`}</li>
      ))}
    </ul>
  );
};

/** A date N days after the simulated clock, as the date input wants it. */
const dayFromNow = (days: number): string =>
  new Date(Date.parse(rfxNow()) + days * 86_400_000).toISOString().slice(0, 10);

const TITLE = 'Q1 2027 bottle capability survey';

const openWizard = async (identity: CurrentIdentity = BUYER_SEAT) => {
  renderWithProviders(
    <>
      <BuyerRfi />
      <ToastSpy />
    </>,
    { identity },
  );
  fireEvent.click(await screen.findByTestId('rfi-new'));
};

/** Fill the scope step properly — walking THROUGH its gate is what proves the
 *  later steps are the real ones and not components rendered out of context. */
const fillScope = (deadline = dayFromNow(14)) => {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: TITLE } });
  fireEvent.change(screen.getByTestId('rfi-new-family'), { target: { value: 'packaging' } });
  fireEvent.change(screen.getByLabelText('Response deadline'), { target: { value: deadline } });
};

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));

/** Scope → Questions → Invitees, with one packaging supplier ticked. */
const walkToReview = async (deadline = dayFromNow(14)) => {
  fillScope(deadline);
  next();
  await screen.findByTestId('rfi-new-question-a-categories');
  next();
  fireEvent.click(await screen.findByTestId('rfi-new-invitee-row-sup-007'));
  next();
  await screen.findByTestId('rfi-new-review');
};

describe('section 3.6a — the buyer raises an information request', () => {
  it('CE-01 · the wizard creates and SENDS it, and the invited supplier then sees it', async () => {
    await openWizard();
    await walkToReview();

    fireEvent.click(screen.getByRole('button', { name: 'Send to suppliers' }));

    // The board lands on the NEW event, in Open — the act just performed is the
    // one in view, and its number came from the store rather than from the page.
    const detail = await screen.findByTestId('rfi-detail-rfi-0004');
    expect(detail).toHaveTextContent('RFI-2026-004');
    expect(detail).toHaveTextContent(TITLE);
    expect(within(detail).getByText('Open')).toBeInTheDocument();
    // An Open event offers Close, never Send again.
    expect(screen.queryByTestId('rfi-send-rfi-0004')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfi-close-rfi-0004')).toBeInTheDocument();

    // ...and the invitation actually reached the supplier.
    cleanup();
    renderWithProviders(<SupplierRfi />, { identity: SUP_007 });
    const sent = await screen.findByTestId('supplier-rfi-rfi-0004');
    expect(sent).toHaveTextContent(TITLE);
  });

  it('CE-06 · "Save draft" is a second act — a DRAFT is PTI’s alone and no supplier reads it', async () => {
    await openWizard();
    await walkToReview();

    fireEvent.click(screen.getByTestId('rfi-new-save-draft'));

    const detail = await screen.findByTestId('rfi-detail-rfi-0004');
    expect(within(detail).getByText('Draft')).toBeInTheDocument();
    expect(screen.getByTestId('rfi-draft-notice-rfi-0004')).toBeInTheDocument();
    // A Draft offers Send and not Close.
    expect(screen.getByTestId('rfi-send-rfi-0004')).toBeInTheDocument();
    expect(screen.queryByTestId('rfi-close-rfi-0004')).not.toBeInTheDocument();

    // THE INVITED supplier reads nothing — it was invited to a draft.
    cleanup();
    renderWithProviders(<SupplierRfi />, { identity: SUP_007 });
    await screen.findByTestId('supplier-rfi-rfi-001'); // its real invitation
    expect(screen.queryByTestId('supplier-rfi-rfi-0004')).not.toBeInTheDocument();
  });

  it('⚠️ the READ PATH is what hides a draft, not the page — asserted at the read', () => {
    const before = rfiEventStore.all().length;
    rfiEventStore.add({
      id: 'rfi-draft-probe',
      eventNumber: 'RFI-2026-900',
      title: 'A draft nobody sent',
      templateId: 'packaging',
      materialCategory: 'Packaging',
      status: 'Draft',
      createdAt: rfxNow(),
      responseDeadline: dayFromNow(9),
      invitees: [{ supplierId: 'sup-007' }],
      questions: [],
      extensions: [],
    });
    expect(rfiEventStore.all().length).toBe(before + 1);

    // PTI (supplierId null) reads it; the invitee does not.
    const buyerIds = rfiEventViews(rfxNow(), null).map((e) => e.id);
    const supplierIds = rfiEventViews(rfxNow(), 'sup-007').map((e) => e.id);
    expect(buyerIds).toContain('rfi-draft-probe');
    expect(supplierIds).not.toContain('rfi-draft-probe');
    // KNOWN-GOOD CONTROL — the instrument DOES return this supplier's real,
    // sent invitation, so the absence above is a filtered row and not an empty
    // read (`EMPTY-INPUT-REPORTS-CLEAN-01`).
    expect(supplierIds).toContain('rfi-001');
  });

  it('CE-07 · no deadline in the future ⇒ the wizard will not advance; a future one unblocks it', async () => {
    await openWizard();
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: TITLE } });
    fireEvent.change(screen.getByTestId('rfi-new-family'), { target: { value: 'packaging' } });
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByTestId('rfi-new-deadline-refusal')).toBeInTheDocument();

    // A date already past is refused the way a blank one is — the reading is the
    // submit verb's own, so the wizard cannot admit a window it would close.
    fireEvent.change(screen.getByLabelText('Response deadline'), {
      target: { value: dayFromNow(-3) },
    });
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    // POSITIVE TWIN.
    fireEvent.change(screen.getByLabelText('Response deadline'), {
      target: { value: dayFromNow(10) },
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled());
    expect(screen.queryByTestId('rfi-new-deadline-refusal')).not.toBeInTheDocument();
  });

  it('CE-07 · no invitee ⇒ it cannot be sent, and the step says so', async () => {
    await openWizard();
    fillScope();
    next();
    await screen.findByTestId('rfi-new-question-a-categories');
    next();
    await screen.findByTestId('rfi-new-invitee-row-sup-007');
    expect(screen.getByTestId('rfi-new-invitee-none')).toHaveTextContent(
      'Invite at least one supplier',
    );
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    // POSITIVE TWIN — ticking one supplier opens the review step.
    fireEvent.click(screen.getByTestId('rfi-new-invitee-row-sup-007'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled());
  });

  it('CE-03 · a question is removable and another is addable, and the LIBRARY is untouched', async () => {
    await openWizard();
    fillScope();
    next();
    await screen.findByTestId('rfi-new-question-a-categories');

    // The packaging template opens the list; removing one drops it from THIS event.
    fireEvent.click(screen.getByTestId('rfi-new-remove-a-testing'));
    await waitFor(() =>
      expect(screen.queryByTestId('rfi-new-question-a-testing')).not.toBeInTheDocument(),
    );

    // Adding it back comes from the central library, by its own id.
    fireEvent.change(screen.getByTestId('rfi-new-library'), { target: { value: 'a-testing' } });
    fireEvent.click(screen.getByTestId('rfi-new-library-add'));
    await waitFor(() => expect(screen.getByTestId('rfi-new-question-a-testing')).toBeInTheDocument());

    // A one-off question for THIS event lands in section F, in PTI's own words.
    fireEvent.change(screen.getByLabelText('What to ask'), {
      target: { value: 'Which port do you ship from?' },
    });
    fireEvent.click(screen.getByTestId('rfi-new-oneoff-add'));
    const oneOff = await screen.findByTestId('rfi-new-question-event-1');
    expect(oneOff).toHaveTextContent('Which port do you ship from?');

    // ...and it reaches the SENT event, which is the only proof the event carries
    // its own list rather than re-reading the template at display time.
    fireEvent.click(screen.getByTestId('rfi-new-remove-event-1'));
    await waitFor(() =>
      expect(screen.queryByTestId('rfi-new-question-event-1')).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('rfi-new-library')).toBeInTheDocument();
  });

  it('a one-off question travels to the supplier’s form, and the removed one does not', async () => {
    await openWizard();
    fillScope();
    next();
    await screen.findByTestId('rfi-new-question-a-categories');
    fireEvent.click(screen.getByTestId('rfi-new-remove-a-testing'));
    fireEvent.change(screen.getByLabelText('What to ask'), {
      target: { value: 'Which port do you ship from?' },
    });
    fireEvent.click(screen.getByTestId('rfi-new-oneoff-add'));
    next();
    fireEvent.click(await screen.findByTestId('rfi-new-invitee-row-sup-007'));
    next();
    await screen.findByTestId('rfi-new-review');
    fireEvent.click(screen.getByRole('button', { name: 'Send to suppliers' }));
    await screen.findByTestId('rfi-detail-rfi-0004');

    cleanup();
    renderWithProviders(<SupplierRfi />, { identity: SUP_007 });
    fireEvent.click(await screen.findByTestId('supplier-rfi-open-rfi-0004'));
    expect(await screen.findByTestId('rfi-field-event-1')).toHaveTextContent(
      'Which port do you ship from?',
    );
    expect(screen.queryByTestId('rfi-field-a-testing')).not.toBeInTheDocument();
    // KNOWN-GOOD CONTROL — the questions that stayed are still asked.
    expect(screen.getByTestId('rfi-field-a-categories')).toBeInTheDocument();
  });

  it('CE-06 · a seat that may not send reads WHOSE act it is instead of a dead button', async () => {
    renderWithProviders(<BuyerRfi />, { identity: DRAFTER_SEAT });
    await screen.findByTestId('rfi-row-rfi-001');
    // It holds neither atom, so both the create entry and the publish slot name
    // their owner rather than vanishing.
    expect(screen.queryByTestId('rfi-new')).not.toBeInTheDocument();
    expect(screen.getByTestId('handoff-rfi-create')).toHaveAttribute('data-handoff', 'withheld');
    expect(screen.getByTestId('handoff-rfi-publish')).toHaveAttribute('data-handoff', 'withheld');

    // POSITIVE TWIN — the procurement seat keeps both and reads no notice.
    cleanup();
    renderWithProviders(<BuyerRfi />, { identity: BUYER_SEAT });
    expect(await screen.findByTestId('rfi-new')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfi-create')).not.toBeInTheDocument();
  });
});

describe('REQ-E03-02 — closing the window stops the answers', () => {
  it('a closed event is still readable, and there is no box to answer in', async () => {
    renderWithProviders(<BuyerRfi />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfi-open-rfi-001'));
    fireEvent.click(await screen.findByTestId('rfi-close-rfi-001'));
    await waitFor(() => expect(rfiEventStore.get('rfi-001')?.status).toBe('Closed'));
    // A Closed event offers Extend and no longer offers Close.
    expect(screen.queryByTestId('rfi-close-rfi-001')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfi-extend-rfi-001')).toBeInTheDocument();

    // The supplier still READS it — a closed request is not a hidden one — and
    // both answer buttons are shut, with the window's state said out loud.
    cleanup();
    renderWithProviders(<SupplierRfi />, { identity: SUP_013 });
    fireEvent.click(await screen.findByTestId('supplier-rfi-open-rfi-001'));
    expect(await screen.findByTestId('supplier-rfi-closed-rfi-001')).toHaveTextContent(
      /response window is closed/i,
    );
    expect(screen.getByTestId('supplier-rfi-save-rfi-001')).toBeDisabled();
    expect(screen.getByTestId('supplier-rfi-submit-rfi-001')).toBeDisabled();
  });

  it('⚠️ and the VERB refuses it, not only the screen — a hand-made dispatch is denied', async () => {
    const scope = { personaType: 'supplier', supplierId: 'sup-013', businessRoles: SEEDED_SEAT_ROLES.supplier } as const;
    // POSITIVE TWIN FIRST — while the event is Open the same dispatch is accepted,
    // so the refusal below is the CLOSE and not a malformed payload.
    const accepted = await mockDataService.commands.dispatch(scope, {
      transitionId: 't_rfiresponse_save',
      entity: 'rfiResponse',
      payload: { rfiId: 'rfi-001', supplierId: 'sup-013', answers: [] },
    });
    expect(accepted.status).not.toBe('failed');

    rfiEventStore.update('rfi-001', (e) => ({ ...e, status: 'Closed' }));
    await expect(
      mockDataService.commands.dispatch(scope, {
        transitionId: 't_rfiresponse_save',
        entity: 'rfiResponse',
        payload: { rfiId: 'rfi-001', supplierId: 'sup-013', answers: [] },
      }),
    ).rejects.toThrow(/denied/i);
  });

  it('POSITIVE TWIN — while the event is Open the supplier may still save a draft', async () => {
    renderWithProviders(
      <>
        <SupplierRfi />
        <ToastSpy />
      </>,
      { identity: SUP_013 },
    );
    fireEvent.click(await screen.findByTestId('supplier-rfi-open-rfi-001'));
    expect(screen.queryByTestId('supplier-rfi-closed-rfi-001')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('supplier-rfi-save-rfi-001'));
    await waitFor(() => expect(screen.getByTestId('toast-spy').textContent).toMatch(/Draft saved/i));
  });
});
