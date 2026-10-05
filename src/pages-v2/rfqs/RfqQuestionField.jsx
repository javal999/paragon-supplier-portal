/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SessionAttachments from '@components/ui-v2/SessionAttachments';
/** @import { RfiAnswer, RfiQuestion } from '@services/sourcing/types' */
/** @import { AttachmentMeta } from '@services/sourcing/rfqModel' */

// ─────────────────────────────────────────────────────────────────────────────
// One of the buyer's typed questions on an RFQ, drawn by its kind (RFx working
// spec, "Supplier response · At RFQ level · answers to questions"). Every
// question type the RFI library defines is drawn; the answer is judged by the
// verb's own rule (`rfqResponse.answersRefusal`), not by this field.
//
// A buyer's own question on an RFQ is the buyer's words, so the prompt is
// rendered through `t()` with the words themselves as the fallback.
// ─────────────────────────────────────────────────────────────────────────────

const inputClass =
  'w-full bg-white border border-border-input rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action';

/** @type {React.FC<{ question: RfiQuestion; answer: RfiAnswer | undefined; onChange: (next: RfiAnswer) => void; }>} */
const RfqQuestionField = ({ question, answer, onChange }) => {
  const { t } = useTranslation();
  // An attachment answer stores the file's NAME (the RFI rule); the file itself
  // is held for this session only (BL-27).
  const [files, setFiles] = useState(/** @type {readonly AttachmentMeta[]} */ ([]));
  const id = `rfq-q-${question.id}`;
  const value = answer?.value;
  /** @param {RfiAnswer['value']} v */
  const set = (v) => onChange({ ...answer, questionId: question.id, value: v });
  const prompt = t(question.promptKey, { defaultValue: question.promptKey });
  const options = question.type === 'yesNo' ? ['yes', 'no'] : (question.options ?? []);

  return (
    <div data-testid={`rfq-question-${question.id}`}>
      <label className="block text-sm text-text-primary mb-1" htmlFor={id}>
        {prompt}
        {question.required && <span className="text-danger ml-1">*</span>}
        {question.unitKey && (
          <span className="text-text-tertiary ml-1">({t(question.unitKey)})</span>
        )}
      </label>

      {(question.type === 'yesNo' || question.type === 'singleChoice') && (
        <select
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => set(e.target.value || undefined)}
          className={inputClass}
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {t(`rfx.opt.${o}`, { defaultValue: o })}
            </option>
          ))}
        </select>
      )}

      {question.type === 'multipleChoice' && (
        <div className="flex flex-wrap gap-3" id={id}>
          {options.map((o) => {
            const list = Array.isArray(value) ? /** @type {string[]} */ (value) : [];
            const chosen = list.includes(o);
            return (
              <label key={o} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-action"
                  checked={chosen}
                  onChange={() => set(chosen ? list.filter((v) => v !== o) : [...list, o])}
                />
                {t(`rfx.opt.${o}`, { defaultValue: o })}
              </label>
            );
          })}
        </div>
      )}

      {question.type === 'numberWithUnit' && (
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={typeof value === 'number' ? String(value) : typeof value === 'string' ? value : ''}
          onChange={(e) => {
            // Kept as typed; `readTieredDraft` reads it through the one legal
            // number parser, and an unreadable entry is refused by name.
            set(e.target.value.trim() === '' ? undefined : e.target.value);
          }}
          className={inputClass}
        />
      )}

      {question.type === 'date' && (
        <input
          id={id}
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => set(e.target.value || undefined)}
          className={inputClass}
        />
      )}

      {question.type === 'attachment' && (
        <SessionAttachments
          label={t('rfqResponse.question.attachment')}
          testId={`rfq-q-att-${question.id}`}
          value={files}
          onChange={(next) => {
            setFiles(next);
            set(next.length > 0 ? next.map((f) => f.name).join(', ') : undefined);
          }}
        />
      )}

      {![
        'yesNo',
        'singleChoice',
        'multipleChoice',
        'numberWithUnit',
        'date',
        'attachment'
      ].includes(question.type) && (
        <textarea
          id={id}
          rows={2}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => set(e.target.value)}
          className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action"
        />
      )}

      <input
        type="text"
        placeholder={t('rfqResponse.question.comment')}
        aria-label={`${prompt} — ${t('rfqResponse.question.comment')}`}
        value={answer?.description ?? ''}
        onChange={(e) =>
          onChange({
            ...answer,
            questionId: question.id,
            value: answer?.value,
            description: e.target.value
          })
        }
        className="mt-2 w-full bg-white border border-border-input rounded-md px-3 h-8 text-xs focus:outline-none focus:border-action"
      />
    </div>
  );
};

export default RfqQuestionField;
