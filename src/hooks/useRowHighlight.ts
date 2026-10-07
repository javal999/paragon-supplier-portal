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
// The caller applies `HIGHLIGHTED_ROW_CLASS` to the row whose id matches
// `highlight.id` — the app's own `bg-action-soft` tint (already the
// "selected" background on `SubTabs`, `Tabs` and `KpiCard`), so no new color
// or style is introduced. A plain `<table>`'s rows carry the implicit ARIA
// `row` role, not `gridcell`/`option`/`tab`, so `aria-selected` is not valid
// on them — callers use `aria-current="true"` instead. The highlight clears
// itself the moment `highlight.id` no longer matches (tab/filter change,
// another row picked, `?highlight=` removed) because callers derive the
// applied class from `highlight.id` directly rather than caching it; it also
// clears on its own `AUTO_CLEAR_MS` after being shown, so the tint does not
// sit on the row forever once the user has moved on, and explicitly via
// `highlight.clear()` when a caller wants to clear it sooner (e.g. the user
// picks a different row).
// ─────────────────────────────────────────────────────────────────────────────

export const HIGHLIGHTED_ROW_CLASS = 'bg-action-soft';

/** How long a row stays highlighted before it clears itself. */
export const AUTO_CLEAR_MS = 6000;

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

  useEffect(() => {
    if (activeId === null) return;
    const timer = setTimeout(() => setCleared(true), AUTO_CLEAR_MS);
    return () => clearTimeout(timer);
  }, [activeId]);

  const scrollRef = (el: HTMLElement | null) => {
    if (el && activeId && scrolledRef.current !== activeId) {
      scrolledRef.current = activeId;
      el.scrollIntoView({ block: 'center' });
    }
  };

  return { id: activeId, missing, scrollRef, clear: () => setCleared(true) };
}
