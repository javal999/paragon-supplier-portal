// ────────────────────────────────────────────────────────────────────────────
// Material E2 · THE STOCK SIMULATION SAMPLE ROW — requirements MR-7 section 9g
// (the worked example), as SAMPLE inputs. NOT SUPPLIER DATA.
//
// No supplier × material in the seed reproduces the worked example, so the
// simulation page shows it as one clearly labelled sample row. These inputs
// are read ONLY by the simulation read model, for this one row, on a world of
// their own: no other page and no other row sees them, and they are never
// written to a store.
//
// The dates are section 9g's moved back 5 weeks (35 days, so every weekday and
// every capacity week stays the same) to sit before the hub's clock:
//
//   9g                      here
//   t0  Thu 2026-10-01  →   Thu 2026-08-27   SOH 5,000; in production 3,000
//   ASN shipped 10-03   →   2026-08-29       − 1,200 (In Transit, ETA 09-02)
//   to distributor 10-05 →  2026-08-31       + 2,000
//   production 10-05    →   2026-08-31       + 2,500 (3,000 capped at the week's allocated 2,500)
//   check date Tue 10-06 →  Tue 2026-09-01
//
// So on the hub's today (2026-08-31) and on 2026-09-01 the row reads: supplier
// available 8,300 · already called off, not shipped 3,000 · free to call off
// 5,300 · PTI inbound 1,200.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ASN, CallOff, CapacitySubmission } from '../../types' */
/** @import { IncomingShipment, InventoryDeclaration, SupplierMaterialRelationship } from '../../../sdc/types' */

/** A real supplier and material, so a planner input on the sample row passes the verb's checks. */
export const SIMULATION_SAMPLE_SUPPLIER = 'sup-004';
export const SIMULATION_SAMPLE_MATERIAL = 'FR-WARD-4410';

/** The sample's own check date, the 9g Tuesday moved back 5 weeks. */
export const SIMULATION_SAMPLE_CHECK_DATE = '2026-09-01';

const PROV = /** @type {const} */ ({
  source: 'SUPPLIER',
  liveness: 'SIMULATED',
  planState: 'committed'
});
const S = SIMULATION_SAMPLE_SUPPLIER;
const M = SIMULATION_SAMPLE_MATERIAL;

/** @type {InventoryDeclaration} */
export const SAMPLE_DECLARATION = {
  id: 'inv-sample-9g',
  supplierId: S,
  materialCode: M,
  declaredAt: '2026-08-27T02:00:00.000Z',
  totalQty: 5000,
  uom: 'KG',
  inProductionQty: 3000,
  productionCompletionDate: '2026-08-31',
  provenance: PROV
};

/** @type {ASN} */
export const SAMPLE_ASN = {
  asnNumber: 'ASN-SAMPLE-9G',
  supplierId: S,
  poReference: 'PO-SAMPLE-9G',
  status: 'In Transit',
  carrier: 'Sample carrier',
  trackingNumber: 'SAMPLE-9G',
  eta: '2026-09-02',
  shipDate: '2026-08-29',
  details: {
    originCity: '',
    destinationWarehouse: '',
    totalCartons: 0,
    grossWeightKg: 0,
    temperatureRequirement: ''
  },
  lineItems: [
    { materialCode: M, description: '', orderedQty: 1200, shippedQty: 1200, lotNumber: 'SAMPLE-9G' }
  ]
};

/** @type {IncomingShipment} */
export const SAMPLE_TO_DISTRIBUTOR = {
  id: 'ish-sample-9g',
  supplierId: S,
  materialCode: M,
  direction: 'principal-to-distributor',
  lifecycle: 'Shipped',
  qty: 2000,
  uom: 'KG',
  eta: '2026-08-31',
  provenance: PROV
};

/** @type {CallOff} */
export const SAMPLE_CALL_OFF = {
  id: 'co-sample-9g',
  callOffNumber: 'CO-SAMPLE-9G',
  poId: 'po-sample-9g',
  poNumber: 'PO-SAMPLE-9G',
  poLineId: 'pol-sample-9g',
  supplierId: S,
  supplierName: '',
  materialCode: M,
  description: '',
  uom: 'KG',
  unitPrice: 0,
  currency: 'IDR',
  quantity: 3000,
  needDate: '2026-09-05',
  type: 'forecast',
  status: 'Confirmed',
  confirmation: {
    kind: 'confirm',
    deliveries: [{ quantity: 3000, date: '2026-09-05' }],
    confirmedAt: '2026-08-26T02:00:00.000Z',
    approval: 'auto'
  },
  dispatches: [],
  notes: []
};

/**
 * The week's allocated capacity for the material's planning group (resolved at read).
 * @param {string} planningGroupId
 * @returns {CapacitySubmission}
 */
export const sampleCapacity = (planningGroupId) => ({
  id: 'cap-sample-9g',
  supplierId: S,
  planningGroupId,
  submittedAt: '2026-08-24T02:00:00.000Z',
  weeks: [{ week: '2026-08-31', allocated: 2500, upside: 2500 }]
});

/**
 * MR-7 BR-09 — a distributor, so the to-distributor term applies.
 * @type {SupplierMaterialRelationship}
 */
export const SAMPLE_RELATIONSHIP = {
  supplierId: S,
  materialCode: M,
  supplierType: 'distributor',
  principals: [{ principalId: 'PRIN-SAMPLE-9G', principalLeadTimeDays: 45 }]
};

// ────────────────────────────────────────────────────────────────────────────
// THE WALKTHROUGH CASES 2 AND 3 — the owner's walkthrough page, as SAMPLE
// inputs. NOT SUPPLIER DATA. Same rules as the row above: read only by the
// simulation read model, each on a world of its own, never written to a store.
//
// ⚠️ THE PAIRS ARE NOT THE WALKTHROUGH'S. The walkthrough names sup-002 ×
// RM-EMUL-9410 and sup-007 × PK-PETB-8802, and both are REAL rows on the
// simulation page (seeded stock records). A planner input is keyed by
// supplier × material, so on those pairs an input on the sample row would
// also land on the real row. Each case therefore uses a pair of the same
// supplier and unit with no real row: sup-002 × RM-EMUL-9430 (KG, same
// planning group as RM-EMUL-9410) and sup-007 × PK-PETB-8803 (PCS, 100 ml,
// same planning group as PK-PETB-8802). The read model reserves both pairs
// for their sample row.
//
// Case 2 — the supplier cannot cover what is already called off. A
// manufacturer. On 2026-09-01: available 1,700 · already called off, not
// shipped 2,500 · free to call off −800 · PTI inbound 1,500.
//
// Case 3 — missing data, filled by the planner. The supplier missed Thu 27
// Aug, so the latest record is Thu 20 Aug, and its in-production quantity has
// no completion date. On 2026-09-01: available 7,000 · not shipped 10,000 ·
// free −3,000 · PTI inbound 15,000, flagged "production date missing". With a
// planner input of 40,000 completing 2026-08-31: available 37,000 (30,000
// counted, capped by the week's allocated capacity) · free 27,000.
// ────────────────────────────────────────────────────────────────────────────

/**
 * One labelled sample row and its own inputs.
 * `sampleCase`: 1 is the requirements worked example; 2 and 3 are the walkthrough cases.
 * `capacity`: The week's allocated capacity for the material's planning group (resolved at read).
 *
 * @typedef {{
 *   readonly sampleCase: 1 | 2 | 3;
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly declarations: readonly InventoryDeclaration[];
 *   readonly asns: readonly ASN[];
 *   readonly shipments: readonly IncomingShipment[];
 *   readonly callOffs: readonly CallOff[];
 *   readonly capacity: (planningGroupId: string) => readonly CapacitySubmission[];
 *   readonly relationships: readonly SupplierMaterialRelationship[];
 * }} SimulationSample
 */

/**
 * @param {{ id: string; supplierId: string; materialCode: string; uom: string; quantity: number; needDate: string }} c
 * @returns {CallOff}
 */
const sampleCallOff = ({ id, supplierId, materialCode, uom, quantity, needDate }) => ({
  id: `co-sample-${id}`,
  callOffNumber: `CO-SAMPLE-${id.toUpperCase()}`,
  poId: `po-sample-${id}`,
  poNumber: `PO-SAMPLE-${id.toUpperCase()}`,
  poLineId: `pol-sample-${id}`,
  supplierId,
  supplierName: '',
  materialCode,
  description: '',
  uom,
  unitPrice: 0,
  currency: 'IDR',
  quantity,
  needDate,
  type: 'forecast',
  status: 'Confirmed',
  confirmation: {
    kind: 'confirm',
    deliveries: [{ quantity, date: needDate }],
    confirmedAt: '2026-08-24T02:00:00.000Z',
    approval: 'auto'
  },
  dispatches: [],
  notes: []
});

/**
 * @param {{ id: string; supplierId: string; materialCode: string; qty: number; shipDate: string; eta: string; callOffId: string }} a
 * @returns {ASN}
 */
const sampleAsn = ({ id, supplierId, materialCode, qty, shipDate, eta, callOffId }) => ({
  asnNumber: `ASN-SAMPLE-${id.toUpperCase()}`,
  supplierId,
  poReference: `PO-SAMPLE-${id.toUpperCase()}`,
  callOffId,
  status: 'In Transit',
  carrier: 'Sample carrier',
  trackingNumber: `SAMPLE-${id.toUpperCase()}`,
  eta,
  shipDate,
  details: {
    originCity: '',
    destinationWarehouse: '',
    totalCartons: 0,
    grossWeightKg: 0,
    temperatureRequirement: ''
  },
  lineItems: [
    {
      materialCode,
      description: '',
      orderedQty: qty,
      shippedQty: qty,
      lotNumber: `SAMPLE-${id.toUpperCase()}`
    }
  ]
});

/** Case 2 — sup-002, a manufacturer, KG (walkthrough pair: sup-002 × RM-EMUL-9410). */
export const SIMULATION_SAMPLE_CASE2_SUPPLIER = 'sup-002';
export const SIMULATION_SAMPLE_CASE2_MATERIAL = 'RM-EMUL-9430';
const C2S = SIMULATION_SAMPLE_CASE2_SUPPLIER;
const C2M = SIMULATION_SAMPLE_CASE2_MATERIAL;
const C2_SHIPPED = sampleCallOff({
  id: 'wt2a',
  supplierId: C2S,
  materialCode: C2M,
  uom: 'KG',
  quantity: 1500,
  needDate: '2026-09-03'
});
const C2_OPEN = sampleCallOff({
  id: 'wt2b',
  supplierId: C2S,
  materialCode: C2M,
  uom: 'KG',
  quantity: 2500,
  needDate: '2026-09-10'
});

/** Case 3 — sup-007, PCS (walkthrough pair: sup-007 × PK-PETB-8802). */
export const SIMULATION_SAMPLE_CASE3_SUPPLIER = 'sup-007';
export const SIMULATION_SAMPLE_CASE3_MATERIAL = 'PK-PETB-8803';
const C3S = SIMULATION_SAMPLE_CASE3_SUPPLIER;
const C3M = SIMULATION_SAMPLE_CASE3_MATERIAL;
const C3_SHIPPED = sampleCallOff({
  id: 'wt3a',
  supplierId: C3S,
  materialCode: C3M,
  uom: 'PCS',
  quantity: 15000,
  needDate: '2026-09-02'
});
const C3_OPEN = sampleCallOff({
  id: 'wt3b',
  supplierId: C3S,
  materialCode: C3M,
  uom: 'PCS',
  quantity: 10000,
  needDate: '2026-09-09'
});

/**
 * The three sample rows, in the order the page lists them.
 * @type {readonly SimulationSample[]}
 */
export const SIMULATION_SAMPLES = [
  {
    sampleCase: 1,
    supplierId: S,
    materialCode: M,
    declarations: [SAMPLE_DECLARATION],
    asns: [SAMPLE_ASN],
    shipments: [SAMPLE_TO_DISTRIBUTOR],
    callOffs: [SAMPLE_CALL_OFF],
    capacity: (group) => [sampleCapacity(group)],
    relationships: [SAMPLE_RELATIONSHIP]
  },
  {
    sampleCase: 2,
    supplierId: C2S,
    materialCode: C2M,
    declarations: [
      {
        id: 'inv-sample-wt2',
        supplierId: C2S,
        materialCode: C2M,
        declaredAt: '2026-08-27T02:00:00.000Z',
        totalQty: 3200,
        uom: 'KG',
        inProductionQty: 0,
        provenance: PROV
      }
    ],
    asns: [
      sampleAsn({
        id: 'wt2',
        supplierId: C2S,
        materialCode: C2M,
        qty: 1500,
        shipDate: '2026-08-28',
        eta: '2026-09-03',
        callOffId: C2_SHIPPED.id
      })
    ],
    shipments: [],
    callOffs: [C2_SHIPPED, C2_OPEN],
    capacity: () => [],
    relationships: [{ supplierId: C2S, materialCode: C2M, supplierType: 'manufacturer' }]
  },
  {
    sampleCase: 3,
    supplierId: C3S,
    materialCode: C3M,
    declarations: [
      {
        // An old record from before the completion date was required.
        id: 'inv-sample-wt3',
        supplierId: C3S,
        materialCode: C3M,
        declaredAt: '2026-08-20T02:00:00.000Z',
        totalQty: 22000,
        uom: 'PCS',
        inProductionQty: 40000,
        provenance: PROV
      }
    ],
    asns: [
      sampleAsn({
        id: 'wt3',
        supplierId: C3S,
        materialCode: C3M,
        qty: 15000,
        shipDate: '2026-08-26',
        eta: '2026-09-02',
        callOffId: C3_SHIPPED.id
      })
    ],
    shipments: [],
    callOffs: [C3_SHIPPED, C3_OPEN],
    capacity: (group) => [
      {
        id: 'cap-sample-wt3',
        supplierId: C3S,
        planningGroupId: group,
        submittedAt: '2026-08-24T02:00:00.000Z',
        weeks: [{ week: '2026-08-31', allocated: 30000 }]
      }
    ],
    relationships: [{ supplierId: C3S, materialCode: C3M, supplierType: 'manufacturer' }]
  }
];
