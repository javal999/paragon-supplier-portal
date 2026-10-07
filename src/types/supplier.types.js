// ─── Enums ────────────────────────────────────────────────────────────────────

export const SupplierTier = /** @type {const} */ ({
  WHATSAPP: 1,
  WEB: 2,
  API: 3
});
/** @typedef {(typeof SupplierTier)[keyof typeof SupplierTier]} SupplierTier */

export const SupplierStatus = /** @type {const} */ ({
  ACTIVE: 'Active',
  ONBOARDING: 'Onboarding',
  SUSPENDED: 'Suspended',
  // REQ-E03-01 BR-04 — a supplier PTI has stopped doing business with. It is a
  // DISTINCT status from Suspended (a pause, reversible by the supplier fixing
  // something) because the invitee filter refuses both and a reader has to be
  // able to tell "temporarily out" from "never again".
  BLACKLISTED: 'Blacklisted'
});
/** @typedef {(typeof SupplierStatus)[keyof typeof SupplierStatus]} SupplierStatus */

export const PreferredChannel = /** @type {const} */ ({
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  WEB: 'Web',
  API: 'API'
});
/** @typedef {(typeof PreferredChannel)[keyof typeof PreferredChannel]} PreferredChannel */

export const ScorecardGrade = /** @type {const} */ ({
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  F: 'F'
});
/** @typedef {(typeof ScorecardGrade)[keyof typeof ScorecardGrade]} ScorecardGrade */

// ─── Supplier interfaces ──────────────────────────────────────────────────────

/**
 * @typedef {object} Supplier
 * @property {string} id
 * @property {string} sapBpNumber
 * @property {string} name
 * @property {string} category
 * @property {string} country
 * @property {string} city
 * @property {SupplierTier} tier
 * @property {SupplierStatus} status
 * @property {string} contactName
 * @property {string} email
 * @property {string} contactEmail
 * @property {string} phone
 * @property {string} contactPhone
 * @property {number} rating
 * @property {string} onboardedDate
 * @property {string} lastActivityDate
 * @property {boolean} halalCertified
 * @property {boolean} bpomRegistered
 * @property {string} certExpiryDate
 * @property {boolean} [gmpIso22716] CR-23 — GMP / ISO 22716 held (the compliance gate's criterion for cosmetic
 *   raw material). OPTIONAL: absent means no evidence on file, which does not
 *   pass the gate — it is never read as "held".
 * @property {PreferredChannel} preferredChannel
 * @property {number} [otif] REQ-E03-01 edge case — OPTIONAL, and the absence is the point.
 *
 *   A supplier that has never delivered against a call-off has NO on-time-in-full
 *   history, and the honest answer is "No history", never 0%. The field was
 *   `number` and every surface printed it, so a supplier with nothing measured
 *   would have been shown as the worst performer in the room. CR-15 reads the
 *   same absence and scores reliability 50 rather than 0.
 * @property {string} [purchasingGroup] REQ-E03-01 BR-01 — the SAP MM purchasing group (EKGRP) that buys from this
 *   supplier. Optional: a supplier the master has not yet assigned to a group is
 *   a real state, and the invitee filter treats it as "matches no group filter"
 *   rather than inventing one.
 * @property {number} leadTimeAdherence
 * @property {number} invoiceAccuracy
 * @property {ScorecardGrade} [scorecardGrade] REQ-E10-01 — PROJECTED AT READ, never stored. The letter is a reading of the
 *   calculated score (the band table lives in `performanceRules.js`), so a
 *   stored grade can never disagree with the figures beside it. Absent for a
 *   supplier with no measurable history, exactly as `otif` is.
 * @property {number} [performanceScore] REQ-E10-01 — the calculated assessment score the grade is read from, 0–100.
 *   PROJECTED AT READ beside `scorecardGrade`, and absent for the same reason:
 *   a supplier with no measurable history has no score, not a zero.
 * @property {import('@services/data/types').QualificationLevel} [qualification] Material G1 (MR-10 BR-01 to BR-03) — the vendor's qualification level,
 *   PROJECTED AT READ from its valid documents like `scorecardGrade`, never
 *   stored and never set by hand. Separate from `status` (BR-02). Absent only
 *   on the raw fixture row, which no read returns.
 * @property {string} [legalName] Optional profile attributes (surfaced on storefront/profile views).
 * @property {string} [taxId]
 * @property {string} [businessRegNo]
 * @property {string} [website]
 * @property {number} [founded]
 * @property {string} [employees]
 * @property {string} [annualRevenue]
 * @property {string} [paymentTerms]
 * @property {string} [incoterms]
 * @property {string} [intelligenceNote]
 */

/**
 * @typedef {object} SupplierSummary
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {SupplierStatus} status
 * @property {SupplierTier} tier
 * @property {ScorecardGrade} scorecardGrade
 * @property {number} [otif]
 * @property {string} country
 */

// ─── Inventory ────────────────────────────────────────────────────────────────
// The static `InventoryRecord` (with its stored days of supply, stock status and
// available / reserved quantities) is retired: inventory is ONE model projected
// at read — `InventoryPosition` in `services/data/types.js` (REQ-E08-01).
