// Module-scope constants for the supplier's own storefront page
// (`SupplierMyStorefront`). Moved out of `SupplierMyStorefront.jsx` by the
// Phase 5 page split (no behaviour change). Constants that a component maps
// with `.map()` stay in that component's file, because the module-scope-literal
// gate keys them by the file that maps them.
/** @import { ProfileCertStatus } from '@services/data/types' */

/**
 * @typedef {object} NewMaterial
 * @property {string} material
 * @property {string} sapCode
 * @property {string} category
 * @property {string} moq
 * @property {string} uom
 * @property {string} leadTime
 * @property {string} unitPrice
 * @property {string} currency
 * @property {string[]} certs
 * @property {string} capacity
 */

/** @type {Record<ProfileCertStatus, 'success' | 'warning' | 'danger'>} */
export const CERT_VARIANT = {
  valid: 'success',
  expiring: 'warning',
  expired: 'danger',
  missing: 'danger',
  pending: 'warning'
};

/** @type {Record<ProfileCertStatus, string>} */
export const CERT_LABEL = {
  valid: 'Valid',
  expiring: 'Expiring',
  expired: 'Expired',
  missing: 'Missing',
  pending: 'Pending'
};

export const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
export const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

/** @type {NewMaterial} */
export const emptyMaterial = {
  material: '',
  sapCode: '',
  category: 'Packaging Primary',
  moq: '',
  uom: 'PCS',
  leadTime: '',
  unitPrice: '',
  currency: 'IDR',
  certs: [],
  capacity: ''
};
