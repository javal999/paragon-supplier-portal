// ─────────────────────────────────────────────────────────────────────────────
// Purchase-order fixtures · the next ten base orders, po-011 to po-020 (PO-2025-00111 to 00120).
// Separate so each authored group reads alone; `retimed.js` concatenates the
// groups in this file order, so the exported array order is unchanged.
// Rows are RAW 2025 literals; a comment below that says "the foot of this
// file" means `retimed.js`, where the shift now lives.
// ─────────────────────────────────────────────────────────────────────────────
/** @import { PurchaseOrder, POLineItem } from '@services/data/types' */
import { POStatus, ChannelType } from '@services/data/types';

/** @type {PurchaseOrder[]} */
export const baseOrders2Raw = [
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
  }
];
