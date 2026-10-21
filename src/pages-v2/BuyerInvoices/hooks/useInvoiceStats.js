/** @import { BuyerInvoice, BuyerInvoiceStatus as InvStatus, InvoiceMatchStatus as MatchStatus } from '@services/data/types' */
import { useMemo } from 'react';
import { formatDate } from '@lib/format';

/**
 * The page's figures over the (drilled) invoice list: counts and IDR sums per
 * status, counts per match status, the overdue and disputed lists for the
 * banners, and the latest received date for the meta line. Pure derivation,
 * no state. Moved out of `BuyerInvoices.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @param {BuyerInvoice[]} invoices
 */
export function useInvoiceStats(invoices) {
  const counts = useMemo(() => {
    /** @param {InvStatus} s */
    const by = (s) => invoices.filter((i) => i.status === s).length;
    return {
      all: invoices.length,
      pendingMatch: by('Pending Match'),
      approved: by('Approved'),
      released: by('Payment Released'),
      disputed: by('Disputed'),
      overdue: by('Overdue')
    };
  }, [invoices]);

  const sums = useMemo(() => {
    /** @param {(i: BuyerInvoice) => boolean} filter */
    const sum = (filter) => invoices.filter(filter).reduce((a, b) => a + b.amount, 0);
    return {
      pendingApproval: sum((i) => i.status === 'Pending Match' || i.status === 'Approved'),
      released: sum((i) => i.status === 'Payment Released'),
      disputed: sum((i) => i.status === 'Disputed'),
      overdue: sum((i) => i.status === 'Overdue')
    };
  }, [invoices]);

  const pendingApprovalCount = counts.pendingMatch + counts.approved;

  const matchCounts = useMemo(() => {
    /** @param {MatchStatus} m */
    const by = (m) => invoices.filter((i) => i.matchStatus === m).length;
    return {
      matched: by('Matched'),
      pendingGr: by('Pending GR'),
      qtyMismatch: by('Qty Mismatch'),
      priceVariance: by('Price Variance')
    };
  }, [invoices]);

  const overdueInvoices = useMemo(() => invoices.filter((i) => i.status === 'Overdue'), [invoices]);
  const disputedInvoices = useMemo(
    () => invoices.filter((i) => i.status === 'Disputed'),
    [invoices]
  );

  const lastUpdated = useMemo(() => {
    const latest = invoices.reduce(
      (acc, i) => (i.receivedDate > acc ? i.receivedDate : acc),
      invoices[0]?.receivedDate ?? ''
    );
    return formatDate(latest);
  }, [invoices]);

  return {
    counts,
    sums,
    pendingApprovalCount,
    matchCounts,
    overdueInvoices,
    disputedInvoices,
    lastUpdated
  };
}
