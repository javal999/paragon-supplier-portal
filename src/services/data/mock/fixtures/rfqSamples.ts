// ────────────────────────────────────────────────────────────────────────────
// SAMPLE DATA — three RFQs shaped like Paragon's real ones (RFx working spec,
// 2026-09-21). Sample data, labelled as such on every surface that shows it;
// the supplier names are the portal's sample suppliers, not the real vendors.
//
//   · rfq-021  Oslo — two sticker items, eight variants each, SIX quantity
//     breaks per variant (3K / 5K / 7K / 10K / 25K / 50K), plate costs
//     requested, alternatives allowed, samples requested, two typed questions.
//     TWO TIERED QUOTES are already in (sup-008, sup-015), priced so the cheaper
//     supplier changes between the low and the high breaks — the shape a split
//     award exists for. sup-007 (the supplier persona) is invited and has not
//     quoted yet.
//   · rfq-022  Iron — one unit box item, FIVE breaks in total (10K to 30K).
//   · rfq-023  Redwood 2.0 — CONFIDENTIAL, five mold components, THREE breaks
//     (100K / 200K / 300K), the mold requested as a one-time cost on each.
//
// Dated relative to the declared present, the `rfxHub.ts` precedent, so every
// clock-derived state reads the same on any day the present is bumped to. They
// join the stores AFTER the existing rows, so no existing first-row position
// moves.
// ────────────────────────────────────────────────────────────────────────────

import { DECLARED_PRESENT } from '../../fixturePresent';
import type { RFQ } from '../../../../data/mockRfqs';
import type { Quotation } from '../../../../data/mockQuotations';
import type { RfiQuestion } from '../../../sourcing/types';
import {
  deriveQuoteHeader,
  type QuotationItemQuote,
  type RfqItem,
  type RfqQuantityTier,
} from '../../../sourcing/rfqModel';
import { specSheetFor } from '../../../sourcing/rfqItemTypes';

const DAY_MS = 86_400_000;
const P = Date.parse(`${DECLARED_PRESENT}T00:00:00.000Z`);
const day = (offset: number): string => new Date(P + offset * DAY_MS).toISOString().slice(0, 10);

type SheetType = Parameters<typeof specSheetFor>[0];
/** The library sheet for a type with the buyer's values filled in. */
const sheet = (type: SheetType, values: Record<string, string>) =>
  specSheetFor(type).map((f) => (values[f.key] ? { ...f, value: values[f.key] } : f));

// ── Oslo ────────────────────────────────────────────────────────────────────

const OSLO_TIERS: readonly RfqQuantityTier[] = [3_000, 5_000, 7_000, 10_000, 25_000, 50_000].map((qty) => ({
  qty,
  basis: 'perVariant' as const,
}));

const OSLO_ITEMS: readonly RfqItem[] = [
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
      inkStandard: 'Low-migration ink',
    }),
    note: 'Spec is the same as the existing Amplify variant sticker.',
    oneTimeCosts: ['dieCutPlate', 'printingPlate'],
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
      form: 'roll',
    }),
    oneTimeCosts: ['dieCutPlate', 'printingPlate'],
  },
];

const OSLO_QUESTIONS: readonly RfiQuestion[] = [
  {
    id: 'q-ship-oct-w2',
    sectionId: 'event',
    promptKey: 'Can goods ship in the 2nd week of October?',
    type: 'yesNo',
    required: true,
  },
  {
    id: 'q-sample-ready',
    sectionId: 'event',
    promptKey: 'Sample ready date',
    type: 'date',
    required: true,
  },
];

// ── Iron ────────────────────────────────────────────────────────────────────

const IRON_ITEMS: readonly RfqItem[] = [
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
      inkNote: 'Soy-based inks',
    }),
    oneTimeCosts: ['dieCutPlate', 'printingPlate'],
  },
];

// ── Redwood 2.0 ─────────────────────────────────────────────────────────────

const moldItem = (lineNo: number, componentName: string, material: string, decoration?: string): RfqItem => ({
  lineNo,
  itemType: 'moldComponent',
  description: `Redwood 2.0 ${componentName.toLowerCase()}`,
  variantCount: 1,
  uom: 'PCS',
  specFields: sheet('moldComponent', {
    componentName,
    material,
    ...(decoration ? { decorationProcesses: decoration } : {}),
  }),
  oneTimeCosts: ['mold'],
});

const REDWOOD_ITEMS: readonly RfqItem[] = [
  moldItem(1, 'Outer cap', 'ABS', 'Metallising, hot stamp'),
  moldItem(2, 'Inner cap', 'PP'),
  moldItem(3, 'Base', 'AS', 'Spray coating'),
  moldItem(4, 'Applicator wand', 'POM'),
  moldItem(5, 'Wiper', 'LDPE'),
];

export const RFQ_SAMPLE_SEED: readonly RFQ[] = [
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
    invitedSupplierIds: ['sup-007', 'sup-008', 'sup-015'],
    respondedSupplierIds: ['sup-008', 'sup-015'],
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
    extensions: [],
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
    tiers: [10_000, 15_000, 20_000, 25_000, 30_000].map((qty) => ({ qty, basis: 'total' as const })),
    allowAlternatives: false,
    confidential: false,
    extensions: [],
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
    tiers: [100_000, 200_000, 300_000].map((qty) => ({ qty, basis: 'total' as const })),
    allowAlternatives: false,
    samplesRequested: { qty: 50, neededBy: day(30) },
    confidential: true,
    extensions: [],
  },
];

// ── The two tiered Oslo quotes ──────────────────────────────────────────────

const tierPrices = (prices: readonly number[]) =>
  OSLO_TIERS.map((t, i) => ({ tierQty: t.qty, unitPrice: prices[i]! }));

/** sup-015 — dearer at the low breaks, cheapest from 25K per variant. */
const OSLO_SUP015: readonly QuotationItemQuote[] = [
  {
    itemLineNo: 1,
    specValues: [
      { key: 'brand', value: 'Avery Dennison' },
      { key: 'machine', value: 'Mark Andy P5' },
      { key: 'dieCutType', value: 'flexible' },
    ],
    tierPrices: tierPrices([420, 360, 330, 300, 238, 205]),
    moq: 3_000,
    leadTimeDays: 18,
    oneTimeCosts: [
      { name: 'Die-cut plate', amount: 1_500_000 },
      { name: 'Printing plate', amount: 2_400_000 },
    ],
  },
  {
    itemLineNo: 2,
    specValues: [
      { key: 'brand', value: 'Avery Dennison' },
      { key: 'machine', value: 'Mark Andy P5' },
      { key: 'dieCutType', value: 'flexible' },
    ],
    tierPrices: tierPrices([380, 330, 300, 275, 222, 196]),
    moq: 3_000,
    leadTimeDays: 18,
    oneTimeCosts: [
      { name: 'Die-cut plate', amount: 1_300_000 },
      { name: 'Printing plate', amount: 1_600_000 },
    ],
  },
];

/** sup-008 — cheapest at the low breaks, dearer at volume. */
const OSLO_SUP008: readonly QuotationItemQuote[] = [
  {
    itemLineNo: 1,
    specValues: [
      { key: 'brand', value: 'UPM Raflatac' },
      { key: 'machine', value: 'Nilpeter FA-17' },
      { key: 'dieCutType', value: 'flatbed' },
    ],
    tierPrices: tierPrices([395, 345, 320, 298, 262, 240]),
    moq: 5_000,
    leadTimeDays: 24,
    oneTimeCosts: [
      { name: 'Die-cut plate', amount: 1_200_000 },
      { name: 'Printing plate', amount: 3_000_000 },
    ],
  },
  {
    itemLineNo: 2,
    specValues: [
      { key: 'brand', value: 'UPM Raflatac' },
      { key: 'machine', value: 'Nilpeter FA-17' },
      { key: 'dieCutType', value: 'flatbed' },
    ],
    tierPrices: tierPrices([350, 310, 290, 270, 244, 226]),
    moq: 5_000,
    leadTimeDays: 24,
    oneTimeCosts: [
      { name: 'Die-cut plate', amount: 1_100_000 },
      { name: 'Printing plate', amount: 2_000_000 },
    ],
  },
];

const OSLO = RFQ_SAMPLE_SEED[0]!;
const header = (q: readonly QuotationItemQuote[]) => deriveQuoteHeader(OSLO, q)!;
/** The retired hand-authored axes, written 0 on purpose (see `rfxHub.ts`). */
const retiredAxes = { priceScore: 0, leadTimeScore: 0, reliabilityScore: 0, aiCompositeScore: 0, aiRecommended: false };

export const RFQ_SAMPLE_QUOTATION_SEED: readonly Quotation[] = [
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
      { questionId: 'q-sample-ready', value: day(10) },
    ],
    sampleOffer: { canSample: true, readyDate: day(10) },
  },
  {
    id: 'qt-021b',
    rfqId: 'rfq-021',
    supplierId: 'sup-008',
    submittedAt: day(-1),
    ...header(OSLO_SUP008),
    currency: 'IDR',
    leadTimeDays: 24,
    moq: 5_000,
    paymentTermsOffered: 'Net 45',
    validUntil: day(30),
    complianceScore: 74,
    ...retiredAxes,
    status: 'Submitted',
    itemQuotes: OSLO_SUP008,
    alternatives: [
      {
        itemLineNo: 2,
        description: 'Paper label instead of PP clear, same print',
        tierPrices: tierPrices([300, 265, 248, 232, 210, 195]),
      },
    ],
    answers: [
      { questionId: 'q-ship-oct-w2', value: 'no', description: 'Third week of October at the earliest.' },
      { questionId: 'q-sample-ready', value: day(12) },
    ],
    sampleOffer: { canSample: true, readyDate: day(12) },
  },
];
