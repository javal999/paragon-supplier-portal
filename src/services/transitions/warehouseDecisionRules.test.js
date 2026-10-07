// FUX-D3 — the warehouse-week decision rule, pure. Each refusal code fires once
// and passes once (MAT-R8); the ledger reads keep every record and answer the
// latest.
import { describe, expect, it } from 'vitest';
import {
  DECISION_CHOICE_UNKNOWN,
  DECISION_NOTE_REQUIRED,
  WAREHOUSE_DECISION_CHOICES,
  decisionInForce,
  earlierDecisions,
  madeOnOlderPlan,
  parseWarehouseDecisionId,
  warehouseDecisionEntityId,
  warehouseDecisionRefusal
} from './warehouseDecisionRules';

describe('warehouseDecisionRefusal', () => {
  it('the four choices are rent, push out, reduce and accept', () => {
    expect([...WAREHOUSE_DECISION_CHOICES]).toEqual(['rent', 'pushOut', 'reduce', 'accept']);
  });

  it(`${DECISION_CHOICE_UNKNOWN}: fires for a choice outside the list; passes for each choice in it`, () => {
    for (const bad of ['cancel', '', 3, null, undefined]) {
      expect(warehouseDecisionRefusal(bad, 'n')).toMatch(
        new RegExp(`^${DECISION_CHOICE_UNKNOWN}:`)
      );
    }
    for (const c of ['rent', 'pushOut', 'reduce'])
      expect(warehouseDecisionRefusal(c, undefined)).toBeNull();
  });

  it(`${DECISION_NOTE_REQUIRED}: fires for "accept" with no note or a blank one; passes with a note`, () => {
    expect(warehouseDecisionRefusal('accept', undefined)).toMatch(
      new RegExp(`^${DECISION_NOTE_REQUIRED}:`)
    );
    expect(warehouseDecisionRefusal('accept', '   ')).toMatch(
      new RegExp(`^${DECISION_NOTE_REQUIRED}:`)
    );
    expect(warehouseDecisionRefusal('accept', 'Peak week; the 3PL has no more space')).toBeNull();
  });
});

describe('the entity id', () => {
  it('round-trips a stream and week; refuses anything else', () => {
    expect(
      parseWarehouseDecisionId(warehouseDecisionEntityId('rawMaterial', '2026-10-12'))
    ).toEqual({ stream: 'rawMaterial', weekStart: '2026-10-12' });
    for (const bad of [
      'finishedGoods|2026-10-12',
      'packaging|W42',
      'packaging',
      'packaging|2026-10-12|x',
      'zzz-no-such-entity-0000'
    ]) {
      expect(parseWarehouseDecisionId(bad)).toBeNull();
    }
  });
});

describe('the ledger reads', () => {
  const rows = [
    {
      id: 'wd-1',
      stream: /** @type {const} */ ('packaging'),
      weekStart: '2026-10-12',
      planVersion: 3
    },
    {
      id: 'wd-2',
      stream: /** @type {const} */ ('rawMaterial'),
      weekStart: '2026-10-12',
      planVersion: 3
    },
    {
      id: 'wd-3',
      stream: /** @type {const} */ ('packaging'),
      weekStart: '2026-10-12',
      planVersion: 4
    }
  ];

  it('the latest record of a stream × week is in force; earlier ones are kept, latest first', () => {
    expect(decisionInForce(rows, 'packaging', '2026-10-12')?.id).toBe('wd-3');
    expect(decisionInForce(rows, 'rawMaterial', '2026-10-12')?.id).toBe('wd-2');
    expect(decisionInForce(rows, 'packaging', '2026-10-19')).toBeNull();
    expect(earlierDecisions(rows, 'packaging', '2026-10-12').map((r) => r.id)).toEqual(['wd-1']);
  });

  it('a decision made against an older plan version is marked; one against the current is not', () => {
    expect(madeOnOlderPlan(rows[0], 4)).toBe(true);
    expect(madeOnOlderPlan(rows[2], 4)).toBe(false);
    expect(madeOnOlderPlan({ ...rows[0], planVersion: null }, 1)).toBe(true);
    expect(madeOnOlderPlan(rows[0], null)).toBe(false);
  });
});
