// ────────────────────────────────────────────────────────────────────────────
// E2E WALKTHROUGH 2026-11-12 — ONE MATERIAL, ONE TEST SUPPLIER, THE WHOLE FLOW.
//
// The planners walk the PTI and supplier sides on ONE pair and compare the
// app's figures with their Excel ("Coret-coret demand ROP.xlsx", sheet
// "Simulasi SSTP - stable (2)"; numbers in
// analysis/e2e-walkthrough-2026-11-12/EXCEL-SOURCE-SSTP.md). The owner approved
// the scope: full flow, keep the app clock, a test supplier.
//
//   · Material 2000028400 CONTAINER SSTP REVAMP MO (packaging, PCS).
//   · Supplier sup-007 PT Sample Packaging Indonesia — the seat "View as
//     Supplier" signs in as, so the supplier side needs no extra login. 100%.
//   · Week mapping ("relabel, keep clock"): Excel W46 = the app week starting
//     Monday 31 August 2026 (the declared present). W45 = 24 Aug, W47 = 7 Sep …
//     W18 2027 = 22 Feb 2027 (W53 exists in 2026, so W18 is 25 weeks after W46).
//
// Only INPUTS are seeded here. Every figure the planners compare (DA, cycle
// stock, safety order, ROP Order, PR, plan check, ROP Fisik, Max, OSPO, PO On
// Hold, feedstock reconcile) is computed by the app's own rules at read; no
// rule or default changes for this pair. Every date is an OFFSET from the
// declared present, so the seed moves with the pinned clock.
//
// What is NOT seeded: the sheet's "SOH J603" 20,863 (unknown plant), the
// process order 23,488 (not modelled in the app), the supplier's Foresight
// commitments (the supplier confirms live in the walkthrough).
// ────────────────────────────────────────────────────────────────────────────

import { DECLARED_PRESENT } from '../../fixturePresent';
/** @import { ASN, CallOff, PurchaseOrder } from '../../types' */
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */
import { ChannelType, POStatus } from '../../types';
import { NO_PERSON } from '@context/noPerson';

const DAY_MS = 86_400_000;
const P = Date.parse(`${DECLARED_PRESENT}T00:00:00.000Z`);

/**
 * A calendar day `offset` days from the declared present.
 * @param {number} offset
 * @returns {string}
 */
const day = (offset) => new Date(P + offset * DAY_MS).toISOString().slice(0, 10);
/**
 * An instant `offset` days from the declared present at `hourUtc` (WIB is UTC+7).
 * @param {number} offset
 * @param {number} [hourUtc]
 * @returns {string}
 */
const at = (offset, hourUtc = 3) =>
  new Date(P + offset * DAY_MS + hourUtc * 3_600_000).toISOString();

/** The walkthrough material's own planning group (see `planningGroupStore`). */
/** @type {import('../../types').PlanningGroupEvent} */
export const SSTP_PLANNING_GROUP_EVENT = {
  kind: 'created',
  groupId: 'pg-walkthrough-sstp',
  name: 'E2E walkthrough — SSTP containers',
  sapMaterialGroup: 'MG-20',
  at: at(-14, 2),
  by: NO_PERSON
};

/** The pair. */
export const SSTP = Object.freeze({
  materialCode: '2000028400',
  label: 'CONTAINER SSTP REVAMP MO',
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  uom: 'PCS'
});

/**
 * The pair's purchasing figures from the sheet. The app reads them where it
 * reads every pair's: lead time and MOQ/MPQ from the engine source, koli from
 * the engine's units per pallet, SOH and ROP Fisik (SAP's ROP) from PTI stock,
 * Max PTI from the OSIP values ledger (`maxPti`).
 */
export const SSTP_FIGURES = Object.freeze({
  /** Excel B29 — 5 weeks. */
  leadTimeDays: 35,
  /** Excel B15 / B17 — MDQ = MOQ. */
  moq: 30_096,
  /** Excel B30. */
  mpq: 27_311,
  /** Excel B18 — pcs per koli. */
  koli: 144,
  /** Excel B13 — SOH on 4 Nov 2026, plant J6. */
  ptiSoh: 31_630,
  /** Excel B12. */
  ropFisikPti: 25_428,
  /** Excel B11. */
  maxStockFisikPti: 25_488,
  /** Excel AK21 "PO 1910" — the umbrella line. */
  poOrdered: 440_208,
  /** [Scenario] the call-off delivered and received last week. */
  pastCallOff: 21_168,
  /** Excel D22 — the call-off due in W47, confirmed and in transit. */
  openCallOff: 32_256,
  /** Excel B35 — OSPO = 440,208 − 21,168 − 32,256. */
  ospo: 386_784,
  /** [Scenario] the supplier's finished stock today (= one MOQ). */
  supplierFgOnHand: 30_096,
  /** [Scenario] sup-007's weekly capacity for the container (above every LTP week). */
  weeklyCapacity: 35_000,
  /** [Scenario] the supplier's feedstock today (= the sheet's typed safety order B16). */
  supplierFeedstock: 56_409
});

/**
 * Excel row 20 "Consumption LTP", W45 2026 to W18 2027, keyed by the app week
 * it maps to (Monday). LTP series A of the material.
 * @type {Readonly<Record<string, number>>}
 */
export const SSTP_LTP_WEEKS = Object.freeze(
  Object.fromEntries(
    [
      6_723, 20_067, 25_348, 30_091, 16_806, 27_268, 30_131, 22_027, 23_388, 15_385, 26_729, 28_710,
      10_063, 16_666, 15_385, 18_726, 13_405, 13_385, 16_645, 16_726, 20_626, 30_191, 23_388,
      30_710, 30_030, 22_128, 23_428
    ].map((qty, i) => [day(-7 + i * 7), qty])
  )
);

/** The Excel week label of each seeded app week, for the walkthrough notes. */
export const SSTP_EXCEL_WEEK_LABELS = Object.freeze(
  Object.fromEntries(
    Object.keys(SSTP_LTP_WEEKS).map((w, i) => {
      const n = 45 + i;
      return [w, n <= 53 ? `W${n} 2026` : `W${String(n - 53).padStart(2, '0')} 2027`];
    })
  )
);

/**
 * The material's demand in a forecast period: the LTP week by week, a week
 * spread evenly over its 7 days, so a monthly period sums the days it holds.
 * Zero outside the sheet's horizon (after W18 2027).
 * @param {{ readonly start: string; readonly end: string }} period
 * @returns {number}
 */
export function sstpDemand(period) {
  let total = 0;
  for (const [monday, qty] of Object.entries(SSTP_LTP_WEEKS)) {
    const m = Date.parse(`${monday}T00:00:00.000Z`);
    for (let d = 0; d < 7; d += 1) {
      const iso = new Date(m + d * DAY_MS).toISOString().slice(0, 10);
      if (iso >= period.start && iso <= period.end) total += qty / 7;
    }
  }
  return total;
}

/** Rupiah per piece on the umbrella line (sample price). */
export const SSTP_UNIT_PRICE_IDR = 2_350;

/**
 * The supplier's stock submission today: finished stock on hand [Scenario].
 * The in-transit call-off is not stock, so it is not in this figure.
 * @type {import('../../../sdc/types').InventoryDeclaration}
 */
export const SSTP_INVENTORY_DECLARATION = {
  id: 'inv-0190',
  supplierId: SSTP.supplierId,
  materialCode: SSTP.materialCode,
  declaredAt: at(0, 2),
  totalQty: SSTP_FIGURES.supplierFgOnHand,
  uom: 'PCS',
  channel: 'template',
  provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' }
};

/** The umbrella order the pair's call-offs draw against ("PO 1910" in the sheet). */
/** @type {PurchaseOrder} */
export const SSTP_PURCHASE_ORDER = {
  id: 'po-1910',
  poNumber: 'PO-2026-01910',
  sourceOfSupply: 'Outline Agreement (walkthrough sample)',
  supplierId: SSTP.supplierId,
  supplierName: SSTP.supplierName,
  status: POStatus.CONFIRMED,
  channel: ChannelType.WEB,
  currency: 'IDR',
  totalValue: SSTP_FIGURES.poOrdered * SSTP_UNIT_PRICE_IDR,
  orderDate: day(-56),
  // Confirmed to the end of the sheet's horizon (W18 2027).
  requestedDeliveryDate: day(182),
  confirmedDeliveryDate: day(182),
  daysOverdue: 0,
  acknowledgmentTimeHours: 5,
  lineItems: [
    {
      id: 'li-1910a',
      materialCode: SSTP.materialCode,
      description: SSTP.label,
      quantity: SSTP_FIGURES.poOrdered,
      uom: SSTP.uom,
      unitPrice: SSTP_UNIT_PRICE_IDR,
      confirmedQty: SSTP_FIGURES.poOrdered
    }
  ]
};

/**
 * A confirmed call-off on the umbrella line, auto-approved.
 * @param {string} id
 * @param {string} callOffNumber
 * @param {number} quantity
 * @param {number} needOffset
 * @param {number} releasedOffset
 * @returns {CallOff}
 */
const callOff = (id, callOffNumber, quantity, needOffset, releasedOffset) => ({
  id,
  callOffNumber,
  poId: SSTP_PURCHASE_ORDER.id,
  poNumber: SSTP_PURCHASE_ORDER.poNumber,
  poLineId: 'li-1910a',
  supplierId: SSTP.supplierId,
  supplierName: SSTP.supplierName,
  materialCode: SSTP.materialCode,
  description: SSTP.label,
  uom: SSTP.uom,
  unitPrice: SSTP_UNIT_PRICE_IDR,
  currency: 'IDR',
  quantity,
  needDate: day(needOffset),
  type: 'forecast',
  status: 'Confirmed',
  releasedAt: at(releasedOffset, 2),
  confirmation: {
    kind: 'confirm',
    deliveries: [{ quantity, date: day(needOffset) }],
    confirmedAt: at(releasedOffset + 1, 4),
    approval: 'auto'
  },
  dispatches: [],
  notes: []
});

/**
 * Numbered into the free numbers above the base seed's last row (CO-2026-0046,
 * its BL-94 delivery history). The store assigns `seed length + 1`, so keeping
 * the pair last in the seed puts the first assigned number past them and no
 * number or id is reused (BL-359 — these were once CO-2026-0043/0044, beside
 * the base seed's rows).
 *   · CO-2026-0047 — 21,168 due Wednesday last week (W45), shipped, received.
 *   · CO-2026-0048 — 32,256 due Monday 7 September (W47), confirmed, in transit.
 * @type {readonly CallOff[]}
 */
export const SSTP_CALL_OFFS = [
  callOff('co-0047', 'CO-2026-0047', SSTP_FIGURES.pastCallOff, -5, -16),
  callOff('co-0048', 'CO-2026-0048', SSTP_FIGURES.openCallOff, 7, -4)
];

/**
 * @param {string} asnNumber
 * @param {CallOff} c
 * @param {ASN['status']} status
 * @param {number} shipOffset
 * @param {number} etaOffset
 * @param {string} lot
 * @returns {ASN}
 */
const asn = (asnNumber, c, status, shipOffset, etaOffset, lot) => ({
  asnNumber,
  supplierId: SSTP.supplierId,
  poReference: SSTP_PURCHASE_ORDER.poNumber,
  // AIB-1 BR-03 / BR-04 (BL-348) — one sequence per ASN, and the Surat Jalan
  // number as the External ID. Derived from the ASN number so a new row cannot
  // collide with its neighbour by a hand-typed literal.
  sequence: String(Number(asnNumber.slice(-2))),
  externalId: `SJ-${asnNumber}`,
  callOffId: c.id,
  callOffFinal: true,
  status,
  carrier: 'Own truck (walkthrough sample)',
  trackingNumber: `TRK-${asnNumber.slice(-5)}`,
  shipDate: day(shipOffset),
  eta: day(etaOffset),
  details: {
    originCity: 'Bekasi, ID',
    destinationWarehouse: 'Paragon Plant J6',
    totalCartons: Math.ceil(c.quantity / SSTP_FIGURES.koli),
    grossWeightKg: Math.round(c.quantity * 0.03),
    temperatureRequirement: 'Ambient'
  },
  lineItems: [
    {
      materialCode: SSTP.materialCode,
      description: SSTP.label,
      orderedQty: c.quantity,
      shippedQty: c.quantity,
      lotNumber: lot,
      uom: SSTP.uom
    }
  ]
});

/** The ASNs: the past call-off delivered, the open one in transit. */
/** @type {readonly ASN[]} */
export const SSTP_ASNS = [
  asn('ASN-2026-01910', SSTP_CALL_OFFS[0], 'Delivered', -6, -5, 'SSTP-2608A'),
  asn('ASN-2026-01911', SSTP_CALL_OFFS[1], 'In Transit', 0, 7, 'SSTP-2608B')
];

/** The goods receipt of the past call-off, posted and accepted in full on its date. */
/** @type {readonly GoodsReceipt[]} */
export const SSTP_GOODS_RECEIPTS = [
  {
    id: 'gr-1910',
    grNumber: 'GR-2026-1910',
    asnId: SSTP_ASNS[0].asnNumber,
    asnNumber: SSTP_ASNS[0].asnNumber,
    poNumber: SSTP_PURCHASE_ORDER.poNumber,
    supplierId: SSTP.supplierId,
    supplierName: SSTP.supplierName,
    receivedDate: day(-5),
    receivedBy: 'Warehouse Supervisor',
    status: 'Posted to SAP',
    inspectionResults: [
      {
        materialCode: SSTP.materialCode,
        description: SSTP.label,
        qtyExpected: SSTP_FIGURES.pastCallOff,
        qtyReceived: SSTP_FIGURES.pastCallOff,
        qtyAccepted: SSTP_FIGURES.pastCallOff,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass'
      }
    ],
    disposition: 'Accept',
    sapMaterialDoc: 'MAT-DOC-5019100',
    notes: 'E2E walkthrough sample: call-off CO-2026-0047 received in full.'
  }
];
