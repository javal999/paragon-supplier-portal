// ────────────────────────────────────────────────────────────────────────────
// THE QUESTION EDITOR — RFI questions, and the RFP's questions section.
//
// Sections (the template's A–F plus the buyer's own), every question kind the
// hub renders, a required flag and help text on every question, and — for a
// choice question — an OPTION EDITOR (closes BL-36). The editor refuses a
// question the create verb would refuse, with the verb's own predicate
// (`rfiQuestionRefusal`), and names why rather than silently greying a button.
//
// ⚠️ **THE LIBRARY IS STILL NEVER EDITED HERE (CE-03 / CE-05).** Adding from the
// library COPIES a question onto this event; editing the required flag edits
// this event's copy. The library changes only when Procurement changes it.
// ────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import StatusPill from '@components/ui-v2/StatusPill';
import { BID_CURRENCIES, type BidCurrency } from '@lib/currencyPolicy';
import {
  RFX_QUESTION_TYPES,
  isBoundedType,
  isChoiceType,
  rfxSectionsOf,
} from '@services/sourcing/rfxConfig';
import { rfiQuestionRefusal } from '@services/transitions/rfxRules';
import type {
  RfiQuestion,
  RfiQuestionType,
  RfxCustomSection,
} from '@services/sourcing/types';
import { authored, optionLabel, sectionTitle, IndicativePill } from './rfxAuthoringDisplay';

export interface QuestionSet {
  readonly questions: readonly RfiQuestion[];
  readonly customSections: readonly RfxCustomSection[];
}

interface RfxQuestionEditorProps {
  value: QuestionSet;
  onChange: (next: QuestionSet) => void;
  /** Offer "add from the library" (the RFI). Absent on the RFP. */
  library?: readonly RfiQuestion[];
  /** The currency a new money / price-range question starts in. */
  defaultCurrency: BidCurrency;
  testIdPrefix: string;
}

interface NewQuestion {
  sectionId: string;
  type: RfiQuestionType;
  prompt: string;
  help: string;
  required: boolean;
  options: OptionRow[];
  unit: string;
  min: string;
  max: string;
  currency: BidCurrency;
}

/**
 * One row of the option editor. `id` is the row's React key, given once when
 * the row is created: options are added and removed and hold an input, and two
 * labels can be equal (or both blank), so neither the label nor the position
 * identifies a row. The id never leaves the editor.
 */
interface OptionRow {
  id: number;
  label: string;
}

let nextOptionRowId = 0;
const optionRow = (): OptionRow => ({ id: nextOptionRowId++, label: '' });

const blank = (currency: BidCurrency): NewQuestion => ({
  sectionId: 'event',
  type: 'text',
  prompt: '',
  help: '',
  required: false,
  options: [optionRow(), optionRow()],
  unit: '',
  min: '',
  max: '',
  currency,
});

/** The refusal code of a named refusal ("CODE: detail" → "CODE"). */
export const refusalCode = (reason: string): string => reason.split(':')[0].trim();

const RfxQuestionEditor: React.FC<RfxQuestionEditorProps> = ({
  value,
  onChange,
  library,
  defaultCurrency,
  testIdPrefix: p,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<NewQuestion>(blank(defaultCurrency));
  const [libraryPick, setLibraryPick] = useState('');
  const [sectionTitleDraft, setSectionTitleDraft] = useState('');

  const { questions, customSections } = value;
  const sections = rfxSectionsOf(customSections);
  const customIds = customSections.map((s) => s.id);

  const setQuestions = (next: readonly RfiQuestion[]) => onChange({ questions: next, customSections });

  const remove = (id: string) => setQuestions(questions.filter((q) => q.id !== id));
  const toggleRequired = (id: string) =>
    setQuestions(questions.map((q) => (q.id === id ? { ...q, required: !q.required } : q)));

  const addFromLibrary = () => {
    const found = library?.find((q) => q.id === libraryPick);
    if (!found || questions.some((q) => q.id === found.id)) return;
    setQuestions([...questions, found]);
    setLibraryPick('');
  };

  /** A question id this event does not use yet. Section F keeps `event-N`. */
  const freshId = (sectionId: string): string => {
    const stem = sectionId === 'event' ? 'event' : 'q';
    let n = questions.filter((q) => q.id.startsWith(`${stem}-`)).length + 1;
    while (questions.some((q) => q.id === `${stem}-${n}`)) n += 1;
    return `${stem}-${n}`;
  };

  /** The draft as the question it would add — what the refusal is judged on. */
  const candidate = (): RfiQuestion => {
    const options = draft.options.map((o) => o.label.trim());
    const choice = isChoiceType(draft.type);
    const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
    return {
      id: freshId(draft.sectionId),
      sectionId: draft.sectionId as RfiQuestion['sectionId'],
      promptKey: draft.prompt.trim(),
      type: draft.type,
      required: draft.required,
      ...(draft.help.trim() ? { help: draft.help.trim() } : {}),
      ...(choice
        ? {
            options: options.map((_, i) => `o${i + 1}`),
            optionLabels: Object.fromEntries(options.map((label, i) => [`o${i + 1}`, label])),
          }
        : {}),
      ...((draft.type === 'numberWithUnit' || draft.type === 'priceRange') && draft.unit.trim()
        ? { unitKey: draft.unit.trim() }
        : {}),
      ...(isBoundedType(draft.type) && num(draft.min) !== undefined ? { min: num(draft.min) } : {}),
      ...(isBoundedType(draft.type) && num(draft.max) !== undefined ? { max: num(draft.max) } : {}),
      ...(draft.type === 'money' || draft.type === 'priceRange' ? { currency: draft.currency } : {}),
    };
  };

  const hasPrompt = draft.prompt.trim().length > 0;
  const refusal = hasPrompt ? rfiQuestionRefusal(candidate(), customIds) : null;

  const addQuestion = () => {
    if (!hasPrompt || refusal) return;
    setQuestions([...questions, candidate()]);
    setDraft({ ...blank(draft.currency), sectionId: draft.sectionId });
  };

  const addSection = () => {
    const title = sectionTitleDraft.trim();
    if (!title) return;
    let n = customSections.length + 1;
    while (customSections.some((s) => s.id === `custom-${n}`)) n += 1;
    const section: RfxCustomSection = { id: `custom-${n}`, title };
    onChange({ questions, customSections: [...customSections, section] });
    setSectionTitleDraft('');
    setDraft((d) => ({ ...d, sectionId: section.id }));
  };

  const removeSection = (id: string) => {
    onChange({ questions, customSections: customSections.filter((s) => s.id !== id) });
    if (draft.sectionId === id) setDraft((d) => ({ ...d, sectionId: 'event' }));
  };

  const inputClass =
    'w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action';
  const labelClass = 'block text-xs font-semibold text-text-secondary mb-1';

  const available = (library ?? []).filter((q) => !questions.some((x) => x.id === q.id));

  return (
    <div className="space-y-5">
      <p className="text-xs text-text-tertiary">{t('rfx.create.library.note')}</p>

      {sections.map((section) => {
        const rows = questions.filter((q) => q.sectionId === section.id);
        const isCustom = section.kind === 'custom';
        if (rows.length === 0 && !isCustom) return null;
        return (
          <div key={section.id} data-testid={`${p}-section-${section.id}`}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <h4 className="text-sm font-semibold text-text-primary">{sectionTitle(t, section)}</h4>
              {isCustom && rows.length === 0 && (
                <button
                  type="button"
                  className="text-xs text-text-tertiary hover:text-danger"
                  data-testid={`${p}-section-remove-${section.id}`}
                  onClick={() => removeSection(section.id)}
                >
                  {t('rfxa.section.remove')}
                </button>
              )}
            </div>
            {rows.length === 0 && <p className="text-xs text-text-tertiary">{t('rfxa.section.empty')}</p>}
            <ul className="space-y-1">
              {rows.map((q) => (
                <li
                  key={q.id}
                  data-testid={`${p}-question-${q.id}`}
                  className="flex items-start justify-between gap-3 border border-border-subtle rounded-md px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="text-sm text-text-primary">
                      {authored(t, q.promptKey)}
                      <StatusPill variant="neutral" className="ml-2">
                        {t(`rfx.qtype.${q.type}`)}
                      </StatusPill>
                      {q.type === 'priceRange' && <IndicativePill className="ml-2" />}
                      {/* The required flag is the checkbox on the right — a
                          pill as well would say it twice. */}
                    </span>
                    {q.help && <p className="text-xs text-text-tertiary mt-0.5">{authored(t, q.help)}</p>}
                    {isChoiceType(q.type) && (
                      <p className="text-xs text-text-secondary mt-0.5">
                        {(q.options ?? []).map((o) => optionLabel(t, q, o)).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <label className="flex items-center gap-1 text-xs text-text-secondary">
                      <input
                        type="checkbox"
                        className="accent-teal"
                        checked={q.required}
                        data-testid={`${p}-required-${q.id}`}
                        aria-label={`${t('rfx.rfi.required')} — ${authored(t, q.promptKey)}`}
                        onChange={() => toggleRequired(q.id)}
                      />
                      {t('rfx.rfi.required')}
                    </label>
                    <button
                      type="button"
                      aria-label={`${t('rfx.rfi.removeQuestion')} — ${authored(t, q.promptKey)}`}
                      data-testid={`${p}-remove-${q.id}`}
                      onClick={() => remove(q.id)}
                      className="text-text-tertiary hover:text-danger"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {/* — Add from the library (RFI only). The library itself is untouched. — */}
      {library && (
        <div className="border-t border-border-subtle pt-4">
          <label className={labelClass} htmlFor={`${p}-library`}>
            {t('rfx.create.library')}
          </label>
          {available.length === 0 ? (
            <p className="text-xs text-text-tertiary" data-testid={`${p}-library-empty`}>
              {t('rfx.create.library.empty')}
            </p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <select
                id={`${p}-library`}
                data-testid={`${p}-library`}
                value={libraryPick}
                onChange={(e) => setLibraryPick(e.target.value)}
                className="flex-1 min-w-[16rem] bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              >
                <option value="">—</option>
                {available.map((q) => (
                  <option key={q.id} value={q.id}>
                    {t(`rfx.section.${q.sectionId}`)} · {t(q.promptKey)}
                  </option>
                ))}
              </select>
              <Button variant="outline" disabled={!libraryPick} onClick={addFromLibrary} data-testid={`${p}-library-add`}>
                {t('rfx.create.add')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* — A section of the buyer's own. — */}
      <div className="border-t border-border-subtle pt-4">
        <label className={labelClass} htmlFor={`${p}-section-title`}>
          {t('rfxa.section.new')}
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <input
            id={`${p}-section-title`}
            value={sectionTitleDraft}
            placeholder={t('rfxa.section.new.ph')}
            onChange={(e) => setSectionTitleDraft(e.target.value)}
            className="flex-1 min-w-[16rem] bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
          />
          <Button
            variant="outline"
            disabled={sectionTitleDraft.trim().length === 0}
            onClick={addSection}
            data-testid={`${p}-section-add`}
          >
            {t('rfxa.section.add')}
          </Button>
        </div>
      </div>

      {/* — A question for this event. — */}
      <div className="border-t border-border-subtle pt-4 space-y-3" data-testid={`${p}-oneoff`}>
        <h4 className="text-sm font-semibold text-text-primary">{t('rfx.create.oneOff')}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass} htmlFor={`${p}-oneoff-section`}>
              {t('rfxa.q.section')}
            </label>
            <select
              id={`${p}-oneoff-section`}
              value={draft.sectionId}
              onChange={(e) => setDraft((d) => ({ ...d, sectionId: e.target.value }))}
              className={inputClass}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {sectionTitle(t, s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor={`${p}-oneoff-type`}>
              {t('rfx.create.oneOff.type')}
            </label>
            <select
              id={`${p}-oneoff-type`}
              data-testid={`${p}-oneoff-type`}
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as RfiQuestionType }))}
              className={inputClass}
            >
              {RFX_QUESTION_TYPES.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`rfx.qtype.${kind}`)}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary sm:mt-5">
            <input
              type="checkbox"
              className="accent-teal"
              checked={draft.required}
              onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))}
            />
            {t('rfx.create.oneOff.required')}
          </label>
        </div>
        <div>
          <label className={labelClass} htmlFor={`${p}-oneoff-prompt`}>
            {t('rfx.create.oneOff.prompt')}
          </label>
          <input
            id={`${p}-oneoff-prompt`}
            value={draft.prompt}
            placeholder={t('rfx.create.oneOff.prompt.ph')}
            onChange={(e) => setDraft((d) => ({ ...d, prompt: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${p}-oneoff-help`}>
            {t('rfxa.q.help')}
          </label>
          <input
            id={`${p}-oneoff-help`}
            value={draft.help}
            placeholder={t('rfxa.q.help.ph')}
            onChange={(e) => setDraft((d) => ({ ...d, help: e.target.value }))}
            className={inputClass}
          />
        </div>

        {/* — The option editor (BL-36): a choice question IS its option list. — */}
        {isChoiceType(draft.type) && (
          <fieldset className="space-y-2" data-testid={`${p}-options`}>
            <legend className={labelClass}>{t('rfxa.q.options')}</legend>
            {draft.options.map(({ id, label }, i) => (
              <div key={id} className="flex items-center gap-2">
                <input
                  value={label}
                  aria-label={t('rfxa.q.option', { n: i + 1 })}
                  data-testid={`${p}-option-${i}`}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, options: d.options.map((o, j) => (j === i ? { ...o, label: e.target.value } : o)) }))
                  }
                  className={inputClass}
                />
                <button
                  type="button"
                  aria-label={`${t('rfxa.q.option.remove')} ${i + 1}`}
                  data-testid={`${p}-option-remove-${i}`}
                  onClick={() => setDraft((d) => ({ ...d, options: d.options.filter((_, j) => j !== i) }))}
                  className="text-text-tertiary hover:text-danger"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() => setDraft((d) => ({ ...d, options: [...d.options, optionRow()] }))}
              data-testid={`${p}-option-add`}
            >
              {t('rfxa.q.option.add')}
            </Button>
          </fieldset>
        )}

        {(draft.type === 'numberWithUnit' || draft.type === 'priceRange') && (
          <div>
            <label className={labelClass} htmlFor={`${p}-oneoff-unit`}>
              {t('rfxa.q.unit')}
            </label>
            <input
              id={`${p}-oneoff-unit`}
              value={draft.unit}
              placeholder={t('rfxa.q.unit.ph')}
              onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
              className={inputClass}
            />
          </div>
        )}
        {isBoundedType(draft.type) && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor={`${p}-oneoff-min`}>
                {t('rfxa.q.min')}
              </label>
              <input
                id={`${p}-oneoff-min`}
                type="number"
                value={draft.min}
                onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`${p}-oneoff-max`}>
                {t('rfxa.q.max')}
              </label>
              <input
                id={`${p}-oneoff-max`}
                type="number"
                value={draft.max}
                onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
        )}
        {(draft.type === 'money' || draft.type === 'priceRange') && (
          <div className="max-w-[12rem]">
            <label className={labelClass} htmlFor={`${p}-oneoff-currency`}>
              {t('rfx.rfp.field.currency')}
            </label>
            <select
              id={`${p}-oneoff-currency`}
              value={draft.currency}
              onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value as BidCurrency }))}
              className={inputClass}
            >
              {BID_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
        {draft.type === 'priceRange' && (
          <p className="text-xs text-text-tertiary">
            <IndicativePill className="mr-2" />
            {t('rfxa.q.priceRange.note')}
          </p>
        )}

        {refusal && (
          <p className="text-sm text-danger" data-testid={`${p}-oneoff-refusal`}>
            {t(`rfxa.refusal.${refusalCode(refusal)}`, { defaultValue: refusal })}
          </p>
        )}
        <Button
          variant="outline"
          disabled={!hasPrompt || refusal !== null}
          onClick={addQuestion}
          data-testid={`${p}-oneoff-add`}
        >
          {t('rfx.rfi.addQuestion')}
        </Button>
      </div>
    </div>
  );
};

export default RfxQuestionEditor;
