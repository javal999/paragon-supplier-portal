// ─── Enums ────────────────────────────────────────────────────────────────────

export enum SupplierTier {
  WHATSAPP = 1,
  WEB = 2,
  API = 3,
}

export enum SupplierStatus {
  ACTIVE = 'Active',
  ONBOARDING = 'Onboarding',
  SUSPENDED = 'Suspended',
  // REQ-E03-01 BR-04 — a supplier PTI has stopped doing business with. It is a
  // DISTINCT status from Suspended (a pause, reversible by the supplier fixing
  // something) because the invitee filter refuses both and a reader has to be
  // able to tell "temporarily out" from "never again".
  BLACKLISTED = 'Blacklisted',
}

export enum PreferredChannel {
  WHATSAPP = 'WhatsApp',
  EMAIL = 'Email',
  WEB = 'Web',
  API = 'API',
}

export enum ScorecardGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F',
}

// ─── Supplier interfaces ──────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  sapBpNumber: string;
  name: string;
  category: string;
  country: string;
  city: string;
  tier: SupplierTier;
  status: SupplierStatus;
  contactName: string;
  email: string;
  contactEmail: string;
  phone: string;
  contactPhone: string;
  rating: number;
  onboardedDate: string;
  lastActivityDate: string;
  halalCertified: boolean;
  bpomRegistered: boolean;
  certExpiryDate: string;
  /**
   * CR-23 — GMP / ISO 22716 held (the compliance gate's criterion for cosmetic
   * raw material). OPTIONAL: absent means no evidence on file, which does not
   * pass the gate — it is never read as "held".
   */
  gmpIso22716?: boolean;
  preferredChannel: PreferredChannel;
  /**
   * REQ-E03-01 edge case — OPTIONAL, and the absence is the point.
   *
   * A supplier that has never delivered against a call-off has NO on-time-in-full
   * history, and the honest answer is "No history", never 0%. The field was
   * `number` and every surface printed it, so a supplier with nothing measured
   * would have been shown as the worst performer in the room. CR-15 reads the
   * same absence and scores reliability 50 rather than 0.
   */
  otif?: number;
  /**
   * REQ-E03-01 BR-01 — the SAP MM purchasing group (EKGRP) that buys from this
   * supplier. Optional: a supplier the master has not yet assigned to a group is
   * a real state, and the invitee filter treats it as "matches no group filter"
   * rather than inventing one.
   */
  purchasingGroup?: string;
  leadTimeAdherence: number;
  invoiceAccuracy: number;
  /**
   * REQ-E10-01 — PROJECTED AT READ, never stored. The letter is a reading of the
   * calculated score (the band table lives in `performanceRules.ts`), so a
   * stored grade can never disagree with the figures beside it. Absent for a
   * supplier with no measurable history, exactly as `otif` is.
   */
  scorecardGrade?: ScorecardGrade;
  /**
   * REQ-E10-01 — the calculated assessment score the grade is read from, 0–100.
   * PROJECTED AT READ beside `scorecardGrade`, and absent for the same reason:
   * a supplier with no measurable history has no score, not a zero.
   */
  performanceScore?: number;
  /**
   * Material G1 (MR-10 BR-01 to BR-03) — the vendor's qualification level,
   * PROJECTED AT READ from its valid documents like `scorecardGrade`, never
   * stored and never set by hand. Separate from `status` (BR-02). Absent only
   * on the raw fixture row, which no read returns.
   */
  qualification?: import('@services/data/types').QualificationLevel;
  // Optional profile attributes (surfaced on storefront/profile views).
  legalName?: string;
  taxId?: string;
  businessRegNo?: string;
  website?: string;
  founded?: number;
  employees?: string;
  annualRevenue?: string;
  paymentTerms?: string;
  incoterms?: string;
  intelligenceNote?: string;
}

export interface SupplierSummary {
  id: string;
  name: string;
  category: string;
  status: SupplierStatus;
  tier: SupplierTier;
  scorecardGrade: ScorecardGrade;
  otif?: number;
  country: string;
}

// ─── Inventory ────────────────────────────────────────────────────────────────
// The static `InventoryRecord` (with its stored days of supply, stock status and
// available / reserved quantities) is retired: inventory is ONE model projected
// at read — `InventoryPosition` in `services/data/types.ts` (REQ-E08-01).
