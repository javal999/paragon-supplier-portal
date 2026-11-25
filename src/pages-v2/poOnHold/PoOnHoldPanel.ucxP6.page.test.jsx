// ─────────────────────────────────────────────────────────────────────────────
// UCX-P6 (BL-367) · UCX-PD22 — the preselected PO On Hold suggestions go out
// together, each line stays editable, every line still gets its own suggestion
// before the grace ends (UCX-PG13), and the one term a source defines carries
// its visible hint and its (i).
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { BuyerFixedStockReconcile, SupplierFixedStockReconcile } from '../FixedStockReconcile';
import { poOnHoldStore } from '@services/data/mock/stores/poOnHoldStore';
import { osipParamStore } from '@services/data/mock/stores/osipParamStore';

const K = 'sup-007|PK-PETB-8801';

beforeEach(() => {
  poOnHoldStore.reset();
  osipParamStore.reset();
});

const renderBuyer = () =>
  renderWithProviders(<BuyerFixedStockReconcile />, {
    identity: BUYER,
    route: '/buyer/fs-reconcile'
  });

/** The keys of the lines whose picker shows (a suggestion can be sent). */
const pickerKeys = () =>
  screen
    .queryAllByTestId(/^poh-options-/)
    .map((el) => /** @type {string} */ (el.dataset.testid).replace('poh-options-', ''));

describe('UCX-P6 — the suggestions go out together', () => {
  it('one action sends every preselected suggestion', { timeout: 30000 }, async () => {
    renderBuyer();
    const bar = await screen.findByTestId('poh-suggest-all-bar', {}, { timeout: 15000 });
    const keys = pickerKeys();
    expect(keys.length).toBeGreaterThan(0);
    const n = Number(/\((\d+)\)/.exec(bar.textContent ?? '')?.[1]);
    expect(bar).toHaveTextContent(`Send the preselected suggestions together (${n})`);
    expect(n).toBeLessThanOrEqual(keys.length);
    fireEvent.click(screen.getByTestId('poh-suggest-all'));
    // ONE activation carries every line to Waiting for the supplier.
    for (const key of keys)
      await waitFor(() =>
        expect(screen.getByTestId(`poh-status-${key}`)).toHaveAttribute(
          'data-status',
          'awaitingSupplier'
        )
      );
    // Every line still gets its own suggestion before the grace ends (UCX-PG13).
    expect(screen.getByTestId(`poh-left-${K}`)).toHaveTextContent(/14 days left/);
  });

  it('each line stays editable: the planner’s pick is what goes, not the preselect', async () => {
    renderBuyer();
    await screen.findByTestId('poh-suggest-all-bar', {}, { timeout: 15000 });
    // The hub preselects FS + spread on this line; the planner changes it.
    expect(screen.getByTestId(`poh-option-fsSpread-${K}`)).toBeChecked();
    fireEvent.click(screen.getByTestId(`poh-option-fsOnly-${K}`));
    fireEvent.click(screen.getByTestId('poh-suggest-all'));
    await waitFor(() =>
      expect(screen.getByTestId(`poh-status-${K}`)).toHaveAttribute(
        'data-status',
        'awaitingSupplier'
      )
    );
    expect(screen.getByTestId(`poh-status-${K}`)).toHaveTextContent(
      'Suggested: Feedstock (FS) only'
    );
  });

  it('the supplier seat sees no send-all action', async () => {
    renderWithProviders(<SupplierFixedStockReconcile />, {
      identity: SUPPLIER,
      route: '/supplier/fs-reconcile'
    });
    await screen.findByTestId('poh-panel', {}, { timeout: 15000 });
    expect(screen.queryByTestId('poh-suggest-all')).toBeNull();
  });
});

describe('UCX-P6 — the terms, explained where they appear (UCX-F12)', () => {
  it('FG cap carries the visible hint and its (i); PIPO and Max PTI carry no text', async () => {
    renderBuyer();
    const terms = await screen.findByTestId('poh-terms', {}, { timeout: 15000 });
    expect(terms).toHaveTextContent('FG cap');
    expect(terms).toHaveTextContent(
      'Max PTI plus the smaller of Max Supplier and the supplier’s stock on hand, less PTI’s stock on hand, never below 0.'
    );
    // The (i) opens the glossary definition (UCX-D25, TL-D4).
    expect(screen.getByTestId('term-tip-fg-cap')).toBeInTheDocument();
    // PIPO and Max PTI wait for BL-297: no definition, so no hint here.
    expect(terms).not.toHaveTextContent('PIPO');
  });
});
