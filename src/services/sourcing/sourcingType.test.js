// Material G2 — the pure rules: the map, one event's type, eligibility, the
// publish refusal, the invite filter and the award rule. Each refusal code is
// fired once and passed once (MAT-R8).
import { describe, expect, it } from 'vitest';
/** @import { NamedEligibility, SourcingType } from './sourcingType' */
import {
  CATEGORY_TO_SUPPLIER_CATEGORY,
  DEFAULT_SOURCING_TYPE_MAP,
  SOURCING_TYPE_KEYS,
  biddingEligibility,
  inviteesQualificationRefusal,
  mappedSourcingType,
  qualificationWarningsOf,
  qualifiedFor,
  sourcingTypeOf,
  sourcingTypeRefusal
} from './sourcingType';
/** @import { InviteeCandidate } from '../transitions/rfxRules' */
import { filterInvitees, notQualifiedInvitees } from '../transitions/rfxRules';
/** @import { AwardItem } from './awardShape' */
import { awardQualificationRefusal, awardReasonOwed, awardReasonRefusal } from './awardShape';
import { SupplierStatus } from '@app-types/supplier.types';
/** @import { QualificationLevel, VendorQualificationStatus } from '../data/types' */
/** @import { AwardLine } from './types' */

const HALAL = { category: /** @type {const} */ ('Halal Compliance'), label: 'Halal certificate' };
const QUALITY = { category: /** @type {const} */ ('Quality'), label: 'GMP / ISO certificate' };

/**
 * @param {QualificationLevel} level
 * @returns {VendorQualificationStatus}
 */
const status = (level) => ({
  level,
  missingFor: {
    approved: level === 'registered' ? [QUALITY] : [],
    preferred: level === 'preferred' ? [] : level === 'approved' ? [HALAL] : [QUALITY, HALAL]
  },
  expiringSoon: []
});

/**
 * @param {string} id
 * @param {QualificationLevel} level
 * @param {SourcingType} type
 * @param {boolean} placeholder
 * @returns {NamedEligibility}
 */
const named = (id, level, type, placeholder) => ({
  supplierId: id,
  supplierName: `PT ${id}`,
  eligibility: biddingEligibility(status(level), type, placeholder)
});

describe('BR-05 — qualifiedFor', () => {
  it.each(
    /** @type {const} */ ([
      ['registered', 'direct', false],
      ['approved', 'direct', false],
      ['preferred', 'direct', true],
      ['registered', 'indirect', false],
      ['approved', 'indirect', true],
      ['preferred', 'indirect', true]
    ])
  )('%s on a %s event → %s', (level, type, ok) => {
    expect(qualifiedFor(level, type)).toBe(ok);
  });
});

describe('eligibility — warn on a placeholder list, refuse on a real one', () => {
  it('an Approved vendor on a direct event: refused on a real list, warned on a placeholder, with the missing documents', () => {
    const real = biddingEligibility(status('approved'), 'direct', false);
    expect(real).toMatchObject({
      state: 'refused',
      level: 'approved',
      requiredLevel: 'preferred',
      missing: [HALAL]
    });
    expect(biddingEligibility(status('approved'), 'direct', true).state).toBe('warn');
  });

  it('a qualified vendor is qualified in both modes, and owes nothing', () => {
    expect(biddingEligibility(status('approved'), 'indirect', false)).toMatchObject({
      state: 'qualified',
      missing: []
    });
    expect(biddingEligibility(status('preferred'), 'direct', true).state).toBe('qualified');
  });
});

describe('AR-17 / BR-06 — the map and one event’s type', () => {
  it('the map is keyed by every RFQ category and every purchasing group, all Direct to start', () => {
    expect(SOURCING_TYPE_KEYS).toContain('category:Packaging');
    expect(SOURCING_TYPE_KEYS).toContain('pg:101');
    expect(SOURCING_TYPE_KEYS).toContain('pg:104');
    expect(
      Object.keys(CATEGORY_TO_SUPPLIER_CATEGORY).every((c) =>
        SOURCING_TYPE_KEYS.includes(`category:${c}`)
      )
    ).toBe(true);
    expect(Object.values(DEFAULT_SOURCING_TYPE_MAP).every((t) => t === 'direct')).toBe(true);
  });

  it('an RFQ reads its category; an RFI / RFP its purchasing group first, then its supplier category', () => {
    const map = {
      ...DEFAULT_SOURCING_TYPE_MAP,
      'category:Packaging': /** @type {const} */ ('indirect'),
      'pg:102': /** @type {const} */ ('indirect')
    };
    expect(mappedSourcingType({ kind: 'rfq', materialCategory: 'Packaging' }, map)).toBe(
      'indirect'
    );
    expect(mappedSourcingType({ kind: 'rfq', materialCategory: 'Fragrance' }, map)).toBe('direct');
    expect(
      mappedSourcingType(
        { kind: 'rfp', materialCategory: 'Fragrance', purchasingGroup: '102' },
        map
      )
    ).toBe('indirect');
    expect(mappedSourcingType({ kind: 'rfi', materialCategory: 'Packaging' }, map)).toBe(
      'indirect'
    );
  });

  it('two RFQ categories that disagree on one supplier category read Direct, the stricter type', () => {
    // Emulsifiers and Botanical are both "Raw Material".
    const split = {
      ...DEFAULT_SOURCING_TYPE_MAP,
      'category:Emulsifiers': /** @type {const} */ ('indirect')
    };
    expect(mappedSourcingType({ kind: 'rfi', materialCategory: 'Raw Material' }, split)).toBe(
      'direct'
    );
    const both = { ...split, 'category:Botanical': /** @type {const} */ ('indirect') };
    expect(mappedSourcingType({ kind: 'rfi', materialCategory: 'Raw Material' }, both)).toBe(
      'indirect'
    );
  });

  it('stored at publish wins; a published event with none reads Direct (edge case 4); a Draft reads the map', () => {
    const map = {
      ...DEFAULT_SOURCING_TYPE_MAP,
      'category:Packaging': /** @type {const} */ ('indirect')
    };
    expect(
      sourcingTypeOf(
        { kind: 'rfq', status: 'Open', materialCategory: 'Packaging', sourcingType: 'direct' },
        map
      )
    ).toBe('direct');
    expect(
      sourcingTypeOf({ kind: 'rfq', status: 'Open', materialCategory: 'Packaging' }, map)
    ).toBe('direct');
    expect(
      sourcingTypeOf({ kind: 'rfq', status: 'Draft', materialCategory: 'Packaging' }, map)
    ).toBe('indirect');
  });

  it('sourcing_type_governed: an unknown key and a bad value are refused, a good pair passes', () => {
    expect(sourcingTypeRefusal('category:Nope', 'direct')).toMatch(/^SOURCING_TYPE_KEY_UNKNOWN/);
    expect(sourcingTypeRefusal('pg:101', 'both')).toMatch(/^SOURCING_TYPE_INVALID/);
    expect(sourcingTypeRefusal('pg:101', 'indirect')).toBeNull();
  });
});

describe('AR-16 — the publish rule', () => {
  it('SUPPLIER_NOT_QUALIFIED names every vendor below the level on a real list', () => {
    const refusal = inviteesQualificationRefusal([
      named('sup-a', 'preferred', 'direct', false),
      named('sup-b', 'approved', 'direct', false)
    ]);
    expect(refusal).toMatch(
      /^SUPPLIER_NOT_QUALIFIED: PT sup-b \(sup-b\) is Approved; a direct event needs Preferred \(missing: Halal certificate\)$/
    );
  });

  it('passes on qualified invitees, and on a placeholder list records a warning instead', () => {
    expect(inviteesQualificationRefusal([named('sup-a', 'preferred', 'direct', false)])).toBeNull();
    const warned = [named('sup-b', 'approved', 'direct', true)];
    expect(inviteesQualificationRefusal(warned)).toBeNull();
    expect(qualificationWarningsOf(warned)).toEqual([
      {
        supplierId: 'sup-b',
        sourcingType: 'direct',
        level: 'approved',
        requiredLevel: 'preferred',
        missing: ['Halal certificate']
      }
    ]);
  });
});

describe('the invite filter — Active and qualified are offered; the rest are listed as not qualified', () => {
  /**
   * @param {string} supplierId
   * @param {QualificationLevel} level
   * @param {boolean} placeholder
   * @returns {InviteeCandidate}
   */
  const cand = (supplierId, level, placeholder, s = SupplierStatus.ACTIVE) => ({
    supplierId,
    supplierName: supplierId,
    category: 'Packaging',
    status: s,
    otif: null,
    country: 'ID',
    certificates: /** @type {InviteeCandidate['certificates']} */ (
      /** @type {unknown} */ ({ halal: 'none', bpom: 'none' })
    ),
    band: /** @type {InviteeCandidate['band']} */ ('noHistory'),
    eligibility: biddingEligibility(status(level), 'direct', placeholder)
  });

  it('REAL LIST — the Approved vendor is not offered on a direct event, and is listed as not qualified', () => {
    const pool = [
      cand('p', 'preferred', false),
      cand('a', 'approved', false),
      cand('s', 'preferred', false, SupplierStatus.SUSPENDED)
    ];
    expect(filterInvitees(pool).map((c) => c.supplierId)).toEqual(['p']);
    expect(notQualifiedInvitees(pool).map((c) => c.supplierId)).toEqual(['a']);
  });

  it('PLACEHOLDER — the same vendor is offered (marked), and nothing is listed as refused', () => {
    const pool = [cand('p', 'preferred', true), cand('a', 'approved', true)];
    expect(filterInvitees(pool).map((c) => c.supplierId)).toEqual(['p', 'a']);
    expect(notQualifiedInvitees(pool)).toEqual([]);
  });
});

describe('BR-07 — the award rule, shared by the panel and both award hooks', () => {
  /** @type {AwardItem} */
  const item = {
    key: 'event',
    name: 'the event',
    itemCode: '',
    tiered: false,
    breaks: [{ qty: 100, pieces: 100 }],
    priced: () => true
  };
  /**
   * @param {string} supplierId
   * @returns {AwardLine}
   */
  const line = (supplierId) => ({
    supplierId,
    quotationId: `q-${supplierId}`,
    itemCode: '',
    sharePct: 100,
    quantity: 100
  });

  it('AWARD_SUPPLIER_NOT_QUALIFIED fires for a vendor below the level on a real list, and passes a qualified one', () => {
    /** @param {string} id */
    const of = (id) => named(id, id === 'low' ? 'approved' : 'preferred', 'direct', false);
    expect(awardQualificationRefusal([line('low')], of)).toMatchObject({
      code: 'AWARD_SUPPLIER_NOT_QUALIFIED'
    });
    expect(awardQualificationRefusal([line('ok')], of)).toBeNull();
  });

  it('PLACEHOLDER — no refusal, but a reason is owed; with one it passes', () => {
    /** @param {string} id */
    const of = (id) => named(id, 'approved', 'direct', true);
    expect(awardQualificationRefusal([line('low')], of)).toBeNull();
    const owed = awardReasonOwed({
      items: [item],
      lines: [line('low')],
      always: false,
      bestOf: () => null,
      eligibilityOf: of
    });
    expect(owed.owed).toBe(true);
    expect(owed.unqualified.map((v) => v.supplierId)).toEqual(['low']);
    expect(awardReasonRefusal(owed, '')).toMatchObject({ code: 'AWARD_REASON_REQUIRED' });
    expect(awardReasonRefusal(owed, 'Only source in time')).toBeNull();
  });

  it('a qualified award that follows the best score owes nothing', () => {
    /** @param {string} id */
    const of = (id) => named(id, 'preferred', 'direct', true);
    const owed = awardReasonOwed({
      items: [item],
      lines: [line('ok')],
      always: false,
      bestOf: () => 'q-ok',
      eligibilityOf: of
    });
    expect(owed.owed).toBe(false);
    expect(awardReasonRefusal(owed, '')).toBeNull();
  });
});
