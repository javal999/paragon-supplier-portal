import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Table from './Table';
// The shared table owns its horizontal scroll. jsdom has no layout, so these pin
// the classes that decide it: the wrapper is what scrolls (a card with
// `overflow-hidden` around it no longer cuts columns off), and the table itself
// keeps wrapping text. `min-w-max` on the table forced every cell onto one
// line, and tables that fit a 1440px screen on main started to scroll.
describe('Table — shared horizontal scroll container', () => {
  const renderTable = () =>
    render(
      <Table data-testid="t">
        <tbody>
          <tr>
            <td>cell</td>
          </tr>
        </tbody>
      </Table>
    );
  it('wraps the table in its own horizontally scrolling container', () => {
    renderTable();
    const wrapper = /** @type {HTMLElement} */ (screen.getByTestId('t').parentElement);
    expect(wrapper.tagName).toBe('DIV');
    expect(wrapper.className).toContain('overflow-x-auto');
    // min-w-0 lets a flex/grid parent shrink it, so the wrapper scrolls, not the page.
    expect(wrapper.className).toContain('min-w-0');
  });
  it('does not force the table to its max-content width, so cells still wrap', () => {
    renderTable();
    const table = screen.getByTestId('t');
    expect(table.className).toContain('w-full');
    expect(table.className).not.toMatch(/\bmin-w-max\b/);
  });
});
