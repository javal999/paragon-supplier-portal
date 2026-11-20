/** @import * as React from 'react' */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('BL-186 (G-03) — the header date is day + 3-letter month: "07 Sep" in EN, Indonesian months in ID', async () => {
    const en = renderGrid();
    expect(screen.getByTestId('head-2026-09-07')).toHaveTextContent(/^W3707 Sep$/);
    expect(screen.getByTestId('head-2026-09-07')).not.toHaveTextContent('Sept');
    en.unmount();
    await i18n.changeLanguage('id');
    try {
      const r = renderGrid({ currentWeek: undefined });
      expect(r.getByTestId('head-2026-08-31')).toHaveTextContent(/^W3631 Agu$/);
      expect(r.getByTestId('head-2026-09-07')).toHaveTextContent(/^W3707 Sep$/);
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('BL-186 (G-13) — a focused cell ends fully clear of the sticky label column, after the browser’s own focus scroll', async () => {
    renderGrid();
    const region = screen.getByRole('region', { name: 'Capacity per week' });
    // jsdom has no layout: give the grid the geometry of a 375 px screen —
    // a 140 px label column, 112 px weeks, a 335 px wide scroll container
    // scrolled to its right end.
    const labelCell = /** @type {HTMLElement} */ (region.querySelector('th[data-label-col]'));
    Object.defineProperty(labelCell, 'offsetWidth', { configurable: true, value: 140 });
    Object.defineProperty(region, 'clientWidth', { configurable: true, value: 335 });
    Object.defineProperty(region, 'scrollLeft', { configurable: true, writable: true, value: 600 });
    const input = screen.getByLabelText('Allocated 2026-09-07');
    const cell = /** @type {HTMLElement} */ (input.closest('td'));
    Object.defineProperty(cell, 'offsetLeft', { configurable: true, value: 252 });
    Object.defineProperty(cell, 'offsetWidth', { configurable: true, value: 112 });
    // The scroll padding the browser's own focus scroll keeps clear: the label
    // column's width, 140 px under 768 px and 220 px from there.
    expect(region.className).toContain('scroll-ps-[140px]');
    expect(region.className).toContain('md:scroll-ps-[220px]');
    input.focus();
    // W37 starts 252 px into the table, right after W36 (140 + 112): it is
    // clear of the 140 px label column when 112 px are scrolled away.
    await waitFor(() => expect(region.scrollLeft).toBe(112));
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

// CAP-2 (BL-171, SC-HUB-CAPACITY-REQUIREMENTS-2026-10 §3) — the Weekly/Monthly
// toggle. Weeks 31 Aug (→ Sep), 28 Sep and 5 Oct (→ Oct): two partial months.
describe('WeekGrid — Monthly view (CAP-2)', () => {
  const MONTH_WEEKS = ['2026-08-31', '2026-09-28', '2026-10-05'];

  /** @param {{ cell: (w: string) => React.ReactNode }} spy */
  const renderMonthly = (spy) =>
    render(
      <I18nextProvider i18n={i18n}>
        <WeekGrid
          label="Capacity per week"
          corner="Week of"
          currentWeek="2026-10-07"
          testId="grid"
          editable
          weeks={MONTH_WEEKS.map((week) => ({ week, gap: week === '2026-09-28' }))}
          rows={[
            {
              id: 'ltp',
              label: 'LTP',
              combine: 'sum',
              value: (_w, i) => [10, 20, 30][i],
              cell: (w) => spy.cell(w)
            },
            {
              id: 'alloc',
              label: 'Allocated',
              cell: (w) => <input aria-label={`Allocated ${w}`} defaultValue="" />
            },
            {
              id: 'check',
              label: 'Check',
              combine: 'status',
              value: (_w, i) => ['within', 'red', 'within'][i],
              severity: (s) => (s === 'red' ? 1 : 0),
              monthNote: 'worst week',
              cell: () => 'never'
            }
          ]}
        />
      </I18nextProvider>
    );

  it('Weekly is the default; Monthly groups by the Thursday rule and never calls a week cell (BR-02, BR-05)', () => {
    const spy = { cell: vi.fn((w) => `ltp ${w}`) };
    renderMonthly(spy);
    expect(screen.getByRole('button', { name: /Weekly/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
    spy.cell.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /Monthly/ }));
    expect(spy.cell).not.toHaveBeenCalled();
    const table = screen.getByTestId('grid');
    expect(
      [...table.querySelectorAll('thead th[data-month]')].map((h) => h.getAttribute('data-month'))
    ).toEqual(['2026-09', '2026-10']);
    expect(table.querySelectorAll('input, select')).toHaveLength(0);
    // BR-03 — sum per month; a row with no `combine` reads "—".
    expect(screen.getByTestId('grid-ltp-2026-09')).toHaveTextContent('10');
    expect(screen.getByTestId('grid-ltp-2026-10')).toHaveTextContent('50');
    expect(screen.getByTestId('grid-alloc-2026-10')).toHaveTextContent('—');
    expect(screen.getByTestId('grid-check-2026-10')).toHaveTextContent('red · 1 of 2 wk');
    expect(screen.getByTestId('grid-note-check')).toHaveTextContent('worst week');
    expect(screen.getByTestId('grid-readonly')).toHaveTextContent('Switch to Weekly to edit.');
  });

  it('a month header names the month, its weeks and Mondays, marks partial and the current month; a gap week tints it (BR-04, BR-06)', () => {
    renderMonthly({ cell: () => null });
    fireEvent.click(screen.getByRole('button', { name: /Monthly/ }));
    const oct = screen.getByTestId('grid-month-2026-10');
    expect(oct).toHaveTextContent('Oct 2026');
    expect(oct).toHaveTextContent('2 wk');
    // BL-186 — the grid's own short date: `Sep`, never the portal's `Sept`.
    expect(oct).toHaveTextContent('28 Sep – 05 Oct');
    expect(oct).not.toHaveTextContent('Sept');
    expect(oct).toHaveTextContent('This month');
    expect(oct).toHaveAttribute('data-current', 'true');
    expect(oct).toHaveAttribute('data-partial', 'true');
    expect(screen.getByTestId('grid-partial-2026-10')).toHaveTextContent('Partial');
    expect(oct).toHaveAttribute('data-gap', 'true');
    expect(screen.getByTestId('grid-ltp-2026-10').className).toContain('bg-warning-soft');
    const sep = screen.getByTestId('grid-month-2026-09');
    expect(sep).not.toHaveAttribute('data-gap');
    expect(sep).not.toHaveAttribute('data-current');
  });

  it('the toggle and the month header are translated (ID)', async () => {
    await i18n.changeLanguage('id');
    try {
      renderMonthly({ cell: () => null });
      fireEvent.click(screen.getByRole('button', { name: /Bulanan/ }));
      expect(screen.getByRole('group', { name: 'Tampilan' })).toBeInTheDocument();
      expect(screen.getByTestId('grid-month-2026-10')).toHaveTextContent('Bulan ini');
      expect(screen.getByTestId('grid-readonly')).toHaveTextContent('Beralih ke Mingguan');
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('a column marked `danger` tints the header and every cell of the column red', () => {
    renderGrid({
      weeks: [
        { week: '2026-08-31', testId: 'head-2026-08-31' },
        { week: '2026-09-07', danger: true, testId: 'head-2026-09-07' },
        { week: '2026-09-14', testId: 'head-2026-09-14' }
      ],
      currentWeek: undefined
    });
    expect(screen.getByTestId('head-2026-09-07').className).toContain('bg-danger-soft');
    expect(screen.getByTestId('head-2026-08-31').className).not.toContain('bg-danger-soft');
    const cells = [...screen.getByTestId('grid').querySelectorAll('tbody tr[data-row] td')];
    // 3 weeks × 2 shown rows, in DOM order: cells 1 and 4 are the middle week's.
    expect(cells[1].className).toContain('bg-danger-soft');
    expect(cells[4].className).toContain('bg-danger-soft');
    expect(cells[0].className).not.toContain('bg-danger-soft');
  });
});

// CAP-2 BR-07 (BL-343 wave 3) — a table whose horizon is weeks THEN months
// marks its month periods `month: true`: Monthly shows exactly those columns,
// headed by the month, and the page's own `cell` draws them (so a month period
// keeps its inputs). Weekly shows only the weeks.
describe('WeekGrid — the table’s own month columns (CAP-2 BR-07)', () => {
  const renderOwnMonths = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <WeekGrid
          label="Commitments"
          corner="Period"
          currentWeek="2026-11-02"
          testId="grid"
          editable
          weeks={[
            { week: '2026-10-26', testId: 'head-2026-10-26' },
            { week: '2026-11-02', testId: 'head-2026-11-02' },
            { week: '2026-12', month: true, testId: 'head-2026-12' },
            { week: '2027-01', month: true, testId: 'head-2027-01' }
          ]}
          rows={[
            {
              id: 'qty',
              label: 'Commitment',
              cell: (period) =>
                period.length === 7 ? (
                  <input aria-label={`Commitment ${period}`} defaultValue="" />
                ) : (
                  <span>{`qty ${period}`}</span>
                )
            }
          ]}
        />
      </I18nextProvider>
    );

  it('Weekly shows the weeks only; Monthly the months only, from the page’s own cell', () => {
    renderOwnMonths();
    const table = screen.getByTestId('grid');
    expect(
      [...table.querySelectorAll('thead th[data-week]')].map((h) => h.getAttribute('data-week'))
    ).toEqual(['2026-10-26', '2026-11-02']);
    expect(table.querySelectorAll('thead th[data-month]')).toHaveLength(0);
    expect(screen.getByText('qty 2026-11-02')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Monthly/ }));
    expect(
      [...table.querySelectorAll('thead th[data-month]')].map((h) => h.getAttribute('data-month'))
    ).toEqual(['2026-12', '2027-01']);
    expect(table.querySelectorAll('thead th[data-week]')).toHaveLength(0);
    // The month header names the month alone: no week count, no Partial mark,
    // because the month is the period, not a grouping of weeks.
    const dec = screen.getByTestId('head-2026-12');
    expect(dec).toHaveTextContent('Dec 2026');
    expect(dec).not.toHaveTextContent(/wk/);
    expect(dec).not.toHaveAttribute('data-partial');
    expect(table.querySelectorAll('[data-testid^="grid-partial-"]')).toHaveLength(0);
    expect(screen.queryByText('Partial')).toBeNull();
    // The page's own month cell renders — inputs and all — so a month period
    // can still be committed; and `editable` prints no "Switch to Weekly" line.
    expect(screen.getByLabelText('Commitment 2026-12')).toBeInTheDocument();
    expect(screen.getByLabelText('Commitment 2027-01')).toBeInTheDocument();
    expect(screen.queryByTestId('grid-readonly')).toBeNull();
    // The corner keeps the page's own word for the label column.
    expect(table.querySelector('th[data-label-col]')).toHaveTextContent('Period');
    // Back to Weekly: the two weeks return, the months go.
    fireEvent.click(screen.getByRole('button', { name: /Weekly/ }));
    expect(table.querySelectorAll('thead th[data-month]')).toHaveLength(0);
    expect(screen.getByText('qty 2026-10-26')).toBeInTheDocument();
  });
});
