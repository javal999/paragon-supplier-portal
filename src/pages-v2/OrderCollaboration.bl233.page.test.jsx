// ─────────────────────────────────────────────────────────────────────────────
// BL-233 wave 5 on the screen — order collaboration: the PO, requisition and
// goods-receipt KPIs and the supplier's goods-receipt table carry their (i),
// and the rulings hold: "Discrepancy" reads "Ketidaksesuaian" in ID, apart
// from "Difference" = "Selisih" (TL-D12 Q19).
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { textWithoutTips } from '@test/termText';
import i18n from '@lib/i18n';
import BuyerOrders from './BuyerOrders';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';
import SupplierGoodsReceipts from './SupplierGoodsReceipts';

afterEach(() => i18n.changeLanguage('en'));

const SUP_008 = { ...SUPPLIER, supplierId: 'sup-008', supplierName: 'sup-008' };

describe('BL-233 wave 5 — KPI cards', () => {
  it('/buyer/orders: the four PO KPIs carry an (i), and "In Transit" says what it counts', async () => {
    renderWithProviders(<BuyerOrders />, { route: '/buyer/orders?view=list' });
    await screen.findByText('Total Open POs');
    for (const id of ['po-open-total', 'po-pending-confirmation', 'po-in-transit', 'po-overdue'])
      expect(screen.getByTestId(`term-tip-${id}`)).toBeInTheDocument();
    expect(
      within(screen.getByTestId('term-tip-po-in-transit')).getByRole('tooltip')
    ).toHaveTextContent('POs in delivery and not yet fully delivered: partly delivered.');
  });

  it('/buyer/goods-receipt: the rejection rate gives its formula', async () => {
    renderWithProviders(<BuyerGoodsReceipt />);
    const tip = await screen.findByTestId('term-tip-gr-rejection-rate');
    expect(within(tip).getByRole('tooltip')).toHaveTextContent(
      'How it is calculated: Rejected quantity ÷ received quantity, over receipts of the last 30 days.'
    );
  });
});

describe('BL-233 wave 5 — /supplier/goods-receipts', () => {
  it('the quantity columns carry an (i); Discrepancy and Difference stay apart in ID', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<SupplierGoodsReceipts />, { identity: SUP_008 });
    const tip = await screen.findByTestId('term-tip-sup-discrepancy');
    expect(textWithoutTips(tip)).toBe('Ketidaksesuaian');
    expect(within(tip).getByRole('tooltip')).toHaveTextContent('Bukan: Selisih');
    for (const id of ['sup-shipped', 'sup-received', 'sup-rejected', 'sup-quality-result'])
      expect(screen.getByTestId(`term-tip-${id}`)).toBeInTheDocument();
  });
});
