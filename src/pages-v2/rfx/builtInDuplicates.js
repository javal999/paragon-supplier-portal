// ────────────────────────────────────────────────────────────────────────────
// S-06 · A BUYER QUESTION THAT ASKS WHAT A BUILT-IN FIELD ALREADY ASKS.
//
// The RFQ asks "Sample ready date" as a buyer question and again inside the
// sample offer; the RFP asks for a development timeline as a question and again
// as the pricing block's "Timeline". The supplier typed the same fact twice.
//
// A question carries no link to a built-in field (the buyer writes it in their
// own words), so the match is made on the words: a DATE question whose prompt
// contains the built-in "Sample ready date" label, or a TEXT question whose
// prompt contains the "Timeline" word, in English or Indonesian. When one
// matches, the form shows the question only and copies its answer into the
// built-in field, so both the buyer's question and the built-in field are sent.
// A question that does not match is left alone: two fields is the old
// behaviour, never a lost answer.
// ────────────────────────────────────────────────────────────────────────────

/** @import { RfiAnswer, RfiQuestion, RfpPricingAnswer } from '@services/sourcing/types' */

/** @typedef {'sampleReadyDate' | 'timeline'} BuiltInField */

/**
 * @param {string} s
 * @returns {string}
 */
const words = (s) =>
  ` ${s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()} `;

/**
 * @param {string} prompt
 * @param {readonly string[]} labels
 */
const mentions = (prompt, labels) => {
  const p = words(prompt);
  return labels.some((l) => words(l).trim() !== '' && p.includes(words(l)));
};

/**
 * Which buyer question, if any, duplicates each built-in field.
 * @param {readonly RfiQuestion[]} questions
 * @param {(q: RfiQuestion) => string} promptOf -  The prompt as the supplier reads it.
 * @param {{ sampleReadyDate: readonly string[]; timeline: readonly string[] }} labels -  The built-in labels, in every language.
 * @returns {Partial<Record<BuiltInField, RfiQuestion>>}
 */
export function builtInDuplicates(questions, promptOf, labels) {
  /** @type {Partial<Record<BuiltInField, RfiQuestion>>} */
  const found = {};
  for (const q of questions) {
    const texts = [promptOf(q), q.promptKey];
    if (
      !found.sampleReadyDate &&
      q.type === 'date' &&
      texts.some((x) => mentions(x, labels.sampleReadyDate))
    ) {
      found.sampleReadyDate = q;
    }
    if (
      !found.timeline &&
      (q.type === 'text' || q.type === 'longText') &&
      texts.some((x) => mentions(x, labels.timeline))
    ) {
      found.timeline = q;
    }
  }
  return found;
}

/**
 * The built-in labels in English and Indonesian, through `t`.
 * @param {(key: string, opts?: Record<string, unknown>) => string} t
 * @param {string} sampleDateKey
 * @param {string} timelineKey
 */
export const builtInLabels = (t, sampleDateKey, timelineKey) => ({
  sampleReadyDate: ['en', 'id'].map((lng) => String(t(sampleDateKey, { lng }))),
  timeline: ['en', 'id'].map((lng) => String(t(timelineKey, { lng })))
});

/**
 * The RFP pricing as it is sent: each built-in field a buyer question already
 * asked carries that question's answer — the timeline note always, the sample
 * ready date only on a Yes (a "No" offer has no date).
 * @param {RfpPricingAnswer} pricing
 * @param {Partial<Record<BuiltInField, RfiQuestion>>} dups
 * @param {readonly RfiAnswer[]} answers
 * @returns {RfpPricingAnswer}
 */
export function copyAnsweredFields(pricing, dups, answers) {
  /** @param {string} id */
  const answerOf = (id) => {
    const v = answers.find((a) => a.questionId === id)?.value;
    return typeof v === 'string' ? v.trim() : '';
  };
  let next = pricing;
  if (dups.timeline) {
    const { timelineNote: _dropped, ...rest } = next;
    const note = answerOf(dups.timeline.id);
    next = note ? { ...rest, timelineNote: note } : rest;
  }
  if (dups.sampleReadyDate && next.sample?.canSample === true) {
    const date = answerOf(dups.sampleReadyDate.id);
    next = { ...next, sample: date ? { canSample: true, readyDate: date } : { canSample: true } };
  }
  return next;
}
