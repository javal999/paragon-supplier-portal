// ────────────────────────────────────────────────────────────────────────────
// Material E1 — the supplier stock simulation (MR-7 BR-01 to BR-09, AC-01 to
// AC-05, edge cases 1 to 6), on hand-built inputs so every figure is traceable.
// The world below IS requirements section 9g: supplier updated Thursday
// 2026-10-01 (t0), check date Tuesday 2026-10-06.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import type { ASN, CallOff, CapacitySubmission, SimulationOverride } from '../data/types';
import type { IncomingShipment, InventoryDeclaration, SupplierMaterialRelationship } from '../sdc/types';
import { NO_PERSON } from '../../context/noPerson';
import {
  isSimulationRefusal,
  simulateSupplierStock,
  simulationOverrideRefusal,
  SIMULATION_WEEKS,
  type SimulationQuery,
  type SimulationWorld,
  type StockSimulation,
} from './simulateSupplierStock';

const SUP = 'sup-X';
const MAT = 'RM-A';
const MAT2 = 'RM-B';
const GROUP = 'pg-TEST';
const PROV = { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' } as const;

const decl = (over: Partial<InventoryDeclaration> = {}): InventoryDeclaration => ({
  id: 'inv-0100',
  supplierId: SUP,
  materialCode: MAT,
  declaredAt: '2026-10-01T02:00:00.000Z',
  totalQty: 5000,
  uom: 'KG',
  inProductionQty: 3000,
  productionCompletionDate: '2026-10-05',
  provenance: PROV,
  ...over,
});

const asn = (over: Partial<ASN> = {}): ASN =>
  ({
    asnNumber: 'ASN-1',
    supplierId: SUP,
    poReference: 'PO-1',
    status: 'In Transit',
    carrier: 'x',
    trackingNumber: 't',
    eta: '2026-10-07',
    shipDate: '2026-10-03',
    details: { originCity: '', destinationWarehouse: '', totalCartons: 0, grossWeightKg: 0, temperatureRequirement: '' },
    lineItems: [{ materialCode: MAT, description: '', orderedQty: 1200, shippedQty: 1200, lotNumber: 'L1' }],
    ...over,
  }) as ASN;

const leg = (over: Partial<IncomingShipment> = {}): IncomingShipment => ({
  id: 'ish-1',
  supplierId: SUP,
  materialCode: MAT,
  direction: 'principal-to-distributor',
  lifecycle: 'Shipped',
  qty: 2000,
  uom: 'KG',
  eta: '2026-10-05',
  provenance: PROV,
  ...over,
});

const callOff = (over: Partial<CallOff> = {}): CallOff =>
  ({
    id: 'co-1',
    callOffNumber: 'CO-1',
    supplierId: SUP,
    materialCode: MAT,
    quantity: 3000,
    needDate: '2026-10-10',
    status: 'Confirmed',
    confirmation: {
      kind: 'confirm',
      deliveries: [{ quantity: 3000, date: '2026-10-10' }],
      confirmedAt: '2026-09-30T02:00:00.000Z',
      approval: 'auto',
    },
    dispatches: [],
    notes: [],
    ...over,
  }) as CallOff;

const capacity = (allocated: number, week = '2026-10-05'): CapacitySubmission => ({
  id: 'cap-1',
  supplierId: SUP,
  planningGroupId: GROUP,
  submittedAt: '2026-09-28T02:00:00.000Z',
  weeks: [{ week, allocated, upside: 99_999 }],
});

const DISTRIBUTOR: SupplierMaterialRelationship = {
  supplierId: SUP,
  materialCode: MAT,
  supplierType: 'distributor',
  principals: [{ principalId: 'P-1', principalLeadTimeDays: 45 }],
};

/** Section 9g, as stored inputs. */
const world = (over: Partial<SimulationWorld> = {}): SimulationWorld => ({
  nowIso: '2026-10-06T03:00:00.000Z',
  declarations: [decl()],
  asns: [asn()],
  shipments: [leg()],
  callOffViews: [{ callOff: callOff(), delivery: 'notDue' }],
  capacitySubmissions: [capacity(2500)],
  planningGroupOf: (code) => (code === MAT || code === MAT2 ? GROUP : null),
  relationships: [DISTRIBUTOR],
  ...over,
});

const q = (over: Partial<SimulationQuery> = {}): SimulationQuery => ({
  supplierId: SUP,
  materialCode: MAT,
  checkDate: '2026-10-06',
  overrides: [],
  ...over,
});

const run = (query: SimulationQuery = q(), w: SimulationWorld = world()): StockSimulation => {
  const r = simulateSupplierStock(query, w);
  if (isSimulationRefusal(r)) throw new Error(`refused: ${r.refusal}`);
  return r;
};

const override = (over: Partial<SimulationOverride>): SimulationOverride => ({
  id: 'sim-0001',
  supplierId: SUP,
  materialCode: MAT,
  field: 'soh',
  value: 6000,
  enteredBy: NO_PERSON,
  enteredAt: '2026-10-02T03:00:00.000Z',
  ...over,
});

const flagCodes = (r: StockSimulation) => r.flags.map((f) => f.code);

describe('MR-7 AC-01 — the section 9g worked example reproduces exactly', () => {
  it('available 8,300, already called off not shipped 3,000, free to call off 5,300, PTI inbound 1,200', () => {
    const r = run();
    expect(r.t0).toBe('2026-10-01T02:00:00.000Z');
    expect(r.available).toBe(8300);
    expect(r.calledOffNotShipped).toBe(3000);
    expect(r.freeToCallOff).toBe(5300);
    expect(r.ptiInbound).toBe(1200);
    expect(r.cappedByCapacity).toBe(true);
    expect(r.basis).toBe('supplier');
    // Each line of the 9g table, by component.
    const line = (kind: string) => r.components.filter((c) => c.kind === kind).map((c) => [c.qty, c.date, c.reference]);
    expect(line('soh')).toEqual([[5000, '2026-10-01', 'inv-0100']]);
    expect(line('asnShipped')).toEqual([[-1200, '2026-10-03', 'ASN-1']]);
    expect(line('toDistributor')).toEqual([[2000, '2026-10-05', 'ish-1']]);
    expect(line('inProduction')).toEqual([[2500, '2026-10-05', 'inv-0100']]);
    expect(r.components.find((c) => c.kind === 'inProduction')?.uncappedQty).toBe(3000);
    expect(line('ptiInbound')).toEqual([[1200, '2026-10-07', 'ASN-1']]);
    expect(line('calledOffNotShipped')).toEqual([[3000, null, 'CO-1']]);
    expect(r.flags).toContainEqual({ code: 'cappedByCapacity', week: '2026-10-05' });
  });

  it('9g row "in production, completes 2026-10-09 (after d)": not counted at the check date, counted by the week it completes', () => {
    // A stock record holds one in-production quantity, so the 10-09 row is its own record here.
    const w = world({ declarations: [decl({ productionCompletionDate: '2026-10-09' })], capacitySubmissions: [capacity(5000)] });
    const r = run(q(), w);
    expect(r.available).toBe(5000 - 1200 + 2000);
    expect(r.components.some((c) => c.kind === 'inProduction')).toBe(false);
    expect(r.weekly[0].weekStart).toBe('2026-10-05');
    expect(r.weekly[0].weekEnd).toBe('2026-10-11');
    expect(r.weekly[0].available).toBe(5000 - 1200 + 2000 + 3000);
    // Events inside the week: the 10-03 ASN fell in the week before.
    expect(r.weekly[0].events.map((e) => [e.kind, e.date])).toEqual([
      ['toDistributor', '2026-10-05'],
      ['inProduction', '2026-10-09'],
    ]);
  });

  it('the weekly series has 13 weeks from the week of the check date, each with the 2 figures kept apart', () => {
    const r = run();
    expect(r.weekly).toHaveLength(SIMULATION_WEEKS);
    expect(r.weekly[0].available).toBe(8300);
    expect(r.weekly[0].freeToCallOff).toBe(5300);
    // The in-transit ASN (ETA 10-07) has arrived by the end of the week (10-11).
    expect(r.weekly[0].ptiInbound).toBe(0);
    expect(r.weekly[12].weekStart).toBe('2026-12-28');
  });
});

describe('MR-7 AC-02 / BR-02 — supplier available stock and PTI inbound are separate, never summed', () => {
  it('each component belongs to exactly one figure, and available never includes PTI inbound', () => {
    const r = run();
    const sum = (fig: string) => r.components.filter((c) => c.figure === fig).reduce((s, c) => s + c.qty, 0);
    expect(sum('available')).toBe(r.available);
    expect(sum('ptiInbound')).toBe(r.ptiInbound);
    expect(Object.values(r)).not.toContain(8300 + 1200);
  });

  it('the in-transit ASN arriving changes PTI inbound only', () => {
    const r = run(q(), world({ asns: [asn({ status: 'Delivered' })] }));
    expect(r.ptiInbound).toBe(0);
    expect(r.available).toBe(8300);
  });
});

describe('MR-7 AC-03 / BR-08 — a planner input applies, then disappears after the next stock record', () => {
  it('a planner SOH replaces the record’s SOH for the simulation, marked with who and when', () => {
    const o = override({});
    const r = run(q({ overrides: [o] }));
    expect(r.available).toBe(9300);
    expect(r.basis).toBe('plannerInput');
    expect(r.components.find((c) => c.kind === 'soh')?.plannerInput).toEqual({
      overrideId: 'sim-0001',
      enteredBy: NO_PERSON,
      enteredAt: '2026-10-02T03:00:00.000Z',
    });
  });

  it('the supplier’s next stock record ends it (and the record itself is untouched)', () => {
    const o = override({});
    const newer = decl({ id: 'inv-0200', declaredAt: '2026-10-05T02:00:00.000Z', totalQty: 4000, inProductionQty: 0 });
    const w = world({ declarations: [decl(), newer] });
    const r = run(q({ overrides: [o] }), w);
    expect(r.t0).toBe('2026-10-05T02:00:00.000Z');
    expect(r.basis).toBe('supplier');
    expect(r.components.find((c) => c.kind === 'soh')).toMatchObject({ qty: 4000, reference: 'inv-0200' });
    expect(w.declarations[0].totalQty).toBe(5000);
  });

  it('BR-06 — no stock record: "Cannot simulate", available null; a planner SOH lets it run', () => {
    const none = run(q(), world({ declarations: [] }));
    expect(none.available).toBeNull();
    expect(none.freeToCallOff).toBeNull();
    expect(flagCodes(none)).toContain('noStockUpdate');
    expect(none.ptiInbound).toBe(1200);
    const withInput = run(q({ overrides: [override({ value: 1000, enteredAt: '2026-10-02T03:00:00.000Z' })] }), world({ declarations: [] }));
    expect(withInput.available).toBe(1000 - 1200 + 2000);
    expect(withInput.basis).toBe('plannerInput');
    expect(flagCodes(withInput)).toContain('noStockUpdate');
  });

  it('a planner in-production input replaces the record’s in-production quantity and date', () => {
    const o = override({ field: 'inProduction', value: 1000, date: '2026-10-06' });
    const r = run(q({ overrides: [o] }));
    expect(r.available).toBe(5000 - 1200 + 2000 + 1000);
    expect(r.components.find((c) => c.kind === 'inProduction')?.plannerInput?.overrideId).toBe('sim-0001');
  });
});

describe('MR-7 AC-04 / BR-04 — in-production above allocated capacity is scaled pro rata per planning group and week', () => {
  const two = world({
    declarations: [decl(), decl({ id: 'inv-0101', materialCode: MAT2, totalQty: 0, inProductionQty: 1000, productionCompletionDate: '2026-10-06' })],
    capacitySubmissions: [capacity(2000)],
  });

  it('3,000 + 1,000 against 2,000 allocated counts 1,500 and 500, and says so', () => {
    const a = run(q(), two);
    const b = run(q({ materialCode: MAT2 }), two);
    expect(a.components.find((c) => c.kind === 'inProduction')).toMatchObject({ qty: 1500, uncappedQty: 3000 });
    expect(b.components.find((c) => c.kind === 'inProduction')).toMatchObject({ qty: 500, uncappedQty: 1000 });
    expect(a.cappedByCapacity).toBe(true);
    expect(b.flags).toContainEqual({ code: 'cappedByCapacity', week: '2026-10-05' });
  });

  it('uses allocated capacity only, not upside (MAT-D11); within allocation nothing is capped', () => {
    const r = run(q(), world({ capacitySubmissions: [capacity(3000)] }));
    expect(r.cappedByCapacity).toBe(false);
    expect(r.available).toBe(8800);
    expect(flagCodes(r)).not.toContain('cappedByCapacity');
  });

  it('edge case 5 — no capacity confirmed for the week: no cap, flagged "No capacity confirmed"', () => {
    const r = run(q(), world({ capacitySubmissions: [capacity(2500, '2026-10-12')] }));
    expect(r.available).toBe(8800);
    expect(r.flags).toContainEqual({ code: 'noCapacityConfirmed', week: '2026-10-05' });
  });
});

describe('MR-7 AC-05 / BR-05 — a missing ETA falls back to ETD + principal lead time', () => {
  it('ETD 2026-08-20 + 45 days = 2026-10-04, counted, and the basis says so', () => {
    const r = run(q(), world({ shipments: [leg({ eta: undefined, etd: '2026-08-20' })] }));
    expect(r.components.find((c) => c.kind === 'toDistributor')).toMatchObject({ date: '2026-10-04', etaBasis: 'etdPlusLeadTime', qty: 2000 });
    expect(r.available).toBe(8300);
  });

  it('with the leg’s own ETA the basis is "eta"', () => {
    expect(run().components.find((c) => c.kind === 'toDistributor')?.etaBasis).toBe('eta');
  });

  it('no ETA and no ETD: "Missing", not counted; a planner to-distributor input fills it', () => {
    const w = world({ shipments: [leg({ eta: undefined })] });
    const missing = run(q(), w);
    expect(missing.flags).toContainEqual({ code: 'etaMissing', reference: 'ish-1' });
    expect(missing.available).toBe(6300);
    const filled = run(q({ overrides: [override({ field: 'toDistributor', value: 2000, date: '2026-10-05' })] }), w);
    expect(filled.available).toBe(8300);
    expect(filled.components.find((c) => c.kind === 'toDistributor')?.etaBasis).toBe('plannerInput');
    expect(filled.basis).toBe('plannerInput');
  });
});

describe('MR-7 edge cases and BR-09 — each produces its named flag', () => {
  it('edge case 1 — an ASN with no ship date uses its submitted date', () => {
    const w = world({ asns: [asn({ shipDate: undefined })], asnSubmittedOn: () => '2026-10-03T05:00:00.000Z' });
    const r = run(q(), w);
    expect(r.flags).toContainEqual({ code: 'asnShipDateMissing', reference: 'ASN-1', date: '2026-10-03' });
    expect(r.available).toBe(8300);
    // Not known either: flagged without a date, and not subtracted.
    const unknown = run(q(), world({ asns: [asn({ shipDate: undefined })] }));
    expect(unknown.flags).toContainEqual({ code: 'asnShipDateMissing', reference: 'ASN-1' });
    expect(unknown.available).toBe(9500);
  });

  it('edge case 2 — a completion date already past but after t0 counts as finished', () => {
    const r = run(q({ checkDate: '2026-10-08' }), world({ nowIso: '2026-10-08T03:00:00.000Z' }));
    expect(r.flags).toContainEqual({ code: 'productionDatePassed', date: '2026-10-05' });
    expect(r.components.some((c) => c.kind === 'inProduction')).toBe(true);
    // Planned on 10-04 for 10-06: the completion is still ahead, so no flag.
    expect(flagCodes(run(q(), world({ nowIso: '2026-10-04T03:00:00.000Z' })))).not.toContain('productionDatePassed');
  });

  it('edge case 3 — a completion date before t0 is ignored: "Production date before last update"', () => {
    const r = run(q(), world({ declarations: [decl({ productionCompletionDate: '2026-09-29' })] }));
    expect(r.flags).toContainEqual({ code: 'productionBeforeLastUpdate', date: '2026-09-29', reference: 'inv-0100' });
    expect(r.available).toBe(5800);
  });

  it('an in-production quantity with no completion date is "Missing" and not counted', () => {
    const r = run(q(), world({ declarations: [decl({ productionCompletionDate: undefined })] }));
    expect(r.flags).toContainEqual({ code: 'productionDateMissing', reference: 'inv-0100' });
    expect(r.available).toBe(5800);
  });

  it('edge case 4 — a cancelled to-distributor leg is not counted', () => {
    const r = run(q(), world({ shipments: [leg({ lifecycle: 'Cancelled' })] }));
    expect(r.flags).toContainEqual({ code: 'toDistributorCancelled', reference: 'ish-1' });
    expect(r.available).toBe(6300);
  });

  it('edge case 6 — a check date before t0 is refused; t0’s own day is allowed', () => {
    expect(simulateSupplierStock(q({ checkDate: '2026-09-30' }), world())).toEqual({
      refusal: 'CHECK_DATE_BEFORE_LAST_UPDATE',
      t0: '2026-10-01T02:00:00.000Z',
    });
    expect(isSimulationRefusal(simulateSupplierStock(q({ checkDate: '2026-10-01' }), world()))).toBe(false);
    expect(simulateSupplierStock(q({ checkDate: '06/10/2026' }), world())).toMatchObject({ refusal: 'INVALID_CHECK_DATE' });
  });

  it('BR-09 — a manufacturer has no to-distributor term', () => {
    const r = run(q(), world({ relationships: [{ supplierId: SUP, materialCode: MAT, supplierType: 'manufacturer' }] }));
    expect(r.components.some((c) => c.kind === 'toDistributor')).toBe(false);
    expect(r.available).toBe(6300);
  });

  it('BR-03 — an ASN shipped on or before t0 is not subtracted', () => {
    const r = run(q(), world({ asns: [asn({ shipDate: '2026-10-01' })] }));
    expect(r.available).toBe(9500);
    expect(r.ptiInbound).toBe(1200);
  });

  it('D2 — an ASN awaiting a shelf-life exception has left the supplier: subtracted, not PTI inbound', () => {
    const r = run(q(), world({ asns: [asn({ status: 'Awaiting exception' })] }));
    expect(r.available).toBe(8300);
    expect(r.ptiInbound).toBe(0);
  });

  it('BR-07 — a confirmed call-off covered by a linked ASN is not "called off, not shipped"', () => {
    const r = run(q(), world({ asns: [asn(), asn({ asnNumber: 'ASN-2', callOffId: 'co-1', shipDate: '2026-10-04', eta: '2026-10-09', lineItems: [{ materialCode: MAT, description: '', orderedQty: 3000, shippedQty: 1000, lotNumber: 'L2' }] })] }));
    expect(r.calledOffNotShipped).toBe(2000);
    expect(r.available).toBe(7300);
    expect(r.freeToCallOff).toBe(5300);
    const unconfirmed = run(q(), world({ callOffViews: [{ callOff: callOff({ status: 'Awaiting Confirmation', confirmation: undefined }), delivery: null }] }));
    expect(unconfirmed.calledOffNotShipped).toBe(0);
  });
});

describe('simulationOverrideRefusal — every refusal fires, and a good input passes', () => {
  const known = { supplierKnown: (id: string) => id === SUP, materialKnown: (c: string) => c === MAT };
  const good = { supplierId: SUP, materialCode: MAT, field: 'inProduction', value: 100, date: '2026-10-09' };
  it.each([
    ['UNKNOWN_SUPPLIER', { supplierId: 'sup-nope' }],
    ['UNKNOWN_MATERIAL', { materialCode: 'RM-NOPE' }],
    ['UNKNOWN_FIELD', { field: 'demand' }],
    ['INVALID_QUANTITY', { value: -1 }],
    ['DATE_REQUIRED', { date: undefined }],
    ['INVALID_DATE', { date: '9 Oct' }],
    ['DATE_NOT_ALLOWED', { field: 'soh' }],
  ])('%s', (code, patch) => {
    expect(simulationOverrideRefusal({ ...good, ...patch }, known)).toBe(code);
  });
  it('passes a good in-production, to-distributor and SOH input', () => {
    expect(simulationOverrideRefusal(good, known)).toBeNull();
    expect(simulationOverrideRefusal({ ...good, field: 'toDistributor' }, known)).toBeNull();
    expect(simulationOverrideRefusal({ supplierId: SUP, materialCode: MAT, field: 'soh', value: 0 }, known)).toBeNull();
  });
});
