// ────────────────────────────────────────────────────────────────────────────
// Material B4 — the pure halves: the pill (MR-2 BR-04) and the compliance
// cause of the one reason rule (AR-10, MR-2 BR-06, BR-07). Pure: no store.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
/** @import { AwardItem } from './awardShape' */
import { awardReasonOwed, awardReasonRefusal } from './awardShape';
import { compliancePill, isComplianceFlagged } from '../transitions/updateCompliance';
/** @import { AwardLine } from './types' */

const T = { warnPct: 80, flagPct: 60 };

describe('MR-2 BR-04 — the pill', () => {
  it.each(
    /** @type {const} */ ([
      [100, 'plain'],
      [80, 'plain'],
      [79, 'amber'],
      [60, 'amber'],
      [59, 'red'],
      [0, 'red'],
      [null, 'noHistory']
    ])
  )('%s%% reads %s', (pct, pill) => {
    expect(compliancePill(pct, T)).toBe(pill);
  });

  it('BR-06 — flagged below flagPct only; "No history" never', () => {
    expect(isComplianceFlagged(59, 60)).toBe(true);
    expect(isComplianceFlagged(60, 60)).toBe(false);
    expect(isComplianceFlagged(79, 60)).toBe(false);
    expect(isComplianceFlagged(null, 60)).toBe(false);
  });
});

/**
 * @param {number} lineNo
 * @returns {AwardItem}
 */
const itemOf = (lineNo) => ({
  key: String(lineNo),
  name: `item ${lineNo}`,
  lineNo,
  itemCode: '',
  tiered: true,
  breaks: [{ qty: 1_000, pieces: 1_000 }],
  priced: () => true
});
const ITEMS = [itemOf(1), itemOf(2)];
/**
 * @param {string} supplierId
 * @param {string} quotationId
 * @param {number} lineNo
 * @param {number} sharePct
 * @returns {AwardLine}
 */
const line = (supplierId, quotationId, lineNo, sharePct) => ({
  supplierId,
  quotationId,
  itemCode: '',
  itemLineNo: lineNo,
  sharePct,
  quantity: sharePct * 10,
  awardTierQty: 1_000
});
/** q-a (sup-a) is best on both items. */
const bestOf = () => 'q-a';
const LINES = [
  line('sup-a', 'q-a', 1, 100),
  line('sup-a', 'q-a', 2, 70),
  line('sup-b', 'q-b', 2, 30)
];
/** @param {string} sid */
const flaggedB = (sid) => sid === 'sup-b';

describe('AR-10 — the compliance cause of the one reason rule', () => {
  it('names each item a flagged supplier holds a share of, and only those', () => {
    const owed = awardReasonOwed({
      items: ITEMS,
      lines: LINES,
      always: false,
      bestOf,
      flagged: flaggedB
    });
    expect(owed.owed).toBe(true);
    expect(owed.departing).toEqual([]);
    expect(owed.flagged.map((f) => [f.item.name, f.supplierIds])).toEqual([['item 2', ['sup-b']]]);
    expect(awardReasonRefusal(owed, '')).toEqual({
      code: 'AWARD_REASON_COMPLIANCE_FLAG',
      item: 'item 2',
      detail: 'sup-b'
    });
    expect(awardReasonRefusal(owed, 'a reason')).toBeNull();
  });

  it('KNOWN-GOOD twin — nobody flagged, the best followed: no reason owed', () => {
    const owed = awardReasonOwed({
      items: ITEMS,
      lines: LINES,
      always: false,
      bestOf,
      flagged: () => false
    });
    expect(owed.owed).toBe(false);
    expect(awardReasonRefusal(owed, '')).toBeNull();
  });

  it('a departed best score is stated first (AWARD_REASON_REQUIRED), the flag rides along', () => {
    const owed = awardReasonOwed({
      items: ITEMS,
      lines: LINES,
      always: false,
      bestOf: () => 'q-z',
      flagged: flaggedB
    });
    expect(owed.flagged).toHaveLength(1);
    expect(awardReasonRefusal(owed, '')).toEqual({ code: 'AWARD_REASON_REQUIRED', item: 'item 1' });
  });

  it('an RFP (always) keeps its own AWARD_REASON_REQUIRED even with a flagged supplier', () => {
    const owed = awardReasonOwed({ items: ITEMS, lines: LINES, always: true, flagged: flaggedB });
    expect(owed.flagged).toHaveLength(1);
    expect(awardReasonRefusal(owed, '')).toEqual({ code: 'AWARD_REASON_REQUIRED' });
  });
});
