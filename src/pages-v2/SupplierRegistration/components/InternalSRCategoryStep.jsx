/** @import React from 'react' */
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
/** @import { RegistrationForm } from '../utils' */
import { errorClass, inputClass, labelClass } from '../const';
import Field from './Field';
import { SUPPLY_CATEGORIES } from './CategoriesStep';
import { useSelectedCategories } from '../hooks/useSelectedCategories';

/**
 * Step "Category expansion" for an Internal SR (step 1): the additional supply
 * categories (at least one; the error on `selCats` says so) and a free-text
 * reason. Reads and writes the form through `useFormContext()`.
 * @type {React.FC}
 */
const InternalSRCategoryStep = () => {
  const { t } = useTranslation();
  const { register } = /** @type {RegistrationForm} */ (useFormContext());
  const { selCats, toggleCat, error: catError } = useSelectedCategories();
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
                selCats.includes(cat.value)
                  ? 'border-action bg-action-soft text-text-primary font-semibold'
                  : 'border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <input
                type="checkbox"
                checked={selCats.includes(cat.value)}
                onChange={() => toggleCat(cat.value)}
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
          {...register('expansionReason')}
          placeholder={t('registration.step.expansion.field.reason.placeholder')}
        />
      </Field>
    </FormSection>
  );
};

export default InternalSRCategoryStep;
