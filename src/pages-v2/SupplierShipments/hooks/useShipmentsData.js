import { useMemo } from 'react';
import { POStatus } from '@services/data/types';
import {
  useCurrentSupplier,
  usePurchaseOrders,
  useASNs,
  useCallOffs,
  useInventory
} from '@services/query/hooks';
/** @import { AsnStatus } from '@services/data/types' */
import { drilledPoNumber, usePoDrillFilter } from '../../orders/PoDrillFilter';
import { asnsForPo } from '../../orders/orderSummaryModel';
import { useCallOffViews } from '../../callOffs/callOffDisplay';
import { batchesByMaterial } from '../../shipments/asnLines';

/**
 * Every read the shipments page makes, and what it derives from them: the
 * supplier, its ASNs (all, and those a PO drill-through leaves visible), the
 * POs an ASN may ship against, call-offs, the batch picker's declared batches
 * and the per-status counts behind the KPI tiles.
 * @param {string | null | undefined} supplierId  The seat's supplier; without one there are no declared batches.
 */
export function useShipmentsData(supplierId) {
  const supplierQuery = useCurrentSupplier();
  const asnsQuery = useASNs();
  // REQ-E09-03 BR-06 — an ASN may ship a confirmed call-off on the chosen PO.
  const callOffsQuery = useCallOffs();
  // MR-6 BR-10 / BR-11 — the call-off projection the warnings read (which call-offs are open).
  const { views: callOffViewList } = useCallOffViews();
  // REQ-E07-04 — partial shipments: a PO stays shippable after a first receipt.
  const posQuery = usePurchaseOrders({
    status: [POStatus.CONFIRMED, POStatus.PARTIALLY_DELIVERED]
  });

  // MR-6 BR-01 — the supplier's own stock positions, for the batch picker. Not
  // a gate on the page: without them the batch is typed, as BR-04 allows.
  const inventoryQuery = useInventory();

  const mySupplier = supplierQuery.data ?? null;
  const asns = useMemo(() => asnsQuery.data?.items ?? [], [asnsQuery.data]);
  const declaredBatches = useMemo(
    () => (supplierId ? batchesByMaterial(supplierId, inventoryQuery.data?.items ?? [], asns) : {}),
    [supplierId, inventoryQuery.data, asns]
  );
  // REQ-E07-03 — the drill-through filter. A supplier addressing another
  // supplier's PO gets `notFound`: its own PO read never returned it (BR-06).
  const drill = usePoDrillFilter();
  const drilledPo = drilledPoNumber(drill);
  /**
   * The ASNs this page lists when a PO filter is in play — the SAME predicate
   * the summary counted with (BR-09), so AC-10 cannot drift.
   */
  const visibleAsns = useMemo(
    () => (drilledPo === null ? asns : [...asnsForPo(asns, drilledPo)]),
    [asns, drilledPo]
  );
  const SHIPPABLE_POS = useMemo(() => posQuery.data?.items ?? [], [posQuery.data]);
  const CONFIRMED_POS = useMemo(
    () => SHIPPABLE_POS.filter((po) => po.status === POStatus.CONFIRMED),
    [SHIPPABLE_POS]
  );

  const counts = useMemo(() => {
    /** @type {Record<AsnStatus, number>} */
    const base = {
      Draft: 0,
      Submitted: 0,
      'In Transit': 0,
      Delivered: 0,
      Discrepancy: 0,
      Cancelled: 0,
      'Awaiting exception': 0
    };
    for (const a of asns) base[a.status]++;
    return base;
  }, [asns]);

  return {
    supplierQuery,
    asnsQuery,
    callOffsQuery,
    callOffViewList,
    posQuery,
    mySupplier,
    asns,
    declaredBatches,
    drill,
    drilledPo,
    visibleAsns,
    SHIPPABLE_POS,
    CONFIRMED_POS,
    counts
  };
}
