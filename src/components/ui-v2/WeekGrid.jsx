/** @import * as React from 'react' */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Data from './Data';
import StatusPill from './StatusPill';
import TimeRangeToggle from './TimeRangeToggle';
import { useWeekGridView } from './weekGridView';
import { isoWeek, mondayOf } from '@services/engine/dates';
import { formatNumber } from '@lib/format';
import { combineWeeks, groupWeeksByMonth, weekHeaderDate } from '@lib/weekMonths';
/** @import { MonthCombine, MonthStatus, WeekMonth } from '@lib/weekMonths' */
/** @import { WeekGridView } from './weekGridView' */

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
//
// CAP-2 (BL-171, SC-HUB-CAPACITY-REQUIREMENTS-2026-10 §3) — a Weekly/Monthly
// toggle over the same rows. Weekly is the default; the choice is remembered
// per page (`viewKey`, BR-01). In Monthly a column is a month: the weeks whose
// Thursday falls in it (BR-02), combined as each row declares (`combine`,
// BR-03); its header names the month, its week count and its first and last
// Monday, and says "Partial" when it holds fewer weeks than the month has
// (BR-04, BR-06). Monthly is READ ONLY (BR-05, CAP-D6): no week `cell` is
// called, so no input, select or per-week action can render; an `editable`
// grid says "Switch to Weekly to edit." A month holding a gap week is tinted.
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
 * @property {MonthCombine} [combine] CAP-2 BR-03 — how the weeks combine into a month. Without it the month cell reads "—".
 * @property {(week: string, index: number) => unknown} [value] The week's raw value that `combine` reads: a number, a status key, or for `distinct` a value or a list.
 * @property {(status: string) => number} [severity] For `combine: 'status'` — higher is worse.
 * @property {(n: number) => string} [format] How a combined number is written; `formatNumber` by default.
 * @property {(value: any, month: WeekMonth) => React.ReactNode} [monthCell] Draws the combined value; for `status` it draws the worst status (the week count is added by the grid).
 * @property {React.ReactNode} [monthNote] A line under the label in Monthly only.
 * @property {React.ReactNode} [action] INV-D2 (BL-65) — a control under the label in Weekly only (Monthly is read only, BR-05).
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
 * @property {string} [viewKey] CAP-2 BR-01 — remembers the Weekly/Monthly choice under this page key.
 * @property {boolean} [editable] The weekly view takes input; Monthly then says "Switch to Weekly to edit." (BR-05).
 */

const LABEL_COL =
  'sticky left-0 z-10 w-[140px] min-w-[140px] max-w-[140px] md:w-[220px] md:min-w-[220px] md:max-w-[220px]';
const WEEK_COL = 'min-w-[112px]';

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

const DASH = <span className="text-text-tertiary">—</span>;

/**
 * `Oct 2026` for a `YYYY-MM` month, in the reader's language.
 * @param {string} key
 * @param {string} lang
 */
const monthName = (key, lang) => {
  const [y, m] = key.split('-').map(Number);
  return new Intl.DateTimeFormat(lang.startsWith('id') ? 'id-ID' : 'en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(Date.UTC(y, m - 1, 1));
};

/**
 * @param {WeekGridProps} props
 * @returns {React.ReactNode}
 */
const WeekGrid = ({
  weeks,
  rows,
  label,
  corner,
  currentWeek,
  testId,
  className = '',
  viewKey,
  editable = false
}) => {
  const { t, i18n } = useTranslation();
  /**
   * `07 Sep` for a week's Monday (G-03), in the reader's language (BL-186).
   * @param {string} iso
   */
  const shortDate = (iso) => weekHeaderDate(iso, i18n.language ?? 'en');
  const scrollRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [edges, setEdges] = useState({ left: false, right: false });
  const [view, setView] = useWeekGridView(viewKey);
  const monthly = view === 'monthly';
  const current = currentWeek ? mondayOf(currentWeek) : null;
  const shownRows = rows.filter((r) => !r.hidden);
  const months = monthly ? groupWeeksByMonth(weeks.map((c) => c.week)) : [];

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
    const head = current ? el.querySelector('thead th[data-current="true"]') : null;
    const labelCell = el.querySelector('th[data-label-col]');
    if (head instanceof HTMLElement && labelCell instanceof HTMLElement) {
      el.scrollLeft = Math.max(0, head.offsetLeft - labelCell.offsetWidth);
    }
    measure();
    // Only on first layout, when the horizon itself changes, and on a switch.
  }, [current, weeks.length, view, measure]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  /**
   * G-13 — the whole of a cell, not only its field, clear of the label column.
   * @param {HTMLElement} cell
   */
  const reveal = (cell) => {
    const el = scrollRef.current;
    const labelCell = el?.querySelector('th[data-label-col]');
    if (!el || !(labelCell instanceof HTMLElement)) return;
    const labelW = labelCell.offsetWidth;
    if (cell.offsetLeft - labelW < el.scrollLeft) el.scrollLeft = cell.offsetLeft - labelW;
    else if (cell.offsetLeft + cell.offsetWidth > el.scrollLeft + el.clientWidth)
      el.scrollLeft = cell.offsetLeft + cell.offsetWidth - el.clientWidth;
  };

  /**
   * G-13 — a focused cell is scrolled clear of the sticky label column.
   *
   * BL-186: the browser scrolls a focused field into view AFTER the focus
   * event, and that scroll knows nothing of the sticky label column, so a
   * correction made in the event was undone and the week ended under the
   * labels. The scroll container's `scroll-padding-inline-start` (the label
   * column's width) makes the browser's own scroll stop clear of it, and this
   * pass, a frame later, brings the whole cell into view.
   * @param {React.FocusEvent<HTMLDivElement>} e
   */
  const onFocus = (e) => {
    const cell = e.target instanceof HTMLElement ? e.target.closest('td') : null;
    if (!(cell instanceof HTMLElement)) return;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => reveal(cell));
    else reveal(cell);
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

  /**
   * CAP-2 — a month column's own state: gap tint and drill ring when any of its
   * weeks has them; the first per-week marker it holds.
   * @param {WeekMonth} m
   * @returns {WeekGridColumn}
   */
  const monthColumn = (m) => {
    const cols = m.indexes.map((i) => weeks[i]);
    return {
      week: m.key,
      gap: cols.some((c) => c.gap),
      drill: cols.some((c) => c.drill),
      marker: cols.find((c) => c.marker)?.marker
    };
  };

  /**
   * CAP-2 BR-03 — one row's month cell. The week `cell` is never called here,
   * so nothing the weekly view lets a user act on can render (BR-05).
   * @param {WeekGridRow} r
   * @param {WeekMonth} m
   * @returns {React.ReactNode}
   */
  const monthCellOf = (r, m) => {
    if (!r.combine) return DASH;
    const values = m.indexes.map((i) => r.value?.(weeks[i].week, i));
    const v = combineWeeks(r.combine, values, r.severity);
    if (r.combine === 'status') {
      const st = /** @type {MonthStatus} */ (v);
      if (st.worst === null) return DASH;
      return (
        <div className="flex flex-col items-start gap-1" data-worst={st.worst}>
          {r.monthCell ? r.monthCell(st.worst, m) : st.worst}
          <span className="text-xs text-text-secondary whitespace-nowrap">
            <span className="sr-only"> · </span>
            {t('weekGrid.month.weeksOf', { count: st.count, of: st.of })}
          </span>
        </div>
      );
    }
    if (r.monthCell) return r.monthCell(v, m);
    if (r.combine === 'distinct') {
      const list = /** @type {string[]} */ (v);
      return list.length ? (
        <span className="text-xs text-text-secondary break-words">{list.join(', ')}</span>
      ) : (
        DASH
      );
    }
    return typeof v === 'number' ? <Data>{(r.format ?? formatNumber)(v)}</Data> : DASH;
  };

  /** @type {{ id: WeekGridView; label: string }[]} */
  const viewOptions = [
    { id: 'weekly', label: t('weekGrid.view.weekly') },
    { id: 'monthly', label: t('weekGrid.view.monthly') }
  ];

  return (
    <div className="relative w-full min-w-0">
      {/* CAP-2 BR-01 — the toggle sits outside the table, so it never joins
          the grid's row-wise tab order (G-11). */}
      <div className="flex flex-wrap items-center justify-end gap-2 px-2 py-2">
        {monthly && editable ? (
          <p
            className="mr-auto text-xs text-text-secondary"
            data-testid={testId ? `${testId}-readonly` : undefined}
          >
            {t('weekGrid.monthlyReadOnly')}
          </p>
        ) : null}
        <div
          role="group"
          aria-label={t('weekGrid.view.label')}
          data-testid={testId ? `${testId}-view` : undefined}
        >
          <TimeRangeToggle options={viewOptions} value={view} onChange={setView} />
        </div>
      </div>
      <div
        ref={scrollRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        onScroll={measure}
        onFocus={onFocus}
        data-testid={testId ? `${testId}-scroll` : undefined}
        // G-13 (BL-186) — the browser's own focus scroll stops clear of the
        // sticky label column: the padding is that column's width.
        className={`w-full min-w-0 overflow-x-auto scroll-ps-[140px] md:scroll-ps-[220px] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action ${className}`}
      >
        <table
          // No `min-w-full`: a grid narrowed to one or two weeks (Gaps only)
          // keeps 112 px columns instead of stretching one across the card.
          className="border-separate border-spacing-0 text-sm text-text-primary"
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
                {monthly ? t('weekGrid.month.corner') : corner}
              </th>
              {monthly
                ? months.map((m) => {
                    const c = monthColumn(m);
                    const isCurrent = current !== null && m.weeks.includes(current);
                    return (
                      <th
                        key={m.key}
                        scope="col"
                        data-month={m.key}
                        data-current={isCurrent ? 'true' : undefined}
                        data-gap={c.gap ? 'true' : undefined}
                        data-partial={m.partial ? 'true' : undefined}
                        data-testid={testId ? `${testId}-month-${m.key}` : undefined}
                        className={`${columnClass(c)} ${c.gap ? '' : 'bg-bg-hover'} border-b border-border-subtle px-3 py-2 text-right align-bottom font-normal ${
                          isCurrent
                            ? 'border-t-2 border-t-action'
                            : 'border-t-2 border-t-transparent'
                        }`}
                      >
                        <div className="font-semibold whitespace-nowrap">
                          {monthName(m.key, i18n.language ?? 'en')}
                        </div>
                        <div className="text-xs text-text-secondary whitespace-nowrap">
                          {t('weekGrid.month.weeks', { count: m.weeks.length })}
                        </div>
                        <Data as="div" className="text-xs text-text-secondary">
                          {m.weeks.length > 1
                            ? `${shortDate(m.firstMonday)} – ${shortDate(m.lastMonday)}`
                            : shortDate(m.firstMonday)}
                        </Data>
                        {isCurrent ? (
                          <div className="text-xs text-action-hover whitespace-nowrap">
                            {t('weekGrid.thisMonth')}
                          </div>
                        ) : null}
                        {m.partial ? (
                          <div
                            className="mt-1"
                            data-testid={testId ? `${testId}-partial-${m.key}` : undefined}
                          >
                            <StatusPill variant="neutral">{t('weekGrid.month.partial')}</StatusPill>
                          </div>
                        ) : null}
                        {c.marker ? <div className="mt-1 [&>span]:ml-0">{c.marker}</div> : null}
                      </th>
                    );
                  })
                : weeks.map((c) => {
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
                          isCurrent
                            ? 'border-t-2 border-t-action'
                            : 'border-t-2 border-t-transparent'
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
                  {!monthly && r.action ? <div className="mt-2">{r.action}</div> : null}
                  {monthly && r.monthNote ? (
                    <span
                      className="block mt-1 text-xs font-normal text-text-tertiary break-words"
                      data-testid={testId ? `${testId}-note-${r.id}` : undefined}
                    >
                      {r.monthNote}
                    </span>
                  ) : null}
                </th>
                {monthly
                  ? months.map((m) => (
                      <td
                        key={m.key}
                        data-testid={testId ? `${testId}-${r.id}-${m.key}` : undefined}
                        className={`${columnClass(monthColumn(m))} border-b border-border-subtle px-2 py-2 align-top ${
                          (r.align ?? 'end') === 'end' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {monthCellOf(r, m)}
                      </td>
                    ))
                  : weeks.map((c, i) => (
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
