// ─────────────────────────────────────────────────────────────────────────────
// BL-33 (REQ-E07-06) — a receipt with no ASN is said so, plainly, on both
// goods-receipt pages, and a receipt WITH an ASN is not.
//
// The code path was built before any sample receipt could reach it. The data
// arrived with BL-94 (58f8d09): GR-2026-018 to 021 are sup-007's call-off
// deliveries, which came with dispatch notices rather than ASNs, so they name
// none. This pins that by NAME, so a fixture edit cannot take the only example
// away in silence — the page would still render, just never the line.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { mockGoodsReceipts } from '@data/mockGoodsReceipts';
import SupplierGoodsReceipts from './SupplierGoodsReceipts';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';

describe('BL-33 — "Received without ASN" has a sample receipt to show it', () => {
  it('the data: gr-018 names no ASN, gr-015 names ASN-2026-025', () => {
    /** @param {string} id */
    const gr = (id) =>
      /** @type {import('../data/mockGoodsReceipts').GoodsReceipt} */ (
        mockGoodsReceipts.find((g) => g.id === id)
      );
    expect(gr('gr-018').asnNumber).toBe('');
    expect(gr('gr-015').asnNumber).toBe('ASN-2026-025');
  });

  it("the supplier's receipts page says it on gr-018 and not on gr-015", async () => {
    renderWithProviders(<SupplierGoodsReceipts />, { identity: SUPPLIER });
    const without = await screen.findByTestId('supplier-gr-row-gr-018');
    expect(within(without).getByTestId('gr-without-asn-gr-018')).toHaveTextContent(
      'Received without ASN'
    );
    const withAsn = screen.getByTestId('supplier-gr-row-gr-015');
    expect(within(withAsn).queryByTestId('gr-without-asn-gr-015')).toBeNull();
    // The whole set, by name: only the four receipts that name no ASN. This
    // page used to decide by whether the named ASN RESOLVED, and none of the
    // sample receipts' ASN numbers do, so it said "Received without ASN" on all
    // nine of sup-007's rows, under a printed ASN number on five of them.
    const flagged = screen
      .queryAllByTestId(/^gr-without-asn-/)
      .map((e) =>
        /** @type {NonNullable<ReturnType<typeof e.getAttribute>>} */ (
          e.getAttribute('data-testid')
        ).replace('gr-without-asn-', '')
      )
      .sort();
    expect(flagged).toEqual(['gr-018', 'gr-019', 'gr-020', 'gr-021']);
  });

  it("PTI's goods-receipt page says it on gr-018 and not on gr-015", async () => {
    renderWithProviders(<BuyerGoodsReceipt />);
    expect(await screen.findByTestId('gr-without-asn-gr-018')).toHaveTextContent(
      'Received without ASN'
    );
    expect(screen.queryByTestId('gr-without-asn-gr-015')).toBeNull();
    // Population control: gr-015 is on the page, so its absence above is real.
    expect(screen.getByText('GR-2026-015')).toBeInTheDocument();
  });
});
