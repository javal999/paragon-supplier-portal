import { Routes, Route, useLocation } from 'react-router-dom';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
/** @import { QueryScope } from '@services/data/types' */
/** @import { AwardRecord } from '@services/sourcing/types' */
import { SEEDED_SEAT_ROLES, PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { awardStore, resetRfxStores } from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { sdcClock } from '@services/sdc';
import { MockCommandService } from '@services/data/mock/MockCommandService';
import { formatDate, formatMoney } from '@lib/format';
import { resetNoticeReads } from '@services/stores/noticeReadsStore';
import SidebarV2 from '@components/layout-v2/SidebarV2';
import TopBarV2 from '@components/layout-v2/TopBarV2';
import SupplierRFQs from '../SupplierRFQs';
import SupplierNegotiations from '../SupplierNegotiations';

// ─────────────────────────────────────────────────────────────────────────────
// RFx UX lane 1B — the supplier's RFQ workspace and its outcomes.
//   S-03  award history: one row per event, from the award record
//   S-04  the award reaches the supplier: card strip, To do row, bell notice
//   S-05  the round request on the RFQ's card, and a count on the menu item
// Fixtures: rfq-015 (legacy, one line) awarded 70% to sup-015 and 30% to
// sup-008, sup-007 told "not awarded"; round nr-0001 on rfq-014 open to
// sup-007 and sup-015, and sup-015 has already answered it (qt-014d-r1).
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
  // BL-213 — the bell's read marks persist in localStorage, so a test that
  // opens it would otherwise clear the badge for the next test's seat.
  resetNoticeReads();
});

/** @type {QueryScope} */
const BUYER_SCOPE = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};

/**
 * @param {string} supplierId
 * @returns {CurrentIdentity}
 */
const seat = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  supplierName: supplierId,
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
});
const SUP_007 = seat('sup-007');
const SUP_015 = seat('sup-015');

const AW_015 = () =>
  /** @type {AwardRecord} */ (awardStore.all().find((a) => a.eventId === 'rfq-015'));

/** Award rfq-014's bottle line 60/40 to sup-015 (its round-1 version) and sup-013. */
const partialOn014 = async () => {
  const svc = new MockCommandService();
  const res = await svc.dispatch(BUYER_SCOPE, {
    transitionId: 't_rfq_award_partial',
    entity: 'rfq',
    entityId: 'rfq-014',
    payload: {
      awardedQuotationId: 'qt-014d-r1',
      awardedSupplierId: 'sup-015',
      awardReason: 'Dual sourced.',
      awardLines: [
        {
          supplierId: 'sup-015',
          quotationId: 'qt-014d-r1',
          itemCode: 'PK-PETB-8802',
          sharePct: 60,
          quantity: 360_000
        },
        {
          supplierId: 'sup-013',
          quotationId: 'qt-014c',
          itemCode: 'PK-PETB-8802',
          sharePct: 40,
          quantity: 240_000
        }
      ]
    }
  });
  expect(res.status, res.reason).toBe('done');
  return svc;
};

/** @param {MockCommandService} svc */
const cancel015 = async (svc) => {
  const res = await svc.dispatch(BUYER_SCOPE, {
    transitionId: 't_rfq_award_cancel',
    entity: 'rfq',
    entityId: 'rfq-015',
    payload: { awardId: AW_015().id, cancelReason: 'Wrong split entered.' }
  });
  expect(res.status, res.reason).toBe('done');
};

const openHistory = async () => {
  fireEvent.click(await screen.findByRole('tab', { name: /Awards & history/ }));
};

describe('S-03 — award history is one row per event, from the award record', () => {
  it('the awarded supplier reads its share, the RECORD date and its own value; no win rate', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUP_015 });
    await openHistory();
    const row = await screen.findByTestId('award-row-rfq-015');
    expect(row).toHaveTextContent('Awarded · 70% of item 1');
    expect(row).toHaveTextContent(formatDate(AW_015().awardedAt));
    // 280,000 pcs at sup-015's own 1,310 — never the other winner's 30%.
    expect(row).toHaveTextContent(formatMoney(280_000 * 1_310, 'IDR'));
    expect(row).not.toHaveTextContent('30%');
    expect(row).toHaveTextContent('Follows from SAP');
    // Q7 — the win-rate tile is gone.
    expect(screen.queryByText(/win rate/i)).toBeNull();
  });

  it('a superseded quote version adds no row: rfq-014 is listed ONCE after a round-1 award', async () => {
    await partialOn014();
    renderWithProviders(<SupplierRFQs />, { identity: SUP_015 });
    await openHistory();
    await screen.findByTestId('award-row-rfq-014');
    const rows = screen.getAllByText('RFQ-2026-014');
    expect(rows).toHaveLength(1);
    const row = screen.getByTestId('award-row-rfq-014');
    expect(row).toHaveTextContent('60% of item 1');
    // The award date is the RECORD's date (recorded today), never the RFQ's
    // planned award deadline.
    const rfq = /** @type {NonNullable<ReturnType<typeof rfqStore.get>>} */ (
      rfqStore.get('rfq-014')
    );
    expect(formatDate(rfq.awardDeadline)).not.toBe(formatDate(sdcClock.now()));
    expect(row).toHaveTextContent(formatDate(sdcClock.now()));
    expect(row).not.toHaveTextContent(formatDate(rfq.awardDeadline));
  });

  it('the supplier told "not awarded" reads one Not awarded row, with no value and no share', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUP_007 });
    await openHistory();
    const row = await screen.findByTestId('award-row-rfq-015');
    expect(row).toHaveTextContent('Not awarded');
    expect(row).not.toHaveTextContent('%');
    expect(row).not.toHaveTextContent('Follows from SAP');
  });

  it('a withdrawn award reads "Award withdrawn" with the date', async () => {
    await cancel015(new MockCommandService());
    renderWithProviders(<SupplierRFQs />, { identity: SUP_015 });
    await openHistory();
    const row = await screen.findByTestId('award-row-rfq-015');
    expect(row).toHaveTextContent(/Award withdrawn · /);
    expect(row).not.toHaveTextContent('70%');
  });
});

describe('S-04 — the award reaches the supplier: the strip on the event card, and the bell', () => {
  it('the card of the awarded RFQ carries one outcome strip with the share and the SAP note', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUP_015 });
    fireEvent.click(await screen.findByRole('tab', { name: /My Quotes/ }));
    const strip = await screen.findByTestId('rfq-outcome-strip-rfq-015');
    expect(strip).toHaveTextContent('Awarded to you · 70% of item 1');
    expect(strip).toHaveTextContent('280,000');
    expect(strip).toHaveTextContent('PTI raises the purchase order in SAP');
    expect(screen.getAllByTestId('rfq-outcome-strip-rfq-015')).toHaveLength(1);
  });

  it('the bell lists the award with the PO note; a not-awarded supplier gets no award notice', async () => {
    renderWithProviders(<TopBarV2 />, { identity: SUP_015 });
    const bell = await screen.findByTestId('supplier-notice-bell');
    // sup-015 also holds a share of rfq-024 (seeded): the badge counts both,
    // and BL-213 makes that the UNREAD count, stated in the accessible name.
    await waitFor(() => expect(bell).toHaveTextContent('2'));
    expect(bell).toHaveAccessibleName('Notifications: 2 unread');
    fireEvent.click(bell);
    const notice = screen.getByTestId('supplier-notice-rfq:rfq-015:awarded');
    expect(notice).toHaveTextContent('Awarded to you · RFQ-2026-015 · 70% of item 1');
    expect(notice).toHaveTextContent('The purchase order follows from SAP');
  });

  it('KNOWN-BAD twin — sup-007 lost rfq-015, so its bell carries no award notice', async () => {
    renderWithProviders(<TopBarV2 />, { identity: SUP_007 });
    const bell = await screen.findByTestId('supplier-notice-bell');
    // BL-84 — "how many" has an answer when there are none.
    expect(bell).toHaveAccessibleName('Notifications: 0');
    fireEvent.click(bell);
    expect(await screen.findByText('No award news yet')).toBeInTheDocument();
  });

  it('after a withdrawal the bell says "Award withdrawn" with the date', async () => {
    await cancel015(new MockCommandService());
    renderWithProviders(<TopBarV2 />, { identity: SUP_015 });
    const bell = await screen.findByTestId('supplier-notice-bell');
    await waitFor(() => expect(bell).toHaveTextContent('2'));
    fireEvent.click(bell);
    expect(screen.queryByTestId('supplier-notice-rfq:rfq-015:awarded')).toBeNull();
    expect(screen.getByTestId('supplier-notice-rfq:rfq-015:withdrawn')).toHaveTextContent(
      /Award withdrawn · RFQ-2026-015 · /
    );
  });

  it('the PTI bell shows the derived buyer To-do count, never a fixed number (BL-361)', async () => {
    renderWithProviders(<TopBarV2 />);
    expect(screen.queryByTestId('supplier-notice-bell')).toBeNull();
    // BL-213 removed the fixed "3" because no buyer source existed; BL-361
    // supplies it — BuyerHome's To-do derivation — so the seeded buyer seat
    // gets a real, non-zero count and a name that states it (BL-84).
    const bell = screen.getByTestId('pti-notice-bell');
    await waitFor(() => expect(Number(bell.getAttribute('data-todo-count'))).toBeGreaterThan(0));
    // The name states the count the attribute holds, singular or plural — the
    // reads resolve over several ticks, so the assertion tracks the reading.
    const count = Number(bell.getAttribute('data-todo-count'));
    expect(bell).toHaveAccessibleName(new RegExp(`^To-do: ${count} open items?$`));
  });
});

/** Shows where a navigation landed. */
const Where = () => {
  const loc = useLocation();
  return <div data-testid="where">{`${loc.pathname}${loc.search}`}</div>;
};

describe('S-05 — the round request lives on the RFQ card, with a count on the menu', () => {
  it('an open round shows the strip with the deadline and days left, and the button opens that round', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/supplier/rfq" element={<SupplierRFQs />} />
        <Route path="/supplier/rfq/rounds" element={<Where />} />
      </Routes>,
      { identity: SUP_007, route: '/supplier/rfq' }
    );
    fireEvent.click(await screen.findByRole('tab', { name: /My Quotes/ }));
    const strip = await screen.findByTestId('rfq-round-strip-rfq-014');
    expect(strip).toHaveTextContent('PTI asked for a revised quote · Revise by');
    expect(strip).toHaveTextContent('2 days left');
    expect(strip).toHaveTextContent(/bottle price at or below 1,080/);
    fireEvent.click(within(strip).getByRole('button', { name: 'Send a revised quote' }));
    expect(await screen.findByTestId('where')).toHaveTextContent(
      '/supplier/rfq/rounds?round=nr-0001'
    );
  });

  it('KNOWN-BAD twin — a supplier that already revised reads the round as sent, with no button', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUP_015 });
    fireEvent.click(await screen.findByRole('tab', { name: /My Quotes/ }));
    const strip = await screen.findByTestId('rfq-round-strip-rfq-014');
    expect(strip).toHaveTextContent('Round 1: your revised quote is sent');
    expect(within(strip).queryByRole('button')).toBeNull();
  });

  it('the rounds page opened with ?round= is a filtered view, prefilled from the last quote', async () => {
    renderWithProviders(<SupplierNegotiations />, {
      identity: SUP_007,
      route: '/supplier/rfq/rounds?round=nr-0001'
    });
    expect(await screen.findByTestId('supplier-round-nr-0001')).toBeInTheDocument();
    expect(screen.getByTestId('supplier-rounds-show-all')).toHaveTextContent('Show all rounds');
    // The revision starts from sup-007's last price, so it can be sent as is.
    expect(/** @type {HTMLInputElement} */ (screen.getByLabelText('Unit price')).value).not.toBe(
      ''
    );
    expect(screen.getByTestId('supplier-round-submit-nr-0001')).toBeEnabled();
  });

  it('KNOWN-BAD twin — an id the read does not hold shows every round, not an empty page', async () => {
    renderWithProviders(<SupplierNegotiations />, {
      identity: SUP_007,
      route: '/supplier/rfq/rounds?round=nr-9999'
    });
    expect(await screen.findByTestId('supplier-round-nr-0001')).toBeInTheDocument();
    expect(screen.queryByTestId('supplier-rounds-show-all')).toBeNull();
  });

  it('the RFQ menu item counts the open round: "1 round"', async () => {
    renderWithProviders(<SidebarV2 />, { identity: SUP_007, route: '/supplier/home' });
    expect(await screen.findByTestId('nav-count-/supplier/rfq')).toHaveTextContent('1 round');
    // The item keeps its own accessible name.
    expect(screen.getByRole('button', { name: 'RFQ invitations' })).toBeInTheDocument();
  });
});
