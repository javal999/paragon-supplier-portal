// ─────────────────────────────────────────────────────────────────────────────
// Purchase-order fixtures · the sup-007 walkthrough set, po-021 to po-027 (demo data, Phase 7).
// Separate so each authored group reads alone; `retimed.js` concatenates the
// groups in this file order, so the exported array order is unchanged.
// Rows are RAW 2025 literals; a comment below that says "the foot of this
// file" means `retimed.js`, where the shift now lives.
// ─────────────────────────────────────────────────────────────────────────────
/** @import { PurchaseOrder, POLineItem } from '@services/data/types' */
import { POStatus, ChannelType } from '@services/data/types';

/** @type {PurchaseOrder[]} */
export const sup007WalkthroughRaw = [
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
  //    a Draft with no eta, so level 3 of `asnRefIntegrity.test.js`'s selection
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
  // (`fulfillment.js`), which matches on supplier + material and would otherwise
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
  }
];
