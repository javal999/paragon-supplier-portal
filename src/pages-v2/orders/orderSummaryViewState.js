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

/** @import { Persona } from '@components/layout-v2/navConfig' */

/**
 * `search`:  The search box's text.
 * `attentionOnly`:  Whether the attention-only filter is on.
 * `scrollY`:  Window scroll offset when the user left for a destination.
 *
 * @typedef {{
 *     readonly search: string;
 *     readonly attentionOnly: boolean;
 *     readonly scrollY: number;
 *   }} OrderSummaryViewState
 */

/** @type {OrderSummaryViewState} */
export const EMPTY_VIEW_STATE = {
  search: '',
  attentionOnly: false,
  scrollY: 0
};

/**
 * @param {Persona} persona
 * @returns {string}
 */
const keyFor = (persona) => `pti-hub.order-summary.${persona}`;

/**
 * Read the stored view state. Never throws, and never returns a partial shape.
 * @param {Persona} persona
 * @returns {OrderSummaryViewState}
 */
export function readOrderSummaryViewState(persona) {
  try {
    const raw = window.sessionStorage.getItem(keyFor(persona));
    if (!raw) return EMPTY_VIEW_STATE;
    /** @type {unknown} */
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_VIEW_STATE;
    const o = /** @type {Partial<OrderSummaryViewState>} */ (parsed);
    return {
      search: typeof o.search === 'string' ? o.search : '',
      attentionOnly: o.attentionOnly === true,
      scrollY: typeof o.scrollY === 'number' && Number.isFinite(o.scrollY) ? o.scrollY : 0
    };
  } catch {
    return EMPTY_VIEW_STATE;
  }
}

/**
 * Store the view state. Never throws — a blocked store is not a page failure.
 * @param {Persona} persona
 * @param {OrderSummaryViewState} state
 * @returns {void}
 */
export function saveOrderSummaryViewState(persona, state) {
  try {
    window.sessionStorage.setItem(keyFor(persona), JSON.stringify(state));
  } catch {
    /* a viewer with site data blocked keeps a working page and loses a filter */
  }
}

/**
 * Forget the stored state — used by the specs, and by a deliberate reset.
 * @param {Persona} persona
 * @returns {void}
 */
export function clearOrderSummaryViewState(persona) {
  try {
    window.sessionStorage.removeItem(keyFor(persona));
  } catch {
    /* nothing to forget */
  }
}
