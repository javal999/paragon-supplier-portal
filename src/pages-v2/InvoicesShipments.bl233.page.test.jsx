// ─────────────────────────────────────────────────────────────────────────────
// BL-233 wave 6 on the screen — invoices and shipments. The KPI cards carry
// their (i), and the rulings hold: "Returned" on the supplier side, apart from the
// buyer's "Disputed" (TL-D30), and "3-way match" on both sides
// (TL-D12 Q17, Q18), "Ketidaksesuaian" for Discrepancy in ID (Q19).
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { textWithoutTips } from '@test/termText';
import i18n from '@lib/i18n';
import SupplierInvoices from './SupplierInvoices';
import BuyerShipments from './BuyerShipments';
import SupplierShipments from './SupplierShipments';

afterEach(() => i18n.changeLanguage('en'));

describe('BL-233 wave 6 — /supplier/invoices', () => {
  it('reads "Returned", a state apart from Disputed, and "3-way match"', async () => {
    renderWithProviders(<SupplierInvoices />, { identity: SUPPLIER });
    const disputed = await screen.findByTestId('term-tip-sup-inv-disputed');
    expect(textWithoutTips(disputed)).toBe('Returned');
    expect(within(disputed).getByRole('tooltip')).toHaveTextContent('Not: Disputed');
    expect(textWithoutTips(screen.getByTestId('term-tip-sup-three-way-match'))).toBe('3-way match');
    expect(
      within(screen.getByTestId('term-tip-sup-pending-payment')).getByRole('tooltip')
    ).toHaveTextContent('submitted, verified, or scheduled for payment');
  });
});

describe('BL-233 wave 6 — shipments', () => {
  it('/buyer/shipments: "Delayed" says what it counts and what it is not', async () => {
    renderWithProviders(<BuyerShipments />);
    const tip = await screen.findByTestId('term-tip-ship-delayed');
    expect(within(tip).getByRole('tooltip')).toHaveTextContent(
      'Shipments past their expected arrival with no arrival recorded.'
    );
    expect(within(tip).getByRole('tooltip')).toHaveTextContent(
      'Not: A call-off delayed by an LTP drop'
    );
  });

  it('/supplier/shipments in Indonesian: the Discrepancy tile reads "Ketidaksesuaian"', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    const tip = await screen.findByTestId('term-tip-asn-discrepancy');
    expect(textWithoutTips(tip)).toBe('Ketidaksesuaian');
  });
});
