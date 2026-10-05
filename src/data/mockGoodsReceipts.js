import { shiftFields } from '@services/data/fixturePresent';

/**
 * Submitted-interim SAP-boundary state (v2.2 Step 4 batch ii): the GR posting
 * has been submitted to SAP and awaits the async material-document callback.
 * A GR reads 'Posting to SAP' with NO sapMaterialDoc yet; the settlement
 * advances it to 'Posted to SAP' and assigns the real reference (Option B).
 *
 * @typedef {| 'Pending Inspection'
 *   | 'Under Inspection'
 *   | 'Quality Hold'
 *   | 'Approved'
 *   | 'Partially Approved'
 *   | 'Rejected'
 *   | 'Posting to SAP'
 *   | 'Posted to SAP'} GRStatus
 */

/**
 * @typedef {| 'Accept'
 *   | 'Reject'
 *   | 'Quarantine'
 *   | 'Return to Supplier'
 *   | 'Pending'} Disposition
 */

/** @typedef {'Pass' | 'Fail' | 'Pending'} CheckResult */
/** @typedef {'Pass' | 'Fail' | 'N/A'} OptionalCheck */

/**
 * @typedef {object} InspectionResult
 * @property {string} materialCode
 * @property {string} description
 * @property {number} qtyExpected
 * @property {number} qtyReceived
 * @property {number} qtyAccepted
 * @property {number} qtyRejected
 * @property {string} [rejectionReason]
 * @property {string} [labResultId]
 * @property {CheckResult} visualCheck
 * @property {CheckResult} packagingCheck
 * @property {OptionalCheck} [halalSealCheck]
 * @property {OptionalCheck} [bpomLotCheck]
 */

/**
 * @typedef {object} GoodsReceipt
 * @property {string} id
 * @property {string} grNumber
 * @property {string} asnId
 * @property {string} asnNumber
 * @property {string} poNumber
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string} receivedDate
 * @property {string} receivedBy
 * @property {GRStatus} status
 * @property {InspectionResult[]} inspectionResults
 * @property {Disposition} disposition
 * @property {string} [sapMaterialDoc]
 * @property {string} [notes]
 * @property {ReceiptDiscrepancyResponse} [discrepancyResponse] REQ-E07-06 — the supplier's answer to a receipt discrepancy, and PTI's
 *   resolution of a dispute. Held in its own store and joined on read; never a
 *   fixture value. Whether a receipt HAS a discrepancy is derived at read time
 *   (`fulfilmentRules.js`), not stored.
 */

/** @typedef {'Acknowledged' | 'Disputed' | 'Resolved'} ReceiptDiscrepancyStatus */

/**
 * @typedef {object} ReceiptDiscrepancyResponse
 * @property {string} receiptId
 * @property {string} supplierId
 * @property {ReceiptDiscrepancyStatus} status
 * @property {string} comment -  The supplier's comment (required for both answers).
 * @property {string} respondedAt
 * @property {string} [resolutionComment] -  PTI's comment when it resolved a dispute.
 * @property {string} [resolvedAt]
 */

/** @type {GoodsReceipt[]} */
const mockGoodsReceiptsRaw = [
  {
    id: 'gr-001',
    grNumber: 'GR-2026-001',
    asnId: 'shp-014',
    asnNumber: 'ASN-2026-014',
    poNumber: 'PO-2025-00101',
    supplierId: 'sup-001',
    supplierName: 'PT Sample Oleochemicals',
    // ⚠️ MOVED BACK 31 DAYS FROM `2026-05-19`, AND THE REASON IS CROSS-FAMILY.
    // This family and `purchaseOrder` are anchored separately (they must be —
    // their raw literals live a year apart), so the shift that re-times the
    // receipts is not the shift that re-times the orders. Read together at the
    // declared present, this receipt landed NINE DAYS AFTER the confirmed
    // delivery date of the order it fulfils, which made `poCfot` read
    // `PO-2025-00101` as 0% delivered-on-time — the whole of sup-001's CFOT.
    // Only the two rows whose parent order they contradicted were moved
    // (this one and `gr-005`); the rest are left late ON PURPOSE, so CFOT is a
    // spread and not a flat 100%.
    receivedDate: '2026-04-18',
    receivedBy: 'Warehouse Supervisor',
    status: 'Under Inspection',
    inspectionResults: [
      {
        materialCode: 'RM-COCO-8200',
        description: 'Coconut Fatty Acid Distillate (CFAD)',
        qtyExpected: 25000,
        qtyReceived: 25000,
        qtyAccepted: 0,
        qtyRejected: 0,
        visualCheck: 'Pending',
        packagingCheck: 'Pending',
        halalSealCheck: /** @type {OptionalCheck} */ ('Pending')
      }
    ],
    disposition: 'Pending',
    notes: 'Inspection in progress at Dock C-1.'
  },
  {
    id: 'gr-002',
    grNumber: 'GR-2026-002',
    asnId: 'shp-012',
    asnNumber: 'ASN-2026-012',
    poNumber: 'PO-2025-00107',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    receivedDate: '2026-05-20',
    receivedBy: 'QC Inspector',
    status: 'Pending Inspection',
    inspectionResults: [
      {
        materialCode: 'PK-PETB-8801',
        description: 'PET Bottle 200ml Frosted — Wardah Series',
        qtyExpected: 120000,
        qtyReceived: 120000,
        qtyAccepted: 0,
        qtyRejected: 0,
        visualCheck: 'Pending',
        packagingCheck: 'Pending',
        bpomLotCheck: /** @type {OptionalCheck} */ ('Pending')
      }
    ],
    disposition: 'Pending'
  },
  {
    id: 'gr-003',
    grNumber: 'GR-2026-003',
    asnId: 'shp-013',
    asnNumber: 'ASN-2026-013',
    poNumber: 'PO-2025-00108',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    receivedDate: '2026-05-20',
    receivedBy: 'QC Inspector',
    status: 'Approved',
    inspectionResults: [
      {
        materialCode: 'PK-PETB-8802',
        description: 'PET Bottle 100ml Clear — Emina Series',
        qtyExpected: 95000,
        // CR-25 (BL-45) demo — ONE unit over what was shipped. Any
        // over-delivery is flagged: it is PTI's decision, not a default. The
        // call-off this receipt serves (CO-2026-0013, 95,000) stays in full.
        // Sample data.
        qtyReceived: 95001,
        qtyAccepted: 95001,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
        bpomLotCheck: 'Pass'
      }
    ],
    disposition: 'Accept'
  },
  {
    id: 'gr-004',
    grNumber: 'GR-2026-004',
    asnId: 'shp-015',
    asnNumber: 'ASN-2026-015',
    poNumber: 'PO-2025-00112',
    supplierId: 'sup-003',
    supplierName: 'Sample Fragrance House Indonesia',
    receivedDate: '2026-05-20',
    receivedBy: 'QC Inspector',
    status: 'Approved',
    inspectionResults: [
      {
        materialCode: 'FR-WARD-4410',
        description: 'Wardah Signature Floral Compound',
        qtyExpected: 800,
        qtyReceived: 800,
        qtyAccepted: 800,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
        labResultId: 'LAB-2026-018'
      }
    ],
    disposition: 'Accept',
    notes: 'Lab confirmed fragrance profile within spec.'
  },
  {
    id: 'gr-005',
    grNumber: 'GR-2026-005',
    asnId: 'shp-016',
    asnNumber: 'ASN-2026-016',
    poNumber: 'PO-2025-00116',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    // Moved back 18 days from `2026-05-15`, for the reason stated on `gr-001`:
    // `PO-2025-00116` is confirmed for two days after this, so the receipt now
    // reads on time. `gr-014`, the other sup-002 receipt, is deliberately left
    // late — one supplier with one of each is what makes the percentage mean
    // something.
    receivedDate: '2026-04-27',
    receivedBy: 'Warehouse Supervisor',
    status: 'Posted to SAP',
    inspectionResults: [
      {
        materialCode: 'RM-STEAR-7300',
        description: 'Stearic Acid — Double Pressed (Halal)',
        qtyExpected: 8000,
        qtyReceived: 8000,
        qtyAccepted: 8000,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
        halalSealCheck: 'Pass'
      }
    ],
    disposition: 'Accept',
    sapMaterialDoc: 'MAT-DOC-501192'
  },
  {
    id: 'gr-006',
    grNumber: 'GR-2026-006',
    asnId: 'shp-017',
    asnNumber: 'ASN-2026-017',
    poNumber: 'PO-2025-00117',
    supplierId: 'sup-008',
    supplierName: 'PT Sample Carton Packaging',
    receivedDate: '2026-05-13',
    receivedBy: 'Warehouse Supervisor',
    status: 'Posted to SAP',
    inspectionResults: [
      {
        materialCode: 'PK-CART-9901',
        description: 'Mono-Carton Box 70x40x180mm — Wardah Moisturizing Lotion',
        qtyExpected: 240000,
        qtyReceived: 240000,
        qtyAccepted: 235000,
        qtyRejected: 5000,
        rejectionReason: 'Print quality variance on outer flap',
        visualCheck: 'Pass',
        packagingCheck: 'Pass'
      }
    ],
    disposition: 'Accept',
    sapMaterialDoc: 'MAT-DOC-501088',
    notes: 'Partial rejection of cosmetic-grade print defects.'
  },
  {
    id: 'gr-007',
    grNumber: 'GR-2026-007',
    asnId: 'shp-010',
    asnNumber: 'ASN-2026-010',
    poNumber: 'PO-2025-00113',
    supplierId: 'sup-005',
    supplierName: 'Sample Personal Care Emulsifiers GmbH',
    receivedDate: '2026-05-18',
    receivedBy: 'QC Inspector',
    status: 'Quality Hold',
    inspectionResults: [
      {
        materialCode: 'RM-EMUL-3320',
        description: 'Cetearyl Alcohol — Vegetable Origin',
        qtyExpected: 11000,
        qtyReceived: 11000,
        qtyAccepted: 0,
        qtyRejected: 0,
        rejectionReason: 'Color variance vs spec — pending lab confirmation',
        labResultId: 'LAB-2026-021',
        visualCheck: 'Fail',
        packagingCheck: 'Pass'
      }
    ],
    disposition: 'Quarantine',
    notes: 'Held pending GC-MS retest; quarantine bay 4.'
  },
  {
    id: 'gr-008',
    grNumber: 'GR-2026-008',
    asnId: 'shp-009',
    asnNumber: 'ASN-2026-009',
    poNumber: 'PO-2025-00109',
    supplierId: 'sup-008',
    supplierName: 'PT Sample Carton Packaging',
    receivedDate: '2026-05-19',
    receivedBy: 'QC Inspector',
    status: 'Under Inspection',
    inspectionResults: [
      {
        materialCode: 'PK-CART-9901',
        description: 'Mono-Carton Box 70x40x180mm — Wardah Moisturizing Lotion',
        qtyExpected: 200000,
        qtyReceived: 200000,
        qtyAccepted: 0,
        qtyRejected: 0,
        visualCheck: 'Pending',
        packagingCheck: 'Pending'
      }
    ],
    disposition: 'Pending'
  },
  {
    id: 'gr-009',
    grNumber: 'GR-2026-009',
    asnId: 'shp-011',
    asnNumber: 'ASN-2026-011',
    poNumber: 'PO-2025-00115',
    supplierId: 'sup-010',
    supplierName: 'PT Sample Halal Emulsifiers',
    receivedDate: '2026-05-20',
    receivedBy: 'QC Inspector',
    status: 'Pending Inspection',
    inspectionResults: [
      {
        materialCode: 'RM-EMUL-9430',
        description: 'Polysorbate 80 — Halal, Food & Cosmetic Grade',
        qtyExpected: 3000,
        qtyReceived: 3000,
        qtyAccepted: 0,
        qtyRejected: 0,
        visualCheck: 'Pending',
        packagingCheck: 'Pending',
        halalSealCheck: /** @type {OptionalCheck} */ ('Pending')
      }
    ],
    disposition: 'Pending'
  },
  {
    id: 'gr-010',
    grNumber: 'GR-2026-010',
    asnId: 'shp-005',
    asnNumber: 'ASN-2026-005',
    poNumber: 'PO-2025-00105',
    supplierId: 'sup-005',
    supplierName: 'Sample Personal Care Emulsifiers GmbH',
    receivedDate: '2026-05-12',
    receivedBy: 'Warehouse Supervisor',
    status: 'Partially Approved',
    inspectionResults: [
      {
        materialCode: 'RM-EMUL-3320',
        description: 'Cetearyl Alcohol — Vegetable Origin',
        qtyExpected: 9000,
        qtyReceived: 9000,
        qtyAccepted: 8200,
        qtyRejected: 800,
        rejectionReason: '2 drums damaged in transit',
        visualCheck: 'Pass',
        packagingCheck: 'Fail'
      }
    ],
    disposition: 'Accept',
    sapMaterialDoc: 'MAT-DOC-501012'
  },
  {
    id: 'gr-011',
    grNumber: 'GR-2026-011',
    asnId: 'shp-007',
    asnNumber: 'ASN-2026-007',
    poNumber: 'PO-2025-00106',
    supplierId: 'sup-006',
    supplierName: 'Sample Specialty Chemicals France',
    receivedDate: '2026-05-08',
    receivedBy: 'QC Inspector',
    status: 'Rejected',
    inspectionResults: [
      {
        materialCode: 'AI-PEPTIDE-8801',
        description: 'Peptide Complex Anti-Aging',
        qtyExpected: 250,
        qtyReceived: 250,
        qtyAccepted: 0,
        qtyRejected: 250,
        rejectionReason: 'Failed potency assay — below 92% spec floor',
        labResultId: 'LAB-2026-014',
        visualCheck: 'Pass',
        packagingCheck: 'Pass'
      }
    ],
    disposition: 'Return to Supplier',
    notes: 'Full lot return initiated; debit memo opened.'
  },
  {
    id: 'gr-012',
    grNumber: 'GR-2026-012',
    asnId: 'shp-008',
    asnNumber: 'ASN-2026-008',
    poNumber: 'PO-2025-00104',
    supplierId: 'sup-004',
    supplierName: 'Sample Aromatics Sdn. Bhd.',
    receivedDate: '2026-05-10',
    receivedBy: 'QC Inspector',
    status: 'Approved',
    inspectionResults: [
      {
        materialCode: 'FR-EMIN-4420',
        description: 'Emina Fresh Citrus Accord',
        qtyExpected: 900,
        qtyReceived: 900,
        qtyAccepted: 900,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
        labResultId: 'LAB-2026-009'
      }
    ],
    disposition: 'Accept'
  },
  {
    id: 'gr-013',
    grNumber: 'GR-2026-013',
    asnId: 'shp-006',
    asnNumber: 'ASN-2026-006',
    poNumber: 'PO-2025-00103',
    supplierId: 'sup-003',
    supplierName: 'Sample Fragrance House Indonesia',
    receivedDate: '2026-05-20',
    receivedBy: 'QC Inspector',
    status: 'Approved',
    inspectionResults: [
      {
        materialCode: 'FR-WARD-4410',
        description: 'Wardah Signature Floral Compound',
        qtyExpected: 1200,
        qtyReceived: 1200,
        qtyAccepted: 1200,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass'
      }
    ],
    disposition: 'Accept'
  },
  {
    id: 'gr-014',
    grNumber: 'GR-2026-014',
    asnId: 'shp-004',
    asnNumber: 'ASN-2026-004',
    poNumber: 'PO-2025-00102',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    receivedDate: '2026-05-18',
    receivedBy: 'Operations Manager',
    status: 'Posted to SAP',
    inspectionResults: [
      {
        materialCode: 'RM-EMUL-9410',
        description: 'Glyceryl Stearate SE (Halal Emulsifier)',
        qtyExpected: 8000,
        qtyReceived: 8000,
        qtyAccepted: 8000,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
        halalSealCheck: 'Pass'
      },
      {
        materialCode: 'RM-STEAR-7300',
        description: 'Stearic Acid — Double Pressed (Halal)',
        qtyExpected: 10000,
        qtyReceived: 10000,
        qtyAccepted: 10000,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
        halalSealCheck: 'Pass'
      }
    ],
    disposition: 'Accept',
    sapMaterialDoc: 'MAT-DOC-501205'
  },
  // ══ THE sup-007 WALKTHROUGH RECEIPTS — demo data ═══════════════════════════
  //
  // Three receipts against the two DELIVERED sup-007 orders authored in
  // `mockPurchaseOrders.js`, one per state the receipt lane can render and
  // could not previously reach for this supplier:
  //
  //   gr-015  a quantity discrepancy with NO answer yet → the supplier can still
  //           acknowledge or DISPUTE it (`awaitsSupplierAnswer`)
  //   gr-016  a discrepancy the supplier HAS disputed → waiting on PTI
  //           (`isOpenDispute`; the answer itself is seeded in
  //           `stores/receiptDiscrepancyStore.ts`, never here — a response is
  //           something a supplier gives)
  //   gr-017  Approved, fully accepted, short by exactly 2% (within CR-25, so
  //           no discrepancy) → the receipt a sup-007 user can still raise an
  //           invoice from with no setup (`INVOICEABLE_RECEIPT_STATES` ×
  //           `remainingInvoiceableQty > 0`; the BL-44 demo invoices use
  //           37,000 of its 39,200)
  //
  // ⚠️ CR-25 (BL-45) CASES, ONE RECEIPT EACH, ALL sup-007 SO BOTH PERSONAS SEE
  // THEM: exact — gr-002 (120,000 of 120,000); over by one — gr-003; short by
  // exactly 2% — gr-017 (closes); short just over 2% — gr-015 (2.1%, flagged,
  // kept open). Pinned by id in `receiptToleranceDemo.test.ts`.
  //
  // ⚠️ AND THE QUANTITIES ARE NOT FREE: CFOT reads gr-015/016/017 (their
  // orders fall in the period) and OTIF reads gr-002/gr-003 through their
  // call-offs. Each value was chosen so sup-007's CFOT still rounds to 40% and
  // every call-off keeps its in-full result — measured, not assumed.
  //
  // ⚠️ `hasReceiptDiscrepancy` COMPARES AGAINST `qtyExpected`, NOT AGAINST AN
  // ASN, because no goods receipt in this fixture resolves an ASN number
  // (`compareReceipt` falls back to `qtyExpected` when it cannot find one). So
  // a short RECEIPT is what flags gr-015, and a rejected quantity is what flags
  // gr-016 — two different arms of the same predicate, deliberately.
  //
  // ⚠️ THE DATES ARE NOT FREE, AND NEITHER ARE THE MATERIALS. sup-007's only
  // two document-lane codes (`PK-PETB-8801`, `-8802`) BOTH carry call-off
  // programmes, and `receiptEvents` matches a delivery to a call-off on
  // supplier + material within SEVEN DAYS of its approved date and consumes it
  // once, globally. Using a code outside the lane instead was tried and
  // rejected: `materialIdentity.test.js` pins the document lane at an exact
  // size and asserts `PK-PETB-8810` / `PK-CAPF-8820` absent from it BY NAME.
  // So the codes stay, and every receipt here is dated OUTSIDE the ±7-day
  // window of every sup-007 call-off (nearest: `co-0001`, 2026-08-27, nine days
  // from `gr-015`; `co-0013`, 2026-08-31, eleven from `gr-017`). Move one of
  // these three dates later and `co-0001`'s OTIF quietly re-decides.
  {
    id: 'gr-015',
    grNumber: 'GR-2026-015',
    asnId: 'shp-025',
    asnNumber: 'ASN-2026-025',
    poNumber: 'PO-2026-00125',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    receivedDate: '2026-05-07',
    receivedBy: 'Warehouse Supervisor',
    // BL-74 — Approved, because its one line accepted everything it received:
    // the header rule (`deriveHeaderDisposition`) says so, and the supplier's
    // quality result reads that rule. It stored "Partially Approved", so one
    // receipt showed both answers. The shortfall is not a quality result: it is
    // the CR-25 "kept open" label, derived from the quantities.
    status: 'Approved',
    inspectionResults: [
      {
        materialCode: 'PK-PETB-8801',
        description: 'PET Bottle 200ml Frosted — Wardah Series',
        qtyExpected: 50000,
        // CR-25 (BL-45) demo — short by 1,050 (2.1%): just over the 2%
        // tolerance, so it is flagged and the receipt stays open. Sample data.
        qtyReceived: 48950,
        qtyAccepted: 48950,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
        bpomLotCheck: /** @type {OptionalCheck} */ ('N/A')
      }
    ],
    disposition: 'Accept',
    notes: 'Short by 1,050 PCS against the ordered quantity — counted twice at Dock B-2.'
  },
  {
    id: 'gr-016',
    grNumber: 'GR-2026-016',
    asnId: 'shp-026',
    asnNumber: 'ASN-2026-026',
    poNumber: 'PO-2026-00125',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    receivedDate: '2026-05-08',
    receivedBy: 'QC Inspector',
    status: 'Partially Approved',
    inspectionResults: [
      {
        materialCode: 'PK-PETB-8802',
        description: 'PET Bottle 100ml Clear — Emina Series',
        qtyExpected: 50000,
        qtyReceived: 48800,
        qtyAccepted: 48000,
        qtyRejected: 800,
        rejectionReason: 'Neck-finish deformation on 800 PCS from lot LOT-F2210.',
        visualCheck: 'Fail',
        packagingCheck: 'Pass',
        bpomLotCheck: /** @type {OptionalCheck} */ ('N/A')
      }
    ],
    disposition: 'Quarantine'
  },
  {
    id: 'gr-017',
    grNumber: 'GR-2026-017',
    asnId: 'shp-027',
    asnNumber: 'ASN-2026-027',
    poNumber: 'PO-2026-00126',
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    receivedDate: '2026-05-09',
    receivedBy: 'Warehouse Supervisor',
    status: 'Approved',
    inspectionResults: [
      {
        materialCode: 'PK-PETB-8802',
        description: 'PET Bottle 100ml Clear — Emina Series',
        qtyExpected: 40000,
        // CR-25 (BL-45) demo — short by EXACTLY 2% (800 of 40,000): at the
        // tolerance, so the receipt closes and nothing is flagged. Sample data.
        qtyReceived: 39200,
        qtyAccepted: 39200,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
        bpomLotCheck: /** @type {OptionalCheck} */ ('N/A')
      }
    ],
    disposition: 'Accept'
  },

  // ⚠️ BL-94 — sup-007's DELIVERY HISTORY: one receipt per past call-off
  // CO-2026-0043..0046 (`callOffs.ts`), each received ON the approved date and
  // IN FULL (12,000 of 12,000), so four more call-offs read on time in full and
  // sup-007's 90-day OTIF is 83% (5 of 6). Authored dates, shifted +103 days
  // like every row here: 2026-03-01 / 03-21 / 04-10 / 04-25 land 80, 60, 40 and
  // 25 days before the declared present.
  //
  // ⚠️ They are on `PO-2025-00108`, the call-offs' umbrella, whose confirmed
  // delivery date is empty — so CFOT (which reads receipts by PO number for
  // orders confirmed in the period) does not move, and the order is not
  // invoiceable (`Sent`), so no invoice line appears from them. `Approved`,
  // like GR-2026-003 on the same order, and NOT `Posted to SAP`: a posted
  // receipt is a landed one, and `receiptsForInvoice` would then pair the
  // disputed INV-2025-BRL-0043 on this PO with them
  // (`invoiceMatchPairing.test.js` names the one pairing the corpus holds).
  // No ASN: the call-offs had none, and the receipt pages say "Received
  // without ASN".
  // Every date is 12 days or more from every other sup-007 receipt and call-off
  // (see the header above gr-015), so no other delivery re-decides.
  .../** @type {const} */ ([
    [18, '2026-03-01'],
    [19, '2026-03-21'],
    [20, '2026-04-10'],
    [21, '2026-04-25']
  ]).map(
    /** @returns {GoodsReceipt} */ ([n, receivedDate]) => ({
      id: `gr-0${n}`,
      grNumber: `GR-2026-0${n}`,
      asnId: '',
      asnNumber: '',
      poNumber: 'PO-2025-00108',
      supplierId: 'sup-007',
      supplierName: 'PT Sample Packaging Indonesia',
      receivedDate,
      receivedBy: 'Warehouse Supervisor',
      status: 'Approved',
      inspectionResults: [
        {
          materialCode: 'PK-PETB-8802',
          description: 'PET Bottle 100ml Clear — Emina Series',
          qtyExpected: 12000,
          qtyReceived: 12000,
          qtyAccepted: 12000,
          qtyRejected: 0,
          visualCheck: 'Pass',
          packagingCheck: 'Pass',
          bpomLotCheck: 'N/A'
        }
      ],
      disposition: 'Accept'
    })
  )
];

// ─────────────────────────────────────────────────────────────────────────────
// THE DECLARED PRESENT — FIXTURE-PRESENT-01 (d).
//
// The literals above are the AUTHORED set, left exactly as written so the
// authoring intent stays readable. They are shifted to the declared present at
// module load by this family's own anchor (goodsReceipt); the shift is
// `DECLARED_PRESENT - anchor` and it moves every row by the same whole number of
// days, so the set's internal spacing — which is the part that was never wrong —
// is preserved exactly.
// ─────────────────────────────────────────────────────────────────────────────
/** @type {GoodsReceipt[]} */
export const mockGoodsReceipts = shiftFields(mockGoodsReceiptsRaw, 'goodsReceipt', [
  'receivedDate'
]);
