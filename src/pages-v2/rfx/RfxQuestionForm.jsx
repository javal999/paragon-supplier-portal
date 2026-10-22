// ────────────────────────────────────────────────────────────────────────────
// THE SUPPLIER'S QUESTION FORM — every question kind, rendered and validated.
//
// Used by the RFI and by the RFP's questions section. Each field shows the
// prompt, the required mark, the buyer's help text and — when an answer does
// not fit its question — the reason, from the SAME predicate the submit verb
// refuses with (`answerRefusal`). A screen that marked the field red while the
// verb accepted it, or the other way round, would be two rules.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SessionAttachments from '@components/ui-v2/SessionAttachments';
import { rfxSectionsOf } from '@services/sourcing/rfxConfig';
import { answerRefusal } from '@services/transitions/rfxRules';
/** @import { RfiAnswer, RfiQuestion, RfxCustomSection } from '@services/sourcing/types' */
import { IndicativePill, authored, optionLabel, sectionTitle } from './rfxAuthoringDisplay';
import { StillMissing } from './ResponseFormState';

/**
 * @typedef {object} RfxQuestionFormProps
 * @property {readonly RfiQuestion[]} questions
 * @property {readonly RfxCustomSection[]} [customSections]
 * @property {readonly RfiAnswer[]} answers
 * @property {boolean} disabled
 * @property {(questionId: string, patch: Partial<RfiAnswer>) => void} onChange
 * @property {boolean} [withDescription] -  Ask for the BR-02 description under each answer (the RFI does; the RFP does not).
 *   RFx UX S-11: it sits behind "Add a comment" until opened or already filled.
 * @property {readonly string[]} [missing] -  S-02 — the required questions still unanswered: each is marked "Still missing" where it sits.
 */

/**
 * The DOM id of a question's field, the target of the form's jump links (S-02).
 * @param {string} questionId
 * @returns {string}
 */
export const questionAnchor = (questionId) => `field-q-${questionId}`;

/** @type {React.FC<RfxQuestionFormProps>} */
export const RfxQuestionForm = ({
  questions,
  customSections = [],
  answers,
  disabled,
  onChange,
  withDescription = false,
  missing = []
}) => {
  const { t } = useTranslation();
  return (
    <>
      {rfxSectionsOf(customSections).map((section) => {
        const rows = questions.filter((q) => q.sectionId === section.id);
        if (rows.length === 0) return null;
        return (
          <fieldset key={section.id} className="space-y-4">
            <legend className="text-sm font-semibold text-text-primary">
              {sectionTitle(t, section)}
            </legend>
            {rows.map((q) => (
              <QuestionField
                key={q.id}
                question={q}
                answer={answers.find((a) => a.questionId === q.id)}
                disabled={disabled}
                withDescription={withDescription}
                missing={missing.includes(q.id)}
                onChange={(patch) => onChange(q.id, patch)}
              />
            ))}
          </fieldset>
        );
      })}
    </>
  );
};

/**
 * One question, drawn according to its kind.
 * `missing`: S-02 — a required question still unanswered, marked where it sits.
 * @type {React.FC<{ question: RfiQuestion; answer: RfiAnswer | undefined; disabled: boolean; withDescription?: boolean; missing?: boolean; onChange: (patch: Partial<RfiAnswer>) => void; }>}
 */
export const QuestionField = ({
  question,
  answer,
  disabled,
  withDescription = false,
  missing = false,
  onChange
}) => {
  const { t } = useTranslation();
  const id = `q-${question.id}`;
  const value = answer?.value;
  const prompt = authored(t, question.promptKey);
  const invalid = answerRefusal(question, answer);
  const marked = !!invalid || missing;
  const inputClass = `w-full bg-white border rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover ${
    marked ? 'border-danger' : 'border-border-input'
  }`;
  const unit = question.unitKey ? authored(t, question.unitKey) : '';

  const options = question.type === 'yesNo' ? ['yes', 'no'] : (question.options ?? []);
  /** @param {string} raw */
  const numberValue = (raw) => (raw.trim() === '' ? undefined : Number(raw));

  // S-11 — the range line only when both bounds are set: "Between — and 5."
  // named a bound nobody gave. The verb still checks whichever bound exists.
  const bounds =
    question.min !== undefined && question.max !== undefined
      ? t('rfxa.answer.bounds', { min: question.min, max: question.max })
      : '';
  // S-11 — the comment waits behind "Add a comment"; one already written shows.
  const [commenting, setCommenting] = useState(false);
  const hasComment = !!answer?.description;
  const showComment = withDescription && (hasComment || commenting);

  return (
    <div id={questionAnchor(question.id)} data-testid={`rfi-field-${question.id}`}>
      <label className="block text-sm text-text-primary mb-1" htmlFor={id}>
        {prompt}
        {question.required && <span className="text-danger ml-1">*</span>}
        {unit && question.type !== 'priceRange' && (
          <span className="text-text-tertiary ml-1">({unit})</span>
        )}
        {question.type === 'priceRange' && (
          <IndicativePill className="ml-2" testId={`rfi-field-indicative-${question.id}`} />
        )}
      </label>
      {question.help && (
        <p className="text-xs text-text-tertiary mb-1">{authored(t, question.help)}</p>
      )}

      {(question.type === 'yesNo' || question.type === 'singleChoice') && (
        <select
          id={id}
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange({ value: e.target.value })}
          className={inputClass}
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {optionLabel(t, question, o)}
            </option>
          ))}
        </select>
      )}

      {question.type === 'multipleChoice' && (
        <div className="flex flex-wrap gap-3" role="group" aria-label={prompt}>
          {options.map((o) => {
            const chosen = Array.isArray(value) && value.includes(o);
            return (
              <label key={o} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-teal"
                  disabled={disabled}
                  checked={chosen}
                  onChange={() =>
                    onChange({
                      value: chosen
                        ? /** @type {string[]} */ (value).filter((v) => v !== o)
                        : [...(Array.isArray(value) ? /** @type {string[]} */ (value) : []), o]
                    })
                  }
                />
                {optionLabel(t, question, o)}
              </label>
            );
          })}
        </div>
      )}

      {(question.type === 'numberWithUnit' ||
        question.type === 'money' ||
        question.type === 'percentage') && (
        <div className="flex items-center gap-2">
          {question.type === 'money' && question.currency && (
            <span className="text-sm text-text-tertiary">{question.currency}</span>
          )}
          <input
            id={id}
            type="number"
            disabled={disabled}
            value={value === undefined ? '' : String(value)}
            onChange={(e) => onChange({ value: numberValue(e.target.value) })}
            className={inputClass}
          />
          {question.type === 'percentage' && <span className="text-sm text-text-tertiary">%</span>}
        </div>
      )}

      {question.type === 'date' && (
        <input
          id={id}
          type="date"
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange({ value: e.target.value })}
          className={inputClass}
        />
      )}

      {question.type === 'priceRange' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-text-tertiary">{question.currency}</span>
          <input
            id={id}
            type="number"
            disabled={disabled}
            aria-label={`${prompt} — ${t('rfxa.answer.rangeMin')}`}
            value={answer?.range ? String(answer.range.min) : ''}
            onChange={(e) =>
              onChange({
                range: { min: Number(e.target.value), max: answer?.range?.max ?? Number.NaN }
              })
            }
            className={`${inputClass} max-w-[10rem]`}
          />
          <span className="text-sm text-text-tertiary">–</span>
          <input
            type="number"
            disabled={disabled}
            aria-label={`${prompt} — ${t('rfxa.answer.rangeMax')}`}
            value={
              answer?.range && Number.isFinite(answer.range.max) ? String(answer.range.max) : ''
            }
            onChange={(e) =>
              onChange({
                range: { min: answer?.range?.min ?? Number.NaN, max: Number(e.target.value) }
              })
            }
            className={`${inputClass} max-w-[10rem]`}
          />
          {unit && <span className="text-sm text-text-tertiary">{unit}</span>}
        </div>
      )}

      {question.type === 'text' && (
        <input
          id={id}
          type="text"
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange({ value: e.target.value })}
          className={inputClass}
        />
      )}

      {question.type === 'longText' && (
        <textarea
          id={id}
          rows={4}
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange({ value: e.target.value })}
          className={`w-full bg-white border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover ${
            marked ? 'border-danger' : 'border-border-input'
          }`}
        />
      )}

      {question.type === 'attachment' && (
        <SessionAttachments
          value={answer?.attachments ?? []}
          onChange={disabled ? undefined : (next) => onChange({ attachments: next })}
          label={t('rfxa.answer.files')}
          testId={`rfi-field-files-${question.id}`}
        />
      )}

      {bounds && <p className="text-xs text-text-tertiary mt-1">{bounds}</p>}
      {!!missing && !invalid && <StillMissing testId={`rfi-field-missing-${question.id}`} />}
      {invalid && (
        <p className="text-xs text-danger mt-1" data-testid={`rfi-field-invalid-${question.id}`}>
          {t(`rfxa.answer.invalid.${invalid}`)}
        </p>
      )}

      {/* REQ-E03-02 BR-02 — every structured entry can carry a description;
          S-11 folds it behind "Add a comment" so 11 questions are not 22 boxes. */}
      {withDescription && !showComment && !disabled ? (
        <button
          type="button"
          onClick={() => setCommenting(true)}
          className="mt-1 text-xs font-semibold text-action hover:underline"
          data-testid={`rfi-field-add-comment-${question.id}`}
        >
          {t('rfxa.answer.addComment')}
        </button>
      ) : null}
      {showComment && (
        <input
          type="text"
          disabled={disabled}
          placeholder={t('rfx.rfi.description')}
          aria-label={`${prompt} — ${t('rfx.rfi.description')}`}
          value={answer?.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
          className="mt-2 w-full bg-white border border-border-input rounded-md px-3 h-9 text-xs focus:outline-none focus:border-action disabled:bg-bg-hover"
        />
      )}
    </div>
  );
};

export default RfxQuestionForm;
