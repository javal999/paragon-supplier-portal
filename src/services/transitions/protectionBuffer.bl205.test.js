// BL-205 — protection buffer (DRC-9c), [Proposed] awaiting owner review (C3).
// CEILING(uplift, MPQ), uplift = max(0, LTP − average LTP of the 3 months
// before), levels 5–7 only, switch `protectionUplift` ('rollingBaseline' | 'off').

import { describe, expect, it } from 'vitest';
import {
  PROTECTION_BUFFER_RULES,
  PROTECTION_UPLIFTS,
  protectionBufferRows,
  protectionExclusion,
  protectionMonth
} from './drcBufferRules';
import { allCommitmentLines } from '../data/mock/forecastReadModel';
import { protectionBufferInputs } from '../data/mock/protectionBufferReadModel';
import { engineDataset } from '../data/mock/fixtures/engineDataset';
import { osipLevelStore } from '../data/mock/stores/osipLevelStore';
import { NO_PERSON } from '@context/noPerson';
/** @import { NamedLtpLine, ProtectionBufferInput } from './drcBufferRules' */

/**
 * A monthly LTP line.
 * @param {string} month YYYY-MM
 * @param {number} qty
 * @returns {NamedLtpLine}
 */
const monthly = (month, qty) => {
  const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0))
    .toISOString()
    .slice(0, 10);
  return {
    supplierId: 'sup-A',
    supplierName: 'Supplier A',
    materialCode: 'RM-X',
    materialLabel: 'RM-X',
    uom: 'KG',
    periodStart: `${month}-01`,
    periodEnd: last,
    forecastQty: qty
  };
};

// Worked by hand: three months at 100, then 160 → uplift 60 → CEILING(60, 25) = 75.
const HAND = [
  monthly('2027-01', 100),
  monthly('2027-02', 100),
  monthly('2027-03', 100),
  monthly('2027-04', 160)
];

/**
 * @param {number} level
 * @param {number | null} [mpq]
 * @returns {ProtectionBufferInput[]}
 */
const inputAt = (level, mpq = 25) => [
  { supplierId: 'sup-A', materialCode: 'RM-X', level, levelSource: 'planner', mpq }
];

describe('DRC-9c protection buffer [Proposed BL-205, C3]', () => {
  it('the proposed variant is the default and both variants are listed', () => {
    expect(PROTECTION_BUFFER_RULES.protectionUplift).toBe('rollingBaseline');
    expect(PROTECTION_UPLIFTS).toEqual(['rollingBaseline', 'off']);
    expect(PROTECTION_BUFFER_RULES.levels).toEqual([5, 6, 7]);
    expect(PROTECTION_BUFFER_RULES.baselineMonths).toBe(3);
  });

  it('worked by hand: 100, 100, 100 then 160 → uplift 60 → 75 at MPQ 25', () => {
    const m = protectionMonth(HAND, 'sup-A', 'RM-X', '2027-04', 25);
    expect(m.baseline).toBe(100);
    expect(m.uplift).toBe(60);
    expect(m.buffer).toBe(75);
    expect(m.status).toBe('ok');
    // The same figure through the rows, at level 5.
    const [row] = protectionBufferRows(HAND, inputAt(5));
    expect(row.applies).toBe(true);
    const april = row.months.find((x) => x.month === '2027-04');
    expect(april?.buffer).toBe(75);
  });

  it('LTP below the baseline gives 0', () => {
    const lines = [...HAND.slice(0, 3), monthly('2027-04', 70)];
    const m = protectionMonth(lines, 'sup-A', 'RM-X', '2027-04', 25);
    expect(m.uplift).toBe(0);
    expect(m.buffer).toBe(0);
  });

  it('level 4 gives none; level 5 gives a figure; 6 and 7 carry one; 1–3 take the strategic buffer', () => {
    const [four] = protectionBufferRows(HAND, inputAt(4));
    expect(four.applies).toBe(false);
    expect(four.reason).toBe('level4');
    expect(four.months).toEqual([]);
    const [five] = protectionBufferRows(HAND, inputAt(5));
    expect(five.applies).toBe(true);
    expect(five.months.map((m) => m.buffer)).toEqual([null, null, null, 75]);
    expect(protectionExclusion(6)).toBeNull();
    expect(protectionExclusion(7)).toBeNull();
    for (const l of [1, 2, 3]) expect(protectionExclusion(l)).toBe('strategicLevel');
  });

  it("'off' gives none, at any level", () => {
    const off = { ...PROTECTION_BUFFER_RULES, protectionUplift: /** @type {const} */ ('off') };
    for (const level of [4, 5, 6, 7]) {
      const [row] = protectionBufferRows(HAND, inputAt(level), { rules: off });
      expect(row.applies).toBe(false);
      expect(row.reason).toBe('switchedOff');
      expect(row.months).toEqual([]);
    }
  });

  it('the first months have an incomplete baseline; no MPQ gives the uplift but no figure', () => {
    const jan = protectionMonth(HAND, 'sup-A', 'RM-X', '2027-01', 25);
    expect(jan.status).toBe('baselineIncomplete');
    expect(jan.buffer).toBeNull();
    const noMpq = protectionMonth(HAND, 'sup-A', 'RM-X', '2027-04', null);
    expect(noMpq.status).toBe('noMpq');
    expect(noMpq.uplift).toBe(60);
    expect(noMpq.buffer).toBeNull();
  });

  it('a pair with no input sits at [Default C2] level 4 and carries none', () => {
    const [row] = protectionBufferRows(HAND, []);
    expect(row.level).toBe(4);
    expect(row.levelSource).toBe('default');
    expect(row.reason).toBe('level4');
  });
});

describe('BL-205 read model — level and MPQ per source', () => {
  it('MPQ is the source orderMultiple and the level is the one in force', () => {
    const src = engineDataset().sources[0];
    osipLevelStore.reset();
    try {
      const before = protectionBufferInputs().find(
        (i) => i.supplierId === src.supplierId && i.materialCode === src.materialCode
      );
      expect(before?.mpq).toBe(src.orderMultiple);
      expect(before?.level).toBe(4);
      expect(before?.levelSource).toBe('default');
      osipLevelStore.append({
        materialCode: src.materialCode,
        level: 5,
        previous: 4,
        source: 'planner',
        setAt: '2026-10-19T00:00:00.000Z',
        setBy: NO_PERSON
      });
      const after = protectionBufferInputs().find(
        (i) => i.supplierId === src.supplierId && i.materialCode === src.materialCode
      );
      expect(after?.level).toBe(5);
      expect(after?.levelSource).toBe('planner');
    } finally {
      osipLevelStore.reset();
    }
  });

  it('on the live LTP, every row at the default level carries none (control: rows exist)', () => {
    const rows = protectionBufferRows(allCommitmentLines(null), protectionBufferInputs());
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.reason === 'level4')).toBe(true);
  });
});
