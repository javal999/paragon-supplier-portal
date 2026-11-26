// ─────────────────────────────────────────────────────────────────────────────
// UCX-P9 (BL-370) · UCX-F25 — the supplier's receipt panel reads the quantity
// check in words, and the internal code CR-25 no longer shows there. The buyer
// keeps the code on its own column header, where the rule number is the PTI
// reader's vocabulary (asserted in `termPlacement.guard.test.js`).
// ─────────────────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { textWithoutTips } from '@test/termText';
import i18n from '@lib/i18n';
import SupplierGoodsReceipts from './SupplierGoodsReceipts';

afterEach(() => i18n.changeLanguage('en'));

/** The first receipt's row, opened into the panel. */
const openFirstReceipt = async () => {
  const row = await screen.findByTestId('supplier-gr-row-gr-015');
  fireEvent.click(within(row).getByRole('button'));
  return screen.findByTestId('term-tip-gr-qty-check');
};

describe('UCX-P9 — /supplier/goods-receipts names the check, not the code', () => {
  it('the row label reads "Quantity check" and the page shows no CR-25', async () => {
    renderWithProviders(<SupplierGoodsReceipts />, { identity: SUPPLIER });
    const label = await openFirstReceipt();
    expect(textWithoutTips(label)).toBe('Quantity check');
    expect(screen.queryAllByText(/CR-25/)).toEqual([]);
  });

  it('the label carries an (i) on a grid row label (TL-D4), in Indonesian too', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<SupplierGoodsReceipts />, { identity: SUPPLIER });
    const label = await openFirstReceipt();
    expect(textWithoutTips(label)).toBe('Pemeriksaan kuantitas');
    expect(within(label).getByRole('tooltip')).toHaveTextContent(/selisih di luar toleransi PTI/i);
  });
});
