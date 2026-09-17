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
  preferredChannel: PreferredChannel;
  otif: number;
  leadTimeAdherence: number;
  invoiceAccuracy: number;
  scorecardGrade: ScorecardGrade;
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
  otif: number;
  country: string;
}

// ─── Inventory ────────────────────────────────────────────────────────────────
// The static `InventoryRecord` (with its stored days of supply, stock status and
// available / reserved quantities) is retired: inventory is ONE model projected
// at read — `InventoryPosition` in `services/data/types.ts` (REQ-E08-01).
