// ─────────────────────────────────────────────────────────────────────────────
// BL-199 (DRC-13) — the call-off trigger's pure rules, every figure worked by
// hand. Each rule is probed both ways: an input that triggers and one that
// must not.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  CALL_OFF_TRIGGER_QUESTIONS,
  CALL_OFF_TRIGGER_RULES,
  allocateCallOffs,
  cappedQuantity,
  materialRop,
  openPrRecommendations,
  releasedNotReceived,
  sohCheck,
  triggerStep
} from './callOffTriggerRules';
import { stamp } from './osipRules';

/** @typedef {import('./callOffTriggerRules').TriggerLine} TriggerLine */
/** @typedef {import('./callOffTriggerRules').TriggerRow} TriggerRow */

/** The earlier quantity rule, kept as a variant [Team F5]. */
const FILL = { ...CALL_OFF_TRIGGER_RULES, quantityRule: /** @type {const} */ ('fillToMax') };

/**
 * @param {Partial<TriggerLine> & Pick<TriggerLine, 'poNumber' | 'orderDate' | 'balance'>} l
 * @returns {TriggerLine}
 */
const line = (l) => ({
  poId: `po-${l.poNumber}`,
  lineId: 'li-1',
  supplierId: 'sup-a',
  mpq: 25,
  f: 2,
  ...l
});

describe('BR-05 [Default F1] — SOH against ROP Fisik, all plants combined', () => {
  const records = /** @type {const} */ ([
    { materialCode: 'M', plant: 'J2', ptiSoh: 600 },
    { materialCode: 'M', plant: 'J6', ptiSoh: 500 }
  ]);

  it('sums the plants (J6 + J2 = 1,100) and compares the sum: at or below triggers', () => {
    expect(CALL_OFF_TRIGGER_RULES.plantComparison).toBe('combined');
    const at = sohCheck(records, 1100);
    expect(at).toEqual({
      soh: 1100,
      plants: [
        { plant: 'J6', soh: 500 },
        { plant: 'J2', soh: 600 }
      ],
      atOrBelow: true,
      flags: []
    });
    // Known-good the other way: one unit above ROP Fisik does not trigger,
    // although each plant alone sits far below it.
    expect(sohCheck(records, 1099).atOrBelow).toBe(false);
  });

  it('the per-plant variant compares each plant and flags that ROP Fisik is not per plant', () => {
    const perPlant = {
      ...CALL_OFF_TRIGGER_RULES,
      plantComparison: /** @type {const} */ ('perPlant')
    };
    // J6 = 500 ≤ 500 triggers, though the combined 1,100 is above.
    expect(sohCheck(records, 500, perPlant)).toMatchObject({
      soh: 1100,
      atOrBelow: true,
      flags: ['ROP_NOT_PER_PLANT']
    });
    expect(sohCheck(records, 499, perPlant).atOrBelow).toBe(false);
    expect(sohCheck(records, 500).atOrBelow).toBe(false);
  });
});

describe('the material ROP Fisik and Max — the sum over its suppliers', () => {
  it('adds every supplier holding a figure, flags a partial sum, and is null with none', () => {
    expect(
      materialRop([
        { supplierId: 'a', ropFisik: 12000, max: 15200 },
        { supplierId: 'b', ropFisik: 20000, max: 21000 }
      ])
    ).toEqual({ ropFisik: 32000, max: 36200, flags: [] });
    expect(
      materialRop([
        { supplierId: 'a', ropFisik: 12000, max: 15200 },
        { supplierId: 'b', ropFisik: null, max: null }
      ])
    ).toEqual({ ropFisik: 12000, max: 15200, flags: ['PARTIAL_ROP'] });
    expect(materialRop([{ supplierId: 'a', ropFisik: null, max: null }])).toBeNull();
  });
});

describe('BR-01b — released call-offs not yet received', () => {
  it('counts released call-offs less their receipts, never drafts, dismissed or rejected ones', () => {
    const callOffs = /** @type {const} */ ([
      { id: 'a', materialCode: 'M', quantity: 500, status: 'Awaiting Confirmation' },
      { id: 'b', materialCode: 'M', quantity: 400, status: 'Confirmed' },
      { id: 'c', materialCode: 'M', quantity: 900, status: 'Draft' },
      { id: 'd', materialCode: 'M', quantity: 900, status: 'Dismissed' },
      { id: 'e', materialCode: 'M', quantity: 900, status: 'Rejected' },
      { id: 'f', materialCode: 'OTHER', quantity: 900, status: 'Confirmed' },
      { id: 'g', materialCode: 'M', quantity: 100, status: 'Confirmed' }
    ]);
    const results = /** @type {const} */ ([
      { callOffId: 'b', basis: 'receipt', quantity: 150 },
      // A heads-up is not a receipt.
      { callOffId: 'a', basis: 'dispatch', quantity: 500 },
      // Received in full and more: never below 0.
      { callOffId: 'g', basis: 'receipt', quantity: 120 }
    ]);
    // 500 + (400 − 150) + max(0, 100 − 120) = 750
    expect(releasedNotReceived(callOffs, results, 'M')).toBe(750);
  });
});

describe("[Team F5] BR-01b 'minimumDelivery' (default) — the supplier's minimum delivery, rounded like Max", () => {
  /** @param {Partial<TriggerLine>} [over] */
  const mdq = (over = {}) =>
    line({
      poNumber: 'P1',
      orderDate: '2026-07-01',
      balance: 50000,
      mdq: 1000,
      roundTo: 240,
      ...over
    });

  it('one call-off of the MDQ rounded up to the pallet: MDQ 1,000, pallet 240 → 1,200, whatever the room above it', () => {
    expect(CALL_OFF_TRIGGER_RULES.quantityRule).toBe('minimumDelivery');
    // Room 18,000 − 10,000 = 8,000; the call-off is 1,200, not 8,000.
    const a = allocateCallOffs({ max: 18000, soh: 10000, openSupply: 0, lines: [mdq()] });
    expect(a).toMatchObject({ room: 8000, prQty: 0, flags: [] });
    expect(a.callOffs.map((c) => c.qty)).toEqual([1200]);
  });

  it('import rounds to the MOQ the same way: MDQ 900 on a 500 unit → 1,000; no unit (sheet guidance) → 900', () => {
    const a = allocateCallOffs({
      max: 9000,
      soh: 0,
      openSupply: 0,
      lines: [mdq({ mdq: 900, roundTo: 500 })]
    });
    expect(a.callOffs[0].qty).toBe(1000);
    const b = allocateCallOffs({
      max: 9000,
      soh: 0,
      openSupply: 0,
      lines: [mdq({ mdq: 900, roundTo: 0 })]
    });
    expect(b.callOffs[0].qty).toBe(900);
  });

  it('[Proposed] above Max: by default the minimum delivery is called off anyway, flagged ABOVE_MAX', () => {
    expect(CALL_OFF_TRIGGER_RULES.minimumDeliveryAboveMax).toBe('callOff');
    const a = allocateCallOffs({ max: 1000, soh: 0, openSupply: 0, lines: [mdq()] });
    expect(a.callOffs[0].qty).toBe(1200);
    expect(a.flags).toEqual(['ABOVE_MAX']);
  });

  it("[Owner A7] 'wait': Max caps it: room 1,000 below a 1,200 call-off → 960 (4 pallets); exact → 1,000; room 200 → nothing, flagged", () => {
    const lines = [mdq()];
    const wait = {
      ...CALL_OFF_TRIGGER_RULES,
      minimumDeliveryAboveMax: /** @type {const} */ ('wait')
    };
    expect(
      allocateCallOffs({ max: 1000, soh: 0, openSupply: 0, lines }, wait).callOffs[0].qty
    ).toBe(960);
    expect(
      allocateCallOffs({ max: 1000, soh: 0, openSupply: 0, lines }, { ...wait, maxCap: 'exact' })
        .callOffs[0].qty
    ).toBe(1000);
    expect(allocateCallOffs({ max: 200, soh: 0, openSupply: 0, lines }, wait)).toEqual({
      room: 200,
      callOffs: [],
      prQty: 0,
      flags: ['ROOM_BELOW_MIN_DELIVERY']
    });
  });

  it('the oldest line first; a short line gives its balance and the next one the rest; what none covers is the PR', () => {
    const a = allocateCallOffs({
      max: 18000,
      soh: 0,
      openSupply: 0,
      lines: [
        mdq({ poNumber: 'P2', orderDate: '2026-08-01', balance: 300, supplierId: 'sup-b' }),
        mdq({ poNumber: 'P1', orderDate: '2026-07-01', balance: 500 })
      ]
    });
    expect(a.callOffs.map((c) => [c.poNumber, c.qty])).toEqual([
      ['P1', 500],
      ['P2', 300]
    ]);
    expect(a.prQty).toBe(400);
  });

  it('a line with no MDQ falls back to the room rounded to its MPQ, flagged; no line at all: the room is the PR', () => {
    const a = allocateCallOffs({
      max: 1400,
      soh: 1000,
      openSupply: 0,
      lines: [line({ poNumber: 'P1', orderDate: '2026-07-18', balance: 15000 })]
    });
    expect(a.callOffs.map((c) => c.qty)).toEqual([400]);
    expect(a.flags).toEqual(['NO_MDQ']);
    expect(allocateCallOffs({ max: 1400, soh: 1000, openSupply: 0, lines: [] }).prQty).toBe(400);
  });
});

describe("BR-01b / BR-03 [Owner A7] 'fillToMax' (the earlier reading) — the quantity: up to the MPQ, capped at Max", () => {
  it('rounds the room up to the MPQ when the rounded call-off still fits under Max', () => {
    // Max 1,400 − SOH 1,000 = room 400 → CEILING(400, 25) = 400.
    expect(allocateCallOffs({ max: 1400, soh: 1000, openSupply: 0, lines: [] }, FILL).room).toBe(
      400
    );
    expect(cappedQuantity(400, 25)).toBe(400);
    // Room 380 is not a multiple of 100 but 400 would pass Max: the largest
    // whole MPQ under Max is 300.
    expect(cappedQuantity(380, 100)).toBe(300);
  });

  it('the cap: room 390 at MPQ 25 rounds up to 400, past Max, so it steps down to 375', () => {
    expect(CALL_OFF_TRIGGER_RULES.maxCap).toBe('mpqMultiple');
    expect(cappedQuantity(390, 25)).toBe(375);
    // The 'exact' variant cuts to exactly what fits.
    expect(cappedQuantity(390, 25, { ...CALL_OFF_TRIGGER_RULES, maxCap: 'exact' })).toBe(390);
  });

  it('no MPQ leaves the room as it is; no room drafts nothing', () => {
    expect(cappedQuantity(390, null)).toBe(390);
    expect(cappedQuantity(0, 25)).toBe(0);
    expect(cappedQuantity(-50, 25)).toBe(0);
  });

  it('released call-offs not yet received count as supply: projected stock never passes Max', () => {
    // Max 36,200 − (SOH 1,000 + 118,000 on the way) < 0: room 0, nothing drafted.
    const a = allocateCallOffs(
      {
        max: 36200,
        soh: 1000,
        openSupply: 118000,
        lines: [line({ poNumber: 'P1', orderDate: '2026-07-01', balance: 50000 })]
      },
      FILL
    );
    expect(a).toEqual({ room: 0, callOffs: [], prQty: 0, flags: [] });
  });
});

describe("BR-01a 'fillToMax' — the oldest blanket line first, the remainder on the next line", () => {
  it('walks the lines oldest first across suppliers; a line never gives more than its balance', () => {
    // Max 18,000 − (SOH 10,000 + 0) = room 8,000; MPQ 1,000.
    const a = allocateCallOffs(
      {
        max: 18000,
        soh: 10000,
        openSupply: 0,
        lines: [
          // Listed newest first on purpose: the order is the rule's, not the input's.
          line({
            poNumber: 'P3',
            orderDate: '2026-08-20',
            balance: 70000,
            supplierId: 'sup-b',
            mpq: 1000,
            f: 7
          }),
          line({ poNumber: 'P1', orderDate: '2026-07-28', balance: 3000, mpq: 1000, f: 1 })
        ]
      },
      FILL
    );
    expect(a.room).toBe(8000);
    expect(a.callOffs.map((c) => [c.poNumber, c.supplierId, c.qty, c.f])).toEqual([
      ['P1', 'sup-a', 3000, 1],
      ['P3', 'sup-b', 5000, 7]
    ]);
    expect(a.prQty).toBe(0);
  });

  it('skips a line with no balance left', () => {
    const a = allocateCallOffs(
      {
        max: 1400,
        soh: 1000,
        openSupply: 0,
        lines: [
          line({ poNumber: 'P0', orderDate: '2026-06-01', balance: 0 }),
          line({ poNumber: 'P1', orderDate: '2026-07-18', balance: 15000 })
        ]
      },
      FILL
    );
    expect(a.callOffs.map((c) => [c.poNumber, c.qty])).toEqual([['P1', 400]]);
  });
});

describe("BR-02 'fillToMax' — what no blanket line covers is a PR recommendation", () => {
  it('no balance at all: the whole room is the PR', () => {
    expect(allocateCallOffs({ max: 18000, soh: 10000, openSupply: 0, lines: [] }, FILL)).toEqual({
      room: 8000,
      callOffs: [],
      prQty: 8000,
      flags: []
    });
  });

  it('balance short of the room: the lines are used up and the rest is the PR', () => {
    const a = allocateCallOffs(
      {
        max: 18000,
        soh: 10000,
        openSupply: 0,
        lines: [line({ poNumber: 'P1', orderDate: '2026-07-01', balance: 2500, mpq: 1000 })]
      },
      FILL
    );
    expect(a.callOffs.map((c) => c.qty)).toEqual([2500]);
    expect(a.prQty).toBe(5500);
  });

  it('room left only because it is smaller than an MPQ is not a PR', () => {
    const a = allocateCallOffs(
      {
        max: 1400,
        soh: 1010,
        openSupply: 0,
        lines: [line({ poNumber: 'P1', orderDate: '2026-07-18', balance: 15000 })]
      },
      FILL
    );
    expect(a.callOffs.map((c) => c.qty)).toEqual([375]);
    expect(a.prQty).toBe(0);
    expect(a.flags).toEqual(['ROOM_BELOW_MPQ']);
  });
});

describe('BR-01 — one open draft per material; a dismissed draft waits for a recovery', () => {
  const drafting = {
    ropAvailable: true,
    atOrBelow: true,
    pendingDraft: false,
    allocation: {
      room: 400,
      callOffs: [
        {
          poId: 'po-1',
          poNumber: 'P1',
          lineId: 'li-1',
          supplierId: 'sup-a',
          qty: 400,
          balance: 15000,
          mpq: 25,
          f: 2
        }
      ],
      prQty: 0,
      /** @type {import('./callOffTriggerRules').TriggerFlag[]} */
      flags: []
    }
  };

  it('a first drop drafts and disarms; a drop while a draft is pending does not draft again', () => {
    const first = triggerStep(undefined, drafting);
    expect(first).toEqual({ state: 'drafted', armed: false, draft: true, prQty: 0 });
    expect(triggerStep({ armed: false }, { ...drafting, pendingDraft: true })).toEqual({
      state: 'pending',
      armed: false,
      draft: false,
      prQty: 0
    });
  });

  it('after the draft is dismissed, a still-low SOH waits; above ROP re-arms; the next drop drafts', () => {
    expect(triggerStep({ armed: false }, drafting)).toMatchObject({
      state: 'waiting',
      draft: false
    });
    const above = triggerStep({ armed: false }, { ...drafting, atOrBelow: false });
    expect(above).toEqual({ state: 'above', armed: true, draft: false, prQty: 0 });
    expect(triggerStep(above, drafting)).toMatchObject({ state: 'drafted', draft: true });
  });

  it('no ROP Fisik is not checked; a full pipeline is covered; room under an MPQ waits armed', () => {
    expect(triggerStep(undefined, { ...drafting, ropAvailable: false }).state).toBe('noRop');
    expect(
      triggerStep(undefined, {
        ...drafting,
        allocation: { room: 0, callOffs: [], prQty: 0, flags: [] }
      })
    ).toEqual({ state: 'covered', armed: true, draft: false, prQty: 0 });
    expect(
      triggerStep(undefined, {
        ...drafting,
        allocation: { room: 10, callOffs: [], prQty: 0, flags: ['ROOM_BELOW_MPQ'] }
      })
    ).toEqual({ state: 'belowMpq', armed: true, draft: false, prQty: 0 });
  });

  it('no balance recommends a PR once, and disarms', () => {
    expect(
      triggerStep(undefined, {
        ...drafting,
        allocation: { room: 8000, callOffs: [], prQty: 8000, flags: [] }
      })
    ).toEqual({ state: 'prRecommended', armed: false, draft: false, prQty: 8000 });
  });
});

describe('BR-02 — the open PR recommendations', () => {
  /**
   * @param {string} materialCode
   * @param {import('./callOffTriggerRules').TriggerState} state
   * @param {number} prQty
   * @param {string} at
   * @returns {TriggerRow}
   */
  const row = (materialCode, state, prQty, at) => ({
    materialCode,
    observedAt: at,
    sohSeq: 1,
    state,
    armed: false,
    callOffIds: [],
    prQty,
    figures: stamp(
      {
        soh: 0,
        plants: [],
        ropFisik: 1,
        max: 2,
        openSupply: 0,
        room: prQty,
        quantity: 0,
        prQty,
        demandPerDay: null,
        leadTimeDays: null,
        flags: []
      },
      {}
    )
  });

  it('stays open while SOH stays low, and closes when SOH is seen above ROP Fisik', () => {
    const ledger = [
      row('A', 'prRecommended', 8000, '2026-09-01'),
      row('A', 'waiting', 0, '2026-09-02'),
      row('B', 'prRecommended', 500, '2026-09-01'),
      row('B', 'above', 0, '2026-09-03')
    ];
    expect(openPrRecommendations(ledger).map((r) => [r.materialCode, r.prQty])).toEqual([
      ['A', 8000]
    ]);
  });

  it('carries the question IDs behind every figure (design rule 5)', () => {
    // B5, B6, B7 answered or confirmed [Team, 2026-10-28].
    expect(CALL_OFF_TRIGGER_QUESTIONS).toEqual(['F1', 'B8', 'B9', 'MPQ']);
  });
});
