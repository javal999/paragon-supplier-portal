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

/** @import { RFQCategory } from '@data/mockRfqs' */
/** @import { QualificationLevel, QualificationRequiredDoc, QualificationRuleLevel, VendorQualificationStatus } from '../data/types' */
import { PURCHASING_GROUPS } from './rfxConfig';

/** MR-10 BR-05 — the two sourcing types. */
/** @typedef {'direct' | 'indirect'} SourcingType */

/** @type {readonly SourcingType[]} */
export const SOURCING_TYPES = Object.freeze(['direct', 'indirect']);

/**
 * @param {unknown} v
 * @returns {v is SourcingType}
 */
export const isSourcingType = (v) => v === 'direct' || v === 'indirect';

/**
 * AR-17 — the RFQ category onto the supplier master's own category vocabulary.
 * Moved from `BuyerSourcing.tsx`: the invitee pool and the sourcing type both
 * read it, so it is one list.
 * @type {Readonly<Record<RFQCategory, readonly string[]>>}
 */
export const CATEGORY_TO_SUPPLIER_CATEGORY = Object.freeze({
  Fragrance: ['Fragrance'],
  'Active Ingredients': ['Active Ingredient'],
  Packaging: ['Packaging'],
  Emulsifiers: ['Raw Material'],
  Botanical: ['Raw Material'],
  Other: ['Raw Material', 'Active Ingredient', 'Packaging', 'Fragrance']
});

/** Every `RFQCategory`, in the order the map lists them. */
export const SOURCING_CATEGORIES = Object.freeze(
  /** @type {RFQCategory[]} */ (Object.keys(CATEGORY_TO_SUPPLIER_CATEGORY))
);

// ── The map ─────────────────────────────────────────────────────────────────

/** A map key: `category:<RFQCategory>` or `pg:<purchasing group code>`. */
/** @typedef {`category:${string}` | `pg:${string}`} SourcingTypeKey */

/**
 * @param {string} c
 * @returns {SourcingTypeKey}
 */
export const categoryKey = (c) => `category:${c}`;
/**
 * @param {string} code
 * @returns {SourcingTypeKey}
 */
export const groupKey = (code) => `pg:${code}`;

/**
 * Every key Procurement maps: each `RFQCategory`, then each purchasing group.
 * @type {readonly SourcingTypeKey[]}
 */
export const SOURCING_TYPE_KEYS = Object.freeze([
  ...SOURCING_CATEGORIES.map(categoryKey),
  ...PURCHASING_GROUPS.map((g) => groupKey(g.code))
]);

/**
 * @param {unknown} v
 * @returns {v is SourcingTypeKey}
 */
export const isSourcingTypeKey = (v) =>
  typeof v === 'string' && /** @type {readonly string[]} */ (SOURCING_TYPE_KEYS).includes(v);

/** The map: each key's sourcing type. */
/** @typedef {Readonly<Record<string, SourcingType>>} SourcingTypeMap */

/**
 * The starting map (assumption in the task prompt): every current category and
 * purchasing group (101 to 104) is Direct until Procurement adds Indirect ones.
 * @type {SourcingTypeMap}
 */
export const DEFAULT_SOURCING_TYPE_MAP = Object.freeze(
  Object.fromEntries(SOURCING_TYPE_KEYS.map((k) => [k, /** @type {SourcingType} */ ('direct')]))
);

/**
 * Why a map change is refused, or null (the `sourcing_type_governed` rule).
 * @param {string} key
 * @param {unknown} value
 * @returns {string | null}
 */
export function sourcingTypeRefusal(key, value) {
  if (!isSourcingTypeKey(key))
    return `SOURCING_TYPE_KEY_UNKNOWN: "${key}" is not a sourcing category or purchasing group`;
  if (!isSourcingType(value)) return `SOURCING_TYPE_INVALID: a sourcing type is direct or indirect`;
  return null;
}

// ── One event's type ────────────────────────────────────────────────────────

/** The event facts the type is read from, whichever event type it is. */
/**
 * `kind`:  `rfq` reads an `RFQCategory`; `rfi` / `rfp` a supplier-master category.
 * `sourcingType`:  Stored at publish (BR-06).
 *
 * @typedef {{
 *   readonly kind: 'rfq' | 'rfi' | 'rfp';
 *   readonly status: string;
 *   readonly materialCategory: string;
 *   readonly purchasingGroup?: string;
 *   readonly sourcingType?: SourcingType;
 * }} SourcingEventFacts
 */

/**
 * The type the map gives these facts, ignoring any stored type.
 * @param {Omit<SourcingEventFacts, 'status' | 'sourcingType'>} event
 * @param {SourcingTypeMap} map
 * @returns {SourcingType}
 */
export function mappedSourcingType(event, map) {
  if (event.kind !== 'rfq' && event.purchasingGroup) {
    return map[groupKey(event.purchasingGroup)] ?? 'direct';
  }
  /** @type {readonly string[]} */
  const categories =
    event.kind === 'rfq'
      ? [event.materialCategory]
      : SOURCING_CATEGORIES.filter(
          (c) => c !== 'Other' && CATEGORY_TO_SUPPLIER_CATEGORY[c].includes(event.materialCategory)
        );
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
 * @param {SourcingEventFacts} event
 * @param {SourcingTypeMap} map
 * @returns {SourcingType}
 */
export function sourcingTypeOf(event, map) {
  if (event.sourcingType) return event.sourcingType;
  if (event.status !== 'Draft') return 'direct';
  return mappedSourcingType(event, map);
}

// ── Eligibility (BR-05) ─────────────────────────────────────────────────────

/**
 * The lowest level each type accepts.
 * @type {Readonly<Record<SourcingType, QualificationRuleLevel>>}
 */
export const REQUIRED_LEVEL = Object.freeze({
  direct: 'preferred',
  indirect: 'approved'
});

/** @type {Readonly<Record<QualificationLevel, number>>} */
const RANK = { registered: 0, approved: 1, preferred: 2 };

/**
 * MR-10 BR-05 — Direct needs Preferred; Indirect needs Approved or Preferred.
 * @param {QualificationLevel} level
 * @param {SourcingType} sourcingType
 * @returns {boolean}
 */
export const qualifiedFor = (level, sourcingType) =>
  RANK[level] >= RANK[REQUIRED_LEVEL[sourcingType]];

/**
 * `qualified` — at or above the level. `warn` — below it while the list for
 * that level is a placeholder (owner ruling 2026-09-29). `refused` — below it
 * against a real list.
 */
/** @typedef {'qualified' | 'warn' | 'refused'} EligibilityState */

/** One vendor against one event's type, on a date. */
/**
 * `missing`:  The documents the vendor lacks for the required level (G1's list).
 * `placeholder`:  The list for the required level is still the placeholder.
 *
 * @typedef {{
 *   readonly state: EligibilityState;
 *   readonly sourcingType: SourcingType;
 *   readonly level: QualificationLevel;
 *   readonly requiredLevel: QualificationRuleLevel;
 *   readonly missing: readonly QualificationRequiredDoc[];
 *   readonly placeholder: boolean;
 * }} BiddingEligibility
 */

/**
 * A vendor's eligibility from its qualification (G1) and the list's placeholder flag.
 * @param {VendorQualificationStatus} qualification
 * @param {SourcingType} sourcingType
 * @param {boolean} placeholder
 * @returns {BiddingEligibility}
 */
export function biddingEligibility(qualification, sourcingType, placeholder) {
  const requiredLevel = REQUIRED_LEVEL[sourcingType];
  const ok = qualifiedFor(qualification.level, sourcingType);
  return {
    state: ok ? 'qualified' : placeholder ? 'warn' : 'refused',
    sourcingType,
    level: qualification.level,
    requiredLevel,
    missing: ok ? [] : qualification.missingFor[requiredLevel],
    placeholder
  };
}

/**
 * The missing documents as one line of text (requirement labels are data).
 * @param {Pick<BiddingEligibility, 'missing'>} e
 * @returns {string}
 */
export const missingText = (e) => e.missing.map((d) => d.label).join(', ');

/**
 * What an event or an award keeps about a vendor let through below the level
 * while the list was a placeholder (owner ruling 2026-09-29).
 */
/**
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly sourcingType: SourcingType;
 *   readonly level: QualificationLevel;
 *   readonly requiredLevel: QualificationRuleLevel;
 *   readonly missing: readonly string[];
 * }} QualificationWarning
 */

/**
 * @param {string} supplierId
 * @param {BiddingEligibility} e
 * @returns {QualificationWarning}
 */
export const warningOf = (supplierId, e) => ({
  supplierId,
  sourcingType: e.sourcingType,
  level: e.level,
  requiredLevel: e.requiredLevel,
  missing: e.missing.map((d) => d.label)
});

/** One vendor's eligibility, named. */
/**
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly eligibility: BiddingEligibility;
 * }} NamedEligibility
 */

/**
 * @param {QualificationLevel} l
 * @returns {string}
 */
const levelWord = (l) => l.charAt(0).toUpperCase() + l.slice(1);

/**
 * The reason a vendor is below the level, in the verb's words.
 * @param {NamedEligibility} v
 * @returns {string}
 */
export const notQualifiedText = (v) =>
  `${v.supplierName} (${v.supplierId}) is ${levelWord(v.eligibility.level)}; a ${v.eligibility.sourcingType} event needs ` +
  `${levelWord(v.eligibility.requiredLevel)}${v.eligibility.missing.length > 0 ? ` (missing: ${missingText(v.eligibility)})` : ''}`;

/**
 * AR-16 — the publish check (`rfx_invitees_qualified`): refused
 * SUPPLIER_NOT_QUALIFIED naming every invitee below the level against a real
 * list; null otherwise. Warned invitees pass (`qualificationWarningsOf`).
 * @param {readonly NamedEligibility[]} invitees
 * @returns {string | null}
 */
export function inviteesQualificationRefusal(invitees) {
  const refused = invitees.filter((v) => v.eligibility.state === 'refused');
  return refused.length > 0
    ? `SUPPLIER_NOT_QUALIFIED: ${refused.map(notQualifiedText).join('; ')}`
    : null;
}

/**
 * BL-147 (MAT-R4) — a record's qualification warnings as a scope may read them:
 * the buyer (`supplierId` null) reads every row; a supplier only its own row,
 * never another vendor's level or missing documents. The field is dropped when
 * nothing is left, so a supplier's read never carries an empty list either.
 * @template {{ readonly qualificationWarnings?: readonly QualificationWarning[] }} T
 * @param {T} record
 * @param {string | null} supplierId
 * @returns {T}
 */
export function withOwnQualificationWarnings(record, supplierId) {
  if (!supplierId || !record.qualificationWarnings) return record;
  const { qualificationWarnings, ...rest } = record;
  const own = qualificationWarnings.filter((w) => w.supplierId === supplierId);
  return /** @type {T} */ (own.length > 0 ? { ...rest, qualificationWarnings: own } : rest);
}

/**
 * The warnings a publish or an award records: every vendor let through on a placeholder list.
 * @param {readonly NamedEligibility[]} vendors
 * @returns {QualificationWarning[]}
 */
export const qualificationWarningsOf = (vendors) =>
  vendors
    .filter((v) => v.eligibility.state === 'warn')
    .map((v) => warningOf(v.supplierId, v.eligibility));
