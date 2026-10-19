// ────────────────────────────────────────────────────────────────────────────
// RFx UX lane 1E — the RFP detail (B-06, B-07).
//
// B-06: from publish onward the detail shows what was sent — "Terms sent" with
// the "PTI asks for" column alone, the options with their quantity points, and
// "Supplier columns appear as proposals arrive" — instead of "No proposals
// received yet" as the only content.
//
// B-07: one "Firm up the prices" block with two labelled choices, each with its
// one-line rule (owner ruling Q1, 2026-10-19); both disabled with "Close the RFP
// first" while the RFP is Open; an option in a firm-offer round is closed to the
// RFQ path.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerRfxRoutes from '@test/buyerRfxRoutes';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import {
  resetRfxStores,
  rfpEventStore,
  rfpOfferRoundStore
} from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { sdcClock } from '@services/sdc';
import { rfxNow } from '../rfx/rfxDisplay';

/** @type {CurrentIdentity} */
const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

/** @param {string} id */
const openDetail = async (id) => {
  renderWithProviders(<BuyerRfxRoutes />, { identity: BUYER_SEAT, route: '/buyer/rfp' });
  fireEvent.click(await screen.findByTestId(`rfp-open-${id}`));
  return screen.findByTestId(`rfp-detail-${id}`);
};

describe('B-06 — the RFP detail shows the terms and options sent, before any proposal', () => {
  it('ICY (rfp-003, Open, 0 proposals): "Terms sent", the PTI column alone, the options with their points, and the note', async () => {
    const detail = await openDetail('rfp-003');
    const sent = within(detail).getByTestId('rfp-terms-sent-rfp-003');
    expect(within(sent).getByRole('heading', { name: 'Terms sent' })).toBeInTheDocument();
    expect(within(sent).getByTestId('rfp-terms-sent-note-rfp-003')).toHaveTextContent(
      'Supplier columns appear as proposals arrive.'
    );
    // One column besides the term: "PTI asks for".
    const headers = within(sent)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(['Term', 'PTI asks for']);
    expect(within(sent).getByTestId('rfp-term-paymentTerms')).toBeInTheDocument();
    expect(within(sent).getByTestId('rfp-sent-option-opt-formula-1')).toHaveTextContent(
      'Formula option 1: matte lip cream'
    );
    expect(within(sent).getByTestId('rfp-sent-points-rfp-003')).toHaveTextContent(
      'Quantity points: 25,000 / 50,000 Quantities are per variant.'
    );
    // KNOWN-BAD — the old empty message is no longer the content.
    expect(within(detail).queryByText('No proposals received yet.')).not.toBeInTheDocument();
  });

  it('KNOWN-GOOD twin — with proposals in (rfp-002) the grid is the comparison, with no "Terms sent" note', async () => {
    const detail = await openDetail('rfp-002');
    expect(within(detail).queryByTestId('rfp-terms-sent-rfp-002')).not.toBeInTheDocument();
    expect(within(detail).getByTestId('rfp-other-terms')).toBeInTheDocument();
  });
});

describe('B-07 — "Firm up the prices": two labelled choices with their rule', () => {
  it('Open RFP: both choices are disabled and say "Close the RFP first"', async () => {
    const detail = await openDetail('rfp-002');
    const block = within(detail).getByTestId('rfp-firmup-rfp-002');
    expect(within(block).getByRole('heading', { name: 'Firm up the prices' })).toBeInTheDocument();
    const firm = within(block).getByTestId('rfp-firmup-firm-rfp-002');
    expect(firm).toHaveTextContent('Ask for firm offers in this RFP');
    expect(firm).toHaveTextContent('For full-service or ODM options settled here.');
    expect(within(firm).getByTestId('rfp-ask-firm-rfp-002')).toBeDisabled();
    expect(within(firm).getByTestId('rfp-firmup-close-first-firm-rfp-002')).toHaveTextContent(
      'Close the RFP first'
    );
    const rfq = within(block).getByTestId('rfp-firmup-rfq-rfp-002');
    expect(rfq).toHaveTextContent('Create an RFQ from this RFP');
    expect(rfq).toHaveTextContent('For components you will tender per item.');
    expect(within(rfq).getByTestId('rfp-to-rfq-btn-rfp-002')).toBeDisabled();
    expect(within(rfq).getByTestId('rfp-firmup-close-first-rfq-rfp-002')).toHaveTextContent(
      'Close the RFP first'
    );
    // No option picker while Open.
    expect(within(rfq).queryByTestId('rfp-to-rfq-rfp-002')).not.toBeInTheDocument();
  });

  it('Closed RFP (Q1): an option in firm-offer round 1 is closed to the RFQ path; the other stays pickable', async () => {
    rfpEventStore.update('rfp-002', (e) => ({ ...e, status: /** @type {const} */ ('Closed') }));
    rfpOfferRoundStore.add({
      id: 'rfp-round-q1',
      rfpId: 'rfp-002',
      roundNumber: 1,
      optionRefs: ['opt-full-set'],
      quantityPoints: [50_000],
      invitedSupplierIds: ['sup-007'],
      deadline: rfxNow().slice(0, 10),
      openedAt: rfxNow()
    });
    const detail = await openDetail('rfp-002');
    const firm = within(detail).getByTestId('rfp-firmup-firm-rfp-002');
    expect(within(firm).getByTestId('rfp-ask-firm-rfp-002')).toBeEnabled();
    expect(
      within(firm).queryByTestId('rfp-firmup-close-first-firm-rfp-002')
    ).not.toBeInTheDocument();
    const picker = within(detail).getByTestId('rfp-to-rfq-rfp-002');
    expect(within(picker).getByTestId('rfp-to-rfq-option-opt-full-set')).toBeDisabled();
    expect(within(picker).getByTestId('rfp-to-rfq-closed-opt-full-set')).toHaveTextContent(
      'In firm-offer round 1'
    );
    expect(within(picker).getByTestId('rfp-to-rfq-option-opt-pump-cap')).toBeEnabled();
    expect(within(picker).queryByTestId('rfp-to-rfq-closed-opt-pump-cap')).not.toBeInTheDocument();
  });
});
