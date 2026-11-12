/** @import * as React from 'react' */
import { useLayoutEffect, useRef } from 'react';
import { placePinnedColumns } from './pinnedColumn';
// User feedback 2026-11-10 (stock simulation) — `frozenHeader`: the header row
// stays on screen while the rows scroll. A sticky header needs its scroll
// container to be the table's own wrapper (an `overflow-x` wrapper is already
// one, so it would never follow the page), so the wrapper gets a viewport-high
// cap and scrolls both ways. The header cells paint the header band, and a
// pinned header cell (the frozen corner) sits above both scrolling directions.
const FROZEN_SCROLLER = 'max-h-[calc(100vh-14rem)] overflow-y-auto';
const FROZEN_TABLE =
  '[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-[2] [&_thead_th]:bg-bg-hover [&_thead_th[data-pin]]:z-[3]';
/**
 * @param {TableProps} props
 * @returns {React.ReactNode}
 */
const Table = ({ children, className = '', scrollLabel, frozenHeader = false, ...rest }) => {
  // Shared scroll container: a table's own columns may need more room than
  // the screen provides. The table fills the width and wraps text as before;
  // only when its narrowest layout still does not fit does this wrapper
  // scroll, never the page. No `min-w-max`: an auto-layout table already
  // never shrinks below its min-content, and forcing max-content stopped every
  // cell wrapping, so tables that fit at 1440px started to scroll.
  /** @type {React.RefObject<HTMLTableElement | null>} */
  const tableRef = useRef(null);
  // Pinned columns stack by the widths of the columns pinned before them, and
  // their shadow shows only while the table overflows, so both are measured
  // here and again whenever the table resizes or its rows change. A table with
  // no pinned column returns early.
  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table || !table.querySelector('[data-pin]')) return undefined;
    const place = () => placePinnedColumns(table);
    place();
    const rows = new MutationObserver(place);
    rows.observe(table, { childList: true, subtree: true });
    const size = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    size?.observe(table);
    // The scroll container too: below the table's narrowest layout the table
    // stops shrinking, so only the container's size says it now overflows.
    if (table.parentElement) size?.observe(table.parentElement);
    // BL-304 — pins let go below half the scroll area and come back above it,
    // so a window resize or a phone rotation re-measures even where a resize
    // observer is late or absent.
    window.addEventListener('resize', place);
    return () => {
      rows.disconnect();
      size?.disconnect();
      window.removeEventListener('resize', place);
    };
  });
  return (
    <div
      role="region"
      aria-label={scrollLabel}
      tabIndex={0}
      className={`group/scroll relative w-full min-w-0 overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-inset ${frozenHeader ? FROZEN_SCROLLER : ''}`}
    >
      <table
        ref={tableRef}
        className={`w-full text-sm text-text-primary border-collapse ${frozenHeader ? FROZEN_TABLE : ''} ${className}`}
        {...rest}
      >
        {children}
      </table>
    </div>
  );
};
export default Table;
/**
 * Every native `<table>` attribute; `children` is required. `scrollLabel` names the horizontal-scroll
 * region for assistive tech (review R2). The wrapper is `tabIndex={0}` + `role="region"` unconditionally:
 * Chrome and Firefox make an overflow container keyboard-focusable on their own, but Safari doesn't, so a
 * read-only table with no focusable cells otherwise leaves off-screen columns unreachable by keyboard there.
 * @typedef {React.HTMLAttributes<HTMLTableElement> & { children: React.ReactNode, scrollLabel?: string, frozenHeader?: boolean }} TableProps
 */
