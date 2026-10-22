// ────────────────────────────────────────────────────────────────────────────
// RFx UX 2G — the proposal view on the RFP and RFI event pages (owner ruling
// 2026-10-20): what the Compare and By supplier tabs read, as PURE functions.
//
// DISPLAY ONLY. Nothing here scores, ranks for award or decides a rule:
//   · the order of the summary cards is the score the page ALREADY computes —
//     the RFP's CR-15 composite (`rfpScoringOf`) and the RFI's response score
//     (the read model's `score`). No new score is made here.
//   · "Best" marks the best VALUE on a row whose values can be compared as
//     numbers (lowest price, shortest lead time, longest payment days, longest
//     validity). A row this module cannot compare gets no marker, rather than
//     a guess. It says nothing about which supplier should win.
// ────────────────────────────────────────────────────────────────────────────

/** @import { RfiEventView, RfiResponseView, RfpEventView, RfpResponseView, RfxInviteeView } from '@services/sourcing/views' */
/** @import { RfiAnswer, RfiQuestion, RfpPricingOption } from '@services/sourcing/types' */
/** @import { ScoringOutcome } from '@lib/quoteScore' */
import { rfpTermGroupOf } from '@services/sourcing/rfxConfig';
import { missingRequiredAnswers } from '@services/transitions/rfxRules';

// ── The tabs ────────────────────────────────────────────────────────────────

/** @typedef {'overview' | 'compare' | 'supplier'} RfxEventTab */

/**
 * The tabs, in the order the page shows them.
 * i18n-defer: tab ids, not prose; the labels are `t('rfx.tab.<id>')`.
 * @type {readonly RfxEventTab[]}
 */
export const RFX_EVENT_TABS = ['overview', 'compare', 'supplier'];

/**
 * @param {string | null | undefined} value
 * @returns {value is RfxEventTab}
 */
export const isRfxEventTab = (value) =>
  !!value && /** @type {readonly string[]} */ (RFX_EVENT_TABS).includes(value);

/**
 * The tab a URL selects: `?tab=` when it names one; else the tab holding the
 * `?section=` it names; else Compare once anything is submitted, Overview
 * before that.
 * @param {{ tab: string | null; section: string | null; submitted: number; sectionTab: Readonly<Record<string, RfxEventTab>> }} input
 * @returns {RfxEventTab}
 */
export function rfxTabOf({ tab, section, submitted, sectionTab }) {
  if (isRfxEventTab(tab)) return tab;
  const held = section ? sectionTab[section] : undefined;
  if (held) return held;
  return submitted > 0 ? 'compare' : 'overview';
}

// ── The invitee one-liner ───────────────────────────────────────────────────

/**
 * @typedef {object} InviteeTally
 * @property {number} invited
 * @property {number} submitted
 * @property {number} inProgress -  A draft the supplier has not sent (and has not declined).
 * @property {number} notStarted
 * @property {number} declined -  BL-132 — declined and sent nothing.
 */

/**
 * Where the invitees stand, as the invitee table's pills read it: a sent
 * response is Submitted whatever was said; a decline without one is Declined.
 * @param {readonly Pick<RfxInviteeView, 'responseState' | 'intent'>[]} invitees
 * @returns {InviteeTally}
 */
export function inviteeTally(invitees) {
  const tally = {
    invited: invitees.length,
    submitted: 0,
    inProgress: 0,
    notStarted: 0,
    declined: 0
  };
  for (const i of invitees) {
    if (i.responseState === 'submitted') tally.submitted += 1;
    else if (i.intent?.intent === 'decline') tally.declined += 1;
    else if (i.responseState === 'draft') tally.inProgress += 1;
    else tally.notStarted += 1;
  }
  return tally;
}

// ── "Best" on a comparable row ──────────────────────────────────────────────

/**
 * The RFP terms whose proposed values compare as numbers, and which way is
 * better. Every other term — free text, a choice, a custom term whose
 * direction the buyer never stated — is not comparable and gets no marker.
 * @type {Readonly<Record<string, 'min' | 'max'>>}
 */
export const RFP_BEST_DIRECTION = {
  priceBasis: 'min',
  leadTime: 'min',
  paymentTerms: 'max',
  priceValidity: 'max'
};

/** Days per unit, for a validity written "12 months" or "6 weeks". */
const DAYS_PER = /** @type {Readonly<Record<string, number>>} */ ({
  day: 1,
  week: 7,
  month: 30,
  year: 365
});

/**
 * The number a comparable term's value holds, or null when it holds none.
 * A validity needs its unit (days, weeks, months, years) and is read in days;
 * the other comparable terms read the first number in the value.
 * @param {string} termId
 * @param {string | undefined} value
 * @returns {number | null}
 */
export function comparableNumber(termId, value) {
  if (!(termId in RFP_BEST_DIRECTION) || value === undefined) return null;
  const match = value.match(/(\d[\d,]*(?:\.\d+)?)\s*([a-z]*)/i);
  if (!match) return null;
  const n = Number((match[1] ?? '').replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  if (termId !== 'priceValidity') return n;
  const unit = (match[2] ?? '').toLowerCase().replace(/s$/, '');
  const per = DAYS_PER[unit];
  return per === undefined ? null : n * per;
}

/**
 * The ids holding the best value on one term row, or null when the row is not
 * comparable. Empty when fewer than two values can be read or every value is
 * the same: a "Best" with nothing to beat says nothing.
 * @param {string} termId
 * @param {readonly { id: string; value: string | undefined }[]} entries
 * @returns {ReadonlySet<string> | null}
 */
export function bestValueIds(termId, entries) {
  const direction = RFP_BEST_DIRECTION[termId];
  if (!direction) return null;
  const read = entries
    .map((e) => ({ id: e.id, n: comparableNumber(termId, e.value) }))
    .filter((e) => e.n !== null);
  const values = read.map((e) => /** @type {number} */ (e.n));
  if (read.length < 2 || Math.min(...values) === Math.max(...values)) return new Set();
  const best = direction === 'min' ? Math.min(...values) : Math.max(...values);
  return new Set(read.filter((e) => e.n === best).map((e) => e.id));
}

/**
 * The lowest indicative price on each PTI option at each quantity point,
 * keyed `optionId|qty`, with the responses that hold it. Only a pair at least
 * two suppliers priced, with different prices, is marked.
 * @param {readonly RfpPricingOption[]} options
 * @param {readonly RfpResponseView[]} responses
 * @returns {ReadonlyMap<string, ReadonlySet<string>>}
 */
export function lowestIndicativePrices(options, responses) {
  /** @type {Map<string, { id: string; price: number }[]>} */
  const byKey = new Map();
  const asked = new Set(options.map((o) => o.id));
  for (const r of responses)
    for (const p of r.pricing?.prices ?? []) {
      if (!asked.has(p.optionId)) continue;
      const key = `${p.optionId}|${p.qty}`;
      byKey.set(key, [...(byKey.get(key) ?? []), { id: r.id, price: p.unitPrice }]);
    }
  /** @type {Map<string, ReadonlySet<string>>} */
  const out = new Map();
  for (const [key, list] of byKey) {
    const prices = list.map((x) => x.price);
    const low = Math.min(...prices);
    if (list.length < 2 || low === Math.max(...prices)) continue;
    out.set(key, new Set(list.filter((x) => x.price === low).map((x) => x.id)));
  }
  return out;
}

// ── Deviations ──────────────────────────────────────────────────────────────

/**
 * How many answers deviate on each term group (one per supplier per term).
 * @param {RfpEventView} event
 * @returns {ReadonlyMap<string, number>}
 */
export function deviationsByGroup(event) {
  /** @type {Map<string, number>} */
  const out = new Map();
  for (const row of event.terms) {
    const n = event.responses.filter(
      (r) => r.answers.find((a) => a.termId === row.termId)?.stance === 'deviate'
    ).length;
    const group = rfpTermGroupOf(row);
    out.set(group, (out.get(group) ?? 0) + n);
  }
  return out;
}

/**
 * Does any proposal deviate on this term?
 * @param {RfpEventView} event
 * @param {string} termId
 * @returns {boolean}
 */
export const termHasDeviation = (event, termId) =>
  event.responses.some((r) => r.answers.find((a) => a.termId === termId)?.stance === 'deviate');

// ── The summary strip ───────────────────────────────────────────────────────

/**
 * @param {readonly { number: number; submittedAt: string }[]} versions
 * @param {string | undefined} submittedAt
 * @returns {{ version: number; submittedAt: string | null }}
 */
const latestOf = (versions, submittedAt) => {
  const last = versions[versions.length - 1];
  return { version: last?.number ?? 1, submittedAt: submittedAt ?? last?.submittedAt ?? null };
};

/**
 * @typedef {object} RfpSummaryCard
 * @property {RfpResponseView} response
 * @property {number | null} score -  The CR-15 composite the page shows; null when the proposal is not scored.
 * @property {number} deviations
 * @property {readonly { option: RfpPricingOption; unitPrice: number }[]} lowestPrices -  Per PTI option it priced.
 * @property {string | undefined} leadTime -  The proposed lead time, when the RFP asks for one.
 * @property {number} version
 * @property {string | null} submittedAt
 */

/**
 * One card per submitted proposal, best scored first (`compositeExact`); a
 * proposal the score leaves out follows, in the order the read returned.
 * @param {RfpEventView} event
 * @param {ScoringOutcome | null} scoring -  `rfpScoringOf(event)`, the page's own.
 * @returns {RfpSummaryCard[]}
 */
export function rfpSummaryCards(event, scoring) {
  const scores = new Map(
    scoring?.kind === 'scored' ? scoring.scores.map((s) => [s.quoteId, s]) : []
  );
  const hasLead = event.terms.some((row) => row.termId === 'leadTime');
  const cards = event.responses.map((r, index) => {
    const s = scores.get(r.id);
    const lowestPrices = (event.pricing?.options ?? []).flatMap((option) => {
      const prices = (r.pricing?.prices ?? [])
        .filter((p) => p.optionId === option.id)
        .map((p) => p.unitPrice);
      return prices.length > 0 ? [{ option, unitPrice: Math.min(...prices) }] : [];
    });
    return {
      index,
      exact: s ? s.compositeExact : null,
      card: {
        response: r,
        score: s ? s.composite : null,
        deviations: r.deviationCount,
        lowestPrices,
        leadTime: hasLead
          ? r.answers.find((a) => a.termId === 'leadTime')?.proposedValue
          : undefined,
        ...latestOf(r.versions, r.submittedAt)
      }
    };
  });
  return cards
    .sort((a, b) =>
      a.exact === null && b.exact === null
        ? a.index - b.index
        : a.exact === null
          ? 1
          : b.exact === null
            ? -1
            : b.exact - a.exact || a.index - b.index
    )
    .map((c) => c.card);
}

/**
 * @typedef {object} RfiSummaryCard
 * @property {RfiResponseView} response
 * @property {number | null} score -  The response score the page shows; null when nothing is weighted.
 * @property {number} answered -  Required questions answered.
 * @property {number} required
 * @property {number} version
 * @property {string | null} submittedAt
 */

/**
 * One card per submitted RFI response, highest response score first.
 * @param {RfiEventView} event
 * @returns {RfiSummaryCard[]}
 */
export function rfiSummaryCards(event) {
  const required = event.questions.filter((q) => q.required).length;
  return event.responses
    .map((r, index) => ({
      index,
      card: {
        response: r,
        score: r.score,
        answered: required - missingRequiredAnswers(event.questions, r.answers).length,
        required,
        ...latestOf(r.versions, r.submittedAt)
      }
    }))
    .sort((a, b) =>
      a.card.score === null && b.card.score === null
        ? a.index - b.index
        : a.card.score === null
          ? 1
          : b.card.score === null
            ? -1
            : b.card.score - a.card.score || a.index - b.index
    )
    .map((c) => c.card);
}

// ── RFI: answers that differ ────────────────────────────────────────────────

/**
 * One answer as a comparable key: the value (choices in any order), the
 * range, the file names. Descriptions are commentary and are not compared.
 * @param {RfiAnswer | undefined} a
 * @returns {string}
 */
const answerKey = (a) =>
  JSON.stringify([
    Array.isArray(a?.value) ? [...a.value].sort() : (a?.value ?? null),
    a?.range ? [a.range.min, a.range.max] : null,
    (a?.attachments ?? []).map((f) => f.name).sort()
  ]);

/**
 * Do the submitted responses answer this question differently? False with
 * fewer than two responses: nothing to differ from.
 * @param {RfiQuestion} question
 * @param {readonly Pick<RfiResponseView, 'answers'>[]} responses
 * @returns {boolean}
 */
export function answersDiffer(question, responses) {
  if (responses.length < 2) return false;
  const keys = new Set(
    responses.map((r) => answerKey(r.answers.find((a) => a.questionId === question.id)))
  );
  return keys.size > 1;
}
