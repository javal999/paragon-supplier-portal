// ─────────────────────────────────────────────────────────────────────────────
// Purchase-order fixtures · the first ten base orders, po-001 to po-010 (PO-2025-00101 to 00110).
// Separate so each authored group reads alone; `retimed.js` concatenates the
// groups in this file order, so the exported array order is unchanged.
// Rows are RAW 2025 literals; a comment below that says "the foot of this
// file" means `retimed.js`, where the shift now lives.
// ─────────────────────────────────────────────────────────────────────────────
/** @import { PurchaseOrder, POLineItem } from '@services/data/types' */
import { POStatus, ChannelType } from '@services/data/types';

/** @type {PurchaseOrder[]} */
export const baseOrders1Raw = [
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
  }
];
