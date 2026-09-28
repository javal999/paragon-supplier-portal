import { describe, expect, it } from 'vitest';
import {
  buildFixedStockReconcile,
  countByOutcome,
  cycleOfDay,
  reconcileFigures,
  type FsCallOffInput,
  type FsCommitmentInput,
  type FsInputs,
  type FsStockInput,
} from './fixedStockReconcile';

// REQ-E06-04 — fixed stock (FS) reconcile (ENG-D21, BL-134).

const CFG = { anchor: '2026-08-31', cycleWeeks: 3 };

describe('REQ-E06-04 worked example (verbatim)', () => {
  // Committed W1 34,300 + W2 31,000 + W3 34,300 = 99,600; called off 88,000;
  // held 85,000 at the end of W3; max stock 90,000 agreed.
  it('(a) PTI under-called: 11,600 not called off, held covers it, 11,600 flagged liability — not priced', () => {
    expect(reconcileFigures({ committed: 99_600, calledOff: 88_000, held: 85_000, maxStock: 90_000 })).toEqual({
      outcome: 'underCalled',
      uncalled: 11_600,
      calledBeyond: 0,
      liabilityQty: 11_600,
      shortQty: 0,
      aboveMaxQty: 0,
    });
  });

  it('(b) supplier short: holds 7,000 of the 11,600 — short 4,600, liability on the 7,000 held', () => {
    expect(reconcileFigures({ committed: 99_600, calledOff: 88_000, held: 7_000, maxStock: 90_000 })).toMatchObject({
      outcome: 'supplierShort',
      uncalled: 11_600,
      liabilityQty: 7_000,
      shortQty: 4_600,
    });
  });

  it('(c) stock not reported: 11,600 not called off, no stock figure — nothing flagged until one is submitted', () => {
    expect(reconcileFigures({ committed: 99_600, calledOff: 88_000, held: null, maxStock: 90_000 })).toMatchObject({
      outcome: 'stockNotReported',
      uncalled: 11_600,
      liabilityQty: 0,
      shortQty: 0,
    });
  });

  it('(d) balanced: PTI called off 101,000 — 1,400 beyond the commitment, nothing flagged', () => {
    expect(reconcileFigures({ committed: 99_600, calledOff: 101_000, held: 85_000, maxStock: 90_000 })).toMatchObject({
      outcome: 'balanced',
      uncalled: -1_400,
      calledBeyond: 1_400,
      liabilityQty: 0,
    });
  });

  it('(e) above max stock: all called off, but 95,000 held against 90,000 — 5,000 is the supplier’s own', () => {
    expect(reconcileFigures({ committed: 99_600, calledOff: 101_000, held: 95_000, maxStock: 90_000 })).toMatchObject({
      outcome: 'overHeld',
      liabilityQty: 0,
      aboveMaxQty: 5_000,
    });
  });

  it('(f) the liability is capped at the agreed max stock: max 10,000 → 10,000 flagged, 75,000 above max', () => {
    expect(reconcileFigures({ committed: 99_600, calledOff: 88_000, held: 85_000, maxStock: 10_000 })).toMatchObject({
      outcome: 'underCalled',
      liabilityQty: 10_000,
      aboveMaxQty: 75_000,
    });
  });
});

describe('edge cases', () => {
  it('no max stock agreed: nothing is capped and nothing is ever above max', () => {
    const r = reconcileFigures({ committed: 99_600, calledOff: 101_000, held: 500_000, maxStock: null });
    expect(r).toMatchObject({ outcome: 'balanced', aboveMaxQty: 0 });
    expect(reconcileFigures({ committed: 99_600, calledOff: 0, held: 500_000, maxStock: null }).liabilityQty).toBe(99_600);
  });

  it('no stock figure with everything called off is balanced — the held figure is not needed', () => {
    expect(reconcileFigures({ committed: 100, calledOff: 100, held: null, maxStock: 50 }).outcome).toBe('balanced');
  });

  it('held of zero against an uncalled commitment is supplier short with no liability', () => {
    expect(reconcileFigures({ committed: 100, calledOff: 0, held: 0, maxStock: null })).toMatchObject({
      outcome: 'supplierShort',
      liabilityQty: 0,
      shortQty: 100,
    });
  });
});

describe('cycles (BR-01)', () => {
  it('packaging runs in 3-week blocks from the anchor Monday, back to back and backwards', () => {
    expect(cycleOfDay('packaging', '2026-08-31', CFG)).toEqual({ stream: 'packaging', start: '2026-08-31', end: '2026-09-20' });
    expect(cycleOfDay('packaging', '2026-09-20', CFG).start).toBe('2026-08-31');
    expect(cycleOfDay('packaging', '2026-09-21', CFG)).toEqual({ stream: 'packaging', start: '2026-09-21', end: '2026-10-11' });
    expect(cycleOfDay('packaging', '2026-08-27', CFG)).toEqual({ stream: 'packaging', start: '2026-08-10', end: '2026-08-30' });
  });

  it('raw material runs per calendar month', () => {
    expect(cycleOfDay('rawMaterial', '2026-09-09', CFG)).toEqual({ stream: 'rawMaterial', start: '2026-09-01', end: '2026-09-30' });
    expect(cycleOfDay('rawMaterial', '2027-02-01', CFG).end).toBe('2027-02-28');
  });
});

const line = (over: Partial<FsCommitmentInput>): FsCommitmentInput => ({
  stream: 'packaging',
  supplierId: 'sup-A',
  supplierName: 'Supplier A',
  materialCode: 'PK-1',
  materialLabel: 'PET bottle',
  uom: 'PCS',
  periodBucket: '2026-08-31',
  periodStart: '2026-08-31',
  zone: 'firm',
  committedQty: 0,
  ...over,
});
const week = (monday: string, qty: number | null, zone: FsCommitmentInput['zone'] = 'firm', over: Partial<FsCommitmentInput> = {}) =>
  line({ periodBucket: monday, periodStart: monday, committedQty: qty, zone, ...over });
const callOff = (n: number, quantity: number, needDate: string, over: Partial<FsCallOffInput> = {}): FsCallOffInput => ({
  supplierId: 'sup-A',
  materialCode: 'PK-1',
  callOffNumber: `CO-${n}`,
  quantity,
  needDate,
  status: 'Confirmed',
  ...over,
});
const stock = (declaredAt: string, totalQty: number, over: Partial<FsStockInput> = {}): FsStockInput => ({
  supplierId: 'sup-A',
  materialCode: 'PK-1',
  declaredAt,
  totalQty,
  ...over,
});
const inputs = (over: Partial<FsInputs>): FsInputs => ({
  ...CFG,
  commitments: [],
  callOffs: [],
  stock: [],
  maxStock: () => null,
  asOf: '2026-09-21',
  ...over,
});

describe('buildFixedStockReconcile (BR-02 to BR-11)', () => {
  const workedCommitments = [
    week('2026-08-31', 34_300),
    week('2026-09-07', 31_000),
    week('2026-09-14', 34_300, 'tradeOff'),
    week('2026-09-21', 30_000, 'tradeOff'), // next cycle
    week('2026-10-26', 34_300, 'forecast'), // Forecast zone: acknowledgement only
    line({ periodBucket: '2026-12', periodStart: '2026-12-01', committedQty: 150_000, zone: 'tradeOff' }), // a packaging month
  ];
  const workedCallOffs = [
    callOff(1, 40_000, '2026-09-01'),
    callOff(2, 30_000, '2026-09-08', { status: 'Rejected' }),
    callOff(3, 18_000, '2026-09-20'),
    callOff(4, 50_000, '2026-09-10', { status: 'Draft' }),
    callOff(5, 50_000, '2026-09-11', { status: 'Dismissed' }),
    callOff(6, 9_999, '2026-09-22'), // next cycle
    callOff(7, 9_999, '2026-09-10', { supplierId: 'sup-B' }), // another supplier
  ];

  it('the worked example end to end: 99,600 committed, 88,000 called off, 85,000 held by the end of W3', () => {
    const rows = buildFixedStockReconcile(
      inputs({
        commitments: workedCommitments,
        callOffs: workedCallOffs,
        stock: [stock('2026-09-18T02:00:00Z', 85_000), stock('2026-09-22T02:00:00Z', 1)],
        maxStock: () => 90_000,
      }),
    );
    const w = rows.find((r) => r.cycleStart === '2026-08-31')!;
    expect(w).toMatchObject({
      cycleEnd: '2026-09-20',
      final: true,
      committed: 99_600,
      periodsCommitted: 3,
      periodsAwaiting: 0,
      calledOff: 88_000,
      callOffNumbers: ['CO-1', 'CO-2', 'CO-3'],
      held: 85_000,
      heldAt: '2026-09-18T02:00:00Z',
      maxStock: 90_000,
      outcome: 'underCalled',
      uncalled: 11_600,
      liabilityQty: 11_600,
    });
    // The cycle that started on the as-of day is read too, provisional.
    const next = rows.find((r) => r.cycleStart === '2026-09-21')!;
    expect(next).toMatchObject({ final: false, committed: 30_000, calledOff: 9_999, held: 1 });
    // No row reads the Forecast period or the packaging month.
    expect(rows.map((r) => r.cycleStart).sort()).toEqual(['2026-08-31', '2026-09-21']);
  });

  it('a cycle that has not started is not read; a running cycle is provisional and reads the current stock', () => {
    const rows = buildFixedStockReconcile(
      inputs({
        asOf: '2026-09-02',
        commitments: workedCommitments,
        callOffs: workedCallOffs,
        stock: [stock('2026-08-30T02:00:00Z', 70_000), stock('2026-09-25T02:00:00Z', 60_000)],
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ cycleStart: '2026-08-31', final: false, held: 60_000 });
  });

  it('an awaiting Firm period counts as zero and is counted as awaiting', () => {
    const [r] = buildFixedStockReconcile(
      inputs({ commitments: [week('2026-08-31', null), week('2026-09-07', 10_000)], callOffs: [callOff(1, 4_000, '2026-09-02')], stock: [stock('2026-09-01', 8_000)] }),
    );
    expect(r).toMatchObject({ committed: 10_000, periodsCommitted: 1, periodsAwaiting: 1, uncalled: 6_000, outcome: 'underCalled' });
  });

  it('no stock figure: held is null and the row reads stock not reported', () => {
    const [r] = buildFixedStockReconcile(inputs({ commitments: [week('2026-08-31', 10_000)] }));
    expect(r).toMatchObject({ held: null, heldAt: null, outcome: 'stockNotReported', liabilityQty: 0 });
  });

  it('an ended cycle ignores stock submitted after its end', () => {
    const [r] = buildFixedStockReconcile(
      inputs({ commitments: [week('2026-08-31', 10_000)], stock: [stock('2026-09-25T02:00:00Z', 10_000)] }),
    );
    expect(r).toMatchObject({ final: true, held: null, outcome: 'stockNotReported' });
  });

  it('no max stock agreed reads null; an agreed one is looked up per supplier × material', () => {
    const rows = buildFixedStockReconcile(
      inputs({
        commitments: [week('2026-08-31', 10_000), week('2026-08-31', 10_000, 'firm', { materialCode: 'PK-2' })],
        stock: [stock('2026-09-01', 30_000), stock('2026-09-01', 30_000, { materialCode: 'PK-2' })],
        callOffs: [callOff(1, 10_000, '2026-09-01'), callOff(2, 10_000, '2026-09-01', { materialCode: 'PK-2' })],
        maxStock: (_s, m) => (m === 'PK-2' ? 20_000 : null),
      }),
    );
    expect(rows.find((r) => r.materialCode === 'PK-1')).toMatchObject({ maxStock: null, outcome: 'balanced', aboveMaxQty: 0 });
    expect(rows.find((r) => r.materialCode === 'PK-2')).toMatchObject({ maxStock: 20_000, outcome: 'overHeld', aboveMaxQty: 10_000 });
  });

  it('nothing committed and nothing called off gives no row; called off with nothing committed is balanced', () => {
    expect(buildFixedStockReconcile(inputs({ commitments: [week('2026-08-31', null)] }))).toEqual([]);
    const [r] = buildFixedStockReconcile(inputs({ commitments: [week('2026-08-31', null)], callOffs: [callOff(1, 500, '2026-09-01')] }));
    expect(r).toMatchObject({ committed: 0, calledOff: 500, outcome: 'balanced', calledBeyond: 500 });
  });

  it('raw material reconciles per month', () => {
    const [r] = buildFixedStockReconcile(
      inputs({
        asOf: '2026-10-01',
        commitments: [line({ stream: 'rawMaterial', periodBucket: '2026-09', periodStart: '2026-09-01', committedQty: 10_000 })],
        callOffs: [callOff(1, 3_000, '2026-09-30'), callOff(2, 3_000, '2026-10-01')],
        stock: [stock('2026-09-29', 4_200)],
      }),
    );
    expect(r).toMatchObject({ stream: 'rawMaterial', cycleStart: '2026-09-01', cycleEnd: '2026-09-30', final: true, calledOff: 3_000, outcome: 'supplierShort', shortQty: 2_800, liabilityQty: 4_200 });
  });

  it('keeps suppliers apart and sorts the most urgent outcome first', () => {
    const rows = buildFixedStockReconcile(
      inputs({
        commitments: [
          week('2026-08-31', 100),
          week('2026-08-31', 100, 'firm', { supplierId: 'sup-B', supplierName: 'Supplier B' }),
          week('2026-08-31', 100, 'firm', { supplierId: 'sup-C', supplierName: 'Supplier C' }),
        ],
        callOffs: [callOff(1, 100, '2026-09-01')],
        stock: [stock('2026-09-01', 10, { supplierId: 'sup-B' }), stock('2026-09-01', 500, { supplierId: 'sup-C' })],
      }),
    );
    expect(rows.map((r) => [r.supplierId, r.outcome])).toEqual([
      ['sup-B', 'supplierShort'],
      ['sup-C', 'underCalled'],
      ['sup-A', 'balanced'],
    ]);
    expect(countByOutcome(rows)).toEqual({ supplierShort: 1, underCalled: 1, stockNotReported: 0, overHeld: 0, balanced: 1 });
  });
});
