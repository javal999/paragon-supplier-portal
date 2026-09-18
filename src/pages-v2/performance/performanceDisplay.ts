// ─────────────────────────────────────────────────────────────────────────────
// The shared performance read (REQ-E10-01) — ONE rules module, ONE period.
//
// The scorecard, the analytics table and the supplier's own performance page
// all come through here, so the same supplier cannot carry three different OTIF
// figures on three screens. The period the user picks is passed INTO the
// computation (BR-08); it is not a label over a frozen number.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  useASNs,
  useCallOffs,
  useGoodsReceipts,
  usePurchaseOrders,
} from '../../services/query/hooks';
import { sdcClock } from '../../services/sdc';
import {
  portfolioMeasure,
  supplierMeasure,
  type PerformanceInput,
  type PerformancePeriod,
  type SupplierMeasure,
} from '../../services/data/performanceRules';

export interface PerformanceRead {
  readonly input: PerformanceInput;
  readonly nowIso: string;
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly error: unknown;
  readonly refetch: () => void;
  /** One supplier's measures for the chosen period. */
  readonly forSupplier: (supplierId: string) => SupplierMeasure;
  /** Every supplier's call-offs and orders taken together. */
  readonly portfolio: SupplierMeasure;
}

/**
 * The measured inputs for the current scope. A supplier scope only ever reads
 * its own call-offs, orders and receipts, so the same call computes that
 * supplier's own performance without a second code path.
 */
export function usePerformance(period: PerformancePeriod): PerformanceRead {
  const callOffs = useCallOffs();
  const asns = useASNs();
  const receipts = useGoodsReceipts();
  const pos = usePurchaseOrders();
  const nowIso = sdcClock.now();

  const input = React.useMemo<PerformanceInput>(
    () => ({
      callOffs: callOffs.data?.items ?? [],
      asns: asns.data?.items ?? [],
      receipts: receipts.data?.items ?? [],
      purchaseOrders: pos.data?.items ?? [],
    }),
    [callOffs.data, asns.data, receipts.data, pos.data],
  );

  const cache = React.useMemo(() => new Map<string, SupplierMeasure>(), [input, period, nowIso]);

  return {
    input,
    nowIso,
    isPending: callOffs.isPending || asns.isPending || receipts.isPending || pos.isPending,
    isError: callOffs.isError || asns.isError || receipts.isError || pos.isError,
    error: callOffs.error ?? asns.error ?? receipts.error ?? pos.error,
    refetch: () => {
      callOffs.refetch();
      asns.refetch();
      receipts.refetch();
      pos.refetch();
    },
    forSupplier: (supplierId: string) => {
      const hit = cache.get(supplierId);
      if (hit) return hit;
      const measure = supplierMeasure(supplierId, input, period, nowIso);
      cache.set(supplierId, measure);
      return measure;
    },
    portfolio: portfolioMeasure(input, period, nowIso),
  };
}
