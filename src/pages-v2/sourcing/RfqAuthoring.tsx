// ────────────────────────────────────────────────────────────────────────────
// THE RFQ WIZARD'S AUTHORING STEPS — items, quantity breaks, questions and
// options — and the two dialogs around them: the template picker ("Start from
// template" / "Copy a past RFQ") and "Save as template" (RFx spec 2026-09-21).
//
// Kept out of `BuyerSourcing.tsx` so the page owns the flow (draft, step gate,
// dispatch) and this file owns the controls. Every rule a control enforces is
// the model's (`rfqDraft.ts` → `rfqModel.ts`), so a step that lets the buyer
// through is a step the create verb will accept.
// ────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Plus, Trash2, X } from 'lucide-react';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import SubTabs from '../../components/ui-v2/SubTabs';
import SessionAttachments from '../../components/ui-v2/SessionAttachments';
import { useToast } from '../../hooks/useToast';
import { formatDate, formatNumber } from '../../lib/format';
import type { RFQ } from '../../data/mockRfqs';
import type { RfiQuestion, RfiQuestionType } from '../../services/sourcing/types';
import {
  RFQ_ONE_TIME_COST_IDS,
  addTier,
  readTierQty,
  refusalCode,
  type RfqItemTypeId,
  type RfqQuantityTier,
  type RfqSpecField,
  type RfqTierBasis,
} from '../../services/sourcing/rfqModel';
import { RFQ_ITEM_TYPES, rfqItemType } from '../../services/sourcing/rfqItemTypes';
import {
  rfqTemplateStore,
  type RfqTemplate,
  type RfqTemplateContent,
} from '../../services/sourcing/rfqTemplates';
import { RFQ_UOM_OPTIONS } from './requisitionPrefill';
import {
  addCustomField,
  newItemDraft,
  removeField,
  retypeItem,
  seedFromRfq,
  seedFromTemplate,
  type ItemDraft,
  type RfqAuthoringDraft,
  type RfqDraftSeed,
} from './rfqDraft';

const inputClass =
  'w-full bg-white border border-border-input rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

/** The words for a `CODE: detail` refusal, through the step-refusal keys. */
export function refusalMessage(t: TFunction, reason: string): string {
  const key = `rfqAuthoring.refusal.${refusalCode(reason)}`;
  const text = t(key);
  return text === key ? reason : text;
}

/** Why Next is disabled on this step, said on the step rather than left to guess. */
export const StepRefusal: React.FC<{ reason: string | null; testId: string }> = ({ reason, testId }) => {
  const { t } = useTranslation();
  if (!reason) return null;
  return (
    <p role="status" data-testid={testId} className="text-xs text-text-secondary border-l-2 border-warning pl-2">
      {refusalMessage(t, reason)}
    </p>
  );
};

const fieldLabel = (t: TFunction, f: RfqSpecField): string => (f.labelKey ? t(f.labelKey) : (f.label ?? f.key));

// ── Quantity breaks ─────────────────────────────────────────────────────────

export const TierEditor: React.FC<{
  tiers: readonly RfqQuantityTier[];
  onChange: (next: RfqQuantityTier[]) => void;
  testId: string;
}> = ({ tiers, onChange, testId }) => {
  const { t } = useTranslation();
  const [raw, setRaw] = useState('');
  const [basis, setBasis] = useState<RfqTierBasis>(tiers[0]?.basis ?? 'perVariant');
  const [refusal, setRefusal] = useState<string | null>(null);

  const add = () => {
    const read = readTierQty(raw);
    if (!read.ok) {
      setRefusal(read.reason);
      return;
    }
    const next = addTier(tiers, { qty: read.value, basis });
    if (!next.ok) {
      setRefusal(next.reason);
      return;
    }
    setRefusal(null);
    setRaw('');
    onChange([...next.tiers]);
  };

  const other = (b: RfqTierBasis): RfqTierBasis => (b === 'perVariant' ? 'total' : 'perVariant');

  return (
    <div className="space-y-3" data-testid={testId}>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={labelClass} htmlFor={`${testId}-qty`}>
            {t('rfqAuthoring.tiers.input')}
          </label>
          <input
            id={`${testId}-qty`}
            type="text"
            inputMode="decimal"
            value={raw}
            placeholder={t('rfqAuthoring.tiers.placeholder')}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            className={`${inputClass} w-40`}
            data-testid={`${testId}-input`}
          />
        </div>
        <fieldset>
          <legend className={labelClass}>{t('rfqAuthoring.tiers.basis')}</legend>
          <div className="flex gap-3 h-9 items-center">
            {(['perVariant', 'total'] as const).map((b) => (
              <label key={b} className="inline-flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer">
                <input
                  type="radio"
                  name={`${testId}-basis`}
                  checked={basis === b}
                  onChange={() => setBasis(b)}
                  className="accent-action"
                />
                {t(`rfqAuthoring.basis.${b}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <Button variant="secondary" icon={Plus} onClick={add} disabled={raw.trim() === ''} data-testid={`${testId}-add`}>
          {t('rfqAuthoring.tiers.add')}
        </Button>
      </div>
      {refusal && (
        <p role="alert" className="text-xs text-danger" data-testid={`${testId}-refusal`}>
          {t(`rfqAuthoring.tiers.refusal.${refusal}`)}
        </p>
      )}
      {tiers.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('rfqAuthoring.tiers.empty')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2" data-testid={`${testId}-chips`}>
          {tiers.map((tier) => (
            <li
              key={tier.qty}
              className="inline-flex items-center gap-1 rounded-full border border-border-input bg-bg-surface pl-3 pr-1 py-1 text-sm"
              data-testid={`${testId}-chip`}
            >
              <Data>{formatNumber(tier.qty)}</Data>
              <button
                type="button"
                className="text-xs text-text-secondary hover:text-action underline-offset-2 hover:underline"
                aria-label={t('rfqAuthoring.tiers.toggle', {
                  qty: formatNumber(tier.qty),
                  basis: t(`rfqAuthoring.basis.${other(tier.basis)}`),
                })}
                onClick={() =>
                  onChange(tiers.map((x) => (x.qty === tier.qty ? { ...x, basis: other(x.basis) } : x)))
                }
              >
                {t(`rfqAuthoring.basis.${tier.basis}`)}
              </button>
              <button
                type="button"
                aria-label={t('rfqAuthoring.tiers.remove', { qty: formatNumber(tier.qty) })}
                className="p-1 text-text-tertiary hover:text-danger"
                onClick={() => onChange(tiers.filter((x) => x.qty !== tier.qty))}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-text-tertiary">{t('rfqAuthoring.tiers.help')}</p>
    </div>
  );
};

// ── Items ───────────────────────────────────────────────────────────────────

const SpecFieldInput: React.FC<{
  field: RfqSpecField;
  label: string;
  testId: string;
  onValue: (v: string) => void;
}> = ({ field, label, testId, onValue }) => {
  const { t } = useTranslation();
  const missing = field.required && !(field.value && field.value.trim());
  if (field.kind === 'choice') {
    return (
      <select
        aria-label={label}
        data-testid={testId}
        value={field.value ?? ''}
        onChange={(e) => onValue(e.target.value)}
        aria-invalid={missing}
        className={inputClass}
      >
        <option value="">{t('rfqAuthoring.opt.choose')}</option>
        {(field.options ?? []).map((o) => (
          <option key={o} value={o}>
            {t(`rfqAuthoring.opt.${o}`)}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type="text"
      inputMode={field.kind === 'number' ? 'decimal' : undefined}
      aria-label={label}
      data-testid={testId}
      value={field.value ?? ''}
      onChange={(e) => onValue(e.target.value)}
      aria-invalid={missing}
      className={inputClass}
    />
  );
};

const ItemCard: React.FC<{
  item: ItemDraft;
  index: number;
  canRemove: boolean;
  onChange: (next: ItemDraft) => void;
  onRemove: () => void;
}> = ({ item, index, canRemove, onChange, onRemove }) => {
  const { t } = useTranslation();
  const n = index + 1;
  const tid = `rfq-item-${n}`;
  const [custom, setCustom] = useState<{ label: string; filledBy: RfqSpecField['filledBy']; required: boolean }>({
    label: '',
    filledBy: 'buyer',
    required: false,
  });

  const setField = (key: string, value: string) =>
    onChange({ ...item, specFields: item.specFields.map((f) => (f.key === key ? { ...f, value } : f)) });

  const toggleCost = (id: (typeof RFQ_ONE_TIME_COST_IDS)[number]) =>
    onChange({
      ...item,
      oneTimeCosts: item.oneTimeCosts.includes(id)
        ? item.oneTimeCosts.filter((c) => c !== id)
        : [...item.oneTimeCosts, id],
    });

  return (
    <section className="border border-border-subtle rounded-md" data-testid={tid}>
      <header className="flex items-center justify-between px-4 py-2 bg-bg-hover">
        <span className="text-label text-text-tertiary uppercase">{t('rfqAuthoring.items.heading', { n })}</span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('rfqAuthoring.items.remove', { n })}
            className="text-text-tertiary hover:text-danger"
          >
            <Trash2 size={14} />
          </button>
        )}
      </header>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className={labelClass} htmlFor={`${tid}-type`}>
              {t('rfqAuthoring.items.type')}
            </label>
            <select
              id={`${tid}-type`}
              data-testid={`${tid}-type`}
              value={item.itemType}
              onChange={(e) => onChange(retypeItem(item, e.target.value as RfqItemTypeId))}
              className={inputClass}
            >
              {RFQ_ITEM_TYPES.map((ty) => (
                <option key={ty.id} value={ty.id}>
                  {t(ty.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelClass} htmlFor={`${tid}-description`}>
              {t('rfqAuthoring.items.description')} <span className="text-danger">*</span>
            </label>
            <input
              id={`${tid}-description`}
              data-testid={`${tid}-description`}
              type="text"
              value={item.description}
              placeholder={t('rfqAuthoring.items.description.ph')}
              onChange={(e) => onChange({ ...item, description: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${tid}-variants`}>
              {t('rfqAuthoring.items.variants')}
            </label>
            <input
              id={`${tid}-variants`}
              data-testid={`${tid}-variants`}
              type="text"
              inputMode="numeric"
              value={item.variantCount}
              onChange={(e) => onChange({ ...item, variantCount: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${tid}-uom`}>
              {t('rfqAuthoring.items.uom')}
            </label>
            <select
              id={`${tid}-uom`}
              value={item.uom}
              onChange={(e) => onChange({ ...item, uom: e.target.value })}
              className={inputClass}
            >
              {RFQ_UOM_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="text-label text-text-tertiary uppercase mb-2">{t('rfqAuthoring.items.spec')}</div>
          <div className="divide-y divide-border-subtle border border-border-subtle rounded-md">
            {item.specFields.map((f) => {
              const label = fieldLabel(t, f);
              const removable = !f.required || f.key.startsWith('custom-');
              return (
                <div key={f.key} className="grid grid-cols-12 gap-3 items-center px-3 py-2" data-testid={`${tid}-field-${f.key}`}>
                  <div className="col-span-4 text-sm text-text-primary">
                    {label}
                    {f.unitKey && <span className="text-text-tertiary"> ({t(f.unitKey)})</span>}
                    {f.filledBy === 'buyer' && f.required && <span className="text-danger"> *</span>}
                    {!f.required && <span className="text-xs text-text-tertiary"> · {t('rfqAuthoring.items.optional')}</span>}
                  </div>
                  <div className="col-span-7">
                    {f.filledBy === 'buyer' ? (
                      <SpecFieldInput
                        field={f}
                        label={`${t('rfqAuthoring.items.heading', { n })} · ${label}`}
                        testId={`${tid}-value-${f.key}`}
                        onValue={(v) => setField(f.key, v)}
                      />
                    ) : (
                      <span className="text-xs text-text-secondary" title={t('rfqAuthoring.items.supplierAnswers')}>
                        {t('rfqAuthoring.filledBy.supplier')}
                        {f.required && <span className="text-text-tertiary"> *</span>}
                      </span>
                    )}
                  </div>
                  <div className="col-span-1 text-right">
                    {removable && (
                      <button
                        type="button"
                        aria-label={t('rfqAuthoring.items.removeField', { field: label })}
                        onClick={() => onChange(removeField(item, f.key))}
                        className="text-text-tertiary hover:text-danger"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs font-medium text-text-secondary">{t('rfqAuthoring.items.addField')}</div>
          <div className="mt-1 flex flex-wrap items-end gap-3" data-testid={`${tid}-custom`}>
            <div>
              <label className={labelClass} htmlFor={`${tid}-custom-label`}>
                {t('rfqAuthoring.items.addField.label')}
              </label>
              <input
                id={`${tid}-custom-label`}
                type="text"
                value={custom.label}
                onChange={(e) => setCustom((c) => ({ ...c, label: e.target.value }))}
                className={`${inputClass} w-48`}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`${tid}-custom-by`}>
                {t('rfqAuthoring.items.addField.filledBy')}
              </label>
              <select
                id={`${tid}-custom-by`}
                value={custom.filledBy}
                onChange={(e) => setCustom((c) => ({ ...c, filledBy: e.target.value as RfqSpecField['filledBy'] }))}
                className={`${inputClass} w-40`}
              >
                <option value="buyer">{t('rfqAuthoring.filledBy.buyer')}</option>
                <option value="supplier">{t('rfqAuthoring.filledBy.supplier')}</option>
              </select>
            </div>
            <label className="inline-flex items-center gap-1.5 text-sm text-text-secondary h-9">
              <input
                type="checkbox"
                checked={custom.required}
                onChange={(e) => setCustom((c) => ({ ...c, required: e.target.checked }))}
                className="accent-action"
              />
              {t('rfqAuthoring.items.addField.required')}
            </label>
            <Button
              variant="secondary"
              icon={Plus}
              disabled={custom.label.trim() === ''}
              onClick={() => {
                onChange(addCustomField(item, custom));
                setCustom({ label: '', filledBy: 'buyer', required: false });
              }}
            >
              {t('rfqAuthoring.items.addField.confirm')}
            </Button>
          </div>
        </div>

        <div>
          <span className={labelClass}>{t('rfqAuthoring.items.costs')}</span>
          <div className="flex flex-wrap gap-4">
            {RFQ_ONE_TIME_COST_IDS.map((c) => (
              <label key={c} className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={item.oneTimeCosts.includes(c)}
                  onChange={() => toggleCost(c)}
                  className="accent-action"
                  data-testid={`${tid}-cost-${c}`}
                />
                {t(`rfqAuthoring.cost.${c}`)}
              </label>
            ))}
          </div>
          <p className="text-xs text-text-tertiary mt-1">{t('rfqAuthoring.items.costs.help')}</p>
        </div>

        <div>
          <label className={labelClass} htmlFor={`${tid}-note`}>
            {t('rfqAuthoring.items.note')}
          </label>
          <textarea
            id={`${tid}-note`}
            rows={2}
            value={item.note}
            placeholder={t('rfqAuthoring.items.note.ph')}
            onChange={(e) => onChange({ ...item, note: e.target.value })}
            className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action"
          />
        </div>

        <SessionAttachments
          value={item.attachments}
          onChange={(attachments) => onChange({ ...item, attachments })}
          label={t('rfqAuthoring.items.attachments')}
          testId={`${tid}-files`}
        />

        <div className="space-y-3">
          <label className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={item.ownTiers}
              onChange={(e) => onChange({ ...item, ownTiers: e.target.checked })}
              className="accent-action"
              data-testid={`${tid}-own-tiers`}
            />
            {t('rfqAuthoring.items.ownTiers')}
          </label>
          {item.ownTiers && (
            <TierEditor
              tiers={item.tiers}
              onChange={(tiers) => onChange({ ...item, tiers })}
              testId={`${tid}-tiers`}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export const ItemsStep: React.FC<{
  items: readonly ItemDraft[];
  onChange: (next: ItemDraft[]) => void;
  refusal: string | null;
}> = ({ items, onChange, refusal }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4" data-testid="rfq-items-step">
      {items.map((item, i) => (
        <ItemCard
          key={item.uid}
          item={item}
          index={i}
          canRemove={items.length > 1}
          onChange={(next) => onChange(items.map((x) => (x.uid === item.uid ? next : x)))}
          onRemove={() => onChange(items.filter((x) => x.uid !== item.uid))}
        />
      ))}
      <Button variant="secondary" icon={Plus} onClick={() => onChange([...items, newItemDraft('other')])} data-testid="rfq-item-add">
        {t('rfqAuthoring.items.add')}
      </Button>
      <StepRefusal reason={refusal} testId="rfq-items-refusal" />
    </div>
  );
};

// ── Questions and options ───────────────────────────────────────────────────

// i18n-defer: question-type ids, not copy — each renders through t(`rfqAuthoring.q.type.<id>`)
const LIGHT_QUESTION_TYPES: readonly RfiQuestionType[] = ['yesNo', 'text', 'date', 'numberWithUnit'];

export const QuestionsOptionsStep: React.FC<{
  draft: RfqAuthoringDraft;
  update: (patch: Partial<RfqAuthoringDraft>) => void;
  refusal: string | null;
}> = ({ draft, update, refusal }) => {
  const { t } = useTranslation();
  const [q, setQ] = useState<{ prompt: string; type: RfiQuestionType; required: boolean }>({
    prompt: '',
    type: 'yesNo',
    required: true,
  });

  const addQuestion = () => {
    const prompt = q.prompt.trim();
    if (!prompt) return;
    const question: RfiQuestion = {
      id: `q-${draft.questions.length + 1}-${Date.now().toString(36)}`,
      sectionId: 'event',
      // The buyer's own words. Rendered through `t()`, whose missing-key
      // fallback returns them verbatim — the RFI one-off question precedent.
      promptKey: prompt,
      type: q.type,
      required: q.required,
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
          <ul className="divide-y divide-border-subtle border border-border-subtle rounded-md" data-testid="rfq-questions">
            {draft.questions.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-text-primary">
                  {t(x.promptKey)}
                  <span className="text-xs text-text-tertiary"> · {t(`rfqAuthoring.q.type.${x.type}`)}</span>
                  {x.required && <span className="text-danger"> *</span>}
                </span>
                <button
                  type="button"
                  aria-label={t('rfqAuthoring.q.remove', { prompt: t(x.promptKey) })}
                  onClick={() => update({ questions: draft.questions.filter((y) => y.id !== x.id) })}
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
              onChange={(e) => setQ((s) => ({ ...s, type: e.target.value as RfiQuestionType }))}
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
          <Button variant="secondary" icon={Plus} onClick={addQuestion} disabled={q.prompt.trim() === ''} data-testid="rfq-q-add">
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
            <span className="block text-xs text-text-tertiary">{t('rfqAuthoring.o.alternatives.help')}</span>
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
            <span className="block text-xs text-text-tertiary">{t('rfqAuthoring.o.confidential.help')}</span>
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

// ── Review ──────────────────────────────────────────────────────────────────

type Row = [string, React.ReactNode];

/** The review rows the authoring half adds: provenance, items, and the rest. */
export function authoringReviewRows(
  t: TFunction,
  d: RfqAuthoringDraft,
  origin: RfqDraftSeed['origin'] | undefined,
): { basics: Row[]; items: Row[]; options: Row[] } {
  const yesNo = (v: boolean) => t(v ? 'rfqAuthoring.review.yes' : 'rfqAuthoring.review.no');
  const tierList = (tiers: readonly RfqQuantityTier[]) =>
    tiers.length === 0 ? (
      t('rfqAuthoring.review.none')
    ) : (
      <Data>{tiers.map((x) => `${formatNumber(x.qty)} ${t(`rfqAuthoring.basis.${x.basis}`)}`).join(' · ')}</Data>
    );
  const files = d.attachments.length + d.items.reduce((s, i) => s + i.attachments.length, 0);
  return {
    basics: [
      ...(origin
        ? ([[t('rfqAuthoring.review.row.origin'), t(`rfqAuthoring.review.origin.${origin.kind}`, { label: origin.label })]] as Row[])
        : []),
      [t('rfqAuthoring.review.row.project'), d.projectName.trim() || '—'],
    ],
    items: d.items.map((item, i) => [
      t('rfqAuthoring.review.row.item', { n: i + 1 }),
      <span key={item.uid} data-testid={`rfq-review-item-${i + 1}`}>
        {t('rfqAuthoring.review.item', {
          type: t(rfqItemType(item.itemType).labelKey),
          description: item.description.trim() || '—',
          variants: item.variantCount || '—',
        })}
        {item.ownTiers && (
          <>
            {' · '}
            {tierList(item.tiers)}
          </>
        )}
      </span>,
    ]),
    options: [
      [t('rfqAuthoring.review.row.tiers'), <span key="tiers" data-testid="rfq-review-tiers">{tierList(d.tiers)}</span>],
      [
        t('rfqAuthoring.review.row.questions'),
        d.questions.length === 0 ? t('rfqAuthoring.review.none') : d.questions.map((q) => t(q.promptKey)).join(' · '),
      ],
      [t('rfqAuthoring.review.row.alternatives'), yesNo(d.allowAlternatives)],
      [
        t('rfqAuthoring.review.row.samples'),
        d.samplesOn
          ? t('rfqAuthoring.review.samples', { qty: d.samplesQty, date: d.samplesNeededBy ? formatDate(d.samplesNeededBy) : '—' })
          : t('rfqAuthoring.review.no'),
      ],
      [t('rfqAuthoring.review.row.confidential'), yesNo(d.confidential)],
      [t('rfqAuthoring.review.row.files'), files === 0 ? t('rfqAuthoring.review.none') : <Data key="files">{files}</Data>],
    ],
  };
}

// ── Dialogs ─────────────────────────────────────────────────────────────────

const Dialog: React.FC<{ label: string; testId: string; onClose: () => void; wide?: boolean; children: React.ReactNode }> = ({
  label,
  testId,
  onClose,
  wide,
  children,
}) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[rgba(13,27,42,0.4)]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-testid={testId}
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[85vh] overflow-y-auto bg-white rounded-lg border border-border-subtle p-5`}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-section text-text-primary">{label}</h3>
          <button type="button" onClick={onClose} aria-label={t('rfqAuthoring.template.picker.close')} className="text-text-tertiary hover:text-text-primary">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

/** "Save as template": name it, save it to this browser, and say where it lives. */
export const SaveTemplateDialog: React.FC<{
  content: RfqTemplateContent;
  defaultName: string;
  onClose: () => void;
}> = ({ content, defaultName, onClose }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [name, setName] = useState(defaultName);

  const save = () => {
    const r = rfqTemplateStore.save(name, content);
    if (!r.ok) {
      toast({ variant: 'error', title: t('rfqAuthoring.template.save.failed'), description: refusalMessage(t, r.reason) });
      return;
    }
    toast({
      variant: 'success',
      title: t('rfqAuthoring.template.save.done', { name: r.template.name }),
      description: t(r.persisted ? 'rfqAuthoring.template.save.doneDesc' : 'rfqAuthoring.template.save.sessionOnly'),
    });
    onClose();
  };

  return (
    <Dialog label={t('rfqAuthoring.template.save.title')} testId="rfq-save-template-dialog" onClose={onClose}>
      <label className={labelClass} htmlFor="rfq-template-name">
        {t('rfqAuthoring.template.save.name')}
      </label>
      <input id="rfq-template-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      <p className="text-xs text-text-secondary mt-3">{t('rfqAuthoring.template.save.keeps')}</p>
      <p className="text-xs text-text-tertiary mt-1">{t('rfqAuthoring.template.picker.storage')}</p>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="secondary" onClick={onClose}>
          {t('rfqAuthoring.template.save.cancel')}
        </Button>
        <Button variant="outline" onClick={save} disabled={name.trim() === ''} data-testid="rfq-save-template-confirm">
          {t('rfqAuthoring.template.save.confirm')}
        </Button>
      </div>
    </Dialog>
  );
};

/** The header "Templates" action: start from a template, or copy a past RFQ. */
export const TemplatePicker: React.FC<{
  rfqs: readonly RFQ[];
  onClose: () => void;
  onStart: (seed: RfqDraftSeed) => void;
}> = ({ rfqs, onClose, onStart }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'templates' | 'copy'>('templates');
  const [search, setSearch] = useState('');
  const templates = rfqTemplateStore.all();
  const state = rfqTemplateStore.readState();
  const nameOf = (tpl: RfqTemplate) => (tpl.nameKey ? t(tpl.nameKey) : (tpl.name ?? tpl.id));

  const past = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...rfqs]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .filter((r) =>
        !q ||
        r.rfqNumber.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        (r.projectName ?? '').toLowerCase().includes(q),
      );
  }, [rfqs, search]);

  return (
    <Dialog label={t('rfqAuthoring.template.picker.title')} testId="rfq-template-picker" onClose={onClose} wide>
      <SubTabs
        options={[
          { id: 'templates', label: t('rfqAuthoring.template.picker.fromTemplate') },
          { id: 'copy', label: t('rfqAuthoring.template.picker.copy') },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-4"
      />
      {tab === 'templates' ? (
        <div className="space-y-3">
          {state.unreadable && (
            <p role="alert" className="text-xs text-danger" data-testid="rfq-templates-unreadable">
              {t('rfqAuthoring.template.picker.unreadable')}
            </p>
          )}
          {state.rejected.map((r) => (
            <p key={r.id} role="alert" className="text-xs text-danger" data-testid="rfq-templates-rejected">
              {t('rfqAuthoring.template.picker.rejected', { id: r.id, reason: refusalMessage(t, r.reason) })}
            </p>
          ))}
          <ul className="divide-y divide-border-subtle border border-border-subtle rounded-md">
            {templates.map((tpl) => (
              <li key={tpl.id} className="flex items-center justify-between gap-3 px-3 py-2" data-testid={`rfq-template-${tpl.id}`}>
                <div className="min-w-0">
                  <div className="text-sm text-text-primary">{nameOf(tpl)}</div>
                  <div className="text-xs text-text-tertiary">
                    {t(tpl.system ? 'rfqAuthoring.template.picker.system' : 'rfqAuthoring.template.picker.saved')} ·{' '}
                    {t('rfqAuthoring.template.picker.summary', {
                      items: tpl.content.items.length,
                      tiers: tpl.content.tiers.length,
                    })}
                  </div>
                </div>
                <Button variant="outline" onClick={() => onStart(seedFromTemplate(tpl, nameOf(tpl)))} data-testid={`rfq-template-use-${tpl.id}`}>
                  {t('rfqAuthoring.template.picker.use')}
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-tertiary">{t('rfqAuthoring.template.picker.storage')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-text-secondary">{t('rfqAuthoring.template.picker.copyHelp')}</p>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('rfqAuthoring.template.picker.search')}
            aria-label={t('rfqAuthoring.template.picker.search')}
            className={inputClass}
          />
          {past.length === 0 ? (
            <p className="text-sm text-text-tertiary">{t('rfqAuthoring.template.picker.noMatch')}</p>
          ) : (
            <ul className="divide-y divide-border-subtle border border-border-subtle rounded-md max-h-80 overflow-y-auto">
              {past.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2" data-testid={`rfq-copy-${r.id}`}>
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary truncate">
                      <Data>{r.rfqNumber}</Data> · {r.title}
                    </div>
                    {r.projectName && (
                      <div className="text-xs text-text-tertiary">{t('rfqAuthoring.projectTag', { name: r.projectName })}</div>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => onStart(seedFromRfq(r))} data-testid={`rfq-copy-use-${r.id}`}>
                    {t('rfqAuthoring.template.picker.copyThis')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dialog>
  );
};
