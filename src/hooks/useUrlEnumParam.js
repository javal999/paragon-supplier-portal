import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// THE SHARED READ HALF OF THE DEEP-LINK PATTERN (pairs with `src/lib/deepLink.js`).
//
// `BuyerOrders.tsx` shipped this exact shape first, one-off, for its own `tab`
// param: read the query string once, and if it names a value the page
// recognises, apply it — an unknown or absent value changes nothing, so a
// plain visit from the nav (no query at all) is untouched. Every destination
// page a My Tasks item or an alert item can land on reads its tab and its
// filters through THIS hook rather than repeating that effect, so the same
// rule (whitelist-checked, ignore-if-unknown, one render's difference) governs
// all of them.
//
// It is intentionally a ONE-WAY read (address -> local state), not a
// two-way binding: a caller that later changes tabs by hand does not push a
// new history entry, so the browser back button always returns to the page
// the user clicked FROM, never to an intermediate tab the user chose after
// arriving. That is `BuyerOrders`' proven behaviour, generalised.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads `paramKey` off the current address; if it is one of `validValues`,
 * calls `setValue` with it. Returns the raw param (or `null`) so a caller can
 * also use it for something read-only (e.g. a filter banner).
 * @template {string} T
 * @param {string} paramKey
 * @param {readonly T[]} validValues
 * @param {(value: T) => void} setValue
 * @returns {string | null}
 */
export function useUrlEnumParam(paramKey, validValues, setValue) {
  const [searchParams] = useSearchParams();
  const raw = searchParams.get(paramKey);
  useEffect(() => {
    if (raw !== null && /** @type {readonly string[]} */ (validValues).includes(raw)) {
      setValue(/** @type {T} */ (raw));
    }
    // Only the param's own value should re-trigger this; `validValues` is a
    // literal array recreated every render and `setValue` is a state setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);
  return raw;
}
