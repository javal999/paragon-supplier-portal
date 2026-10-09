/** @import { UseFormReturn } from 'react-hook-form' */
/** @import { TFunction } from 'i18next' */

// Pure helpers for the registration wizard: the form's shape, its empty
// values, and the per-step validators. No React here.

/**
 * @typedef {object} Contact
 * @property {string} id Client-only row identity, used as the React key. Contacts can be added and
 *   removed in any position, so the array index is not stable: removing contact 1
 *   would hand contact 1's DOM nodes (focus, any uncontrolled state) to contact 2.
 *   Never shown or submitted.
 * @property {string} name
 * @property {string} role
 * @property {string} email
 * @property {string} whatsapp
 * @property {string} phone
 */

/**
 * @typedef {object} DocState
 * @property {boolean} uploaded
 * @property {string} fileName
 * @property {string} expiry
 */

// Monotonic counter: unique for the page's lifetime, so a removed contact's id is
// never reused by a later one (crypto.randomUUID needs a secure context).
let contactSeq = 0;
/**
 * A blank contact row with a fresh client-only id.
 * @returns {Contact}
 */
export const emptyContact = () => ({
  id: `contact-${++contactSeq}`,
  name: '',
  role: 'Primary Contact',
  email: '',
  whatsapp: '',
  phone: ''
});

/**
 * A document slot with nothing uploaded.
 * @returns {DocState}
 */
export const emptyDoc = () => ({
  uploaded: false,
  fileName: '',
  expiry: ''
});

/**
 * @typedef {object} FormState
 * @property {string} legalName Step 1 Company Info
 * @property {string} npwp
 * @property {string} nib
 * @property {string} country
 * @property {string} province
 * @property {string} city
 * @property {string} address
 * @property {string} website
 * @property {Contact[]} contacts Step 2 Contacts
 * @property {string[]} selCats Step 3 Categories & Channel
 * @property {string} channel
 * @property {Record<string, DocState>} docs Step 4 Docs & Bank
 * @property {string} bankName
 * @property {string} accountNumber
 * @property {string} accountHolder
 * @property {string} expansionReason Internal SR
 *
 *   ⚠️ **`s4Vendor` IS GONE, AND IT IS THE ONE FIELD OPTION C DELETES RATHER
 *   THAN KEEPS.** The wizard keeps collecting everything else, because
 *   collecting is what a walkthrough of the applicant experience is FOR. This
 *   field was different in kind: its label and placeholder taught a format
 *   (`e.g. 1000456`) for an identifier space that holds ZERO rows anywhere in
 *   this tree — so it was not showing what registration asks for, it was
 *   asserting the existence of a register. The vendor is now RESOLVED against
 *   the roster on the buyer door (`BuyerSupplierApplications`), where a real
 *   roster exists to resolve against.
 * @property {boolean} agreed1 Step 5 Agreements
 * @property {boolean} agreed2
 */

/**
 * The wizard's starting values: one blank contact, Indonesia, WhatsApp.
 * @returns {FormState}
 */
export const emptyForm = () => ({
  legalName: '',
  npwp: '',
  nib: '',
  country: 'Indonesia',
  province: '',
  city: '',
  address: '',
  website: '',
  contacts: [emptyContact()],
  selCats: [],
  channel: 'WhatsApp',
  docs: {
    npwp: emptyDoc(),
    nib: emptyDoc(),
    halal: emptyDoc(),
    iso: emptyDoc()
  },
  bankName: '',
  accountNumber: '',
  accountHolder: '',
  expansionReason: '',
  agreed1: false,
  agreed2: false
});

/**
 * Loose email shape check used by the contacts step.
 * @param {string} s
 * @returns {boolean}
 */
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/**
 * The react-hook-form handle every step reads through `useFormContext()`.
 * @typedef {UseFormReturn<FormState>} RegistrationForm
 */

/**
 * Company info: legal name, NPWP, city, address, and province when the
 * country is Indonesia.
 * @param {FormState} form
 * @param {TFunction} t
 * @returns {Record<string, string>}
 */
export const validateStep1 = (form, t) => {
  /** @type {Record<string, string>} */
  const e = {};
  if (!form.legalName.trim()) e.legalName = t('registration.validation.legalName.required');
  if (!form.npwp.trim()) e.npwp = t('registration.validation.npwp.required');
  if (!form.city.trim()) e.city = t('registration.validation.city.required');
  if (!form.address.trim()) e.address = t('registration.validation.address.required');
  if (form.country === 'Indonesia' && !form.province)
    e.province = t('registration.validation.province.required');
  return e;
};

/**
 * Contacts: every row needs a name, a valid email and a WhatsApp number.
 * Keys are the field paths, `contacts.{index}.{field}`.
 * @param {FormState} form
 * @param {TFunction} t
 * @returns {Record<string, string>}
 */
export const validateStep2 = (form, t) => {
  /** @type {Record<string, string>} */
  const e = {};
  form.contacts.forEach((c, i) => {
    if (!c.name.trim()) e[`contacts.${i}.name`] = t('registration.validation.name.required');
    if (!c.email.trim()) e[`contacts.${i}.email`] = t('registration.validation.email.required');
    else if (!isEmail(c.email))
      e[`contacts.${i}.email`] = t('registration.validation.email.invalid');
    if (!c.whatsapp.trim())
      e[`contacts.${i}.whatsapp`] = t('registration.validation.whatsapp.required');
  });
  return e;
};

/**
 * Bank: bank name, account number and account holder.
 * @param {FormState} form
 * @param {TFunction} t
 * @returns {Record<string, string>}
 */
export const validateBankStep = (form, t) => {
  /** @type {Record<string, string>} */
  const e = {};
  if (!form.bankName) e.bankName = t('registration.validation.bankName.required');
  if (!form.accountNumber.trim())
    e.accountNumber = t('registration.validation.accountNumber.required');
  if (!form.accountHolder.trim())
    e.accountHolder = t('registration.validation.accountHolder.required');
  return e;
};

/**
 * Agreements: both boxes ticked.
 * @param {FormState} form
 * @param {TFunction} t
 * @returns {Record<string, string>}
 */
export const validateAgreements = (form, t) => {
  /** @type {Record<string, string>} */
  const e = {};
  if (!form.agreed1) e.agreed1 = t('registration.validation.agreed1.required');
  if (!form.agreed2) e.agreed2 = t('registration.validation.agreed2.required');
  return e;
};
