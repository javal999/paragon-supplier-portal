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

export interface SupplierProfile {
  /** Share of lines confirmed by the deadline. */
  readonly confirmOnTime: number;
  /** Share confirmed after the deadline (the rest are never confirmed). */
  readonly confirmLate: number;
  /** Of confirmations, the share for less than the ordered quantity. */
  readonly partial: number;
  /** Of confirmations, the share for a later date than requested. */
  readonly laterDate: number;
  /** Confirmed and unchanged: the chance the receipt is short or late. */
  readonly supplierMiss: number;
  /** After a PTI change, the chance the supplier re-confirms. */
  readonly reconfirm: number;
  /** PTI's chance of changing a line inside this supplier's lead time. */
  readonly ptiChange: number;
}

export const DEFAULT_PROFILE: SupplierProfile = Object.freeze({
  confirmOnTime: 0.68,
  confirmLate: 0.12,
  partial: 0.5,
  laterDate: 0.15,
  supplierMiss: 0.47,
  reconfirm: 0.2,
  ptiChange: 0.21,
});

const p = (over: Partial<SupplierProfile>): SupplierProfile => Object.freeze({ ...DEFAULT_PROFILE, ...over });

/** Per supplier — some good, some bad (BL-102: "variation between suppliers"). */
export const SUPPLIER_PROFILES: Readonly<Record<string, SupplierProfile>> = Object.freeze({
  // Packaging
  'sup-007': p({ confirmOnTime: 0.84, confirmLate: 0.06, supplierMiss: 0.44, reconfirm: 0.35, ptiChange: 0.18 }),
  'sup-012': p({ confirmOnTime: 0.44, confirmLate: 0.2, supplierMiss: 0.57, ptiChange: 0.24 }),
  'sup-008': p({ confirmOnTime: 0.72, supplierMiss: 0.47 }),
  'sup-013': p({ confirmOnTime: 0.57, supplierMiss: 0.57, ptiChange: 0.25 }),
  'sup-014': p({ confirmOnTime: 0.78, supplierMiss: 0.40 }),
  // Raw material
  'sup-002': p({ confirmOnTime: 0.74, supplierMiss: 0.44, ptiChange: 0.20 }),
  'sup-005': p({ confirmOnTime: 0.50, confirmLate: 0.16, supplierMiss: 0.60, reconfirm: 0.1 }),
  'sup-010': p({ confirmOnTime: 0.84, supplierMiss: 0.34, reconfirm: 0.3 }),
  'sup-001': p({ confirmOnTime: 0.64, supplierMiss: 0.52 }),
  // Actives and fragrance
  'sup-009': p({ confirmOnTime: 0.72, supplierMiss: 0.46 }),
  'sup-011': p({ confirmOnTime: 0.57, supplierMiss: 0.57, ptiChange: 0.23 }),
  'sup-003': p({ confirmOnTime: 0.70, supplierMiss: 0.48 }),
});
