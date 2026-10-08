// ────────────────────────────────────────────────────────────────────────────
// SupplierForecasts — module-scope constants shared by the page's sections.
//
// Two kinds of constant deliberately do NOT live here, because the gates that
// read them link a declaration to its uses only within ONE file:
//   · the qty refusal-key maps (`CONFIRM_REFUSAL_KEY`, `SHIP_REFUSAL_KEY`) sit
//     in the panel that both toasts and renders them (GL-1 `chipCoverage`);
//   · `ADVANCE_VERBS`, a const consumed by `.map()`, sits in `ShipmentsTab`
//     beside the render that maps it (`moduleScopeLiteralGate`).
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommitmentClass, ShipmentDirection } from '@services/sdc' */

/** @typedef {'lines' | 'stock' | 'shipments' | 'responses'} TabKey */

/** @type {Record<CommitmentClass, string>} */
export const CLASS_LABEL_KEY = {
  firm: 'sdcSup.class.firm',
  'semi-firm': 'sdcSup.class.semiFirm',
  'visibility-only': 'sdcSup.class.visibilityOnly'
};

// Root-cause level-1 vocabulary offered by the form (the child object's
// category axis; free-text note carries the specifics) — since BL-32 the Hub
// administrator's commitment-shortfall list, read in force by the form below.

// Quiet-outlined chip (DP-3 status-chip grammar — soft tint, thin border).
export const CHIP =
  'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium border-border-subtle bg-bg-hover text-text-secondary';

export const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
export const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

/**
 * @typedef {object} ConfirmForm
 * @property {string} confirmedQty
 * @property {string} committedDate
 * @property {string} capacityConstraint
 * @property {string} rootCauseLevel1
 * @property {string} rootCauseNote
 */

/** @type {ConfirmForm} */
export const emptyForm = {
  confirmedQty: '',
  committedDate: '',
  capacityConstraint: '',
  rootCauseLevel1: '',
  rootCauseNote: ''
};

// — Shipment report form (direction-guarded) —
/**
 * @typedef {object} ShipmentForm
 * @property {string} materialCode
 * @property {ShipmentDirection | ''} direction
 * @property {string} qty
 * @property {string} etd
 * @property {string} eta
 * @property {string} awb
 * @property {string} asnRef -  to-paragon ONLY — the SELECTED own-ASN number (never free-typed).
 */
/** @type {ShipmentForm} */
export const emptyShipmentForm = {
  materialCode: '',
  direction: '',
  qty: '',
  etd: '',
  eta: '',
  awb: '',
  asnRef: ''
};

// ── SDC-3b — My reported shipments tab ───────────────────────────────────────
/** @type {Record<string, string>} */
export const LIFECYCLE_LABEL_KEY = {
  Booked: 'sdcSup.ship.state.booked',
  Shipped: 'sdcSup.ship.state.shipped',
  Arrived: 'sdcSup.ship.state.arrived',
  Cancelled: 'sdcSup.ship.state.cancelled'
};
/** @type {Record<ShipmentDirection, string>} */
export const DIRECTION_LABEL_KEY = {
  'to-paragon': 'sdcSup.ship.dir.toParagon',
  'principal-to-distributor': 'sdcSup.ship.dir.p2d'
};
