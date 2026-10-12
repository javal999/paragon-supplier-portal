// ────────────────────────────────────────────────────────────────────────────
// BuyerGoodsReceipt — pure helpers (no React).
//
// Moved out of `BuyerGoodsReceipt.jsx` by the Phase 5 page split (no behaviour
// change). `buildTimeline` was a closure inside the workspace; it now takes the
// two translators it closed over (`t`, `el`) as arguments.
// ────────────────────────────────────────────────────────────────────────────

/** @import { TFunction } from 'i18next' */
/** @import { TimelineEvent } from '@components/ui-v2/Timeline' */
/** @import { useEnumLabel } from '@hooks/useEnumLabel' */
/** @import { GoodsReceipt, GRStatus, InspectionResult } from '@services/data/types' */
/** @import { DateFilter, GroupTab } from './const' */
import { DAY_MS, TODAY } from './const';

/**
 * A quantity or count in Indonesian grouping (`1.250`).
 * @param {number} n
 * @returns {string}
 */
export const formatNumber = (n) => new Intl.NumberFormat('id-ID').format(n);

/**
 * A receipt date as `20 May 2026`, or an em dash when there is none.
 * @param {string} [iso]
 * @returns {string}
 */
export const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const todayMs = new Date(TODAY).getTime();
/**
 * Whether a received date falls inside the selected date chip, counted back
 * from the declared present.
 * @param {string} iso
 * @param {DateFilter} filter
 * @returns {boolean}
 */
export const isInRange = (iso, filter) => {
  if (filter === 'all') return true;
  const t = new Date(iso).getTime();
  const diff = todayMs - t;
  if (filter === 'today') return iso === TODAY;
  if (filter === 'week') return diff >= 0 && diff <= 7 * DAY_MS;
  if (filter === 'month') return diff >= 0 && diff <= 31 * DAY_MS;
  if (filter === '30d') return diff >= 0 && diff <= 30 * DAY_MS;
  return true;
};

/**
 * Whether a GR status belongs to a status tab.
 * @param {GRStatus} s
 * @param {GroupTab} g
 * @returns {boolean}
 */
export const matchesGroup = (s, g) => {
  if (g === 'all') return true;
  if (g === 'pending') return s === 'Pending Inspection';
  if (g === 'under-inspection') return s === 'Under Inspection';
  if (g === 'approved') return s === 'Approved' || s === 'Partially Approved';
  if (g === 'hold') return s === 'Quality Hold';
  if (g === 'rejected') return s === 'Rejected';
  if (g === 'posted') return s === 'Posted to SAP';
  return true;
};

/**
 * Received / accepted / rejected quantities summed over a GR's lines.
 * @param {InspectionResult[]} results
 */
export const totals = (results) =>
  results.reduce(
    (acc, r) => ({
      received: acc.received + r.qtyReceived,
      accepted: acc.accepted + r.qtyAccepted,
      rejected: acc.rejected + r.qtyRejected
    }),
    { received: 0, accepted: 0, rejected: 0 }
  );

/**
 * The side panel's disposition workflow: five steps from receipt to SAP post,
 * each marked completed / current / pending from the GR's status.
 * @param {GoodsReceipt} g
 * @param {TFunction} t
 * @param {ReturnType<typeof useEnumLabel>} el
 * @returns {TimelineEvent[]}
 */
export const buildTimeline = (g, t, el) => {
  /**
   * @param {GRStatus} s
   * @returns {number}
   */
  const order = (s) => {
    switch (s) {
      case 'Pending Inspection':
        return 1;
      case 'Under Inspection':
        return 2;
      case 'Quality Hold':
        return 3;
      case 'Approved':
      case 'Partially Approved':
      case 'Rejected':
        return 4;
      case 'Posted to SAP':
        return 5;
      default:
        return 0;
    }
  };
  const cur = order(g.status);
  const hasLab = g.inspectionResults.some((r) => r.labResultId);
  /**
   * @param {number} n
   * @returns {'completed' | 'current' | 'pending'}
   */
  const at = (n) => (n < cur ? 'completed' : n === cur ? 'current' : 'pending');

  return [
    {
      id: 't1',
      title: t('goodsReceipt.timeline.received'),
      timestamp: formatDate(g.receivedDate),
      status: 'completed'
    },
    {
      id: 't2',
      title: t('goodsReceipt.timeline.inspectionStarted'),
      status: at(2)
    },
    {
      id: 't3',
      title: t('goodsReceipt.timeline.labResultsReceived'),
      timestamp: hasLab
        ? g.inspectionResults.find((r) => r.labResultId)?.labResultId
        : t('goodsReceipt.timeline.noLabRequired'),
      status: hasLab ? (cur >= 3 ? 'completed' : 'current') : 'pending'
    },
    {
      id: 't4',
      title: t('goodsReceipt.timeline.dispositionDecision'),
      timestamp: g.disposition !== 'Pending' ? el(g.disposition) : undefined,
      status: at(4)
    },
    {
      id: 't5',
      title: t('goodsReceipt.timeline.postedToSap'),
      timestamp: g.sapMaterialDoc,
      status: g.status === 'Posted to SAP' ? 'completed' : 'pending'
    }
  ];
};
