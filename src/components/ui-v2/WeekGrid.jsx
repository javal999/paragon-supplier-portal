/** @import * as React from 'react' */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Data from './Data';
import { isoWeek, mondayOf } from '@services/engine/dates';
import { formatDate } from '@lib/format';

// ─────────────────────────────────────────────────────────────────────────────
// WEEK GRID — CAP-1 wave 1 (SC-HUB-CAPACITY-WAVE1-SPEC-2026-10, section 2).
//
// A time series drawn as METRICS PER ROW and WEEKS PER COLUMN, oldest on the
// left. The page passes its weeks and its row definitions; this component owns
// the layout, the scroll and the accessibility, so the three wave 1 tables
// (Demand forecast SKU detail, PTI Capacity, supplier Capacity) read the same.
//
// - G-02 the label column is sticky on the left: 220 px, 140 px under 768 px.
// - G-03 / G-04 a week header is `W<iso week>` over the Monday; the current
//   week adds "This week" and a 2 px action-blue top border.
// - G-05 week columns are at least 112 px wide.
// - G-06 the grid scrolls sideways INSIDE its own container (never the page),
//   with an edge shadow on the side that hides weeks.
// - G-07 on load the current week is the first column after the labels.
// - G-08 a column state (gap tint, drill ring) colours the whole column.
// - G-09 a per-week marker (the "Re-enter" pill) sits in the week's header.
// - G-10 a hidden row is not rendered at all, so it leaves no gap.
// - G-11 / G-12 inputs sit in DOM order row by row, so Tab runs along a row;
//   Enter in an input moves to the same row's next week.
// - G-13 a focused cell is scrolled clear of the sticky label column.
// - G-15 / G-17 a real <table>: labels are th scope=row, weeks th scope=col;
//   the scroll container is focusable and carries the table's name.
//
// No figure is computed here: every cell is what the page's `cell` returns.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One week column.
 * @typedef {object} WeekGridColumn
 * @property {string} week The week's Monday, ISO date (YYYY-MM-DD).
 * @property {boolean} [gap] G-08 — tint the whole column amber.
 * @property {boolean} [drill] G-08 — draw the 1 px action-blue inset ring.
 * @property {React.ReactNode} [marker] G-09 — shown in the header, under the date.
 * @property {string} [testId] `data-testid` of the week's header cell.
 * @property {Record<string, string | undefined>} [headerAttrs] Extra `data-*` attributes on the header cell.
 */

/**
 * One metric row.
 * @typedef {object} WeekGridRow
 * @property {string} id Stable key.
 * @property {React.ReactNode} label The metric's name (G-02).
 * @property {React.ReactNode} [unit] The unit, in grey after the name.
 * @property {boolean} [hidden] G-10 — leave the row out.
 * @property {boolean} [emphasis] Semibold label (Demand forecast's Reconciled row, A-03).
 * @property {'end' | 'start'} [align] Cell alignment; numbers are `end` (the default).
 * @property {(week: string, index: number) => React.ReactNode} cell The cell's content.
 */

/**
 * @typedef {object} WeekGridProps
 * @property {readonly WeekGridColumn[]} weeks
 * @property {readonly WeekGridRow[]} rows
 * @property {string} label The table's accessible name (G-17).
 * @property {React.ReactNode} [corner] Header text over the label column.
 * @property {string} [currentWeek] The Monday of the current week (G-04, G-07); any day of it is accepted.
 * @property {string} [testId] `data-testid` on the table.
 * @property {string} [className] Extra classes on the scroll container.
 */

const LABEL_COL =
  'sticky left-0 z-10 w-[140px] min-w-[140px] max-w-[140px] md:w-[220px] md:min-w-[220px] md:max-w-[220px]';
const WEEK_COL = 'min-w-[112px]';

/**
 * `31 Aug` for a week's Monday: the portal's own date format without the year.
 * @param {string} iso
 */
const shortDate = (iso) => formatDate(iso.slice(0, 10)).replace(/\s\d{4}$/, '');

// G-08 — a drilled-to week: a 1 px action-blue ring down both sides of every
// cell of the column, which reads as one ring around the column.
const DRILL_RING =
  'shadow-[inset_1px_0_0_theme(colors.action.DEFAULT),inset_-1px_0_0_theme(colors.action.DEFAULT)]';

/**
 * @param {WeekGridColumn} c
 * @returns {string}
 */
const columnClass = (c) =>
  [WEEK_COL, c.gap ? 'bg-warning-soft' : '', c.drill ? DRILL_RING : ''].filter(Boolean).join(' ');

/**
 * @param {WeekGridProps} props
 * @returns {React.ReactNode}
 */
const WeekGrid = ({ weeks, rows, label, corner, currentWeek, testId, className = '' }) => {
  const { t } = useTranslation();
  const scrollRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [edges, setEdges] = useState({ left: false, right: false });
  const current = currentWeek ? mondayOf(currentWeek) : null;
  const shownRows = rows.filter((r) => !r.hidden);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const left = el.scrollLeft > 0;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  // G-07 — open with the current week as the first column after the labels.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const head = current ? el.querySelector(`th[data-week="${current}"]`) : null;
    const labelCell = el.querySelector('th[data-label-col]');
    if (head instanceof HTMLElement && labelCell instanceof HTMLElement) {
      el.scrollLeft = Math.max(0, head.offsetLeft - labelCell.offsetWidth);
    }
    measure();
    // Only on first layout and when the horizon itself changes.
  }, [current, weeks.length, measure]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  /**
   * G-13 — a focused cell is scrolled clear of the sticky label column.
   * @param {React.FocusEvent<HTMLDivElement>} e
   */
  const onFocus = (e) => {
    const el = scrollRef.current;
    const cell = e.target instanceof HTMLElement ? e.target.closest('td') : null;
    const labelCell = el?.querySelector('th[data-label-col]');
    if (!el || !(cell instanceof HTMLElement) || !(labelCell instanceof HTMLElement)) return;
    const labelW = labelCell.offsetWidth;
    if (cell.offsetLeft - labelW < el.scrollLeft) el.scrollLeft = cell.offsetLeft - labelW;
    else if (cell.offsetLeft + cell.offsetWidth > el.scrollLeft + el.clientWidth)
      el.scrollLeft = cell.offsetLeft + cell.offsetWidth - el.clientWidth;
  };

  /**
   * G-12 — Enter in an input moves to the same row's next week.
   * @param {React.KeyboardEvent<HTMLTableElement>} e
   */
  const onKeyDown = (e) => {
    if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement)) return;
    let cell = e.target.closest('td')?.nextElementSibling ?? null;
    while (cell) {
      const next = cell.querySelector('input:not([disabled]), select:not([disabled])');
      if (next instanceof HTMLElement) {
        e.preventDefault();
        next.focus();
        return;
      }
      cell = cell.nextElementSibling;
    }
  };

  return (
    <div className="relative w-full min-w-0">
      <div
        ref={scrollRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        onScroll={measure}
        onFocus={onFocus}
        data-testid={testId ? `${testId}-scroll` : undefined}
        className={`w-full min-w-0 overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action ${className}`}
      >
        <table
          className="min-w-full border-separate border-spacing-0 text-sm text-text-primary"
          data-testid={testId}
          onKeyDown={onKeyDown}
        >
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>
              <th
                scope="col"
                data-label-col=""
                className={`${LABEL_COL} bg-bg-hover border-b border-border-subtle px-3 py-2 text-left align-bottom text-label text-text-tertiary uppercase ${
                  edges.left ? 'shadow-[4px_0_6px_-4px_rgba(13,27,42,0.18)]' : ''
                }`}
              >
                {corner}
              </th>
              {weeks.map((c) => {
                const isCurrent = c.week === current;
                return (
                  <th
                    key={c.week}
                    scope="col"
                    data-week={c.week}
                    data-current={isCurrent ? 'true' : undefined}
                    data-gap={c.gap ? 'true' : undefined}
                    data-testid={c.testId}
                    {...c.headerAttrs}
                    className={`${columnClass(c)} ${c.gap ? '' : 'bg-bg-hover'} border-b border-border-subtle px-3 py-2 text-right align-bottom font-normal ${
                      isCurrent ? 'border-t-2 border-t-action' : 'border-t-2 border-t-transparent'
                    }`}
                  >
                    <Data as="div" className="font-semibold">
                      {`W${isoWeek(c.week)}`}
                    </Data>
                    <Data as="div" className="text-xs text-text-secondary whitespace-nowrap">
                      {shortDate(c.week)}
                    </Data>
                    {isCurrent ? (
                      <div className="text-xs text-action-hover whitespace-nowrap">
                        {t('weekGrid.thisWeek')}
                      </div>
                    ) : null}
                    {c.marker ? <div className="mt-1 [&>span]:ml-0">{c.marker}</div> : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shownRows.map((r) => (
              <tr key={r.id} data-row={r.id}>
                <th
                  scope="row"
                  className={`${LABEL_COL} bg-bg-surface border-b border-border-subtle px-3 py-2 text-left align-top text-sm ${
                    r.emphasis ? 'font-semibold text-text-primary' : 'font-normal text-text-primary'
                  } ${edges.left ? 'shadow-[4px_0_6px_-4px_rgba(13,27,42,0.18)]' : ''}`}
                >
                  <span className="break-words">
                    {r.label}
                    {r.unit ? (
                      <span className="text-text-tertiary font-normal"> · {r.unit}</span>
                    ) : null}
                  </span>
                </th>
                {weeks.map((c, i) => (
                  <td
                    key={c.week}
                    className={`${columnClass(c)} border-b border-border-subtle px-2 py-2 align-top ${
                      (r.align ?? 'end') === 'end' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {r.cell(c.week, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edges.right ? (
        <div
          aria-hidden="true"
          data-testid={testId ? `${testId}-shadow-right` : undefined}
          className="pointer-events-none absolute inset-y-0 right-0 w-4 shadow-[inset_-8px_0_8px_-8px_rgba(13,27,42,0.25)]"
        />
      ) : null}
    </div>
  );
};

export default WeekGrid;
