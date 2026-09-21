// ────────────────────────────────────────────────────────────────────────────
// BL-64 — COMPLIANCE GATE DEMO DATA (CR-23), ILLUSTRATIVE.
//
// Five sample RFQs, labelled as such in their titles, that between them put
// every outcome of `complianceGate` in front of a buyer on the sourcing pages.
// The scenario set was derived from the gate itself (`sourcing/complianceGate.ts`):
// five criteria (halal, BPOM, GMP / ISO 22716, status, OTIF), the material
// master's applicability deciding which apply, the registry-over-master rule,
// the "on or after today" expiry comparison and the `>=` OTIF minimum.
//
// What each RFQ shows at the declared present (derived at read, never stored):
//   · rfq-016 (Closed) Glycerin, raw material (halal + GMP apply, BPOM does not):
//       sup-001 passes · sup-017 passes, its halal certificate expires TODAY ·
//       sup-018 fails halal, expired YESTERDAY · sup-009 fails halal, holds none ·
//       sup-013 fails GMP alone. A split award between sup-001 and sup-017 works.
//   · rfq-017 (Closed) Niacinamide, active (halal + BPOM + GMP apply):
//       sup-006 passes · sup-005 passes because its compliance-registry row
//       (creg-0015, valid through the present) overrides a master that holds no
//       halal certificate · sup-016 fails BPOM alone · sup-011 fails halal, BPOM
//       and GMP at once.
//   · rfq-018 (Open, still collecting quotes) Lauric acid, raw material:
//       sup-001 passes · sup-002 fails halal although its MASTER certificate is
//       valid, because the registry row for this material (creg-0017) expired ·
//       sup-017 invited and has not quoted yet.
//   · rfq-019 (Closed) PET bottle and cap, packaging (no certificate applies):
//       sup-019 passes at OTIF exactly 80% · sup-020 fails OTIF alone at 79% ·
//       sup-021 (Suspended) and sup-022 (Blacklisted) fail on status alone ·
//       sup-011 holds no certificate and no delivery history and passes.
//   · rfq-020 (Closed) Salicylic acid: EVERY bidder fails — sup-011 on halal,
//       BPOM and GMP, sup-004 on halal and BPOM, sup-009 on halal. Nothing can
//       be awarded, and the event page says so.
//
// OTIF is CALCULATED (REQ-E10-01), so the 80% and 79% suppliers need a real
// delivery history: the umbrella orders, call-offs and goods receipts below.
// Every date is an OFFSET from the declared present.
//
// Everything here joins the SAME stores the rest of the sample set lives in
// (rfqStore, quotationStore, callOffStore, goodsReceiptStore,
// purchaseOrderStore) — a buyer sees one board, not a demo board beside it.
// ────────────────────────────────────────────────────────────────────────────

import { DECLARED_PRESENT } from '../../fixturePresent';
import type { RFQ } from '../../../../data/mockRfqs';
import type { Quotation } from '../../../../data/mockQuotations';
import type { GoodsReceipt } from '../../../../data/mockGoodsReceipts';
import { ChannelType, POStatus, type CallOff, type PurchaseOrder } from '../../types';

const DAY_MS = 86_400_000;
const P = Date.parse(`${DECLARED_PRESENT}T00:00:00.000Z`);

/** A calendar day `offset` days from the declared present. */
const day = (offset: number): string => new Date(P + offset * DAY_MS).toISOString().slice(0, 10);
/** An instant `offset` days from the declared present at `hourUtc` (WIB is UTC+7). */
const at = (offset: number, hourUtc = 3): string =>
  new Date(P + offset * DAY_MS + hourUtc * 3_600_000).toISOString();

// ── The delivery history behind the OTIF boundary ───────────────────────────

const SUP_019 = { supplierId: 'sup-019', supplierName: 'PT Sample Preform Bekasi (illustrative)' } as const;
const SUP_020 = { supplierId: 'sup-020', supplierName: 'PT Sample PET Bottle Karawang (illustrative)' } as const;
/**
 * BL-52 — the ONE A-band supplier in the sample set. Every measured supplier
 * graded B, C or D, so the performance-band filter's first band could never be
 * seen. Two call-offs received on their date in full make OTIF 100%; the
 * umbrella is confirmed to the end of its term, so no CFOT is measured, and the
 * score reads 100 → A. It changes none of sup-016's gate results: it still
 * fails BPOM alone on rfq-017, and "No history" passed OTIF before as 100% does now.
 */
const SUP_016 = { supplierId: 'sup-016', supplierName: 'PT Sample Active Ingredient Indonesia (illustrative)' } as const;

interface Material {
  readonly materialCode: string;
  readonly description: string;
  readonly unitPrice: number;
  /** Unit of the PO line and call-off. Absent = PCS (the packaging rows). */
  readonly uom?: string;
}

const BOTTLE_250: Material = { materialCode: 'PK-PETB-8810', description: 'PET Bottle 250ml', unitPrice: 1_450 };
const FLIP_CAP: Material = { materialCode: 'PK-CAPF-8820', description: 'Flip-Top Cap 24mm', unitPrice: 650 };
const BOTTLE_100: Material = {
  materialCode: 'PK-PETB-8802',
  description: 'PET Bottle 100ml Clear — Emina Series',
  unitPrice: 1_233,
};
const BOTTLE_200: Material = {
  materialCode: 'PK-PETB-8801',
  description: 'PET Bottle 200ml Frosted — Wardah Series',
  unitPrice: 1_600,
};
// BL-52 — the A-band supplier's material; stated on `mockPurchaseOrders.ts`'s
// PO line li-013a with this description and unit, so no meaning is new here.
const PANTHENOL: Material = {
  materialCode: 'AI-PANTO-6640',
  description: 'D-Panthenol 75% (Provitamin B5)',
  unitPrice: 280_000,
  uom: 'KG',
};
// ⚠️ Only codes the document lane ALREADY states a meaning for (PO lines in
// `mockPurchaseOrders.ts` / `callOffs.ts`). The RFQ-header-only codes
// (PK-PETB-8825, PK-ALCP-2441 …) are deliberately NOT used: a PO line naming
// one would rewrite the provenance census `materialMasterAuthoring.test.ts`
// pins — which lane first stated each master code's meaning.

/** One umbrella order a supplier's call-offs draw against, confirmed through the contract end. */
const umbrellaPo = (
  id: string,
  poNumber: string,
  supplier: { supplierId: string; supplierName: string },
  lines: readonly (Material & { lineId: string; quantity: number })[],
): PurchaseOrder => ({
  id,
  poNumber,
  sourceOfSupply: 'Outline Agreement (illustrative)',
  ...supplier,
  status: POStatus.CONFIRMED,
  channel: ChannelType.WEB,
  currency: 'IDR',
  totalValue: lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
  orderDate: day(-100),
  // The umbrella is confirmed to the END of its term, so no CFOT is measured on
  // it yet — the boundary these suppliers exist for is OTIF, per call-off.
  requestedDeliveryDate: day(60),
  confirmedDeliveryDate: day(60),
  daysOverdue: 0,
  acknowledgmentTimeHours: 6,
  lineItems: lines.map((l) => ({
    id: l.lineId,
    materialCode: l.materialCode,
    description: l.description,
    quantity: l.quantity,
    uom: l.uom ?? 'PCS',
    unitPrice: l.unitPrice,
    confirmedQty: l.quantity,
  })),
});

export const GATE_DEMO_PURCHASE_ORDERS: readonly PurchaseOrder[] = [
  umbrellaPo('po-191', 'PO-2026-00191', SUP_019, [
    { ...BOTTLE_250, lineId: 'li-191a', quantity: 300_000 },
    { ...FLIP_CAP, lineId: 'li-191b', quantity: 300_000 },
  ]),
  umbrellaPo('po-192', 'PO-2026-00192', SUP_020, [
    { ...BOTTLE_100, lineId: 'li-192a', quantity: 400_000 },
    { ...FLIP_CAP, lineId: 'li-192b', quantity: 400_000 },
    { ...BOTTLE_200, lineId: 'li-192c', quantity: 150_000 },
  ]),
  // BL-52 — the A-band supplier's umbrella order.
  umbrellaPo('po-193', 'PO-2026-00193', SUP_016, [{ ...PANTHENOL, lineId: 'li-193a', quantity: 6_000 }]),
];

const poOf = (poId: string) => GATE_DEMO_PURCHASE_ORDERS.find((p) => p.id === poId)!;

/** A confirmed call-off due `needOffset` days from the present, auto-approved. */
const callOff = (n: number, poId: string, lineId: string, quantity: number, needOffset: number): CallOff => {
  const po = poOf(poId);
  const line = po.lineItems.find((l) => l.id === lineId)!;
  return {
    id: `co-${String(n).padStart(4, '0')}`,
    callOffNumber: `CO-2026-${String(n).padStart(4, '0')}`,
    poId,
    poNumber: po.poNumber,
    poLineId: lineId,
    supplierId: po.supplierId,
    supplierName: po.supplierName,
    materialCode: line.materialCode,
    description: line.description,
    uom: line.uom,
    unitPrice: line.unitPrice,
    currency: 'IDR',
    quantity,
    needDate: day(needOffset),
    type: 'forecast',
    status: 'Confirmed',
    releasedAt: at(needOffset - 10, 2),
    confirmation: {
      kind: 'confirm',
      deliveries: [{ quantity, date: day(needOffset) }],
      confirmedAt: at(needOffset - 9, 4),
      approval: 'auto',
    },
    dispatches: [],
    notes: [],
  };
};

/**
 * The call-offs. Numbered straight after the base seed's CO-2026-0013, so the
 * store's next assigned number (seed length + 1) never collides.
 *
 * sup-019 — 5 measured: bottle + cap received on their date at −70 and −42 days
 *   (4 met); the bottle due at −14 never arrived (missed). 4 / 5 = 80%.
 * sup-020 — 14 measured: 100ml bottle + cap received on their date at −84, −70,
 *   −56, −42 and −28 days and a bottle alone at −14 (11 met); the 200ml bottle
 *   due at −77, −49 and −21 never arrived (3 missed). 11 / 14 = 78.6%, shown 79%.
 *   The misses sit on a material with no receipt at all, so no receipt can be
 *   matched to them within the 7-day window and turn a miss into a late. Three
 *   misses on one material is also a delivery drift (CR-09), and the call-off
 *   page shows it — a 79% supplier honestly carries one.
 */
export const GATE_DEMO_CALL_OFFS: readonly CallOff[] = [
  callOff(14, 'po-191', 'li-191a', 40_000, -70),
  callOff(15, 'po-191', 'li-191b', 40_000, -70),
  callOff(16, 'po-191', 'li-191a', 40_000, -42),
  callOff(17, 'po-191', 'li-191b', 40_000, -42),
  callOff(18, 'po-191', 'li-191a', 40_000, -14),
  callOff(19, 'po-192', 'li-192a', 30_000, -84),
  callOff(20, 'po-192', 'li-192b', 30_000, -84),
  callOff(21, 'po-192', 'li-192c', 10_000, -77),
  callOff(22, 'po-192', 'li-192a', 30_000, -70),
  callOff(23, 'po-192', 'li-192b', 30_000, -70),
  callOff(24, 'po-192', 'li-192a', 30_000, -56),
  callOff(25, 'po-192', 'li-192b', 30_000, -56),
  callOff(26, 'po-192', 'li-192c', 10_000, -49),
  callOff(27, 'po-192', 'li-192a', 30_000, -42),
  callOff(28, 'po-192', 'li-192b', 30_000, -42),
  callOff(29, 'po-192', 'li-192a', 30_000, -28),
  callOff(30, 'po-192', 'li-192b', 30_000, -28),
  callOff(31, 'po-192', 'li-192c', 10_000, -21),
  callOff(32, 'po-192', 'li-192a', 30_000, -14),
  // BL-52 — sup-016, 2 measured, both received on their date in full: 100% → A.
  callOff(33, 'po-193', 'li-193a', 500, -56),
  callOff(34, 'po-193', 'li-193a', 500, -28),
];

/**
 * One goods receipt per delivery, posted and accepted in full on the need date.
 * The call-offs had dispatch notices rather than ASNs, so the receipts name no
 * ASN — the GR pages say "Received without ASN", which is true of them.
 */
const receipt = (
  n: number,
  poId: string,
  offset: number,
  lines: readonly { material: Material; quantity: number }[],
): GoodsReceipt => {
  const po = poOf(poId);
  return {
    id: `gr-${n}`,
    grNumber: `GR-2026-${n}`,
    asnId: '',
    asnNumber: '',
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: po.supplierName,
    receivedDate: day(offset),
    receivedBy: 'Warehouse Supervisor',
    status: 'Posted to SAP',
    inspectionResults: lines.map(({ material, quantity }) => ({
      materialCode: material.materialCode,
      description: material.description,
      qtyExpected: quantity,
      qtyReceived: quantity,
      qtyAccepted: quantity,
      qtyRejected: 0,
      visualCheck: 'Pass',
      packagingCheck: 'Pass',
    })),
    disposition: 'Accept',
    sapMaterialDoc: `MAT-DOC-5${String(n).padStart(5, '0')}`,
    notes: 'Sample delivery history for the compliance gate demo (illustrative).',
  };
};

const pair = (bottle: Material, quantity: number) => [
  { material: bottle, quantity },
  { material: FLIP_CAP, quantity },
];

export const GATE_DEMO_GOODS_RECEIPTS: readonly GoodsReceipt[] = [
  receipt(101, 'po-191', -70, pair(BOTTLE_250, 40_000)),
  receipt(102, 'po-191', -42, pair(BOTTLE_250, 40_000)),
  receipt(103, 'po-192', -84, pair(BOTTLE_100, 30_000)),
  receipt(104, 'po-192', -70, pair(BOTTLE_100, 30_000)),
  receipt(105, 'po-192', -56, pair(BOTTLE_100, 30_000)),
  receipt(106, 'po-192', -42, pair(BOTTLE_100, 30_000)),
  receipt(107, 'po-192', -28, pair(BOTTLE_100, 30_000)),
  receipt(108, 'po-192', -14, [{ material: BOTTLE_100, quantity: 30_000 }]),
  // BL-52 — sup-016's two on-time, in-full deliveries (the A band).
  receipt(109, 'po-193', -56, [{ material: PANTHENOL, quantity: 500 }]),
  receipt(110, 'po-193', -28, [{ material: PANTHENOL, quantity: 500 }]),
];

// ── The sample RFQs ─────────────────────────────────────────────────────────

const rfq = (
  n: number,
  title: string,
  fields: Pick<RFQ, 'materialCategory' | 'materialIds' | 'status' | 'invitedSupplierIds' | 'respondedSupplierIds' | 'totalQty' | 'uom' | 'estimatedValue'> & {
    created: number;
    respond: number;
    award: number;
  },
): RFQ => ({
  id: `rfq-0${n}`,
  rfqNumber: `RFQ-2026-0${n}`,
  title: `Compliance gate demo — ${title} (sample)`,
  materialCategory: fields.materialCategory,
  materialIds: fields.materialIds,
  buyerId: 'buyer-001',
  status: fields.status,
  createdAt: day(fields.created),
  responseDeadline: day(fields.respond),
  awardDeadline: day(fields.award),
  invitedSupplierIds: fields.invitedSupplierIds,
  respondedSupplierIds: fields.respondedSupplierIds,
  totalQty: fields.totalQty,
  uom: fields.uom,
  estimatedValue: fields.estimatedValue,
  currency: 'IDR',
  incoterms: 'DDP Jakarta',
  paymentTerms: 'Net 45',
  extensions: [],
});

export const GATE_DEMO_RFQ_SEED: readonly RFQ[] = [
  rfq(16, 'Glycerin 99.5%, halal certificate dates', {
    materialCategory: 'Emulsifiers',
    materialIds: ['RM-EMUL-3310'],
    status: 'Closed',
    invitedSupplierIds: ['sup-001', 'sup-017', 'sup-018', 'sup-009', 'sup-013'],
    respondedSupplierIds: ['sup-001', 'sup-017', 'sup-018', 'sup-009', 'sup-013'],
    totalQty: 60_000,
    uom: 'KG',
    estimatedValue: 1_140_000_000,
    created: -20,
    respond: -3,
    award: 10,
  }),
  rfq(17, 'Niacinamide, BPOM and the compliance registry', {
    materialCategory: 'Active Ingredients',
    materialIds: ['AI-NIAC-6601'],
    status: 'Closed',
    invitedSupplierIds: ['sup-005', 'sup-006', 'sup-016', 'sup-011'],
    respondedSupplierIds: ['sup-005', 'sup-006', 'sup-016', 'sup-011'],
    totalQty: 3_000,
    uom: 'KG',
    estimatedValue: 690_000_000,
    created: -18,
    respond: -2,
    award: 12,
  }),
  rfq(18, 'Lauric acid, registry row expired', {
    materialCategory: 'Emulsifiers',
    materialIds: ['RM-LAURIC-7200'],
    status: 'Open',
    invitedSupplierIds: ['sup-001', 'sup-002', 'sup-017'],
    respondedSupplierIds: ['sup-001', 'sup-002'],
    totalQty: 20_000,
    uom: 'KG',
    estimatedValue: 560_000_000,
    created: -5,
    respond: 9,
    award: 16,
  }),
  rfq(19, 'PET bottle 250ml and cap, supplier status and OTIF', {
    materialCategory: 'Packaging',
    materialIds: ['PK-PETB-8810', 'PK-CAPF-8820'],
    status: 'Closed',
    invitedSupplierIds: ['sup-019', 'sup-020', 'sup-021', 'sup-022', 'sup-011'],
    respondedSupplierIds: ['sup-019', 'sup-020', 'sup-021', 'sup-022', 'sup-011'],
    totalQty: 500_000,
    uom: 'PCS',
    estimatedValue: 1_050_000_000,
    created: -22,
    respond: -4,
    award: 8,
  }),
  rfq(20, 'Salicylic acid, no bidder passes', {
    materialCategory: 'Active Ingredients',
    materialIds: ['AI-SALI-6800'],
    status: 'Closed',
    invitedSupplierIds: ['sup-011', 'sup-004', 'sup-009'],
    respondedSupplierIds: ['sup-011', 'sup-004', 'sup-009'],
    totalQty: 2_000,
    uom: 'KG',
    estimatedValue: 380_000_000,
    created: -19,
    respond: -1,
    award: 11,
  }),
];

/** The retired hand-authored axes, zeroed — see the note in `rfxHub.ts`. */
const retiredAxes = { priceScore: 0, leadTimeScore: 0, reliabilityScore: 0, aiCompositeScore: 0, aiRecommended: false };

const quote = (
  id: string,
  rfqId: string,
  supplierId: string,
  unitPrice: number,
  leadTimeDays: number,
  submittedOffset: number,
): Quotation => {
  const event = GATE_DEMO_RFQ_SEED.find((r) => r.id === rfqId)!;
  return {
    id,
    rfqId,
    supplierId,
    submittedAt: day(submittedOffset),
    unitPrice,
    totalPrice: unitPrice * event.totalQty,
    currency: 'IDR',
    leadTimeDays,
    paymentTermsOffered: 'Net 45',
    validUntil: day(30),
    complianceScore: 80,
    ...retiredAxes,
    status: 'Under Review',
    roundNumber: 0,
  };
};

export const GATE_DEMO_QUOTATION_SEED: readonly Quotation[] = [
  // rfq-016 — Glycerin
  quote('qt-016a', 'rfq-016', 'sup-001', 18_900, 21, -9),
  quote('qt-016b', 'rfq-016', 'sup-017', 18_400, 18, -8),
  quote('qt-016c', 'rfq-016', 'sup-018', 17_600, 20, -7),
  quote('qt-016d', 'rfq-016', 'sup-009', 17_900, 25, -6),
  quote('qt-016e', 'rfq-016', 'sup-013', 18_100, 24, -5),
  // rfq-017 — Niacinamide
  quote('qt-017a', 'rfq-017', 'sup-005', 229_000, 30, -8),
  quote('qt-017b', 'rfq-017', 'sup-006', 236_000, 26, -7),
  quote('qt-017c', 'rfq-017', 'sup-016', 214_000, 21, -6),
  quote('qt-017d', 'rfq-017', 'sup-011', 208_000, 35, -5),
  // rfq-018 — Lauric acid (open: sup-017 has not quoted yet)
  quote('qt-018a', 'rfq-018', 'sup-001', 27_800, 20, -2),
  quote('qt-018b', 'rfq-018', 'sup-002', 26_900, 18, -1),
  // rfq-019 — PET bottle and cap
  quote('qt-019a', 'rfq-019', 'sup-019', 2_080, 21, -10),
  quote('qt-019b', 'rfq-019', 'sup-020', 1_990, 18, -9),
  quote('qt-019c', 'rfq-019', 'sup-021', 1_940, 24, -8),
  quote('qt-019d', 'rfq-019', 'sup-022', 1_870, 28, -7),
  quote('qt-019e', 'rfq-019', 'sup-011', 2_150, 30, -6),
  // rfq-020 — Salicylic acid (every bidder fails)
  quote('qt-020a', 'rfq-020', 'sup-011', 188_000, 28, -7),
  quote('qt-020b', 'rfq-020', 'sup-004', 196_000, 24, -6),
  quote('qt-020c', 'rfq-020', 'sup-009', 201_000, 21, -5),
];
