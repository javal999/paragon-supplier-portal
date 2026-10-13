import { useCallback, useState, useSyncExternalStore } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// CAP-2 BR-01 — the Weekly/Monthly choice of a WeekGrid, remembered per page
// for the viewer (this browser) in localStorage. Weekly is the default.
//
// Every grid on a page passes the same `viewKey`, so the several accordions on
// PTI Capacity switch together, and a page can read the view itself (supplier
// Capacity drops its refusal link in Monthly). Storage may be missing or throw
// (private mode, blocked site data): every read and write is in try/catch, and
// the choice then lasts for the session in memory.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'weekly' | 'monthly'} WeekGridView */

const PREFIX = 'paragon.weekGridView.';
/** @type {readonly WeekGridView[]} */
const VIEWS = ['weekly', 'monthly'];

const listeners = /** @type {Set<() => void>} */ (new Set());
/** Fallback when storage throws; only ever written when it does. */
const memory = /** @type {Map<string, WeekGridView>} */ (new Map());

/**
 * @param {string} key
 * @returns {WeekGridView}
 */
export function readWeekGridView(key) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === 'weekly' || raw === 'monthly') return raw;
    return memory.get(key) ?? 'weekly';
  } catch {
    return memory.get(key) ?? 'weekly';
  }
}

/**
 * @param {string} key
 * @param {WeekGridView} view
 * @returns {void}
 */
export function writeWeekGridView(key, view) {
  if (!VIEWS.includes(view)) return;
  try {
    window.localStorage.setItem(PREFIX + key, view);
    memory.delete(key);
  } catch {
    memory.set(key, view);
  }
  listeners.forEach((l) => l());
}

/**
 * @param {() => void} listener
 * @returns {() => void}
 */
const subscribe = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * The view of the grids under `key`, and its setter. Without a key the choice
 * is the grid's own state and is not remembered.
 * @param {string} [key]
 * @returns {[WeekGridView, (view: WeekGridView) => void]}
 */
export function useWeekGridView(key) {
  const [local, setLocal] = useState(/** @type {WeekGridView} */ ('weekly'));
  /** @type {WeekGridView} */
  const stored = useSyncExternalStore(
    subscribe,
    () => (key ? readWeekGridView(key) : /** @type {WeekGridView} */ ('weekly')),
    () => /** @type {WeekGridView} */ ('weekly')
  );
  const set = useCallback(
    /** @param {WeekGridView} v */
    (v) => (key ? writeWeekGridView(key, v) : setLocal(v)),
    [key]
  );
  return [key ? stored : local, set];
}
