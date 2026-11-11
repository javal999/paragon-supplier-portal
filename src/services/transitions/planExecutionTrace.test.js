// PEX-11 (BL-276) — the plan vs execution trace: structure, the three flags, the BR-03 events.
import { describe, expect, it } from 'vitest';
import { buildPlanExecutionTrace, overlappingPos } from './planExecutionTrace';

const S = 'sup-A';
const M = 'RM-X';

/** @param {any} p @returns {any} */
const po = (p) => ({
  poNumber: `PO-${p.id}`,
  supplierId: S,
  status: 'Confirmed',
  orderDate: '2026-11-02',
  requestedDeliveryDate: '2026-11-30',
  confirmedDeliveryDate: '2026-11-30',
  lineItems: [{ id: `${p.id}-1`, materialCode: M, quantity: 100 }],
  ...p
});
/** @param {any} c @returns {any} */
const co = (c) => ({
  callOffNumber: `CO-${c.id}`,
  poId: 'p1',
  poNumber: 'PO-p1',
  supplierId: S,
  materialCode: M,
  quantity: 40,
  needDate: '2026-11-10',
  status: 'Confirmed',
  ...c
});
const base = {
  supplierId: S,
  materialCode: M,
  daRows: [],
  purchaseOrders: [po({ id: 'p1' })],
  callOffs: [],
  asns: [],
  capacityDecisions: [],
  commitmentLines: []
};
// @ts-expect-error hand-built rows
const trace = (o) => buildPlanExecutionTrace({ ...base, ...o });

describe('PEX-11 structure: DA → PO → call-off → ASN', () => {
  it('nests call-offs under their PO and ASNs under their call-off; a PO-level ASN sits on the PO', () => {
    const t = trace({
      callOffs: [co({ id: 'c1' }), co({ id: 'c2', needDate: '2026-11-17' })],
      asns: [
        { asnNumber: 'A1', supplierId: S, callOffId: 'c1', poReference: 'PO-p1' },
        { asnNumber: 'A2', supplierId: S, poReference: 'PO-p1' },
        { asnNumber: 'A3', supplierId: S, callOffId: 'other', poReference: 'PO-p1' }
      ]
    });
    expect(t.pos).toHaveLength(1);
    expect(t.pos[0].callOffs.map((c) => c.callOff.id)).toEqual(['c1', 'c2']);
    expect(t.pos[0].callOffs[0].asns.map((a) => a.asnNumber)).toEqual(['A1']);
    expect(t.pos[0].poLevelAsns.map((a) => a.asnNumber)).toEqual(['A2']);
    expect(t.pos[0].calledOff).toBe(80);
    expect(t.flags).toEqual([]);
  });

  it('reads DA from the publication in force, per week, with its publication id', () => {
    /** @param {any} publicationId @param {any} planningWeek @param {any} inForce @param {any} da */
    const row = (publicationId, planningWeek, inForce, da) => ({
      supplierId: S,
      materialCode: M,
      publicationId,
      planningWeek,
      inForce,
      weeks: [{ week: '2026-11-09', daInForce: da }]
    });
    const t = trace({
      daRows: [row('pub-1', '2026-11-02', false, 10), row('pub-2', '2026-11-09', true, 25)]
    });
    expect(t.weeks.find((w) => w.week === '2026-11-09')).toEqual({
      week: '2026-11-09',
      da: 25,
      publicationId: 'pub-2',
      events: [],
      poLines: []
    });
  });

  it('leaves out other suppliers, materials and POs without a line for the material', () => {
    const t = trace({
      purchaseOrders: [
        po({ id: 'p1' }),
        po({ id: 'p2', supplierId: 'sup-B' }),
        po({ id: 'p3', lineItems: [{ id: 'x', materialCode: 'RM-Y', quantity: 5 }] })
      ],
      callOffs: [
        co({ id: 'c1' }),
        co({ id: 'c2', supplierId: 'sup-B' }),
        co({ id: 'c3', materialCode: 'RM-Y' })
      ]
    });
    expect(t.pos.map((p) => p.po.id)).toEqual(['p1']);
    expect(t.pos[0].callOffs.map((c) => c.callOff.id)).toEqual(['c1']);
  });
});

describe('PEX-11 BR-02 flags', () => {
  it('a live call-off whose PO is not a PO of the pair is flagged noPo; drafts, dismissed and rejected are not', () => {
    const t = trace({
      callOffs: [
        co({ id: 'c1', poId: 'ghost', poNumber: 'PO-ghost' }),
        co({ id: 'c2', poId: '', poNumber: '' }),
        co({ id: 'c3', poId: 'ghost', status: 'Draft' }),
        co({ id: 'c4', poId: 'ghost', status: 'Dismissed' }),
        co({ id: 'c5', poId: 'ghost', status: 'Rejected' })
      ]
    });
    expect(t.flags.filter((f) => f.kind === 'noPo').map((f) => f.callOffNumber)).toEqual([
      'CO-c1',
      'CO-c2'
    ]);
    expect(t.noPoCallOffs.map((c) => c.callOff.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
    // Known-good control: a call-off on its PO raises nothing.
    expect(trace({ callOffs: [co({ id: 'ok' })] }).flags).toEqual([]);
  });

  it('a call-off released after the PO line is filled is poUsedUp; the one that fills it is not', () => {
    const t = trace({
      callOffs: [
        co({ id: 'c1', quantity: 60, needDate: '2026-11-10' }),
        co({ id: 'c2', quantity: 40, needDate: '2026-11-17' }), // fills exactly 100
        co({ id: 'c3', quantity: 10, needDate: '2026-11-24' }) // after used up
      ]
    });
    expect(t.flags).toEqual([{ kind: 'poUsedUp', callOffNumber: 'CO-c3', poNumber: 'PO-p1' }]);
    expect(t.pos[0].callOffs[2].flags).toHaveLength(1);
    expect(t.pos[0].callOffs[1].flags).toEqual([]);
  });

  it('a live call-off on a Delivered or Closed PO is poUsedUp; a rejected one is not live', () => {
    const t = trace({
      purchaseOrders: [po({ id: 'p1', status: 'Closed' })],
      callOffs: [co({ id: 'c1', quantity: 5 }), co({ id: 'c2', status: 'Rejected' })]
    });
    expect(t.flags.map((f) => [f.kind, f.callOffNumber])).toEqual([['poUsedUp', 'CO-c1']]);
  });

  it('a value-limit line (quantity 0) has no quantity to use up', () => {
    const t = trace({
      purchaseOrders: [
        po({ id: 'p1', lineItems: [{ id: 'l', materialCode: M, quantity: 0, valueLimit: 1000 }] })
      ],
      callOffs: [co({ id: 'c1' }), co({ id: 'c2', needDate: '2026-11-17' })]
    });
    expect(t.flags).toEqual([]);
  });

  it('two open POs of the pair with overlapping dates are flagged; closed or disjoint ones are not', () => {
    const a = po({ id: 'a', orderDate: '2026-11-01', confirmedDeliveryDate: '2026-11-20' });
    const b = po({ id: 'b', orderDate: '2026-11-15', confirmedDeliveryDate: '2026-12-10' });
    const c = po({ id: 'c', orderDate: '2026-12-11', confirmedDeliveryDate: '2026-12-30' });
    const closed = po({
      id: 'd',
      status: 'Closed',
      orderDate: '2026-11-05',
      confirmedDeliveryDate: '2026-11-25'
    });
    expect(overlappingPos([a, b, c, closed])).toEqual([
      { poNumber: 'PO-a', otherPoNumber: 'PO-b' }
    ]);
    const t = trace({ purchaseOrders: [a, b, c, closed] });
    expect(t.flags).toEqual([{ kind: 'overlapping', poNumber: 'PO-a', otherPoNumber: 'PO-b' }]);
    expect(/** @type {any} */ (t.pos.find((p) => p.po.id === 'a')).flags).toHaveLength(1);
    expect(/** @type {any} */ (t.pos.find((p) => p.po.id === 'c')).flags).toHaveLength(0);
  });
});

describe('PEX-11 BR-03 events on the week they hit', () => {
  it('rejections, capacity decisions and moved demand land on their weeks', () => {
    const t = trace({
      purchaseOrders: [
        po({ id: 'p1' }),
        po({ id: 'p9', status: 'Rejected', orderDate: '2026-11-04' })
      ],
      callOffs: [
        co({ id: 'c1', status: 'Rejected', needDate: '2026-11-18', rejectionReason: 'No capacity' })
      ],
      capacityDecisions: [
        {
          id: 'capd-1',
          supplierId: S,
          planningGroupId: 'pg-MG-02',
          week: '2026-11-16',
          decision: 'accepted'
        },
        {
          id: 'capd-2',
          supplierId: S,
          planningGroupId: 'pg-MG-99',
          week: '2026-11-16',
          decision: 'accepted'
        },
        {
          id: 'capd-3',
          supplierId: 'sup-B',
          planningGroupId: 'pg-MG-02',
          week: '2026-11-16',
          decision: 'accepted'
        }
      ],
      commitmentLines: [
        {
          supplierId: S,
          materialCode: M,
          materialGroup: 'MG-02',
          periodStart: '2026-11-25',
          moves: [{ toSupplierName: 'Sup B', qty: 30 }]
        }
      ]
    });
    const by = Object.fromEntries(
      t.weeks.map((w) => [w.week, w.events.map((e) => [e.kind, e.ref, e.detail])])
    );
    expect(by['2026-11-02']).toEqual([['poRejected', 'PO-p9', null]]);
    expect(by['2026-11-16']).toContainEqual(['callOffRejected', 'CO-c1', 'No capacity']);
    expect(by['2026-11-16']).toContainEqual(['capacityDecision', 'capd-1', 'accepted']);
    expect(by['2026-11-16']).not.toContainEqual(['capacityDecision', 'capd-2', 'accepted']);
    expect(by['2026-11-16']).toHaveLength(2);
    expect(by['2026-11-23']).toEqual([['demandMoved', 'Sup B', '30']]);
  });
});

describe('PEX-11 BR-04 [Proposed]: a PO back into DA, read only', () => {
  const da = (/** @type {string} */ week) => ({
    supplierId: S,
    materialCode: M,
    publicationId: 'pub-1',
    planningWeek: '2026-11-02',
    inForce: true,
    weeks: [{ week, daInForce: 25 }]
  });

  it('joins a PO line to the DA week of its delivery date on PO number + item + schedule line', () => {
    const t = trace({ daRows: [da('2026-11-30')] });
    const w = t.weeks.find((x) => x.week === '2026-11-30');
    expect(w?.da).toBe(25);
    expect(w?.poLines).toEqual([
      {
        key: 'PO-p1/p1-1/0001',
        poNumber: 'PO-p1',
        item: 'p1-1',
        scheduleLine: '0001',
        quantity: 100,
        uom: undefined,
        status: 'Confirmed'
      }
    ]);
  });

  it('shows a PO week that has no DA, with da null', () => {
    const t = trace({ daRows: [da('2026-11-09')] });
    expect(t.weeks.map((w) => [w.week, w.da, w.poLines.length])).toEqual([
      ['2026-11-09', 25, 0],
      ['2026-11-30', null, 1]
    ]);
  });

  it('does not land a rejected PO, uses the requested date without a confirmed one, and does not mutate its input', () => {
    const pos = [
      po({ id: 'p2', status: 'Rejected' }),
      po({ id: 'p3', confirmedDeliveryDate: '', requestedDeliveryDate: '2026-12-08' })
    ];
    const frozen = JSON.stringify(pos);
    const t = trace({ purchaseOrders: pos });
    expect(t.weeks.map((w) => [w.week, w.poLines.map((l) => l.poNumber)])).toContainEqual([
      '2026-12-07',
      ['PO-p3']
    ]);
    expect(t.weeks.flatMap((w) => w.poLines.map((l) => l.poNumber))).not.toContain('PO-p2');
    expect(JSON.stringify(pos)).toBe(frozen);
  });
});
