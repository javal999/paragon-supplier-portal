/** @import React from 'react' */
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
/** @import { RegistrationForm } from '../utils' */
import { inputClass } from '../const';
import Field from './Field';
import { BANKS } from './DocumentsAndBankStep';

/**
 * Step "Bank" for a KOL (step 2): bank name, account number, account holder,
 * and the notice about personal accounts. Reads and writes the form through
 * `useFormContext()`.
 * @type {React.FC}
 */
const KOLBankStep = () => {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors }
  } = /** @type {RegistrationForm} */ (useFormContext());
  return (
    <FormSection
      eyebrow={t('registration.step.bank.eyebrow')}
      title={t('registration.step.kolBank.title')}
      description={t('registration.step.kolBank.description')}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label={t('registration.step.bank.field.bankName.label')}
          required
          error={errors.bankName?.message}
        >
          <select className={inputClass} {...register('bankName')}>
            <option value="">{t('registration.step.bank.field.bankName.placeholder')}</option>
            {BANKS.map((b) => (
              <option key={b} value={b}>
                {b === 'Other' ? t('registration.option.other') : b}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label={t('registration.step.bank.field.accountNumber.label')}
          required
          error={errors.accountNumber?.message}
        >
          <input
            className={inputClass}
            {...register('accountNumber')}
            placeholder={t('registration.step.kolBank.field.accountNumber.placeholder')}
          />
        </Field>
        <div className="md:col-span-2">
          <Field
            label={t('registration.step.bank.field.accountHolder.label')}
            required
            error={errors.accountHolder?.message}
          >
            <input
              className={inputClass}
              {...register('accountHolder')}
              placeholder={t('registration.step.kolBank.field.accountHolder.placeholder')}
            />
          </Field>
        </div>
      </div>
      <div className="bg-warning-soft border-l-2 border-warning rounded px-3 py-2 mt-3 text-xs text-warning-hover">
        <strong>{t('registration.kolBank.noticeLabel')}</strong>{' '}
        {t('registration.kolBank.noticeText')}
      </div>
    </FormSection>
  );
};

export default KOLBankStep;
