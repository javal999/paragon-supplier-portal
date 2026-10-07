/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
/** @import { StepProps } from '../utils' */
import { errorClass, inputClass, labelClass } from '../const';
import Field from './Field';
import { SUPPLY_CATEGORIES } from './CategoriesStep';

/**
 * Step "Category expansion" for an Internal SR (step 1): the additional supply
 * categories (at least one; `catError` says so) and a free-text reason.
 * @type {React.FC<StepProps & { catError: string }>}
 */
const InternalSRCategoryStep = ({ form, setForm, catError }) => {
  const { t } = useTranslation();
  return (
    <FormSection
      eyebrow={t('registration.step.expansion.eyebrow')}
      title={t('registration.step.expansion.title')}
      description={t('registration.step.expansion.description')}
    >
      <div className="mb-4">
        <label className={labelClass}>
          {t('registration.step.expansion.field.categories.label')}
          <span className="text-danger ml-0.5">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SUPPLY_CATEGORIES.map((cat) => (
            <label
              key={cat.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer border-2 text-sm transition-colors ${
                form.selCats.includes(cat.value)
                  ? 'border-action bg-action-soft text-text-primary font-semibold'
                  : 'border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <input
                type="checkbox"
                checked={form.selCats.includes(cat.value)}
                onChange={() =>
                  setForm((f) => ({
                    ...f,
                    selCats: f.selCats.includes(cat.value)
                      ? f.selCats.filter((c) => c !== cat.value)
                      : [...f.selCats, cat.value]
                  }))
                }
                className="accent-teal"
              />
              {t(cat.key)}
            </label>
          ))}
        </div>
        {catError && <div className={`${errorClass} mt-2`}>{catError}</div>}
      </div>
      <Field label={t('registration.step.expansion.field.reason.label')}>
        <textarea
          className={`${inputClass} min-h-[80px] resize-y`}
          value={form.expansionReason}
          onChange={(e) => setForm((f) => ({ ...f, expansionReason: e.target.value }))}
          placeholder={t('registration.step.expansion.field.reason.placeholder')}
        />
      </Field>
    </FormSection>
  );
};

export default InternalSRCategoryStep;
