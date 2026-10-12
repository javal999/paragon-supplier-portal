/** @import * as React from 'react' */
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@lib/i18n';
import WeekGrid from './WeekGrid';

// CAP-1 wave 1 (SC-HUB-CAPACITY-WAVE1-SPEC-2026-10, section 2) — the shared
// week-as-column grid. jsdom has no layout, so stickiness, widths and the scroll
// container are pinned by the classes and roles that decide them; the
// behaviour (Enter moves along a row, hidden rows leave no row) is driven.

const WEEKS = ['2026-08-31', '2026-09-07', '2026-09-14'];

/** @param {Partial<React.ComponentProps<typeof WeekGrid>>} [over] */
const renderGrid = (over = {}) =>
  render(
    <I18nextProvider i18n={i18n}>
      <WeekGrid
        label="Capacity per week"
        corner="Week of"
        currentWeek="2026-09-02"
        testId="grid"
        weeks={WEEKS.map((week) => ({
          week,
          gap: week === '2026-09-14',
          drill: week === '2026-09-07',
          testId: `head-${week}`,
          marker: week === '2026-09-14' ? <span>Re-enter</span> : undefined
        }))}
        rows={[
          { id: 'ltp', label: 'LTP', unit: 'pcs', cell: (w) => <span>{`ltp ${w}`}</span> },
          {
            id: 'alloc',
            label: 'Allocated',
            cell: (w) => <input aria-label={`Allocated ${w}`} defaultValue="" />
          },
          { id: 'theta', label: 'Theta', hidden: true, cell: () => 'never' }
        ]}
        {...over}
      />
    </I18nextProvider>
  );

describe('WeekGrid — metrics as rows, weeks as columns', () => {
  it('is a real table: week headers are th scope=col, metric labels th scope=row (G-15)', () => {
    renderGrid();
    const table = screen.getByTestId('grid');
    const cols = within(table).getAllByRole('columnheader');
    expect(cols).toHaveLength(1 + WEEKS.length);
    cols.forEach((c) => expect(c).toHaveAttribute('scope', 'col'));
    const rowHeads = within(table).getAllByRole('rowheader');
    expect(rowHeads.map((h) => h.textContent)).toEqual(['LTP · pcs', 'Allocated']);
    rowHeads.forEach((h) => expect(h).toHaveAttribute('scope', 'row'));
    // Each value cell sits under its week's column: row 1, column 2 is W36's LTP.
    const firstRow = within(table).getAllByRole('row')[1];
    expect(within(firstRow).getAllByRole('cell')[0]).toHaveTextContent('ltp 2026-08-31');
  });

  it('header reads W<iso week> over the Monday; the current week says "This week" with the blue top border (G-03, G-04)', () => {
    renderGrid();
    const w36 = screen.getByTestId('head-2026-08-31');
    expect(w36).toHaveTextContent('W36');
    expect(w36).toHaveTextContent('31 Aug');
    expect(w36).toHaveTextContent('This week');
    expect(w36).toHaveAttribute('data-current', 'true');
    expect(w36.className).toContain('border-t-action');
    const w37 = screen.getByTestId('head-2026-09-07');
    expect(w37).toHaveTextContent('W37');
    expect(w37).not.toHaveTextContent('This week');
    expect(w37.className).not.toContain('border-t-action');
  });

  it('the label column is sticky, 220 px on desktop and 140 px under 768 px; week columns are at least 112 px (G-02, G-05)', () => {
    renderGrid();
    const corner = screen.getAllByRole('columnheader')[0];
    const label = screen.getAllByRole('rowheader')[0];
    for (const el of [corner, label]) {
      expect(el.className).toMatch(/\bsticky\b/);
      expect(el.className).toMatch(/\bleft-0\b/);
      expect(el.className).toContain('w-[140px]');
      expect(el.className).toContain('md:w-[220px]');
    }
    expect(screen.getByTestId('head-2026-09-07').className).toContain('min-w-[112px]');
  });

  it('scrolls inside its own focusable, named container — never the page (G-06, G-17)', () => {
    renderGrid();
    const region = screen.getByRole('region', { name: 'Capacity per week' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region.className).toContain('overflow-x-auto');
    expect(region.className).toContain('min-w-0');
    expect(region).toContainElement(screen.getByTestId('grid'));
  });

  it('a column state colours every cell of the column: gap = amber tint, drill = blue inset ring (G-08)', () => {
    renderGrid();
    const rows = within(screen.getByTestId('grid')).getAllByRole('row').slice(1);
    for (const row of rows) {
      const [w36, w37, w38] = within(row).getAllByRole('cell');
      expect(w38.className).toContain('bg-warning-soft');
      expect(w36.className).not.toContain('bg-warning-soft');
      expect(w37.className).toContain('inset_1px_0_0');
      expect(w36.className).not.toContain('inset_1px_0_0');
    }
    expect(screen.getByTestId('head-2026-09-14')).toHaveAttribute('data-gap', 'true');
  });

  it('a per-week marker sits in that week’s header (G-09)', () => {
    renderGrid();
    expect(screen.getByTestId('head-2026-09-14')).toHaveTextContent('Re-enter');
    expect(screen.getByTestId('head-2026-08-31')).not.toHaveTextContent('Re-enter');
  });

  it('a hidden row is not rendered at all (G-10)', () => {
    renderGrid();
    expect(screen.queryByText('Theta')).toBeNull();
    expect(screen.queryByText('never')).toBeNull();
    expect(within(screen.getByTestId('grid')).getAllByRole('row')).toHaveLength(3);
  });

  it('Tab runs along a row (DOM order) and Enter moves to the same row’s next week (G-11, G-12)', () => {
    renderGrid();
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.map((i) => i.getAttribute('aria-label'))).toEqual(
      WEEKS.map((w) => `Allocated ${w}`)
    );
    inputs[0].focus();
    fireEvent.keyDown(inputs[0], { key: 'Enter' });
    expect(document.activeElement).toBe(inputs[1]);
    fireEvent.keyDown(inputs[1], { key: 'Enter' });
    expect(document.activeElement).toBe(inputs[2]);
    // The last week has no next week in its row: focus stays.
    fireEvent.keyDown(inputs[2], { key: 'Enter' });
    expect(document.activeElement).toBe(inputs[2]);
  });

  it('"This week" is translated (EN and ID)', async () => {
    await i18n.changeLanguage('id');
    try {
      renderGrid();
      expect(screen.getByTestId('head-2026-08-31')).toHaveTextContent('Minggu ini');
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
