// ────────────────────────────────────────────────────────────────────────────
// VENDOR QUALIFICATION — THE RULES (Material G1 · MR-10 BR-01 to BR-04, BR-09;
// plan AD-1, AD-2, AR-18).
//
// A vendor is Registered, Approved or Preferred, and the level is COMPUTED from
// its documents against the lists Procurement and Quality set (BR-03). Nobody
// sets a level by hand, and nothing is written when a level is read. These are
// the pure halves, with no store and no clock:
//
//   · `qualificationFromDocuments` — the level on a date and what is missing;
//   · `qualificationHistoryFrom`   — the level changes, REPLAYED in date order
//     from the documents and the rule lists (AD-2), never recorded on read;
//   · `qualificationRuleRefusal`   — the one refusal the verb's policy hook and
//     the admin page's pre-check both call (MAT-R2);
//   · `levelChanges`               — how many vendors a proposed list would
//     move, which the admin page shows before saving (edge case 2).
//
// ── WHEN A DOCUMENT COUNTS ─────────────────────────────────────────────────
// Its stored status is `Valid` and `documentExpiry` does not call it expired on
// the date (the supplier documents' own window, plan AR-18 — not the halal
// registry's). For the replay it also has to have BECOME valid by then: from
// `verifiedAt` when compliance verified it through the hub, from `issuedDate`
// for a seeded row that predates the verb. `Valid` is the flow's terminal
// state, so a valid document leaves the count only by expiring.
//
// ── HOW A DOCUMENT MEETS A REQUIREMENT ─────────────────────────────────────
// By `category`, and by the declared `certType` as well when the requirement
// names one (AR-18). Seeded rows carry no declaration, so a requirement that
// names a certificate type is met only by a declared, verified certificate.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CertType, QualificationChange, QualificationExpiringDoc, QualificationLevel, QualificationRequiredDoc, QualificationRule, QualificationRuleLevel, VendorQualificationStatus, SupplierDocument, SupplierDocumentCategory } from '../data/types' */
import { documentExpiry } from '../data/dayProjection';

/**
 * The three levels, lowest first (BR-01).
 * @type {readonly QualificationLevel[]}
 */
export const QUALIFICATION_LEVELS = Object.freeze(['registered', 'approved', 'preferred']);

/**
 * The two levels a list is set for, in the order the admin page shows them.
 * @type {readonly QualificationRuleLevel[]}
 */
export const QUALIFICATION_RULE_LEVELS = Object.freeze(['approved', 'preferred']);

/**
 * @param {unknown} v
 * @returns {v is QualificationRuleLevel}
 */
export const isQualificationRuleLevel = (v) => v === 'approved' || v === 'preferred';

/** The supplier document categories a requirement can name (`SupplierDocumentCategory`). */
export const DOCUMENT_CATEGORIES = Object.freeze(
  /** @satisfies {readonly SupplierDocumentCategory[]} */ (
    /** @type {const} */ ([
      'Tax & Legal',
      'Halal Compliance',
      'Quality',
      'BPOM Regulatory',
      'Contract',
      'Other'
    ])
  )
);

/** The certificate types a requirement can narrow to (`CertType`). */
export const CERT_TYPES = Object.freeze(
  /** @satisfies {readonly CertType[]} */ (
    /** @type {const} */ ([
      'HALAL_BPJPH',
      'HALAL_MUI_LEGACY',
      'HALAL_FOREIGN',
      'BPOM',
      'ISO',
      'OTHER'
    ])
  )
);

/**
 * THE PLACEHOLDER LISTS (MAT-D15, requirements §13.2). Procurement and Quality
 * have not set the lists yet; until they do, these apply, labelled everywhere
 * as a placeholder, and enforcement stays on (plan AD-8).
 *
 * ⚠️ The recommendation's "halal certificate for materials in its scope" and
 * "BPOM where applicable" are conditional; a list has no condition, so the
 * placeholder asks every vendor for both. NIB and NPWP are both `Tax & Legal`
 * documents with no certificate type to tell them apart, so they are one
 * requirement here.
 * @type {readonly QualificationRule[]}
 */
export const PLACEHOLDER_RULES = Object.freeze(
  /** @satisfies {QualificationRule[]} */ ([
    {
      level: 'approved',
      placeholder: true,
      requiredDocs: [
        { category: 'Tax & Legal', label: 'Business licence (NIB) and tax ID (NPWP)' },
        { category: 'Halal Compliance', label: 'Halal certificate' }
      ]
    },
    {
      level: 'preferred',
      placeholder: true,
      requiredDocs: [
        { category: 'Tax & Legal', label: 'Business licence (NIB) and tax ID (NPWP)' },
        { category: 'Halal Compliance', label: 'Halal certificate' },
        { category: 'Quality', label: 'GMP / ISO 22716 or ISO 9001' },
        { category: 'BPOM Regulatory', label: 'BPOM notification' }
      ]
    }
  ])
);

// ── 1 · MATCHING ─────────────────────────────────────────────────────────────

/**
 * Two requirements name the same document when category and cert type agree.
 * @param {QualificationRequiredDoc} a
 * @param {QualificationRequiredDoc} b
 * @returns {boolean}
 */
export const sameRequirement = (a, b) =>
  a.category === b.category && (a.certType ?? null) === (b.certType ?? null);

/**
 * Does this document meet this requirement? (category, and cert type when named)
 * @param {SupplierDocument} doc
 * @param {QualificationRequiredDoc} req
 * @returns {boolean}
 */
export function meetsRequirement(doc, req) {
  if (doc.category !== req.category) return false;
  return req.certType === undefined || doc.declaration?.certType === req.certType;
}

/**
 * @param {string} iso
 * @returns {number}
 */
const ms = (iso) => Date.parse(iso);

/**
 * When a valid document started to count, or null when the row gives no date.
 * @param {SupplierDocument} doc
 * @returns {string | null}
 */
export function validFrom(doc) {
  const from = doc.verifiedAt ?? doc.issuedDate;
  return from && Number.isFinite(ms(from)) ? from : null;
}

/**
 * Does the document count toward a level on `onDate`?
 * @param {SupplierDocument} doc
 * @param {string} onDate
 * @returns {boolean}
 */
export function documentCounts(doc, onDate) {
  if (doc.status !== 'Valid') return false;
  const from = validFrom(doc);
  if (from !== null && ms(from) > ms(onDate)) return false;
  return documentExpiry(doc, onDate) !== 'expired';
}

// ── 2 · THE LEVEL ────────────────────────────────────────────────────────────

/**
 * @param {readonly QualificationRule[]} rules
 * @param {QualificationRuleLevel} level
 * @returns {QualificationRule | undefined}
 */
const ruleFor = (rules, level) => rules.find((r) => r.level === level);

/**
 * The level from documents already known to count, and what each list still lacks.
 * @param {readonly SupplierDocument[]} counted
 * @param {readonly QualificationRule[]} rules
 * @returns {{ level: QualificationLevel; approvedMissing: QualificationRequiredDoc[]; preferredMissing: QualificationRequiredDoc[] }}
 */
function levelOfCounted(counted, rules) {
  /**
   * @param {QualificationRuleLevel} level
   * @returns {QualificationRequiredDoc[]}
   */
  const missing = (level) =>
    (ruleFor(rules, level)?.requiredDocs ?? []).filter(
      (req) => !counted.some((d) => meetsRequirement(d, req))
    );
  const approvedMissing = missing('approved');
  const preferredMissing = missing('preferred');
  /** @type {QualificationLevel} */
  const level =
    approvedMissing.length === 0 && preferredMissing.length === 0
      ? 'preferred'
      : approvedMissing.length === 0
        ? 'approved'
        : 'registered';
  return { level, approvedMissing, preferredMissing };
}

/**
 * A vendor's level on `onDate` from its documents and the lists in force
 * (BR-01 to BR-03): Preferred when every Preferred document counts, otherwise
 * Approved when every Approved document counts, otherwise Registered. A vendor
 * with no documents is Registered (edge case 3). There is no override.
 * @param {readonly SupplierDocument[]} docs
 * @param {readonly QualificationRule[]} rules
 * @param {string} onDate
 * @returns {VendorQualificationStatus}
 */
export function qualificationFromDocuments(docs, rules, onDate) {
  const counted = docs.filter((d) => documentCounts(d, onDate));
  const { level, approvedMissing, preferredMissing } = levelOfCounted(counted, rules);

  // The documents holding up the level the vendor has, inside the documents'
  // own expiry window — each would drop the level when it lapses (AC-06).
  const held = level === 'registered' ? [] : (ruleFor(rules, level)?.requiredDocs ?? []);
  /** @type {QualificationExpiringDoc[]} */
  const expiringSoon = counted
    .filter((d) => d.expiryDate !== null && documentExpiry(d, onDate) === 'expiring')
    .filter((d) => held.some((req) => meetsRequirement(d, req)))
    .sort(
      (a, b) => ms(/** @type {string} */ (a.expiryDate)) - ms(/** @type {string} */ (b.expiryDate))
    )
    .map((d) => ({
      documentId: d.id,
      name: d.name,
      category: d.category,
      expiryDate: /** @type {string} */ (d.expiryDate)
    }));

  return {
    level,
    missingFor: { approved: approvedMissing, preferred: preferredMissing },
    expiringSoon
  };
}

// ── 3 · THE HISTORY (plan AD-2) ─────────────────────────────────────────────

/** The lists in force from `at` on. The first entry is the seed (`at: null`). */
/**
 * `changed`:  The list whose change opened this epoch; absent on the seed.
 *
 * @typedef {{
 *   readonly at: string | null;
 *   readonly rules: readonly QualificationRule[];
 *   readonly changed?: QualificationRuleLevel;
 * }} RuleEpoch
 */

/**
 * `rank`:  Order among events at the same instant: list changes, then documents  becoming valid, then documents lapsing.
 *
 * @typedef {{
 *   readonly at: string;
 *   readonly rank: 0 | 1 | 2;
 *   readonly seq: number;
 *   readonly doc?: SupplierDocument;
 *   readonly epoch?: RuleEpoch;
 * }} ReplayEvent
 */

/**
 * Replay a vendor's documents and the rule lists in date order and return
 * every level change, oldest first (AD-2). Pure: it reads the arguments only,
 * so two reads return the same history and nothing is written by either.
 * Events after `nowIso` are not history yet and are left out, so the last
 * change lands on the level `qualificationFromDocuments` gives for `nowIso`.
 *
 * The replay walks the events one by one — a document joins the count when it
 * became valid and leaves it when it lapses; a list change swaps the lists —
 * so each change names the one event that caused it. The hub clock is
 * simulated and can stamp several acts with one instant; at a tie, list
 * changes come first, then documents becoming valid, then documents lapsing.
 * @param {readonly SupplierDocument[]} docs
 * @param {readonly RuleEpoch[]} epochs
 * @param {string} nowIso
 * @returns {QualificationChange[]}
 */
export function qualificationHistoryFrom(docs, epochs, nowIso) {
  /** @type {ReplayEvent[]} */
  const events = [];
  const counted = /** @type {Set<SupplierDocument>} */ (new Set());
  let seq = 0;
  for (const e of epochs) {
    if (e.at !== null) events.push({ at: e.at, rank: 0, seq: seq++, epoch: e });
  }
  for (const d of docs) {
    if (d.status !== 'Valid') continue;
    const from = validFrom(d);
    // A valid row with no date at all has counted for as long as the replay knows.
    if (from === null) counted.add(d);
    else events.push({ at: from, rank: 1, seq: seq++, doc: d });
    if (d.expiryDate && Number.isFinite(ms(d.expiryDate))) {
      events.push({ at: d.expiryDate, rank: 2, seq: seq++, doc: d });
    }
  }
  const ordered = events
    .filter((e) => ms(e.at) <= ms(nowIso))
    .sort((a, b) => ms(a.at) - ms(b.at) || a.rank - b.rank || a.seq - b.seq);

  /** @type {readonly QualificationRule[]} */
  let rules = epochs.find((e) => e.at === null)?.rules ?? [];
  let level = levelOfCounted([...counted], rules).level;
  /** @type {QualificationChange[]} */
  const history = [];
  for (const e of ordered) {
    if (e.epoch) rules = e.epoch.rules;
    else if (e.doc && e.rank === 1) counted.add(e.doc);
    else if (e.doc) counted.delete(e.doc);
    const next = levelOfCounted([...counted], rules).level;
    if (next === level) continue;
    history.push({
      at: e.at,
      from: level,
      to: next,
      causeDocumentId: e.doc?.id ?? null,
      ...(e.epoch?.changed !== undefined ? { causeRuleLevel: e.epoch.changed } : {})
    });
    level = next;
  }
  return history;
}

// ── 4 · THE RULE FOR A LIST (BR-04) ──────────────────────────────────────────

/**
 * A requirement as the verb accepts it, or null when it is malformed.
 * @param {unknown} v
 * @returns {QualificationRequiredDoc | null}
 */
function requirementOf(v) {
  if (typeof v !== 'object' || v === null) return null;
  const r = /** @type {Record<string, unknown>} */ (v);
  if (!(/** @type {readonly unknown[]} */ (DOCUMENT_CATEGORIES).includes(r.category))) return null;
  if (
    r.certType !== undefined &&
    !(/** @type {readonly unknown[]} */ (CERT_TYPES).includes(r.certType))
  )
    return null;
  if (typeof r.label !== 'string' || r.label.trim() === '') return null;
  return {
    category: /** @type {SupplierDocumentCategory} */ (r.category),
    ...(r.certType !== undefined ? { certType: /** @type {CertType} */ (r.certType) } : {}),
    label: r.label.trim()
  };
}

/**
 * The requirements as recorded: validated and trimmed, or null when any is malformed.
 * @param {unknown} v
 * @returns {QualificationRequiredDoc[] | null}
 */
export function requirementsOf(v) {
  if (!Array.isArray(v)) return null;
  /** @type {QualificationRequiredDoc[]} */
  const out = [];
  for (const item of v) {
    const r = requirementOf(item);
    if (r === null) return null;
    out.push(r);
  }
  return out;
}

/**
 * Why `t_qualification_rule_set` would be refused, or null.
 * `QUALIFICATION_LEVEL_UNKNOWN` — the list is not Approved or Preferred.
 * `QUALIFICATION_RULE_INVALID` — the list is empty, an entry names no known
 *   category or certificate type or has no label, or two entries name the same
 *   document.
 * `PREFERRED_MISSING_APPROVED` — the Preferred list would lack a document the
 *   Approved list requires (BR-04: Preferred always includes every Approved
 *   document), whichever of the two lists is being set.
 * @param {unknown} level
 * @param {unknown} requiredDocs
 * @param {readonly QualificationRule[]} rulesInForce
 * @returns {string | null}
 */
export function qualificationRuleRefusal(level, requiredDocs, rulesInForce) {
  if (!isQualificationRuleLevel(level)) {
    return `QUALIFICATION_LEVEL_UNKNOWN: the list must be approved or preferred, got ${JSON.stringify(level)}`;
  }
  const reqs = requirementsOf(requiredDocs);
  if (reqs === null || reqs.length === 0) {
    return 'QUALIFICATION_RULE_INVALID: every required document needs a known category, an optional known certificate type and a label, and the list cannot be empty';
  }
  if (reqs.some((r, i) => reqs.findIndex((o) => sameRequirement(o, r)) !== i)) {
    return 'QUALIFICATION_RULE_INVALID: the same document is listed twice';
  }
  const approved =
    level === 'approved' ? reqs : (ruleFor(rulesInForce, 'approved')?.requiredDocs ?? []);
  const preferred =
    level === 'preferred' ? reqs : (ruleFor(rulesInForce, 'preferred')?.requiredDocs ?? []);
  const lacking = approved.filter((a) => !preferred.some((p) => sameRequirement(p, a)));
  if (lacking.length > 0) {
    return `PREFERRED_MISSING_APPROVED: the Preferred list must include every Approved document; it lacks ${lacking
      .map((r) => r.category + (r.certType ? ` (${r.certType})` : ''))
      .join(', ')}`;
  }
  return null;
}

/**
 * The lists in force with one list replaced — what a save would leave.
 * @param {readonly QualificationRule[]} rules
 * @param {QualificationRuleLevel} level
 * @param {readonly QualificationRequiredDoc[]} requiredDocs
 * @returns {QualificationRule[]}
 */
export function withRule(rules, level, requiredDocs) {
  const others = rules.filter((r) => r.level !== level);
  return [...others, { level, requiredDocs, placeholder: false }].sort(
    (a, b) =>
      QUALIFICATION_RULE_LEVELS.indexOf(a.level) - QUALIFICATION_RULE_LEVELS.indexOf(b.level)
  );
}

/**
 * How many vendors a proposed set of lists would move up and down (edge case 2).
 * @param {ReadonlyMap<string, readonly SupplierDocument[]>} docsBySupplier
 * @param {readonly string[]} supplierIds
 * @param {readonly QualificationRule[]} current
 * @param {readonly QualificationRule[]} proposed
 * @param {string} onDate
 * @returns {{ readonly up: number; readonly down: number }}
 */
export function levelChanges(docsBySupplier, supplierIds, current, proposed, onDate) {
  let up = 0;
  let down = 0;
  for (const id of supplierIds) {
    const docs = docsBySupplier.get(id) ?? [];
    const before = QUALIFICATION_LEVELS.indexOf(
      qualificationFromDocuments(docs, current, onDate).level
    );
    const after = QUALIFICATION_LEVELS.indexOf(
      qualificationFromDocuments(docs, proposed, onDate).level
    );
    if (after > before) up += 1;
    if (after < before) down += 1;
  }
  return { up, down };
}
