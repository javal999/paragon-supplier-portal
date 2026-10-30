// ─────────────────────────────────────────────────────────────────────────────
// BL-233 wave 3 on the screen — the Foresight pages of MoM 1 and 2 (Goal C):
// Safety stock, Feedstock reconcile and Capacity. Every important header and
// row label carries its (i), the plain ones carry none, and the rulings hold:
// "Max Stock" and "Max Stock Supplier" (TL-D12), the team's English in ID
// (TL-D6, TL-D11).
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { textWithoutTips } from '@test/termText';
import i18n from '@lib/i18n';
import BuyerSafetyStock from './BuyerSafetyStock';
import SupplierCapacity from './SupplierCapacity';
import { BuyerFixedStockReconcile } from './FixedStockReconcile';

afterEach(() => i18n.changeLanguage('en'));

/**
 * Each header cell of `table`, as its label (without the tip) → its tip's test
 * id ('' when it has no (i)).
 * @param {HTMLElement} table
 * @param {'columnheader' | 'rowheader'} [role]
 */
const tipsOf = (table, role = 'columnheader') =>
  Object.fromEntries(
    within(table)
      .getAllByRole(role)
      .map((h) => [
        textWithoutTips(h).trim(),
        h.querySelector('[data-testid^="term-tip-"]')?.getAttribute('data-testid') ?? ''
      ])
  );

/** @param {string} testId */
const tableOf = async (testId) =>
  /** @type {HTMLElement} */ ((await screen.findByTestId(testId)).closest('table'));

describe('BL-233 wave 3 — /buyer/safety-stock', () => {
  it('the team’s ROPs and the engine challenger each carry an (i); Max reads "Max Stock"', async () => {
    renderWithProviders(<BuyerSafetyStock />, { identity: BUYER, route: '/buyer/safety-stock' });
    const table = await tableOf('sst-row-RM-STEAR-7300');
    const tips = Object.entries(tipsOf(table));
    /** @param {string} start */
    const tipOf = (start) => tips.find(([label]) => label.startsWith(start))?.[1];
    expect(tipOf('Material')).toBe('');
    expect(tipOf('Safety order (ROP Order)')).toBe('term-tip-safety-order-rop-order');
    expect(tipOf('ROP Fisik safety')).toBe('term-tip-rop-fisik-safety');
    expect(tipOf('OSIP level')).toBe('term-tip-osip-level');
    // "ROP Order" and "ROP Fisik" also start other labels, so they are found by tip.
    expect(tips.map(([, id]) => id)).toEqual(
      expect.arrayContaining(['term-tip-rop-order', 'term-tip-rop-fisik'])
    );
    expect(tipOf('Max Stock')).toBe('term-tip-max-stock');
    expect(tipOf('Reorder point')).toBe('term-tip-engine-reorder-point');
    const order = within(screen.getAllByTestId('term-tip-rop-order')[0]).getByRole('tooltip');
    expect(order).toHaveTextContent(
      'How it is calculated: LTP × lead time PO→ETA + safety order (DRC-10).'
    );
    expect(order).toHaveTextContent('Not: ROP Fisik (the call-off trigger).');
    // The four KPI cards take their titles from the glossary too.
    expect(screen.getByTestId('term-tip-space-freed')).toBeInTheDocument();
    expect(screen.getByTestId('term-tip-slt-group-default')).toBeInTheDocument();
  });

  it('reads the team’s English in Indonesian (TL-D6, TL-D11)', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerSafetyStock />, { identity: BUYER, route: '/buyer/safety-stock' });
    const table = await tableOf('sst-row-RM-STEAR-7300');
    const labels = Object.keys(tipsOf(table)).join(' | ');
    expect(labels).toContain('Safety order (ROP Order)');
    expect(labels).toContain('ROP Fisik safety');
    expect(labels).toContain('Max Stock');
    expect(labels).not.toContain('Pesanan pengaman');
    expect(labels).not.toContain('Maks');
  });
});

describe('BL-233 wave 3 — /buyer/fs-reconcile', () => {
  it('the six quantities carry an (i); Max reads "Max Stock Supplier" (TL-D12)', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    const table = await tableOf('fsr-row-sup-007|PK-PETB-8801');
    expect(tipsOf(table)).toEqual({
      Supplier: '',
      Material: '',
      'PO ordered': 'term-tip-po-ordered',
      'Called off': 'term-tip-reconcile-called-off',
      'ASN requested': 'term-tip-asn-requested',
      'Not yet called off': 'term-tip-not-yet-called-off',
      'Called off, not yet shipped': 'term-tip-called-off-not-yet-shipped',
      'Max Stock Supplier': 'term-tip-max-stock-supplier'
    });
  });
});

describe('BL-233 wave 3 — /supplier/capacity', () => {
  it('every row label of the capacity grid carries an (i)', async () => {
    renderWithProviders(<SupplierCapacity />, { identity: SUPPLIER });
    const rows = await screen.findAllByRole('rowheader');
    const bare = rows.filter((r) => r.querySelector('[data-testid^="term-tip-"]') === null);
    // Only the reason row is plain (its cells name the reason, BR-06).
    expect(bare.map((r) => textWithoutTips(r).trim()).every((l) => /^Reason\b/.test(l))).toBe(true);
    expect(rows.length - bare.length).toBeGreaterThanOrEqual(5);
  });
});
