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

import type {
  CertType,
  QualificationChange,
  QualificationExpiringDoc,
  QualificationLevel,
  QualificationRequiredDoc,
  QualificationRule,
  QualificationRuleLevel,
  VendorQualificationStatus,
  SupplierDocument,
  SupplierDocumentCategory,
} from '../data/types';
import { documentExpiry } from '../data/dayProjection';

/** The three levels, lowest first (BR-01). */
export const QUALIFICATION_LEVELS: readonly QualificationLevel[] = Object.freeze([
  'registered',
  'approved',
  'preferred',
]);

/** The two levels a list is set for, in the order the admin page shows them. */
export const QUALIFICATION_RULE_LEVELS: readonly QualificationRuleLevel[] = Object.freeze(['approved', 'preferred']);

export const isQualificationRuleLevel = (v: unknown): v is QualificationRuleLevel =>
  v === 'approved' || v === 'preferred';

/** The supplier document categories a requirement can name (`SupplierDocumentCategory`). */
export const DOCUMENT_CATEGORIES = Object.freeze([
  'Tax & Legal',
  'Halal Compliance',
  'Quality',
  'BPOM Regulatory',
  'Contract',
  'Other',
] as const satisfies readonly SupplierDocumentCategory[]);

/** The certificate types a requirement can narrow to (`CertType`). */
export const CERT_TYPES = Object.freeze([
  'HALAL_BPJPH',
  'HALAL_MUI_LEGACY',
  'HALAL_FOREIGN',
  'BPOM',
  'ISO',
  'OTHER',
] as const satisfies readonly CertType[]);

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
 */
export const PLACEHOLDER_RULES: readonly QualificationRule[] = Object.freeze([
  {
    level: 'approved',
    placeholder: true,
    requiredDocs: [
      { category: 'Tax & Legal', label: 'Business licence (NIB) and tax ID (NPWP)' },
      { category: 'Halal Compliance', label: 'Halal certificate' },
    ],
  },
  {
    level: 'preferred',
    placeholder: true,
    requiredDocs: [
      { category: 'Tax & Legal', label: 'Business licence (NIB) and tax ID (NPWP)' },
      { category: 'Halal Compliance', label: 'Halal certificate' },
      { category: 'Quality', label: 'GMP / ISO 22716 or ISO 9001' },
      { category: 'BPOM Regulatory', label: 'BPOM notification' },
    ],
  },
] satisfies QualificationRule[]);

// ── 1 · MATCHING ─────────────────────────────────────────────────────────────

/** Two requirements name the same document when category and cert type agree. */
export const sameRequirement = (a: QualificationRequiredDoc, b: QualificationRequiredDoc): boolean =>
  a.category === b.category && (a.certType ?? null) === (b.certType ?? null);

/** Does this document meet this requirement? (category, and cert type when named) */
export function meetsRequirement(doc: SupplierDocument, req: QualificationRequiredDoc): boolean {
  if (doc.category !== req.category) return false;
  return req.certType === undefined || doc.declaration?.certType === req.certType;
}

const ms = (iso: string): number => Date.parse(iso);

/** When a valid document started to count, or null when the row gives no date. */
export function validFrom(doc: SupplierDocument): string | null {
  const from = doc.verifiedAt ?? doc.issuedDate;
  return from && Number.isFinite(ms(from)) ? from : null;
}

/** Does the document count toward a level on `onDate`? */
export function documentCounts(doc: SupplierDocument, onDate: string): boolean {
  if (doc.status !== 'Valid') return false;
  const from = validFrom(doc);
  if (from !== null && ms(from) > ms(onDate)) return false;
  return documentExpiry(doc, onDate) !== 'expired';
}

// ── 2 · THE LEVEL ────────────────────────────────────────────────────────────

const ruleFor = (rules: readonly QualificationRule[], level: QualificationRuleLevel): QualificationRule | undefined =>
  rules.find((r) => r.level === level);

/** The level from documents already known to count, and what each list still lacks. */
function levelOfCounted(
  counted: readonly SupplierDocument[],
  rules: readonly QualificationRule[],
): { level: QualificationLevel; approvedMissing: QualificationRequiredDoc[]; preferredMissing: QualificationRequiredDoc[] } {
  const missing = (level: QualificationRuleLevel): QualificationRequiredDoc[] =>
    (ruleFor(rules, level)?.requiredDocs ?? []).filter((req) => !counted.some((d) => meetsRequirement(d, req)));
  const approvedMissing = missing('approved');
  const preferredMissing = missing('preferred');
  const level: QualificationLevel =
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
 */
export function qualificationFromDocuments(
  docs: readonly SupplierDocument[],
  rules: readonly QualificationRule[],
  onDate: string,
): VendorQualificationStatus {
  const counted = docs.filter((d) => documentCounts(d, onDate));
  const { level, approvedMissing, preferredMissing } = levelOfCounted(counted, rules);

  // The documents holding up the level the vendor has, inside the documents'
  // own expiry window — each would drop the level when it lapses (AC-06).
  const held = level === 'registered' ? [] : (ruleFor(rules, level)?.requiredDocs ?? []);
  const expiringSoon: QualificationExpiringDoc[] = counted
    .filter((d) => d.expiryDate !== null && documentExpiry(d, onDate) === 'expiring')
    .filter((d) => held.some((req) => meetsRequirement(d, req)))
    .sort((a, b) => ms(a.expiryDate as string) - ms(b.expiryDate as string))
    .map((d) => ({ documentId: d.id, name: d.name, category: d.category, expiryDate: d.expiryDate as string }));

  return { level, missingFor: { approved: approvedMissing, preferred: preferredMissing }, expiringSoon };
}

// ── 3 · THE HISTORY (plan AD-2) ─────────────────────────────────────────────

/** The lists in force from `at` on. The first entry is the seed (`at: null`). */
export interface RuleEpoch {
  readonly at: string | null;
  readonly rules: readonly QualificationRule[];
  /** The list whose change opened this epoch; absent on the seed. */
  readonly changed?: QualificationRuleLevel;
}

interface ReplayEvent {
  readonly at: string;
  /** Order among events at the same instant: list changes, then documents
   *  becoming valid, then documents lapsing. */
  readonly rank: 0 | 1 | 2;
  readonly seq: number;
  readonly doc?: SupplierDocument;
  readonly epoch?: RuleEpoch;
}

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
 */
export function qualificationHistoryFrom(
  docs: readonly SupplierDocument[],
  epochs: readonly RuleEpoch[],
  nowIso: string,
): QualificationChange[] {
  const events: ReplayEvent[] = [];
  const counted = new Set<SupplierDocument>();
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

  let rules: readonly QualificationRule[] = epochs.find((e) => e.at === null)?.rules ?? [];
  let level = levelOfCounted([...counted], rules).level;
  const history: QualificationChange[] = [];
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
      ...(e.epoch?.changed !== undefined ? { causeRuleLevel: e.epoch.changed } : {}),
    });
    level = next;
  }
  return history;
}

// ── 4 · THE RULE FOR A LIST (BR-04) ──────────────────────────────────────────

/** A requirement as the verb accepts it, or null when it is malformed. */
function requirementOf(v: unknown): QualificationRequiredDoc | null {
  if (typeof v !== 'object' || v === null) return null;
  const r = v as Record<string, unknown>;
  if (!(DOCUMENT_CATEGORIES as readonly unknown[]).includes(r.category)) return null;
  if (r.certType !== undefined && !(CERT_TYPES as readonly unknown[]).includes(r.certType)) return null;
  if (typeof r.label !== 'string' || r.label.trim() === '') return null;
  return {
    category: r.category as SupplierDocumentCategory,
    ...(r.certType !== undefined ? { certType: r.certType as CertType } : {}),
    label: r.label.trim(),
  };
}

/** The requirements as recorded: validated and trimmed, or null when any is malformed. */
export function requirementsOf(v: unknown): QualificationRequiredDoc[] | null {
  if (!Array.isArray(v)) return null;
  const out: QualificationRequiredDoc[] = [];
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
 */
export function qualificationRuleRefusal(
  level: unknown,
  requiredDocs: unknown,
  rulesInForce: readonly QualificationRule[],
): string | null {
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
  const approved = level === 'approved' ? reqs : (ruleFor(rulesInForce, 'approved')?.requiredDocs ?? []);
  const preferred = level === 'preferred' ? reqs : (ruleFor(rulesInForce, 'preferred')?.requiredDocs ?? []);
  const lacking = approved.filter((a) => !preferred.some((p) => sameRequirement(p, a)));
  if (lacking.length > 0) {
    return `PREFERRED_MISSING_APPROVED: the Preferred list must include every Approved document; it lacks ${lacking
      .map((r) => r.category + (r.certType ? ` (${r.certType})` : ''))
      .join(', ')}`;
  }
  return null;
}

/** The lists in force with one list replaced — what a save would leave. */
export function withRule(
  rules: readonly QualificationRule[],
  level: QualificationRuleLevel,
  requiredDocs: readonly QualificationRequiredDoc[],
): QualificationRule[] {
  const others = rules.filter((r) => r.level !== level);
  return [...others, { level, requiredDocs, placeholder: false }].sort(
    (a, b) => QUALIFICATION_RULE_LEVELS.indexOf(a.level) - QUALIFICATION_RULE_LEVELS.indexOf(b.level),
  );
}

/** How many vendors a proposed set of lists would move up and down (edge case 2). */
export function levelChanges(
  docsBySupplier: ReadonlyMap<string, readonly SupplierDocument[]>,
  supplierIds: readonly string[],
  current: readonly QualificationRule[],
  proposed: readonly QualificationRule[],
  onDate: string,
): { readonly up: number; readonly down: number } {
  let up = 0;
  let down = 0;
  for (const id of supplierIds) {
    const docs = docsBySupplier.get(id) ?? [];
    const before = QUALIFICATION_LEVELS.indexOf(qualificationFromDocuments(docs, current, onDate).level);
    const after = QUALIFICATION_LEVELS.indexOf(qualificationFromDocuments(docs, proposed, onDate).level);
    if (after > before) up += 1;
    if (after < before) down += 1;
  }
  return { up, down };
}
