import { useState } from 'react';
import { useTranslation } from 'react-i18next';
/** @import React from 'react' */
/** @import { RfqItemTypeId, RfqSpecField } from '@services/sourcing/rfqModel' */
/** @import { ItemDraft } from '../../rfqDraft' */
import { Plus, Trash2, X } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import SessionAttachments from '@components/ui-v2/SessionAttachments';
import { RFQ_ONE_TIME_COST_IDS } from '@services/sourcing/rfqModel';
import { RFQ_ITEM_TYPES } from '@services/sourcing/rfqItemTypes';
import { RFQ_UOM_OPTIONS } from '../../requisitionPrefill';
import { addCustomField, removeField, retypeItem } from '../../rfqDraft';
import { inputClass, labelClass } from '../const';
import { fieldLabel } from '../utils';
import { SpecFieldInput } from './SpecFieldInput';
import { TierEditor } from './TierEditor';

/**
 * One RFQ item: type, description, variants, UoM, its spec fields (with a
 * custom-field adder), one-time costs, note, attachments and optional own tiers.
 * Every edit goes out through `onChange` as the next `ItemDraft`; the card holds
 * only the unsaved custom-field form.
 * @type {React.FC<{ item: ItemDraft; index: number; canRemove: boolean; onChange: (next: ItemDraft) => void; onRemove: () => void; }>}
 */
export const ItemCard = ({ item, index, canRemove, onChange, onRemove }) => {
  const { t } = useTranslation();
  const n = index + 1;
  const tid = `rfq-item-${n}`;
  const [custom, setCustom] = useState(
    /** @type {{ label: string; filledBy: RfqSpecField['filledBy']; required: boolean }} */ ({
      label: '',
      filledBy: 'buyer',
      required: false
    })
  );

  /**
   * @param {string} key
   * @param {string} value
   */
  const setField = (key, value) =>
    onChange({
      ...item,
      specFields: item.specFields.map((f) => (f.key === key ? { ...f, value } : f))
    });

  /** @param {(typeof RFQ_ONE_TIME_COST_IDS)[number]} id */
  const toggleCost = (id) =>
    onChange({
      ...item,
      oneTimeCosts: item.oneTimeCosts.includes(id)
        ? item.oneTimeCosts.filter((c) => c !== id)
        : [...item.oneTimeCosts, id]
    });

  return (
    <section className="border border-border-subtle rounded-md" data-testid={tid}>
      <header className="flex items-center justify-between px-4 py-2 bg-bg-hover">
        <span className="text-label text-text-tertiary uppercase">
          {t('rfqAuthoring.items.heading', { n })}
        </span>
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
              onChange={(e) =>
                onChange(retypeItem(item, /** @type {RfqItemTypeId} */ (e.target.value)))
              }
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
          <div className="text-label text-text-tertiary uppercase mb-2">
            {t('rfqAuthoring.items.spec')}
          </div>
          <div className="divide-y divide-border-subtle border border-border-subtle rounded-md">
            {item.specFields.map((f) => {
              const label = fieldLabel(t, f);
              const removable = !f.required || f.key.startsWith('custom-');
              return (
                <div
                  key={f.key}
                  className="grid grid-cols-12 gap-3 items-center px-3 py-2"
                  data-testid={`${tid}-field-${f.key}`}
                >
                  <div className="col-span-4 text-sm text-text-primary">
                    {label}
                    {f.unitKey && <span className="text-text-tertiary"> ({t(f.unitKey)})</span>}
                    {f.filledBy === 'buyer' && f.required && (
                      <span className="text-danger"> *</span>
                    )}
                    {!f.required && (
                      <span className="text-xs text-text-tertiary">
                        {' '}
                        · {t('rfqAuthoring.items.optional')}
                      </span>
                    )}
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
                      <span
                        className="text-xs text-text-secondary"
                        title={t('rfqAuthoring.items.supplierAnswers')}
                      >
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
          <div className="mt-3 text-xs font-medium text-text-secondary">
            {t('rfqAuthoring.items.addField')}
          </div>
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
                onChange={(e) =>
                  setCustom((c) => ({
                    ...c,
                    filledBy: /** @type {RfqSpecField['filledBy']} */ (e.target.value)
                  }))
                }
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
              <label
                key={c}
                className="inline-flex items-center gap-1.5 text-sm text-text-secondary"
              >
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
