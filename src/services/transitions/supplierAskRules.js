// ─────────────────────────────────────────────────────────────────────────────
// "ASK SUPPLIER" — the hub ask (INV-D9; Inventory UX S-04, P-02, P-03, P-05,
// P-07; INV-D8 for the capacity half).
//
// PTI asks one supplier one question about one subject: a material it
// supplies, or a capacity planning group and week. The supplier answers in the
// hub; PTI closes the ask, or withdraws it while it is still open. No email
// (BL-26); PTI may share the hub link on WhatsApp.
//
// Pure: no store, no clock, no UI. The policy hooks and the PTI dialog / the
// supplier reply form call the SAME functions, so a page cannot accept what
// the verb refuses (RFX-R2).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * What the ask is about. Lanes 2B–2D pass one of these.
 * @typedef {'productionDate' | 'stockFigures' | 'capacityGap' | 'other'} SupplierAskTopic
 */

/** Every topic, in the order the dialog offers them. */
export const SUPPLIER_ASK_TOPICS = /** @type {readonly SupplierAskTopic[]} */ (
  Object.freeze(['productionDate', 'stockFigures', 'capacityGap', 'other'])
);

/** Form bounds (not business rules): the longest question or answer accepted. */
export const SUPPLIER_ASK_RULES = Object.freeze({ textMaxLength: 1000 });

/**
 * Why an ask is refused, or null when it is accepted.
 * @typedef {| 'TOPIC_UNKNOWN'
 *   | 'SUBJECT_REQUIRED'
 *   | 'NOT_SUPPLIED'
 *   | 'QUESTION_REQUIRED'
 *   | 'TEXT_TOO_LONG'
 *   | 'DUE_DATE_INVALID'
 *   | 'ASK_ALREADY_OPEN'
 *   | 'ANSWER_REQUIRED'
 *   | 'ANSWER_DATE_INVALID'} SupplierAskRefusal
 */

/**
 * The sentence after each code in a verb's refusal (`CODE: sentence`), for the
 * DR-10 trail. Screens translate the code, never this text.
 * @type {Readonly<Record<SupplierAskRefusal, string>>}
 */
export const SUPPLIER_ASK_REFUSAL_SENTENCE = Object.freeze({
  TOPIC_UNKNOWN: 'the topic is not one PTI can ask about',
  SUBJECT_REQUIRED: 'name either a material, or a planning group and a week',
  NOT_SUPPLIED: 'the supplier does not supply this material or planning group week',
  QUESTION_REQUIRED: 'the question is empty',
  TEXT_TOO_LONG: `the text is longer than ${SUPPLIER_ASK_RULES.textMaxLength} characters`,
  DUE_DATE_INVALID: 'the due date is not a date from today on',
  ASK_ALREADY_OPEN: 'PTI already has an ask on this subject that is not closed',
  ANSWER_REQUIRED: 'the answer is empty',
  ANSWER_DATE_INVALID: 'the date in the answer is not a date'
});

/**
 * The subject an ask names: a material, or a planning group and week.
 * @typedef {{
 *   readonly materialCode?: string;
 *   readonly planningGroupId?: string;
 *   readonly week?: string;
 * }} SupplierAskSubject
 */

/**
 * @param {unknown} v
 * @returns {string}
 */
const text = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * @param {unknown} v
 * @returns {v is string}
 */
export const isIsoDay = (v) =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(`${v}T00:00:00.000Z`)) &&
  new Date(`${v}T00:00:00.000Z`).toISOString().slice(0, 10) === v;

/**
 * One key per supplier × subject: two asks with the same key are about the
 * same thing, whatever their topic.
 * @param {string} supplierId
 * @param {SupplierAskSubject} subject
 * @returns {string}
 */
export const supplierAskSubjectKey = (supplierId, subject) =>
  text(subject.materialCode) !== ''
    ? `${supplierId}|m|${text(subject.materialCode)}`
    : `${supplierId}|g|${text(subject.planningGroupId)}|${text(subject.week)}`;

/**
 * Is the subject well formed: a material alone, or a planning group with a week?
 * @param {SupplierAskSubject} subject
 * @returns {boolean}
 */
const subjectWellFormed = (subject) => {
  const m = text(subject.materialCode) !== '';
  const g = text(subject.planningGroupId) !== '';
  const w = text(subject.week) !== '';
  return m ? !g && !w : g && isIsoDay(subject.week);
};

/**
 * The raise verb's refusal, in the order it checks, or null.
 * @param {{
 *   readonly topic: unknown;
 *   readonly subject: SupplierAskSubject;
 *   readonly question: unknown;
 *   readonly dueDate?: unknown;
 *   readonly today: string;
 *   readonly supplied: boolean;
 *   readonly openOnSubject: boolean;
 * }} input `supplied` — the supplier supplies the material, or has the
 *   planning group week in its capacity plan. `openOnSubject` — an ask on the
 *   same supplier × subject is Open or Answered.
 * @returns {SupplierAskRefusal | null}
 */
export function supplierAskRaiseRefusal(input) {
  if (!SUPPLIER_ASK_TOPICS.includes(/** @type {SupplierAskTopic} */ (input.topic)))
    return 'TOPIC_UNKNOWN';
  if (!subjectWellFormed(input.subject)) return 'SUBJECT_REQUIRED';
  if (!input.supplied) return 'NOT_SUPPLIED';
  const q = text(input.question);
  if (q === '') return 'QUESTION_REQUIRED';
  if (q.length > SUPPLIER_ASK_RULES.textMaxLength) return 'TEXT_TOO_LONG';
  if (input.dueDate !== undefined && input.dueDate !== '') {
    if (!isIsoDay(input.dueDate) || input.dueDate < input.today) return 'DUE_DATE_INVALID';
  }
  if (input.openOnSubject) return 'ASK_ALREADY_OPEN';
  return null;
}

/**
 * The answer verb's refusal, or null.
 * @param {{ readonly answer: unknown; readonly answerDate?: unknown }} input
 * @returns {SupplierAskRefusal | null}
 */
export function supplierAskAnswerRefusal(input) {
  const a = text(input.answer);
  if (a === '') return 'ANSWER_REQUIRED';
  if (a.length > SUPPLIER_ASK_RULES.textMaxLength) return 'TEXT_TOO_LONG';
  if (input.answerDate !== undefined && input.answerDate !== '' && !isIsoDay(input.answerDate))
    return 'ANSWER_DATE_INVALID';
  return null;
}

/**
 * The refusal code inside a dispatcher reason
 * (`POLICY_REJECTED:<hook>:<CODE>: sentence`), or null.
 * @param {string | undefined} reason
 * @returns {SupplierAskRefusal | null}
 */
export function supplierAskRefusalOf(reason) {
  if (!reason) return null;
  const code = Object.keys(SUPPLIER_ASK_REFUSAL_SENTENCE).find((c) => reason.includes(`:${c}:`));
  return /** @type {SupplierAskRefusal | null} */ (code ?? null);
}
