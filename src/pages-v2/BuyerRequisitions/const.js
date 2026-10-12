// ────────────────────────────────────────────────────────────────────────────
// BuyerRequisitions — module-scope constants and the shared typedefs.
//
// Moved out of `BuyerRequisitions.jsx` by the Phase 5 page split (no behaviour
// change). Two kinds of constant deliberately do NOT live here, because a guard
// reads them in the file that uses them:
//   · the reason→key message maps (`QTY_REFUSAL_KEY`, `UNATTRIBUTED_KEY`) sit
//     beside their render sites — GL-1's chip-coverage reading pairs a map's
//     uses with its declaration in ONE file;
//   · the mapped option lists (`COST_CENTERS`, `UOM_OPTIONS`,
//     `PRIORITY_OPTIONS`) sit in the New-PR form step that `.map()`s them — the
//     module-scope-literal gate keys them `file::CONST`.
// ────────────────────────────────────────────────────────────────────────────

/** @import { PRStatus } from '@services/data/types' */

/** @type {Record< PRStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral' >} */
export const STATUS_VARIANT = {
  Draft: 'neutral',
  'Pending Approval': 'warning',
  Approved: 'success',
  'Sourcing Event': 'neutral',
  'PO Created': 'success',
  Rejected: 'danger'
};

/** @typedef {'all' | 'Draft' | 'Pending Approval' | 'Approved' | 'Sourcing Event' | 'PO Created'} GroupTab */

/** @typedef {'view' | 'rejecting' | 'revising'} PanelMode */

/**
 * @typedef {object} NewPRForm
 * @property {string} material
 * @property {string} qty
 * @property {string} uom
 * @property {string} date
 * @property {string} costCenter
 * @property {string} priority
 * @property {string} justification
 */

/** @type {NewPRForm} */
export const emptyForm = {
  material: '',
  qty: '',
  uom: 'KG',
  date: '',
  costCenter: '',
  priority: 'Medium',
  justification: ''
};

export const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
export const labelClass = 'block text-label text-text-tertiary uppercase mb-1';
