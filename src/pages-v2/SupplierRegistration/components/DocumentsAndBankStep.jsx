/** @import React from 'react' */
import { Upload, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
/** @import { DocState, StepProps } from '../utils' */
import { inputClass } from '../const';
import Field from './Field';

/**
 * @typedef {object} DocumentMeta
 * @property {string} key
 * @property {string} labelKey
 * @property {boolean} hasExpiry
 */

/** @type {DocumentMeta[]} */
export const DOCUMENTS = [
  { key: 'npwp', labelKey: 'registration.document.npwp', hasExpiry: false },
  { key: 'nib', labelKey: 'registration.document.nib', hasExpiry: true },
  { key: 'halal', labelKey: 'registration.document.halal', hasExpiry: true },
  { key: 'iso', labelKey: 'registration.document.iso', hasExpiry: true }
];

/** The bank choices offered by both bank steps. */
export const BANKS = ['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 'Other'];

/**
 * Step "Documents & bank" (External SR step 4): one upload row per document
 * (with an expiry date once a dated document is uploaded), then the bank
 * account fields.
 * @type {React.FC<StepProps>}
 */
const DocumentsAndBankStep = ({ form, setForm, errors }) => {
  const { t } = useTranslation();
  /**
   * @param {string} key
   * @param {Partial<DocState>} patch
   */
  const setDoc = (key, patch) =>
    setForm((f) => ({
      ...f,
      docs: { ...f.docs, [key]: { ...f.docs[key], ...patch } }
    }));

  return (
    <div className="flex flex-col gap-5">
      <FormSection
        eyebrow={t('registration.step.documents.eyebrow')}
        title={t('registration.step.documents.title')}
        description={t('registration.step.documents.description')}
      >
        <div className="flex flex-col gap-3">
          {DOCUMENTS.map((doc) => {
            const d = form.docs[doc.key];
            return (
              <div
                key={doc.key}
                className="flex flex-col md:flex-row md:items-center gap-3 px-4 py-3 bg-bg-hover border border-border-subtle rounded-md"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary">{t(doc.labelKey)}</div>
                  {d.uploaded && (
                    <div className="text-xs text-text-tertiary mt-0.5 truncate">↑ {d.fileName}</div>
                  )}
                </div>
                {doc.hasExpiry && d.uploaded && (
                  <div>
                    <label className="block">
                      <span className="block text-[10px] text-text-tertiary uppercase mb-0.5">
                        {t('registration.documents.expiry')}
                      </span>
                      <input
                        type="date"
                        className={`${inputClass} text-xs`}
                        style={{ width: 140 }}
                        value={d.expiry}
                        onChange={(e) => setDoc(doc.key, { expiry: e.target.value })}
                      />
                    </label>
                  </div>
                )}
                <label
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs cursor-pointer whitespace-nowrap ${
                    d.uploaded
                      ? 'bg-success-soft text-success'
                      : 'bg-action text-white hover:bg-action-hover'
                  }`}
                >
                  {d.uploaded ? (
                    <>
                      <CheckCircle2 size={12} />
                      {t('registration.documents.uploaded')}
                    </>
                  ) : (
                    <>
                      <Upload size={12} />
                      {t('registration.documents.upload')}
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) =>
                      setDoc(doc.key, {
                        uploaded: !!e.target.files?.[0],
                        fileName: e.target.files?.[0]?.name ?? ''
                      })
                    }
                  />
                </label>
              </div>
            );
          })}
        </div>
      </FormSection>

      <FormSection
        eyebrow={t('registration.step.bank.eyebrow')}
        title={t('registration.step.bank.title')}
        description={t('registration.step.bank.description')}
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
              placeholder="1234567890"
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
                placeholder={t('registration.step.bank.field.accountHolder.placeholder')}
              />
            </Field>
          </div>
        </div>
      </FormSection>
    </div>
  );
};

export default DocumentsAndBankStep;
