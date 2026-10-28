import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import BuyerCommitments from './BuyerCommitments';
import BuyerOrderSummary from './BuyerOrderSummary';
import BuyerStockSimulation from './BuyerStockSimulation';
import BuyerInventory from './BuyerInventory';
import SupplierShipments from './SupplierShipments';

// At 1440 x 900 the columns a planner reads or acts on sat past the edge of
// five tables. Each now pins them (`components/ui-v2/pinnedColumn.js`): the
// columns that identify a row on the left, the columns a row is acted on from
// on the right. jsdom has no layout, so this pins the structure that makes it
// work: exactly the named columns are pinned, each on its side, left pins
// first and right pins last, and every body cell under a pinned header is
// pinned the same way. The 1440 px and 1024 px behaviour was checked in the
// running app.

/**
 * @param {HTMLTableElement} table
 * @param {{ left: string[], right: string[] }} expected header labels, in order
 */
const expectPins = (table, { left, right }) => {
  const headers = within(table).getAllByRole('columnheader');
  const label = (/** @type {HTMLElement} */ th) => th.textContent?.trim() ?? '';
  const pinned = (/** @type {string} */ side) =>
    headers.filter((th) => th.dataset.pin === side).map(label);
  expect(pinned('left')).toEqual(left);
  expect(pinned('right')).toEqual(right);
  // Left pins lead the pinned order and right pins end the row.
  const sides = headers.map((th) => th.dataset.pin ?? '');
  if (right.length) expect(sides.slice(-right.length)).toEqual(right.map(() => 'right'));
  const rows = [...table.querySelectorAll('tbody > tr')].filter(
    (tr) => tr.children.length === headers.length
  );
  expect(rows.length).toBeGreaterThan(0);
  for (const tr of rows) {
    const cells = /** @type {HTMLElement[]} */ ([...tr.children]);
    expect(cells.map((td) => td.dataset.pin ?? '')).toEqual(sides);
    for (const td of cells.filter((c) => c.dataset.pin)) expect(td.className).toMatch(/\bsticky\b/);
  }
};

/** @param {HTMLTableElement} table */
const expectSupplierNamesClamped = (table) => {
  const names = [...table.querySelectorAll('tbody .line-clamp-2')];
  expect(names.length).toBeGreaterThan(0);
  for (const el of names) expect(el).toHaveAttribute('title', el.textContent?.trim());
};

/** @param {string} name */
const tableOf = async (name) =>
  /** @type {HTMLTableElement} */ (
    (await screen.findByRole('columnheader', { name })).closest('table')
  );

describe('Supplier responses (/buyer/collaboration)', () => {
  it('pins #, Supplier and Material on the left and the details arrow last, on the right, and moves Zone out of the row into a keyboard-operable expander', async () => {
    renderWithProviders(<BuyerCommitments />, { identity: BUYER });
    const section = await screen.findByTestId('fc-exceptions');
    const table = /** @type {HTMLTableElement} */ (section.querySelector('table'));
    expectPins(table, { left: ['#', 'Supplier', 'Material'], right: ['Details'] });
    expect(within(table).queryByRole('columnheader', { name: /zone/i })).toBeNull();
    expectSupplierNamesClamped(table);

    const row = within(table).getAllByTestId(/^fc-exception-/)[0];
    const toggle = within(row).getByRole('button', { name: /^Show zone for / });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(row).queryByText(/^(Firm|Trade-off|Forecast)$/)).toBeNull();

    fireEvent.click(toggle);
    const open = within(row).getByRole('button', { name: /^Hide zone for / });
    expect(open).toHaveAttribute('aria-expanded', 'true');
    const details = /** @type {HTMLElement} */ (
      document.getElementById(/** @type {string} */ (open.getAttribute('aria-controls')))
    );
    expect(details.previousElementSibling).toBe(row);
    expect(within(details).getByText('Zone')).toBeInTheDocument();
    expect(within(details).getByText(/^(Firm|Trade-off|Forecast)$/)).toBeInTheDocument();

    fireEvent.click(open);
    expect(document.getElementById(details.id)).toBeNull();
  });

  it('keeps each material code on one line', async () => {
    renderWithProviders(<BuyerCommitments />, { identity: BUYER });
    const section = await screen.findByTestId('fc-exceptions');
    const code = within(section).getAllByText(/^PK-PETB-\d+$/)[0];
    expect(code.closest('td')?.className).toContain('whitespace-nowrap');
  });
});

describe('the other four tables pin the columns a row is read by', () => {
  it('Order summary: Purchase order, Supplier and Response on the left', async () => {
    renderWithProviders(<BuyerOrderSummary />, { identity: BUYER });
    const table = await tableOf('Invoices');
    expectPins(table, { left: ['Purchase order', 'Supplier', 'Response'], right: [] });
    expectSupplierNamesClamped(table);
  });

  it('Stock simulation: Material and Supplier on the left; the weekly-detail arrow last, on the right', async () => {
    renderWithProviders(<BuyerStockSimulation />, { identity: BUYER });
    const table = await tableOf('Free to call off');
    expectPins(table, { left: ['Material', 'Supplier'], right: ['Next 13 weeks'] });
    expectSupplierNamesClamped(table);
  });

  // Since the inventory UX build, Material and Supplier are one column
  // ("Material · supplier"), so that one column is pinned (rebase onto main,
  // 2026-10-28).
  it('Inventory: the Material · supplier column on the left', async () => {
    renderWithProviders(<BuyerInventory />, { identity: BUYER });
    const table = await tableOf('Incoming');
    expectPins(table, { left: ['Material · supplier'], right: [] });
    expectSupplierNamesClamped(table);
  });

  it('Supplier shipments: ASN #, PO ref and Status on the left; the expand arrow last, on the right', async () => {
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    const table = await tableOf('Actions');
    const expand = within(table).getAllByRole('columnheader').slice(-1)[0];
    expect(expand).toHaveTextContent('Expand');
    expectPins(table, { left: ['ASN #', 'PO ref', 'Status'], right: ['Expand'] });
    const firstRow = /** @type {HTMLElement} */ (table.querySelector('tbody > tr'));
    expect(
      within(/** @type {HTMLElement} */ (firstRow.lastElementChild)).getByRole('button', {
        name: /expand/i
      })
    ).toBeInTheDocument();
  });
});
