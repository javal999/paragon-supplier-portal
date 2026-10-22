import { describe, it, expect } from 'vitest';
import {
  categoryLabelKey,
  categoryResourcesEn,
  categoryResourcesId,
  CANONICAL_CATEGORIES,
  __categoryInternals
} from './categoryLabel';
import { resources } from './i18n';

const { CATEGORY_ID, slug, SPELLING_ALIAS } = __categoryInternals;

describe('categoryLabel — category SSoT invariants (SEAT2-I18N-CATEGORY-01)', () => {
  it('every canonical category has an ID translation', () => {
    const missing = CANONICAL_CATEGORIES.filter((s) => !(s in CATEGORY_ID));
    expect(missing).toEqual([]);
  });

  it('every canonical category resolves to a key present in both en and id resources', () => {
    const en = /** @type {Record<string, string>} */ (resources.en.translation);
    const id = /** @type {Record<string, string>} */ (resources.id.translation);
    for (const cat of CANONICAL_CATEGORIES) {
      const key = categoryLabelKey(cat);
      expect(key).not.toBeNull();
      expect(en[/** @type {string} */ (key)]).toBeDefined();
      expect(id[/** @type {string} */ (key)]).toBeDefined();
    }
  });

  it('EN resource value equals the canonical string (byte-identical display)', () => {
    for (const cat of CANONICAL_CATEGORIES) {
      expect(categoryResourcesEn[slug(cat)]).toBe(cat);
    }
  });

  it('category slugs are unique and namespaced category.*', () => {
    const slugs = CANONICAL_CATEGORIES.map(slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const cat of CANONICAL_CATEGORIES) {
      expect(slug(cat).startsWith('category.')).toBe(true);
    }
  });

  it('the compliance-taxonomy split tokens localize (closes Batch 4/5 filter-vs-pill gap)', () => {
    expect(categoryResourcesId[slug('Halal Compliance')]).toBe('Kepatuhan Halal');
    expect(categoryResourcesId[slug('BPOM Regulatory')]).toBe('Regulasi BPOM');
    expect(categoryResourcesId[slug('Tax & Legal')]).toBe('Pajak & Hukum');
    expect(categoryResourcesId[slug('Quality')]).toBe('Kualitas');
    expect(categoryResourcesId[slug('Contract')]).toBe('Kontrak');
  });

  it('the beauty-material tokens localize', () => {
    expect(categoryResourcesId[slug('Fragrance')]).toBe('Pewangi');
    expect(categoryResourcesId[slug('Active Ingredient')]).toBe('Bahan Aktif');
    expect(categoryResourcesId[slug('Packaging')]).toBe('Kemasan');
    expect(categoryResourcesId[slug('Emulsifier')]).toBe('Pengemulsi');
    expect(categoryResourcesId[slug('Botanical')]).toBe('Botani');
    expect(categoryResourcesId[slug('Raw Material')]).toBe('Bahan Baku');
  });

  it('resolution is case-insensitive and whitespace-trimmed', () => {
    expect(categoryLabelKey('Fragrance')).toBe('category.fragrance');
    expect(categoryLabelKey('fragrance')).toBe('category.fragrance');
    expect(categoryLabelKey('  Tax & Legal  ')).toBe('category.tax_legal');
  });

  it('out-of-scope generic-industrial residue is unmapped (renders verbatim)', () => {
    expect(categoryLabelKey('Semiconductors')).toBeNull();
    expect(categoryLabelKey('PCB Assemblies')).toBeNull();
    expect(categoryLabelKey('Steel Components')).toBeNull();
    expect(categoryLabelKey('Rare Earth Metals')).toBeNull();
    expect(categoryLabelKey('')).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// S2a — THE SURFACES THAT ALREADY ROUTE THROUGH THIS MAP.
//
// ⚠️ **THIS BLOCK DERIVES ITS POPULATION FROM THE PAGES, EVERY RUN, AND THAT IS
// THE POINT.** A list of "the ten tokens we added" would pass forever while a
// thirteenth Marketplace chip quietly rendered English. The question asked here
// is the reachability question — *does every token these surfaces actually offer
// resolve?* — so the day someone adds a chip with no map row, this goes red with
// nobody editing the test.
//
// The surfaces are named because they are the ones that CALL `useCategoryLabel()`
// and therefore have a right to expect an answer. A surface that renders its
// category raw is a different finding and is not this guard's business.
// ═════════════════════════════════════════════════════════════════════════════

// IA P-10 (owner ruled 2026-10-21) — the two surfaces this block read (the
// Marketplace filter chips and the supplier storefront's add-material form)
// were retired with their pages, so the token-list derivation left with them.
// The surviving callers of `useCategoryLabel()` render categories from data,
// not from a module-scope list, and the vocabulary checks below still hold.

describe('categoryLabel — the surfaces that route through this map (S2a)', () => {
  // ── THE POPULATION GUARD RUNS FIRST, AND ASSERTS MEMBERSHIP, NEVER A COUNT.
  // `EMPTY-INPUT-REPORTS-CLEAN-01`: a regex that matched nothing would report a
  // perfectly clean tree, and "0 tokens fall through" is exactly what success
  // looks like here. Membership both ways is the only thing separating them.
  it('the marketplace / storefront vocabulary localizes', () => {
    expect(categoryResourcesId[slug('Natural & Botanical')]).toBe('Alami & Botani');
    expect(categoryResourcesId[slug('Surfactants & Emulsifiers')]).toBe('Surfaktan & Pengemulsi');
    expect(categoryResourcesId[slug('Fragrance & Aroma')]).toBe('Pewangi & Aroma');
    expect(categoryResourcesId[slug('Preservatives')]).toBe('Pengawet');
    expect(categoryResourcesId[slug('Labels & Print')]).toBe('Label & Cetak');
    expect(categoryResourcesId[slug('Sustainable Packaging')]).toBe('Kemasan Berkelanjutan');
    expect(categoryResourcesId[slug('Testing & Certification')]).toBe('Pengujian & Sertifikasi');
    expect(categoryResourcesId[slug('Contract Manufacturing')]).toBe('Manufaktur Kontrak');
  });

  it('the two word-order spellings of packaging share ONE Indonesian label', () => {
    // Two EN spellings, one natural ID label, distinct slugs — the pattern this
    // map already uses for Emulsifier(s) and Active Ingredient(s).
    expect(categoryResourcesId[slug('Primary Packaging')]).toBe('Kemasan Primer');
    expect(categoryResourcesId[slug('Packaging Primary')]).toBe('Kemasan Primer');
    expect(categoryResourcesId[slug('Secondary Packaging')]).toBe('Kemasan Sekunder');
    expect(categoryResourcesId[slug('Packaging Secondary')]).toBe('Kemasan Sekunder');
    expect(slug('Primary Packaging')).not.toBe(slug('Packaging Primary'));
  });
});

describe('categoryLabel — the spelling alias (S2a)', () => {
  it('all three spellings of the botanical compound resolve to ONE key', () => {
    const canonical = categoryLabelKey('Natural & Botanical');
    expect(canonical).toBe('category.natural_botanical');
    expect(categoryLabelKey('Natural Botanical')).toBe(canonical);
    expect(categoryLabelKey('Natural/Botanical')).toBe(canonical);
    // Case-insensitive and trimmed, like every other resolution path here.
    expect(categoryLabelKey('  natural/botanical  ')).toBe(canonical);
  });

  it('the alias is BILATERAL — every alias target is a registered canonical token', () => {
    // An alias pointing at nothing resolves to a key with no resource, which
    // renders as the key itself. It must fail here instead, and loudly.
    const dead = Object.entries(SPELLING_ALIAS).filter(([, target]) => !(target in CATEGORY_ID));
    expect(
      dead,
      `alias targets naming no registered category:\n${dead
        .map(([k, v]) => `  ${k} -> ${v}`)
        .join('\n')}`
    ).toEqual([]);
  });

  it('no alias KEY is also a registered token — a token would silently win', () => {
    const shadowed = Object.keys(SPELLING_ALIAS).filter(
      (k) => categoryLabelKey(k) !== slug(SPELLING_ALIAS[k])
    );
    expect(shadowed).toEqual([]);
  });

  it('the alias does not swallow the neighbouring base token', () => {
    // `Botanical` is its own category and keeps its own key; the compound is a
    // different concept and a different slug.
    expect(categoryLabelKey('Botanical')).toBe('category.botanical');
    expect(categoryLabelKey('Botanical')).not.toBe(categoryLabelKey('Natural Botanical'));
  });

  it('an unaliased, unmapped token still returns null', () => {
    // The negative control for the whole mechanism: the alias must not have
    // turned the resolver into something that answers everything.
    expect(categoryLabelKey('Natural Semiconductors')).toBeNull();
    expect(categoryLabelKey('Botanical/Natural')).toBeNull();
  });
});
