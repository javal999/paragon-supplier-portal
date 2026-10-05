// ─────────────────────────────────────────────────────────────────────────────
// EXTENDING A QUOTATION REQUEST'S RESPONSE WINDOW — REQ-E03-03 BR-05.
//
// `extendRfq` existed in the command layer and no screen dispatched it: the RFI
// and RFP sides could move their windows and the RFQ side — the one document
// suppliers actually price — could not.
//
// ⚠️ THE ASSERTION THAT MATTERS IS NOT "THE DATE MOVED". A stored date proves the
// button wrote something; it does not prove the WINDOW opened. So the spec fires
// the real quote verb on either side of the extension: **refused before, accepted
// after**, same payload, same supplier, same clock. The refusal is the known-good
// control for the acceptance, and the acceptance is the known-good control for
// the refusal.
// ─────────────────────────────────────────────────────────────────────────────

import { Routes, Route } from 'react-router-dom';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { resetRfxStores } from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { mockDataService } from '@services/data/mock/mockDataService';
import { sdcClock } from '@services/sdc';
import { effectiveDeadline } from '@services/transitions/rfxRules';
import BuyerSourcingEvent from '../BuyerSourcingEvent';
import { rfxNow } from './rfxDisplay';

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/**
 * A seat holding no `rfq:publish` — receiving cannot move a sourcing window.
 * @type {CurrentIdentity}
 */
const RECEIVING_SEAT = { ...BUYER, businessRoles: ['receiving'] };

/**
 * @param {number} days
 * @returns {string}
 */
const dayFromNow = (days) =>
  new Date(Date.parse(rfxNow()) + days * 86_400_000).toISOString().slice(0, 10);

/** rfq-014's window closed two days ago, which is what makes it the subject. */
const RFQ = 'rfq-014';
const LATE_BIDDER = 'sup-013';

/** @param {string} supplierId */
const supplierScope = (supplierId) =>
  /** @type {const} */ ({
    personaType: 'supplier',
    supplierId,
    businessRoles: SEEDED_SEAT_ROLES.supplier
  });

/**
 * The real quote verb, with a payload that is valid but for the deadline.
 * @param {string} supplierId
 */
const quote = (supplierId) =>
  mockDataService.commands.dispatch(supplierScope(supplierId), {
    transitionId: 't_quotation_submit',
    entity: 'quotation',
    payload: {
      rfqId: RFQ,
      supplierId,
      unitPrice: 1_150,
      leadTimeDays: 24,
      currency: 'IDR'
    }
  });

const renderEvent = (rfqId = RFQ) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
    </Routes>,
    { identity: BUYER_SEAT, route: `/buyer/rfq/${rfqId}` }
  );

describe('REQ-E03-03 BR-05 — the buyer moves the response window', () => {
  it('⚠️ a quote refused after the deadline is ACCEPTED once the window is extended', async () => {
    // BEFORE — the window closed two days ago and the verb says so.
    const refused = await quote(LATE_BIDDER);
    expect(refused.status).toBe('failed');
    expect(refused.reason).toMatch(/PAST_DEADLINE/);
    const quotesBefore = quotationStore.all().length;

    // THE ACT, through the screen the buyer actually uses.
    renderEvent();
    await screen.findByTestId('event-invitee-sup-013');
    fireEvent.change(screen.getByLabelText('Extend the deadline'), {
      target: { value: dayFromNow(7) }
    });
    fireEvent.click(screen.getByTestId('event-extend-btn'));
    await waitFor(() => expect(rfqStore.get(RFQ)?.responseDeadline).toBe(dayFromNow(7)));

    // AFTER — the same payload, the same clock, now accepted.
    const accepted = await quote(LATE_BIDDER);
    expect(accepted.status).not.toBe('failed');
    expect(quotationStore.all().length).toBe(quotesBefore + 1);
    // ...and the extension is recorded rather than silently overwriting the date.
    const recorded = rfqStore.get(RFQ)?.extensions ?? [];
    expect(recorded[recorded.length - 1]).toMatchObject({
      deadline: dayFromNow(7),
      supplierIds: []
    });
  });

  it('extended for SELECTED invitees only — the event’s own deadline does not move', async () => {
    const original = /** @type {import('../../data/mockRfqs').RFQ} */ (rfqStore.get(RFQ))
      .responseDeadline;

    renderEvent();
    await screen.findByTestId('event-invitee-sup-013');
    // Tick one invitee, then extend. The tick is found INSIDE that invitee's own
    // row — the supplier's name also appears in the comparison below, and a
    // document-wide label lookup would be ambiguous about which one it meant.
    fireEvent.click(
      within(screen.getByTestId('event-invitee-sup-013')).getByLabelText('PT Sample Preform Works')
    );
    fireEvent.change(screen.getByLabelText('Extend the deadline'), {
      target: { value: dayFromNow(5) }
    });
    fireEvent.click(screen.getByTestId('event-extend-btn'));
    await waitFor(() =>
      expect(rfqStore.get(RFQ)?.inviteeDeadlines?.some((i) => i.supplierId === LATE_BIDDER)).toBe(
        true
      )
    );

    // The event's deadline is untouched, so the grant is readable as a grant.
    const after = /** @type {import('../../data/mockRfqs').RFQ} */ (rfqStore.get(RFQ));
    expect(after.responseDeadline).toBe(original);
    expect(
      effectiveDeadline(after.responseDeadline, after.inviteeDeadlines ?? [], LATE_BIDDER)
    ).toBe(dayFromNow(5));

    // The NAMED supplier may quote; a supplier nobody extended for still cannot.
    const named = await quote(LATE_BIDDER);
    expect(named.status).not.toBe('failed');
    const other = await quote('sup-008');
    expect(other.status).toBe('failed');
    expect(other.reason).toMatch(/PAST_DEADLINE/);
  });

  it('a deadline EARLIER than the current one is refused — an extension moves later', async () => {
    renderEvent();
    await screen.findByTestId('event-invitee-sup-013');
    const before = /** @type {import('../../data/mockRfqs').RFQ} */ (rfqStore.get(RFQ))
      .responseDeadline;
    fireEvent.change(screen.getByLabelText('Extend the deadline'), {
      target: { value: dayFromNow(-9) }
    });
    fireEvent.click(screen.getByTestId('event-extend-btn'));
    // The verb refuses it and the stored date is unchanged — the screen offers
    // the gesture, the machine decides, and nothing is written on a refusal.
    await waitFor(() => expect(rfqStore.get(RFQ)?.responseDeadline).toBe(before));
    expect(rfqStore.get(RFQ)?.extensions ?? []).toHaveLength(0);
  });

  it('an AWARDED event offers no extension — and says why instead of going quiet', async () => {
    renderEvent('rfq-015');
    expect(await screen.findByTestId('event-extend-unavailable')).toHaveTextContent(
      /never after it is awarded/i
    );
    expect(screen.queryByTestId('event-extend-btn')).not.toBeInTheDocument();
  });

  it('a seat without `rfq:publish` reads WHOSE act it is, and the control is shut', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
      </Routes>,
      { identity: RECEIVING_SEAT, route: `/buyer/rfq/${RFQ}` }
    );
    const notice = await screen.findByTestId('handoff-rfq-extend');
    expect(notice).toHaveAttribute('data-handoff', 'withheld');
    fireEvent.change(screen.getByLabelText('Extend the deadline'), {
      target: { value: dayFromNow(7) }
    });
    // The control is PRESENT and shut rather than absent: the notice beside it is
    // what names the owner, and removing the button would leave the reader with
    // no idea a response window can be moved at all.
    expect(screen.getByTestId('event-extend-btn')).toBeDisabled();
  });

  it('POSITIVE TWIN — the procurement seat keeps the control and reads no notice', async () => {
    renderEvent();
    await screen.findByTestId('event-invitee-sup-013');
    expect(screen.queryByTestId('handoff-rfq-extend')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Extend the deadline'), {
      target: { value: dayFromNow(7) }
    });
    expect(screen.getByTestId('event-extend-btn')).not.toBeDisabled();
  });
});
