// ────────────────────────────────────────────────────────────────────────────
// BL-139 — the ASNs the sample goods receipts name, in the ASN store's OWN
// series.
//
// ── THE DEFECT THIS CLOSES ─────────────────────────────────────────────────
//   The 17 receipts that named an ASN cited the SHIPMENTS corpus' numbers
//   (`ASN-2026-001` … `-018`, `mockShipments.js`), while the ASN read
//   (`getASNs`, backed by `asnStore`) held a different series
//   (`ASN-2025-00198` and the rest of `MOCK_ASNS`). GR-2026-015 to -017 named
//   `ASN-2026-025` to `-027`, which existed in NEITHER. So `compareReceipt`
//   resolved none of them and every receipt fell back to its ordered
//   quantity — REQ-E07-06's ASN-versus-received comparison could not be
//   demonstrated on one sample receipt.
//
// ── THE CANONICAL SERIES, AND IT IS A CHOICE [Proposed] ────────────────────
//   The ASN STORE's series is canonical: `ASN-2025-0NNNN`, the form
//   `MOCK_ASNS` already uses and the form a real inbound document would carry.
//   The alternative was the shipments' `ASN-2026-0NN` series; it was not taken
//   because the store is what `getASNs` reads, so growing the store in the
//   SHIPMENTS' numbering would keep two corpora speaking two dialects.
//   Each row below is the ASN one receipt names: same supplier, same PO, one
//   line per receipt line, `shippedQty` = the receipt's `qtyExpected` (the
//   figure the comparison already used, so no receipt's CR-25 outcome moves),
//   status `Delivered`, and `eta` on the receipt's own date. Carrier, tracking
//   and the shipment details mirror the shipment the receipt answers where one
//   exists, so the two corpora agree.
//
// ── ONE DELIBERATE MISMATCH, KEPT ON PURPOSE ───────────────────────────────
//   `gr-016` names `ASN-2025-00416`, and there is NO row for it below. That is
//   the one receipt whose ASN the store does not hold: it keeps the FALLBACK
//   path (an ASN not on record → compare against `qtyExpected`) demonstrable
//   and covered by a spec. Every other receipt names an ASN that exists, and
//   the gap at `-00416` in a contiguous block is the visible mark of the
//   exception.
//
// ── WHAT IS NOT REPAIRED HERE ──────────────────────────────────────────────
//   A few receipts carry a material their parent PO does not (`gr-011`,
//   `gr-012`, `gr-013`, `gr-014`'s second line). That is the PRE-EXISTING
//   receipt-versus-PO gap, mirrored by the shipments corpus (shp-007, shp-008),
//   and BL-139 is about receipt-versus-ASN: re-authoring receipt materials
//   would move the CR-25 demo quantities and the material-lane pins, which is
//   a different row. The ASN below carries exactly what its receipt says was
//   shipped, because that is what the comparison reads.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ASN } from '../../types' */
import { shiftFields } from '../../fixturePresent';

// RAW, AUTHORED literals in the RECEIPTS' family (`goodsReceipt`), shifted at
// the foot of the file exactly as `mockGoodsReceipts` is. The ASN belongs to
// the `purchaseOrder` family elsewhere because `asnRefIntegrity` compares its
// `eta` to a PO's `orderDate`; THESE rows are read against receipts, so they
// take the receipts' anchor and the two dates resolve to the same day.
/** @type {ASN[]} */
const RECEIVED_ASNS_RAW = [
  {
    asnNumber: 'ASN-2025-00401',
    supplierId: 'sup-001',
    poReference: 'PO-2025-00101',
    status: 'Delivered',
    carrier: 'Sample Interisland Line (illustrative)',
    trackingNumber: 'SMPL-ISL-552145',
    eta: '2026-04-18',
    details: {
      originCity: 'Batam, Indonesia',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 40,
      grossWeightKg: 25000,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'RM-COCO-8200',
        description: 'Coconut Fatty Acid Distillate (CFAD)',
        orderedQty: 25000,
        shippedQty: 25000,
        lotNumber: 'LOT-401'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00402',
    supplierId: 'sup-007',
    poReference: 'PO-2025-00107',
    status: 'Delivered',
    carrier: 'Sample Courier (illustrative)',
    trackingNumber: 'SMPL-CUR-77131',
    eta: '2026-05-20',
    details: {
      originCity: 'Tangerang, Indonesia',
      destinationWarehouse: 'Paragon DC Karawang (WH-02)',
      totalCartons: 32,
      grossWeightKg: 5400,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'PK-PETB-8801',
        description: 'PET Bottle 200ml Frosted — Wardah Series',
        orderedQty: 120000,
        shippedQty: 120000,
        lotNumber: 'LOT-402'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00403',
    supplierId: 'sup-007',
    poReference: 'PO-2025-00108',
    status: 'Delivered',
    carrier: 'Sample Courier (illustrative)',
    trackingNumber: 'SMPL-CUR-77129',
    eta: '2026-05-20',
    details: {
      originCity: 'Tangerang, Indonesia',
      destinationWarehouse: 'Paragon DC Karawang (WH-02)',
      totalCartons: 28,
      grossWeightKg: 4800,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'PK-PETB-8802',
        description: 'PET Bottle 100ml Clear — Emina Series',
        orderedQty: 95000,
        shippedQty: 95000,
        lotNumber: 'LOT-403'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00404',
    supplierId: 'sup-003',
    poReference: 'PO-2025-00112',
    status: 'Delivered',
    carrier: 'Sample Courier (illustrative)',
    trackingNumber: 'SMPL-CUR-77140',
    eta: '2026-05-20',
    details: {
      originCity: 'Cikarang, Indonesia',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 8,
      grossWeightKg: 1600,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'FR-WARD-4410',
        description: 'Wardah Signature Floral Compound',
        orderedQty: 800,
        shippedQty: 800,
        lotNumber: 'LOT-404'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00405',
    supplierId: 'sup-002',
    poReference: 'PO-2025-00116',
    status: 'Delivered',
    carrier: 'Sample Interisland Line (illustrative)',
    trackingNumber: 'SMPL-ISL-552102',
    eta: '2026-04-27',
    details: {
      originCity: 'Medan, Indonesia',
      destinationWarehouse: 'Paragon DC Karawang (WH-02)',
      totalCartons: 18,
      grossWeightKg: 8400,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'RM-STEAR-7300',
        description: 'Stearic Acid — Double Pressed (Halal)',
        orderedQty: 8000,
        shippedQty: 8000,
        lotNumber: 'LOT-405'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00406',
    supplierId: 'sup-008',
    poReference: 'PO-2025-00117',
    status: 'Delivered',
    carrier: 'Sample Sea Line (illustrative)',
    trackingNumber: 'SMPL-SEA-30001',
    eta: '2026-05-13',
    details: {
      originCity: 'Surabaya, Indonesia',
      destinationWarehouse: 'Paragon DC Cibitung (WH-01)',
      totalCartons: 44,
      grossWeightKg: 16800,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'PK-CART-9901',
        description: 'Mono-Carton Box 70x40x180mm — Wardah Moisturizing Lotion',
        orderedQty: 240000,
        shippedQty: 240000,
        lotNumber: 'LOT-406'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00407',
    supplierId: 'sup-005',
    poReference: 'PO-2025-00113',
    status: 'Delivered',
    carrier: 'Sample Container Line (illustrative)',
    trackingNumber: 'SMPL-CTN-665821',
    eta: '2026-05-18',
    details: {
      originCity: 'Hamburg, Germany',
      destinationWarehouse: 'Paragon DC Karawang (WH-02)',
      totalCartons: 22,
      grossWeightKg: 11500,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'RM-EMUL-3320',
        description: 'Cetearyl Alcohol — Vegetable Origin',
        orderedQty: 11000,
        shippedQty: 11000,
        lotNumber: 'LOT-407'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00408',
    supplierId: 'sup-008',
    poReference: 'PO-2025-00109',
    status: 'Delivered',
    carrier: 'Sample Sea Line (illustrative)',
    trackingNumber: 'SMPL-SEA-30019',
    eta: '2026-05-19',
    details: {
      originCity: 'Surabaya, Indonesia',
      destinationWarehouse: 'Paragon DC Cibitung (WH-01)',
      totalCartons: 36,
      grossWeightKg: 14200,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'PK-CART-9901',
        description: 'Mono-Carton Box 70x40x180mm — Wardah Moisturizing Lotion',
        orderedQty: 200000,
        shippedQty: 200000,
        lotNumber: 'LOT-408'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00409',
    supplierId: 'sup-010',
    poReference: 'PO-2025-00115',
    status: 'Delivered',
    carrier: 'Sample Sea Line (illustrative)',
    trackingNumber: 'SMPL-SEA-30058',
    eta: '2026-05-20',
    details: {
      originCity: 'Bogor, Indonesia',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 14,
      grossWeightKg: 3500,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'RM-EMUL-9430',
        description: 'Polysorbate 80 — Halal, Food & Cosmetic Grade',
        orderedQty: 3000,
        shippedQty: 3000,
        lotNumber: 'LOT-409'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00410',
    supplierId: 'sup-005',
    poReference: 'PO-2025-00105',
    status: 'Delivered',
    carrier: 'Sample Ocean Carrier (illustrative)',
    trackingNumber: 'SMPL-OCN-90218',
    eta: '2026-05-12',
    details: {
      originCity: 'Hamburg, Germany',
      destinationWarehouse: 'Paragon DC Karawang (WH-02)',
      totalCartons: 18,
      grossWeightKg: 9500,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'RM-EMUL-3320',
        description: 'Cetearyl Alcohol — Vegetable Origin',
        orderedQty: 9000,
        shippedQty: 9000,
        lotNumber: 'LOT-410'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00411',
    supplierId: 'sup-006',
    poReference: 'PO-2025-00106',
    status: 'Delivered',
    carrier: 'Sample Air Cargo (illustrative)',
    trackingNumber: 'SMPL-AIR-4421-A',
    eta: '2026-05-08',
    details: {
      originCity: 'Lyon, France',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 6,
      grossWeightKg: 850,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'AI-PEPTIDE-8801',
        description: 'Peptide Complex Anti-Aging',
        orderedQty: 250,
        shippedQty: 250,
        lotNumber: 'LOT-411'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00412',
    supplierId: 'sup-004',
    poReference: 'PO-2025-00104',
    status: 'Delivered',
    carrier: 'Sample Coastal Line (illustrative)',
    trackingNumber: 'SMPL-CST-22871',
    eta: '2026-05-10',
    details: {
      originCity: 'Port Klang, Malaysia',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 9,
      grossWeightKg: 1800,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'FR-EMIN-4420',
        description: 'Emina Fresh Citrus Accord',
        orderedQty: 900,
        shippedQty: 900,
        lotNumber: 'LOT-412'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00413',
    supplierId: 'sup-003',
    poReference: 'PO-2025-00103',
    status: 'Delivered',
    carrier: 'Sample Courier (illustrative)',
    trackingNumber: 'SMPL-CUR-77129',
    eta: '2026-05-20',
    details: {
      originCity: 'Cikarang, Indonesia',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 12,
      grossWeightKg: 2400,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'FR-WARD-4410',
        description: 'Wardah Signature Floral Compound',
        orderedQty: 1200,
        shippedQty: 1200,
        lotNumber: 'LOT-413'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00414',
    supplierId: 'sup-002',
    poReference: 'PO-2025-00102',
    status: 'Delivered',
    carrier: 'Sample Interisland Line (illustrative)',
    trackingNumber: 'SMPL-ISL-552189',
    eta: '2026-05-18',
    details: {
      originCity: 'Medan, Indonesia',
      destinationWarehouse: 'Paragon DC Karawang (WH-02)',
      totalCartons: 24,
      grossWeightKg: 18000,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'RM-EMUL-9410',
        description: 'Glyceryl Stearate SE (Halal Emulsifier)',
        orderedQty: 8000,
        shippedQty: 8000,
        lotNumber: 'LOT-414-1'
      },
      {
        materialCode: 'RM-STEAR-7300',
        description: 'Stearic Acid — Double Pressed (Halal)',
        orderedQty: 10000,
        shippedQty: 10000,
        lotNumber: 'LOT-414-2'
      }
    ]
  },
  {
    asnNumber: 'ASN-2025-00415',
    supplierId: 'sup-007',
    poReference: 'PO-2026-00125',
    status: 'Delivered',
    carrier: 'Sample Courier (illustrative)',
    trackingNumber: 'SMPL-CUR-77150',
    eta: '2026-05-07',
    details: {
      originCity: 'Tangerang, Indonesia',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 20,
      grossWeightKg: 4200,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'PK-PETB-8801',
        description: 'PET Bottle 200ml Frosted — Wardah Series',
        orderedQty: 50000,
        shippedQty: 50000,
        lotNumber: 'LOT-415'
      }
    ]
  },
  // ⚠️ `ASN-2025-00416` IS DELIBERATELY ABSENT — see the header. `gr-016`
  // names it, and that is the one receipt whose ASN the store does not hold.
  {
    asnNumber: 'ASN-2025-00417',
    supplierId: 'sup-007',
    poReference: 'PO-2026-00126',
    status: 'Delivered',
    carrier: 'Sample Courier (illustrative)',
    trackingNumber: 'SMPL-CUR-77151',
    eta: '2026-05-09',
    details: {
      originCity: 'Tangerang, Indonesia',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 16,
      grossWeightKg: 3400,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'PK-PETB-8802',
        description: 'PET Bottle 100ml Clear — Emina Series',
        orderedQty: 40000,
        shippedQty: 40000,
        lotNumber: 'LOT-417'
      }
    ]
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// THE DECLARED PRESENT — shifted with the RECEIPTS these rows answer, so an
// ASN's `eta` and its receipt's `receivedDate` resolve to the same day rather
// than to two offsets that happen to agree.
// ─────────────────────────────────────────────────────────────────────────────
/** @type {ASN[]} */
export const RECEIVED_ASNS = shiftFields(RECEIVED_ASNS_RAW, 'goodsReceipt', ['eta']);
