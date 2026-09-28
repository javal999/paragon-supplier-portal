// ─────────────────────────────────────────────────────────────────────────────
// THE ONE PLACE A TASK OR ALERT ITEM'S DESTINATION URL IS ASSEMBLED.
//
// A My Tasks item and an alert item both end in a `to` string a caller
// navigates to. Building that string by hand, per item, is how one item ends
// up carrying `?tab=` and a sibling carrying `?status=` for the same concept.
// `deepLink` is the single encoder; `HIGHLIGHT_PARAM` is the one query key
// every destination page reads to find the row a caller wants scrolled into
// view and selected (see `useRowHighlight`).
// ─────────────────────────────────────────────────────────────────────────────

/** The query param a destination page's row-highlight reads (`useRowHighlight`). */
export const HIGHLIGHT_PARAM = 'highlight';

/**
 * Appends `params` to `path` as a query string, dropping any key whose value
 * is `undefined` or the empty string — so an item that has no filter for a
 * given destination does not send one, and a normal nav-menu visit to the
 * same path (no params at all) renders identically to before this feature.
 */
export function deepLink(
  path: string,
  params: Readonly<Record<string, string | undefined>> = {},
): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') q.set(key, value);
  }
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}
