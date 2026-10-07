/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
/** @import { StepProps } from '../utils' */
import { inputClass } from '../const';
import Field from './Field';
import { BANKS } from './DocumentsAndBankStep';

/**
 * Step "Bank" for a KOL (step 2): bank name, account number, account holder,
 * and the notice about personal accounts.
 * @type {React.FC<StepProps>}
 */
const KOLBankStep = ({ form, setForm, errors }) => {
  const { t } = useTranslation();
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
          error={errors.bankName}
        >
          <select
            className={inputClass}
            value={form.bankName}
            onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
          >
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
          error={errors.accountNumber}
        >
          <input
            className={inputClass}
            value={form.accountNumber}
            onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
            placeholder={t('registration.step.kolBank.field.accountNumber.placeholder')}
          />
        </Field>
        <div className="md:col-span-2">
          <Field
            label={t('registration.step.bank.field.accountHolder.label')}
            required
            error={errors.accountHolder}
          >
            <input
              className={inputClass}
              value={form.accountHolder}
              onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value }))}
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
