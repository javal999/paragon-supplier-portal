// ────────────────────────────────────────────────────────────────────────────
// THE REBUILT RFQ, through the REAL dispatcher (RFx spec 2026-09-21).
//
// `t_rfq_create` now carries items with spec sheets, quantity breaks, typed
// questions, options and a currency, and `rfq_create_valid` judges them BY
// NAME. Every refusal is probed BOTH WAYS: the malformed payload is refused
// with its code and mints nothing, and the one-field-away sound payload passes.
// The legacy single-item dispatch (no items, no breaks) still passes — the
// versioning rule is a proof here, not a comment.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { specSheetFor } from '../../sourcing/rfqItemTypes';
/** @import { RfqItem } from '../../sourcing/rfqModel' */
import { deriveQuoteHeader } from '../../sourcing/rfqModel';
import { RFQ_SAMPLE_SEED } from './fixtures/rfqSamples';
import { rfqSupplierGate, rfxNow } from './rfxReadModel';

/** @type {QueryScope} */
const buyer = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const svc = new MockCommandService();

/**
 * @param {Partial<RfqItem>} [overrides]
 * @returns {RfqItem}
 */
const sticker = (overrides = {}) => ({
  lineNo: 1,
  itemType: 'sticker',
  description: 'Front sticker',
  variantCount: 8,
  uom: 'PCS',
  specFields: specSheetFor('sticker').map((f) =>
    f.filledBy === 'buyer' && f.required ? { ...f, value: f.kind === 'choice' ? 'roll' : 'x' } : f
  ),
  oneTimeCosts: ['dieCutPlate'],
  ...overrides
});

/** @param {Record<string, unknown>} [overrides] */
const create = (overrides = {}) => ({
  transitionId: 't_rfq_create',
  entity: 'rfq',
  payload: {
    title: 'Oslo stickers',
    materialCategory: 'Packaging',
    materialIds: [],
    invitedSupplierIds: ['sup-008'],
    responseDeadline: '2026-10-10',
    awardDeadline: '2026-10-20',
    totalQty: 48_000,
    uom: 'PCS',
    incoterms: 'DDP Jakarta',
    paymentTerms: 'Net 60',
    currency: 'USD',
    projectName: 'Oslo',
    items: [sticker(), sticker({ lineNo: 2, description: 'Back sticker' })],
    tiers: [
      { qty: 3_000, basis: 'perVariant' },
      { qty: 5_000, basis: 'perVariant' },
      { qty: 50_000, basis: 'perVariant' }
    ],
    questions: [
      { id: 'q1', sectionId: 'event', promptKey: 'Ship in October?', type: 'yesNo', required: true }
    ],
    allowAlternatives: true,
    confidential: true,
    samplesRequested: { qty: 20, neededBy: '2026-10-05' },
    ...overrides
  }
});

beforeEach(() => {
  rfqStore.reset();
  quotationStore.reset();
});

/** @param {Record<string, unknown>} overrides */
const refused = async (overrides) => {
  const before = rfqStore.all().length;
  const res = await svc.dispatch(buyer, create(overrides));
  expect(rfqStore.all().length).toBe(before); // nothing minted
  // The dispatcher wraps a policy refusal as `POLICY_REJECTED:<hook>:<reason>`;
  // the hook named must be THIS one, and the reason is what is asserted.
  if (res.status !== 'failed') return `NOT REFUSED (${res.status})`;
  expect(res.reason).toMatch(/^POLICY_REJECTED:rfq_create_valid:/);
  return (res.reason ?? '').replace(/^POLICY_REJECTED:rfq_create_valid:/, '');
};

describe('t_rfq_create — the rebuilt RFQ lands whole', () => {
  it('a multi-item tiered RFQ is stored with every authoring field', async () => {
    const res = await svc.dispatch(buyer, create());
    expect(res.status).toBe('done');
    const rfq = /** @type {import('@data/mockRfqs').RFQ} */ (
      rfqStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
    );
    expect(rfq.projectName).toBe('Oslo');
    expect(rfq.items).toHaveLength(2);
    expect(
      /** @type {RfqItem} */ (/** @type {NonNullable<typeof rfq.items>} */ (rfq.items)[1])
        .description
    ).toBe('Back sticker');
    expect(
      /** @type {RfqItem} */ (
        /** @type {NonNullable<typeof rfq.items>} */ (rfq.items)[0]
      ).specFields.find((f) => f.key === 'material')?.value
    ).toBe('x');
    expect(/** @type {NonNullable<typeof rfq.tiers>} */ (rfq.tiers).map((t) => t.qty)).toEqual([
      3_000, 5_000, 50_000
    ]);
    expect(
      /** @type {import('../../sourcing/types').RfiQuestion} */ (
        /** @type {NonNullable<typeof rfq.questions>} */ (rfq.questions)[0]
      ).type
    ).toBe('yesNo');
    expect(rfq.allowAlternatives).toBe(true);
    expect(rfq.confidential).toBe(true);
    expect(rfq.samplesRequested).toEqual({ qty: 20, neededBy: '2026-10-05' });
  });

  it('THE CURRENCY BUG — the chosen currency is KEPT, not overwritten with IDR', async () => {
    const res = await svc.dispatch(buyer, create({ currency: 'EUR' }));
    expect(
      /** @type {import('@data/mockRfqs').RFQ} */ (
        rfqStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
      ).currency
    ).toBe('EUR');
    // KNOWN-GOOD twin — absence (a legacy dispatch) is the base currency.
    const legacy = await svc.dispatch(buyer, create({ currency: undefined }));
    expect(
      /** @type {import('@data/mockRfqs').RFQ} */ (
        rfqStore.get(/** @type {NonNullable<typeof legacy.entityId>} */ (legacy.entityId))
      ).currency
    ).toBe('IDR');
  });

  it('provenance is stored when sent, and absent when not', async () => {
    const res = await svc.dispatch(
      buyer,
      create({
        sourceRfiId: 'rfi-001',
        templateId: 'sys-sticker-roll-tiered',
        copiedFromRfqId: 'rfq-021'
      })
    );
    const rfq = /** @type {import('@data/mockRfqs').RFQ} */ (
      rfqStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
    );
    expect(rfq.sourceRfiId).toBe('rfi-001');
    expect(rfq.templateId).toBe('sys-sticker-roll-tiered');
    expect(rfq.copiedFromRfqId).toBe('rfq-021');
    const plain = /** @type {import('@data/mockRfqs').RFQ} */ (
      rfqStore.get(
        /** @type {NonNullable<(Awaited<ReturnType<typeof svc.dispatch>>)['entityId']>} */ (
          (await svc.dispatch(buyer, create())).entityId
        )
      )
    );
    expect(plain.sourceRfiId).toBeUndefined();
    expect(plain.templateId).toBeUndefined();
  });

  it('THE VERSIONING RULE — a legacy dispatch with no items and no breaks still passes', async () => {
    const res = await svc.dispatch(
      buyer,
      create({
        items: undefined,
        tiers: undefined,
        questions: undefined,
        samplesRequested: undefined,
        currency: undefined
      })
    );
    expect(res.status).toBe('done');
    expect(
      /** @type {import('@data/mockRfqs').RFQ} */ (
        rfqStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
      ).items
    ).toBeUndefined();
  });
});

describe('rfq_create_valid — each refusal by name, probed both ways', () => {
  it('CURRENCY_NOT_PERMITTED — an off-list currency', async () => {
    expect(await refused({ currency: 'JPY' })).toMatch(/^CURRENCY_NOT_PERMITTED/);
  });

  it('UOM_MISSING / UOM_UNKNOWN — RFX-D30: an empty or off-list unit; a listed one passes', async () => {
    expect(await refused({ materialCategory: 'Other', uom: '' })).toMatch(/^UOM_MISSING/);
    expect(await refused({ uom: 'BOX' })).toMatch(/^UOM_UNKNOWN/);
    const res = await svc.dispatch(buyer, create({ materialCategory: 'Other', uom: 'L' }));
    expect(res.status, res.reason).toBe('done');
    expect(rfqStore.get(String(res.entityId))?.uom).toBe('L');
  });

  it('NO_ITEMS — an empty item list', async () => {
    expect(await refused({ items: [] })).toMatch(/^NO_ITEMS/);
  });

  it('ITEM_TYPE_UNKNOWN / ITEM_INCOMPLETE / VARIANTS_INVALID', async () => {
    expect(
      await refused({ items: [sticker({ itemType: /** @type {never} */ ('widget') })] })
    ).toMatch(/^ITEM_TYPE_UNKNOWN/);
    expect(await refused({ items: [sticker({ description: '  ' })] })).toMatch(/^ITEM_INCOMPLETE/);
    expect(await refused({ items: [sticker({ variantCount: 0 })] })).toMatch(/^VARIANTS_INVALID/);
  });

  it('ITEM_SPEC_MISSING — a required BUYER field left blank; a blank SUPPLIER field is not', async () => {
    const blankMaterial = sticker({
      specFields: sticker().specFields.map((f) =>
        f.key === 'material' ? { ...f, value: undefined } : f
      )
    });
    expect(await refused({ items: [blankMaterial] })).toMatch(
      /^ITEM_SPEC_MISSING: item 1 needs material/
    );
    // KNOWN-GOOD twin — `dieCutType` is required but SUPPLIER-filled, and blank.
    const s = sticker();
    expect(s.specFields.find((f) => f.key === 'dieCutType')).toMatchObject({
      filledBy: 'supplier',
      required: true
    });
    expect((await svc.dispatch(buyer, create({ items: [s] }))).status).toBe('done');
  });

  it('TIER_COUNT — none, and more than eight', async () => {
    expect(await refused({ tiers: [] })).toMatch(/^TIER_COUNT/);
    const nine = Array.from({ length: 9 }, (_, i) => ({ qty: (i + 1) * 1000, basis: 'total' }));
    expect(await refused({ tiers: nine })).toMatch(/^TIER_COUNT/);
    // KNOWN-GOOD twin — exactly eight passes.
    expect((await svc.dispatch(buyer, create({ tiers: nine.slice(0, 8) }))).status).toBe('done');
  });

  it('TIER_NOT_POSITIVE / TIERS_NOT_INCREASING / TIER_BASIS_UNKNOWN', async () => {
    expect(await refused({ tiers: [{ qty: 0, basis: 'total' }] })).toMatch(/^TIER_NOT_POSITIVE/);
    expect(await refused({ tiers: [{ qty: 2.5, basis: 'total' }] })).toMatch(/^TIER_NOT_POSITIVE/);
    expect(
      await refused({
        tiers: [
          { qty: 5000, basis: 'total' },
          { qty: 5000, basis: 'total' }
        ]
      })
    ).toMatch(/^TIERS_NOT_INCREASING/);
    expect(
      await refused({
        tiers: [
          { qty: 5000, basis: 'total' },
          { qty: 3000, basis: 'total' }
        ]
      })
    ).toMatch(/^TIERS_NOT_INCREASING/);
    expect(await refused({ tiers: [{ qty: 5000, basis: 'pallet' }] })).toMatch(
      /^TIER_BASIS_UNKNOWN/
    );
  });

  it('an ITEM override is held to the same break rule', async () => {
    expect(
      await refused({
        items: [
          sticker({
            tiers: [
              { qty: 9, basis: 'total' },
              { qty: 1, basis: 'total' }
            ]
          })
        ]
      })
    ).toMatch(/^TIERS_NOT_INCREASING: the quantity breaks on item 1/);
    expect(
      (
        await svc.dispatch(
          buyer,
          create({ items: [sticker({ tiers: [{ qty: 100_000, basis: 'total' }] })] })
        )
      ).status
    ).toBe('done');
  });

  it('UNKNOWN_QUESTION_TYPE / QUESTION_INCOMPLETE / SAMPLES_INVALID / ONE_TIME_COST_UNKNOWN', async () => {
    expect(
      await refused({
        questions: [{ id: 'q', promptKey: 'x', type: 'essay', sectionId: 'event', required: false }]
      })
    ).toMatch(/^UNKNOWN_QUESTION_TYPE/);
    expect(
      await refused({
        questions: [{ id: 'q', promptKey: ' ', type: 'text', sectionId: 'event', required: false }]
      })
    ).toMatch(/^QUESTION_INCOMPLETE/);
    expect(await refused({ samplesRequested: { qty: 0, neededBy: '2026-10-01' } })).toMatch(
      /^SAMPLES_INVALID/
    );
    expect(await refused({ samplesRequested: { qty: 5, neededBy: 'next week' } })).toMatch(
      /^SAMPLES_INVALID/
    );
    expect(
      await refused({ items: [sticker({ oneTimeCosts: [/** @type {never} */ ('lunch')] })] })
    ).toMatch(/^ONE_TIME_COST_UNKNOWN/);
  });
});

describe('the sample RFQs are sound by the verb’s own rule', () => {
  it('Oslo, Iron and Redwood 2.0 carry the shapes the samples have', () => {
    const [oslo, iron, redwood] = ['rfq-021', 'rfq-022', 'rfq-023'].map(
      (id) => /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get(id))
    );
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (oslo).projectName).toBe('Oslo');
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (oslo).items).toHaveLength(2);
    expect(
      /** @type {NonNullable<(NonNullable<typeof oslo>)['items']>} */ (
        /** @type {import('@data/mockRfqs').RFQ} */ (oslo).items
      ).every((i) => i.variantCount === 8)
    ).toBe(true);
    expect(
      /** @type {NonNullable<(NonNullable<typeof oslo>)['tiers']>} */ (
        /** @type {import('@data/mockRfqs').RFQ} */ (oslo).tiers
      ).map((t) => t.qty)
    ).toEqual([3_000, 5_000, 7_000, 10_000, 25_000, 50_000]);
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (iron).items).toHaveLength(1);
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (iron).tiers).toHaveLength(5);
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (redwood).confidential).toBe(true);
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (redwood).items).toHaveLength(5);
    expect(
      /** @type {NonNullable<(NonNullable<typeof redwood>)['tiers']>} */ (
        /** @type {import('@data/mockRfqs').RFQ} */ (redwood).tiers
      ).map((t) => t.qty)
    ).toEqual([100_000, 200_000, 300_000]);
    expect(
      /** @type {NonNullable<(NonNullable<typeof redwood>)['items']>} */ (
        /** @type {import('@data/mockRfqs').RFQ} */ (redwood).items
      ).every((i) => i.oneTimeCosts?.includes('mold'))
    ).toBe(true);
  });

  it('each sample re-dispatched through t_rfq_create would pass rfq_create_valid', async () => {
    for (const r of RFQ_SAMPLE_SEED) {
      const res = await svc.dispatch(
        buyer,
        create({
          items: r.items,
          tiers: r.tiers,
          questions: r.questions,
          samplesRequested: r.samplesRequested,
          currency: r.currency
        })
      );
      expect(res.status, r.id).toBe('done');
    }
  });

  it('Oslo has two tiered quotes from different suppliers, whose header is DERIVED', () => {
    const quotes = quotationStore.forRfq('rfq-021');
    expect(new Set(quotes.map((q) => q.supplierId))).toEqual(new Set(['sup-013', 'sup-015']));
    const oslo = /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-021'));
    for (const q of quotes) {
      expect(q.itemQuotes).toHaveLength(2);
      expect(
        /** @type {NonNullable<typeof q.itemQuotes>} */ (q.itemQuotes).every(
          (iq) => iq.tierPrices.length === 6
        )
      ).toBe(true);
      expect({ unitPrice: q.unitPrice, totalPrice: q.totalPrice }).toEqual(
        deriveQuoteHeader(oslo, /** @type {NonNullable<typeof q.itemQuotes>} */ (q.itemQuotes))
      );
    }
    // The cheaper supplier CHANGES across the breaks — the shape a split exists for.
    /**
     * @param {string} sid
     * @param {number} tier
     */
    const at = (sid, tier) =>
      /** @type {import('../../sourcing/rfqModel').TierPrice} */ (
        /** @type {import('../../sourcing/rfqModel').QuotationItemQuote} */ (
          /** @type {NonNullable<(NonNullable<ReturnType<typeof quotes.find>>)['itemQuotes']>} */ (
            /** @type {import('@data/mockQuotations').Quotation} */ (
              quotes.find((q) => q.supplierId === sid)
            ).itemQuotes
          )[0]
        ).tierPrices.find((p) => p.tierQty === tier)
      ).unitPrice;
    expect(at('sup-013', 3_000)).toBeLessThan(at('sup-015', 3_000));
    expect(at('sup-015', 50_000)).toBeLessThan(at('sup-013', 50_000));
    // Both bidders PASS the compliance gate, so a split between them is an
    // award that can actually be made. KNOWN-BAD twin: sup-008, invited, does not.
    expect(rfqSupplierGate(oslo, 'sup-013', rfxNow()).passes).toBe(true);
    expect(rfqSupplierGate(oslo, 'sup-015', rfxNow()).passes).toBe(true);
    expect(rfqSupplierGate(oslo, 'sup-008', rfxNow()).passes).toBe(false);
  });
});
