// ────────────────────────────────────────────────────────────────────────────
// SOURCING TYPE AND BIDDING ELIGIBILITY — Material G2 (MR-10 BR-05 to BR-07;
// plan AR-16, AR-17; MAT-D13, MAT-D14). Pure: no store, no clock.
//
// ── THE MAP (AR-17, BR-06) ──────────────────────────────────────────────────
// Categories come in three vocabularies: the RFQ's `RFQCategory`, the RFI and
// RFP `materialCategory` (a supplier-master category) plus an optional
// purchasing group, and `Supplier.category`. `CATEGORY_TO_SUPPLIER_CATEGORY`
// (moved here from the RFQ wizard) links the first to the third. The sourcing
// type map is keyed by `RFQCategory` value (`category:<value>`) and by
// purchasing group (`pg:<code>`); Procurement sets each once
// (`t_sourcingtype_set`). Until Procurement adds Indirect categories every key
// is Direct.
//
// ── ONE TYPE PER EVENT, FIXED AT PUBLISH ────────────────────────────────────
// `sourcingTypeOf` resolves an event's type: the type stored at publish when
// there is one (BR-06, fixed after publish); Direct for an event published
// before this change (edge case 4); otherwise from the map. An unmapped or
// ambiguous category reads as Direct, the stricter type.
//
// ── ELIGIBILITY (BR-05) AND THE PLACEHOLDER RULING ──────────────────────────
// Direct needs Preferred; Indirect needs Approved or Preferred. Owner ruling
// 2026-09-29: while the qualification list for the level an event needs is
// still the placeholder (G1, `placeholder: true`), a vendor below the level is
// WARNED, not refused: it can be invited, the publish records the warning, and
// an award to it needs a reason. Once a real list is saved the same checks
// refuse (fail-closed, plan AD-8).
// ────────────────────────────────────────────────────────────────────────────

import type { RFQCategory } from '../../data/mockRfqs';
import type {
  QualificationLevel,
  QualificationRequiredDoc,
  QualificationRuleLevel,
  VendorQualificationStatus,
} from '../data/types';
import { PURCHASING_GROUPS } from './rfxConfig';

/** MR-10 BR-05 — the two sourcing types. */
export type SourcingType = 'direct' | 'indirect';

export const SOURCING_TYPES: readonly SourcingType[] = Object.freeze(['direct', 'indirect']);

export const isSourcingType = (v: unknown): v is SourcingType => v === 'direct' || v === 'indirect';

/**
 * AR-17 — the RFQ category onto the supplier master's own category vocabulary.
 * Moved from `BuyerSourcing.tsx`: the invitee pool and the sourcing type both
 * read it, so it is one list.
 */
export const CATEGORY_TO_SUPPLIER_CATEGORY: Readonly<Record<RFQCategory, readonly string[]>> = Object.freeze({
  Fragrance: ['Fragrance'],
  'Active Ingredients': ['Active Ingredient'],
  Packaging: ['Packaging'],
  Emulsifiers: ['Raw Material'],
  Botanical: ['Raw Material'],
  Other: ['Raw Material', 'Active Ingredient', 'Packaging', 'Fragrance'],
});

/** Every `RFQCategory`, in the order the map lists them. */
export const SOURCING_CATEGORIES = Object.freeze(Object.keys(CATEGORY_TO_SUPPLIER_CATEGORY) as RFQCategory[]);

// ── The map ─────────────────────────────────────────────────────────────────

/** A map key: `category:<RFQCategory>` or `pg:<purchasing group code>`. */
export type SourcingTypeKey = `category:${string}` | `pg:${string}`;

export const categoryKey = (c: string): SourcingTypeKey => `category:${c}`;
export const groupKey = (code: string): SourcingTypeKey => `pg:${code}`;

/** Every key Procurement maps: each `RFQCategory`, then each purchasing group. */
export const SOURCING_TYPE_KEYS: readonly SourcingTypeKey[] = Object.freeze([
  ...SOURCING_CATEGORIES.map(categoryKey),
  ...PURCHASING_GROUPS.map((g) => groupKey(g.code)),
]);

export const isSourcingTypeKey = (v: unknown): v is SourcingTypeKey =>
  typeof v === 'string' && (SOURCING_TYPE_KEYS as readonly string[]).includes(v);

/** The map: each key's sourcing type. */
export type SourcingTypeMap = Readonly<Record<string, SourcingType>>;

/**
 * The starting map (assumption in the task prompt): every current category and
 * purchasing group (101 to 104) is Direct until Procurement adds Indirect ones.
 */
export const DEFAULT_SOURCING_TYPE_MAP: SourcingTypeMap = Object.freeze(
  Object.fromEntries(SOURCING_TYPE_KEYS.map((k) => [k, 'direct' as SourcingType])),
);

/** Why a map change is refused, or null (the `sourcing_type_governed` rule). */
export function sourcingTypeRefusal(key: string, value: unknown): string | null {
  if (!isSourcingTypeKey(key)) return `SOURCING_TYPE_KEY_UNKNOWN: "${key}" is not a sourcing category or purchasing group`;
  if (!isSourcingType(value)) return `SOURCING_TYPE_INVALID: a sourcing type is direct or indirect`;
  return null;
}

// ── One event's type ────────────────────────────────────────────────────────

/** The event facts the type is read from, whichever event type it is. */
export interface SourcingEventFacts {
  /** `rfq` reads an `RFQCategory`; `rfi` / `rfp` a supplier-master category. */
  readonly kind: 'rfq' | 'rfi' | 'rfp';
  readonly status: string;
  readonly materialCategory: string;
  readonly purchasingGroup?: string;
  /** Stored at publish (BR-06). */
  readonly sourcingType?: SourcingType;
}

/** The type the map gives these facts, ignoring any stored type. */
export function mappedSourcingType(event: Omit<SourcingEventFacts, 'status' | 'sourcingType'>, map: SourcingTypeMap): SourcingType {
  if (event.kind !== 'rfq' && event.purchasingGroup) {
    return map[groupKey(event.purchasingGroup)] ?? 'direct';
  }
  const categories: readonly string[] =
    event.kind === 'rfq'
      ? [event.materialCategory]
      : SOURCING_CATEGORIES.filter((c) => c !== 'Other' && CATEGORY_TO_SUPPLIER_CATEGORY[c].includes(event.materialCategory));
  const types = categories.map((c) => map[categoryKey(c)]);
  // Unmapped, or two RFQ categories that disagree (e.g. Emulsifiers and
  // Botanical are both "Raw Material"): Direct, the stricter type.
  if (types.length === 0 || types.some((t) => t !== 'indirect')) return 'direct';
  return 'indirect';
}

/**
 * MR-10 BR-06 — an event's sourcing type. Stored at publish and fixed after;
 * an event published before this change reads as Direct (edge case 4); a Draft
 * takes it from the map.
 */
export function sourcingTypeOf(event: SourcingEventFacts, map: SourcingTypeMap): SourcingType {
  if (event.sourcingType) return event.sourcingType;
  if (event.status !== 'Draft') return 'direct';
  return mappedSourcingType(event, map);
}

// ── Eligibility (BR-05) ─────────────────────────────────────────────────────

/** The lowest level each type accepts. */
export const REQUIRED_LEVEL: Readonly<Record<SourcingType, QualificationRuleLevel>> = Object.freeze({
  direct: 'preferred',
  indirect: 'approved',
});

const RANK: Readonly<Record<QualificationLevel, number>> = { registered: 0, approved: 1, preferred: 2 };

/** MR-10 BR-05 — Direct needs Preferred; Indirect needs Approved or Preferred. */
export const qualifiedFor = (level: QualificationLevel, sourcingType: SourcingType): boolean =>
  RANK[level] >= RANK[REQUIRED_LEVEL[sourcingType]];

/**
 * `qualified` — at or above the level. `warn` — below it while the list for
 * that level is a placeholder (owner ruling 2026-09-29). `refused` — below it
 * against a real list.
 */
export type EligibilityState = 'qualified' | 'warn' | 'refused';

/** One vendor against one event's type, on a date. */
export interface BiddingEligibility {
  readonly state: EligibilityState;
  readonly sourcingType: SourcingType;
  readonly level: QualificationLevel;
  readonly requiredLevel: QualificationRuleLevel;
  /** The documents the vendor lacks for the required level (G1's list). */
  readonly missing: readonly QualificationRequiredDoc[];
  /** The list for the required level is still the placeholder. */
  readonly placeholder: boolean;
}

/** A vendor's eligibility from its qualification (G1) and the list's placeholder flag. */
export function biddingEligibility(
  qualification: VendorQualificationStatus,
  sourcingType: SourcingType,
  placeholder: boolean,
): BiddingEligibility {
  const requiredLevel = REQUIRED_LEVEL[sourcingType];
  const ok = qualifiedFor(qualification.level, sourcingType);
  return {
    state: ok ? 'qualified' : placeholder ? 'warn' : 'refused',
    sourcingType,
    level: qualification.level,
    requiredLevel,
    missing: ok ? [] : qualification.missingFor[requiredLevel],
    placeholder,
  };
}

/** The missing documents as one line of text (requirement labels are data). */
export const missingText = (e: Pick<BiddingEligibility, 'missing'>): string =>
  e.missing.map((d) => d.label).join(', ');

/**
 * What an event or an award keeps about a vendor let through below the level
 * while the list was a placeholder (owner ruling 2026-09-29).
 */
export interface QualificationWarning {
  readonly supplierId: string;
  readonly sourcingType: SourcingType;
  readonly level: QualificationLevel;
  readonly requiredLevel: QualificationRuleLevel;
  readonly missing: readonly string[];
}

export const warningOf = (supplierId: string, e: BiddingEligibility): QualificationWarning => ({
  supplierId,
  sourcingType: e.sourcingType,
  level: e.level,
  requiredLevel: e.requiredLevel,
  missing: e.missing.map((d) => d.label),
});

/** One vendor's eligibility, named. */
export interface NamedEligibility {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly eligibility: BiddingEligibility;
}

const levelWord = (l: QualificationLevel): string => l.charAt(0).toUpperCase() + l.slice(1);

/** The reason a vendor is below the level, in the verb's words. */
export const notQualifiedText = (v: NamedEligibility): string =>
  `${v.supplierName} (${v.supplierId}) is ${levelWord(v.eligibility.level)}; a ${v.eligibility.sourcingType} event needs ` +
  `${levelWord(v.eligibility.requiredLevel)}${v.eligibility.missing.length > 0 ? ` (missing: ${missingText(v.eligibility)})` : ''}`;

/**
 * AR-16 — the publish check (`rfx_invitees_qualified`): refused
 * SUPPLIER_NOT_QUALIFIED naming every invitee below the level against a real
 * list; null otherwise. Warned invitees pass (`qualificationWarningsOf`).
 */
export function inviteesQualificationRefusal(invitees: readonly NamedEligibility[]): string | null {
  const refused = invitees.filter((v) => v.eligibility.state === 'refused');
  return refused.length > 0 ? `SUPPLIER_NOT_QUALIFIED: ${refused.map(notQualifiedText).join('; ')}` : null;
}

/**
 * BL-147 (MAT-R4) — a record's qualification warnings as a scope may read them:
 * the buyer (`supplierId` null) reads every row; a supplier only its own row,
 * never another vendor's level or missing documents. The field is dropped when
 * nothing is left, so a supplier's read never carries an empty list either.
 */
export function withOwnQualificationWarnings<T extends { readonly qualificationWarnings?: readonly QualificationWarning[] }>(
  record: T,
  supplierId: string | null,
): T {
  if (!supplierId || !record.qualificationWarnings) return record;
  const { qualificationWarnings, ...rest } = record;
  const own = qualificationWarnings.filter((w) => w.supplierId === supplierId);
  return (own.length > 0 ? { ...rest, qualificationWarnings: own } : rest) as T;
}

/** The warnings a publish or an award records: every vendor let through on a placeholder list. */
export const qualificationWarningsOf = (vendors: readonly NamedEligibility[]): QualificationWarning[] =>
  vendors.filter((v) => v.eligibility.state === 'warn').map((v) => warningOf(v.supplierId, v.eligibility));
