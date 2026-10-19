// RFx UX B-02 — owner ruling 2026-10-19, "move, then trim". Step 1 built here:
// the invitees' answers and the clarification questions moved from the board's
// side panel to the RFQ event page, with a "Clarifications" nav entry and its
// count, and the `rfqclarification:answer` notice in the answer's own slot.
// The move of review and FX rate, and the trim to a summary, wait on the
// owner's call on the legacy comparison (see the lane report).
import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import {
  rfqClarificationStore,
  resetRfqEngagementStores
} from '@services/data/mock/stores/rfqEngagementStores';
import { rfxNow } from '@services/data/mock/rfxReadModel';
import { sdcClock } from '@services/sdc';
import BuyerSourcingEvent from '../BuyerSourcingEvent';
import BuyerSourcing from './index';

/** @type {CurrentIdentity} */
const PROCUREMENT = { ...BUYER, businessRoles: ['procurement'] };
/** @type {CurrentIdentity} */
const RECEIVING = { ...BUYER, businessRoles: ['receiving'] };

beforeEach(() => {
  rfqStore.reset();
  quotationStore.reset();
  resetRfqEngagementStores();
  sdcClock.reset();
  rfqClarificationStore.add({
    id: 'rc-b02',
    rfqId: 'rfq-021',
    askedBy: 'sup-007',
    askedAt: rfxNow(),
    question: 'Is the roll core 76 mm?',
    visibility: 'private'
  });
});

/** @param {CurrentIdentity} identity */
const renderEvent = (identity) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
    </Routes>,
    { identity, route: '/buyer/rfq/rfq-021' }
  );

describe('B-02 — clarifications live on the event page, not the side panel', () => {
  it('the side panel no longer renders the answers or the clarifications', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: PROCUREMENT });
    fireEvent.click(await screen.findByText('RFQ-2026-021'));
    const panel = await screen.findByRole('dialog');
    await within(panel).findByText('Summary');
    expect(within(panel).queryByTestId('rfq-engagement')).not.toBeInTheDocument();
    expect(within(panel).queryByTestId('buyer-clarification-rc-b02')).not.toBeInTheDocument();
  });

  it('the event page renders them in their own section, with the unanswered count in the nav', async () => {
    renderEvent(PROCUREMENT);
    const section = /** @type {HTMLElement} */ (
      (await screen.findByTestId('rfq-engagement')).closest('#event-clarifications')
    );
    expect(section).not.toBeNull();
    expect(await within(section).findByTestId('buyer-clarification-rc-b02')).toHaveTextContent(
      'Is the roll core 76 mm?'
    );
    const nav = screen.getByTestId('event-nav');
    await waitFor(() =>
      expect(within(nav).getByTestId('event-nav-event-clarifications')).toHaveTextContent(
        'Clarifications1 unanswered'
      )
    );
  });

  it('HELD: a procurement seat answers on the event page and reads no notice', async () => {
    renderEvent(PROCUREMENT);
    expect(await screen.findByTestId('answer-form-rc-b02')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfqclarification-answer')).not.toBeInTheDocument();
  });

  it('WITHHELD: a receiving seat reads the owner where the answer form was', async () => {
    renderEvent(RECEIVING);
    expect(await screen.findByTestId('handoff-rfqclarification-answer')).toHaveTextContent(
      'Awaiting Procurement'
    );
    expect(screen.queryByTestId('answer-form-rc-b02')).not.toBeInTheDocument();
  });
});
