/** @import React from 'react' */
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
/** @import { RegistrationForm } from '../utils' */
import { inputClass } from '../const';
import Field from './Field';

const INDONESIAN_PROVINCES = [
  'Aceh',
  'Bali',
  'Banten',
  'Bengkulu',
  'DI Yogyakarta',
  'DKI Jakarta',
  'Gorontalo',
  'Jambi',
  'Jawa Barat',
  'Jawa Tengah',
  'Jawa Timur',
  'Kalimantan Barat',
  'Kalimantan Selatan',
  'Kalimantan Tengah',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Kepulauan Bangka Belitung',
  'Kepulauan Riau',
  'Lampung',
  'Maluku',
  'Maluku Utara',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Papua',
  'Papua Barat',
  'Riau',
  'Sulawesi Barat',
  'Sulawesi Selatan',
  'Sulawesi Tengah',
  'Sulawesi Tenggara',
  'Sulawesi Utara',
  'Sumatera Barat',
  'Sumatera Selatan',
  'Sumatera Utara'
];

// ⚠️ **THE `value` IS LOGIC, THE `key` IS DISPLAY.** The value stays the
// canonical English literal — it is what `form.country` carries into the review
// step and into whatever write path eventually lands — and only the label
// resolves. Same contract as `RoleOption` / `CategoryOption` above and as `BANKS`
// below; no fourth shape is introduced here.
//
// ⚠️ **AND THE OBVIOUS ARGUMENT FOR THE SPLIT IS FALSE HERE — SAID PLAINLY,
// BECAUSE IT IS THE ONE A LATER READER WILL RE-DERIVE AND DISBELIEVE.** It is
// tempting to write that a localized value would ungate the province field, since
// `form.country === 'Indonesia'` (below, and again in `validateStep1`) decides
// whether province renders and whether it is required. It would NOT: `Indonesia`
// is spelled identically in both arms, so that comparison survives the mistake.
// **The gate is correct today by coincidence of spelling, not by construction.**
// `Singapore` → `Singapura` and `Philippines` → `Filipina` are the tokens where
// the split is actually observable, which is why the guard probes THOSE and not
// the gated one — a probe aimed at `Indonesia` passes whether or not the split
// exists, which is a test that proves nothing while looking like it proves the
// most important thing.
//
// `Other` reuses the shared `registration.option.other` key rather than minting a
// seventh: it is the same word in the same list, and a second key for it would be
// two homes for one string.
/**
 * @typedef {object} CountryOption
 * @property {string} value
 * @property {string} key
 */

/** @type {CountryOption[]} */
const COUNTRIES = [
  { value: 'Indonesia', key: 'registration.country.indonesia' },
  { value: 'Malaysia', key: 'registration.country.malaysia' },
  { value: 'Singapore', key: 'registration.country.singapore' },
  { value: 'Thailand', key: 'registration.country.thailand' },
  { value: 'Vietnam', key: 'registration.country.vietnam' },
  { value: 'Philippines', key: 'registration.country.philippines' },
  { value: 'Other', key: 'registration.option.other' }
];

/**
 * Step "Company info" (External SR step 1, KOL step 1): legal name, NPWP, NIB,
 * country, province (Indonesia only), city, address, website. Changing the
 * country clears the province. Reads and writes the form through
 * `useFormContext()`.
 * @type {React.FC}
 */
const CompanyInfoStep = () => {
  const { t } = useTranslation();
  const {
    register,
    setValue,
    control,
    formState: { errors }
  } = /** @type {RegistrationForm} */ (useFormContext());
  const country = useWatch({ control, name: 'country' });
  return (
    <FormSection
      eyebrow={t('registration.step.company.eyebrow')}
      title={t('registration.step.company.title')}
      description={t('registration.step.company.description')}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field
            label={t('registration.step.company.field.legalName.label')}
            required
            error={errors.legalName?.message}
          >
            <input
              className={inputClass}
              {...register('legalName')}
              placeholder={t('registration.step.company.field.legalName.placeholder')}
            />
          </Field>
        </div>
        <Field
          label={t('registration.step.company.field.npwp.label')}
          required
          error={errors.npwp?.message}
        >
          <input className={inputClass} {...register('npwp')} placeholder="00.000.000.0-000.000" />
        </Field>
        <Field label={t('registration.step.company.field.nib.label')}>
          <input className={inputClass} {...register('nib')} placeholder="1234567890123" />
        </Field>
        <Field label={t('registration.step.company.field.country.label')} required>
          <select
            className={inputClass}
            {...register('country', { onChange: () => setValue('province', '') })}
          >
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>
                {t(c.key)}
              </option>
            ))}
          </select>
        </Field>
        {country === 'Indonesia' && (
          <Field
            label={t('registration.step.company.field.province.label')}
            required
            error={errors.province?.message}
          >
            <select className={inputClass} {...register('province')}>
              <option value="">{t('registration.step.company.field.province.placeholder')}</option>
              {INDONESIAN_PROVINCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
        )}
        <Field
          label={t('registration.step.company.field.city.label')}
          required
          error={errors.city?.message}
        >
          <input
            className={inputClass}
            {...register('city')}
            placeholder={t('registration.step.company.field.city.placeholder')}
          />
        </Field>
        <div className="md:col-span-2">
          <Field
            label={t('registration.step.company.field.address.label')}
            required
            error={errors.address?.message}
          >
            <textarea
              className={`${inputClass} min-h-[80px] resize-y`}
              {...register('address')}
              placeholder={t('registration.step.company.field.address.placeholder')}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label={t('registration.step.company.field.website.label')}>
            <input
              className={inputClass}
              {...register('website')}
              placeholder="https://www.example.com"
            />
          </Field>
        </div>
      </div>
    </FormSection>
  );
};

export default CompanyInfoStep;
