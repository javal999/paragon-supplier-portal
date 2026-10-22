// ────────────────────────────────────────────────────────────────────────────
// S-01 · THE SUPPLIER'S RESPONSE DRAFT, KEPT IN THIS BROWSER AS IT IS TYPED.
//
// The RFI form, the RFP form and the RFQ quote drawer held every answer in
// component state, so following a To do link or a toast threw a long form away.
// Each form now writes what the supplier typed to `localStorage` on every
// change and reads it back when the form opens again.
//
// ⚠️ **THIS IS NOT THE "SAVE DRAFT" VERB, AND THE SCREEN SAYS SO.** Nothing
// here is dispatched: PTI sees nothing until the supplier sends, and the
// server-side draft (RFI/RFP "Save draft") keeps its own button. The stamp
// reads "Draft saved 19:04 on this device".
//
// ⚠️ **THE LEAVE GUARD FIRES ONLY WHEN LEAVING WOULD LOSE WORK.** Writes are
// synchronous, so the only unsaved state is a write the browser refused
// (private mode, full storage, blocked site data). Then, and only then, the
// page asks before a reload, a tab close or a menu link takes the supplier away.
// ────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo } from 'react';

/** Every key this module writes starts with this; the test setup clears them. */
export const DRAFT_KEY_PREFIX = 'paragon.rfxResponseDraft.';

/**
 * The storage key for one form's draft.
 * @param {'rfi' | 'rfp' | 'rfq'} kind
 * @param {string} supplierId
 * @param {string} [id] -  The RFQ (and the version it revises); absent for a page-wide bundle.
 * @returns {string}
 */
export const draftKey = (kind, supplierId, id) =>
  `${DRAFT_KEY_PREFIX}${kind}.${supplierId}${id ? `.${id}` : ''}`;

/**
 * The stored draft, or `null` when there is none or it cannot be read.
 * @param {string} key
 * @returns {any}
 */
export function readDraft(key) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Write a draft. `false` when the browser refused the write.
 * @param {string} key
 * @param {unknown} value
 * @returns {boolean}
 */
export function writeDraft(key, value) {
  try {
    if (!globalThis.localStorage) return false;
    globalThis.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** @param {string} key */
export function clearDraft(key) {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Nothing to clear in a browser that keeps nothing.
  }
}

/**
 * The wall-clock time of a save, for the "Draft saved 19:04" stamp. The hub
 * clock carries a DATE, not a moving time of day, so this is the machine's
 * (allowlisted as `time-of-day`).
 * @returns {string}
 */
export function draftSavedNow() {
  return new Date().toISOString();
}

/**
 * "19:04" in Asia/Jakarta, the hub's time zone. Empty for an unreadable value.
 * @param {string | undefined} iso
 * @returns {string}
 */
export function formatSavedTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
}

/**
 * The events whose edits no longer apply: the response was sent (and is not
 * being revised) or the event closed. Their edits are not kept in this browser,
 * and an edit kept from an earlier visit is not shown on them.
 * @param {readonly { id: string; closed?: boolean; responses: readonly { status: string }[] }[]} events
 * @param {Readonly<Record<string, boolean>>} revising
 * @returns {Set<string>}
 */
export const staleDraftIds = (events, revising) =>
  new Set(
    events
      .filter((e) => e.closed || (e.responses[0]?.status === 'Submitted' && !revising[e.id]))
      .map((e) => e.id)
  );

/**
 * The event ids a kept page bundle holds an edit for.
 * @param {Record<string, unknown>} bundle
 * @returns {Set<string>}
 */
export const restoredIds = (bundle) =>
  new Set(
    Object.entries(bundle)
      .filter(([k, v]) => k !== 'revising' && k !== 'savedAt' && !!v && typeof v === 'object')
      .flatMap(([, v]) => Object.keys(/** @type {object} */ (v)))
  );

/**
 * @template T
 * @param {Readonly<Record<string, T>>} map
 * @param {Set<string>} drop
 * @returns {Record<string, T>}
 */
export const withoutIds = (map, drop) =>
  drop.size === 0
    ? { ...map }
    : Object.fromEntries(Object.entries(map).filter(([k]) => !drop.has(k)));

/**
 * Write `value` under `key` whenever it changes, and drop the key when there is
 * nothing to keep. A `null` key (no form open) touches nothing. Returns `true`
 * while the last write was refused.
 * @param {string | null} key
 * @param {unknown} value
 * @param {boolean} hasContent
 * @returns {boolean}
 */
export function useAutosave(key, value, hasContent) {
  const json = JSON.stringify(value);
  // The write is idempotent (the same bytes under the same key), so it runs
  // where its outcome is read, once per change, rather than in an effect that
  // would then have to set state to report it.
  return useMemo(() => {
    if (key === null) return false;
    if (!hasContent) {
      clearDraft(key);
      return false;
    }
    try {
      if (!globalThis.localStorage) return true;
      globalThis.localStorage.setItem(key, json);
      return false;
    } catch {
      return true;
    }
  }, [key, json, hasContent]);
}

/**
 * Ask before leaving while `active`: on reload or tab close (`beforeunload`),
 * and on a click on an in-app link (`#/…`, the HashRouter's links — the menu,
 * the To do rows). A link click the supplier cancels never reaches the router.
 * Programmatic navigation is not covered; HashRouter offers no blocker.
 * @param {boolean} active
 * @param {string} message
 */
export function useLeaveGuard(active, message) {
  useEffect(() => {
    if (!active) return undefined;
    /** @param {BeforeUnloadEvent} e */
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };
    /** @param {MouseEvent} e */
    const onClick = (e) => {
      const target = /** @type {Element | null} */ (e.target);
      const link = target?.closest?.('a[href]');
      const href = link?.getAttribute('href') ?? '';
      if (!href.startsWith('#/')) return;
      if (globalThis.confirm(message)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    globalThis.addEventListener('beforeunload', onBeforeUnload);
    globalThis.document?.addEventListener('click', onClick, true);
    return () => {
      globalThis.removeEventListener('beforeunload', onBeforeUnload);
      globalThis.document?.removeEventListener('click', onClick, true);
    };
  }, [active, message]);
}
