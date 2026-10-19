// ────────────────────────────────────────────────────────────────────────────
// BL-215 — THE STORED LINK FROM A BUYER QUESTION TO THE BUILT-IN FIELD IT
// REPEATS (`RfiQuestion.builtIn`). The buyer sets it in the question editor;
// the supplier form reads it first (`builtInDuplicates`) and falls back to the
// word match only for a question without it.
//
// A link fits only a question whose answer has the field's shape: the sample
// ready date is a date, the development timeline is text. The create verbs and
// the editors refuse a link that does not fit (`builtInRefusal`).
// ────────────────────────────────────────────────────────────────────────────

/** @import { RfiQuestionType, RfxBuiltInField } from './types' */

/**
 * i18n-defer: field ids off the `RfxBuiltInField` union, not copy — each
 * renders through `t('rfxa.q.builtIn.<id>')`.
 * @type {readonly RfxBuiltInField[]}
 */
export const RFX_BUILT_IN_FIELDS = ['sampleReadyDate', 'developmentTimeline'];

/**
 * Does a link to `field` fit a question of this type?
 * @param {unknown} field
 * @param {RfiQuestionType} type
 * @returns {boolean}
 */
export const builtInFits = (field, type) =>
  field === 'sampleReadyDate'
    ? type === 'date'
    : field === 'developmentTimeline'
      ? type === 'text' || type === 'longText'
      : false;

/**
 * The refusal a question's link earns (`BUILT_IN_MISMATCH`), or null: an
 * unknown field, or a field whose answer the question's type cannot give.
 * @param {{ id?: string; type?: RfiQuestionType; builtIn?: unknown }} q
 * @returns {string | null}
 */
export function builtInRefusal(q) {
  if (q.builtIn === undefined) return null;
  return q.type !== undefined && builtInFits(q.builtIn, q.type)
    ? null
    : `BUILT_IN_MISMATCH: ${String(q.id)} cannot fill ${String(q.builtIn)} from a ${String(q.type)} answer`;
}
