import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Table from './Table';
import TableHeader, { TableHeaderCell } from './TableHeader';
import TableRow from './TableRow';
import TableCell from './TableCell';
import { RowExpanderToggle, RowExpansion } from './RowExpander';

// jsdom has no layout, so these pin the parts of a pinned column that are not
// layout: which cells carry the sticky classes, which pinned column is the
// edge on each side (the one that carries the divider and the shadow), that
// the scroll container reports whether the table overflows it (the shadow's
// switch), and that the row expander states its state. The offsets
// themselves are widths, and were checked in the running app.

const renderPinnedTable = () =>
  render(
    <Table data-testid="t">
      <TableHeader>
        <TableHeaderCell pin="left">Code</TableHeaderCell>
        <TableHeaderCell pin="left">Supplier</TableHeaderCell>
        <TableHeaderCell>Quantity</TableHeaderCell>
        <TableHeaderCell pin="right">Action</TableHeaderCell>
        <TableHeaderCell pin="right">More</TableHeaderCell>
      </TableHeader>
      <tbody>
        <TableRow>
          <TableCell pin="left" data-testid="code">
            A-1
          </TableCell>
          <TableCell pin="left" data-testid="supplier">
            PT Sample
          </TableCell>
          <TableCell data-testid="plain">10</TableCell>
          <TableCell pin="right" data-testid="action">
            <button type="button">Accept</button>
          </TableCell>
          <TableCell pin="right" data-testid="more">
            &gt;
          </TableCell>
        </TableRow>
      </tbody>
    </Table>
  );

describe('pinned columns — the shared Table cells', () => {
  it('sticks pinned body cells on the row background, and leaves other cells alone', () => {
    renderPinnedTable();
    for (const id of ['code', 'supplier', 'action', 'more']) {
      const cell = screen.getByTestId(id);
      expect(cell.className).toMatch(/\bsticky\b/);
      expect(cell.className).toContain('bg-bg-surface');
      expect(cell.className).toContain('group-hover/row:bg-bg-hover');
      expect(cell.className).toContain('group-[.bg-action-soft]/row:bg-action-soft');
    }
    // Known-good twin: an ordinary cell is not pinned.
    expect(screen.getByTestId('plain').className).not.toMatch(/\bsticky\b/);
    expect(screen.getByTestId('plain')).not.toHaveAttribute('data-pin');
  });

  it('pins header cells on the header band', () => {
    renderPinnedTable();
    const th = screen.getByRole('columnheader', { name: 'Action' });
    expect(th.className).toMatch(/\bsticky\b/);
    expect(th.className).toContain('bg-bg-hover');
    expect(screen.getByRole('columnheader', { name: 'Quantity' }).className).not.toMatch(
      /\bsticky\b/
    );
  });

  it('marks the pinned column nearest the scrolling columns as the edge, on each side', () => {
    renderPinnedTable();
    expect(screen.getByTestId('code')).toHaveAttribute('data-pin-edge', 'false');
    expect(screen.getByTestId('supplier')).toHaveAttribute('data-pin-edge', 'true');
    expect(screen.getByTestId('action')).toHaveAttribute('data-pin-edge', 'true');
    expect(screen.getByTestId('more')).toHaveAttribute('data-pin-edge', 'false');
    // Each side is offset from its own edge.
    expect(screen.getByTestId('code').style.left).toBe('0px');
    expect(screen.getByTestId('more').style.right).toBe('0px');
    expect(screen.getByTestId('action').style.right).not.toBe('');
  });

  it('makes each row a named group, so a pinned cell can follow the row hover and highlight', () => {
    renderPinnedTable();
    expect(screen.getByTestId('action').closest('tr')?.className).toContain('group/row');
  });

  it('casts each edge shadow toward the scrolling columns: right of the left pins, left of the right pins', () => {
    renderPinnedTable();
    const shadow = 'group-data-[overflow=true]/scroll:data-[pin-edge=true]:shadow-';
    expect(screen.getByTestId('supplier').className).toContain(`${shadow}[4px_0`);
    expect(screen.getByTestId('action').className).toContain(`${shadow}[-4px_0`);
  });

  it('switches the shadow on whenever the table overflows, at any scroll position, and off when it fits', async () => {
    renderPinnedTable();
    const table = /** @type {HTMLTableElement} */ (screen.getByTestId('t'));
    const wrapper = /** @type {HTMLElement} */ (table.parentElement);
    expect(wrapper.className).toContain('group/scroll');
    // Known-good twin first: jsdom has no layout, so the table fits and there
    // is nothing to scroll to.
    expect(wrapper).toHaveAttribute('data-overflow', 'false');
    Object.defineProperty(wrapper, 'scrollWidth', { configurable: true, value: 900 });
    Object.defineProperty(wrapper, 'clientWidth', { configurable: true, value: 500 });
    // A row change re-measures.
    table.tBodies[0].appendChild(document.createElement('tr'));
    await waitFor(() => expect(wrapper).toHaveAttribute('data-overflow', 'true'));
    // Scrolling to either end does not switch it off.
    wrapper.scrollLeft = 400;
    fireEvent.scroll(wrapper);
    expect(wrapper).toHaveAttribute('data-overflow', 'true');
  });
});

describe('RowExpander — the shared row expander', () => {
  /** @param {boolean} open */
  const renderExpander = (open) => {
    /** @type {string[]} */
    const calls = [];
    render(
      <table>
        <tbody>
          <tr>
            <td>
              <RowExpanderToggle
                open={open}
                onToggle={() => calls.push('toggle')}
                label="Show zone for row 1"
                controls="row-1-details"
              />
            </td>
          </tr>
          {open ? (
            <RowExpansion
              id="row-1-details"
              colSpan={3}
              fields={[{ key: 'zone', label: 'Zone', value: 'Firm' }]}
            />
          ) : null}
        </tbody>
      </table>
    );
    return calls;
  };

  it('is a button that states it is collapsed, and controls nothing while closed', () => {
    const calls = renderExpander(false);
    const button = screen.getByRole('button', { name: 'Show zone for row 1' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).not.toHaveAttribute('aria-controls');
    fireEvent.click(button);
    expect(calls).toEqual(['toggle']);
  });

  it('states it is expanded and points at the row it opened, which keeps each value with its label', () => {
    renderExpander(true);
    const button = screen.getByRole('button', { name: 'Show zone for row 1' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', 'row-1-details');
    const row = /** @type {HTMLElement} */ (document.getElementById('row-1-details'));
    expect(row.tagName).toBe('TR');
    expect(row.querySelector('td')).toHaveAttribute('colspan', '3');
    expect(row.querySelector('dt')).toHaveTextContent('Zone');
    expect(row.querySelector('dd')).toHaveTextContent('Firm');
  });
});
