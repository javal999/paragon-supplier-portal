/** @import React from 'react' */
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation, Trans } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
/** @import { FormState, RegistrationForm } from '../utils' */
/** @import { RequestType } from './RequestTypeSelector' */
import { errorClass } from '../const';
import { catKey, channelLabelKey } from './CategoriesStep';
import { roleKey } from './ContactsStep';
import { DOCUMENTS } from './DocumentsAndBankStep';

/**
 * @typedef {object} ReviewStepProps
 * @property {RequestType} requestType
 */

/**
 * One label and value line of the review. Defined at module level so React
 * keeps the same component between renders (react-hooks/static-components).
 * @type {React.FC<{ label: string; value: string }>}
 */
const Row = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 py-1.5 border-b border-border-subtle last:border-b-0">
    <span className="sm:w-44 shrink-0 text-xs text-text-tertiary font-medium">{label}</span>
    <span className="text-sm text-text-primary font-medium break-words">{value || '—'}</span>
  </div>
);

/**
 * The last step of the External and Internal SR wizards: a read-back of every
 * earlier step for the chosen `requestType`, then the two agreement boxes.
 * Reads every value through `useFormContext()`.
 * @type {React.FC<ReviewStepProps>}
 */
const ReviewStep = ({ requestType }) => {
  const { t } = useTranslation();
  const {
    register,
    control,
    formState: { errors }
  } = /** @type {RegistrationForm} */ (useFormContext());
  const form = /** @type {FormState} */ (useWatch({ control }));
  const isExternal = requestType === 'External SR';
  const isInternal = requestType === 'Internal SR';
  const categoriesValue = form.selCats.map((v) => t(catKey(v))).join(', ') || '—';

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 text-sm text-warning-hover">
        {t('registration.review.notice')}
      </div>

      {isExternal && (
        <>
          <FormSection
            eyebrow={t('registration.review.stepEyebrow', { number: 1 })}
            title={t('registration.step.company.title')}
          >
            <Row label={t('registration.review.field.legalName')} value={form.legalName} />
            <Row label={t('registration.review.field.npwp')} value={form.npwp} />
            <Row label={t('registration.review.field.nib')} value={form.nib} />
            <Row label={t('registration.review.field.country')} value={form.country} />
            {form.country === 'Indonesia' && (
              <Row label={t('registration.review.field.province')} value={form.province} />
            )}
            <Row label={t('registration.review.field.city')} value={form.city} />
            <Row label={t('registration.review.field.address')} value={form.address} />
            <Row label={t('registration.review.field.website')} value={form.website} />
          </FormSection>

          <FormSection
            eyebrow={t('registration.review.stepEyebrow', { number: 2 })}
            title={t('registration.step.contacts.title')}
          >
            {form.contacts.map((c, i) => (
              <div key={c.id} className="mb-3 last:mb-0">
                <div className="text-xs font-bold text-teal-hover mb-1">
                  {t('registration.contacts.label', { index: i + 1 })}
                </div>
                <Row label={t('registration.review.field.name')} value={c.name} />
                <Row label={t('registration.review.field.role')} value={t(roleKey(c.role))} />
                <Row label={t('registration.review.field.email')} value={c.email} />
                <Row label={t('registration.review.field.whatsapp')} value={c.whatsapp} />
                {c.phone && <Row label={t('registration.review.field.phone')} value={c.phone} />}
              </div>
            ))}
          </FormSection>

          <FormSection
            eyebrow={t('registration.review.stepEyebrow', { number: 3 })}
            title={t('registration.title.categoriesChannel')}
          >
            <Row label={t('registration.review.field.supplyCategories')} value={categoriesValue} />
            <Row
              label={t('registration.review.field.channel')}
              value={t(channelLabelKey(form.channel))}
            />
          </FormSection>

          <FormSection
            eyebrow={t('registration.review.stepEyebrow', { number: 4 })}
            title={t('registration.title.documentsBank')}
          >
            {DOCUMENTS.map((doc) => {
              const d = form.docs[doc.key];
              return (
                <Row
                  key={doc.key}
                  label={t(doc.labelKey)}
                  value={
                    d.uploaded
                      ? `${d.fileName}${d.expiry ? ` (${t('registration.review.expires', { date: d.expiry })})` : ''}`
                      : t('registration.review.notUploaded')
                  }
                />
              );
            })}
            <Row label={t('registration.review.field.bank')} value={form.bankName} />
            <Row label={t('registration.review.field.accountNumber')} value={form.accountNumber} />
            <Row label={t('registration.review.field.accountHolder')} value={form.accountHolder} />
          </FormSection>
        </>
      )}

      {isInternal && (
        <>
          <FormSection
            eyebrow={t('registration.review.stepEyebrow', { number: 1 })}
            title={t('registration.step.expansion.title')}
          >
            <Row
              label={t('registration.review.field.additionalCategories')}
              value={categoriesValue}
            />
            <Row label={t('registration.review.field.reason')} value={form.expansionReason} />
          </FormSection>
          <FormSection
            eyebrow={t('registration.review.stepEyebrow', { number: 2 })}
            title={t('registration.title.additionalContacts')}
          >
            {form.contacts.map((c, i) => (
              <div key={c.id} className="mb-3 last:mb-0">
                <div className="text-xs font-bold text-teal-hover mb-1">
                  {t('registration.contacts.label', { index: i + 1 })}
                </div>
                <Row label={t('registration.review.field.name')} value={c.name} />
                <Row label={t('registration.review.field.role')} value={t(roleKey(c.role))} />
                <Row label={t('registration.review.field.email')} value={c.email} />
                <Row label={t('registration.review.field.whatsapp')} value={c.whatsapp} />
              </div>
            ))}
          </FormSection>
        </>
      )}

      <FormSection
        eyebrow={t('registration.review.agreements.eyebrow')}
        title={t('registration.review.agreements.title')}
      >
        <label className="flex items-start gap-3 cursor-pointer mb-2">
          <input type="checkbox" {...register('agreed1')} className="mt-1 accent-teal" />
          <span className="text-sm text-text-secondary">
            <Trans
              i18nKey="registration.review.agreement1.text"
              components={{
                coc: <span className="text-teal-hover underline cursor-pointer" />,
                terms: <span className="text-teal-hover underline cursor-pointer" />
              }}
            />
          </span>
        </label>
        {errors.agreed1 && <div className={errorClass}>{errors.agreed1.message}</div>}
        <label className="flex items-start gap-3 cursor-pointer mt-2">
          <input type="checkbox" {...register('agreed2')} className="mt-1 accent-teal" />
          <span className="text-sm text-text-secondary">{t('registration.review.agreement2')}</span>
        </label>
        {errors.agreed2 && <div className={errorClass}>{errors.agreed2.message}</div>}
      </FormSection>
    </div>
  );
};

export default ReviewStep;
