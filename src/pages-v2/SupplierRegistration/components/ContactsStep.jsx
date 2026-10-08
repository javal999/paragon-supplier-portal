/** @import React from 'react' */
import { Plus, X } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
/** @import { RegistrationForm } from '../utils' */
import { emptyContact } from '../utils';
import { inputClass } from '../const';
import Field from './Field';

/**
 * @typedef {object} RoleOption
 * @property {string} value
 * @property {string} key
 */

/** @type {RoleOption[]} */
const CONTACT_ROLES = [
  { value: 'Primary Contact', key: 'registration.role.primary' },
  { value: 'Finance', key: 'registration.role.finance' },
  { value: 'Operations', key: 'registration.role.operations' },
  { value: 'Legal', key: 'registration.role.legal' },
  { value: 'Technical', key: 'registration.role.technical' }
];

// Value → i18n-key lookup for the role select, so the stored form value stays
// the canonical English literal (logic) while display localizes.
/**
 * The i18n key that labels a stored contact role.
 * @param {string} value
 * @returns {string}
 */
export const roleKey = (value) => CONTACT_ROLES.find((r) => r.value === value)?.key ?? '';

/**
 * Step "Contacts" (External SR step 2, Internal SR step 2): one to three
 * contact rows, each with name, role, email, WhatsApp and phone. The rows are a
 * react-hook-form `useFieldArray` over `contacts`, keyed by the array's own row
 * ids so a removed row never hands its DOM nodes to the next one.
 * @type {React.FC}
 */
const ContactsStep = () => {
  const { t } = useTranslation();
  const {
    control,
    register,
    formState: { errors }
  } = /** @type {RegistrationForm} */ (useFormContext());
  const { fields, append, remove } = useFieldArray({ control, name: 'contacts' });
  // `shouldFocus: false`: adding a row leaves focus on the Add button, as it
  // did before the form moved to react-hook-form.
  const addContact = () => {
    if (fields.length < 3) append(emptyContact(), { shouldFocus: false });
  };
  /** @param {number} i */
  const removeContact = (i) => {
    if (fields.length > 1) remove(i);
  };

  return (
    <FormSection
      eyebrow={t('registration.step.contacts.eyebrow')}
      title={t('registration.step.contacts.title')}
      description={t('registration.step.contacts.description')}
    >
      <div className="flex flex-col gap-4">
        {fields.map((c, i) => (
          <div key={c.id} className="bg-bg-hover border border-border-subtle rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-text-primary">
                {t('registration.contacts.label', { index: i + 1 })}
              </span>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeContact(i)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-danger hover:underline"
                >
                  <X size={12} />
                  {t('registration.contacts.remove')}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label={t('registration.step.contacts.field.name.label')}
                required
                error={errors.contacts?.[i]?.name?.message}
              >
                <input
                  className={inputClass}
                  {...register(`contacts.${i}.name`)}
                  placeholder={t('registration.step.contacts.field.name.placeholder')}
                />
              </Field>
              <Field label={t('registration.step.contacts.field.role.label')}>
                <select className={inputClass} {...register(`contacts.${i}.role`)}>
                  {CONTACT_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {t(r.key)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={t('registration.step.contacts.field.email.label')}
                required
                error={errors.contacts?.[i]?.email?.message}
              >
                <input
                  className={inputClass}
                  {...register(`contacts.${i}.email`)}
                  placeholder="jane@example.com"
                />
              </Field>
              <Field
                label={t('registration.step.contacts.field.whatsapp.label')}
                required
                error={errors.contacts?.[i]?.whatsapp?.message}
              >
                <input
                  className={inputClass}
                  {...register(`contacts.${i}.whatsapp`)}
                  placeholder="+62 812 3456 7890"
                />
              </Field>
              <div className="md:col-span-2">
                <Field label={t('registration.step.contacts.field.phone.label')}>
                  <input
                    className={inputClass}
                    {...register(`contacts.${i}.phone`)}
                    placeholder="+62 21 1234 5678"
                  />
                </Field>
              </div>
            </div>
          </div>
        ))}
      </div>
      {fields.length < 3 && (
        <button
          type="button"
          onClick={addContact}
          className="mt-3 w-full border-2 border-dashed border-teal/40 text-teal-hover font-semibold py-2 rounded-md hover:bg-teal-soft text-sm inline-flex items-center justify-center gap-2"
        >
          <Plus size={14} />
          {t('registration.contacts.add')}
        </button>
      )}
    </FormSection>
  );
};

export default ContactsStep;
