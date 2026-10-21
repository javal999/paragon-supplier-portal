import { describe, it, expect } from 'vitest';
import i18n from '@lib/i18n';
import { PTI_NAV, SUPPLIER_NAV, UTILITY_NAV, navFor } from './navConfig';
import {
  UTILITY_CATEGORY_KEY,
  groupByCategory,
  matchEntries,
  searchEntriesFor
} from './searchIndex';

const t = i18n.getFixedT('en');

describe('searchEntriesFor — the search reads the menus, not a second list', () => {
  it('lists every menu and user-menu path the viewer can reach, once', () => {
    const entries = searchEntriesFor('buyer', 'ALL');
    const paths = entries.map((e) => e.path);
    const expected = new Set([
      ...PTI_NAV.flatMap((s) => s.items.map((i) => i.path)),
      ...UTILITY_NAV.buyer.map((i) => i.path)
    ]);
    expect(new Set(paths)).toEqual(expected);
    expect(paths).toHaveLength(expected.size);
  });

  it('names a route listed in two sections under the first one', () => {
    const scorecard = searchEntriesFor('buyer', 'ALL').filter((e) => e.path === '/buyer/scorecard');
    expect(scorecard).toEqual([expect.objectContaining({ categoryKey: 'hub.nav.section.review' })]);
  });

  it('follows the hub role: a Finance seat cannot find a Material Planning page', () => {
    const fin = searchEntriesFor('buyer', 'FIN').map((e) => e.path);
    expect(fin).toContain('/buyer/invoices');
    expect(fin).not.toContain('/buyer/order-plan');
    const finMenu = navFor('buyer', 'FIN').flatMap((s) => s.items.map((i) => i.path));
    expect(fin.filter((p) => !finMenu.includes(p))).toEqual(UTILITY_NAV.buyer.map((i) => i.path));
  });

  it('gives a supplier only the supplier menu and its user menu', () => {
    const paths = searchEntriesFor('supplier', 'ALL').map((e) => e.path);
    expect(paths).toEqual([
      ...SUPPLIER_NAV.flatMap((s) => s.items.map((i) => i.path)),
      ...UTILITY_NAV.supplier.map((i) => i.path)
    ]);
    expect(paths.some((p) => p.startsWith('/buyer/'))).toBe(false);
  });

  it('files user-menu pages under the user menu heading', () => {
    const glossary = searchEntriesFor('buyer', 'ALL').find((e) => e.path === '/glossary');
    expect(glossary?.categoryKey).toBe(UTILITY_CATEGORY_KEY);
  });
});

describe('matchEntries — case-insensitive substring on the translated label', () => {
  const entries = searchEntriesFor('buyer', 'ALL');

  it('matches regardless of case and names the matching pages', () => {
    const labels = matchEntries(entries, 'SUPPLIER', t).map((r) => r.label);
    expect(labels).toContain('Supplier follow-ups');
    expect(labels).toContain('Suppliers');
    expect(labels).toContain('Planning engine · Supplier reliability');
    expect(labels).not.toContain('Purchase orders');
  });

  it('returns nothing for a blank query or a term no label contains', () => {
    expect(matchEntries(entries, '   ', t)).toEqual([]);
    expect(matchEntries(entries, 'zzqx', t)).toEqual([]);
  });

  it('matches the active language', () => {
    const id = i18n.getFixedT('id');
    const labels = matchEntries(entries, 'faktur', id).map((r) => r.label);
    expect(labels).toEqual(['Faktur']);
  });
});

describe('groupByCategory — display order is keyboard order', () => {
  it('keeps one group per category and numbers results group by group', () => {
    const { groups, ordered } = groupByCategory([
      { label: 'A', category: 'One', path: '/a' },
      { label: 'B', category: 'Two', path: '/b' },
      { label: 'C', category: 'One', path: '/c' }
    ]);
    expect(groups.map((g) => g.category)).toEqual(['One', 'Two']);
    expect(groups[0].items.map((i) => [i.result.label, i.index])).toEqual([
      ['A', 0],
      ['C', 1]
    ]);
    expect(groups[1].items.map((i) => [i.result.label, i.index])).toEqual([['B', 2]]);
    expect(ordered.map((r) => r.label)).toEqual(['A', 'C', 'B']);
  });
});
