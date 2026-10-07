/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
/** @import { StepProps } from '../utils' */
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
 * country clears the province.
 * @type {React.FC<StepProps>}
 */
const CompanyInfoStep = ({ form, setForm, errors }) => {
  const { t } = useTranslation();
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
            error={errors.legalName}
          >
            <input
              className={inputClass}
              value={form.legalName}
              onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
              placeholder={t('registration.step.company.field.legalName.placeholder')}
            />
          </Field>
        </div>
        <Field label={t('registration.step.company.field.npwp.label')} required error={errors.npwp}>
          <input
            className={inputClass}
            value={form.npwp}
            onChange={(e) => setForm((f) => ({ ...f, npwp: e.target.value }))}
            placeholder="00.000.000.0-000.000"
          />
        </Field>
        <Field label={t('registration.step.company.field.nib.label')}>
          <input
            className={inputClass}
            value={form.nib}
            onChange={(e) => setForm((f) => ({ ...f, nib: e.target.value }))}
            placeholder="1234567890123"
          />
        </Field>
        <Field label={t('registration.step.company.field.country.label')} required>
          <select
            className={inputClass}
            value={form.country}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value, province: '' }))}
          >
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>
                {t(c.key)}
              </option>
            ))}
          </select>
        </Field>
        {form.country === 'Indonesia' && (
          <Field
            label={t('registration.step.company.field.province.label')}
            required
            error={errors.province}
          >
            <select
              className={inputClass}
              value={form.province}
              onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
            >
              <option value="">{t('registration.step.company.field.province.placeholder')}</option>
              {INDONESIAN_PROVINCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label={t('registration.step.company.field.city.label')} required error={errors.city}>
          <input
            className={inputClass}
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder={t('registration.step.company.field.city.placeholder')}
          />
        </Field>
        <div className="md:col-span-2">
          <Field
            label={t('registration.step.company.field.address.label')}
            required
            error={errors.address}
          >
            <textarea
              className={`${inputClass} min-h-[80px] resize-y`}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder={t('registration.step.company.field.address.placeholder')}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label={t('registration.step.company.field.website.label')}>
            <input
              className={inputClass}
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              placeholder="https://www.example.com"
            />
          </Field>
        </div>
      </div>
    </FormSection>
  );
};

export default CompanyInfoStep;
