// ────────────────────────────────────────────────────────────────────────────
// Call-off seed (REQ-E09-03, REQ-E09-04) — sample data around the declared
// present, so the demo shows every state a planner and a supplier meet.
//
// Dates are OFFSETS from `DECLARED_PRESENT`, never literals, so the set keeps
// its shape when the present moves. The goods receipts are shifted to the same
// present, which is what lets GR-2026-002 land 4 days after CO-2026-0001's need
// date (Late) without either fixture naming a calendar day.
//
// Umbrella PO lines:
//   · po-007 / li-007a — sup-007, PET bottle PK-PETB-8801, 200,000 PCS
//   · po-017 / li-017a — sup-008, shipper box PK-CART-9910, 20,000 PCS
//   · po-002 / li-002a — sup-002, emulsifier RM-EMUL-9410, 8,000 KG
//
// What each row shows at the declared present (derived, never stored):
//   0001 Late (received after need date) · 0002 Dispatched · 0003 Awaiting
//   Confirmation · 0004 new date Awaiting Approval · 0005 At Risk · 0006
//   Confirmed, due within 7 days with no dispatch notice · 0007 and 0008 Missed
//   (delivery drift) · 0009 Escalated · 0010 partial Awaiting Approval · 0011
//   Rejected · 0012 Draft.
// ────────────────────────────────────────────────────────────────────────────

import { DECLARED_PRESENT } from '../../fixturePresent';
import type { CallOff } from '../../types';

const DAY_MS = 86_400_000;
const P = Date.parse(`${DECLARED_PRESENT}T00:00:00.000Z`);

/** `YYYY-MM-DD`, `offset` days from the declared present. */
const day = (offset: number) => new Date(P + offset * DAY_MS).toISOString().slice(0, 10);
/** An instant on that day at `hhZ` (WIB is UTC+7: 02Z = 09:00 WIB). */
const at = (offset: number, hourUtc: number) => new Date(P + offset * DAY_MS + hourUtc * 3_600_000).toISOString();

const PET = {
  poId: 'po-007',
  poNumber: 'PO-2025-00107',
  poLineId: 'li-007a',
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  materialCode: 'PK-PETB-8801',
  description: 'PET Bottle 200ml Frosted — Wardah Series',
  uom: 'PCS',
  unitPrice: 1600,
  currency: 'IDR',
} as const;

const CARTON = {
  poId: 'po-017',
  poNumber: 'PO-2025-00117',
  poLineId: 'li-017a',
  supplierId: 'sup-008',
  supplierName: 'PT Sample Carton Packaging',
  materialCode: 'PK-CART-9910',
  description: 'Shipper Box — Emina Bright Stuff Range (12-pack)',
  uom: 'PCS',
  unitPrice: 2500,
  currency: 'IDR',
} as const;

const EMULSIFIER = {
  poId: 'po-002',
  poNumber: 'PO-2025-00102',
  poLineId: 'li-002a',
  supplierId: 'sup-002',
  supplierName: 'PT Sample Specialty Fats',
  materialCode: 'RM-EMUL-9410',
  description: 'Glyceryl Stearate SE (Halal Emulsifier)',
  uom: 'KG',
  unitPrice: 109375,
  currency: 'IDR',
} as const;

export const CALL_OFF_SEED: readonly CallOff[] = [
  {
    ...PET,
    id: 'co-0001',
    callOffNumber: 'CO-2026-0001',
    quantity: 120000,
    needDate: day(-4),
    type: 'forecast',
    status: 'Confirmed',
    releasedAt: at(-11, 3),
    confirmation: {
      kind: 'confirm',
      deliveries: [{ quantity: 120000, date: day(-4) }],
      confirmedAt: at(-10, 4),
      approval: 'auto',
    },
    dispatches: [],
    notes: [],
  },
  {
    ...PET,
    id: 'co-0002',
    callOffNumber: 'CO-2026-0002',
    quantity: 15000,
    needDate: day(4),
    type: 'jit',
    status: 'Confirmed',
    releasedAt: at(-6, 3),
    confirmation: {
      kind: 'confirm',
      deliveries: [{ quantity: 15000, date: day(4) }],
      confirmedAt: at(-6, 7),
      approval: 'auto',
    },
    dispatches: [
      { id: 'dsp-0002-1', shippedDate: day(0), expectedArrival: day(3), quantity: 15000, recordedAt: at(0, 4) },
    ],
    notes: [],
  },
  {
    ...PET,
    id: 'co-0003',
    callOffNumber: 'CO-2026-0003',
    quantity: 15000,
    needDate: day(7),
    type: 'forecast',
    status: 'Awaiting Confirmation',
    releasedAt: at(0, 2),
    dispatches: [],
    notes: [],
  },
  {
    ...PET,
    id: 'co-0004',
    callOffNumber: 'CO-2026-0004',
    quantity: 15000,
    needDate: day(10),
    type: 'forecast',
    status: 'Confirmed with New Date',
    releasedAt: at(-3, 3),
    confirmation: {
      kind: 'newDate',
      deliveries: [{ quantity: 15000, date: day(12) }],
      comment: 'Resin delivery to our plant moved by two days.',
      confirmedAt: at(-2, 6),
      approval: 'awaiting',
    },
    dispatches: [],
    notes: [],
  },
  {
    ...PET,
    id: 'co-0005',
    callOffNumber: 'CO-2026-0005',
    quantity: 10000,
    needDate: day(2),
    type: 'jit',
    status: 'Confirmed with Changes',
    releasedAt: at(-5, 3),
    confirmation: {
      kind: 'changes',
      deliveries: [{ quantity: 11000, date: day(2) }],
      comment: 'Rounded up to full pallets.',
      confirmedAt: at(-5, 8),
      approval: 'auto',
    },
    dispatches: [
      { id: 'dsp-0005-1', shippedDate: day(0), expectedArrival: day(5), quantity: 11000, recordedAt: at(0, 5) },
    ],
    notes: [],
  },
  {
    ...PET,
    id: 'co-0006',
    callOffNumber: 'CO-2026-0006',
    quantity: 10000,
    needDate: day(3),
    type: 'forecast',
    status: 'Confirmed',
    releasedAt: at(-7, 3),
    confirmation: {
      kind: 'confirm',
      deliveries: [{ quantity: 10000, date: day(3) }],
      confirmedAt: at(-7, 6),
      approval: 'auto',
    },
    dispatches: [],
    notes: [],
  },
  {
    ...CARTON,
    id: 'co-0007',
    callOffNumber: 'CO-2026-0007',
    quantity: 4000,
    needDate: day(-21),
    type: 'forecast',
    status: 'Confirmed',
    releasedAt: at(-28, 3),
    confirmation: {
      kind: 'confirm',
      deliveries: [{ quantity: 4000, date: day(-21) }],
      confirmedAt: at(-28, 6),
      approval: 'auto',
    },
    dispatches: [],
    notes: [],
  },
  {
    ...CARTON,
    id: 'co-0008',
    callOffNumber: 'CO-2026-0008',
    quantity: 4000,
    needDate: day(-14),
    type: 'forecast',
    status: 'Confirmed',
    releasedAt: at(-21, 3),
    confirmation: {
      kind: 'confirm',
      deliveries: [{ quantity: 4000, date: day(-14) }],
      confirmedAt: at(-21, 6),
      approval: 'auto',
    },
    dispatches: [],
    notes: [],
  },
  {
    ...CARTON,
    id: 'co-0009',
    callOffNumber: 'CO-2026-0009',
    quantity: 4000,
    needDate: day(8),
    type: 'forecast',
    status: 'Awaiting Confirmation',
    releasedAt: at(-4, 3),
    dispatches: [],
    notes: [],
  },
  {
    ...EMULSIFIER,
    id: 'co-0010',
    callOffNumber: 'CO-2026-0010',
    quantity: 2000,
    needDate: day(9),
    type: 'forecast',
    status: 'Partially Confirmed',
    releasedAt: at(-2, 3),
    confirmation: {
      kind: 'partial',
      deliveries: [
        { quantity: 1200, date: day(9) },
        { quantity: 800, date: day(16) },
      ],
      comment: 'Second batch finishes QC a week later.',
      confirmedAt: at(-1, 4),
      approval: 'awaiting',
    },
    dispatches: [],
    notes: [],
  },
  {
    ...EMULSIFIER,
    id: 'co-0011',
    callOffNumber: 'CO-2026-0011',
    quantity: 1500,
    needDate: day(2),
    type: 'jit',
    status: 'Rejected',
    releasedAt: at(-3, 3),
    rejectionReason: 'Production line under maintenance that week.',
    dispatches: [],
    notes: [],
  },
  {
    ...PET,
    id: 'co-0012',
    callOffNumber: 'CO-2026-0012',
    quantity: 15000,
    needDate: day(21),
    type: 'forecast',
    status: 'Draft',
    dispatches: [],
    notes: [],
  },
];
