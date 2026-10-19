// RFx UX B-02 — owner ruling 2026-10-19, "move, then trim". The board's side
// panel is a summary: status and Next, the response deadline, invited/quoted
// counts with a short supplier list, three links to the event page, the
// lifecycle acts, the award slot and the timeline. Everything a buyer evaluates
// moved to the RFQ event page: the comparison with "Move to review", the FX
// refusal, basis and record-rate dialog, and the clarifications.
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
import { mockSuppliers } from '@data/mockSuppliers';
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

/**
 * @param {CurrentIdentity} identity
 * @param {string} [route]
 */
const renderEvent = (identity, route = '/buyer/rfq/rfq-021') =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
    </Routes>,
    { identity, route }
  );

describe('B-02 — clarifications live on the event page, not the side panel', () => {
  it('the side panel no longer renders the answers or the clarifications', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: PROCUREMENT });
    fireEvent.click(await screen.findByText('RFQ-2026-021'));
    const panel = await screen.findByRole('dialog');
    await within(panel).findByTestId('panel-summary');
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

describe('B-02 — the side panel is a summary', () => {
  it('shows status, deadline, counts, supplier pills and the three links — and no comparison', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: PROCUREMENT });
    fireEvent.click(await screen.findByText('RFQ-2026-011'));
    const panel = await screen.findByRole('dialog');
    const summary = await within(panel).findByTestId('panel-summary');
    expect(within(summary).getByTestId('next-act-buyer-rfq')).toBeInTheDocument();
    expect(within(summary).getByTestId('panel-deadline')).toBeInTheDocument();
    expect(within(summary).getByTestId('panel-responses')).toHaveTextContent(
      /\d+ of \d+ invited have quoted/
    );
    expect(
      within(within(summary).getByTestId('panel-supplier-pills')).getAllByText(/./).length
    ).toBeGreaterThan(0);
    expect(within(summary).getByTestId('open-sourcing-event')).toHaveAttribute(
      'href',
      expect.stringMatching(/\/buyer\/rfq\/rfq-011$/)
    );
    expect(within(summary).getByTestId('panel-link-comparison')).toHaveAttribute(
      'href',
      expect.stringMatching(/\/buyer\/rfq\/rfq-011\?section=comparison$/)
    );
    expect(within(summary).getByTestId('panel-link-award')).toHaveAttribute(
      'href',
      expect.stringMatching(/\/buyer\/rfq\/rfq-011\?section=award$/)
    );
    // The legacy comparison and its acts are gone from the panel.
    expect(within(panel).queryByText(/Quote comparison/i)).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole('button', { name: /Move to review/i })
    ).not.toBeInTheDocument();
    expect(within(panel).queryByText('Exchange rate basis')).not.toBeInTheDocument();
    expect(within(panel).queryByTestId('fx-refusal')).not.toBeInTheDocument();
    // KNOWN-GOOD twin — the lifecycle row and the award slot stay.
    expect(within(panel).getByTestId('panel-save-template')).toBeInTheDocument();
    expect(within(panel).getByTestId('panel-tiered-award')).toBeInTheDocument();
  });

  it('the event page carries "Move to review" and the comparison the panel lost', async () => {
    renderEvent(PROCUREMENT, '/buyer/rfq/rfq-011');
    const status = await screen.findByTestId('cmp-row-status');
    expect(within(status).getByRole('button', { name: /Move to review/i })).toBeInTheDocument();
    expect(screen.getByTestId('cmp-row-sourcing.cmp.row.spread')).toBeInTheDocument();
  });
});

// Owner ruling 2026-10-19 (B-02, decision 2) — with no recorded rate the event
// page shows the BIDS with "—" scores under a banner naming each currency; it
// no longer replaces the table with one line. Display only: the ranking is
// still withheld. sup-005 is given a current halal certificate for the
// duration so rfq-009 keeps two rankable quotes (see BuyerSourcing.test.jsx).
describe('B-02 — a refused comparison still shows the bids', () => {
  const sup005 = /** @type {import('@data/mockSuppliers').SupplierExtended} */ (
    mockSuppliers.find((x) => x.id === 'sup-005')
  );
  const saved = { halalCertified: sup005.halalCertified, certExpiryDate: sup005.certExpiryDate };
  beforeEach(() => {
    sup005.halalCertified = true;
    sup005.certExpiryDate = '2027-12-31';
    quotationStore.update('qt-009a', (q) => ({ ...q, currency: 'EUR' }));
  });
  afterEach(() => {
    sup005.halalCertified = saved.halalCertified;
    sup005.certExpiryDate = saved.certExpiryDate;
  });

  it('banner names each currency; the bids stay, scored "—", with no best-scored mark', async () => {
    renderEvent(PROCUREMENT, '/buyer/rfq/rfq-009');
    const banner = await screen.findByTestId('fx-refusal');
    expect(banner).toHaveTextContent('EUR');
    expect(banner).toHaveTextContent('USD');
    const price = screen.getByTestId('cmp-row-rfx.cmp.row.unitPrice');
    expect(price).toHaveTextContent('€2.85/KG');
    expect(price).toHaveTextContent('$2.70/KG');
    expect(screen.getByTestId('cmp-row-rfx.cmp.row.priceScore')).toHaveTextContent('—');
    expect(screen.queryByText('Best scored')).not.toBeInTheDocument();
    // The basis and the act to record a rate sit under the banner.
    expect(screen.getByRole('button', { name: /Record EUR rate/ })).toBeInTheDocument();
  });
});
