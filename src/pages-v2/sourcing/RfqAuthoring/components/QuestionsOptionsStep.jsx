import { useState } from 'react';
import { useTranslation } from 'react-i18next';
/** @import React from 'react' */
/** @import { RfiQuestion, RfiQuestionType } from '@services/sourcing/types' */
/** @import { RfqAuthoringDraft } from '../../rfqDraft' */
import { Plus, X } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import SessionAttachments from '@components/ui-v2/SessionAttachments';
import { inputClass, labelClass } from '../const';
import { StepRefusal } from './StepRefusal';

// i18n-defer: question-type ids, not copy — each renders through t(`rfqAuthoring.q.type.<id>`)
/** @type {readonly RfiQuestionType[]} */
const LIGHT_QUESTION_TYPES = ['yesNo', 'text', 'date', 'numberWithUnit'];

/**
 * The wizard's Questions & options step: buyer-authored questions (light types
 * only), then alternatives, samples, confidentiality and RFQ-wide attachments.
 * Every change goes out through `update` as a draft patch.
 * @type {React.FC<{ draft: RfqAuthoringDraft; update: (patch: Partial<RfqAuthoringDraft>) => void; refusal: string | null; }>}
 */
export const QuestionsOptionsStep = ({ draft, update, refusal }) => {
  const { t } = useTranslation();
  const [q, setQ] = useState(
    /** @type {{ prompt: string; type: RfiQuestionType; required: boolean }} */ ({
      prompt: '',
      type: 'yesNo',
      required: true
    })
  );

  const addQuestion = () => {
    const prompt = q.prompt.trim();
    if (!prompt) return;
    /** @type {RfiQuestion} */
    const question = {
      id: `q-${draft.questions.length + 1}-${Date.now().toString(36)}`,
      sectionId: 'event',
      // The buyer's own words. Rendered through `t()`, whose missing-key
      // fallback returns them verbatim — the RFI one-off question precedent.
      promptKey: prompt,
      type: q.type,
      required: q.required
    };
    update({ questions: [...draft.questions, question] });
    setQ({ prompt: '', type: 'yesNo', required: true });
  };

  return (
    <div className="space-y-6" data-testid="rfq-options-step">
      <section className="space-y-3">
        <h4 className="text-section text-text-primary">{t('rfqAuthoring.q.heading')}</h4>
        <p className="text-xs text-text-tertiary">{t('rfqAuthoring.q.help')}</p>
        {draft.questions.length === 0 ? (
          <p className="text-sm text-text-tertiary">{t('rfqAuthoring.q.none')}</p>
        ) : (
          <ul
            className="divide-y divide-border-subtle border border-border-subtle rounded-md"
            data-testid="rfq-questions"
          >
            {draft.questions.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-text-primary">
                  {t(x.promptKey)}
                  <span className="text-xs text-text-tertiary">
                    {' '}
                    · {t(`rfqAuthoring.q.type.${x.type}`)}
                  </span>
                  {x.required && <span className="text-danger"> *</span>}
                </span>
                <button
                  type="button"
                  aria-label={t('rfqAuthoring.q.remove', { prompt: t(x.promptKey) })}
                  onClick={() =>
                    update({ questions: draft.questions.filter((y) => y.id !== x.id) })
                  }
                  className="text-text-tertiary hover:text-danger"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className={labelClass} htmlFor="rfq-q-prompt">
              {t('rfqAuthoring.q.prompt')}
            </label>
            <input
              id="rfq-q-prompt"
              type="text"
              value={q.prompt}
              placeholder={t('rfqAuthoring.q.prompt.ph')}
              onChange={(e) => setQ((s) => ({ ...s, prompt: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="rfq-q-type">
              {t('rfqAuthoring.q.type')}
            </label>
            <select
              id="rfq-q-type"
              value={q.type}
              onChange={(e) =>
                setQ((s) => ({ ...s, type: /** @type {RfiQuestionType} */ (e.target.value) }))
              }
              className={`${inputClass} w-40`}
            >
              {LIGHT_QUESTION_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {t(`rfqAuthoring.q.type.${ty}`)}
                </option>
              ))}
            </select>
          </div>
          <label className="inline-flex items-center gap-1.5 text-sm text-text-secondary h-9">
            <input
              type="checkbox"
              checked={q.required}
              onChange={(e) => setQ((s) => ({ ...s, required: e.target.checked }))}
              className="accent-action"
            />
            {t('rfqAuthoring.q.required')}
          </label>
          <Button
            variant="secondary"
            icon={Plus}
            onClick={addQuestion}
            disabled={q.prompt.trim() === ''}
            data-testid="rfq-q-add"
          >
            {t('rfqAuthoring.q.add')}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-section text-text-primary">{t('rfqAuthoring.o.heading')}</h4>
        <label className="flex items-start gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={draft.allowAlternatives}
            onChange={(e) => update({ allowAlternatives: e.target.checked })}
            className="accent-action mt-0.5"
            data-testid="rfq-opt-alternatives"
          />
          <span>
            {t('rfqAuthoring.o.alternatives')}
            <span className="block text-xs text-text-tertiary">
              {t('rfqAuthoring.o.alternatives.help')}
            </span>
          </span>
        </label>
        <div>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={draft.samplesOn}
              onChange={(e) => update({ samplesOn: e.target.checked })}
              className="accent-action"
              data-testid="rfq-opt-samples"
            />
            {t('rfqAuthoring.o.samples')}
          </label>
          {draft.samplesOn && (
            <div className="mt-2 ml-6 flex flex-wrap gap-3">
              <div>
                <label className={labelClass} htmlFor="rfq-samples-qty">
                  {t('rfqAuthoring.o.samples.qty')}
                </label>
                <input
                  id="rfq-samples-qty"
                  type="text"
                  inputMode="numeric"
                  value={draft.samplesQty}
                  onChange={(e) => update({ samplesQty: e.target.value })}
                  className={`${inputClass} w-32`}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="rfq-samples-date">
                  {t('rfqAuthoring.o.samples.neededBy')}
                </label>
                <input
                  id="rfq-samples-date"
                  type="date"
                  value={draft.samplesNeededBy}
                  onChange={(e) => update({ samplesNeededBy: e.target.value })}
                  className={`${inputClass} w-44`}
                />
              </div>
            </div>
          )}
        </div>
        <label className="flex items-start gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={draft.confidential}
            onChange={(e) => update({ confidential: e.target.checked })}
            className="accent-action mt-0.5"
            data-testid="rfq-opt-confidential"
          />
          <span>
            {t('rfqAuthoring.o.confidential')}
            <span className="block text-xs text-text-tertiary">
              {t('rfqAuthoring.o.confidential.help')}
            </span>
          </span>
        </label>
        <SessionAttachments
          value={draft.attachments}
          onChange={(attachments) => update({ attachments: [...attachments] })}
          label={t('rfqAuthoring.o.attachments')}
          testId="rfq-files"
        />
      </section>
      <StepRefusal reason={refusal} testId="rfq-options-refusal" />
    </div>
  );
};
