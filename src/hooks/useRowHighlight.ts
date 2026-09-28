import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HIGHLIGHT_PARAM } from '../lib/deepLink';

// ─────────────────────────────────────────────────────────────────────────────
// THE SHARED "SCROLL TO AND SELECT ONE ROW" HALF OF THE DEEP-LINK PATTERN.
//
// A destination a task or alert item names may point at one specific record
// (a single PO, invoice, alert) rather than a filtered group. This hook reads
// which row that is off the address (`?highlight=<id>`), tells the caller
// whether that id still exists in the rows it is about to render (so the
// caller can say so instead of silently showing nothing), and hands back a
// ref callback that scrolls the row into view the first time it mounts.
//
// The caller applies `HIGHLIGHTED_ROW_CLASS` / `HIGHLIGHTED_ROW_ARIA` to the
// row whose id matches `highlight.id` — the app's own `bg-action-soft` tint
// (already the "selected" background on `SubTabs`, `Tabs` and `KpiCard`), so
// no new color or style is introduced. The highlight clears itself the
// moment `highlight.id` no longer matches (tab/filter change, another row
// picked) because callers derive the applied class from `highlight.id`
// directly rather than caching it — and clears explicitly when the user
// selects a different row, via `highlight.clear()`.
// ─────────────────────────────────────────────────────────────────────────────

export const HIGHLIGHTED_ROW_CLASS = 'bg-action-soft';

export interface RowHighlight {
  /** The row id to highlight, or `null` once cleared / not applicable. */
  readonly id: string | null;
  /** `true` when the address named a row this page's data no longer has. */
  readonly missing: boolean;
  /** Attach to the target row's element; scrolls it into view once. */
  readonly scrollRef: (el: HTMLElement | null) => void;
  /** Call when the user picks a different row / changes tab or filter. */
  readonly clear: () => void;
}

/**
 * `exists` is asked against the FULL population the page can show (before
 * paging), not the currently-filtered slice — a row hidden by an active
 * filter is still "exists" here; it is the caller's job to relax the filter
 * that would otherwise hide it, the same way `BuyerOrders`' `?po=` already
 * opens its detail panel from the unfiltered order list. Only a row absent
 * from the full population is reported `missing`.
 */
export function useRowHighlight(exists: (id: string) => boolean): RowHighlight {
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get(HIGHLIGHT_PARAM);
  const [cleared, setCleared] = useState(false);
  const scrolledRef = useRef<string | null>(null);

  useEffect(() => {
    setCleared(false);
    scrolledRef.current = null;
  }, [targetId]);

  const id = cleared ? null : targetId;
  const missing = id !== null && !exists(id);
  const activeId = missing ? null : id;

  const scrollRef = (el: HTMLElement | null) => {
    if (el && activeId && scrolledRef.current !== activeId) {
      scrolledRef.current = activeId;
      el.scrollIntoView({ block: 'center' });
    }
  };

  return { id: activeId, missing, scrollRef, clear: () => setCleared(true) };
}
