// TL-D28 (owner, 2026-11-02): "In Transit" counts POs in delivery and not yet
// fully delivered. A Confirmed PO has not started delivery, so it is not counted;
// a Partially delivered one is.
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { POStatus } from '@services/data/types';
import { useOrdersWorklist } from './useOrdersWorklist';

/** @param {string} status */
const po = (status) =>
  /** @type {any} */ ({
    id: status,
    status,
    orderDate: '2026-10-01',
    daysOverdue: 0,
    supplierId: 'sup-1'
  });

describe('TL-D28 — the In Transit KPI', () => {
  it('counts Partially delivered POs and not Confirmed ones', () => {
    const orders = [
      po(POStatus.CONFIRMED),
      po(POStatus.PARTIALLY_DELIVERED),
      po(POStatus.PARTIALLY_DELIVERED),
      po(POStatus.DELIVERED)
    ];
    const { result } = renderHook(() =>
      useOrdersWorklist({
        orders,
        suppliersQuery: /** @type {any} */ ({ data: { items: [] } }),
        nowIso: '2026-11-02',
        group: /** @type {any} */ ('all'),
        range: /** @type {any} */ ('all'),
        search: ''
      })
    );
    expect(result.current.kpis.inTransit).toBe(2);
  });
});
