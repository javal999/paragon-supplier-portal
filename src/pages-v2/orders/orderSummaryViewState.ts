// ─────────────────────────────────────────────────────────────────────────────
// THE SUMMARY'S OWN VIEW STATE — REQ-E07-03 BR-04 / AC-06.
//
// "Back to order summary … returns the user to the summary with its filters and
// scroll position as they were." A back link alone cannot do that: the summary
// re-mounts on return (BR-12's data edge says it re-reads), so whatever the user
// had set has to be held somewhere outside the component.
//
// ⚠️ **SESSION STORAGE, NOT THE URL, AND THE CHOICE IS NOT AESTHETIC.** Putting
// the summary's filters on the destination's address would make the back link
// carry state the destination has no business knowing, and would break the
// moment a user reaches a destination from the menu instead. Putting them in a
// React context would lose them across the full page navigation the hash router
// performs. Session storage is per-tab, which is exactly the requirement's
// "the same PO open in 2 browser tabs: each behaves independently".
//
// Every access is guarded: a private window or blocked site data throws on the
// accessor itself, and a summary that cannot remember a filter must still open.
// ─────────────────────────────────────────────────────────────────────────────

import type { Persona } from '@components/layout-v2/navConfig';

export interface OrderSummaryViewState {
  /** The search box's text. */
  readonly search: string;
  /** Whether the attention-only filter is on. */
  readonly attentionOnly: boolean;
  /** Window scroll offset when the user left for a destination. */
  readonly scrollY: number;
}

export const EMPTY_VIEW_STATE: OrderSummaryViewState = {
  search: '',
  attentionOnly: false,
  scrollY: 0,
};

const keyFor = (persona: Persona): string => `pti-hub.order-summary.${persona}`;

/** Read the stored view state. Never throws, and never returns a partial shape. */
export function readOrderSummaryViewState(persona: Persona): OrderSummaryViewState {
  try {
    const raw = window.sessionStorage.getItem(keyFor(persona));
    if (!raw) return EMPTY_VIEW_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_VIEW_STATE;
    const o = parsed as Partial<OrderSummaryViewState>;
    return {
      search: typeof o.search === 'string' ? o.search : '',
      attentionOnly: o.attentionOnly === true,
      scrollY: typeof o.scrollY === 'number' && Number.isFinite(o.scrollY) ? o.scrollY : 0,
    };
  } catch {
    return EMPTY_VIEW_STATE;
  }
}

/** Store the view state. Never throws — a blocked store is not a page failure. */
export function saveOrderSummaryViewState(persona: Persona, state: OrderSummaryViewState): void {
  try {
    window.sessionStorage.setItem(keyFor(persona), JSON.stringify(state));
  } catch {
    /* a viewer with site data blocked keeps a working page and loses a filter */
  }
}

/** Forget the stored state — used by the specs, and by a deliberate reset. */
export function clearOrderSummaryViewState(persona: Persona): void {
  try {
    window.sessionStorage.removeItem(keyFor(persona));
  } catch {
    /* nothing to forget */
  }
}
