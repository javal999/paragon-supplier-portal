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
  useUpdateCompliance
} from '@services/query/hooks';
import { sdcClock } from '@services/sdc';
/** @import { PerformanceInput, PerformancePeriod, SupplierMeasure } from '@services/data/performanceRules' */
import { portfolioMeasure, supplierMeasure } from '@services/data/performanceRules';

/**
 * `forSupplier`:  One supplier's measures for the chosen period.
 * `portfolio`:  Every supplier's call-offs and orders taken together.
 *
 * @typedef {{
 *     readonly input: PerformanceInput;
 *     readonly nowIso: string;
 *     readonly isPending: boolean;
 *     readonly isError: boolean;
 *     readonly error: unknown;
 *     readonly refetch: () => void;
 *     readonly forSupplier: (supplierId: string) => SupplierMeasure;
 *     readonly portfolio: SupplierMeasure;
 *   }} PerformanceRead
 */

/**
 * The measured inputs for the current scope. A supplier scope only ever reads
 * its own call-offs, orders and receipts, so the same call computes that
 * supplier's own performance without a second code path.
 * @param {PerformancePeriod} period
 * @returns {PerformanceRead}
 */
export function usePerformance(period) {
  const callOffs = useCallOffs();
  const asns = useASNs();
  const receipts = useGoodsReceipts();
  const pos = usePurchaseOrders();
  // Material B3 (AR-09) — the update compliance the mock path computes, read
  // once and handed to the SAME `supplierMeasure`, so both paths blend it alike.
  const compliance = useUpdateCompliance();
  const nowIso = sdcClock.now();

  const input = /** @type {PerformanceInput} */ (
    React.useMemo(() => {
      const byId = new Map((compliance.data?.items ?? []).map((c) => [c.supplierId, c]));
      return {
        callOffs: callOffs.data?.items ?? [],
        asns: asns.data?.items ?? [],
        receipts: receipts.data?.items ?? [],
        purchaseOrders: pos.data?.items ?? [],
        /** @param {string} supplierId */
        updateCompliance: (supplierId) => byId.get(supplierId) ?? null
      };
    }, [callOffs.data, asns.data, receipts.data, pos.data, compliance.data])
  );

  const cache = React.useMemo(
    () => /** @type {Map<string, SupplierMeasure>} */ (new Map()),
    [input, period, nowIso]
  );

  return {
    input,
    nowIso,
    isPending:
      callOffs.isPending ||
      asns.isPending ||
      receipts.isPending ||
      pos.isPending ||
      compliance.isPending,
    isError:
      callOffs.isError || asns.isError || receipts.isError || pos.isError || compliance.isError,
    error: callOffs.error ?? asns.error ?? receipts.error ?? pos.error ?? compliance.error,
    refetch: () => {
      callOffs.refetch();
      asns.refetch();
      receipts.refetch();
      pos.refetch();
      compliance.refetch();
    },
    /** @param {string} supplierId */
    forSupplier: (supplierId) => {
      const hit = cache.get(supplierId);
      if (hit) return hit;
      const measure = supplierMeasure(supplierId, input, period, nowIso);
      cache.set(supplierId, measure);
      return measure;
    },
    portfolio: portfolioMeasure(input, period, nowIso)
  };
}
