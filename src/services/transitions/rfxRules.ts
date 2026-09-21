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
  RfpTermAnswer,
  RfpTermRow,
  RfxInvitee,
} from '../sourcing/types';
import type { GateResult } from '../sourcing/complianceGate';

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
  /**
   * CR-23 / BR-06 — the compliance gate against the event's materials. A
   * failing supplier stays a candidate (it can be invited and can quote); the
   * list shows it cannot be awarded and why. Absent = not computed.
   */
  readonly gate?: GateResult;
}

/** The filters a buyer may combine (BR-01). Absent = that filter is off. */
export interface InviteeFilter {
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
    .filter((c) => (filter.purchasingGroup ? c.purchasingGroup === filter.purchasingGroup : true));
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
  const { value } = answer;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim().length > 0;
  return false;
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
  if (question.type === 'numberWithUnit') {
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
