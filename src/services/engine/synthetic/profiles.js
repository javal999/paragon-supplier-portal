// ─────────────────────────────────────────────────────────────────────────────
// Supplier behaviour profiles for the synthetic dataset (BL-102).
//
// ⚠️ THESE ARE CALIBRATION KNOBS, NOT FACTS ABOUT ANY SUPPLIER. They are tuned
// so the dataset, MEASURED by the engine's own functions, reproduces the
// owner's "Challenge & Gaps" figures (confirmation ~67%, CFOT ~36%) with real
// spread between suppliers (E14-01 BR-07). The ids are the Hub's sample
// supplier ids so the persona switch finds rows; the behaviour attached to
// each is invented. The calibration test derives every figure from the
// generated rows — none of the numbers below is asserted anywhere.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `confirmOnTime`:  Share of lines confirmed by the deadline.
 * `confirmLate`:  Share confirmed after the deadline (the rest are never confirmed).
 * `partial`:  Of confirmations, the share for less than the ordered quantity.
 * `laterDate`:  Of confirmations, the share for a later date than requested.
 * `supplierMiss`:  Confirmed and unchanged: the chance the receipt is short or late.
 * `reconfirm`:  After a PTI change, the chance the supplier re-confirms.
 * `ptiChange`:  PTI's chance of changing a line inside this supplier's lead time.
 *
 * @typedef {{
 *   readonly confirmOnTime: number;
 *   readonly confirmLate: number;
 *   readonly partial: number;
 *   readonly laterDate: number;
 *   readonly supplierMiss: number;
 *   readonly reconfirm: number;
 *   readonly ptiChange: number;
 * }} SupplierProfile
 */

/** @type {SupplierProfile} */
export const DEFAULT_PROFILE = Object.freeze({
  confirmOnTime: 0.68,
  confirmLate: 0.12,
  partial: 0.5,
  laterDate: 0.15,
  supplierMiss: 0.47,
  reconfirm: 0.2,
  ptiChange: 0.21
});

/**
 * @param {Partial<SupplierProfile>} over
 * @returns {SupplierProfile}
 */
const p = (over) => Object.freeze({ ...DEFAULT_PROFILE, ...over });

/**
 * Per supplier — some good, some bad (BL-102: "variation between suppliers").
 * @type {Readonly<Record<string, SupplierProfile>>}
 */
export const SUPPLIER_PROFILES = Object.freeze({
  // Packaging
  'sup-007': p({
    confirmOnTime: 0.84,
    confirmLate: 0.06,
    supplierMiss: 0.44,
    reconfirm: 0.35,
    ptiChange: 0.18
  }),
  'sup-012': p({ confirmOnTime: 0.44, confirmLate: 0.2, supplierMiss: 0.57, ptiChange: 0.24 }),
  'sup-008': p({ confirmOnTime: 0.72, supplierMiss: 0.47 }),
  'sup-013': p({ confirmOnTime: 0.57, supplierMiss: 0.57, ptiChange: 0.25 }),
  'sup-014': p({ confirmOnTime: 0.78, supplierMiss: 0.4 }),
  // Raw material
  'sup-002': p({ confirmOnTime: 0.74, supplierMiss: 0.44, ptiChange: 0.2 }),
  'sup-005': p({ confirmOnTime: 0.5, confirmLate: 0.16, supplierMiss: 0.6, reconfirm: 0.1 }),
  'sup-010': p({ confirmOnTime: 0.84, supplierMiss: 0.34, reconfirm: 0.3 }),
  'sup-001': p({ confirmOnTime: 0.64, supplierMiss: 0.52 }),
  // Actives and fragrance
  'sup-009': p({ confirmOnTime: 0.72, supplierMiss: 0.46 }),
  'sup-011': p({ confirmOnTime: 0.57, supplierMiss: 0.57, ptiChange: 0.23 }),
  'sup-003': p({ confirmOnTime: 0.7, supplierMiss: 0.48 })
});
