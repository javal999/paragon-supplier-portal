// ────────────────────────────────────────────────────────────────────────────
// THE SUPPLIER'S QUESTION FORM — every question kind, rendered and validated.
//
// Used by the RFI and by the RFP's questions section. Each field shows the
// prompt, the required mark, the buyer's help text and — when an answer does
// not fit its question — the reason, from the SAME predicate the submit verb
// refuses with (`answerRefusal`). A screen that marked the field red while the
// verb accepted it, or the other way round, would be two rules.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import SessionAttachments from '@components/ui-v2/SessionAttachments';
import { rfxSectionsOf } from '@services/sourcing/rfxConfig';
import { answerRefusal } from '@services/transitions/rfxRules';
import type { RfiAnswer, RfiQuestion, RfxCustomSection } from '@services/sourcing/types';
import { IndicativePill, authored, optionLabel, sectionTitle } from './rfxAuthoringDisplay';

interface RfxQuestionFormProps {
  questions: readonly RfiQuestion[];
  customSections?: readonly RfxCustomSection[];
  answers: readonly RfiAnswer[];
  disabled: boolean;
  onChange: (questionId: string, patch: Partial<RfiAnswer>) => void;
  /** Ask for the BR-02 description under each answer (the RFI does; the RFP does not). */
  withDescription?: boolean;
}

export const RfxQuestionForm: React.FC<RfxQuestionFormProps> = ({
  questions,
  customSections = [],
  answers,
  disabled,
  onChange,
  withDescription = false,
}) => {
  const { t } = useTranslation();
  return (
    <>
      {rfxSectionsOf(customSections).map((section) => {
        const rows = questions.filter((q) => q.sectionId === section.id);
        if (rows.length === 0) return null;
        return (
          <fieldset key={section.id} className="space-y-4">
            <legend className="text-sm font-semibold text-text-primary">{sectionTitle(t, section)}</legend>
            {rows.map((q) => (
              <QuestionField
                key={q.id}
                question={q}
                answer={answers.find((a) => a.questionId === q.id)}
                disabled={disabled}
                withDescription={withDescription}
                onChange={(patch) => onChange(q.id, patch)}
              />
            ))}
          </fieldset>
        );
      })}
    </>
  );
};

/** One question, drawn according to its kind. */
export const QuestionField: React.FC<{
  question: RfiQuestion;
  answer: RfiAnswer | undefined;
  disabled: boolean;
  withDescription?: boolean;
  onChange: (patch: Partial<RfiAnswer>) => void;
}> = ({ question, answer, disabled, withDescription = false, onChange }) => {
  const { t } = useTranslation();
  const id = `q-${question.id}`;
  const value = answer?.value;
  const prompt = authored(t, question.promptKey);
  const invalid = answerRefusal(question, answer);
  const inputClass = `w-full bg-white border rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover ${
    invalid ? 'border-danger' : 'border-border-input'
  }`;
  const unit = question.unitKey ? authored(t, question.unitKey) : '';

  const options = question.type === 'yesNo' ? ['yes', 'no'] : (question.options ?? []);
  const numberValue = (raw: string) => (raw.trim() === '' ? undefined : Number(raw));

  const bounds =
    question.min !== undefined || question.max !== undefined
      ? t('rfxa.answer.bounds', {
          min: question.min ?? '—',
          max: question.max ?? '—',
        })
      : '';

  return (
    <div data-testid={`rfi-field-${question.id}`}>
      <label className="block text-sm text-text-primary mb-1" htmlFor={id}>
        {prompt}
        {question.required && <span className="text-danger ml-1">*</span>}
        {unit && question.type !== 'priceRange' && <span className="text-text-tertiary ml-1">({unit})</span>}
        {question.type === 'priceRange' && <IndicativePill className="ml-2" testId={`rfi-field-indicative-${question.id}`} />}
      </label>
      {question.help && <p className="text-xs text-text-tertiary mb-1">{authored(t, question.help)}</p>}

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
                        ? (value as string[]).filter((v) => v !== o)
                        : [...(Array.isArray(value) ? (value as string[]) : []), o],
                    })
                  }
                />
                {optionLabel(t, question, o)}
              </label>
            );
          })}
        </div>
      )}

      {(question.type === 'numberWithUnit' || question.type === 'money' || question.type === 'percentage') && (
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
              onChange({ range: { min: Number(e.target.value), max: answer?.range?.max ?? Number.NaN } })
            }
            className={`${inputClass} max-w-[10rem]`}
          />
          <span className="text-sm text-text-tertiary">–</span>
          <input
            type="number"
            disabled={disabled}
            aria-label={`${prompt} — ${t('rfxa.answer.rangeMax')}`}
            value={answer?.range && Number.isFinite(answer.range.max) ? String(answer.range.max) : ''}
            onChange={(e) =>
              onChange({ range: { min: answer?.range?.min ?? Number.NaN, max: Number(e.target.value) } })
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
            invalid ? 'border-danger' : 'border-border-input'
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
      {invalid && (
        <p className="text-xs text-danger mt-1" data-testid={`rfi-field-invalid-${question.id}`}>
          {t(`rfxa.answer.invalid.${invalid}`)}
        </p>
      )}

      {/* REQ-E03-02 BR-02 — every structured entry carries a description. */}
      {withDescription && (
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
