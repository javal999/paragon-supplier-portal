// ─────────────────────────────────────────────────────────────────────────────
// UCX-P4 v2 (BL-365) — the weekly page's pure rules.
//
// The ruling this file pins (UCX-D17): "nothing changed" carries ONLY the DA,
// the due POs and the Foresight periods. Stock needs a confirmed figure each
// week, one confirmation per material, and capacity shows the date of its last
// change. A rule that started carrying stock or capacity would be a business
// change, not a refactor — so it is asserted by name.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  WEEKLY_CARRIED_KINDS,
  capacityLastChanged,
  carriedForwardItems,
  feedstockApplies,
  lastConfirmedAt,
  materialConfirmed,
  publishedMaterialsOf,
  weeklyProgress
} from './weeklyConfirmationRules';

describe('UCX-D17 · what a week-level confirmation carries', () => {
  it('carries the DA, the due POs and the Foresight periods, in that order', () => {
    expect(carriedForwardItems({ duePurchaseOrderCount: 2, foresightCount: 3 })).toEqual([
      { kind: 'demandAnticipation', count: null },
      { kind: 'purchaseOrders', count: 2 },
      { kind: 'foresight', count: 3 }
    ]);
  });

  it('never carries stock, in production, feedstock or capacity', () => {
    const kinds = carriedForwardItems({ duePurchaseOrderCount: 0, foresightCount: 0 }).map(
      (i) => i.kind
    );
    expect(kinds).toEqual([...WEEKLY_CARRIED_KINDS]);
    for (const forbidden of ['stock', 'inProduction', 'feedstock', 'capacity']) {
      expect(kinds).not.toContain(forbidden);
    }
  });

  it('a week with no POs and no Foresight still carries only the three named items', () => {
    expect(
      carriedForwardItems({ duePurchaseOrderCount: 0, foresightCount: 0 }).map((i) => i.count)
    ).toEqual([null, 0, 0]);
  });
});

describe('UCX-P4 · Last confirmed and Last changed', () => {
  it('Last confirmed is the later of the stock and feedstock halves', () => {
    expect(lastConfirmedAt('2026-08-27T02:00:00.000Z', '2026-08-29T06:00:00.000Z')).toBe(
      '2026-08-29T06:00:00.000Z'
    );
    expect(lastConfirmedAt('2026-08-30T02:00:00.000Z', '2026-08-13T02:00:00.000Z')).toBe(
      '2026-08-30T02:00:00.000Z'
    );
  });

  it('Last confirmed is null when neither half exists', () => {
    expect(lastConfirmedAt(null, null)).toBe(null);
    expect(lastConfirmedAt(undefined, '')).toBe(null);
  });

  it('Last changed is the capacity submission time, null when never submitted', () => {
    expect(
      capacityLastChanged({
        latest: {
          id: 'cap-1',
          supplierId: 'sup-007',
          planningGroupId: 'pg-MG-20',
          submittedAt: '2026-08-29T04:00:00.000Z',
          weeks: []
        }
      })
    ).toBe('2026-08-29T04:00:00.000Z');
    expect(capacityLastChanged({ latest: null })).toBe(null);
  });
});

describe('UCX-D17 · one confirmation per material each week', () => {
  it('a packaging material needs BOTH its stock and its feedstock in the cycle', () => {
    expect(
      materialConfirmed({ stockUpdated: true, feedstockUpdated: true, feedstockApplies: true })
    ).toBe(true);
    expect(
      materialConfirmed({ stockUpdated: true, feedstockUpdated: false, feedstockApplies: true })
    ).toBe(false);
    expect(
      materialConfirmed({ stockUpdated: false, feedstockUpdated: true, feedstockApplies: true })
    ).toBe(false);
  });

  it('a raw material has no feedstock half, so stock alone confirms it', () => {
    expect(
      materialConfirmed({ stockUpdated: true, feedstockUpdated: false, feedstockApplies: false })
    ).toBe(true);
  });

  it('feedstock applies to packaging (VERP) only', () => {
    expect(feedstockApplies({ materialType: 'VERP' })).toBe(true);
    expect(feedstockApplies({ materialType: 'ROH' })).toBe(false);
  });

  it('the counter counts each material once, never a carried carry-forward', () => {
    const positions = [
      { materialCode: 'A', materialType: /** @type {const} */ ('VERP') },
      { materialCode: 'B', materialType: /** @type {const} */ ('VERP') },
      { materialCode: 'C', materialType: /** @type {const} */ ('ROH') }
    ];
    // A: both halves; B: stock only (feedstock missing); C: stock only (no feedstock half).
    expect(
      weeklyProgress({
        positions,
        stockUpdated: ['A', 'B', 'C'],
        feedstockUpdated: ['A']
      })
    ).toEqual({ confirmed: 2, total: 3 });
    // No stock update carries nothing forward.
    expect(weeklyProgress({ positions, stockUpdated: [], feedstockUpdated: ['A'] })).toEqual({
      confirmed: 0,
      total: 3
    });
  });

  it('the page names only the publication’s materials the supplier holds', () => {
    expect(publishedMaterialsOf(['A', 'B', 'Z'], ['A', 'B', 'C'])).toEqual(['A', 'B']);
    expect(publishedMaterialsOf(['Z'], ['A', 'B'])).toEqual([]);
  });
});
