// ─────────────────────────────────────────────────────────────────────────────
// UCX-P7 (BL-368) · UCX-F17 — the discrepancy row shows the quantities as
// inspected and the supplier's answer; the dispute outcome is a choice the
// resolve verb requires (supplierRight / receiptStands / recount).
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { receiptDiscrepancyStore } from '@services/data/mock/stores/receiptDiscrepancyStore';
import { RECEIPT_DISPUTE_OUTCOMES } from '@services/transitions/receiptDiscrepancyRules';
import DiscrepancySection from './BuyerGoodsReceipt/components/DiscrepancySection';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';

const ASN = /** @type {any} */ ({
  asnNumber: 'ASN-T1',
  poReference: 'PO-T1',
  carrier: 'JNE',
  threePlId: null,
  trackingNumber: 'TRK-T1',
  status: 'Discrepancy'
});
const GR = /** @type {any} */ ({
  id: 'gr-t1',
  grNumber: 'GR-T1',
  asnNumber: 'ASN-T1',
  poNumber: 'PO-T1',
  inspectionResults: [
    { materialCode: 'RM-X', qtyReceived: 1000, qtyAccepted: 600, qtyRejected: 400 }
  ],
  discrepancyResponse: { status: 'Disputed', comment: 'The 400 were not shipped.' }
});

beforeEach(() => {
  receiptDiscrepancyStore.reset();
});

describe('UCX-P7 — the discrepancy row', () => {
  it('shows the quantities and the supplier’s answer', () => {
    renderWithProviders(
      <DiscrepancySection
        discrepancyAsns={[ASN]}
        goodsReceipts={[GR]}
        resolveAvailability={/** @type {any} */ ({ kind: 'held' })}
        resolving={false}
        onResolve={() => {}}
        t={i18n.t.bind(i18n)}
      />
    );
    expect(screen.getByTestId('gr-discrepancy-qty-ASN-T1-RM-X')).toHaveTextContent('shipped 1000');
    expect(screen.getByTestId('gr-discrepancy-qty-ASN-T1-RM-X')).toHaveTextContent('rejected 400');
    expect(screen.getByTestId('gr-discrepancy-answer-ASN-T1')).toHaveTextContent(
      'Supplier disputed: "The 400 were not shipped."'
    );
  });
});

describe('UCX-P7 — the dispute outcome is a choice', () => {
  it('requires an outcome and a comment, and records the outcome', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, { identity: BUYER, route: '/buyer/goods-receipt' });
    const section = await screen.findByTestId('gr-receipt-disputes', {}, { timeout: 15000 });
    fireEvent.click(within(section).getByRole('button', { name: /Resolve/ }));
    const select = await screen.findByTestId('gr-dispute-outcome', {}, { timeout: 8000 });
    expect(within(select).getAllByRole('option')).toHaveLength(
      RECEIPT_DISPUTE_OUTCOMES.length + 1 // the "Choose…" placeholder
    );
    const confirm = screen.getByRole('button', { name: 'Resolve dispute' });
    expect(confirm).toBeDisabled();
    // The comment alone is not enough: the OUTCOME is required (UCX-F17).
    fireEvent.change(screen.getByLabelText('Resolution comment for the supplier'), {
      target: { value: 'The lot references do not match the packing list.' }
    });
    expect(confirm).toBeDisabled();
    fireEvent.change(select, { target: { value: 'receiptStands' } });
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(receiptDiscrepancyStore.get('gr-016')).toMatchObject({
        status: 'Resolved',
        resolution: 'receiptStands'
      })
    );
  });
});
