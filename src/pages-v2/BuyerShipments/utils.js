// ────────────────────────────────────────────────────────────────────────────
// BuyerShipments — pure helpers (no React).
//
// Moved out of `BuyerShipments.jsx` by the Phase 5 page split (no behaviour
// change). `buildTimeline` and `statusOrderFor` were closures inside the
// workspace; they now take what they closed over (`t`, `displayOf`) as
// arguments.
// ────────────────────────────────────────────────────────────────────────────

/** @import { TFunction } from 'i18next' */
/** @import { TimelineEvent } from '@components/ui-v2/Timeline' */
/** @import { Shipment, ShipmentStatus } from '@data/mockShipments' */
/** @import { ShipmentDisplayState } from '@services/data/shipmentDisplayState' */
/** @import { GroupTab } from './const' */
import { daysInTransit } from '@services/data/shipmentDisplayState';
import { AT_DOCK_STATUSES, IN_TRANSIT_STATUSES, PENDING_STATUSES, TODAY } from './const';

// A quantity in the reader's language (BL-223): "1,234" in English, "1.234"
// in Indonesian. It was hard-coded to id-ID, so English readers saw "1.234".
export { formatNumber } from '@lib/format';

/**
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

/**
 * @param {string} [iso]
 * @returns {boolean}
 */
export const isToday = (iso) => iso === TODAY;

// ⚠️ TAKES THE DISPLAY STATE, NOT THE STORED ONE. A row the clock calls
// `Delayed` must leave its stored group rather than appear in both — that is
// what keeps the five tab counts a PARTITION of the 18 rows, and it is why
// the rendered totals do not move when the literal is deleted.
/**
 * @param {ShipmentDisplayState} s
 * @param {GroupTab} g
 * @returns {boolean}
 */
export const matchesGroup = (s, g) => {
  if (g === 'all') return true;
  if (g === 'pending') return PENDING_STATUSES.includes(/** @type {ShipmentStatus} */ (s));
  if (g === 'in-transit') return IN_TRANSIT_STATUSES.includes(/** @type {ShipmentStatus} */ (s));
  if (g === 'at-dock') return AT_DOCK_STATUSES.includes(/** @type {ShipmentStatus} */ (s));
  if (g === 'delivered') return s === 'Delivered';
  if (g === 'delayed') return s === 'Delayed';
  return true;
};

/**
 * The lifecycle position of a shipment's DISPLAY state, for the timeline's
 * completed / current / pending marks.
 * @param {Shipment} s
 * @param {(s: Shipment) => ShipmentDisplayState} displayOf  The page's one classification.
 * @returns {number}
 */
export function statusOrderFor(s, displayOf) {
  switch (displayOf(s)) {
    case 'Pending ASN':
      return 1;
    case 'ASN Received':
      return 2;
    case 'In Transit':
      return 3;
    case 'Arrived at Port':
      return 4;
    case 'Customs Clearance':
      return 5;
    case 'At Dock':
      return 6;
    case 'Unloading':
      return 6;
    case 'Delivered':
      return 7;
    case 'Delayed':
      return 3;
    default:
      return 0;
  }
}

/**
 * The side panel's lifecycle timeline for one shipment, PO created through
 * GR posted.
 * @param {Shipment} s
 * @param {TFunction} t
 * @param {(s: Shipment) => ShipmentDisplayState} displayOf  The page's one classification.
 * @returns {TimelineEvent[]}
 */
export const buildTimeline = (s, t, displayOf) => {
  // COMPUTED at `TODAY`, the same instant the pill and the tabs read. The
  // stored `daysInTransit` this replaces was a FACT for arrived rows and a
  // frozen clock read for in-flight ones, with nothing to tell them apart.
  const transitDays = daysInTransit(s, TODAY);
  /**
   * @param {number} statusOrder
   * @returns {'completed' | 'current' | 'pending'}
   */
  const completed = (statusOrder) => {
    const current = statusOrderFor(s, displayOf);
    if (statusOrder < current) return 'completed';
    if (statusOrder === current) return 'current';
    return 'pending';
  };

  return [
    {
      id: 'e1',
      title: t('shipments.timeline.poCreated'),
      timestamp: s.poNumber,
      status: 'completed'
    },
    {
      id: 'e2',
      title: t('shipments.timeline.asnSubmitted'),
      timestamp: s.status === 'Pending ASN' ? t('shipments.timeline.pending') : s.asnNumber,
      status: s.status === 'Pending ASN' ? 'current' : 'completed'
    },
    {
      id: 'e3',
      title: t('shipments.timeline.shippedFromOrigin'),
      timestamp: s.shipDate ? formatDate(s.shipDate) : undefined,
      status: completed(2)
    },
    {
      id: 'e4',
      title: t('shipments.timeline.inTransit'),
      timestamp: transitDays
        ? transitDays === 1
          ? t('shipments.timeline.daysInTransit.one', { count: transitDays })
          : t('shipments.timeline.daysInTransit.other', { count: transitDays })
        : undefined,
      status: s.status === 'In Transit' ? 'current' : completed(3)
    },
    {
      id: 'e5',
      title: t('shipments.timeline.arrivedAtPort'),
      timestamp: s.actualArrival ? formatDate(s.actualArrival) : undefined,
      status: s.status === 'Arrived at Port' ? 'current' : completed(4)
    },
    {
      id: 'e6',
      title: t('shipments.timeline.customsCleared'),
      timestamp:
        s.customsStatus === 'Cleared'
          ? t('shipments.timeline.cleared')
          : s.customsStatus === 'Held'
            ? t('shipments.timeline.onHold')
            : t('shipments.timeline.pending'),
      status:
        s.customsStatus === 'Cleared'
          ? 'completed'
          : s.customsStatus === 'Held'
            ? 'current'
            : s.status === 'Customs Clearance'
              ? 'current'
              : completed(5)
    },
    {
      id: 'e7',
      title: t('shipments.timeline.dockedAtNdc'),
      timestamp: s.dockAssignment
        ? `${s.dockAssignment}${s.dockTime ? ` · ${s.dockTime}` : ''}`
        : undefined,
      status: s.dockAssignment
        ? s.status === 'At Dock' || s.status === 'Unloading'
          ? 'current'
          : 'completed'
        : 'pending'
    },
    {
      id: 'e8',
      title: t('shipments.timeline.unloadedGrPosted'),
      timestamp: s.status === 'Delivered' ? t('shipments.timeline.complete') : undefined,
      status: s.status === 'Delivered' ? 'completed' : 'pending'
    }
  ];
};
