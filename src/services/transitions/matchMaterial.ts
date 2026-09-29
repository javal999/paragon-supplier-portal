// ────────────────────────────────────────────────────────────────────────────
// Material C3 · ONE MATERIAL SEARCH (MR-3 BR-04, AC-02, AC-04).
//
// One pure rule decides whether a typed query finds a material, on what, and
// how well. Every page that searches materials uses it through `MaterialSearch`
// (components/ui-v2), so the inventory list, stock entry, ASN lines, call-offs
// and alerts cannot drift apart.
//
//   - Case, accents, punctuation and extra spaces are ignored.
//   - Every word typed must match, in any order, within one field (the PTI
//     code, PTI's description, or one approved trade name), so the match
//     reason names exactly one thing.
//   - A word of 5 or more characters (the word in the name, as AC-04 counts
//     it: "1 typo in a 9-character word") may be typed with 1 typo (insert, delete,
//     replace, or swap of two neighbours).
//   - Rank: the exact code first, then full-word matches, then part-word
//     matches (a word typed only partly, as the old `includes()` filters
//     allowed), then typo matches. Lower rank is better.
//   - Only APPROVED trade names are searched (AC-02). The names passed in are
//     already narrowed to what the reader may see (MAT-R4): a supplier's list
//     holds its own names only (`materialNamesFor`). An entry that belongs to
//     one supplier (a stock row, a call-off) is matched on that supplier's name
//     only, so a row never says it matched another supplier's name.
// ────────────────────────────────────────────────────────────────────────────

import type { SupplierMaterialName } from '../data/types';

export type MaterialMatchOn = 'code' | 'description' | 'tradeName';

/** Lower is better. */
export const MATCH_RANK = { exactCode: 0, fullWord: 1, partWord: 2, typo: 3 } as const;
export type MatchRank = (typeof MATCH_RANK)[keyof typeof MATCH_RANK];

/** The material as a search sees it. `supplierId` binds the entry to one supplier's names. */
export interface MaterialSearchEntry {
  readonly code: string;
  readonly description: string;
  readonly supplierId?: string;
}

export type SearchableName = Pick<SupplierMaterialName, 'supplierId' | 'materialCode' | 'tradeName' | 'state'>;

export interface MaterialMatch {
  readonly rank: MatchRank;
  readonly matchedOn: MaterialMatchOn;
  readonly tradeName?: string;
  readonly supplierId?: string;
}

/** Lower case, no accents, punctuation turned into spaces, spaces collapsed. */
export function normalizeSearchText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const wordsOf = (s: string): string[] => {
  const n = normalizeSearchText(s);
  return n === '' ? [] : n.split(' ');
};

/** The shortest words that may carry a typo (BR-04). */
export const TYPO_MIN_LENGTH = 5;

/** True when a and b differ by at most 1 insert, delete, replace or neighbour swap. */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  if (a.length === b.length) {
    // replace one, or swap two neighbours
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  // insert or delete one
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** How well one typed word matches the field's words, or null. */
function wordRank(token: string, words: readonly string[]): MatchRank | null {
  if (words.includes(token)) return MATCH_RANK.fullWord;
  if (words.some((w) => w.includes(token))) return MATCH_RANK.partWord;
  if (words.some((w) => w.length >= TYPO_MIN_LENGTH && withinOneEdit(token, w))) return MATCH_RANK.typo;
  return null;
}

/** Every typed word must match this field; the field ranks as its weakest word. */
function fieldRank(tokens: readonly string[], text: string): MatchRank | null {
  const words = wordsOf(text);
  let worst: MatchRank = MATCH_RANK.fullWord;
  for (const token of tokens) {
    const r = wordRank(token, words);
    if (r === null) return null;
    if (r > worst) worst = r;
  }
  return worst;
}

/**
 * MR-3 BR-04 — does `query` find this material, on what, and how well.
 * Null for an empty query or no match. `names` may hold names for any
 * material: only this entry's APPROVED names count (and only its own
 * supplier's when the entry names one).
 */
export function matchMaterial(
  query: string,
  entry: MaterialSearchEntry,
  names: readonly SearchableName[],
): MaterialMatch | null {
  const tokens = wordsOf(query);
  if (tokens.length === 0) return null;
  const q = tokens.join(' ');
  const code = normalizeSearchText(entry.code);
  if (q === code || q.replace(/ /g, '') === code.replace(/ /g, '')) {
    return { rank: MATCH_RANK.exactCode, matchedOn: 'code' };
  }
  let best: MaterialMatch | null = null;
  const consider = (rank: MatchRank | null, m: Omit<MaterialMatch, 'rank'>) => {
    if (rank !== null && (best === null || rank < best.rank)) best = { rank, ...m };
  };
  consider(fieldRank(tokens, entry.code), { matchedOn: 'code' });
  consider(fieldRank(tokens, entry.description), { matchedOn: 'description' });
  for (const n of names) {
    if (n.state !== 'Approved' || n.materialCode !== entry.code) continue;
    if (entry.supplierId !== undefined && n.supplierId !== entry.supplierId) continue;
    consider(fieldRank(tokens, n.tradeName), { matchedOn: 'tradeName', tradeName: n.tradeName, supplierId: n.supplierId });
  }
  return best;
}

/**
 * The items a query finds, best rank first (ties keep the list's own order).
 * An empty query keeps every item, in order, with no match.
 */
export function searchMaterials<T, M extends MaterialMatch = MaterialMatch>(
  query: string,
  items: readonly T[],
  entryOf: (item: T) => MaterialSearchEntry,
  matchOf: (query: string, entry: MaterialSearchEntry) => M | null,
): Array<{ item: T; match: M | null }> {
  if (wordsOf(query).length === 0) return items.map((item) => ({ item, match: null }));
  return items
    .map((item, i) => ({ item, match: matchOf(query, entryOf(item)), i }))
    .filter((r): r is { item: T; match: M; i: number } => r.match !== null)
    .sort((a, b) => a.match.rank - b.match.rank || a.i - b.i)
    .map(({ item, match }) => ({ item, match }));
}
