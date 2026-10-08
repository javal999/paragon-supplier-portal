/** @import { Persona } from './navConfig' */
/** @import { HubRole } from './hubRole' */
import { UTILITY_NAV, navFor } from './navConfig';

// ─────────────────────────────────────────────────────────────────────────────
// What the top bar search can find — the viewer's own menu, nothing else.
//
// The portal has no search API and no page index, so the search reads the same
// lists the sidebar (`navFor`) and the user menu (`UTILITY_NAV`) render. A page
// added to or removed from the menu is added to or removed from the search with
// no second list to keep in step, and a viewer can never find a page their own
// menu does not show them.
// ─────────────────────────────────────────────────────────────────────────────

/** The category the user-menu pages are listed under (the user menu's own heading). */
export const UTILITY_CATEGORY_KEY = 'hub.nav.util.title';

/**
 * @typedef {{
 *     readonly labelKey: string;
 *     readonly categoryKey: string;
 *     readonly path: string;
 *   }} SearchEntry
 */

/**
 * @typedef {{
 *     readonly label: string;
 *     readonly category: string;
 *     readonly path: string;
 *   }} SearchResult
 */

/**
 * Every page the viewer's menus link to, in menu order. A route listed in two
 * sections (`/buyer/scorecard` for a seat that sees both Review and
 * Performance) is listed once, under the first section — the one
 * `sectionForPath` names in the page header.
 * @param {Persona} persona
 * @param {HubRole} role
 * @returns {SearchEntry[]}
 */
export function searchEntriesFor(persona, role) {
  /** @type {SearchEntry[]} */
  const entries = [];
  const seen = new Set();
  /**
   * @param {string} categoryKey
   * @param {{ labelKey: string; path: string }} item
   */
  const add = (categoryKey, item) => {
    if (seen.has(item.path)) return;
    seen.add(item.path);
    entries.push({ labelKey: item.labelKey, categoryKey, path: item.path });
  };
  for (const section of navFor(persona, role)) {
    for (const item of section.items) add(section.labelKey, item);
  }
  for (const item of UTILITY_NAV[persona]) add(UTILITY_CATEGORY_KEY, item);
  return entries;
}

/**
 * The entries whose translated label contains `query`, case-insensitively, in
 * menu order. A blank query matches nothing (the dropdown is closed then).
 * @param {readonly SearchEntry[]} entries
 * @param {string} query
 * @param {(key: string) => string} t
 * @returns {SearchResult[]}
 */
export function matchEntries(entries, query, t) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return entries
    .map((e) => ({ label: t(e.labelKey), category: t(e.categoryKey), path: e.path }))
    .filter((r) => r.label.toLowerCase().includes(needle));
}

/**
 * Groups results under their category, keeping the order categories first
 * appear in. `index` is each result's position in DISPLAY order (group by
 * group), which is what the arrow keys walk; `ordered` is that same list flat.
 * @param {readonly SearchResult[]} results
 * @returns {{
 *   groups: { category: string; items: { result: SearchResult; index: number }[] }[];
 *   ordered: SearchResult[];
 * }}
 */
export function groupByCategory(results) {
  /** @type {Map<string, SearchResult[]>} */
  const byCategory = new Map();
  for (const result of results) {
    const items = byCategory.get(result.category) ?? [];
    items.push(result);
    byCategory.set(result.category, items);
  }
  /** @type {SearchResult[]} */
  const ordered = [];
  const groups = [...byCategory].map(([category, items]) => ({
    category,
    items: items.map((result) => {
      ordered.push(result);
      return { result, index: ordered.length - 1 };
    })
  }));
  return { groups, ordered };
}
