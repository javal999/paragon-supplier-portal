/** @import React from 'react' */
/** @import { LucideIcon } from 'lucide-react' */
import { MessageCircle, Globe, Send, Radio } from 'lucide-react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
/** @import { RegistrationForm } from '../utils' */
import { errorClass } from '../const';
import { useSelectedCategories } from '../hooks/useSelectedCategories';

/**
 * @typedef {object} CategoryOption
 * @property {string} value
 * @property {string} key
 */

/** @type {CategoryOption[]} */
export const SUPPLY_CATEGORIES = [
  { value: 'Raw Materials', key: 'registration.category.rawMaterials' },
  { value: 'Electronics', key: 'registration.category.electronics' },
  { value: 'Mechanical Components', key: 'registration.category.mechanicalComponents' },
  { value: 'Packaging', key: 'registration.category.packaging' },
  { value: 'Chemicals', key: 'registration.category.chemicals' },
  { value: 'Logistics & Transport', key: 'registration.category.logistics' },
  { value: 'IT Services', key: 'registration.category.itServices' },
  { value: 'MRO Supplies', key: 'registration.category.mroSupplies' },
  { value: 'Food & Beverage', key: 'registration.category.foodBeverage' },
  { value: 'Textiles', key: 'registration.category.textiles' }
];

/**
 * @typedef {object} ChannelOption
 * @property {string} value
 * @property {LucideIcon} Icon
 * @property {string} labelKey
 * @property {string} descKey
 */

/** @type {ChannelOption[]} */
export const CHANNELS = [
  {
    value: 'WhatsApp',
    Icon: MessageCircle,
    labelKey: 'registration.channel.whatsapp.label',
    descKey: 'registration.channel.whatsapp.desc'
  },
  {
    value: 'Web Portal',
    Icon: Globe,
    labelKey: 'registration.channel.web.label',
    descKey: 'registration.channel.web.desc'
  },
  {
    value: 'API',
    Icon: Send,
    labelKey: 'registration.channel.api.label',
    descKey: 'registration.channel.api.desc'
  },
  {
    value: 'EDI',
    Icon: Radio,
    labelKey: 'registration.channel.edi.label',
    descKey: 'registration.channel.edi.desc'
  }
];

// Value → i18n-key lookups for the multi-select fields, so the stored form
// value stays the canonical English literal (logic) while display localizes.
/**
 * The i18n key that labels a stored supply category.
 * @param {string} value
 * @returns {string}
 */
export const catKey = (value) => SUPPLY_CATEGORIES.find((c) => c.value === value)?.key ?? '';
/**
 * The i18n key that labels a stored channel.
 * @param {string} value
 * @returns {string}
 */
export const channelLabelKey = (value) => CHANNELS.find((c) => c.value === value)?.labelKey ?? '';

/**
 * Step "Categories & channel" (External SR step 3): the supply-category
 * checkboxes (at least one is required; the error on `selCats` says so) and
 * the preferred communication channel radio group. Reads and writes the form
 * through `useFormContext()`.
 * @type {React.FC}
 */
const CategoriesStep = () => {
  const { t } = useTranslation();
  const { setValue, control } = /** @type {RegistrationForm} */ (useFormContext());
  const { selCats, toggleCat, error: catError } = useSelectedCategories();
  const channel = useWatch({ control, name: 'channel' });

  return (
    <div className="flex flex-col gap-5">
      <FormSection
        eyebrow={t('registration.step.categories.eyebrow')}
        title={t('registration.step.categories.title')}
        description={t('registration.step.categories.description')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SUPPLY_CATEGORIES.map((cat) => {
            const checked = selCats.includes(cat.value);
            return (
              <label
                key={cat.value}
                className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer border-2 text-sm transition-colors ${
                  checked
                    ? 'border-action bg-action-soft text-text-primary font-semibold'
                    : 'border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCat(cat.value)}
                  className="accent-action"
                />
                {t(cat.key)}
              </label>
            );
          })}
        </div>
        {catError && <div className={`${errorClass} mt-2`}>{catError}</div>}
      </FormSection>

      <FormSection
        eyebrow={t('registration.step.channel.eyebrow')}
        title={t('registration.step.channel.title')}
        description={t('registration.step.channel.description')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CHANNELS.map((ch) => {
            const active = channel === ch.value;
            const Icon = ch.Icon;
            return (
              <label
                key={ch.value}
                className={`flex items-center gap-3 px-4 py-3 rounded-md cursor-pointer border-2 transition-colors ${
                  active
                    ? 'border-action bg-action-soft'
                    : 'border-border-subtle bg-bg-surface hover:bg-bg-hover'
                }`}
              >
                <input
                  type="radio"
                  name="channel"
                  checked={active}
                  onChange={() => setValue('channel', ch.value)}
                  className="accent-action"
                />
                <Icon size={18} className={active ? 'text-action' : 'text-text-tertiary'} />
                <div className="min-w-0">
                  <div
                    className={`text-sm font-bold ${active ? 'text-action' : 'text-text-primary'}`}
                  >
                    {t(ch.labelKey)}
                  </div>
                  <div className="text-xs text-text-tertiary">{t(ch.descKey)}</div>
                </div>
              </label>
            );
          })}
        </div>
      </FormSection>
    </div>
  );
};

export default CategoriesStep;
