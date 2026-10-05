/** @import { PurchaseOrder, POLineItem } from '@services/data/types' */
import { POStatus, ChannelType } from '@services/data/types';
import { shiftFields, shiftIso } from '@services/data/fixturePresent';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THESE ARE THE RAW, AUTHORED LITERALS — 2025, exactly as written. Nothing
// reads them directly: `mockPurchaseOrders` at the foot of this file is the
// shifted export, re-timed to the declared present by the `purchaseOrder`
// family anchor (`services/data/fixturePresent.ts`). The raw dates stay here so
// the authoring intent — and the spacing between orders, deliveries and the
// response windows — is readable rather than encoded away into an offset.
// ─────────────────────────────────────────────────────────────────────────────
/** @type {PurchaseOrder[]} */
const mockPurchaseOrdersRaw = [
  {
    id: 'po-001',
    poNumber: 'PO-2025-00101',
    prReference: 'PR-2025-00281',
    sourceOfSupply: 'PIR: INF-2025-0045',
    supplierId: 'sup-001',
    supplierName: 'PT Sample Oleochemicals',
    status: POStatus.DELIVERED,
    channel: ChannelType.API,
    currency: 'IDR',
    totalValue: 1_250_000_000,
    orderDate: '2025-03-01',
    requestedDeliveryDate: '2025-03-20',
    confirmedDeliveryDate: '2025-03-19',
    daysOverdue: -1,
    acknowledgmentTimeHours: 4,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-001a',
        materialCode: 'RM-COCO-8200',
        description: 'Coconut Fatty Acid Distillate (CFAD)',
        quantity: 25000,
        uom: 'KG',
        unitPrice: 28000,
        confirmedQty: 25000
      }),
      /** @satisfies {POLineItem} */ ({
        id: 'li-001b',
        materialCode: 'RM-PALM-7100',
        description: 'Palm Kernel Oil — Refined, Bleached, Deodorized',
        quantity: 20000,
        uom: 'KG',
        unitPrice: 34500,
        confirmedQty: 20000
      })
    ]
  },
  {
    id: 'po-002',
    poNumber: 'PO-2025-00102',
    prReference: 'PR-2025-00284',
    sourceOfSupply: 'PIR: INF-2025-0051',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    status: POStatus.CONFIRMED,
    channel: ChannelType.WEB,
    currency: 'IDR',
    totalValue: 875_000_000,
    orderDate: '2025-03-10',
    requestedDeliveryDate: '2025-04-05',
    confirmedDeliveryDate: '2025-04-07',
    daysOverdue: 2,
    acknowledgmentTimeHours: 18,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-002a',
        materialCode: 'RM-EMUL-9410',
        description: 'Glyceryl Stearate SE (Halal Emulsifier)',
        quantity: 8000,
        uom: 'KG',
        unitPrice: 109375,
        confirmedQty: 8000
      })
    ]
  },
  {
    id: 'po-003',
    poNumber: 'PO-2025-00103',
    supplierId: 'sup-003',
    supplierName: 'Sample Fragrance House Indonesia',
    status: POStatus.PARTIALLY_DELIVERED,
    channel: ChannelType.API,
    currency: 'IDR',
    totalValue: 2_000_000_000,
    orderDate: '2025-02-20',
    requestedDeliveryDate: '2025-03-25',
    confirmedDeliveryDate: '2025-03-25',
    daysOverdue: 0,
    acknowledgmentTimeHours: 2,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-003a',
        materialCode: 'FR-WARD-4410',
        description: 'Wardah Signature Floral Compound',
        quantity: 500,
        uom: 'KG',
        unitPrice: 2_200_000,
        confirmedQty: 350
      }),
      /** @satisfies {POLineItem} */ ({
        id: 'li-003b',
        materialCode: 'FR-EMIN-4420',
        description: 'Emina Fresh Citrus Accord',
        quantity: 300,
        uom: 'KG',
        unitPrice: 1_800_000,
        confirmedQty: 300
      })
    ]
  },
  {
    id: 'po-004',
    poNumber: 'PO-2025-00104',
    supplierId: 'sup-004',
    supplierName: 'Sample Aromatics Sdn. Bhd.',
    status: POStatus.ACKNOWLEDGED,
    channel: ChannelType.WEB,
    currency: 'IDR',
    totalValue: 540_000_000,
    orderDate: '2025-03-25',
    requestedDeliveryDate: '2025-04-20',
    confirmedDeliveryDate: '2025-04-22',
    daysOverdue: 2,
    acknowledgmentTimeHours: 36,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-004a',
        materialCode: 'FR-MKOV-5510',
        description: 'Make Over Long-Wear Musk Base',
        quantity: 200,
        uom: 'KG',
        unitPrice: 2_700_000,
        confirmedQty: 200
      })
    ]
  },
  {
    id: 'po-005',
    poNumber: 'PO-2025-00105',
    supplierId: 'sup-005',
    supplierName: 'Sample Personal Care Emulsifiers GmbH',
    status: POStatus.SENT,
    channel: ChannelType.API,
    currency: 'IDR',
    totalValue: 1_800_000_000,
    orderDate: '2025-04-02',
    requestedDeliveryDate: '2025-05-15',
    confirmedDeliveryDate: '',
    daysOverdue: 0,
    acknowledgmentTimeHours: 0,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-005a',
        materialCode: 'AI-NIAC-6601',
        description: 'Niacinamide USP Grade 99.5% (Vitamin B3)',
        quantity: 5000,
        uom: 'KG',
        unitPrice: 220_000,
        confirmedQty: 0
      }),
      /** @satisfies {POLineItem} */ ({
        id: 'li-005b',
        materialCode: 'AI-HYALU-6610',
        description: 'Sodium Hyaluronate (High MW, 1.5-2.0 MDa)',
        quantity: 300,
        uom: 'KG',
        unitPrice: 3_000_000,
        confirmedQty: 0
      })
    ]
  },
  {
    id: 'po-006',
    poNumber: 'PO-2025-00106',
    prReference: 'PR-2026-00340',
    sourceOfSupply: 'PIR: INF-2026-0089',
    supplierId: 'sup-006',
    supplierName: 'Sample Specialty Chemicals France',
    status: POStatus.VIEWED,
    channel: ChannelType.EMAIL,
    currency: 'IDR',
    totalValue: 620_000_000,
    orderDate: '2025-04-01',
    requestedDeliveryDate: '2025-05-10',
    confirmedDeliveryDate: '',
    daysOverdue: 0,
    acknowledgmentTimeHours: 72, // >48h alert threshold
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-006a',
        materialCode: 'AI-VITC-6720',
        description: 'Ascorbyl Glucoside (Vitamin C Derivative)',
        quantity: 500,
        uom: 'KG',
        unitPrice: 1_240_000,
        confirmedQty: 0
      })
    ]
  },
  {
    id: 'po-007',
    poNumber: 'PO-2025-00107',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    status: POStatus.CONFIRMED,
    channel: ChannelType.WHATSAPP,
    currency: 'IDR',
    totalValue: 320_000_000,
    orderDate: '2025-03-15',
    requestedDeliveryDate: '2025-04-01',
    confirmedDeliveryDate: '2025-04-08',
    daysOverdue: 7,
    acknowledgmentTimeHours: 48,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-007a',
        materialCode: 'PK-PETB-8801',
        description: 'PET Bottle 200ml Frosted — Wardah Series',
        quantity: 200000,
        uom: 'PCS',
        unitPrice: 1600,
        confirmedQty: 200000
      })
    ]
  },
  {
    id: 'po-008',
    poNumber: 'PO-2025-00108',
    prReference: 'PR-2026-00341',
    sourceOfSupply: 'Outline Agreement: OA-4600001234',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    status: POStatus.SENT,
    channel: ChannelType.WHATSAPP,
    currency: 'IDR',
    totalValue: 185_000_000,
    orderDate: '2025-04-03',
    requestedDeliveryDate: '2025-04-25',
    confirmedDeliveryDate: '',
    daysOverdue: 0,
    acknowledgmentTimeHours: 96, // >48h alert threshold
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-008a',
        materialCode: 'PK-PETB-8802',
        description: 'PET Bottle 100ml Clear — Emina Series',
        quantity: 150000,
        uom: 'PCS',
        unitPrice: 1233,
        confirmedQty: 0
      })
    ]
  },
  {
    id: 'po-009',
    poNumber: 'PO-2025-00109',
    supplierId: 'sup-008',
    supplierName: 'PT Sample Carton Packaging',
    status: POStatus.DELIVERED,
    channel: ChannelType.WHATSAPP,
    currency: 'IDR',
    totalValue: 95_000_000,
    orderDate: '2025-02-10',
    requestedDeliveryDate: '2025-03-01',
    confirmedDeliveryDate: '2025-03-06',
    daysOverdue: 5,
    acknowledgmentTimeHours: 12,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-009a',
        materialCode: 'PK-CART-9901',
        description: 'Mono-Carton Box 70x40x180mm — Wardah Moisturizing Lotion',
        quantity: 500000,
        uom: 'PCS',
        unitPrice: 190,
        confirmedQty: 500000
      })
    ]
  },
  {
    id: 'po-010',
    poNumber: 'PO-2025-00110',
    supplierId: 'sup-009',
    supplierName: 'Sample Vitamins Co.',
    status: POStatus.ACKNOWLEDGED,
    channel: ChannelType.WEB,
    currency: 'IDR',
    totalValue: 750_000_000,
    orderDate: '2025-03-20',
    requestedDeliveryDate: '2025-04-30',
    confirmedDeliveryDate: '2025-04-30',
    daysOverdue: 0,
    acknowledgmentTimeHours: 24,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-010a',
        materialCode: 'AI-VITC-6730',
        description: 'L-Ascorbic Acid Powder 99% — Cosmetic Grade',
        quantity: 2000,
        uom: 'KG',
        unitPrice: 375_000,
        confirmedQty: 2000
      })
    ]
  },
  {
    id: 'po-011',
    poNumber: 'PO-2025-00111',
    supplierId: 'sup-001',
    supplierName: 'PT Sample Oleochemicals',
    status: POStatus.CLOSED,
    channel: ChannelType.API,
    currency: 'IDR',
    totalValue: 680_000_000,
    orderDate: '2025-01-15',
    requestedDeliveryDate: '2025-02-05',
    confirmedDeliveryDate: '2025-02-05',
    daysOverdue: 0,
    acknowledgmentTimeHours: 3,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-011a',
        materialCode: 'RM-LAURIC-7200',
        description: 'Lauric Acid 99% — Halal Certified',
        quantity: 20000,
        uom: 'KG',
        unitPrice: 34000,
        confirmedQty: 20000
      })
    ]
  },
  {
    id: 'po-012',
    poNumber: 'PO-2025-00112',
    supplierId: 'sup-003',
    supplierName: 'Sample Fragrance House Indonesia',
    status: POStatus.SENT,
    channel: ChannelType.API,
    currency: 'IDR',
    totalValue: 1_100_000_000,
    orderDate: '2025-04-04',
    requestedDeliveryDate: '2025-05-01',
    confirmedDeliveryDate: '',
    daysOverdue: 0,
    acknowledgmentTimeHours: 1,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-012a',
        materialCode: 'FR-MKOV-5520',
        description: 'Make Over Oud & Amber Accord',
        quantity: 250,
        uom: 'KG',
        unitPrice: 2_400_000,
        confirmedQty: 0
      }),
      /** @satisfies {POLineItem} */ ({
        id: 'li-012b',
        materialCode: 'FR-WARD-4430',
        description: 'Wardah Hijab Refresh Spray Accord',
        quantity: 200,
        uom: 'KG',
        unitPrice: 1_750_000,
        confirmedQty: 0
      })
    ]
  },
  {
    id: 'po-013',
    poNumber: 'PO-2025-00113',
    supplierId: 'sup-005',
    supplierName: 'Sample Personal Care Emulsifiers GmbH',
    status: POStatus.DELIVERED,
    channel: ChannelType.API,
    currency: 'IDR',
    totalValue: 560_000_000,
    orderDate: '2025-02-01',
    requestedDeliveryDate: '2025-03-10',
    confirmedDeliveryDate: '2025-03-08',
    daysOverdue: -2,
    acknowledgmentTimeHours: 6,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-013a',
        materialCode: 'AI-PANTO-6640',
        description: 'D-Panthenol 75% (Provitamin B5)',
        quantity: 2000,
        uom: 'KG',
        unitPrice: 280_000,
        confirmedQty: 2000
      })
    ]
  },
  {
    id: 'po-014',
    poNumber: 'PO-2025-00114',
    supplierId: 'sup-006',
    supplierName: 'Sample Specialty Chemicals France',
    status: POStatus.ACKNOWLEDGED,
    channel: ChannelType.EMAIL,
    currency: 'IDR',
    totalValue: 410_000_000,
    orderDate: '2025-03-18',
    requestedDeliveryDate: '2025-04-28',
    confirmedDeliveryDate: '2025-05-05',
    daysOverdue: 7,
    acknowledgmentTimeHours: 50, // >48h alert threshold
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-014a',
        materialCode: 'AI-RETA-6750',
        description: 'Retinyl Palmitate (Vitamin A Ester) — Cosmetic Grade',
        quantity: 300,
        uom: 'KG',
        unitPrice: 1_366_667,
        confirmedQty: 300
      })
    ]
  },
  {
    id: 'po-015',
    poNumber: 'PO-2025-00115',
    supplierId: 'sup-009',
    supplierName: 'Sample Vitamins Co.',
    status: POStatus.CLOSED,
    channel: ChannelType.WEB,
    currency: 'IDR',
    totalValue: 300_000_000,
    orderDate: '2025-01-08',
    requestedDeliveryDate: '2025-02-15',
    confirmedDeliveryDate: '2025-02-20',
    daysOverdue: 5,
    acknowledgmentTimeHours: 30,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-015a',
        materialCode: 'AI-NIAC-6605',
        description: 'Niacinamide Feed Grade 98% (Bulk)',
        quantity: 1500,
        uom: 'KG',
        unitPrice: 200_000,
        confirmedQty: 1500
      })
    ]
  },
  {
    id: 'po-016',
    poNumber: 'PO-2025-00116',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    status: POStatus.PARTIALLY_DELIVERED,
    channel: ChannelType.WEB,
    currency: 'IDR',
    totalValue: 1_050_000_000,
    orderDate: '2025-03-05',
    requestedDeliveryDate: '2025-03-28',
    confirmedDeliveryDate: '2025-03-28',
    daysOverdue: 3,
    acknowledgmentTimeHours: 10,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-016a',
        materialCode: 'RM-STEAR-7300',
        description: 'Stearic Acid — Double Pressed (Halal)',
        quantity: 15000,
        uom: 'KG',
        unitPrice: 42000,
        confirmedQty: 10000
      }),
      /** @satisfies {POLineItem} */ ({
        id: 'li-016b',
        materialCode: 'RM-MYRST-7310',
        description: 'Myristic Acid 99% (Palm-Derived)',
        quantity: 10000,
        uom: 'KG',
        unitPrice: 41_700,
        confirmedQty: 5000
      })
    ]
  },
  {
    id: 'po-017',
    poNumber: 'PO-2025-00117',
    supplierId: 'sup-008',
    supplierName: 'PT Sample Carton Packaging',
    status: POStatus.CONFIRMED,
    channel: ChannelType.WHATSAPP,
    currency: 'IDR',
    totalValue: 50_000_000,
    orderDate: '2025-03-28',
    requestedDeliveryDate: '2025-04-15',
    confirmedDeliveryDate: '2025-04-15',
    daysOverdue: 0,
    acknowledgmentTimeHours: 8,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-017a',
        materialCode: 'PK-CART-9910',
        description: 'Shipper Box — Emina Bright Stuff Range (12-pack)',
        quantity: 20000,
        uom: 'PCS',
        unitPrice: 2500,
        confirmedQty: 20000
      })
    ]
  },
  {
    id: 'po-018',
    poNumber: 'PO-2025-00118',
    supplierId: 'sup-004',
    supplierName: 'Sample Aromatics Sdn. Bhd.',
    status: POStatus.DELIVERED,
    channel: ChannelType.WEB,
    currency: 'IDR',
    totalValue: 890_000_000,
    orderDate: '2025-02-14',
    requestedDeliveryDate: '2025-03-14',
    confirmedDeliveryDate: '2025-03-12',
    daysOverdue: -2,
    acknowledgmentTimeHours: 14,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-018a',
        materialCode: 'FR-WARD-4440',
        description: 'Wardah EDP Parfum Concentrate — Rose & Oud',
        quantity: 400,
        uom: 'KG',
        unitPrice: 2_225_000,
        confirmedQty: 400
      })
    ]
  },
  {
    id: 'po-019',
    poNumber: 'PO-2025-00119',
    supplierId: 'sup-010',
    supplierName: 'PT Sample Halal Emulsifiers',
    status: POStatus.SENT,
    channel: ChannelType.WHATSAPP,
    currency: 'IDR',
    totalValue: 120_000_000,
    orderDate: '2025-04-01',
    requestedDeliveryDate: '2025-04-30',
    confirmedDeliveryDate: '',
    daysOverdue: 0,
    acknowledgmentTimeHours: 0,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-019a',
        materialCode: 'RM-EMUL-9430',
        description: 'Polysorbate 80 — Halal, Food & Cosmetic Grade',
        quantity: 3000,
        uom: 'KG',
        unitPrice: 40000,
        confirmedQty: 0
      })
    ]
  },
  {
    id: 'po-020',
    poNumber: 'PO-2025-00120',
    supplierId: 'sup-011',
    supplierName: 'Sample Salicylics & Niacinamide Ltd.',
    status: POStatus.VIEWED,
    channel: ChannelType.EMAIL,
    currency: 'IDR',
    totalValue: 430_000_000,
    orderDate: '2025-03-30',
    requestedDeliveryDate: '2025-05-05',
    confirmedDeliveryDate: '',
    daysOverdue: 0,
    acknowledgmentTimeHours: 56, // >48h alert threshold
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-020a',
        materialCode: 'AI-SALI-6800',
        description: 'Salicylic Acid 99.5% — BHA Cosmetic Grade',
        quantity: 1000,
        uom: 'KG',
        unitPrice: 430_000,
        confirmedQty: 0
      })
    ]
  },

  // ══ THE sup-007 WALKTHROUGH SET — demo data, authored for the declared ══════
  //    present. Phase 7 (demo data), REQ-E07-02 / 03 / 05 / 06.
  //
  // PT Sample Packaging Indonesia is the supplier every supplier-side
  // walkthrough is driven as, and until this batch it owned exactly TWO orders:
  // one CONFIRMED and one SENT. Most of what the order lane can render had no
  // reachable example, so the flows were built and could not be WALKED. These
  // rows add ONE example each and nothing else.
  //
  // ⚠️ THE DATES ARE RAW 2025 LITERALS LIKE EVERY ROW ABOVE — shifted by
  // `DECLARED_PRESENT − 2025-04-18` at the foot of this file. What each row is
  // FOR is stated against the day it lands on:
  //
  //   po-021  ordered ON the anchor            → lands on the present, still
  //                                              inside its 1-working-day
  //                                              window: the one order awaiting
  //                                              a response that is NOT escalated
  //   po-022  adjusted, no planner review yet  → the counter-offer queue
  //   po-023  rejected                         → PTI's rejected tab
  //   po-024  confirmed, partially             → parent of the Draft ASN; the
  //                                              ASN to finish and submit
  //   po-025  delivered, two receipts          → one discrepancy still open to
  //                                              dispute, one already disputed
  //   po-026  delivered, receipt approved      → the invoice-from-receipts start
  //   po-027  confirmed, nothing shipped       → the create-an-ASN start point
  //
  // ── ⚠️ TWO FIXTURE INVARIANTS THESE ROWS ARE HELD TO, BOTH MEASURED ────────
  //
  // 1. **EXACTLY ONE sup-007 ORDER AT OR PAST CONFIRMATION MAY BE PARTIALLY
  //    CONFIRMED, AND IT MUST BE THE DRAFT ASN'S PARENT.** `ASN-2025-00215` is
  //    a Draft with no eta, so level 3 of `asnRefIntegrity.test.ts`'s selection
  //    rule (a shipment cannot precede its own order) constrains nothing and
  //    the rule falls through to level 4 — "NOT determinately complete". While
  //    sup-007 owned ONE confirmable order that level was never reached; it is
  //    now, and it picks `po-024` because `po-024` is the only one with a line
  //    the supplier did not confirm in full. Confirm `li-024a` in full, or
  //    under-confirm a second row here, and that test goes red BY NAME.
  //
  // 2. **THEIR ORDER DATES ARE ALL AFTER EVERY DATED sup-007 ASN's eta** (the
  //    latest is `ASN-2025-00211`, 2025-04-02), so level 3 keeps them out of the
  //    candidate set for the four ASNs that DO carry one, and those four still
  //    re-derive to `PO-2025-00107` alone.
  //
  // ⚠️ AND THE MATERIALS ARE NOT FREE EITHER — they are `PK-PETB-8801` and
  // `PK-PETB-8802`, the two codes sup-007 ALREADY has in the document lane.
  // `materialIdentity.test.js` pins that lane at an exact size with an exact
  // master overlap, and `PK-PETB-8810` / `PK-CAPF-8820` are asserted BY NAME to
  // be master-governed and absent from it — putting either on a PO or a receipt
  // moves a census that three assertions are about. The receipts below are then
  // dated to stay OUTSIDE the call-off delivery matcher's ±7-day window
  // (`fulfillment.ts`), which matches on supplier + material and would otherwise
  // silently re-decide `co-0001` / `co-0013` and move OTIF.
  {
    id: 'po-021',
    poNumber: 'PO-2026-00121',
    prReference: 'PR-2026-00417',
    sourceOfSupply: 'Outline Agreement: OA-4600001234',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    status: POStatus.SENT,
    channel: ChannelType.WEB,
    currency: 'IDR',
    totalValue: 98_640_000,
    // ⚠️ THE ANCHOR ITSELF. `max(orderDate)` over this fixture IS the
    // `purchaseOrder` family anchor, so this row lands exactly on the declared
    // present and its response deadline is still ahead of it.
    orderDate: '2025-04-18',
    requestedDeliveryDate: '2025-05-16',
    confirmedDeliveryDate: '',
    daysOverdue: 0,
    acknowledgmentTimeHours: 0,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-021a',
        materialCode: 'PK-PETB-8802',
        description: 'PET Bottle 100ml Clear — Emina Series',
        quantity: 80000,
        uom: 'PCS',
        unitPrice: 1233,
        confirmedQty: 0
      })
    ]
  },
  {
    id: 'po-022',
    poNumber: 'PO-2026-00122',
    prReference: 'PR-2026-00409',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    status: POStatus.ADJUSTED,
    channel: ChannelType.WEB,
    currency: 'IDR',
    totalValue: 144_000_000,
    orderDate: '2025-04-14',
    requestedDeliveryDate: '2025-05-12',
    confirmedDeliveryDate: '',
    daysOverdue: 0,
    acknowledgmentTimeHours: 20,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-022a',
        materialCode: 'PK-PETB-8801',
        description: 'PET Bottle 200ml Frosted — Wardah Series',
        quantity: 90000,
        uom: 'PCS',
        unitPrice: 1600,
        confirmedQty: 0
      })
    ],
    // ⚠️ NO `review` — the ABSENCE is the demo state: the counter-offer is with
    // the planner. `poCfot`'s `confirmedLine` reads an unreviewed counter-offer
    // as NOT binding, so the order still stands as PTI asked for it until
    // somebody decides.
    response: {
      option: 'adjust',
      respondedAt: '2025-04-15T04:30:00.000Z',
      lines: [
        {
          lineId: 'li-022a',
          reasonCode: 'capacity',
          counterQty: 60000,
          counterDate: '2025-05-26'
        }
      ],
      comment:
        'Blow-moulding line under maintenance until week 21 — 60,000 PCS can be met on the later date.'
    }
  },
  {
    id: 'po-023',
    poNumber: 'PO-2026-00123',
    prReference: 'PR-2026-00405',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    status: POStatus.REJECTED,
    channel: ChannelType.WEB,
    currency: 'IDR',
    totalValue: 147_960_000,
    orderDate: '2025-04-13',
    requestedDeliveryDate: '2025-05-09',
    confirmedDeliveryDate: '',
    daysOverdue: 0,
    acknowledgmentTimeHours: 26,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-023a',
        materialCode: 'PK-PETB-8802',
        description: 'PET Bottle 100ml Clear — Emina Series',
        quantity: 120000,
        uom: 'PCS',
        unitPrice: 1233,
        confirmedQty: 0
      })
    ],
    response: {
      option: 'reject',
      respondedAt: '2025-04-14T06:15:00.000Z',
      rejectionCauses: ['quantity'],
      comment:
        'Single-batch volume exceeds the agreed monthly ceiling; please split it across two releases.'
    }
  },
  {
    id: 'po-024',
    poNumber: 'PO-2026-00124',
    prReference: 'PR-2026-00398',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    status: POStatus.CONFIRMED,
    channel: ChannelType.WEB,
    currency: 'IDR',
    totalValue: 96_000_000,
    orderDate: '2025-04-05',
    requestedDeliveryDate: '2025-05-02',
    confirmedDeliveryDate: '2025-05-04',
    daysOverdue: 2,
    acknowledgmentTimeHours: 14,
    lineItems: [
      // ⚠️ THE ONE PARTIALLY-CONFIRMED LINE IN THE FIXTURE, AND IT IS
      // LOAD-BEARING. PTI asked for 60,000; the supplier confirmed 50,000, which
      // is the ordinary case the set was missing — `committedQty`
      // (`transitions/fulfilmentRules.js`) reads the confirmation, so the ASN
      // lane offers 50,000. It is ALSO invariant 1 in the header above: this is
      // what makes `po-024` the unique parent the Draft ASN's selection rule
      // resolves to.
      /** @satisfies {POLineItem} */ ({
        id: 'li-024a',
        materialCode: 'PK-PETB-8801',
        description: 'PET Bottle 200ml Frosted — Wardah Series',
        quantity: 60000,
        uom: 'PCS',
        unitPrice: 1600,
        confirmedQty: 50000
      })
    ],
    response: {
      option: 'approve',
      respondedAt: '2025-04-06T02:40:00.000Z',
      confirmedDeliveryDate: '2025-05-04'
    }
  },
  {
    id: 'po-025',
    poNumber: 'PO-2026-00125',
    prReference: 'PR-2026-00377',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    status: POStatus.DELIVERED,
    channel: ChannelType.WEB,
    currency: 'IDR',
    totalValue: 141_650_000,
    orderDate: '2025-04-03',
    requestedDeliveryDate: '2025-04-06',
    confirmedDeliveryDate: '2025-04-06',
    daysOverdue: 0,
    acknowledgmentTimeHours: 8,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-025a',
        materialCode: 'PK-PETB-8801',
        description: 'PET Bottle 200ml Frosted — Wardah Series',
        quantity: 50000,
        uom: 'PCS',
        unitPrice: 1600,
        confirmedQty: 50000,
        // CR-12 (BL-44) demo — this line was ordered against sup-007's PET
        // bottle supply contract, so its price is a contract price and an
        // invoice line for it is checked at 0%. The other line of this order
        // (li-025b) and PO-2026-00126's line carry no contract and are checked
        // at 2% within the rupiah cap. Sample data.
        contractNumber: 'CTR-2025-018'
      }),
      /** @satisfies {POLineItem} */ ({
        id: 'li-025b',
        materialCode: 'PK-PETB-8802',
        description: 'PET Bottle 100ml Clear — Emina Series',
        quantity: 50000,
        uom: 'PCS',
        unitPrice: 1233,
        confirmedQty: 50000
      })
    ],
    response: {
      option: 'approve',
      respondedAt: '2025-04-03T08:10:00.000Z',
      confirmedDeliveryDate: '2025-04-06'
    },
    shippingNotice: {
      expectedCompletionDate: '2025-04-06',
      updatedAt: '2025-04-04T02:00:00.000Z'
    }
  },
  {
    id: 'po-026',
    poNumber: 'PO-2026-00126',
    prReference: 'PR-2026-00371',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    status: POStatus.DELIVERED,
    channel: ChannelType.WEB,
    currency: 'IDR',
    totalValue: 49_320_000,
    orderDate: '2025-04-04',
    requestedDeliveryDate: '2025-04-08',
    confirmedDeliveryDate: '2025-04-08',
    daysOverdue: 0,
    acknowledgmentTimeHours: 6,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-026a',
        materialCode: 'PK-PETB-8802',
        description: 'PET Bottle 100ml Clear — Emina Series',
        quantity: 40000,
        uom: 'PCS',
        unitPrice: 1233,
        confirmedQty: 40000
      })
    ],
    response: {
      option: 'approve',
      respondedAt: '2025-04-04T07:05:00.000Z',
      confirmedDeliveryDate: '2025-04-08'
    },
    shippingNotice: {
      expectedCompletionDate: '2025-04-08',
      updatedAt: '2025-04-05T01:30:00.000Z'
    }
  },
  {
    id: 'po-027',
    poNumber: 'PO-2026-00127',
    prReference: 'PR-2026-00421',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    status: POStatus.CONFIRMED,
    channel: ChannelType.WEB,
    currency: 'IDR',
    totalValue: 112_000_000,
    orderDate: '2025-04-07',
    requestedDeliveryDate: '2025-05-06',
    confirmedDeliveryDate: '2025-05-06',
    daysOverdue: 0,
    acknowledgmentTimeHours: 10,
    // ⚠️ NO ASN NAMES THIS ORDER AND NO SHIPPING NOTICE IS RECORDED. That
    // absence is the demo state: it is the create-an-ASN start point, and it is
    // what keeps the supplier's "expected completion date" task reachable from
    // an order with nothing else on it. Confirmed IN FULL — see invariant 1.
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-027a',
        materialCode: 'PK-PETB-8801',
        description: 'PET Bottle 200ml Frosted — Wardah Series',
        quantity: 70000,
        uom: 'PCS',
        unitPrice: 1600,
        confirmedQty: 70000
      })
    ],
    response: {
      option: 'approve',
      respondedAt: '2025-04-08T03:20:00.000Z',
      confirmedDeliveryDate: '2025-05-06'
    }
  },

  // ══ BL-49 — `PO-2026-00128`, THE ONE VALUE-LIMIT LINE ═════════════════════
  //
  // BL-13 decided that the umbrella PO holds a QUANTITY per line, so a call-off
  // release is checked against remaining quantity. CR-04 keeps VALUE as the
  // check only "where a line has no quantity" — an SAP value-limit line. Every
  // other line in this fixture has a quantity, so without this row the value
  // branch of the release check had no reachable example on the screen.
  //
  // ⚠️ `quantity: 0` HERE MEANS "NO QUANTITY", NOT "NOTHING ORDERED". The line
  // commits `valueLimit`; `unitPrice` is the agreed price a call-off's value is
  // priced at. `totalValue` is the limit, which is what the line is worth.
  // Supplier `sup-003` and material `FR-WARD-4410` (with its existing meaning)
  // are already in the document lane, so no census moves; no ASN or receipt
  // names this order.
  {
    id: 'po-028',
    poNumber: 'PO-2026-00128',
    prReference: 'PR-2026-00425',
    supplierId: 'sup-003',
    supplierName: 'Sample Fragrance House Indonesia',
    status: POStatus.CONFIRMED,
    channel: ChannelType.API,
    currency: 'IDR',
    totalValue: 500_000_000,
    orderDate: '2025-04-03',
    requestedDeliveryDate: '2025-06-30',
    confirmedDeliveryDate: '2025-06-30',
    daysOverdue: 0,
    acknowledgmentTimeHours: 6,
    lineItems: [
      /** @satisfies {POLineItem} */ ({
        id: 'li-028a',
        materialCode: 'FR-WARD-4410',
        description: 'Wardah Signature Floral Compound',
        quantity: 0,
        uom: 'KG',
        unitPrice: 2_200_000,
        confirmedQty: 0,
        valueLimit: 500_000_000
      })
    ],
    response: {
      option: 'approve',
      respondedAt: '2025-04-03T08:00:00.000Z',
      confirmedDeliveryDate: '2025-06-30'
    }
  },

  // ══ CP-2 · 2B-5b-i — `PO-2025-00131`, AUTHORED (operator ruling R-4) ═══════
  //
  // ── WHY IT EXISTS NOW ─────────────────────────────────────────────────────
  //   Until this batch, THREE INDEPENDENT FIXTURES referenced this PO and no
  //   fixture authored it:
  //     · `invoices.ts`            — `inv-smpl-1180`, poId `po-131`
  //     · `supplierDocuments.ts`   — `doc-201`, `linkedTo: 'PO-2025-00131'`
  //     · `supplierShipments.ts`   — `ASN-2025-00302`, `poReference`
  //   The ruling: REPOINTING THREE REFERENCES TO HIDE A MISSING OBJECT IS
  //   WORSE THAN THE GAP. The object should exist because three lanes already
  //   act as though it does.
  //
  // ── WHAT THE THREE REFERENCES DETERMINE ───────────────────────────────────
  //   Supplier (`sup-005`, Sample Personal Care Emulsifiers GmbH), currency
  //   (IDR, from the invoice), and that the supply was DELIVERED — the ASN is
  //   `Delivered` with an eta of 2025-04-18. `orderDate` is set before that
  //   eta so the ASN's own selection rule (level 2) holds for the reference
  //   that was already correct.
  //
  // ── ⚠️ WHAT THEY DO NOT DETERMINE, AND IS THEREFORE NOT INVENTED ──────────
  //   **NO LINE ITEM.** None of the three references states a material for this
  //   PO: the invoice carries no lines, `doc-201` carries no material, and the
  //   ASN's lines are the ASN's. Authoring one would mean choosing between
  //   `MAT-40220` — widening a space R-3 declared dead into this, the DECLARED
  //   DOCUMENT LANE — and a master code, which is the retirement R-1 sent to
  //   5b-ii. Both are forbidden here, so the line set is EMPTY AND PINNED
  //   (`asnRefIntegrity.test.ts`), not silently plausible.
  //   `totalValue` is 0 for the same reason: every other PO in this fixture
  //   satisfies `totalValue === Σ(quantity × unitPrice)`, and 0 is that sum
  //   over an empty line set. Picking a value would be picking a side in the
  //   disagreement below.
  //
  // ── WHAT THE THREE REFERENCES DISAGREE ABOUT (reported, not resolved) ─────
  //   1. MONEY. `inv-smpl-1180` bills 1 120 000 000 IDR. The storefront's own
  //      offer for what the ASN shipped (`c201`, 210 000 IDR/KG) against the
  //      2 400 KG shipped is 504 000 000 — a 2.2× gap. The invoice ALREADY
  //      states this: `matchStatus: 'Price Variance'`, `status: 'Disputed'`.
  //      The tree asserts the invoice and its PO do not agree on money, so no
  //      authored total can make them agree without erasing the dispute.
  //   2. TIME. The ASN delivered 2025-04-18; the invoice was submitted
  //      2026-05-14 — thirteen months later. Left as found.
  //
  // ── ⚠️ AND THE FINDING THAT MATTERS MOST HANGS OFF THIS ROW ───────────────
  //   `doc-201` is a **BPOM Notification (SAMPLE-BPOM-0005A)**, category
  //   `BPOM Regulatory`, linked to THIS PO — whose ASN carries `MAT-40220`,
  //   for which `inferBpom` returns **false**. The tree already states that a
  //   BPOM registration governs this supply. That `false` is ASSERTED AGAINST
  //   IN-TREE EVIDENCE, NOT MERELY IN ITS ABSENCE. See `BPOM-OFF-BY-SPACE-01`.
  {
    id: 'po-131',
    poNumber: 'PO-2025-00131',
    supplierId: 'sup-005',
    supplierName: 'Sample Personal Care Emulsifiers GmbH',
    status: POStatus.DELIVERED,
    channel: ChannelType.EMAIL,
    currency: 'IDR',
    totalValue: 0,
    orderDate: '2025-03-12',
    requestedDeliveryDate: '2025-04-18',
    confirmedDeliveryDate: '2025-04-18',
    daysOverdue: 0,
    acknowledgmentTimeHours: 12,
    lineItems: []
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// THE DECLARED PRESENT — FIXTURE-PRESENT-01 (d).
//
// `shiftFields` moves the three TOP-LEVEL dates; the response and the shipping
// notice carry dates one level down, and a field a shift cannot reach is a
// field that silently stays in 2025 — so they are mapped here by the SAME
// `shiftIso`, never by a second offset.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {string} v
 * @returns {string}
 */
const shift = (v) => shiftIso(v, 'purchaseOrder');

/** @type {PurchaseOrder[]} */
export const mockPurchaseOrders = shiftFields(mockPurchaseOrdersRaw, 'purchaseOrder', [
  'orderDate',
  'requestedDeliveryDate',
  'confirmedDeliveryDate',
  'responseRequestedAt'
]).map((po) => ({
  ...po,
  response: po.response
    ? {
        ...po.response,
        respondedAt: shift(po.response.respondedAt),
        ...(po.response.confirmedDeliveryDate
          ? { confirmedDeliveryDate: shift(po.response.confirmedDeliveryDate) }
          : {}),
        ...(po.response.lines
          ? { lines: po.response.lines.map((l) => ({ ...l, counterDate: shift(l.counterDate) })) }
          : {}),
        ...(po.response.review
          ? { review: { ...po.response.review, reviewedAt: shift(po.response.review.reviewedAt) } }
          : {})
      }
    : undefined,
  shippingNotice: po.shippingNotice
    ? {
        ...po.shippingNotice,
        ...(po.shippingNotice.startedOn ? { startedOn: shift(po.shippingNotice.startedOn) } : {}),
        ...(po.shippingNotice.updatedAt ? { updatedAt: shift(po.shippingNotice.updatedAt) } : {}),
        ...(po.shippingNotice.expectedCompletionDate
          ? { expectedCompletionDate: shift(po.shippingNotice.expectedCompletionDate) }
          : {}),
        ...(po.shippingNotice.previousCompletionDate
          ? { previousCompletionDate: shift(po.shippingNotice.previousCompletionDate) }
          : {})
      }
    : undefined
}));
