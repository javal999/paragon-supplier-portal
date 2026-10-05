// ────────────────────────────────────────────────────────────────────────────
// RFx RULES — the pure predicates behind the RFx verbs (REQ-E03-01 to -05).
//
// Same contract as `callOffRules` / `forecastRules`: no I/O, no clock of its
// own, no store. Every function takes the facts and returns an answer, so the
// policy hook, the surface and the spec all read the SAME rule rather than
// three implementations that drift. A clock-derived state (past deadline, due
// soon) is computed HERE from an injected `now` and never stored (law 0.5).
// ────────────────────────────────────────────────────────────────────────────

import { SupplierStatus } from '@app-types/supplier.types';
/** @import { AwardLine, RfiAnswer, RfiQuestion, RfpPricingAnswer, RfpPricingRequest, RfpTermAnswer, RfpTermRow, RfxCustomSection, RfxInvitee } from '../sourcing/types' */
import {
  RFI_SECTION_ORDER,
  RFP_TERM_GROUP_ORDER,
  RFP_TERM_VALUE_KINDS,
  RFX_QUESTION_TYPES,
  isBoundedType,
  isChoiceType,
  isCustomTermId,
  rfpTerm,
  rfpTermKindOf
} from '../sourcing/rfxConfig';
import { BID_CURRENCIES } from '@lib/currencyPolicy';
import { isCalendarDate } from '@lib/workingCalendar';
import { isAttachmentMeta } from '../attachments/sessionAttachments';
/** @import { GateResult } from '../sourcing/complianceGate' */
/** @import { BiddingEligibility, SourcingType } from '../sourcing/sourcingType' */
/** @import { CertValidity, PerformanceBand, SupplierFilters } from '../sourcing/supplierFilters' */
import { matchesSupplierFilters } from '../sourcing/supplierFilters';

// ── REQ-E03-01 — who may be invited ─────────────────────────────────────────

/**
 * The supplier statuses an invitee search may return (BR-04, AC-03).
 *
 * ⚠️ **A LIST OF WHAT IS ALLOWED, NOT A LIST OF WHAT IS REFUSED.** The refusing
 * form (`status !== SUSPENDED && status !== BLACKLISTED`) passes every status
 * added after it is written, so the day a seventh status lands it is selectable
 * by default and nothing goes red. This form refuses it by default instead, and
 * a new status that SHOULD be selectable is one visible edit here.
 * @type {readonly SupplierStatus[]}
 */
export const SELECTABLE_SUPPLIER_STATUSES = [SupplierStatus.ACTIVE];

/**
 * True when a supplier in this status may be selected as an invitee.
 * @param {SupplierStatus} status
 * @returns {boolean}
 */
export const isSelectableSupplier = (status) => SELECTABLE_SUPPLIER_STATUSES.includes(status);

/** The shape the invitee filter reads — a supplier master row, narrowed. */
/**
 * `otif`:  REQ-E03-01 edge case — `null` is "No history", never 0%.
 * `certificates`:  BL-52 / BR-05 — halal and BPOM certificate validity, derived at read.
 * `band`:  BL-52 / BR-05 — the performance band: the calculated grade, or "No history".
 * `gate`: CR-23 / BR-06 — the compliance gate against the event's materials. A failing supplier stays a candidate (it can be invited and can quote); the list shows it cannot be awarded and why. Absent = not computed.
 * `eligibility`: Material G2 (MR-10 BR-05) — the vendor against the event's sourcing type, computed when the filter names one. `refused` is not offered (the step lists it greyed, with its missing documents); `warn` is offered and marked (placeholder lists, owner ruling 2026-09-29). Absent = not computed.
 *
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly category: string;
 *   readonly purchasingGroup?: string;
 *   readonly status: SupplierStatus;
 *   readonly otif: number | null;
 *   readonly country: string;
 *   readonly certificates: CertValidity;
 *   readonly band: PerformanceBand;
 *   readonly gate?: GateResult;
 *   readonly eligibility?: BiddingEligibility;
 * }} InviteeCandidate
 */

/**
 * The filters a buyer may combine (BR-01, and BR-05's certificate validity,
 * performance band and country — `SupplierFilters`). Absent = that filter is off.
 */
/**
 * `materialCodes`: CR-23 — the event's material codes, which the gate is judged against. NOT a filter: it narrows nothing, it only tells the read which materials the certificates must cover.
 * `sourcingType`: Material G2 — the event's sourcing type. NOT a narrowing filter of its own: it decides which Active vendors are qualified to be offered (`filterInvitees`) and which are listed as not qualified (`notQualifiedInvitees`).
 *
 * @typedef {SupplierFilters & {
 *     readonly category?: string;
 *     readonly purchasingGroup?: string;
 *     readonly materialCodes?: readonly string[];
 *     readonly sourcingType?: SourcingType;
 *   }} InviteeFilter
 */

/**
 * REQ-E03-01 AC-01 / AC-03 — candidates matching the active filters, with every
 * non-selectable status removed FIRST.
 *
 * The status gate runs before the filters and not as one of them: a blacklisted
 * supplier is not "filtered out", it is not a candidate at all, and a caller
 * that passes no filter must still not be handed one.
 * @param {readonly InviteeCandidate[]} candidates
 * @param {InviteeFilter} [filter]
 * @returns {readonly InviteeCandidate[]}
 */
export function filterInvitees(candidates, filter = {}) {
  return matchingActive(candidates, filter).filter((c) => c.eligibility?.state !== 'refused');
}

/**
 * Active candidates matching the buyer's filters, before qualification.
 * @param {readonly InviteeCandidate[]} candidates
 * @param {InviteeFilter} filter
 * @returns {readonly InviteeCandidate[]}
 */
function matchingActive(candidates, filter) {
  return (
    candidates
      .filter((c) => isSelectableSupplier(c.status))
      .filter((c) => (filter.category ? c.category === filter.category : true))
      .filter((c) => (filter.purchasingGroup ? c.purchasingGroup === filter.purchasingGroup : true))
      // BL-52 — certificate validity, then performance band, then country (BR-05).
      .filter((c) => matchesSupplierFilters(c, filter))
  );
}

/**
 * Material G2 (MR-10 BR-05, section d step 2) — the Active candidates the
 * filters match that are NOT qualified for the event's sourcing type against
 * a real list. The invitee step lists them greyed out, with the documents
 * they lack; they are never selectable. Empty while the lists are
 * placeholders (warned vendors stay in `filterInvitees`).
 * @param {readonly InviteeCandidate[]} candidates
 * @param {InviteeFilter} [filter]
 * @returns {readonly InviteeCandidate[]}
 */
export const notQualifiedInvitees = (candidates, filter = {}) =>
  matchingActive(candidates, filter).filter((c) => c.eligibility?.state === 'refused');

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
 * @param {number | null | undefined} otif
 * @returns {number}
 */
export const reliabilityScoreFor = (otif) =>
  otif === null || otif === undefined ? NO_HISTORY_RELIABILITY : otif;

// ── Deadlines (REQ-E03-02 / -03 / -05) ──────────────────────────────────────

/**
 * The deadline in force for ONE invitee: its own extension when it has one,
 * otherwise the event's. Pure, so the verb and the screen cannot disagree.
 * @param {string} eventDeadline
 * @param {readonly RfxInvitee[]} invitees
 * @param {string} supplierId
 * @returns {string}
 */
export function effectiveDeadline(eventDeadline, invitees, supplierId) {
  return invitees.find((i) => i.supplierId === supplierId)?.deadline ?? eventDeadline;
}

/**
 * True when `nowIso` is strictly after the end of the deadline day.
 * @param {string} deadline
 * @param {string} nowIso
 * @returns {boolean}
 */
export function isPastDeadline(deadline, nowIso) {
  const end = Date.parse(`${deadline.slice(0, 10)}T23:59:59.999Z`);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(end) || !Number.isFinite(now)) return false;
  return now > end;
}

/**
 * NR-1 BR-08 / AC-07 (D-6) — why a supplier may no longer change its response,
 * or `null`. Refused `RESPONSE_DEADLINE_PASSED` when the event is not Open, or
 * when the deadline in force for THIS supplier (its own extension, or the
 * event's) has passed. Read by the revise verbs and the draft save, and by a
 * screen deciding whether to offer "Revise response" (RFX-R2).
 * @param {{ readonly status: string; readonly responseDeadline: string; readonly invitees: readonly RfxInvitee[] }} event
 * @param {string} supplierId
 * @param {string} nowIso
 * @returns {string | null}
 */
export function responseWindowRefusal(event, supplierId, nowIso) {
  if (event.status !== 'Open') {
    return `RESPONSE_DEADLINE_PASSED: the event is ${event.status}`;
  }
  const deadline = effectiveDeadline(event.responseDeadline, event.invitees, supplierId);
  return isPastDeadline(deadline, nowIso)
    ? `RESPONSE_DEADLINE_PASSED: responses closed on ${deadline}`
    : null;
}

/**
 * NR-1 BR-08 / BR-10 — why a draft save may not touch this supplier's stored
 * response, or `null`. A Submitted response changes only through revise, which
 * appends a version; a save would change it in place with no version. `status`
 * is the stored response's status, `undefined` when there is none yet.
 * @param {string | undefined} status
 * @returns {string | null}
 */
export function responseAlreadySubmittedRefusal(status) {
  return status === 'Submitted' ? 'RESPONSE_ALREADY_SUBMITTED: use revise' : null;
}

/**
 * Whole days from `nowIso` to the end of the deadline day (negative = past).
 * @param {string} deadline
 * @param {string} nowIso
 * @returns {number}
 */
export function daysToDeadline(deadline, nowIso) {
  const end = Date.parse(`${deadline.slice(0, 10)}T23:59:59.999Z`);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(end) || !Number.isFinite(now)) return 0;
  return Math.floor((end - now) / 86_400_000);
}

/** A negotiation round or event closing within this many days is "closing soon". */
export const CLOSING_SOON_DAYS = 3;

/**
 * True when the deadline has not passed and is inside the closing-soon window.
 * @param {string} deadline
 * @param {string} nowIso
 * @returns {boolean}
 */
export const isClosingSoon = (deadline, nowIso) =>
  !isPastDeadline(deadline, nowIso) && daysToDeadline(deadline, nowIso) <= CLOSING_SOON_DAYS;

/**
 * A new deadline is an extension only when it moves LATER than the old one.
 * @param {string} current
 * @param {string} next
 * @returns {boolean}
 */
export function isExtension(current, next) {
  const a = Date.parse(`${current.slice(0, 10)}T00:00:00.000Z`);
  const b = Date.parse(`${next.slice(0, 10)}T00:00:00.000Z`);
  return Number.isFinite(a) && Number.isFinite(b) && b > a;
}

// ── REQ-E03-02 — RFI answers ────────────────────────────────────────────────

/**
 * True when an answer carries something a reader could act on.
 * @param {RfiAnswer | undefined} answer
 * @returns {boolean}
 */
export function isAnswered(answer) {
  if (!answer) return false;
  // A price range is answered when both ends are numbers; an attachment when a
  // file is named. Either is an answer even with no `value`.
  if (answer.range && Number.isFinite(answer.range.min) && Number.isFinite(answer.range.max))
    return true;
  if (answer.attachments && answer.attachments.length > 0) return true;
  const { value } = answer;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim().length > 0;
  return false;
}

// ── RFx authoring — typed questions (spec: RFI and RFP authoring) ───────────

/**
 * @param {unknown} v
 * @returns {v is string}
 */
const hasText = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * The refusal the buyer's section list earns, or null. A custom section is
 * `custom-…`, carries a title, and appears once.
 * @param {readonly RfxCustomSection[] | undefined} sections
 * @returns {string | null}
 */
export function customSectionsRefusal(sections) {
  if (sections === undefined) return null;
  if (!Array.isArray(sections)) return 'SECTIONS_MALFORMED: custom sections are a list';
  const seen = /** @type {Set<string>} */ (new Set());
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
 * @param {RfiQuestion} q
 * @param {readonly string[]} [customSectionIds]
 * @returns {string | null}
 */
export function rfiQuestionRefusal(q, customSectionIds = []) {
  if (!q || typeof q !== 'object') return 'QUESTION_INCOMPLETE: a question is an object';
  if (!RFX_QUESTION_TYPES.includes(q.type)) return `UNKNOWN_QUESTION_TYPE: ${String(q.type)}`;
  if (!hasText(q.id) || !hasText(q.promptKey)) {
    return 'QUESTION_INCOMPLETE: every question names itself and what it asks';
  }
  const inTemplate = /** @type {readonly string[]} */ (RFI_SECTION_ORDER).includes(q.sectionId);
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
    if (
      q.type === 'percentage' &&
      bounds.some((b) => /** @type {number} */ (b) < 0 || /** @type {number} */ (b) > 100)
    ) {
      return `BAD_BOUNDS: ${q.id} a percentage bound lies between 0 and 100`;
    }
  }
  if (q.type === 'money' || q.type === 'priceRange') {
    if (!q.currency || !(/** @type {readonly string[]} */ (BID_CURRENCIES).includes(q.currency))) {
      return `CURRENCY_REQUIRED: ${q.id} names a currency PTI accepts`;
    }
  }
  if (
    q.weight !== undefined &&
    (typeof q.weight !== 'number' || !Number.isFinite(q.weight) || q.weight <= 0)
  ) {
    return `BAD_WEIGHT: ${q.id} a weight is a number above zero`;
  }
  return null;
}

/**
 * The refusal a question LIST earns (each question, then duplicate ids), or null.
 * @param {readonly RfiQuestion[]} questions
 * @param {readonly RfxCustomSection[]} [customSections]
 * @returns {string | null}
 */
export function rfiQuestionsRefusal(questions, customSections = []) {
  const sections = customSectionsRefusal(customSections);
  if (sections) return sections;
  const ids = customSections.map((s) => s.id);
  const seen = /** @type {Set<string>} */ (new Set());
  for (const q of questions) {
    const refusal = rfiQuestionRefusal(q, ids);
    if (refusal) return refusal;
    if (seen.has(q.id)) return `DUPLICATE_QUESTION: ${q.id}`;
    seen.add(q.id);
  }
  return null;
}

/**
 * @param {RfiAnswer['value']} v
 * @returns {number | null}
 */
const asNumber = (v) =>
  typeof v === 'number' && Number.isFinite(v)
    ? v
    : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))
      ? Number(v)
      : null;

/**
 * Why an ANSWERED question's answer does not fit its question, or null. An
 * unanswered question is `missingRequiredAnswers`' business, not this one's —
 * an optional question left blank is legal.
 * @param {RfiQuestion} q
 * @param {RfiAnswer | undefined} a
 * @returns {string | null}
 */
export function answerRefusal(q, a) {
  if (!isAnswered(a)) return null;
  const answer = /** @type {NonNullable<typeof a>} */ (a);
  const v = answer.value;
  switch (q.type) {
    case 'yesNo':
      return v === 'yes' || v === 'no' ? null : 'notYesNo';
    case 'singleChoice':
      return typeof v === 'string' && (q.options ?? []).includes(v) ? null : 'notAnOption';
    case 'multipleChoice':
      return Array.isArray(v) && v.every((x) => (q.options ?? []).includes(String(x)))
        ? null
        : 'notAnOption';
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
      return (answer.attachments ?? []).every(isAttachmentMeta) ? null : 'attachmentMalformed';
    case 'text':
    case 'longText':
      return typeof v === 'string' ? null : 'notText';
    default:
      return 'unknownType';
  }
}

/**
 * The questions whose answer does not fit, by id — the refusal names them.
 * @param {readonly RfiQuestion[]} questions
 * @param {readonly RfiAnswer[]} answers
 * @returns {readonly string[]}
 */
export function invalidAnswers(questions, answers) {
  return questions
    .filter(
      (q) =>
        answerRefusal(
          q,
          answers.find((a) => a.questionId === q.id)
        ) !== null
    )
    .map((q) => q.id);
}

/**
 * REQ-E03-02 template rule — the required questions this response has not
 * answered. Returned as IDS rather than a boolean: a refusal that names the
 * questions is one a supplier can act on, and one that says "something is
 * missing" is a scavenger hunt.
 * @param {readonly RfiQuestion[]} questions
 * @param {readonly RfiAnswer[]} answers
 * @returns {readonly string[]}
 */
export function missingRequiredAnswers(questions, answers) {
  return questions
    .filter((q) => q.required)
    .filter((q) => !isAnswered(answers.find((a) => a.questionId === q.id)))
    .map((q) => q.id);
}

/**
 * The 0–100 points one answer earns on a weighted question, or null.
 * @param {RfiQuestion} question
 * @param {RfiAnswer | undefined} answer
 * @returns {number | null}
 */
export function questionPoints(question, answer) {
  if (!question.weight || question.weight <= 0) return null;
  if (!isAnswered(answer)) return 0;
  const value = /** @type {NonNullable<(NonNullable<typeof answer>)['value']>} */ (
    /** @type {NonNullable<typeof answer>} */ (answer).value
  );
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

/**
 * @typedef {{
 *   readonly score: number;
 *   readonly weightedQuestions: number;
 * }} RfiResponseScore
 */

/**
 * REQ-E03-02 template rule — the response score a weighted RFI produces.
 * **Used ONLY to shortlist** for an RFQ or RFP; it awards nothing and ranks no
 * price. `null` when the event weights no question at all, which is the honest
 * answer rather than a 0 that reads like a bad supplier.
 * @param {readonly RfiQuestion[]} questions
 * @param {readonly RfiAnswer[]} answers
 * @returns {RfiResponseScore | null}
 */
export function rfiResponseScore(questions, answers) {
  let weight = 0;
  let earned = 0;
  let counted = 0;
  for (const q of questions) {
    const points = questionPoints(
      q,
      answers.find((a) => a.questionId === q.id)
    );
    if (points === null) continue;
    weight += /** @type {NonNullable<typeof q.weight>} */ (q.weight);
    earned += /** @type {NonNullable<typeof q.weight>} */ (q.weight) * points;
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
 * @param {readonly RfpTermAnswer[]} answers
 * @returns {readonly string[]}
 */
export function deviationsWithoutComment(answers) {
  return answers
    .filter((a) => a.stance === 'deviate')
    .filter((a) => !a.comment || a.comment.trim().length === 0)
    .map((a) => a.termId);
}

/**
 * Does this value read as the term's kind (a number, yes/no, one of the options)?
 * @param {RfpTermRow} row
 * @param {string} value
 * @returns {boolean}
 */
export function termValueFits(row, value) {
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
 * @param {readonly RfpTermRow[]} terms
 * @returns {string | null}
 */
export function rfpTermsRefusal(terms) {
  if (terms.length === 0) return 'NO_TERMS: an RFP lists at least one commercial term';
  const seen = /** @type {Set<string>} */ (new Set());
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
      if (
        options.length < 2 ||
        options.some((o) => o.length === 0) ||
        new Set(options).size !== options.length
      ) {
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

/**
 * The answered terms whose proposed value does not read as the term's kind.
 * @param {readonly RfpTermRow[]} terms
 * @param {readonly RfpTermAnswer[]} answers
 * @returns {readonly string[]}
 */
export function invalidTermAnswers(terms, answers) {
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

/**
 * The refusal an RFP's pricing request earns, or null.
 * @param {RfpPricingRequest | undefined} p
 * @returns {string | null}
 */
export function rfpPricingRequestRefusal(p) {
  if (p === undefined) return null;
  if (
    !p ||
    typeof p !== 'object' ||
    !Array.isArray(p.options) ||
    !Array.isArray(p.quantityPoints)
  ) {
    return 'PRICING_MALFORMED: pricing lists options and quantity points';
  }
  if (p.options.length === 0) return 'PRICING_NO_OPTIONS: ask for at least one option';
  const ids = /** @type {Set<string>} */ (new Set());
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
 * @param {RfpPricingRequest | undefined} request
 * @param {RfpPricingAnswer | undefined} answer
 * @returns {string | null}
 */
export function rfpPricingAnswerRefusal(request, answer) {
  if (!request) return answer ? 'PRICING_NOT_ASKED: this RFP asks for no indicative pricing' : null;
  if (!answer || !Array.isArray(answer.prices) || answer.prices.length === 0) {
    return 'PRICING_EMPTY: give at least one indicative price';
  }
  const proposed = Array.isArray(answer.proposedOptions) ? answer.proposedOptions : [];
  const own = /** @type {Set<string>} */ (new Set());
  for (const o of proposed) {
    if (!o || typeof o.id !== 'string' || !o.id.startsWith('sup-opt-')) {
      return `PROPOSED_OPTION_INVALID: ${String(o?.id)} is not a supplier option id`;
    }
    if (!hasText(o.title)) return `PROPOSED_OPTION_TITLE: ${o.id} needs a title`;
    if (own.has(o.id)) return `PROPOSED_OPTION_DUPLICATE: ${o.id}`;
    own.add(o.id);
  }
  const known = new Set([...request.options.map((o) => o.id), ...own]);
  const cells = /** @type {Set<string>} */ (new Set());
  for (const price of answer.prices) {
    if (!known.has(price.optionId)) return `PRICE_UNKNOWN_OPTION: ${String(price.optionId)}`;
    if (!request.quantityPoints.includes(price.qty))
      return `PRICE_UNKNOWN_QTY: ${String(price.qty)}`;
    if (
      typeof price.unitPrice !== 'number' ||
      !Number.isFinite(price.unitPrice) ||
      price.unitPrice <= 0
    ) {
      return `PRICE_INVALID: ${price.optionId} at ${price.qty} needs a unit price above zero`;
    }
    const cell = `${price.optionId}@${price.qty}`;
    if (cells.has(cell)) return `PRICE_DUPLICATE: ${cell}`;
    cells.add(cell);
  }
  if (
    request.samplesRequested &&
    (!answer.sample || typeof answer.sample.canSample !== 'boolean')
  ) {
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

/**
 * The terms the buyer asked for that this proposal has not answered.
 * @param {readonly RfpTermRow[]} terms
 * @param {readonly RfpTermAnswer[]} answers
 * @returns {readonly string[]}
 */
export function unansweredTerms(terms, answers) {
  return terms
    .filter((row) => {
      const a = answers.find((x) => x.termId === row.termId);
      return !a || a.proposedValue.trim().length === 0;
    })
    .map((row) => row.termId);
}

/**
 * The share of answered terms this proposal complies with, as 0–100.
 * @param {readonly RfpTermAnswer[]} answers
 * @returns {number}
 */
export function complianceScoreFor(answers) {
  if (answers.length === 0) return 0;
  const comply = answers.filter((a) => a.stance === 'comply').length;
  return Math.round((comply / answers.length) * 100);
}

// ── REQ-E03-05 — negotiation and award ──────────────────────────────────────

/**
 * REQ-E03-05 BR-03 — only a supplier invited to the round may revise.
 * @param {readonly string[]} invitedSupplierIds
 * @param {string} supplierId
 * @returns {boolean}
 */
export const isInvitedToRound = (invitedSupplierIds, supplierId) =>
  invitedSupplierIds.includes(supplierId);

// REQ-E03-05 BR-06 — the split rule moved (RFx C1, AR-04). `awardSplitRefusal`
// and `itemsNotTotalling100` judged a legacy award per `itemCode` beside a
// second rule for tiered RFQs; both RFQ kinds are now judged by ONE item-based
// rule, `awardShapeRefusal` in `src/services/sourcing/awardShape.ts`.

/**
 * REQ-E03-05 BR-07 — does this award follow the best-scored quote?
 *
 * TRUE when the best-scored quotation is among the awarded lines. A split that
 * gives the top quote 70% still FOLLOWS it; an award that leaves it out does
 * not, and that is the case the reason exists for. When no best score is known
 * (an unrankable set), the answer is TRUE — there is no ranking to depart from,
 * and demanding a reason for departing from nothing would be theatre.
 * @param {readonly AwardLine[]} lines
 * @param {string | null | undefined} bestScoredQuotationId
 * @returns {boolean}
 */
export function awardFollowsBestScore(lines, bestScoredQuotationId) {
  if (!bestScoredQuotationId) return true;
  return lines.some((l) => l.quotationId === bestScoredQuotationId);
}

// ── REQ-E03-03 — quote per item ─────────────────────────────────────────────

/** One priced line of a quotation (REQ-E03-03: a price per ITEM). */
/**
 * @typedef {{
 *   readonly lineNo: number;
 *   readonly materialCode: string;
 *   readonly quantity: number;
 *   readonly unitPrice: number;
 * }} QuoteLineInput
 */

/**
 * The quote total: the sum of quantity × unit price over the lines.
 * @param {readonly QuoteLineInput[]} lines
 * @returns {number}
 */
export const quoteLinesTotal = (lines) =>
  lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

/**
 * The refusal ill-formed quote lines earn, or null when they are well formed.
 * @param {readonly QuoteLineInput[]} lines
 * @returns {string | null}
 */
export function quoteLinesRefusal(lines) {
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
