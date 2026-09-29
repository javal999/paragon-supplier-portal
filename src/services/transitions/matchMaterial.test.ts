import { beforeEach, describe, expect, it } from 'vitest';
import {
  MATCH_RANK,
  matchMaterial,
  normalizeSearchText,
  searchMaterials,
  withinOneEdit,
  type MaterialSearchEntry,
  type SearchableName,
} from './matchMaterial';
import { materialNamesFor } from '../data/mock/materialNameReadModel';
import { materialNameStore } from '../data/mock/stores/materialNameStore';
import type { QueryScope } from '../data/types';

// ─────────────────────────────────────────────────────────────────────────────
// Material C3 · the one material search rule (MR-3 BR-04, AC-02, AC-04).
// ─────────────────────────────────────────────────────────────────────────────

const EMUL: MaterialSearchEntry = { code: 'ROH-EMUL-3320', description: 'Emulsifier base' };

const name = (over: Partial<SearchableName> = {}): SearchableName => ({
  supplierId: 'sup-x',
  materialCode: EMUL.code,
  tradeName: 'Emulsense 200',
  state: 'Approved',
  ...over,
});

describe('matchMaterial', () => {
  it('AC-04 — "emulsens 200" finds "Emulsense 200" (the requirement’s worked example)', () => {
    const m = matchMaterial('emulsens 200', EMUL, [name()]);
    expect(m).toMatchObject({ matchedOn: 'tradeName', tradeName: 'Emulsense 200', supplierId: 'sup-x' });
  });

  it('allows 1 typo in a word of 5 or more characters, and ranks it as a typo match', () => {
    // "emulsenze": 1 replaced letter — not a part of any word, only a typo.
    expect(matchMaterial('emulsenze 200', EMUL, [name()])).toMatchObject({ rank: MATCH_RANK.typo, matchedOn: 'tradeName' });
    // a swap of two neighbours is 1 typo too
    expect(matchMaterial('emlusense', EMUL, [name()])?.rank).toBe(MATCH_RANK.typo);
    // 2 typos are not a match
    expect(matchMaterial('emulzenze', EMUL, [name()])).toBeNull();
    // a word of 4 characters may not be typed with a typo
    expect(matchMaterial('bace', EMUL, [])).toBeNull();
    expect(matchMaterial('basse', EMUL, [])).toBeNull(); // "base" has 4 letters: no typo allowed
    expect(matchMaterial('bases', { ...EMUL, description: 'Emulsifier bases' }, [])?.rank).toBe(MATCH_RANK.fullWord);
  });

  it('word order does not matter', () => {
    const a = matchMaterial('200 emulsense', EMUL, [name()]);
    const b = matchMaterial('emulsense 200', EMUL, [name()]);
    expect(a).toEqual(b);
    expect(a).toMatchObject({ rank: MATCH_RANK.fullWord, matchedOn: 'tradeName' });
    expect(matchMaterial('base emulsifier', EMUL, [])).toMatchObject({ rank: MATCH_RANK.fullWord, matchedOn: 'description' });
  });

  it('every word typed must match, within one field', () => {
    expect(matchMaterial('emulsense cream', EMUL, [name()])).toBeNull();
    // one word from the description and one from the trade name is not one field
    expect(matchMaterial('emulsifier 200', EMUL, [name()])).toBeNull();
  });

  it('ignores case, accents, punctuation and extra spaces', () => {
    const accented: MaterialSearchEntry = { code: 'ROH-CRM-0001', description: 'Crème brûlée flavour' };
    expect(matchMaterial('CREME   brulee', accented, [])).toMatchObject({ rank: MATCH_RANK.fullWord, matchedOn: 'description' });
    expect(matchMaterial('  roh.emul/3320 ', EMUL, [])).toMatchObject({ rank: MATCH_RANK.exactCode, matchedOn: 'code' });
    expect(normalizeSearchText('  Émulsense—200 ')).toBe('emulsense 200');
  });

  it('AC-02 — an approved name is matched; an unapproved one is not', () => {
    expect(matchMaterial('emulsense', EMUL, [name()])).not.toBeNull();
    for (const state of ['Awaiting approval', 'Rejected', 'Replaced'] as const) {
      expect(matchMaterial('emulsense', EMUL, [name({ state })]), state).toBeNull();
    }
  });

  it('a name for another material is never matched', () => {
    expect(matchMaterial('emulsense', EMUL, [name({ materialCode: 'ROH-OTHER-1' })])).toBeNull();
  });

  it('an entry bound to a supplier matches that supplier’s name only (edge case 1)', () => {
    const names = [name({ supplierId: 'sup-a', tradeName: 'Alpha Mul' }), name({ supplierId: 'sup-b', tradeName: 'Beta Mul' })];
    expect(matchMaterial('beta', { ...EMUL, supplierId: 'sup-a' }, names)).toBeNull();
    expect(matchMaterial('beta', { ...EMUL, supplierId: 'sup-b' }, names)).toMatchObject({ supplierId: 'sup-b' });
    // unbound, both suppliers' names are searched, each with its supplier
    expect(matchMaterial('alpha', EMUL, names)).toMatchObject({ supplierId: 'sup-a', tradeName: 'Alpha Mul' });
  });

  it('matches a part of a word (the old includes() filters did), below a full word', () => {
    expect(matchMaterial('emul', EMUL, [])).toMatchObject({ rank: MATCH_RANK.fullWord, matchedOn: 'code' });
    expect(matchMaterial('332', EMUL, [])).toMatchObject({ rank: MATCH_RANK.partWord, matchedOn: 'code' });
    expect(matchMaterial('emulsif', EMUL, [])).toMatchObject({ rank: MATCH_RANK.partWord, matchedOn: 'description' });
  });

  it('an empty query matches nothing', () => {
    expect(matchMaterial('   ', EMUL, [name()])).toBeNull();
  });
});

describe('searchMaterials · rank order', () => {
  const entries: MaterialSearchEntry[] = [
    { code: 'ROH-EMUL-3321', description: 'Emulsifier ROH-EMUL-3320 replacement' }, // full words in the description
    { code: 'ROH-EMUL-3329', description: 'Emulsifir blend' }, // typo only
    { code: 'ROH-EMUL-3320', description: 'Emulsifier base' }, // the exact code
  ];
  const run = (q: string) =>
    searchMaterials(q, entries, (e) => e, (query, e) => matchMaterial(query, e, [])).map((r) => r.item.code);

  it('exact code ranks first', () => {
    expect(run('ROH-EMUL-3320')[0]).toBe('ROH-EMUL-3320');
    expect(run('ROH-EMUL-3320')).toEqual(['ROH-EMUL-3320', 'ROH-EMUL-3321']);
  });

  it('full-word matches rank above typo matches, and ties keep the list order', () => {
    expect(run('emulsifier')).toEqual(['ROH-EMUL-3321', 'ROH-EMUL-3320', 'ROH-EMUL-3329']);
  });

  it('an empty query keeps every item in order, with no match', () => {
    const all = searchMaterials('', entries, (e) => e, () => null);
    expect(all.map((r) => r.item.code)).toEqual(entries.map((e) => e.code));
    expect(all.every((r) => r.match === null)).toBe(true);
  });
});

describe('withinOneEdit', () => {
  it('accepts 1 insert, delete, replace or swap and refuses 2', () => {
    expect(withinOneEdit('emulsens', 'emulsense')).toBe(true);
    expect(withinOneEdit('emulsensee', 'emulsense')).toBe(true);
    expect(withinOneEdit('emulsenze', 'emulsense')).toBe(true);
    expect(withinOneEdit('emlusense', 'emulsense')).toBe(true);
    expect(withinOneEdit('emlusenze', 'emulsense')).toBe(false);
    expect(withinOneEdit('emulse', 'emulsense')).toBe(false);
  });
});

describe('MAT-R4 — a supplier’s search sees only its own names', () => {
  beforeEach(() => materialNameStore.reset());

  const supplierScope = (supplierId: string): QueryScope =>
    ({ personaType: 'supplier', supplierId }) as QueryScope;
  const buyerScope = { personaType: 'buyer' } as QueryScope;

  it('never matches another supplier’s approved name', () => {
    // Seeded: sup-005 holds the approved "OleoMul 3310 (sample)" for RM-EMUL-3310.
    const entry: MaterialSearchEntry = { code: 'RM-EMUL-3310', description: 'x' };
    expect(matchMaterial('oleomul', entry, materialNamesFor(buyerScope))).toMatchObject({ supplierId: 'sup-005' });
    expect(matchMaterial('oleomul', entry, materialNamesFor(supplierScope('sup-002')))).toBeNull();
    expect(matchMaterial('oleomul', entry, materialNamesFor(supplierScope('sup-007')))).toBeNull();
    expect(matchMaterial('oleomul', entry, materialNamesFor(supplierScope('sup-005')))).toMatchObject({ supplierId: 'sup-005' });
  });
});
