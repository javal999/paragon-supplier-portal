/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { useSuppliers } from '@services/query/hooks' */
/** @import { GroupTab, RangeFilter } from '../const' */
import { useMemo } from 'react';
import { isEscalated } from '@services/data/poResponseProjection';
import { POStatus } from '@services/data/types';
import {
  PENDING_STATUSES,
  CONFIRMED_STATUSES,
  TRANSIT_STATUSES,
  DELIVERED_STATUSES,
  CLOSED_STATUSES,
  DAY_MS
} from '../const';
import { matchesGroup, isOpen, isOverdue } from '../utils';

/**
 * The PO worklist's derived figures: the supplier-country join, the latest
 * order date (meta line and range anchor), the per-tab counts, the four KPIs
 * and the filtered rows for the current tab, range and search. Pure derivation,
 * no state. Moved out of `BuyerOrders.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @param {object} args
 * @param {PurchaseOrder[]} args.orders  The PO read's rows.
 * @param {ReturnType<typeof useSuppliers>} args.suppliersQuery  The suppliers read, for country flags.
 * @param {string} args.nowIso  The orders clock (`ordersNow()`).
 * @param {GroupTab} args.group  The selected tab.
 * @param {RangeFilter} args.range  The selected order-date range.
 * @param {string} args.search  The search text.
 */
export function useOrdersWorklist({ orders, suppliersQuery, nowIso, group, range, search }) {
  // Country flags are a cosmetic cross-supplier join — best-effort off the
  // suppliers list (empty for a supplier persona; the page still renders).
  const supplierCountryById = useMemo(
    () => new Map((suppliersQuery.data?.items ?? []).map((s) => [s.id, s.country])),
    [suppliersQuery.data]
  );

  const maxOrderDate = useMemo(() => {
    return orders.reduce(
      (acc, po) => (po.orderDate > acc ? po.orderDate : acc),
      orders[0]?.orderDate ?? ''
    );
  }, [orders]);

  const counts = useMemo(() => {
    return {
      all: orders.length,
      escalated: orders.filter((p) => isEscalated(p, nowIso)).length,
      review: orders.filter((p) => p.status === POStatus.ADJUSTED).length,
      rejected: orders.filter((p) => p.status === POStatus.REJECTED).length,
      pending: orders.filter((p) => PENDING_STATUSES.includes(p.status)).length,
      confirmed: orders.filter((p) => CONFIRMED_STATUSES.includes(p.status)).length,
      transit: orders.filter((p) => TRANSIT_STATUSES.includes(p.status)).length,
      delivered: orders.filter((p) => DELIVERED_STATUSES.includes(p.status)).length,
      closed: orders.filter((p) => CLOSED_STATUSES.includes(p.status)).length
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const kpis = useMemo(() => {
    const open = orders.filter((p) => isOpen(p.status));
    const pendingConfirmation = orders.filter((p) => PENDING_STATUSES.includes(p.status));
    const inTransit = orders.filter(
      (p) => p.status === POStatus.CONFIRMED || p.status === POStatus.PARTIALLY_DELIVERED
    );
    const overdue = orders.filter(isOverdue);
    return {
      open: open.length,
      pendingConfirmation: pendingConfirmation.length,
      inTransit: inTransit.length,
      overdue: overdue.length
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const refDate = new Date(maxOrderDate || nowIso);
    const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : null;
    const cutoff = rangeDays ? new Date(refDate.getTime() - rangeDays * DAY_MS) : null;

    return orders.filter((po) => {
      if (!matchesGroup(po, group, nowIso)) return false;
      if (cutoff && new Date(po.orderDate) < cutoff) return false;
      if (search) {
        const q = search.toLowerCase();
        const matMatch = po.lineItems.some(
          (li) =>
            li.materialCode.toLowerCase().includes(q) || li.description.toLowerCase().includes(q)
        );
        const hay = `${po.poNumber} ${po.supplierName}`.toLowerCase();
        if (!hay.includes(q) && !matMatch) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, group, range, search, maxOrderDate]);

  return { supplierCountryById, maxOrderDate, counts, kpis, filtered };
}
