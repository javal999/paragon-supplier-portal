// BL-212 — "Cancel RFQ" in the board's side panel opens a confirmation sheet:
// who is affected (invited, quoted), what closes, and that it cannot be undone.
// Nothing dispatches until the sheet's own verb is pressed.
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
/** @import { RFQ } from '@data/mockRfqs' */
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { resetRfqEngagementStores } from '@services/data/mock/stores/rfqEngagementStores';
import { sdcClock } from '@services/sdc';
import { rfqFlow } from '@services/transitions/flows/rfq.flow';
import BuyerSourcing from './index';

/** @type {CurrentIdentity} */
const PROCUREMENT = { ...BUYER, businessRoles: ['procurement'] };

beforeEach(() => {
  rfqStore.reset();
  quotationStore.reset();
  resetRfqEngagementStores();
  sdcClock.reset();
});

const status = () => /** @type {RFQ} */ (rfqStore.get('rfq-003')).status;

const openSheet = async () => {
  renderWithProviders(<BuyerSourcing />, { identity: PROCUREMENT });
  fireEvent.click(await screen.findByText('RFQ-2026-003'));
  const panel = await screen.findByRole('dialog');
  fireEvent.click(await within(panel).findByTestId('rfq-cancel'));
  return within(panel).findByTestId('rfq-cancel-sheet');
};

describe('BL-212 — the cancel sheet', () => {
  it('pressing Cancel RFQ opens the sheet and dispatches nothing', async () => {
    const sheet = await openSheet();
    const rfq = /** @type {RFQ} */ (rfqStore.get('rfq-003'));
    const quoted = new Set(quotationStore.forRfq('rfq-003').map((q) => q.supplierId)).size;
    expect(within(sheet).getByTestId('rfq-cancel-sheet-who')).toHaveTextContent(
      `${rfq.invitedSupplierIds.length} suppliers invited; ${quoted} sent a quote.`
    );
    expect(within(sheet).getByTestId('rfq-cancel-sheet-closes')).toHaveTextContent(
      'no award can be recorded'
    );
    expect(within(sheet).getByTestId('rfq-cancel-sheet-final')).toHaveTextContent(
      'This cannot be undone'
    );
    expect(status()).toBe('Open');
  });

  it('Back to edit closes the sheet and the RFQ stays Open', async () => {
    const sheet = await openSheet();
    fireEvent.click(within(sheet).getByTestId('rfq-cancel-sheet-back'));
    await waitFor(() => expect(screen.queryByTestId('rfq-cancel-sheet')).not.toBeInTheDocument());
    expect(status()).toBe('Open');
  });

  it('confirming dispatches the cancel', async () => {
    const sheet = await openSheet();
    fireEvent.click(within(sheet).getByTestId('rfq-cancel-sheet-confirm'));
    await waitFor(() => expect(status()).toBe('Cancelled'));
  });

  it('"cannot be undone" restates the flow: no RFQ verb leaves Cancelled, and cancel takes no reason', () => {
    expect(rfqFlow.transitions.filter((tr) => tr.from.includes('Cancelled'))).toEqual([]);
    const cancel = rfqFlow.transitions.find((tr) => tr.id === 't_rfq_cancel');
    expect(cancel?.requiredFields).toEqual([]);
  });
});
