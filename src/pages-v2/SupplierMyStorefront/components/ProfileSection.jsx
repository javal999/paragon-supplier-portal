/** @import React from 'react' */
/** @import { Supplier } from '@services/data/types' */
/** @import { CountryProfile } from '@context/AdaptiveContext' */
import { useTranslation } from 'react-i18next';
import { Edit3 } from 'lucide-react';
import FormSection from '@components/ui-v2/FormSection';
import Button from '@components/ui-v2/Button';
import { useToast } from '@hooks/useToast';
import { useCategoryLabel } from '@hooks/useCategoryLabel';
import { inputClass, labelClass } from '../const';

/**
 * @typedef {object} ProfileSectionProps
 * @property {Supplier} supp  The current supplier (legal name, category, founded, …).
 * @property {CountryProfile} cp  The supplier's country profile (flag + name shown here).
 * @property {boolean} editProfile  Whether the description editor is open (page state).
 * @property {(v: boolean) => void} setEditProfile
 * @property {string} description  The company description (page state).
 * @property {(v: string) => void} setDescription
 */

/**
 * Step 1, company profile: an Edit/Cancel toggle, then either the description
 * editor with Save/Cancel or the read-only profile facts and description.
 * Moved out of `SupplierMyStorefront.jsx` by the Phase 5 page split (no
 * behaviour change); the edit state stays in the page.
 * @type {React.FC<ProfileSectionProps>}
 */
const ProfileSection = ({ supp, cp, editProfile, setEditProfile, description, setDescription }) => {
  const { t } = useTranslation();
  const cl = useCategoryLabel();
  const { toast } = useToast();
  return (
    <FormSection
      eyebrow={t('supplierMyStorefront.step', { n: 1 })}
      title={t('supplierMyStorefront.step1.title')}
      description={t('supplierMyStorefront.step1.description')}
    >
      <div className="flex justify-end mb-3">
        <Button variant="secondary" icon={Edit3} onClick={() => setEditProfile(!editProfile)}>
          {editProfile
            ? t('supplierMyStorefront.action.cancel')
            : t('supplierMyStorefront.action.edit')}
        </Button>
      </div>
      {editProfile ? (
        <div>
          <div className="mb-3">
            <label className="block">
              <span className={labelClass}>
                {t('supplierMyStorefront.field.companyDescription')}
              </span>
              <textarea
                className={`${inputClass} min-h-[96px] resize-y`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditProfile(false);
                toast({
                  variant: 'success',
                  title: t('supplierMyStorefront.toast.profileUpdated')
                });
              }}
            >
              {t('supplierMyStorefront.action.save')}
            </Button>
            <Button variant="secondary" onClick={() => setEditProfile(false)}>
              {t('supplierMyStorefront.action.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              label: t('supplierMyStorefront.field.legalName'),
              value: supp.legalName ?? supp.name
            },
            { label: t('supplierMyStorefront.field.country'), value: `${cp.flag} ${cp.name}` },
            // Category token → localized display via cl(); stored value stays canonical EN.
            { label: t('supplierMyStorefront.field.category'), value: cl(supp.category) },
            {
              label: t('supplierMyStorefront.field.established'),
              value: supp.founded ? `${supp.founded}` : '—'
            },
            { label: t('supplierMyStorefront.field.employees'), value: supp.employees ?? '—' },
            { label: t('supplierMyStorefront.field.revenue'), value: supp.annualRevenue ?? '—' }
          ].map((r) => (
            <div key={r.label} className="px-3 py-2 bg-bg-hover rounded-md">
              <div className="text-label text-text-tertiary uppercase mb-0.5">{r.label}</div>
              <div className="text-sm font-medium text-text-primary">{r.value}</div>
            </div>
          ))}
          <div className="md:col-span-2 px-3 py-2 bg-bg-hover rounded-md">
            <div className="text-label text-text-tertiary uppercase mb-0.5">
              {t('supplierMyStorefront.field.description')}
            </div>
            <div className="text-sm text-text-secondary leading-relaxed">{description}</div>
          </div>
        </div>
      )}
    </FormSection>
  );
};

export default ProfileSection;
