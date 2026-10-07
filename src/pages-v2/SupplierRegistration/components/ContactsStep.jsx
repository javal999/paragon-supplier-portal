/** @import React from 'react' */
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
/** @import { Contact, StepProps } from '../utils' */
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
 * contact rows, each with name, role, email, WhatsApp and phone. Rows are keyed
 * by their client-only `id`.
 * @type {React.FC<StepProps>}
 */
const ContactsStep = ({ form, setForm, errors }) => {
  const { t } = useTranslation();
  /**
   * @param {number} i
   * @param {keyof Contact} field
   * @param {string} val
   */
  const updateContact = (i, field, val) =>
    setForm((f) => ({
      ...f,
      contacts: f.contacts.map((c, idx) => (idx === i ? { ...c, [field]: val } : c))
    }));
  const addContact = () =>
    setForm((f) =>
      f.contacts.length < 3 ? { ...f, contacts: [...f.contacts, emptyContact()] } : f
    );
  /** @param {number} i */
  const removeContact = (i) =>
    setForm((f) =>
      f.contacts.length > 1 ? { ...f, contacts: f.contacts.filter((_, idx) => idx !== i) } : f
    );

  return (
    <FormSection
      eyebrow={t('registration.step.contacts.eyebrow')}
      title={t('registration.step.contacts.title')}
      description={t('registration.step.contacts.description')}
    >
      <div className="flex flex-col gap-4">
        {form.contacts.map((c, i) => (
          <div key={c.id} className="bg-bg-hover border border-border-subtle rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-text-primary">
                {t('registration.contacts.label', { index: i + 1 })}
              </span>
              {form.contacts.length > 1 && (
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
                error={errors[`c${i}name`]}
              >
                <input
                  className={inputClass}
                  value={c.name}
                  onChange={(e) => updateContact(i, 'name', e.target.value)}
                  placeholder={t('registration.step.contacts.field.name.placeholder')}
                />
              </Field>
              <Field label={t('registration.step.contacts.field.role.label')}>
                <select
                  className={inputClass}
                  value={c.role}
                  onChange={(e) => updateContact(i, 'role', e.target.value)}
                >
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
                error={errors[`c${i}email`]}
              >
                <input
                  className={inputClass}
                  value={c.email}
                  onChange={(e) => updateContact(i, 'email', e.target.value)}
                  placeholder="jane@example.com"
                />
              </Field>
              <Field
                label={t('registration.step.contacts.field.whatsapp.label')}
                required
                error={errors[`c${i}whatsapp`]}
              >
                <input
                  className={inputClass}
                  value={c.whatsapp}
                  onChange={(e) => updateContact(i, 'whatsapp', e.target.value)}
                  placeholder="+62 812 3456 7890"
                />
              </Field>
              <div className="md:col-span-2">
                <Field label={t('registration.step.contacts.field.phone.label')}>
                  <input
                    className={inputClass}
                    value={c.phone}
                    onChange={(e) => updateContact(i, 'phone', e.target.value)}
                    placeholder="+62 21 1234 5678"
                  />
                </Field>
              </div>
            </div>
          </div>
        ))}
      </div>
      {form.contacts.length < 3 && (
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
