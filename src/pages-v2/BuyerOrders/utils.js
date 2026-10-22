// Pure helpers of the buyer purchase-orders page (no React). Moved out of
// `BuyerOrders.jsx` by the Phase 5 page split (no behaviour change).
/** @import { TFunction } from 'i18next' */
/** @import { TimelineEvent } from '@components/ui-v2/Timeline' */
/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { GroupTab } from './const' */
import { Truck, Send, FileText, CheckCircle2, Package, Receipt, Wallet } from 'lucide-react';
import { isEscalated } from '@services/data/poResponseProjection';
import { formatIDR, formatDate } from '@lib/format';
import { POStatus } from '@services/data/types';
import { poLineValue } from '../orders/poLineQuantity';
import {
  PENDING_STATUSES,
  CONFIRMED_STATUSES,
  TRANSIT_STATUSES,
  DELIVERED_STATUSES,
  CLOSED_STATUSES,
  STATUS_RANK
} from './const';

// `escalated` is computed from the clock (never stored); `review` is a counter-
// offer waiting for the planner; `rejected` is the supplier's refusal.
/**
 * Whether a PO belongs to the given worklist tab.
 * @param {PurchaseOrder} po
 * @param {GroupTab} group
 * @param {string} nowIso
 * @returns {boolean}
 */
export const matchesGroup = (po, group, nowIso) => {
  const status = po.status;
  if (group === 'all') return true;
  if (group === 'escalated') return isEscalated(po, nowIso);
  if (group === 'review') return status === POStatus.ADJUSTED;
  if (group === 'rejected') return status === POStatus.REJECTED;
  if (group === 'pending') return PENDING_STATUSES.includes(status);
  if (group === 'confirmed') return CONFIRMED_STATUSES.includes(status);
  if (group === 'transit') return TRANSIT_STATUSES.includes(status);
  if (group === 'delivered') return DELIVERED_STATUSES.includes(status);
  if (group === 'closed') return CLOSED_STATUSES.includes(status);
  return true;
};

/**
 * Whether a PO in this status is still open (not delivered, closed or rejected).
 * @param {POStatus} status
 * @returns {boolean}
 */
export const isOpen = (status) =>
  status !== POStatus.DELIVERED && status !== POStatus.CLOSED && status !== POStatus.REJECTED;

/**
 * Whether an open PO is past its requested delivery date.
 * @param {PurchaseOrder} po
 * @returns {boolean}
 */
export const isOverdue = (po) => po.daysOverdue > 0 && isOpen(po.status);

/**
 * The panel's lifecycle timeline: created → sent → acknowledged → ASN → GR →
 * invoice → payment, each step completed/current/pending from the PO's status rank.
 * @param {PurchaseOrder} po
 * @param {TFunction} t
 * @returns {TimelineEvent[]}
 */
export const buildTimeline = (po, t) => {
  const r = STATUS_RANK[po.status];
  /**
   * @param {number} requiredRank
   * @returns {'completed' | 'current' | 'pending'}
   */
  const stateFor = (requiredRank) => {
    if (r > requiredRank) return 'completed';
    if (r === requiredRank) return 'current';
    return 'pending';
  };

  return [
    {
      id: 'created',
      title: t('buyerOrders.timeline.created'),
      timestamp: formatDate(po.orderDate),
      status: 'completed',
      icon: FileText
    },
    {
      id: 'sent',
      title: t('buyerOrders.timeline.sent'),
      timestamp: `${formatDate(po.orderDate)} · ${po.channel}`,
      status: 'completed',
      icon: Send
    },
    {
      id: 'ack',
      title: t('buyerOrders.timeline.acknowledged'),
      timestamp:
        r >= 3
          ? t('buyerOrders.timeline.ackAfter', {
              hours: po.acknowledgmentTimeHours
            })
          : undefined,
      status: r >= 3 ? 'completed' : 'current',
      icon: CheckCircle2
    },
    {
      id: 'asn',
      title: t('buyerOrders.timeline.asn'),
      timestamp: r >= 5 ? formatDate(po.confirmedDeliveryDate) : undefined,
      status: stateFor(4),
      icon: Truck
    },
    {
      id: 'gr',
      title: t('buyerOrders.timeline.goodsReceived'),
      // Canonical dropped `deliveryDate`; goods-receipt aligns with the
      // confirmed (actual) delivery date, so map to confirmedDeliveryDate.
      timestamp: r >= 6 ? formatDate(po.confirmedDeliveryDate) : undefined,
      status: stateFor(5),
      icon: Package
    },
    {
      id: 'invoice',
      title: t('buyerOrders.timeline.invoiceSubmitted'),
      status: stateFor(6),
      icon: Receipt
    },
    {
      id: 'payment',
      title: t('buyerOrders.timeline.paymentPosted'),
      status: stateFor(7),
      icon: Wallet
    }
  ];
};

// i18n-defer: buildComms fabricates sample conversation previews (mock data);
// sender label and message previews are left in EN and not translated (D — mock).
/**
 * The sample communication history shown in the panel (three fixed messages).
 * @param {PurchaseOrder} po
 */
export const buildComms = (po) => [
  {
    ts: `${po.orderDate} 09:00`,
    sender: 'Procurement',
    channel: po.channel,
    preview: `${po.poNumber} issued to ${po.supplierName}. Total ${formatIDR(po.totalValue)}.`
  },
  {
    ts: `${po.orderDate} 10:18`,
    sender: po.supplierName,
    channel: po.channel,
    preview:
      po.acknowledgmentTimeHours > 0
        ? 'Received, will confirm shortly.'
        : 'Auto-receipt logged via API.'
  },
  {
    ts: `${po.requestedDeliveryDate} 14:32`,
    sender: 'Procurement',
    channel: po.channel,
    preview: `Reminder: requested delivery ${formatDate(po.requestedDeliveryDate)}.`
  }
];

// BL-80 — a value-limit line is worth its limit, not quantity × unit price.
/**
 * A line's total value for the line-items table.
 * @param {PurchaseOrder['lineItems'][number]} li
 * @returns {number}
 */
export const lineTotal = (li) => poLineValue(li);
