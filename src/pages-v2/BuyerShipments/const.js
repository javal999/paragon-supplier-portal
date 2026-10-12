// ────────────────────────────────────────────────────────────────────────────
// BuyerShipments — module-scope constants.
//
// Moved out of `BuyerShipments.jsx` by the Phase 5 page split (no behaviour
// change).
// ────────────────────────────────────────────────────────────────────────────

/** @import { LucideIcon } from 'lucide-react' */
/** @import { ShipmentStatus, ShipmentMode } from '@data/mockShipments' */
/** @import { ShipmentDisplayState } from '@services/data/shipmentDisplayState' */
import { Truck, Ship, Plane } from 'lucide-react';
import { DECLARED_PRESENT } from '@services/data/fixturePresent';

// ⚠️ THE FOURTH PIN, RETIRED — see BuyerGoodsReceipt for the full note. All
// three surviving pins read 2026-05-20, which is what evidences the `shipment`
// and `goodsReceipt` anchors. Behaviour-preserving: the pin and the family it
// reads shift by the same delta.
export const TODAY = DECLARED_PRESENT;

/**
 * @typedef {| 'all'
 *   | 'pending'
 *   | 'in-transit'
 *   | 'at-dock'
 *   | 'delivered'
 *   | 'delayed'} GroupTab
 */

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

// Keyed by the DISPLAY state — `Delayed` is still a tone a reader sees, it is
// simply no longer a value anything stores.
/** @type {Record< ShipmentDisplayState, 'success' | 'warning' | 'danger' | 'info' | 'neutral' >} */
export const STATUS_VARIANT = {
  'Pending ASN': 'neutral',
  'ASN Received': 'neutral',
  'In Transit': 'neutral',
  'Arrived at Port': 'neutral',
  'Customs Clearance': 'warning',
  'At Dock': 'warning',
  Unloading: 'warning',
  Delivered: 'success',
  Delayed: 'danger'
};

/** @type {Record<ShipmentMode, LucideIcon>} */
export const MODE_ICON = {
  Sea: Ship,
  Air: Plane,
  Road: Truck
};

/** @type {ShipmentStatus[]} */
export const IN_TRANSIT_STATUSES = ['In Transit', 'Arrived at Port', 'Customs Clearance'];

/** @type {ShipmentStatus[]} */
export const AT_DOCK_STATUSES = ['At Dock', 'Unloading'];

/** @type {ShipmentStatus[]} */
export const PENDING_STATUSES = ['Pending ASN', 'ASN Received'];
