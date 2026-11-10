// ────────────────────────────────────────────────────────────────────────────
// BL-139 [Proposed] — the ASNs the sample goods receipts name.
//
// All 17 receipts that name an ASN use numbers (`ASN-2026-004` to `-017`, and
// `-025` to `-027`) that the ASN read held no record of, so no receipt could be
// compared with its ASN and every one fell back to its ordered quantity. Each
// row below is the ASN its receipt names: same number, supplier and PO as the
// receipt, one line per receipt line, shipped quantity = the receipt's ordered
// quantity (the figure the comparison already used), status Delivered, ETA the
// day the receipt landed. So no receipt's comparison changes, and each can now
// be read against a record that exists.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ASN } from '../../types' */
import { shiftFields } from '../../fixturePresent';

// RAW, AUTHORED literals in the receipts' own family (`goodsReceipt`), shifted
// at the foot of the file exactly as the receipts are.
/** @type {ASN[]} */
const RECEIVED_ASNS_RAW = [
  {
    asnNumber: 'ASN-2026-014',
    supplierId: 'sup-001',
    poReference: 'PO-2025-00101',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-014',
    eta: '2026-04-18',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'RM-COCO-8200',
        description: 'Coconut Fatty Acid Distillate (CFAD)',
        orderedQty: 25000,
        shippedQty: 25000,
        lotNumber: 'LOT-014-1'
      }
    ]
  },
  {
    asnNumber: 'ASN-2026-012',
    supplierId: 'sup-007',
    poReference: 'PO-2025-00107',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-012',
    eta: '2026-05-20',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'PK-PETB-8801',
        description: 'PET Bottle 200ml Frosted — Wardah Series',
        orderedQty: 120000,
        shippedQty: 120000,
        lotNumber: 'LOT-012-1'
      }
    ]
  },
  {
    asnNumber: 'ASN-2026-013',
    supplierId: 'sup-007',
    poReference: 'PO-2025-00108',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-013',
    eta: '2026-05-20',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'PK-PETB-8802',
        description: 'PET Bottle 100ml Clear — Emina Series',
        orderedQty: 95000,
        shippedQty: 95000,
        lotNumber: 'LOT-013-1'
      }
    ]
  },
  {
    asnNumber: 'ASN-2026-015',
    supplierId: 'sup-003',
    poReference: 'PO-2025-00112',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-015',
    eta: '2026-05-20',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'FR-WARD-4410',
        description: 'Wardah Signature Floral Compound',
        orderedQty: 800,
        shippedQty: 800,
        lotNumber: 'LOT-015-1'
      }
    ]
  },
  {
    asnNumber: 'ASN-2026-016',
    supplierId: 'sup-002',
    poReference: 'PO-2025-00116',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-016',
    eta: '2026-04-27',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'RM-STEAR-7300',
        description: 'Stearic Acid — Double Pressed (Halal)',
        orderedQty: 8000,
        shippedQty: 8000,
        lotNumber: 'LOT-016-1'
      }
    ]
  },
  {
    asnNumber: 'ASN-2026-017',
    supplierId: 'sup-008',
    poReference: 'PO-2025-00117',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-017',
    eta: '2026-05-13',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'PK-CART-9901',
        description: 'Mono-Carton Box 70x40x180mm — Wardah Moisturizing Lotion',
        orderedQty: 240000,
        shippedQty: 240000,
        lotNumber: 'LOT-017-1'
      }
    ]
  },
  {
    asnNumber: 'ASN-2026-010',
    supplierId: 'sup-005',
    poReference: 'PO-2025-00113',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-010',
    eta: '2026-05-18',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'RM-EMUL-3320',
        description: 'Cetearyl Alcohol — Vegetable Origin',
        orderedQty: 11000,
        shippedQty: 11000,
        lotNumber: 'LOT-010-1'
      }
    ]
  },
  {
    asnNumber: 'ASN-2026-009',
    supplierId: 'sup-008',
    poReference: 'PO-2025-00109',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-009',
    eta: '2026-05-19',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'PK-CART-9901',
        description: 'Mono-Carton Box 70x40x180mm — Wardah Moisturizing Lotion',
        orderedQty: 200000,
        shippedQty: 200000,
        lotNumber: 'LOT-009-1'
      }
    ]
  },
  {
    asnNumber: 'ASN-2026-011',
    supplierId: 'sup-010',
    poReference: 'PO-2025-00115',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-011',
    eta: '2026-05-20',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'RM-EMUL-9430',
        description: 'Polysorbate 80 — Halal, Food & Cosmetic Grade',
        orderedQty: 3000,
        shippedQty: 3000,
        lotNumber: 'LOT-011-1'
      }
    ]
  },
  {
    asnNumber: 'ASN-2026-005',
    supplierId: 'sup-005',
    poReference: 'PO-2025-00105',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-005',
    eta: '2026-05-12',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'RM-EMUL-3320',
        description: 'Cetearyl Alcohol — Vegetable Origin',
        orderedQty: 9000,
        shippedQty: 9000,
        lotNumber: 'LOT-005-1'
      }
    ]
  },
  {
    asnNumber: 'ASN-2026-007',
    supplierId: 'sup-006',
    poReference: 'PO-2025-00106',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-007',
    eta: '2026-05-08',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'AI-PEPTIDE-8801',
        description: 'Peptide Complex Anti-Aging',
        orderedQty: 250,
        shippedQty: 250,
        lotNumber: 'LOT-007-1'
      }
    ]
  },
  {
    asnNumber: 'ASN-2026-008',
    supplierId: 'sup-004',
    poReference: 'PO-2025-00104',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-008',
    eta: '2026-05-10',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'FR-EMIN-4420',
        description: 'Emina Fresh Citrus Accord',
        orderedQty: 900,
        shippedQty: 900,
        lotNumber: 'LOT-008-1'
      }
    ]
  },
  {
    asnNumber: 'ASN-2026-006',
    supplierId: 'sup-003',
    poReference: 'PO-2025-00103',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-006',
    eta: '2026-05-20',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'FR-WARD-4410',
        description: 'Wardah Signature Floral Compound',
        orderedQty: 1200,
        shippedQty: 1200,
        lotNumber: 'LOT-006-1'
      }
    ]
  },
  {
    asnNumber: 'ASN-2026-004',
    supplierId: 'sup-002',
    poReference: 'PO-2025-00102',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-004',
    eta: '2026-05-18',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'RM-EMUL-9410',
        description: 'Glyceryl Stearate SE (Halal Emulsifier)',
        orderedQty: 8000,
        shippedQty: 8000,
        lotNumber: 'LOT-004-1'
      },
      {
        materialCode: 'RM-STEAR-7300',
        description: 'Stearic Acid — Double Pressed (Halal)',
        orderedQty: 10000,
        shippedQty: 10000,
        lotNumber: 'LOT-004-2'
      }
    ]
  },
  {
    asnNumber: 'ASN-2026-025',
    supplierId: 'sup-007',
    poReference: 'PO-2026-00125',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-025',
    eta: '2026-05-07',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'PK-PETB-8801',
        description: 'PET Bottle 200ml Frosted — Wardah Series',
        orderedQty: 50000,
        shippedQty: 50000,
        lotNumber: 'LOT-025-1'
      }
    ]
  },
  {
    asnNumber: 'ASN-2026-026',
    supplierId: 'sup-007',
    poReference: 'PO-2026-00125',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-026',
    eta: '2026-05-08',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'PK-PETB-8802',
        description: 'PET Bottle 100ml Clear — Emina Series',
        orderedQty: 50000,
        shippedQty: 50000,
        lotNumber: 'LOT-026-1'
      }
    ]
  },
  {
    asnNumber: 'ASN-2026-027',
    supplierId: 'sup-007',
    poReference: 'PO-2026-00126',
    status: 'Delivered',
    carrier: 'Sample Freight Line (illustrative)',
    trackingNumber: 'SMPL-FRT-027',
    eta: '2026-05-09',
    details: {
      originCity: 'Jakarta, ID',
      destinationWarehouse: 'Paragon DC Cikarang (WH-04)',
      totalCartons: 0,
      grossWeightKg: 0,
      temperatureRequirement: 'Ambient (15–25°C)'
    },
    lineItems: [
      {
        materialCode: 'PK-PETB-8802',
        description: 'PET Bottle 100ml Clear — Emina Series',
        orderedQty: 40000,
        shippedQty: 40000,
        lotNumber: 'LOT-027-1'
      },
      {
        materialCode: 'PK-PETB-8802',
        description: 'PET Bottle 100ml Clear — Emina Series',
        orderedQty: 12000,
        shippedQty: 12000,
        lotNumber: 'LOT-027-2'
      }
    ]
  }
];

/** @type {ASN[]} */
export const RECEIVED_ASNS = shiftFields(RECEIVED_ASNS_RAW, 'goodsReceipt', ['eta']);
