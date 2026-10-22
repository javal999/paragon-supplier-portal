// Module-scope constants of the buyer purchase-orders page. Moved out of
// `BuyerOrders.jsx` by the Phase 5 page split (no behaviour change).
/** @import { LucideIcon } from 'lucide-react' */
import { MessageCircle, Mail, Globe, Send } from 'lucide-react';
import { ChannelType, POStatus } from '@services/data/types';

/**
 * @typedef {| 'all'
 *   | 'escalated'
 *   | 'review'
 *   | 'rejected'
 *   | 'pending'
 *   | 'confirmed'
 *   | 'transit'
 *   | 'delivered'
 *   | 'closed'} GroupTab
 */

/** @typedef {'7d' | '30d' | '90d' | 'all'} RangeFilter */

/** @type {Record<ChannelType, LucideIcon>} */
export const CHANNEL_ICON = {
  [ChannelType.WHATSAPP]: MessageCircle,
  [ChannelType.EMAIL]: Mail,
  [ChannelType.WEB]: Globe,
  [ChannelType.API]: Send
};

/** @type {POStatus[]} */
export const PENDING_STATUSES = [POStatus.SENT, POStatus.VIEWED];
/** @type {POStatus[]} */
export const CONFIRMED_STATUSES = [POStatus.ACKNOWLEDGED, POStatus.CONFIRMED];
/** @type {POStatus[]} */
export const TRANSIT_STATUSES = [POStatus.PARTIALLY_DELIVERED];
/** @type {POStatus[]} */
export const DELIVERED_STATUSES = [POStatus.DELIVERED];
/** @type {POStatus[]} */
export const CLOSED_STATUSES = [POStatus.CLOSED];

/** @type {Record<string, string>} */
export const COUNTRY_FLAG = {
  ID: 'ID',
  MY: 'MY',
  DE: 'DE',
  FR: 'FR',
  CN: 'CN',
  SG: 'SG',
  IN: 'IN'
};

export const DAY_MS = 24 * 60 * 60 * 1000;

// `null` — no footer shortcut: an adjusted PO is reviewed in the panel body, and
// a rejected one has nothing further to ask of the supplier.
/** @type {Record<POStatus, string | null>} */
export const FOOTER_ACTION_KEY = {
  [POStatus.ADJUSTED]: null,
  [POStatus.REJECTED]: null,
  [POStatus.SENT]: 'buyerOrders.footer.sendReminder',
  [POStatus.VIEWED]: 'buyerOrders.footer.sendReminder',
  [POStatus.ACKNOWLEDGED]: 'buyerOrders.footer.requestAsn',
  [POStatus.CONFIRMED]: 'buyerOrders.footer.requestAsn',
  [POStatus.PARTIALLY_DELIVERED]: 'buyerOrders.footer.trackShipment',
  [POStatus.DELIVERED]: 'buyerOrders.footer.viewGr',
  [POStatus.CLOSED]: 'buyerOrders.footer.viewGr'
};

/** @type {Record<POStatus, number>} */
export const STATUS_RANK = {
  [POStatus.SENT]: 1,
  [POStatus.VIEWED]: 2,
  [POStatus.ACKNOWLEDGED]: 3,
  [POStatus.ADJUSTED]: 3,
  [POStatus.REJECTED]: 3,
  [POStatus.CONFIRMED]: 4,
  [POStatus.PARTIALLY_DELIVERED]: 5,
  [POStatus.DELIVERED]: 6,
  [POStatus.CLOSED]: 7
};
