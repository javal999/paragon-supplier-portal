// ────────────────────────────────────────────────────────────────────────────
// SAMPLE DATA — three RFQs shaped like Paragon's real ones (RFx working spec,
// 2026-09-21). Sample data, labelled as such on every surface that shows it;
// the supplier names are the portal's sample suppliers, not the real vendors.
//
//   · rfq-021  Oslo — two sticker items, eight variants each, SIX quantity
//     breaks per variant (3K / 5K / 7K / 10K / 25K / 50K), plate costs
//     requested, alternatives allowed, samples requested, two typed questions.
//     TWO TIERED QUOTES are already in (sup-013, sup-015), priced so the cheaper
//     supplier changes between the low and the high breaks — the shape a split
//     award exists for. Both PASS the compliance gate (CR-23), so either can
//     actually be awarded a share; sup-007 and sup-008 would not. sup-007 (the
//     supplier persona) is invited and has not quoted yet.
//   · rfq-022  Iron — one unit box item, FIVE breaks in total (10K to 30K).
//   · rfq-023  Redwood 2.0 — CONFIDENTIAL, five mold components, THREE breaks
//     (100K / 200K / 300K), the mold requested as a one-time cost on each.
//
// Dated relative to the declared present, the `rfxHub.js` precedent, so every
// clock-derived state reads the same on any day the present is bumped to. They
// join the stores AFTER the existing rows, so no existing first-row position
// moves.
// ────────────────────────────────────────────────────────────────────────────

import { DECLARED_PRESENT } from '../../fixturePresent';
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
/** @import { AwardLine, AwardRecord, RfiQuestion } from '../../../sourcing/types' */
/** @import { QuotationItemQuote, RfqItem, RfqQuantityTier } from '../../../sourcing/rfqModel' */
import { deriveQuoteHeader } from '../../../sourcing/rfqModel';
import { specSheetFor } from '../../../sourcing/rfqItemTypes';

const DAY_MS = 86_400_000;
const P = Date.parse(`${DECLARED_PRESENT}T00:00:00.000Z`);
/**
 * @param {number} offset
 * @returns {string}
 */
const day = (offset) => new Date(P + offset * DAY_MS).toISOString().slice(0, 10);

/** @typedef {Parameters<typeof specSheetFor>[0]} SheetType */
/**
 * The library sheet for a type with the buyer's values filled in.
 * @param {SheetType} type
 * @param {Record<string, string>} values
 */
const sheet = (type, values) =>
  specSheetFor(type).map((f) => (values[f.key] ? { ...f, value: values[f.key] } : f));

// ── Oslo ────────────────────────────────────────────────────────────────────

/** @type {readonly RfqQuantityTier[]} */
const OSLO_TIERS = [3_000, 5_000, 7_000, 10_000, 25_000, 50_000].map((qty) => ({
  qty,
  basis: /** @type {const} */ ('perVariant')
}));

/** @type {readonly RfqItem[]} */
const OSLO_ITEMS = [
  {
    lineNo: 1,
    itemType: 'sticker',
    description: 'Oslo front sticker',
    variantCount: 8,
    uom: 'PCS',
    specFields: sheet('sticker', {
      material: 'PP white gloss 60 mic',
      size: '50 × 80',
      printingColours: '4C (CMYK)',
      finishing: 'Gloss lamination',
      form: 'roll',
      inkStandard: 'Low-migration ink'
    }),
    note: 'Spec is the same as the existing Amplify variant sticker.',
    oneTimeCosts: ['dieCutPlate', 'printingPlate']
  },
  {
    lineNo: 2,
    itemType: 'sticker',
    description: 'Oslo back sticker (ingredients)',
    variantCount: 8,
    uom: 'PCS',
    specFields: sheet('sticker', {
      material: 'PP clear 50 mic',
      size: '45 × 60',
      printingColours: '2C + white',
      finishing: 'Matte varnish',
      form: 'roll'
    }),
    oneTimeCosts: ['dieCutPlate', 'printingPlate']
  }
];

/** @type {readonly RfiQuestion[]} */
const OSLO_QUESTIONS = [
  {
    id: 'q-ship-oct-w2',
    sectionId: 'event',
    promptKey: 'Can goods ship in the 2nd week of October?',
    type: 'yesNo',
    required: true
  },
  {
    id: 'q-sample-ready',
    sectionId: 'event',
    promptKey: 'Sample ready date',
    type: 'date',
    required: true
  }
];

// ── Iron ────────────────────────────────────────────────────────────────────

/** @type {readonly RfqItem[]} */
const IRON_ITEMS = [
  {
    lineNo: 1,
    itemType: 'unitBox',
    description: 'Iron unit box',
    variantCount: 1,
    uom: 'PCS',
    specFields: sheet('unitBox', {
      boxType: 'Reverse tuck end',
      materialGsm: 'Ivory papercard 310 gsm',
      formedSize: '45 × 45 × 120',
      flatSize: '190 × 260',
      printing: '4C offset + 1 PMS',
      finishing: 'Matte lamination',
      decoration: 'Hot stamp gold, spot UV',
      dieCutType: 'flatbed',
      inkNote: 'Soy-based inks'
    }),
    oneTimeCosts: ['dieCutPlate', 'printingPlate']
  }
];

// ── Redwood 2.0 ─────────────────────────────────────────────────────────────

/**
 * @param {number} lineNo
 * @param {string} componentName
 * @param {string} material
 * @param {string} [decoration]
 * @returns {RfqItem}
 */
const moldItem = (lineNo, componentName, material, decoration) => ({
  lineNo,
  itemType: 'moldComponent',
  description: `Redwood 2.0 ${componentName.toLowerCase()}`,
  variantCount: 1,
  uom: 'PCS',
  specFields: sheet('moldComponent', {
    componentName,
    material,
    ...(decoration ? { decorationProcesses: decoration } : {})
  }),
  oneTimeCosts: ['mold']
});

/** @type {readonly RfqItem[]} */
const REDWOOD_ITEMS = [
  moldItem(1, 'Outer cap', 'ABS', 'Metallising, hot stamp'),
  moldItem(2, 'Inner cap', 'PP'),
  moldItem(3, 'Base', 'AS', 'Spray coating'),
  moldItem(4, 'Applicator wand', 'POM'),
  moldItem(5, 'Wiper', 'LDPE')
];

/** @type {readonly RFQ[]} */
export const RFQ_SAMPLE_SEED = [
  {
    id: 'rfq-021',
    rfqNumber: 'RFQ-2026-021',
    title: 'Oslo variant stickers — launch run',
    projectName: 'Oslo',
    materialCategory: 'Packaging',
    materialIds: [],
    buyerId: 'buyer-001',
    status: 'Open',
    createdAt: day(-5),
    responseDeadline: day(9),
    awardDeadline: day(16),
    invitedSupplierIds: ['sup-007', 'sup-008', 'sup-013', 'sup-015'],
    respondedSupplierIds: ['sup-013', 'sup-015'],
    // The first break, per variant, across both items: 3,000 × 8 × 2. The
    // header total a quote derives is evaluated at this break (`deriveQuoteHeader`).
    totalQty: 48_000,
    uom: 'PCS',
    currency: 'IDR',
    incoterms: 'DDP Jakarta',
    paymentTerms: 'Net 60',
    items: OSLO_ITEMS,
    tiers: OSLO_TIERS,
    questions: OSLO_QUESTIONS,
    allowAlternatives: true,
    samplesRequested: { qty: 20, neededBy: day(14) },
    confidential: false,
    extensions: []
  },
  {
    id: 'rfq-022',
    rfqNumber: 'RFQ-2026-022',
    title: 'Iron unit box — papercard',
    projectName: 'Iron',
    materialCategory: 'Packaging',
    materialIds: [],
    buyerId: 'buyer-001',
    status: 'Open',
    createdAt: day(-2),
    responseDeadline: day(12),
    awardDeadline: day(19),
    invitedSupplierIds: ['sup-008', 'sup-015'],
    respondedSupplierIds: [],
    totalQty: 10_000,
    uom: 'PCS',
    currency: 'IDR',
    incoterms: 'DDP Jakarta',
    paymentTerms: 'Net 45',
    items: IRON_ITEMS,
    tiers: [10_000, 15_000, 20_000, 25_000, 30_000].map((qty) => ({
      qty,
      basis: /** @type {const} */ ('total')
    })),
    allowAlternatives: false,
    confidential: false,
    extensions: []
  },
  {
    id: 'rfq-023',
    rfqNumber: 'RFQ-2026-023',
    title: 'Redwood 2.0 lip cream — mold components',
    projectName: 'Redwood 2.0',
    materialCategory: 'Packaging',
    materialIds: [],
    buyerId: 'buyer-001',
    status: 'Open',
    createdAt: day(-3),
    responseDeadline: day(15),
    awardDeadline: day(25),
    invitedSupplierIds: ['sup-007', 'sup-013'],
    respondedSupplierIds: [],
    totalQty: 100_000,
    uom: 'PCS',
    currency: 'IDR',
    incoterms: 'FCA Tangerang',
    paymentTerms: 'Net 60',
    items: REDWOOD_ITEMS,
    tiers: [100_000, 200_000, 300_000].map((qty) => ({
      qty,
      basis: /** @type {const} */ ('total')
    })),
    allowAlternatives: false,
    samplesRequested: { qty: 50, neededBy: day(30) },
    confidential: true,
    extensions: []
  }
];

// ── The two tiered Oslo quotes ──────────────────────────────────────────────

/** @param {readonly number[]} prices */
const tierPrices = (prices) =>
  OSLO_TIERS.map((t, i) => ({
    tierQty: t.qty,
    unitPrice: /** @type {NonNullable<(typeof prices)[number]>} */ (prices[i])
  }));

/**
 * sup-015 — dearer at the low breaks, cheapest from 25K per variant.
 * @type {readonly QuotationItemQuote[]}
 */
const OSLO_SUP015 = [
  {
    itemLineNo: 1,
    specValues: [
      { key: 'brand', value: 'Avery Dennison' },
      { key: 'machine', value: 'Mark Andy P5' },
      { key: 'dieCutType', value: 'flexible' }
    ],
    tierPrices: tierPrices([420, 360, 330, 300, 238, 205]),
    moq: 3_000,
    leadTimeDays: 18,
    oneTimeCosts: [
      { name: 'Die-cut plate', amount: 1_500_000 },
      { name: 'Printing plate', amount: 2_400_000 }
    ]
  },
  {
    itemLineNo: 2,
    specValues: [
      { key: 'brand', value: 'Avery Dennison' },
      { key: 'machine', value: 'Mark Andy P5' },
      { key: 'dieCutType', value: 'flexible' }
    ],
    tierPrices: tierPrices([380, 330, 300, 275, 222, 196]),
    moq: 3_000,
    leadTimeDays: 18,
    oneTimeCosts: [
      { name: 'Die-cut plate', amount: 1_300_000 },
      { name: 'Printing plate', amount: 1_600_000 }
    ]
  }
];

/**
 * sup-013 — cheapest at the low breaks, dearer at volume. Its lead time is 20
 * days (it read 24): at 24 the six-day gap outweighed a 3% price lead on the
 * lead-time axis, so the best COMPOSITE never changed between breaks and the
 * evaluation-break selector had nothing to show. At 20 the ranking follows the
 * price: sup-013 is best-scored at 3K and 5K, sup-015 from 7K.
 * @type {readonly QuotationItemQuote[]}
 */
const OSLO_SUP013 = [
  {
    itemLineNo: 1,
    specValues: [
      { key: 'brand', value: 'UPM Raflatac' },
      { key: 'machine', value: 'Nilpeter FA-17' },
      { key: 'dieCutType', value: 'flatbed' }
    ],
    tierPrices: tierPrices([395, 345, 320, 298, 262, 240]),
    moq: 5_000,
    leadTimeDays: 20,
    oneTimeCosts: [
      { name: 'Die-cut plate', amount: 1_200_000 },
      { name: 'Printing plate', amount: 3_000_000 }
    ]
  },
  {
    itemLineNo: 2,
    specValues: [
      { key: 'brand', value: 'UPM Raflatac' },
      { key: 'machine', value: 'Nilpeter FA-17' },
      { key: 'dieCutType', value: 'flatbed' }
    ],
    tierPrices: tierPrices([350, 310, 290, 270, 244, 226]),
    moq: 5_000,
    leadTimeDays: 20,
    oneTimeCosts: [
      { name: 'Die-cut plate', amount: 1_100_000 },
      { name: 'Printing plate', amount: 2_000_000 }
    ]
  }
];

const OSLO = /** @type {RFQ} */ (RFQ_SAMPLE_SEED[0]);
/** @param {readonly QuotationItemQuote[]} q */
const header = (q) =>
  /** @type {NonNullable<ReturnType<typeof deriveQuoteHeader>>} */ (deriveQuoteHeader(OSLO, q));
/** The retired hand-authored axes, written 0 on purpose (see `rfxHub.js`). */
const retiredAxes = {
  priceScore: 0,
  leadTimeScore: 0,
  reliabilityScore: 0,
  aiCompositeScore: 0,
  aiRecommended: false
};

/** @type {readonly Quotation[]} */
export const RFQ_SAMPLE_QUOTATION_SEED = [
  {
    id: 'qt-021a',
    rfqId: 'rfq-021',
    supplierId: 'sup-015',
    submittedAt: day(-2),
    ...header(OSLO_SUP015),
    currency: 'IDR',
    leadTimeDays: 18,
    moq: 3_000,
    paymentTermsOffered: 'Net 60',
    validUntil: day(40),
    complianceScore: 90,
    ...retiredAxes,
    status: 'Submitted',
    notes: 'Flexible die, so a new variant needs a printing plate only.',
    itemQuotes: OSLO_SUP015,
    answers: [
      { questionId: 'q-ship-oct-w2', value: 'yes' },
      { questionId: 'q-sample-ready', value: day(10) }
    ],
    sampleOffer: { canSample: true, readyDate: day(10) }
  },
  {
    id: 'qt-021b',
    rfqId: 'rfq-021',
    supplierId: 'sup-013',
    submittedAt: day(-1),
    ...header(OSLO_SUP013),
    currency: 'IDR',
    leadTimeDays: 20,
    moq: 5_000,
    paymentTermsOffered: 'Net 45',
    validUntil: day(30),
    complianceScore: 68,
    ...retiredAxes,
    status: 'Submitted',
    itemQuotes: OSLO_SUP013,
    alternatives: [
      {
        itemLineNo: 2,
        description: 'Paper label instead of PP clear, same print',
        tierPrices: tierPrices([300, 265, 248, 232, 210, 195])
      }
    ],
    answers: [
      {
        questionId: 'q-ship-oct-w2',
        value: 'no',
        description: 'Third week of October at the earliest.'
      },
      { questionId: 'q-sample-ready', value: day(12) }
    ],
    sampleOffer: { canSample: true, readyDate: day(12) }
  }
];

// ── A historical award, split per item (BL-37) ──────────────────────────────
//
// rfq-024 — the Amplify variant stickers Oslo's note points at ("Spec is the
// same as the existing Amplify variant sticker"). Awarded, SPLIT PER ITEM across
// the two Oslo bidders at the 10K-per-variant evaluation break, so the award
// history shows a multi-supplier award item by item rather than one winner.
// Sample data, like everything in this file.

/** @type {readonly RfqQuantityTier[]} */
const AMPLIFY_TIERS = [5_000, 10_000, 25_000].map((qty) => ({
  qty,
  basis: /** @type {const} */ ('perVariant')
}));

/** @type {readonly RfqItem[]} */
const AMPLIFY_ITEMS = [
  {
    lineNo: 1,
    itemType: 'sticker',
    description: 'Amplify front sticker',
    variantCount: 6,
    uom: 'PCS',
    specFields: sheet('sticker', {
      material: 'PP white gloss 60 mic',
      size: '50 × 80',
      printingColours: '4C (CMYK)',
      finishing: 'Gloss lamination',
      form: 'roll',
      inkStandard: 'Low-migration ink'
    }),
    oneTimeCosts: ['dieCutPlate', 'printingPlate']
  },
  {
    lineNo: 2,
    itemType: 'sticker',
    description: 'Amplify back sticker (ingredients)',
    variantCount: 6,
    uom: 'PCS',
    specFields: sheet('sticker', {
      material: 'PP clear 50 mic',
      size: '45 × 60',
      printingColours: '2C + white',
      finishing: 'Matte varnish',
      form: 'roll'
    }),
    oneTimeCosts: ['dieCutPlate', 'printingPlate']
  }
];

/** @type {RFQ} */
const AMPLIFY = {
  id: 'rfq-024',
  rfqNumber: 'RFQ-2026-024',
  title: 'Amplify variant stickers — first run',
  projectName: 'Amplify',
  materialCategory: 'Packaging',
  materialIds: [],
  buyerId: 'buyer-001',
  status: 'Awarded',
  createdAt: day(-70),
  responseDeadline: day(-56),
  awardDeadline: day(-49),
  invitedSupplierIds: ['sup-008', 'sup-013', 'sup-015'],
  respondedSupplierIds: ['sup-013', 'sup-015'],
  // 10K per variant × 6 variants × 2 items: the break it was awarded at.
  totalQty: 120_000,
  uom: 'PCS',
  currency: 'IDR',
  incoterms: 'DDP Jakarta',
  paymentTerms: 'Net 60',
  estimatedValue: 40_000_000,
  items: AMPLIFY_ITEMS,
  tiers: AMPLIFY_TIERS,
  allowAlternatives: false,
  confidential: false,
  extensions: [],
  awardedQuotationId: 'qt-024b',
  awardedSupplierId: 'sup-013'
};

/** @param {readonly number[]} prices */
const amplifyPrices = (prices) =>
  AMPLIFY_TIERS.map((t, i) => ({
    tierQty: t.qty,
    unitPrice: /** @type {NonNullable<(typeof prices)[number]>} */ (prices[i])
  }));

/**
 * @param {string} brand
 * @param {string} machine
 * @param {string} dieCutType
 */
const specOf = (brand, machine, dieCutType) => [
  { key: 'brand', value: brand },
  { key: 'machine', value: machine },
  { key: 'dieCutType', value: dieCutType }
];

/**
 * sup-013 — the cheaper front sticker.
 * @type {readonly QuotationItemQuote[]}
 */
const AMPLIFY_SUP013 = [
  {
    itemLineNo: 1,
    specValues: specOf('UPM Raflatac', 'Nilpeter FA-17', 'flatbed'),
    tierPrices: amplifyPrices([330, 290, 250]),
    moq: 5_000,
    leadTimeDays: 21,
    oneTimeCosts: [
      { name: 'Die-cut plate', amount: 1_200_000 },
      { name: 'Printing plate', amount: 2_400_000 }
    ]
  },
  {
    itemLineNo: 2,
    specValues: specOf('UPM Raflatac', 'Nilpeter FA-17', 'flatbed'),
    tierPrices: amplifyPrices([320, 285, 248]),
    moq: 5_000,
    leadTimeDays: 21,
    oneTimeCosts: [
      { name: 'Die-cut plate', amount: 1_100_000 },
      { name: 'Printing plate', amount: 1_900_000 }
    ]
  }
];

/**
 * sup-015 — the cheaper back sticker.
 * @type {readonly QuotationItemQuote[]}
 */
const AMPLIFY_SUP015 = [
  {
    itemLineNo: 1,
    specValues: specOf('Avery Dennison', 'Mark Andy P5', 'flexible'),
    tierPrices: amplifyPrices([350, 310, 262]),
    moq: 3_000,
    leadTimeDays: 18,
    oneTimeCosts: [
      { name: 'Die-cut plate', amount: 1_500_000 },
      { name: 'Printing plate', amount: 2_200_000 }
    ]
  },
  {
    itemLineNo: 2,
    specValues: specOf('Avery Dennison', 'Mark Andy P5', 'flexible'),
    tierPrices: amplifyPrices([300, 262, 226]),
    moq: 3_000,
    leadTimeDays: 18,
    oneTimeCosts: [
      { name: 'Die-cut plate', amount: 1_300_000 },
      { name: 'Printing plate', amount: 1_500_000 }
    ]
  }
];

/** @param {readonly QuotationItemQuote[]} q */
const amplifyHeader = (q) =>
  /** @type {NonNullable<ReturnType<typeof deriveQuoteHeader>>} */ (deriveQuoteHeader(AMPLIFY, q));

/**
 * Joins the RFQ store AFTER `RFQ_SAMPLE_SEED`, so no existing row moves.
 * @type {readonly RFQ[]}
 */
export const RFQ_SAMPLE_HISTORY_SEED = [AMPLIFY];

/** @type {readonly Quotation[]} */
export const RFQ_SAMPLE_HISTORY_QUOTATION_SEED = [
  {
    id: 'qt-024a',
    rfqId: 'rfq-024',
    supplierId: 'sup-015',
    submittedAt: day(-60),
    ...amplifyHeader(AMPLIFY_SUP015),
    currency: 'IDR',
    leadTimeDays: 18,
    moq: 3_000,
    paymentTermsOffered: 'Net 60',
    validUntil: day(-10),
    complianceScore: 90,
    ...retiredAxes,
    status: 'Awarded',
    itemQuotes: AMPLIFY_SUP015
  },
  {
    id: 'qt-024b',
    rfqId: 'rfq-024',
    supplierId: 'sup-013',
    submittedAt: day(-59),
    ...amplifyHeader(AMPLIFY_SUP013),
    currency: 'IDR',
    leadTimeDays: 21,
    moq: 5_000,
    paymentTermsOffered: 'Net 45',
    validUntil: day(-20),
    complianceScore: 70,
    ...retiredAxes,
    status: 'Awarded',
    itemQuotes: AMPLIFY_SUP013
  }
];

/** 10K per variant × 6 variants = 60,000 pieces per item at the award break. */
const AMPLIFY_ITEM_PIECES = 60_000;
/**
 * @param {string} supplierId
 * @param {string} quotationId
 * @param {number} lineNo
 * @param {number} sharePct
 * @returns {AwardLine}
 */
const amplifyLine = (supplierId, quotationId, lineNo, sharePct) => ({
  supplierId,
  quotationId,
  itemCode: '',
  itemLineNo: lineNo,
  sharePct,
  quantity: Math.round((AMPLIFY_ITEM_PIECES * sharePct) / 100),
  splitBasis: 'pct',
  awardTierQty: 10_000
});

/**
 * The recorded split. `bestScoredByItem` is what CR-15 ranks first per item at
 * 10K — pinned against the live derivation by `rfqCompareAward.test.js`, so the
 * stored history cannot claim a best score the rule would not give.
 * @type {readonly AwardRecord[]}
 */
export const RFQ_SAMPLE_AWARD_SEED = [
  {
    id: 'aw-0002',
    eventType: 'rfq',
    eventId: 'rfq-024',
    awardedAt: `${day(-48)}T03:00:00.000Z`,
    lines: [
      amplifyLine('sup-013', 'qt-024b', 1, 60),
      amplifyLine('sup-015', 'qt-024a', 1, 40),
      amplifyLine('sup-015', 'qt-024a', 2, 70),
      amplifyLine('sup-013', 'qt-024b', 2, 30)
    ],
    reason: 'Split on both items so either press can cover a variant launch alone.',
    bestScoredQuotationId: 'qt-024a',
    bestScoredByItem: [
      { itemLineNo: 1, quotationId: 'qt-024b' },
      { itemLineNo: 2, quotationId: 'qt-024a' }
    ],
    notAwardedSupplierIds: ['sup-008']
  }
];

// ── BL-93 — a DRAFT shaped like Iron, so "Edit draft" has something real to
//    open. Tiered (five total breaks), one unit box item with a buyer-filled
//    spec sheet, two invitees, dates set. Nothing has been sent: suppliers do
//    not see it (the read excludes Draft). Sample data, like the rest.

/** @type {readonly RFQ[]} */
export const RFQ_SAMPLE_DRAFT_SEED = [
  {
    id: 'rfq-025',
    rfqNumber: 'RFQ-2026-025',
    title: 'Iron refill carton — papercard',
    projectName: 'Iron',
    materialCategory: 'Packaging',
    materialIds: [],
    buyerId: 'buyer-001',
    status: 'Draft',
    createdAt: day(-1),
    responseDeadline: day(14),
    awardDeadline: day(21),
    invitedSupplierIds: ['sup-008', 'sup-015'],
    respondedSupplierIds: [],
    totalQty: 5_000,
    uom: 'PCS',
    currency: 'IDR',
    incoterms: 'DDP Jakarta',
    paymentTerms: 'Net 45',
    items: [
      {
        .../** @type {RfqItem} */ (IRON_ITEMS[0]),
        description: 'Iron refill carton',
        specFields: sheet('unitBox', {
          boxType: 'Crash-lock bottom',
          materialGsm: 'Ivory papercard 350 gsm',
          formedSize: '60 × 60 × 140',
          flatSize: '240 × 300',
          printing: '4C offset',
          finishing: 'Matte lamination',
          dieCutType: 'flatbed'
        }),
        note: 'Same artwork family as the Iron unit box (RFQ-2026-022).'
      }
    ],
    tiers: [5_000, 10_000, 15_000, 20_000, 30_000].map((qty) => ({
      qty,
      basis: /** @type {const} */ ('total')
    })),
    allowAlternatives: false,
    confidential: false,
    extensions: []
  }
];
