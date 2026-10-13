// ─────────────────────────────────────────────────────────────────────────────
// CAP-12 (BL-181) — the pure rules: open supply from released call-offs by the
// week of their need date, the gap against the demand anticipation in force
// (`qty`), and the proposal (oldest blanket line first, spill to the next,
// then "New PO needed"). AC-01 to AC-03 with the brief's own numbers.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
/** @import { CallOff, CallOffStatus, POLineItem, PurchaseOrder } from '../data/types' */
/** @import { DemandAnticipationRow, DemandAnticipationWeekView } from './demandAnticipationRules' */
import { POStatus } from '../data/types';
import {
  blanketBalances,
  openSupplyIndex,
  proposeForGaps,
  supplyGap,
  supplyGapRows,
  withOpenSupply
} from './supplyBelowDemandRules';

// Weeks 1 to 6 from a current week of Monday 31 August 2026 (W36).
const W6 = '2026-10-05';
const SUP = 'sup-x';
const MAT = 'MAT-1';

/**
 * @param {Partial<CallOff> & { quantity: number; needDate: string; status: CallOffStatus }} c
 * @returns {CallOff}
 */
const callOff = (c) =>
  /** @type {CallOff} */ ({
    id: `co-${c.needDate}-${c.status}-${c.quantity}-${c.poLineId ?? 'l1'}`,
    callOffNumber: 'CO-1',
    poId: 'po-a',
    poNumber: 'PO-A',
    poLineId: 'l1',
    supplierId: SUP,
    supplierName: 'Supplier X',
    materialCode: MAT,
    description: 'Material 1',
    uom: 'PCS',
    unitPrice: 1,
    currency: 'IDR',
    type: 'forecast',
    dispatches: [],
    notes: [],
    ...c
  });

/**
 * @param {string} id
 * @param {string} orderDate
 * @param {Partial<POLineItem> & { quantity: number }} line
 * @returns {PurchaseOrder}
 */
const po = (id, orderDate, line) =>
  /** @type {PurchaseOrder} */ ({
    id,
    poNumber: `PO-${id}`,
    orderDate,
    supplierId: SUP,
    status: POStatus.CONFIRMED,
    lineItems: [
      /** @type {POLineItem} */ ({
        id: `${id}-l1`,
        materialCode: MAT,
        description: 'Material 1',
        uom: 'PCS',
        unitPrice: 1,
        ...line
      })
    ]
  });

/**
 * A read row with one figure per week, as `getDemandAnticipation` gives it.
 * @param {Record<string, number | null>} qtyByWeek
 * @returns {DemandAnticipationRow}
 */
const row = (qtyByWeek) => ({
  supplierId: SUP,
  materialCode: MAT,
  share: 1,
  stockOnRecord: true,
  supplierName: 'Supplier X',
  materialLabel: 'Material 1',
  uom: 'PCS',
  weeks: Object.entries(qtyByWeek).map(
    ([week, qty]) =>
      /** @type {DemandAnticipationWeekView} */ ({
        week,
        qty,
        frozen: false,
        published: null,
        // A "would be" that disagrees with `qty`: the gap must read `qty`.
        wouldBe: qty === null ? null : qty + 99_999,
        delta: null,
        inputs: null,
        horizonStart: '2026-08-31',
        horizonFrozen: false,
        frozenBy: null
      })
  )
});

describe('AC-01 — demand anticipation 30,000 and open supply 22,000 in week 6', () => {
  it('gives a gap of 8,000', () => {
    const [r] = withOpenSupply([row({ [W6]: 30_000 })], {
      pos: [],
      callOffs: [
        callOff({ quantity: 12_000, needDate: '2026-10-05', status: 'Confirmed' }),
        callOff({ quantity: 10_000, needDate: '2026-10-09', status: 'Awaiting Confirmation' })
      ]
    });
    const w = r?.weeks[0];
    expect(w?.openSupply).toBe(22_000);
    expect(w?.gap).toBe(8_000);
    expect(supplyGap(30_000, 22_000)).toBe(8_000);
  });

  it('reads the figure in force (`qty`), not "would be"', () => {
    const [r] = withOpenSupply([row({ [W6]: 30_000 })], { pos: [], callOffs: [] });
    expect(r?.weeks[0]?.gap).toBe(30_000);
  });

  it('a week with supply at or above the figure has no gap and no proposal; no figure, no gap', () => {
    expect(supplyGap(30_000, 31_000)).toBe(0);
    expect(supplyGap(null, 5)).toBeNull();
    const [r] = withOpenSupply([row({ [W6]: 30_000, '2026-10-12': null })], {
      pos: [po('a', '2026-07-01', { quantity: 50_000 })],
      callOffs: [callOff({ quantity: 30_000, needDate: '2026-10-05', status: 'Confirmed' })]
    });
    expect(r?.weeks[0]).toMatchObject({ gap: 0, proposal: null });
    expect(r?.weeks[1]).toMatchObject({ openSupply: 0, gap: null, proposal: null });
  });
});

describe('open supply — released call-offs only, by the week of their need date', () => {
  it('Awaiting Confirmation and the four confirmed states are supply', () => {
    const index = openSupplyIndex(
      /** @type {const} */ ([
        'Awaiting Confirmation',
        'Confirmed',
        'Confirmed with New Date',
        'Confirmed with Changes',
        'Partially Confirmed'
      ]).map((status) => callOff({ quantity: 100, needDate: '2026-10-06', status }))
    );
    expect(index.get(`${SUP}|${MAT}|${W6}`)).toBe(500);
  });

  it('Draft, Dismissed and Rejected call-offs are not supply', () => {
    const index = openSupplyIndex(
      /** @type {const} */ (['Draft', 'Dismissed', 'Rejected']).map((status) =>
        callOff({ quantity: 100, needDate: '2026-10-06', status })
      )
    );
    expect(index.size).toBe(0);
  });

  it('buckets by the Monday of the need date: Sunday is the same week, the next Monday the next', () => {
    const index = openSupplyIndex([
      callOff({ quantity: 1, needDate: '2026-10-05', status: 'Confirmed' }),
      callOff({ quantity: 2, needDate: '2026-10-11', status: 'Confirmed' }),
      callOff({ quantity: 4, needDate: '2026-10-12', status: 'Confirmed' }),
      callOff({ quantity: 8, needDate: '2026-10-04', status: 'Confirmed' })
    ]);
    expect(index.get(`${SUP}|${MAT}|2026-10-05`)).toBe(3);
    expect(index.get(`${SUP}|${MAT}|2026-10-12`)).toBe(4);
    expect(index.get(`${SUP}|${MAT}|2026-09-28`)).toBe(8);
  });

  it('another supplier or material is not this pair’s supply', () => {
    const [r] = withOpenSupply([row({ [W6]: 1_000 })], {
      pos: [],
      callOffs: [
        callOff({ quantity: 600, needDate: W6, status: 'Confirmed', supplierId: 'sup-y' }),
        callOff({ quantity: 600, needDate: W6, status: 'Confirmed', materialCode: 'MAT-2' })
      ]
    });
    expect(r?.weeks[0]?.openSupply).toBe(0);
  });
});

describe('AC-02 — the proposal names the oldest blanket line with balance', () => {
  const pos = [
    // Listed newest first: the order must come from `orderDate`, not the input.
    po('new', '2026-08-20', { quantity: 50_000 }),
    po('old', '2026-07-01', { quantity: 20_000 }),
    po('mid', '2026-08-01', { quantity: 20_000 })
  ];

  it('8,000 on the oldest line, which has the balance', () => {
    const [r] = withOpenSupply([row({ [W6]: 8_000 })], { pos, callOffs: [] });
    expect(r?.weeks[0]?.proposal).toEqual({
      callOffs: [
        { poId: 'old', poNumber: 'PO-old', lineId: 'old-l1', qty: 8_000, balance: 20_000 }
      ],
      newPoQty: 0
    });
  });

  it('a gap larger than the oldest line’s balance spills to the next line', () => {
    // The oldest line has 5,000 left: 15,000 was already released against it.
    const released = callOff({
      quantity: 15_000,
      needDate: '2026-08-31',
      status: 'Confirmed',
      poId: 'old',
      poLineId: 'old-l1'
    });
    const [r] = withOpenSupply([row({ [W6]: 8_000 })], { pos, callOffs: [released] });
    expect(r?.weeks[0]?.proposal?.callOffs.map((c) => [c.poId, c.qty])).toEqual([
      ['old', 5_000],
      ['mid', 3_000]
    ]);
    expect(r?.weeks[0]?.proposal?.newPoQty).toBe(0);
  });

  it('a line used up is skipped; the gaps of later weeks share what is left', () => {
    const lines = blanketBalances(pos, [], SUP, MAT);
    expect(lines.map((l) => l.poId)).toEqual(['old', 'mid', 'new']);
    const out = proposeForGaps(
      [
        { week: '2026-10-12', gap: 10_000 },
        { week: W6, gap: 25_000 }
      ],
      lines
    );
    expect(out.get(W6)?.callOffs.map((c) => [c.poId, c.qty])).toEqual([
      ['old', 20_000],
      ['mid', 5_000]
    ]);
    expect(out.get('2026-10-12')?.callOffs.map((c) => [c.poId, c.qty, c.balance])).toEqual([
      ['mid', 10_000, 15_000]
    ]);
  });

  it('a draft on a line does not draw its balance; a released call-off does', () => {
    const draft = callOff({
      quantity: 19_000,
      needDate: W6,
      status: 'Draft',
      poId: 'old',
      poLineId: 'old-l1'
    });
    expect(blanketBalances(pos, [draft], SUP, MAT)[0]?.balance).toBe(20_000);
    const released = { ...draft, status: /** @type {const} */ ('Awaiting Confirmation') };
    expect(blanketBalances(pos, [released], SUP, MAT)[0]?.balance).toBe(1_000);
  });

  it('a value-only line offers its remaining value at its unit price, in whole units', () => {
    const value = po('val', '2026-06-01', { quantity: 0, unitPrice: 3, valueLimit: 10_000 });
    expect(blanketBalances([value], [], SUP, MAT)[0]?.balance).toBe(3_333);
  });

  it('a PO not in a call-off state is not a blanket line', () => {
    const closed = { ...po('closed', '2026-01-01', { quantity: 99_000 }), status: POStatus.CLOSED };
    expect(blanketBalances([closed], [], SUP, MAT)).toEqual([]);
  });
});

describe('AC-03 — no blanket balance left', () => {
  it('reads "New PO needed" with the whole gap', () => {
    const [r] = withOpenSupply([row({ [W6]: 30_000 })], {
      pos: [],
      callOffs: [callOff({ quantity: 22_000, needDate: W6, status: 'Confirmed' })]
    });
    expect(r?.weeks[0]?.proposal).toEqual({ callOffs: [], newPoQty: 8_000 });
  });

  it('what the lines cannot cover is the new PO', () => {
    const [r] = withOpenSupply([row({ [W6]: 8_000 })], {
      pos: [po('old', '2026-07-01', { quantity: 3_000 })],
      callOffs: []
    });
    expect(r?.weeks[0]?.proposal).toMatchObject({ newPoQty: 5_000 });
    expect(r?.weeks[0]?.proposal?.callOffs.map((c) => c.qty)).toEqual([3_000]);
  });
});

describe('supplyGapRows — the What to order list', () => {
  it('every week with a gap, earliest first, with the figure, supply and proposal', () => {
    const rows = withOpenSupply([row({ '2026-10-12': 5, [W6]: 30_000, '2026-10-19': 0 })], {
      pos: [],
      callOffs: [callOff({ quantity: 22_000, needDate: W6, status: 'Confirmed' })]
    });
    expect(
      supplyGapRows(rows).map((g) => [g.week, g.demandAnticipation, g.openSupply, g.gap])
    ).toEqual([
      [W6, 30_000, 22_000, 8_000],
      ['2026-10-12', 5, 0, 5]
    ]);
  });
});
