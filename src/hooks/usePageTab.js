import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUrlEnumParam } from './useUrlEnumParam';

// ─────────────────────────────────────────────────────────────────────────────
// P-12 (IA-B06) — THE TAB OF A LONG PAGE, KEPT IN THE ADDRESS AS `?tab=`.
//
// A page split into tabs reads its tab through `useUrlEnumParam`, the shared
// read half of the deep-link pattern, so a link that names a tab lands on it.
// When the address names no tab, the page may say which tab another of its
// params implies (`?status=` on Call-offs opens "To act"; `?po=` opens "All
// call-offs"), so every link that worked before the split still opens the tab
// that holds what it filters. Otherwise the first tab, the decision, opens.
//
// Choosing a tab writes `?tab=` back with `replace`, keeping every other
// param, so a reload or a copied link keeps the tab, and the browser's back
// button still returns to the page the user came FROM (useUrlEnumParam's
// rule: a tab chosen after arriving is not a history entry).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @template {string} T
 * @param {readonly T[]} tabs The page's tabs, in order; the first is the default.
 * @param {T | null} [implied] The tab another param in the address implies, if any.
 * @returns {{ tab: T; select: (next: T) => void }}
 */
export function usePageTab(tabs, implied = null) {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(() => {
    const raw = params.get('tab');
    return raw !== null && /** @type {readonly string[]} */ (tabs).includes(raw)
      ? /** @type {T} */ (raw)
      : (implied ?? tabs[0]);
  });
  useUrlEnumParam('tab', tabs, setTab);
  /** @param {T} next */
  const select = (next) => {
    setTab(next);
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        out.set('tab', next);
        return out;
      },
      { replace: true }
    );
  };
  return { tab, select };
}
