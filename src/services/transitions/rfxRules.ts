// ────────────────────────────────────────────────────────────────────────────
// RFx RULES — the pure predicates behind the RFx verbs (REQ-E03-01 to -05).
//
// Same contract as `callOffRules` / `forecastRules`: no I/O, no clock of its
// own, no store. Every function takes the facts and returns an answer, so the
// policy hook, the surface and the spec all read the SAME rule rather than
// three implementations that drift. A clock-derived state (past deadline, due
// soon) is computed HERE from an injected `now` and never stored (law 0.5).
// ────────────────────────────────────────────────────────────────────────────

import { SupplierStatus } from '../../types/supplier.types';
import type {
  AwardLine,
  RfiAnswer,
  RfiQuestion,
  RfpPricingAnswer,
  RfpPricingRequest,
  RfpTermAnswer,
  RfpTermRow,
  RfxCustomSection,
  RfxInvitee,
} from '../sourcing/types';
import {
  RFI_SECTION_ORDER,
  RFP_TERM_GROUP_ORDER,
  RFP_TERM_VALUE_KINDS,
  RFX_QUESTION_TYPES,
  isBoundedType,
  isChoiceType,
  isCustomTermId,
  rfpTerm,
  rfpTermKindOf,
} from '../sourcing/rfxConfig';
import { BID_CURRENCIES } from '../../lib/currencyPolicy';
import { isCalendarDate } from '../../lib/workingCalendar';
import { isSessionAttachmentMeta } from '../../lib/sessionFiles';
import type { GateResult } from '../sourcing/complianceGate';
import {
  matchesSupplierFilters,
  type CertValidity,
  type PerformanceBand,
  type SupplierFilters,
} from '../sourcing/supplierFilters';

// ── REQ-E03-01 — who may be invited ─────────────────────────────────────────

/**
 * The supplier statuses an invitee search may return (BR-04, AC-03).
 *
 * ⚠️ **A LIST OF WHAT IS ALLOWED, NOT A LIST OF WHAT IS REFUSED.** The refusing
 * form (`status !== SUSPENDED && status !== BLACKLISTED`) passes every status
 * added after it is written, so the day a seventh status lands it is selectable
 * by default and nothing goes red. This form refuses it by default instead, and
 * a new status that SHOULD be selectable is one visible edit here.
 */
export const SELECTABLE_SUPPLIER_STATUSES: readonly SupplierStatus[] = [SupplierStatus.ACTIVE];

/** True when a supplier in this status may be selected as an invitee. */
export const isSelectableSupplier = (status: SupplierStatus): boolean =>
  SELECTABLE_SUPPLIER_STATUSES.includes(status);

/** The shape the invitee filter reads — a supplier master row, narrowed. */
export interface InviteeCandidate {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly category: string;
  readonly purchasingGroup?: string;
  readonly status: SupplierStatus;
  /** REQ-E03-01 edge case — `null` is "No history", never 0%. */
  readonly otif: number | null;
  readonly country: string;
  /** BL-52 / BR-05 — halal and BPOM certificate validity, derived at read. */
  readonly certificates: CertValidity;
  /** BL-52 / BR-05 — the performance band: the calculated grade, or "No history". */
  readonly band: PerformanceBand;
  /**
   * CR-23 / BR-06 — the compliance gate against the event's materials. A
   * failing supplier stays a candidate (it can be invited and can quote); the
   * list shows it cannot be awarded and why. Absent = not computed.
   */
  readonly gate?: GateResult;
}

/**
 * The filters a buyer may combine (BR-01, and BR-05's certificate validity,
 * performance band and country — `SupplierFilters`). Absent = that filter is off.
 */
export interface InviteeFilter extends SupplierFilters {
  readonly category?: string;
  readonly purchasingGroup?: string;
  /**
   * CR-23 — the event's material codes, which the gate is judged against. NOT
   * a filter: it narrows nothing, it only tells the read which materials the
   * certificates must cover.
   */
  readonly materialCodes?: readonly string[];
}

/**
 * REQ-E03-01 AC-01 / AC-03 — candidates matching the active filters, with every
 * non-selectable status removed FIRST.
 *
 * The status gate runs before the filters and not as one of them: a blacklisted
 * supplier is not "filtered out", it is not a candidate at all, and a caller
 * that passes no filter must still not be handed one.
 */
export function filterInvitees(
  candidates: readonly InviteeCandidate[],
  filter: InviteeFilter = {},
): readonly InviteeCandidate[] {
  return candidates
    .filter((c) => isSelectableSupplier(c.status))
    .filter((c) => (filter.category ? c.category === filter.category : true))
    .filter((c) => (filter.purchasingGroup ? c.purchasingGroup === filter.purchasingGroup : true))
    // BL-52 — certificate validity, then performance band, then country (BR-05).
    .filter((c) => matchesSupplierFilters(c, filter));
}

// ── CR-15 — the reliability axis from OTIF ──────────────────────────────────

/** CR-15 — the reliability score of a supplier with no OTIF history. */
export const NO_HISTORY_RELIABILITY = 50;

/**
 * CR-15 — the reliability axis: the supplier's OTIF, or 50 when it has none.
 *
 * ⚠️ **`?? 50`, NEVER `|| 50`.** A measured OTIF of 0 is a real and terrible
 * number, and `||` would silently promote that supplier to the no-history
 * middle. The two states this rule exists to separate are "measured badly" and
 * "never measured".
 */
export const reliabilityScoreFor = (otif: number | null | undefined): number =>
  otif === null || otif === undefined ? NO_HISTORY_RELIABILITY : otif;

// ── Deadlines (REQ-E03-02 / -03 / -05) ──────────────────────────────────────

/**
 * The deadline in force for ONE invitee: its own extension when it has one,
 * otherwise the event's. Pure, so the verb and the screen cannot disagree.
 */
export function effectiveDeadline(
  eventDeadline: string,
  invitees: readonly RfxInvitee[],
  supplierId: string,
): string {
  return invitees.find((i) => i.supplierId === supplierId)?.deadline ?? eventDeadline;
}

/** True when `nowIso` is strictly after the end of the deadline day. */
export function isPastDeadline(deadline: string, nowIso: string): boolean {
  const end = Date.parse(`${deadline.slice(0, 10)}T23:59:59.999Z`);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(end) || !Number.isFinite(now)) return false;
  return now > end;
}

/** Whole days from `nowIso` to the end of the deadline day (negative = past). */
export function daysToDeadline(deadline: string, nowIso: string): number {
  const end = Date.parse(`${deadline.slice(0, 10)}T23:59:59.999Z`);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(end) || !Number.isFinite(now)) return 0;
  return Math.floor((end - now) / 86_400_000);
}

/** A negotiation round or event closing within this many days is "closing soon". */
export const CLOSING_SOON_DAYS = 3;

/** True when the deadline has not passed and is inside the closing-soon window. */
export const isClosingSoon = (deadline: string, nowIso: string): boolean =>
  !isPastDeadline(deadline, nowIso) && daysToDeadline(deadline, nowIso) <= CLOSING_SOON_DAYS;

/** A new deadline is an extension only when it moves LATER than the old one. */
export function isExtension(current: string, next: string): boolean {
  const a = Date.parse(`${current.slice(0, 10)}T00:00:00.000Z`);
  const b = Date.parse(`${next.slice(0, 10)}T00:00:00.000Z`);
  return Number.isFinite(a) && Number.isFinite(b) && b > a;
}

// ── REQ-E03-02 — RFI answers ────────────────────────────────────────────────

/** True when an answer carries something a reader could act on. */
export function isAnswered(answer: RfiAnswer | undefined): boolean {
  if (!answer) return false;
  // A price range is answered when both ends are numbers; an attachment when a
  // file is named. Either is an answer even with no `value`.
  if (answer.range && Number.isFinite(answer.range.min) && Number.isFinite(answer.range.max)) return true;
  if (answer.attachments && answer.attachments.length > 0) return true;
  const { value } = answer;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim().length > 0;
  return false;
}

// ── RFx authoring — typed questions (spec: RFI and RFP authoring) ───────────

const hasText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/**
 * The refusal the buyer's section list earns, or null. A custom section is
 * `custom-…`, carries a title, and appears once.
 */
export function customSectionsRefusal(sections: readonly RfxCustomSection[] | undefined): string | null {
  if (sections === undefined) return null;
  if (!Array.isArray(sections)) return 'SECTIONS_MALFORMED: custom sections are a list';
  const seen = new Set<string>();
  for (const s of sections) {
    if (!s || typeof s.id !== 'string' || !s.id.startsWith('custom-')) {
      return `SECTION_ID_INVALID: ${String(s?.id)} is not a custom section id`;
    }
    if (!hasText(s.title)) return `SECTION_TITLE_REQUIRED: ${s.id} needs a title`;
    if (seen.has(s.id)) return `DUPLICATE_SECTION: ${s.id}`;
    seen.add(s.id);
  }
  return null;
}

/**
 * The refusal ONE question earns, or null — the rules the create verb, the
 * template store and the option editor all read, so the three cannot disagree.
 *
 * ⚠️ **A CHOICE QUESTION IS ITS OPTION LIST.** Fewer than two options is not a
 * choice, a blank or repeated label is a pick nobody can tell apart, and a
 * supplier must never be asked to choose from a list PTI did not write (the
 * reason the option editor did not exist before BL-36 closed).
 */
export function rfiQuestionRefusal(
  q: RfiQuestion,
  customSectionIds: readonly string[] = [],
): string | null {
  if (!q || typeof q !== 'object') return 'QUESTION_INCOMPLETE: a question is an object';
  if (!RFX_QUESTION_TYPES.includes(q.type)) return `UNKNOWN_QUESTION_TYPE: ${String(q.type)}`;
  if (!hasText(q.id) || !hasText(q.promptKey)) {
    return 'QUESTION_INCOMPLETE: every question names itself and what it asks';
  }
  const inTemplate = (RFI_SECTION_ORDER as readonly string[]).includes(q.sectionId);
  if (!inTemplate && !customSectionIds.includes(q.sectionId)) {
    return `UNKNOWN_SECTION: ${q.id} sits in ${String(q.sectionId)}, which this event does not have`;
  }
  if (isChoiceType(q.type)) {
    const options = Array.isArray(q.options) ? q.options : [];
    if (options.length < 2) return `CHOICE_NEEDS_OPTIONS: ${q.id} needs at least two options`;
    const labels = options.map((o) => (q.optionLabels?.[o] ?? o).trim().toLowerCase());
    if (options.some((o) => !hasText(o)) || labels.some((l) => l.length === 0)) {
      return `OPTION_BLANK: ${q.id} has an option with no label`;
    }
    if (new Set(options).size !== options.length || new Set(labels).size !== labels.length) {
      return `OPTION_DUPLICATE: ${q.id} lists the same option twice`;
    }
  }
  const bounds = [q.min, q.max].filter((b) => b !== undefined);
  if (bounds.length > 0) {
    if (!isBoundedType(q.type)) return `BOUNDS_NOT_APPLICABLE: ${q.id} is not a number question`;
    if (bounds.some((b) => typeof b !== 'number' || !Number.isFinite(b))) {
      return `BAD_BOUNDS: ${q.id} min and max must be numbers`;
    }
    if (q.min !== undefined && q.max !== undefined && q.min > q.max) {
      return `BAD_BOUNDS: ${q.id} min is above max`;
    }
    if (q.type === 'percentage' && bounds.some((b) => (b as number) < 0 || (b as number) > 100)) {
      return `BAD_BOUNDS: ${q.id} a percentage bound lies between 0 and 100`;
    }
  }
  if (q.type === 'money' || q.type === 'priceRange') {
    if (!q.currency || !(BID_CURRENCIES as readonly string[]).includes(q.currency)) {
      return `CURRENCY_REQUIRED: ${q.id} names a currency PTI accepts`;
    }
  }
  if (q.weight !== undefined && (typeof q.weight !== 'number' || !Number.isFinite(q.weight) || q.weight <= 0)) {
    return `BAD_WEIGHT: ${q.id} a weight is a number above zero`;
  }
  return null;
}

/** The refusal a question LIST earns (each question, then duplicate ids), or null. */
export function rfiQuestionsRefusal(
  questions: readonly RfiQuestion[],
  customSections: readonly RfxCustomSection[] = [],
): string | null {
  const sections = customSectionsRefusal(customSections);
  if (sections) return sections;
  const ids = customSections.map((s) => s.id);
  const seen = new Set<string>();
  for (const q of questions) {
    const refusal = rfiQuestionRefusal(q, ids);
    if (refusal) return refusal;
    if (seen.has(q.id)) return `DUPLICATE_QUESTION: ${q.id}`;
    seen.add(q.id);
  }
  return null;
}

const asNumber = (v: RfiAnswer['value']): number | null =>
  typeof v === 'number' && Number.isFinite(v)
    ? v
    : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))
      ? Number(v)
      : null;

/**
 * Why an ANSWERED question's answer does not fit its question, or null. An
 * unanswered question is `missingRequiredAnswers`' business, not this one's —
 * an optional question left blank is legal.
 */
export function answerRefusal(q: RfiQuestion, a: RfiAnswer | undefined): string | null {
  if (!isAnswered(a)) return null;
  const answer = a!;
  const v = answer.value;
  switch (q.type) {
    case 'yesNo':
      return v === 'yes' || v === 'no' ? null : 'notYesNo';
    case 'singleChoice':
      return typeof v === 'string' && (q.options ?? []).includes(v) ? null : 'notAnOption';
    case 'multipleChoice':
      return Array.isArray(v) && v.every((x) => (q.options ?? []).includes(String(x))) ? null : 'notAnOption';
    case 'numberWithUnit':
    case 'money':
    case 'percentage': {
      const n = asNumber(v);
      if (n === null) return 'notANumber';
      if ((q.type === 'money' || q.type === 'percentage') && n < 0) return 'belowZero';
      if (q.type === 'percentage' && n > 100) return 'aboveHundred';
      if (q.min !== undefined && n < q.min) return 'belowMin';
      if (q.max !== undefined && n > q.max) return 'aboveMax';
      return null;
    }
    case 'date':
      return isCalendarDate(v) ? null : 'notADate';
    case 'priceRange': {
      const r = answer.range;
      if (!r || !Number.isFinite(r.min) || !Number.isFinite(r.max)) return 'rangeIncomplete';
      if (r.min < 0) return 'belowZero';
      if (r.min > r.max) return 'rangeInverted';
      return null;
    }
    case 'attachment':
      return (answer.attachments ?? []).every(isSessionAttachmentMeta) ? null : 'attachmentMalformed';
    case 'text':
    case 'longText':
      return typeof v === 'string' ? null : 'notText';
    default:
      return 'unknownType';
  }
}

/** The questions whose answer does not fit, by id — the refusal names them. */
export function invalidAnswers(
  questions: readonly RfiQuestion[],
  answers: readonly RfiAnswer[],
): readonly string[] {
  return questions
    .filter((q) => answerRefusal(q, answers.find((a) => a.questionId === q.id)) !== null)
    .map((q) => q.id);
}

/**
 * REQ-E03-02 template rule — the required questions this response has not
 * answered. Returned as IDS rather than a boolean: a refusal that names the
 * questions is one a supplier can act on, and one that says "something is
 * missing" is a scavenger hunt.
 */
export function missingRequiredAnswers(
  questions: readonly RfiQuestion[],
  answers: readonly RfiAnswer[],
): readonly string[] {
  return questions
    .filter((q) => q.required)
    .filter((q) => !isAnswered(answers.find((a) => a.questionId === q.id)))
    .map((q) => q.id);
}

/** The 0–100 points one answer earns on a weighted question, or null. */
export function questionPoints(question: RfiQuestion, answer: RfiAnswer | undefined): number | null {
  if (!question.weight || question.weight <= 0) return null;
  if (!isAnswered(answer)) return 0;
  const value = answer!.value!;
  if (question.type === 'yesNo' || question.type === 'singleChoice') {
    const key = String(Array.isArray(value) ? value[0] : value);
    return question.optionScores?.[key] ?? 0;
  }
  if (question.type === 'multipleChoice') {
    const keys = Array.isArray(value) ? value.map(String) : [String(value)];
    const scores = keys.map((k) => question.optionScores?.[k] ?? 0);
    return scores.length === 0 ? 0 : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }
  if (question.type === 'numberWithUnit' || question.type === 'percentage') {
    const scale = question.scale;
    const n = Number(value);
    if (!scale || !Number.isFinite(n) || scale.best === scale.worst) return 0;
    const pct = ((n - scale.worst) / (scale.best - scale.worst)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }
  // Text, date and attachment carry no comparable value. A weighted one would
  // be a number invented from prose, so they score nothing and say so.
  return null;
}

export interface RfiResponseScore {
  readonly score: number;
  readonly weightedQuestions: number;
}

/**
 * REQ-E03-02 template rule — the response score a weighted RFI produces.
 * **Used ONLY to shortlist** for an RFQ or RFP; it awards nothing and ranks no
 * price. `null` when the event weights no question at all, which is the honest
 * answer rather than a 0 that reads like a bad supplier.
 */
export function rfiResponseScore(
  questions: readonly RfiQuestion[],
  answers: readonly RfiAnswer[],
): RfiResponseScore | null {
  let weight = 0;
  let earned = 0;
  let counted = 0;
  for (const q of questions) {
    const points = questionPoints(q, answers.find((a) => a.questionId === q.id));
    if (points === null) continue;
    weight += q.weight!;
    earned += q.weight! * points;
    counted += 1;
  }
  if (weight === 0) return null;
  return { score: Math.round(earned / weight), weightedQuestions: counted };
}

// ── REQ-E03-04 — RFP terms ──────────────────────────────────────────────────

/**
 * REQ-E03-04 — the terms this proposal deviates on WITHOUT a comment. A
 * deviation is the one answer that changes what PTI would sign, so the comment
 * is the answer, not a nicety.
 */
export function deviationsWithoutComment(answers: readonly RfpTermAnswer[]): readonly string[] {
  return answers
    .filter((a) => a.stance === 'deviate')
    .filter((a) => !a.comment || a.comment.trim().length === 0)
    .map((a) => a.termId);
}

/** Does this value read as the term's kind (a number, yes/no, one of the options)? */
export function termValueFits(row: RfpTermRow, value: string): boolean {
  const v = value.trim();
  if (v.length === 0) return false;
  const kind = rfpTermKindOf(row);
  if (kind === 'numberWithUnit') return Number.isFinite(Number(v.replace(/,/g, '')));
  if (kind === 'yesNo') return v === 'yes' || v === 'no';
  if (kind === 'choice') return (row.options ?? []).includes(v);
  return true;
}

/**
 * The refusal an RFP's term rows earn, or null.
 *
 * A STANDARD row must name a term on the list. A CUSTOM row (`custom-…`) is the
 * buyer's own term (spec, RFP terms) and must carry what the list would have
 * given it: a label, a known group, a known value kind, and for a choice at
 * least two distinct options. Every row carries PTI's requested value, and the
 * value must read as the row's kind — a "number" term asking for "soon" is a
 * comparison column nobody can compare.
 */
export function rfpTermsRefusal(terms: readonly RfpTermRow[]): string | null {
  if (terms.length === 0) return 'NO_TERMS: an RFP lists at least one commercial term';
  const seen = new Set<string>();
  for (const row of terms) {
    const id = String(row?.termId);
    if (seen.has(id)) return `DUPLICATE_TERM: ${id} is listed twice`;
    seen.add(id);
    if (isCustomTermId(id)) {
      if (!hasText(row.label)) return `CUSTOM_TERM_LABEL_REQUIRED: ${id} needs a label`;
      if (row.group !== undefined && !RFP_TERM_GROUP_ORDER.includes(row.group)) {
        return `UNKNOWN_TERM_GROUP: ${String(row.group)}`;
      }
    } else if (!rfpTerm(id)) {
      return `UNKNOWN_TERM: ${id} is not on the standard term list`;
    }
    if (row.valueKind !== undefined && !RFP_TERM_VALUE_KINDS.includes(row.valueKind)) {
      return `UNKNOWN_VALUE_KIND: ${String(row.valueKind)}`;
    }
    if (rfpTermKindOf(row) === 'choice') {
      const options = Array.isArray(row.options) ? row.options.map((o) => String(o).trim()) : [];
      if (options.length < 2 || options.some((o) => o.length === 0) || new Set(options).size !== options.length) {
        return `CHOICE_TERM_NEEDS_OPTIONS: ${id} needs at least two distinct options`;
      }
    }
    if (!hasText(row.requestedValue)) {
      return `TERM_VALUE_REQUIRED: ${id} needs PTI's requested value`;
    }
    if (!termValueFits(row, row.requestedValue)) {
      return `TERM_VALUE_INVALID: ${id} is asked as ${rfpTermKindOf(row)} and the requested value does not read as one`;
    }
  }
  return null;
}

/** The answered terms whose proposed value does not read as the term's kind. */
export function invalidTermAnswers(
  terms: readonly RfpTermRow[],
  answers: readonly RfpTermAnswer[],
): readonly string[] {
  return terms
    .filter((row) => {
      const a = answers.find((x) => x.termId === row.termId);
      return !!a && a.proposedValue.trim().length > 0 && !termValueFits(row, a.proposedValue);
    })
    .map((row) => row.termId);
}

// ── RFP indicative pricing (spec D4: every price here is INDICATIVE) ────────

/** The most quantity points an RFP may ask indicative prices at. */
export const MAX_QUANTITY_POINTS = 8;

/** The refusal an RFP's pricing request earns, or null. */
export function rfpPricingRequestRefusal(p: RfpPricingRequest | undefined): string | null {
  if (p === undefined) return null;
  if (!p || typeof p !== 'object' || !Array.isArray(p.options) || !Array.isArray(p.quantityPoints)) {
    return 'PRICING_MALFORMED: pricing lists options and quantity points';
  }
  if (p.options.length === 0) return 'PRICING_NO_OPTIONS: ask for at least one option';
  const ids = new Set<string>();
  for (const o of p.options) {
    if (!hasText(o?.id)) return 'PRICING_OPTION_ID: every option has an id';
    if (!hasText(o.title)) return `PRICING_OPTION_TITLE: ${o.id} needs a title`;
    if (ids.has(o.id)) return `PRICING_OPTION_DUPLICATE: ${o.id}`;
    ids.add(o.id);
  }
  const qty = p.quantityPoints;
  if (qty.length === 0 || qty.length > MAX_QUANTITY_POINTS) {
    return `PRICING_QTY_COUNT: between 1 and ${MAX_QUANTITY_POINTS} quantity points`;
  }
  if (qty.some((q) => typeof q !== 'number' || !Number.isInteger(q) || q <= 0)) {
    return 'PRICING_QTY_INVALID: every quantity point is a whole number above zero';
  }
  if (qty.some((q, i) => i > 0 && q <= qty[i - 1])) {
    return 'PRICING_QTY_ORDER: quantity points rise strictly';
  }
  if (p.quantityBasis !== 'perVariant' && p.quantityBasis !== 'total') {
    return `PRICING_BASIS: ${String(p.quantityBasis)} is neither per variant nor total`;
  }
  return null;
}

/**
 * The refusal a supplier's indicative-pricing answer earns against the request,
 * or null. The supplier may price any subset of options (not every option fits
 * every supplier), but a request for pricing answered with none is not an
 * answer. Its own options (`sup-opt-…`) are priced on the same points.
 */
export function rfpPricingAnswerRefusal(
  request: RfpPricingRequest | undefined,
  answer: RfpPricingAnswer | undefined,
): string | null {
  if (!request) return answer ? 'PRICING_NOT_ASKED: this RFP asks for no indicative pricing' : null;
  if (!answer || !Array.isArray(answer.prices) || answer.prices.length === 0) {
    return 'PRICING_EMPTY: give at least one indicative price';
  }
  const proposed = Array.isArray(answer.proposedOptions) ? answer.proposedOptions : [];
  const own = new Set<string>();
  for (const o of proposed) {
    if (!o || typeof o.id !== 'string' || !o.id.startsWith('sup-opt-')) {
      return `PROPOSED_OPTION_INVALID: ${String(o?.id)} is not a supplier option id`;
    }
    if (!hasText(o.title)) return `PROPOSED_OPTION_TITLE: ${o.id} needs a title`;
    if (own.has(o.id)) return `PROPOSED_OPTION_DUPLICATE: ${o.id}`;
    own.add(o.id);
  }
  const known = new Set([...request.options.map((o) => o.id), ...own]);
  const cells = new Set<string>();
  for (const price of answer.prices) {
    if (!known.has(price.optionId)) return `PRICE_UNKNOWN_OPTION: ${String(price.optionId)}`;
    if (!request.quantityPoints.includes(price.qty)) return `PRICE_UNKNOWN_QTY: ${String(price.qty)}`;
    if (typeof price.unitPrice !== 'number' || !Number.isFinite(price.unitPrice) || price.unitPrice <= 0) {
      return `PRICE_INVALID: ${price.optionId} at ${price.qty} needs a unit price above zero`;
    }
    const cell = `${price.optionId}@${price.qty}`;
    if (cells.has(cell)) return `PRICE_DUPLICATE: ${cell}`;
    cells.add(cell);
  }
  if (request.samplesRequested && (!answer.sample || typeof answer.sample.canSample !== 'boolean')) {
    return 'SAMPLE_OFFER_REQUIRED: say whether you can provide a sample';
  }
  if (answer.sample?.readyDate !== undefined && !isCalendarDate(answer.sample.readyDate)) {
    return 'SAMPLE_DATE_INVALID: the sample ready date must be a date';
  }
  if (answer.validUntil !== undefined && !isCalendarDate(answer.validUntil)) {
    return 'VALIDITY_INVALID: the validity date must be a date';
  }
  return null;
}

/** The terms the buyer asked for that this proposal has not answered. */

export function unansweredTerms(
  terms: readonly RfpTermRow[],
  answers: readonly RfpTermAnswer[],
): readonly string[] {
  return terms
    .filter((row) => {
      const a = answers.find((x) => x.termId === row.termId);
      return !a || a.proposedValue.trim().length === 0;
    })
    .map((row) => row.termId);
}

/** The share of answered terms this proposal complies with, as 0–100. */
export function complianceScoreFor(answers: readonly RfpTermAnswer[]): number {
  if (answers.length === 0) return 0;
  const comply = answers.filter((a) => a.stance === 'comply').length;
  return Math.round((comply / answers.length) * 100);
}

// ── REQ-E03-05 — negotiation and award ──────────────────────────────────────

/** REQ-E03-05 BR-03 — only a supplier invited to the round may revise. */
export const isInvitedToRound = (
  invitedSupplierIds: readonly string[],
  supplierId: string,
): boolean => invitedSupplierIds.includes(supplierId);

/** The share tolerance on an award split, in percentage points. */
export const AWARD_SPLIT_TOLERANCE = 0.01;

/**
 * REQ-E03-05 BR-06 / AC-04 — the award lines, grouped per item, whose shares do
 * NOT total 100%. An empty result is a legal split.
 *
 * ⚠️ **PER ITEM, NEVER OVER THE WHOLE EVENT.** Two items each at 50% sum to
 * 100% across the award and are two half-sourced items; the rule is that EACH
 * item is fully placed, and a total over the event cannot see the difference.
 */
export function itemsNotTotalling100(lines: readonly AwardLine[]): readonly string[] {
  const perItem = new Map<string, number>();
  for (const line of lines) {
    perItem.set(line.itemCode, (perItem.get(line.itemCode) ?? 0) + line.sharePct);
  }
  return [...perItem.entries()]
    .filter(([, total]) => Math.abs(total - 100) > AWARD_SPLIT_TOLERANCE)
    .map(([itemCode]) => itemCode);
}

/** REQ-E03-05 BR-06 — the refusal an ill-formed award earns, or null. */
export function awardSplitRefusal(lines: readonly AwardLine[]): string | null {
  if (lines.length === 0) return 'AWARD_EMPTY: an award names at least one supplier';
  if (lines.some((l) => !Number.isFinite(l.sharePct) || l.sharePct <= 0)) {
    return 'AWARD_SHARE_INVALID: every share is a percentage above zero';
  }
  if (lines.some((l) => !Number.isFinite(l.quantity) || l.quantity <= 0)) {
    return 'AWARD_QTY_INVALID: every award line carries a quantity above zero';
  }
  const broken = itemsNotTotalling100(lines);
  if (broken.length > 0) {
    return `AWARD_SPLIT_INCOMPLETE: each item's shares must total 100% (${broken.join(', ')})`;
  }
  return null;
}

/**
 * REQ-E03-05 BR-07 — does this award follow the best-scored quote?
 *
 * TRUE when the best-scored quotation is among the awarded lines. A split that
 * gives the top quote 70% still FOLLOWS it; an award that leaves it out does
 * not, and that is the case the reason exists for. When no best score is known
 * (an unrankable set), the answer is TRUE — there is no ranking to depart from,
 * and demanding a reason for departing from nothing would be theatre.
 */
export function awardFollowsBestScore(
  lines: readonly AwardLine[],
  bestScoredQuotationId: string | null | undefined,
): boolean {
  if (!bestScoredQuotationId) return true;
  return lines.some((l) => l.quotationId === bestScoredQuotationId);
}

// ── REQ-E03-03 — quote per item ─────────────────────────────────────────────

/** One priced line of a quotation (REQ-E03-03: a price per ITEM). */
export interface QuoteLineInput {
  readonly lineNo: number;
  readonly materialCode: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

/** The quote total: the sum of quantity × unit price over the lines. */
export const quoteLinesTotal = (lines: readonly QuoteLineInput[]): number =>
  lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

/** The refusal ill-formed quote lines earn, or null when they are well formed. */
export function quoteLinesRefusal(lines: readonly QuoteLineInput[]): string | null {
  if (lines.length === 0) return null; // a single-price quote stays legal
  for (const line of lines) {
    if (!line.materialCode || String(line.materialCode).trim().length === 0) {
      return 'QUOTE_LINE_MATERIAL: every quoted line names an item';
    }
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      return `QUOTE_LINE_QTY: line ${line.lineNo} needs a quantity above zero`;
    }
    if (!Number.isFinite(line.unitPrice) || line.unitPrice <= 0) {
      return `QUOTE_LINE_PRICE: line ${line.lineNo} needs a unit price above zero`;
    }
  }
  const codes = lines.map((l) => l.materialCode);
  if (new Set(codes).size !== codes.length) {
    return 'QUOTE_LINE_DUPLICATE: each item is quoted once';
  }
  return null;
}
