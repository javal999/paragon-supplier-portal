// ────────────────────────────────────────────────────────────────────────────
// S-02 (RFx UX 2026-10) — `tieredDraftProblems` lists EVERY gap of the quote
// grid at once. Probed both ways against the one gate, `readTieredDraft`: a
// grid it finds complete is one the verb's rule accepts, and every gap it
// names is one the rule refuses on its own.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { tiersForItem } from '@services/sourcing/rfqModel';
import {
  emptyTieredDraft,
  newExtraCost,
  readTieredDraft,
  tieredDraftProblems
} from './tieredQuoteModel';
/** @import { TieredDraft } from './tieredQuoteModel' */
/** @import { RFQ } from '@data/mockRfqs' */

beforeEach(() => rfqStore.reset());

const oslo = () => /** @type {RFQ} */ (rfqStore.get('rfq-021'));

/**
 * A grid every rule accepts.
 * @param {RFQ} rfq
 * @returns {TieredDraft}
 */
const complete = (rfq) => {
  const base = emptyTieredDraft(rfq);
  return {
    ...base,
    validUntil: '2026-12-31',
    canSample: true,
    sampleReadyDate: '2026-11-02',
    answers: Object.fromEntries(
      (rfq.questions ?? []).map((q) => [
        q.id,
        { questionId: q.id, value: q.type === 'date' ? '2026-11-02' : 'yes' }
      ])
    ),
    items: base.items.map((d) => {
      const item = /** @type {NonNullable<RFQ['items']>} */ (rfq.items).find(
        (i) => i.lineNo === d.lineNo
      );
      if (!item) return d;
      return {
        ...d,
        specValues: Object.fromEntries(
          item.specFields
            .filter((f) => f.filledBy === 'supplier')
            .map((f) => [
              f.key,
              f.kind === 'choice' ? (f.options ?? [])[0] : f.kind === 'number' ? '1' : 'x'
            ])
        ),
        prices: Object.fromEntries(tiersForItem(rfq, item).map((tier) => [tier.qty, '100'])),
        leadTimeDays: '21',
        requestedCosts: Object.fromEntries((item.oneTimeCosts ?? []).map((id) => [id, '0']))
      };
    })
  };
};

/**
 * @param {TieredDraft} draft
 * @param {number} lineNo
 * @param {Partial<TieredDraft['items'][number]>} patch
 * @returns {TieredDraft}
 */
const onItem = (draft, lineNo, patch) => ({
  ...draft,
  items: draft.items.map((d) => (d.lineNo === lineNo ? { ...d, ...patch } : d))
});

/** @param {TieredDraft} draft */
const gate = (draft) => readTieredDraft(oslo(), 'sup-007', draft, (id) => id);

describe('tieredDraftProblems — every gap, at once', () => {
  it('KNOWN-GOOD: a complete grid has no gap, and the verb rule accepts it', () => {
    const draft = complete(oslo());
    expect(tieredDraftProblems(oslo(), draft)).toEqual([]);
    expect(gate(draft).ok).toBe(true);
  });

  it('a blank grid names every field at once, not the first one only', () => {
    const problems = tieredDraftProblems(oslo(), emptyTieredDraft(oslo()));
    const anchors = problems.map((p) => p.anchor);
    // Both items' prices, lead times and costs, the validity, the questions
    // and the sample question — in one list.
    expect(anchors).toContain('grid-item-1-price-3000');
    expect(anchors).toContain('grid-item-2-price-50000');
    expect(anchors).toContain('grid-item-2-lead');
    expect(anchors).toContain('grid-item-1-cost-dieCutPlate');
    expect(anchors).toContain('grid-valid-until');
    expect(anchors).toContain('grid-q-q-sample-ready');
    expect(anchors).toContain('grid-sample');
    expect(problems.every((p) => p.missing)).toBe(true);
    expect(gate(emptyTieredDraft(oslo())).ok).toBe(false);
  });

  /** @type {[string, (d: TieredDraft) => TieredDraft, string, boolean][]} */
  const GAPS = [
    [
      'a missing price',
      (d) => onItem(d, 1, { prices: { ...d.items[0].prices, 50000: '' } }),
      'grid-item-1-price-50000',
      true
    ],
    [
      'an unreadable price',
      (d) => onItem(d, 1, { prices: { ...d.items[0].prices, 3000: '1.500' } }),
      'grid-item-1-price-3000',
      false
    ],
    ['a missing lead time', (d) => onItem(d, 2, { leadTimeDays: '' }), 'grid-item-2-lead', true],
    ['a zero lead time', (d) => onItem(d, 2, { leadTimeDays: '0' }), 'grid-item-2-lead', false],
    ['an unreadable minimum', (d) => onItem(d, 1, { moq: 'abc' }), 'grid-item-1-moq', false],
    [
      'a blank requested cost',
      (d) => onItem(d, 1, { requestedCosts: { dieCutPlate: '0' } }),
      'grid-item-1-cost-printingPlate',
      true
    ],
    ['a missing validity', (d) => ({ ...d, validUntil: '' }), 'grid-valid-until', true],
    [
      'an unanswered sample question',
      (d) => ({ ...d, canSample: null, sampleReadyDate: '' }),
      'grid-sample',
      true
    ],
    ['a Yes with no ready date', (d) => ({ ...d, sampleReadyDate: '' }), 'grid-sample-date', true]
  ];
  it.each(GAPS)(
    'KNOWN-BAD: %s is named on its own field, and the verb rule refuses it too',
    (_name, mutate, anchor, missing) => {
      const draft = mutate(complete(oslo()));
      const problems = tieredDraftProblems(oslo(), draft);
      expect(problems).toEqual([expect.objectContaining({ anchor, missing })]);
      expect(gate(draft).ok).toBe(false);
    }
  );

  it('an added cost with an amount and no name is named; a blank added row is not', () => {
    const blankRow = onItem(complete(oslo()), 1, { extraCosts: [newExtraCost()] });
    expect(tieredDraftProblems(oslo(), blankRow)).toEqual([]);
    const row = newExtraCost('', '5000');
    const unnamed = onItem(complete(oslo()), 1, { extraCosts: [row] });
    expect(tieredDraftProblems(oslo(), unnamed).map((p) => p.anchor)).toEqual([
      `grid-item-1-extra-${row.id}`
    ]);
    expect(gate(unnamed).ok).toBe(false);
  });

  it('S-06 — with the sample date asked by a buyer question, a missing date points at that question', () => {
    const draft = { ...complete(oslo()), sampleReadyDate: '' };
    expect(tieredDraftProblems(oslo(), draft, 'q-sample-ready').map((p) => p.anchor)).toEqual([
      'grid-q-q-sample-ready'
    ]);
  });
});
