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
//   · po-008 / li-008a — sup-007, PET bottle PK-PETB-8802, 150,000 PCS
//   · po-017 / li-017a — sup-008, shipper box PK-CART-9910, 20,000 PCS
//   · po-002 / li-002a — sup-002, emulsifier RM-EMUL-9410, 8,000 KG
//   · po-024 / li-024a — sup-007, PET bottle PK-PETB-8801, 60,000 PCS
//   · po-028 / li-028a — sup-003, fragrance FR-WARD-4410, NO quantity: a
//     value-limit line of 500,000,000 IDR (BL-49)
//
// What each row shows at the declared present (derived, never stored):
//   0001 Late (received after need date) · 0002 Dispatched · 0003 Awaiting
//   Confirmation · 0004 new date Awaiting Approval · 0005 At Risk · 0006
//   Confirmed, due within 7 days with no dispatch notice · 0007 and 0008 Missed
//   (delivery drift) · 0009 Escalated · 0010 partial Awaiting Approval · 0011
//   Rejected · 0012 Draft · 0013 Delivered on time and in full · 0043, 0044,
//   0045 and 0046 Delivered on time and in full, 80, 60, 40 and 25 days ago —
//   sup-007's delivery history (BL-94) · 0049, 0050 and 0051 Delivered on time
//   and in full (BL-360), which extends that history so sup-007's DERIVED
//   90-day OTIF clears the compliance gate's minimum on the Oslo RFQ.
//
// And the CR-05 / CR-04 cases (BL-47, BL-49):
//   exactly +5% accepted: 0005 (JIT) and 0017 (forecast) · +5.1% awaiting
//   approval: 0014 · short, a visible partial: 0015 · later date awaiting
//   approval: 0004 · earlier date awaiting approval: 0016 · release within
//   remaining quantity: drafts 0012 and 0019 (each exactly the remainder) ·
//   release over remaining quantity, refused: draft 0018 · value-limit line:
//   0020 released, draft 0021 refused on remaining value.
// ────────────────────────────────────────────────────────────────────────────

import { DECLARED_PRESENT } from '../../fixturePresent';
/** @import { CallOff } from '../../types' */

const DAY_MS = 86_400_000;
const P = Date.parse(`${DECLARED_PRESENT}T00:00:00.000Z`);

/**
 * `YYYY-MM-DD`, `offset` days from the declared present.
 * @param {number} offset
 */
const day = (offset) => new Date(P + offset * DAY_MS).toISOString().slice(0, 10);
/**
 * An instant on that day at `hhZ` (WIB is UTC+7: 02Z = 09:00 WIB).
 * @param {number} offset
 * @param {number} hourUtc
 */
const at = (offset, hourUtc) => new Date(P + offset * DAY_MS + hourUtc * 3_600_000).toISOString();

const PET = /** @type {const} */ ({
  poId: 'po-007',
  poNumber: 'PO-2025-00107',
  poLineId: 'li-007a',
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  materialCode: 'PK-PETB-8801',
  description: 'PET Bottle 200ml Frosted — Wardah Series',
  uom: 'PCS',
  unitPrice: 1600,
  currency: 'IDR'
});

// A SECOND PET line, on the 100ml bottle — its goods receipt (GR-2026-003) is
// the one delivery in this seed that lands ON the approved date and IN FULL, so
// REQ-E10-01's calculated OTIF has a MET result to show beside the late and
// missed ones. Without it every measured supplier would read 0%, which is a
// property of the sample set rather than of the rule.
const PET_100 = /** @type {const} */ ({
  poId: 'po-008',
  poNumber: 'PO-2025-00108',
  poLineId: 'li-008a',
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  materialCode: 'PK-PETB-8802',
  description: 'PET Bottle 100ml Clear — Emina Series',
  uom: 'PCS',
  unitPrice: 1233,
  currency: 'IDR'
});

const CARTON = /** @type {const} */ ({
  poId: 'po-017',
  poNumber: 'PO-2025-00117',
  poLineId: 'li-017a',
  supplierId: 'sup-008',
  supplierName: 'PT Sample Carton Packaging',
  materialCode: 'PK-CART-9910',
  description: 'Shipper Box — Emina Bright Stuff Range (12-pack)',
  uom: 'PCS',
  unitPrice: 2500,
  currency: 'IDR'
});

// The PET line of `po-024` — the BL-47 / BL-49 demo rows sit here so the
// original PET line keeps its 15,000 remaining. Same supplier and material as
// PET, so the delivery matcher sees them; their need dates keep them clear.
const PET_024 = /** @type {const} */ ({
  poId: 'po-024',
  poNumber: 'PO-2026-00124',
  poLineId: 'li-024a',
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  materialCode: 'PK-PETB-8801',
  description: 'PET Bottle 200ml Frosted — Wardah Series',
  uom: 'PCS',
  unitPrice: 1600,
  currency: 'IDR'
});

// The value-limit line (BL-49): `po-028` / `li-028a` carries no quantity.
const FRAGRANCE_VALUE = /** @type {const} */ ({
  poId: 'po-028',
  poNumber: 'PO-2026-00128',
  poLineId: 'li-028a',
  supplierId: 'sup-003',
  supplierName: 'Sample Fragrance House Indonesia',
  materialCode: 'FR-WARD-4410',
  description: 'Wardah Signature Floral Compound',
  uom: 'KG',
  unitPrice: 2_200_000,
  currency: 'IDR'
});

const EMULSIFIER = /** @type {const} */ ({
  poId: 'po-002',
  poNumber: 'PO-2025-00102',
  poLineId: 'li-002a',
  supplierId: 'sup-002',
  supplierName: 'PT Sample Specialty Fats',
  materialCode: 'RM-EMUL-9410',
  description: 'Glyceryl Stearate SE (Halal Emulsifier)',
  uom: 'KG',
  unitPrice: 109375,
  currency: 'IDR'
});

/** @type {readonly CallOff[]} */
export const CALL_OFF_SEED = [
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
      approval: 'auto'
    },
    dispatches: [],
    notes: []
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
      approval: 'auto'
    },
    dispatches: [
      {
        id: 'dsp-0002-1',
        shippedDate: day(0),
        expectedArrival: day(3),
        quantity: 15000,
        recordedAt: at(0, 4)
      }
    ],
    notes: []
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
    notes: []
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
      approval: 'awaiting'
    },
    dispatches: [],
    notes: []
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
    // BL-47 — EXACTLY +5% (10,500 on 10,000), the top of the CR-05 allowance, so
    // accepted automatically. It read 11,000 (+10%) while a JIT call-off had no
    // over-quantity limit; under the revised CR-05 that answer would wait for the
    // planner, so a stored `auto` would have been a rule the tree no longer has.
    confirmation: {
      kind: 'changes',
      deliveries: [{ quantity: 10500, date: day(2) }],
      comment: 'Rounded up to full pallets.',
      confirmedAt: at(-5, 8),
      approval: 'auto'
    },
    dispatches: [
      {
        id: 'dsp-0005-1',
        shippedDate: day(0),
        expectedArrival: day(5),
        quantity: 10500,
        recordedAt: at(0, 5)
      }
    ],
    notes: []
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
      approval: 'auto'
    },
    dispatches: [],
    notes: []
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
      approval: 'auto'
    },
    dispatches: [],
    notes: []
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
      approval: 'auto'
    },
    dispatches: [],
    notes: []
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
    notes: []
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
        { quantity: 800, date: day(16) }
      ],
      comment: 'Second batch finishes QC a week later.',
      confirmedAt: at(-1, 4),
      approval: 'awaiting'
    },
    dispatches: [],
    notes: []
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
    notes: []
  },
  {
    // 0013 Delivered on time and in full — the met OTIF in this seed.
    ...PET_100,
    id: 'co-0013',
    callOffNumber: 'CO-2026-0013',
    quantity: 95000,
    needDate: day(0),
    type: 'forecast',
    status: 'Confirmed',
    releasedAt: at(-12, 2),
    confirmation: {
      kind: 'confirm',
      deliveries: [{ quantity: 95000, date: day(0) }],
      confirmedAt: at(-11, 3),
      approval: 'auto'
    },
    dispatches: [],
    notes: []
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
    notes: []
  },

  // ── BL-47 / BL-49 demo rows ────────────────────────────────────────────────
  // One row per CR-05 and CR-04 case that had no example in the seed. Need
  // dates are all 9 days or more ahead, so none falls inside the ±7-day
  // delivery match of any past goods receipt (CR-06) and no OTIF moves; none is
  // Awaiting Confirmation, so the supplier's "to confirm" count is unchanged.
  {
    // +5.1% (8,408 on 8,000): beyond the 5% allowance, so it waits for PTI.
    ...PET_024,
    id: 'co-0014',
    callOffNumber: 'CO-2026-0014',
    quantity: 8000,
    needDate: day(12),
    type: 'forecast',
    status: 'Confirmed with Changes',
    releasedAt: at(-2, 2),
    confirmation: {
      kind: 'changes',
      deliveries: [{ quantity: 8408, date: day(12) }],
      comment: 'Last carton layer is 408 pieces.',
      confirmedAt: at(-1, 3),
      approval: 'awaiting'
    },
    dispatches: [],
    notes: []
  },
  {
    // Short by 600 (5,400 on 6,000): a partial delivery, accepted and visible.
    ...PET_024,
    id: 'co-0015',
    callOffNumber: 'CO-2026-0015',
    quantity: 6000,
    needDate: day(14),
    type: 'jit',
    status: 'Confirmed with Changes',
    releasedAt: at(-2, 3),
    confirmation: {
      kind: 'changes',
      deliveries: [{ quantity: 5400, date: day(14) }],
      comment: 'Resin allocation covers 5,400 this cycle.',
      confirmedAt: at(-1, 4),
      approval: 'auto'
    },
    dispatches: [],
    notes: []
  },
  {
    // 4 days EARLIER than the need date: goes to PTI, because the early
    // allowance is 0 days (decided with BL-56).
    ...PET_024,
    id: 'co-0016',
    callOffNumber: 'CO-2026-0016',
    quantity: 5000,
    needDate: day(15),
    type: 'forecast',
    status: 'Confirmed with New Date',
    releasedAt: at(-2, 4),
    confirmation: {
      kind: 'newDate',
      deliveries: [{ quantity: 5000, date: day(11) }],
      comment: 'We can ship the week before.',
      confirmedAt: at(-1, 5),
      approval: 'awaiting'
    },
    dispatches: [],
    notes: []
  },
  {
    // EXACTLY +5% on a forecast-based call-off (4,200 on 4,000): accepted, the
    // same allowance as the JIT CO-2026-0005.
    ...PET_024,
    id: 'co-0017',
    callOffNumber: 'CO-2026-0017',
    quantity: 4000,
    needDate: day(16),
    type: 'forecast',
    status: 'Confirmed with Changes',
    releasedAt: at(-2, 5),
    confirmation: {
      kind: 'changes',
      deliveries: [{ quantity: 4200, date: day(16) }],
      comment: 'Full pallets.',
      confirmedAt: at(-1, 6),
      approval: 'auto'
    },
    dispatches: [],
    notes: []
  },
  {
    // Draft beyond what remains on li-024a (60,000 − 23,000 released =
    // 37,000): releasing it is refused on remaining QUANTITY.
    ...PET_024,
    id: 'co-0018',
    callOffNumber: 'CO-2026-0018',
    quantity: 45000,
    needDate: day(28),
    type: 'forecast',
    status: 'Draft',
    dispatches: [],
    notes: []
  },
  {
    // Draft of exactly what remains on li-024a: releasing it is allowed.
    ...PET_024,
    id: 'co-0019',
    callOffNumber: 'CO-2026-0019',
    quantity: 37000,
    needDate: day(35),
    type: 'forecast',
    status: 'Draft',
    dispatches: [],
    notes: []
  },
  {
    // On the VALUE-LIMIT line: 100 KG × 2,200,000 = 220,000,000 of the
    // 500,000,000 limit released, so 280,000,000 remains.
    ...FRAGRANCE_VALUE,
    id: 'co-0020',
    callOffNumber: 'CO-2026-0020',
    quantity: 100,
    needDate: day(18),
    type: 'forecast',
    status: 'Confirmed',
    releasedAt: at(-3, 2),
    confirmation: {
      kind: 'confirm',
      deliveries: [{ quantity: 100, date: day(18) }],
      confirmedAt: at(-3, 6),
      approval: 'auto'
    },
    dispatches: [],
    notes: []
  },
  {
    // Draft on the value-limit line: 150 KG = 330,000,000, more than the
    // 280,000,000 remaining, so releasing it is refused on remaining VALUE.
    ...FRAGRANCE_VALUE,
    id: 'co-0021',
    callOffNumber: 'CO-2026-0021',
    quantity: 150,
    needDate: day(25),
    type: 'forecast',
    status: 'Draft',
    dispatches: [],
    notes: []
  },

  // ── BL-94 · sup-007's delivery history ─────────────────────────────────────
  // Four past call-offs on the 100ml PET line, each received ON its date and IN
  // FULL (GR-2026-018..021 in `mockGoodsReceipts.js`), so the main supplier
  // persona has a real OTIF record: these four are met in the 90-day window,
  // with 0013 met and the late 0001 missed. ⚠️ That cleared the minimum in
  // force at BL-94. The owner raised the minimum on 2026-11-20 (BL-55), so
  // BL-360 extends this history on the same line below: the DERIVED OTIF
  // (REQ-E10-01) clears the minimum in force again, and the Oslo walkthrough
  // (rfq-021) can award sup-007 a share.
  //
  // ⚠️ THE LINE IS NOT FREE. li-007a has exactly 15,000 left (draft 0012's
  // remainder) and li-024a exactly 37,000 (draft 0019's), so any release on
  // either would flip a CR-04 demo. li-008a (150,000) had 55,000 left after
  // 0013; these four take 48,000 and leave 7,000.
  //
  // ⚠️ THE DATES ARE NOT FREE EITHER. The matcher pairs a receipt with a
  // call-off on supplier + material within ±7 days and uses each receipt once,
  // so every date here is 12 days or more from every other sup-007 call-off and
  // receipt (the nearest: GR-2026-015 at −13 days, on the 200ml code). Nothing
  // else re-decides; 0001 stays Late and 0013 stays on time.
  //
  // Numbered after the gate demo's CO-2026-0042 so no number is reused.
  ...[
    { n: 43, need: -80 },
    { n: 44, need: -60 },
    { n: 45, need: -40 },
    { n: 46, need: -25 }
  ].map(
    /** @returns {CallOff} */ ({ n, need }) => ({
      ...PET_100,
      id: `co-00${n}`,
      callOffNumber: `CO-2026-00${n}`,
      quantity: 12000,
      needDate: day(need),
      type: 'forecast',
      status: 'Confirmed',
      releasedAt: at(need - 10, 2),
      confirmation: {
        kind: 'confirm',
        deliveries: [{ quantity: 12000, date: day(need) }],
        confirmedAt: at(need - 9, 4),
        approval: 'auto'
      },
      dispatches: [],
      notes: []
    })
  ),

  // ── BL-360 · the delivery history that clears the raised minimum ───────────
  // BL-55 raised the compliance gate's OTIF minimum above what sup-007's
  // history measured, which left the Oslo walkthrough (rfq-021) with a supplier
  // that could not be awarded. Three more past call-offs on the same 100ml
  // line, each received ON its date and IN FULL (GR-2026-022..024 in
  // `mockGoodsReceipts.js`), lift the DERIVED OTIF over the minimum in force.
  // No percentage is authored anywhere: the figure comes from the call-offs,
  // the receipts and the window, exactly as BL-94's rows do.
  //
  // ⚠️ THE QUANTITY IS NOT FREE. li-008a (150,000 PCS) has 7,000 left after
  // 0013 and the BL-94 rows; these three take 6,000 and leave 1,000, so no
  // CR-04 release is re-decided. Twelve-thousand each would overdraw the line.
  //
  // ⚠️ THE DATES ARE NOT FREE EITHER. The matcher pairs a receipt with a
  // call-off on supplier + material within ±7 days and uses each receipt once,
  // so every date here is MORE than seven days from every other sup-007
  // call-off and receipt on either PET code. The nearest are the BL-94 rows at
  // ten days, and the same-day pair 0013 / GR-2026-003 at fourteen.
  //
  // Numbered after the walkthrough pair's CO-2026-0048, so the store's next
  // assigned number (seed length + 1) stays free (`callOffSeedIdentity.test`).
  ...[
    { n: 49, need: -70 },
    { n: 50, need: -50 },
    { n: 51, need: -14 }
  ].map(
    /** @returns {CallOff} */ ({ n, need }) => ({
      ...PET_100,
      id: `co-00${n}`,
      callOffNumber: `CO-2026-00${n}`,
      quantity: 2000,
      needDate: day(need),
      type: 'forecast',
      status: 'Confirmed',
      releasedAt: at(need - 10, 2),
      confirmation: {
        kind: 'confirm',
        deliveries: [{ quantity: 2000, date: day(need) }],
        confirmedAt: at(need - 9, 4),
        approval: 'auto'
      },
      dispatches: [],
      notes: []
    })
  )
];
