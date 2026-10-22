// BL-216 (RFX-D16) — the RFQ wizard's RFP pre-fill link (`/buyer/rfq?rfp=…`)
// opens no wizard from an Open RFP, and leaves out an option a firm-offer round
// names (as it already left out an awarded one), saying which and why.
import { screen, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import Toaster from '@components/ui-v2/Toaster';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import {
  resetRfxStores,
  rfpEventStore,
  rfpOfferRoundStore
} from '@services/data/mock/stores/rfxStores';
import { rfxNow } from '@services/data/mock/rfxReadModel';
import { sdcClock } from '@services/sdc';
import BuyerSourcingPage from './index';

/** @type {CurrentIdentity} */
const PROCUREMENT = { ...BUYER, businessRoles: ['procurement'] };

const BuyerSourcing = () => (
  <>
    <BuyerSourcingPage />
    <Toaster />
  </>
);

beforeEach(() => {
  rfqStore.reset();
  quotationStore.reset();
  resetRfxStores();
  sdcClock.reset();
});
afterEach(() => resetRfxStores());

const closeTundra = () =>
  rfpEventStore.update('rfp-002', (e) => ({ ...e, status: /** @type {const} */ ('Closed') }));
const WIZARD = /e\.g\. Q3 2026 Fragrance Sourcing/i;

describe('BL-216 — the RFP pre-fill link', () => {
  it('KNOWN-BAD — an Open RFP opens no wizard and says to close it first', async () => {
    renderWithProviders(<BuyerSourcing />, {
      identity: PROCUREMENT,
      route: '/buyer/rfq?rfp=rfp-002&options=opt-pump-cap'
    });
    expect(await screen.findByText('Close the RFP first')).toBeInTheDocument();
    expect(screen.getByText(/RFP-2026-002 is still Open/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(WIZARD)).not.toBeInTheDocument();
  });

  it('KNOWN-GOOD — a Closed RFP opens the wizard with the options asked for, and no left-out notice', async () => {
    closeTundra();
    renderWithProviders(<BuyerSourcing />, {
      identity: PROCUREMENT,
      route: '/buyer/rfq?rfp=rfp-002&options=opt-full-set,opt-pump-cap'
    });
    await screen.findByPlaceholderText(WIZARD);
    expect(screen.getByLabelText('Total quantity')).toHaveValue('20000');
    expect(screen.queryByText('Some options were left out')).not.toBeInTheDocument();
  });

  it('an option a firm-offer round names is left out of the pre-fill, and the toast names it with its round', async () => {
    closeTundra();
    rfpOfferRoundStore.add({
      id: 'rfr-bl216',
      rfpId: 'rfp-002',
      roundNumber: 1,
      optionRefs: ['opt-full-set'],
      quantityPoints: [10_000],
      invitedSupplierIds: ['sup-007'],
      deadline: rfxNow(),
      openedAt: rfxNow()
    });
    renderWithProviders(<BuyerSourcing />, {
      identity: PROCUREMENT,
      route: '/buyer/rfq?rfp=rfp-002&options=opt-full-set,opt-pump-cap'
    });
    await screen.findByPlaceholderText(WIZARD);
    // One option left, one item: the first break alone (10,000 × 1).
    expect(screen.getByLabelText('Total quantity')).toHaveValue('10000');
    const toast = /** @type {HTMLElement} */ (
      (await screen.findByText('Some options were left out')).parentElement
    );
    expect(within(toast).getByText(/in firm-offer round 1/)).toBeInTheDocument();
  });
});
