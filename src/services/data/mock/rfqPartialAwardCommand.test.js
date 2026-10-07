// ────────────────────────────────────────────────────────────────────────────
// RFx C1 — partial award, a break per item, splits by quantity, and legacy RFQs
// on the same rule (NR-3 BR-02 to BR-08, AC-01, AC-03, AC-04; AR-04, AR-06
// groundwork). Dispatched through the REAL MockCommandService.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { everyVendorQualified } from '@test/everyVendorQualified';
import { MockCommandService } from './MockCommandService';
import { awardStore, resetRfxStores } from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { sdcClock } from '../../sdc';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { awardQuantity } from '../../sourcing/rfqComparison';
/** @import { QueryScope } from '../types' */
/** @import { AwardLine } from '../../sourcing/types' */

const svc = new MockCommandService();
/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
  // Material G2 — this spec is about the award's shape and the best-score
  // reason, not qualification: every vendor qualifies here.
  everyVendorQualified();
});

const oslo = () => /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-021'));
/** @param {number} lineNo */
const osloItem = (lineNo) =>
  /** @type {import('../../sourcing/rfqModel').RfqItem} */ (
    /** @type {NonNullable<(ReturnType<typeof oslo>)['items']>} */ (oslo().items).find(
      (i) => i.lineNo === lineNo
    )
  );
/** @param {string} rfqId */
const awardsOf = (rfqId) =>
  awardStore.all().filter((a) => a.eventType === 'rfq' && a.eventId === rfqId);

/**
 * An Oslo line by share: the quantity is the share of the item's break.
 * @param {string} supplierId
 * @param {string} quotationId
 * @param {number} lineNo
 * @param {number} sharePct
 * @param {number} tierQty
 * @returns {AwardLine}
 */
const osloPct = (supplierId, quotationId, lineNo, sharePct, tierQty) => ({
  supplierId,
  quotationId,
  itemCode: '',
  itemLineNo: lineNo,
  sharePct,
  quantity: awardQuantity(oslo(), osloItem(lineNo), tierQty, sharePct),
  splitBasis: 'pct',
  awardTierQty: tierQty
});

/**
 * An Oslo line by quantity: the share is the quantity over the item's break.
 * @param {string} supplierId
 * @param {string} quotationId
 * @param {number} lineNo
 * @param {number} quantity
 * @param {number} sharePct
 * @param {number} tierQty
 * @returns {AwardLine}
 */
const osloQty = (supplierId, quotationId, lineNo, quantity, sharePct, tierQty) => ({
  ...osloPct(supplierId, quotationId, lineNo, sharePct, tierQty),
  quantity,
  splitBasis: 'qty'
});

/**
 * @param {'t_rfq_award' | 't_rfq_award_partial'} transitionId
 * @param {string} rfqId
 * @param {readonly AwardLine[]} lines
 * @param {Record<string, unknown>} [extra]
 */
const dispatchAward = (transitionId, rfqId, lines, extra = {}) =>
  svc.dispatch(buyer, {
    transitionId,
    entity: 'rfq',
    entityId: rfqId,
    payload: {
      awardedQuotationId: /** @type {AwardLine} */ (lines[0]).quotationId,
      awardedSupplierId: /** @type {AwardLine} */ (lines[0]).supplierId,
      awardLines: lines.map((l) => ({ ...l })),
      ...extra
    }
  });

describe('population control', () => {
  it('Oslo is Open with two items and quotes from sup-013 and sup-015; rfq-014 is a Closed legacy RFQ with 2 lines', () => {
    expect(oslo().status).toBe('Open');
    expect(
      /** @type {NonNullable<(ReturnType<typeof oslo>)['items']>} */ (oslo().items).map(
        (i) => i.lineNo
      )
    ).toEqual([1, 2]);
    expect(
      quotationStore
        .forRfq('rfq-021')
        .map((q) => q.id)
        .sort()
    ).toEqual(['qt-021a', 'qt-021b']);
    const legacy = /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014'));
    expect(legacy.status).toBe('Closed');
    expect(legacy.items).toBeUndefined();
    expect(
      /** @type {NonNullable<typeof legacy.lineItems>} */ (legacy.lineItems).map((l) => [
        l.materialCode,
        l.quantity
      ])
    ).toEqual([
      ['PK-PETB-8802', 600_000],
      ['PK-CAPF-8820', 300_000]
    ]);
  });
});

describe('AC-01 / edge case 3 — item 1 at the 10K break and item 2 at the 50K break, in one award', () => {
  it('item 1 split 60/40 by share, item 2 split by quantity; every line is kept with its share, quantity and break', async () => {
    // Item 2 at 50K per variant × 8 variants = 400,000 pieces.
    const lines = [
      osloPct('sup-015', 'qt-021a', 1, 60, 10_000),
      osloPct('sup-013', 'qt-021b', 1, 40, 10_000),
      osloQty('sup-015', 'qt-021a', 2, 280_000, 70, 50_000),
      osloQty('sup-013', 'qt-021b', 2, 120_000, 30, 50_000)
    ];
    const res = await dispatchAward('t_rfq_award', 'rfq-021', lines);
    expect(res.status, res.reason).toBe('done');
    expect(oslo().status).toBe('Awarded');
    const [rec] = awardsOf('rfq-021');
    expect(
      /** @type {import('../../sourcing/types').AwardRecord} */ (rec).lines.map((l) => [
        l.itemLineNo,
        l.supplierId,
        l.sharePct,
        l.quantity,
        l.splitBasis,
        l.awardTierQty
      ])
    ).toEqual([
      [1, 'sup-015', 60, 48_000, 'pct', 10_000],
      [1, 'sup-013', 40, 32_000, 'pct', 10_000],
      [2, 'sup-015', 70, 280_000, 'qty', 50_000],
      [2, 'sup-013', 30, 120_000, 'qty', 50_000]
    ]);
  });

  it('KNOWN-BAD twin — the quantity split on item 2 totalling 410,000 is refused, naming the item and the total', async () => {
    const res = await dispatchAward('t_rfq_award', 'rfq-021', [
      osloPct('sup-015', 'qt-021a', 1, 60, 10_000),
      osloPct('sup-013', 'qt-021b', 1, 40, 10_000),
      osloQty('sup-015', 'qt-021a', 2, 290_000, 72.5, 50_000),
      osloQty('sup-013', 'qt-021b', 2, 120_000, 30, 50_000)
    ]);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(
      /AWARD_SPLIT_INCOMPLETE: item 2 \(Oslo back sticker \(ingredients\)\) totals 410,000, not 400,000/
    );
    expect(awardsOf('rfq-021')).toEqual([]);
  });
});

describe('AC-03 — a partial award to Partly awarded, then the final award to Awarded', () => {
  /** A third current quote on Oslo, from sup-007 (passes the gate), which wins nothing. */
  const addSup007Quote = () =>
    quotationStore.add({
      .../** @type {import('@data/mockQuotations').Quotation} */ (quotationStore.get('qt-021a')),
      id: 'qt-021s7',
      supplierId: 'sup-007',
      status: 'Submitted'
    });

  it('the partial award rejects no quote; the final award rejects every quote no award named', async () => {
    addSup007Quote();
    // sup-007's quote moves the 3K ranking, so each award states a reason.
    const partial = await dispatchAward(
      't_rfq_award_partial',
      'rfq-021',
      [osloPct('sup-015', 'qt-021a', 1, 100, 3_000)],
      {
        awardReason: 'Front sticker stays with the current printer.'
      }
    );
    expect(partial.status, partial.reason).toBe('done');
    expect(oslo().status).toBe('Partly awarded');
    expect(
      /** @type {import('@data/mockQuotations').Quotation} */ (quotationStore.get('qt-021a')).status
    ).toBe('Awarded');
    // Rejected only at the final award: both losers-so-far are still alive.
    expect(
      /** @type {import('@data/mockQuotations').Quotation} */ (quotationStore.get('qt-021b')).status
    ).not.toBe('Rejected');
    expect(
      /** @type {import('@data/mockQuotations').Quotation} */ (quotationStore.get('qt-021s7'))
        .status
    ).toBe('Submitted');
    expect(
      /** @type {import('../../sourcing/types').AwardRecord} */ (awardsOf('rfq-021')[0])
        .notAwardedSupplierIds
    ).toEqual([]);

    // The third quote moves the ranking, so the final award states a reason too.
    const final = await dispatchAward(
      't_rfq_award',
      'rfq-021',
      [osloPct('sup-013', 'qt-021b', 2, 100, 3_000)],
      {
        awardReason: 'Back sticker to the second printer.'
      }
    );
    expect(final.status, final.reason).toBe('done');
    expect(oslo().status).toBe('Awarded');
    expect(
      /** @type {import('@data/mockQuotations').Quotation} */ (quotationStore.get('qt-021a')).status
    ).toBe('Awarded'); // named by the earlier award, not rejected
    expect(
      /** @type {import('@data/mockQuotations').Quotation} */ (quotationStore.get('qt-021b')).status
    ).toBe('Awarded');
    expect(
      /** @type {import('@data/mockQuotations').Quotation} */ (quotationStore.get('qt-021s7'))
        .status
    ).toBe('Rejected');
    const records = awardsOf('rfq-021');
    expect(records).toHaveLength(2);
    const finalRecord = /** @type {import('../../sourcing/types').AwardRecord} */ (
      records.find((r) => r.lines.some((l) => l.itemLineNo === 2))
    );
    expect([...finalRecord.notAwardedSupplierIds].sort()).toEqual(['sup-007', 'sup-008']);
  });

  it('KNOWN-BAD — after the partial award, awarding item 1 again is refused AWARD_ITEM_ALREADY_AWARDED', async () => {
    await dispatchAward('t_rfq_award_partial', 'rfq-021', [
      osloPct('sup-015', 'qt-021a', 1, 100, 3_000)
    ]);
    const res = await dispatchAward('t_rfq_award', 'rfq-021', [
      osloPct('sup-013', 'qt-021b', 1, 100, 3_000),
      osloPct('sup-013', 'qt-021b', 2, 100, 3_000)
    ]);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(
      /AWARD_ITEM_ALREADY_AWARDED: item 1 \(Oslo front sticker\) was already awarded \(aw-/
    );
    expect(oslo().status).toBe('Partly awarded');
  });

  it('KNOWN-BAD — a partial award that would settle every item is refused AWARD_NOTHING_OPEN', async () => {
    const res = await dispatchAward('t_rfq_award_partial', 'rfq-021', [
      osloPct('sup-015', 'qt-021a', 1, 100, 3_000),
      osloPct('sup-013', 'qt-021b', 2, 100, 3_000)
    ]);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/AWARD_NOTHING_OPEN/);
    expect(awardsOf('rfq-021')).toEqual([]);
    expect(oslo().status).toBe('Open');
  });

  it('the reason rule applies per awarded item on a partial award too', async () => {
    // Item 2 at 3K all to sup-015 leaves out its best-scored quote (qt-021b).
    const bad = await dispatchAward('t_rfq_award_partial', 'rfq-021', [
      osloPct('sup-015', 'qt-021a', 2, 100, 3_000)
    ]);
    expect(bad.reason).toMatch(/AWARD_REASON_REQUIRED: the award for item 2/);
    const good = await dispatchAward(
      't_rfq_award_partial',
      'rfq-021',
      [osloPct('sup-015', 'qt-021a', 2, 100, 3_000)],
      {
        awardReason: 'One printer keeps the colours matched.'
      }
    );
    expect(good.status, good.reason).toBe('done');
  });
});

describe('AC-04 — a legacy RFQ is awarded per line, on the same rule', () => {
  /**
   * @param {string} supplierId
   * @param {string} quotationId
   * @param {string} itemCode
   * @param {number} lineQty
   * @param {number} sharePct
   * @returns {AwardLine}
   */
  const legacyLine = (supplierId, quotationId, itemCode, lineQty, sharePct) => ({
    supplierId,
    quotationId,
    itemCode,
    sharePct,
    quantity: Math.round((lineQty * sharePct) / 100)
  });

  it('a 60/40 split across both line items is recorded line by line, each at its line’s break', async () => {
    const lines = [
      legacyLine('sup-015', 'qt-014d-r1', 'PK-PETB-8802', 600_000, 60),
      legacyLine('sup-013', 'qt-014c', 'PK-PETB-8802', 600_000, 40),
      legacyLine('sup-015', 'qt-014d-r1', 'PK-CAPF-8820', 300_000, 60),
      legacyLine('sup-013', 'qt-014c', 'PK-CAPF-8820', 300_000, 40)
    ];
    const res = await dispatchAward('t_rfq_award', 'rfq-014', lines, {
      awardReason: 'Dual sourced.'
    });
    expect(res.status, res.reason).toBe('done');
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status).toBe(
      'Awarded'
    );
    expect(
      /** @type {import('../../sourcing/types').AwardRecord} */ (awardsOf('rfq-014')[0]).lines.map(
        (l) => [l.itemCode, l.supplierId, l.sharePct, l.quantity, l.awardTierQty]
      )
    ).toEqual([
      ['PK-PETB-8802', 'sup-015', 60, 360_000, 600_000],
      ['PK-PETB-8802', 'sup-013', 40, 240_000, 600_000],
      ['PK-CAPF-8820', 'sup-015', 60, 180_000, 300_000],
      ['PK-CAPF-8820', 'sup-013', 40, 120_000, 300_000]
    ]);
  });

  it('`useRfqAward`’s single winner becomes 1 line per item at 100% on the server', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfq_award',
      entity: 'rfq',
      entityId: 'rfq-014',
      payload: {
        awardedQuotationId: 'qt-014c',
        awardedSupplierId: 'sup-013',
        awardReason: 'Single source.'
      }
    });
    expect(res.status, res.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').AwardRecord} */ (awardsOf('rfq-014')[0]).lines.map(
        (l) => [l.itemCode, l.supplierId, l.sharePct, l.quantity]
      )
    ).toEqual([
      ['PK-PETB-8802', 'sup-013', 100, 600_000],
      ['PK-CAPF-8820', 'sup-013', 100, 300_000]
    ]);
  });
});

describe('BR-06 — t_rfq_award refuses AWARD_ITEMS_OPEN while an item is open', () => {
  /** @returns {AwardLine[]} */
  const firstLineOnly = () => [
    {
      supplierId: 'sup-013',
      quotationId: 'qt-014c',
      itemCode: 'PK-PETB-8802',
      sharePct: 100,
      quantity: 600_000
    }
  ];

  it('KNOWN-BAD — only line 1 awarded: refused, naming line 2, and nothing is awarded', async () => {
    const res = await dispatchAward('t_rfq_award', 'rfq-014', firstLineOnly(), {
      awardReason: 'Single source.'
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/AWARD_ITEMS_OPEN: item 2 \(Flip-Top Cap 24mm\) is not awarded/);
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status).toBe(
      'Closed'
    );
    expect(awardsOf('rfq-014')).toEqual([]);
  });

  it('KNOWN-GOOD twin — the same award with line 2 marked "Will not award" settles the event', async () => {
    const res = await dispatchAward('t_rfq_award', 'rfq-014', firstLineOnly(), {
      awardReason: 'Single source.',
      notAwardedItems: ['PK-CAPF-8820']
    });
    expect(res.status, res.reason).toBe('done');
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status).toBe(
      'Awarded'
    );
  });

  it('KNOWN-BAD — a "Will not award" key naming no item of the RFQ is refused by name', async () => {
    const res = await dispatchAward('t_rfq_award', 'rfq-014', firstLineOnly(), {
      awardReason: 'Single source.',
      notAwardedItems: ['PK-NOPE']
    });
    expect(res.reason).toMatch(/AWARD_ITEM_UNKNOWN: "PK-NOPE" is not an item/);
  });

  it('KNOWN-GOOD twin — the same lines as a partial award go to Partly awarded', async () => {
    const res = await dispatchAward('t_rfq_award_partial', 'rfq-014', firstLineOnly(), {
      awardReason: 'Single source.'
    });
    expect(res.status, res.reason).toBe('done');
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status).toBe(
      'Partly awarded'
    );
  });
});

// RFx C3 (NR-3 BR-06) — "Will not award the rest": a FINAL award with no lines
// on a Partly awarded RFQ, whose `notAwardedItems` covers every open item. The
// final award's cascade still runs: every quote no award in force named is
// Rejected, and the earlier award's winner is kept.
describe('C3 — a final award with no lines settles the rest of a Partly awarded RFQ', () => {
  /** @type {AwardLine} */
  const firstLine = {
    supplierId: 'sup-013',
    quotationId: 'qt-014c',
    itemCode: 'PK-PETB-8802',
    sharePct: 100,
    quantity: 600_000
  };
  /**
   * @param {'t_rfq_award' | 't_rfq_award_partial'} transitionId
   * @param {Record<string, unknown>} extra
   */
  const settleRest = (transitionId, extra) =>
    svc.dispatch(buyer, {
      transitionId,
      entity: 'rfq',
      entityId: 'rfq-014',
      payload: {
        awardedQuotationId: 'qt-014c',
        awardedSupplierId: 'sup-013',
        awardLines: [],
        ...extra
      }
    });

  beforeEach(async () => {
    const partial = await dispatchAward('t_rfq_award_partial', 'rfq-014', [firstLine], {
      awardReason: 'Single source.'
    });
    expect(partial.status, partial.reason).toBe('done');
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status).toBe(
      'Partly awarded'
    );
  });

  it('KNOWN-GOOD — every open item marked Will not award: Awarded, and the cascade rejects the unnamed quotes', async () => {
    const res = await settleRest('t_rfq_award', { notAwardedItems: ['PK-CAPF-8820'] });
    expect(res.status, res.reason).toBe('done');
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status).toBe(
      'Awarded'
    );
    expect(
      /** @type {import('@data/mockQuotations').Quotation} */ (quotationStore.get('qt-014c')).status
    ).toBe('Awarded'); // the earlier award's winner stays
    for (const id of ['qt-014a', 'qt-014b', 'qt-014d-r1'])
      expect(
        /** @type {import('@data/mockQuotations').Quotation} */ (quotationStore.get(id)).status
      ).toBe('Rejected');
    const final = /** @type {import('../../sourcing/types').AwardRecord} */ (
      awardsOf('rfq-014').find((a) => a.lines.length === 0)
    );
    expect([...final.notAwardedSupplierIds].sort()).toEqual(['sup-007', 'sup-008', 'sup-015']);
  });

  it('KNOWN-BAD — the open item not marked: AWARD_EMPTY, and nothing moves', async () => {
    const res = await settleRest('t_rfq_award', {});
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/rfq_award_governed:AWARD_EMPTY/);
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status).toBe(
      'Partly awarded'
    );
    expect(
      /** @type {import('@data/mockQuotations').Quotation} */ (quotationStore.get('qt-014a')).status
    ).toBe('Under Review');
  });

  it('KNOWN-BAD — the same empty payload as a PARTIAL award: AWARD_EMPTY', async () => {
    const res = await settleRest('t_rfq_award_partial', { notAwardedItems: ['PK-CAPF-8820'] });
    expect(res.reason).toMatch(/rfq_award_governed:AWARD_EMPTY/);
  });
});

describe('C3 — an empty final award on an RFQ that is not Partly awarded stays AWARD_EMPTY', () => {
  it('KNOWN-BAD — rfq-014 Closed, every item marked Will not award', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfq_award',
      entity: 'rfq',
      entityId: 'rfq-014',
      payload: {
        awardedQuotationId: 'qt-014c',
        awardedSupplierId: 'sup-013',
        awardLines: [],
        notAwardedItems: ['PK-PETB-8802', 'PK-CAPF-8820']
      }
    });
    expect(res.reason).toMatch(/rfq_award_governed:AWARD_EMPTY/);
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status).toBe(
      'Closed'
    );
  });
});
