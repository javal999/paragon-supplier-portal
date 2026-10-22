/** @import { GoodsReceipt } from '@services/data/types' */
/** @import { DateFilter, GroupTab } from '../const' */
import { useMemo } from 'react';
import { drilledPoNumber, usePoDrillFilter } from '../../orders/PoDrillFilter';
import { receiptsForPo } from '../../orders/orderSummaryModel';
import { TODAY } from '../const';
import { isInRange, matchesGroup, totals } from '../utils';
import { grStatusNeedsAction } from '../../widgets/buyerDerivations';

/**
 * @typedef {object} GoodsReceiptListInput
 * @property {GoodsReceipt[]} goodsReceipts The resolved read.
 * @property {GroupTab} tab The selected status tab.
 * @property {DateFilter} dateFilter The selected date chip.
 * @property {string} search The list search text.
 */

/**
 * Everything the receipt list derives from the read: the PO drill-through
 * filter (REQ-E07-03), the receipts in scope, the tab counts, the two computed
 * KPIs and the filtered rows. No state of its own. Moved out of
 * `BuyerGoodsReceipt.jsx`'s workspace by the Phase 5 page split (no behaviour
 * change; every memo keeps its dependency list).
 * @param {GoodsReceiptListInput} input
 */
export function useGoodsReceiptList({ goodsReceipts, tab, dateFilter, search }) {
  // No local seeded copy — the list re-derives from the invalidated query after
  // each command (the standardized mutation pattern).
  // REQ-E07-03 — the drill-through filter. `receiptsForPo` is the predicate the
  // summary counted with, so AC-10 holds by construction (BR-09 / BR-10).
  const drill = usePoDrillFilter();
  const drilledPo = drilledPoNumber(drill);
  const allGRs = useMemo(
    () => (drilledPo === null ? goodsReceipts : [...receiptsForPo(goodsReceipts, drilledPo)]),
    [goodsReceipts, drilledPo]
  );

  const counts = useMemo(() => {
    let pending = 0;
    let underInspection = 0;
    let approved = 0;
    let hold = 0;
    let rejected = 0;
    let posted = 0;
    for (const g of allGRs) {
      if (g.status === 'Pending Inspection') pending++;
      else if (g.status === 'Under Inspection') underInspection++;
      else if (g.status === 'Approved' || g.status === 'Partially Approved') approved++;
      else if (g.status === 'Quality Hold') hold++;
      else if (g.status === 'Rejected') rejected++;
      else if (g.status === 'Posted to SAP') posted++;
    }
    return {
      all: allGRs.length,
      action: allGRs.filter((g) => grStatusNeedsAction(g.status)).length,
      pending,
      underInspection,
      approved,
      hold,
      rejected,
      posted
    };
  }, [allGRs]);

  const approvedToday = useMemo(
    () =>
      allGRs.filter(
        (g) =>
          (g.status === 'Approved' || g.status === 'Partially Approved') && g.receivedDate === TODAY
      ).length,
    [allGRs]
  );

  const rejectionRate = useMemo(() => {
    let received = 0;
    let rejected = 0;
    for (const g of allGRs) {
      if (!isInRange(g.receivedDate, '30d')) continue;
      const t = totals(g.inspectionResults);
      received += t.received;
      rejected += t.rejected;
    }
    if (received === 0) return 0;
    return (rejected / received) * 100;
  }, [allGRs]);

  const filtered = useMemo(() => {
    return allGRs.filter((g) => {
      if (!matchesGroup(g.status, tab)) return false;
      if (!isInRange(g.receivedDate, dateFilter)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !g.grNumber.toLowerCase().includes(q) &&
          !g.asnNumber.toLowerCase().includes(q) &&
          !g.poNumber.toLowerCase().includes(q) &&
          !g.supplierName.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [allGRs, tab, dateFilter, search]);

  return { drill, drilledPo, allGRs, counts, approvedToday, rejectionRate, filtered };
}
