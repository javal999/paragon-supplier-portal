/** @import React from 'react' */
/** @import { CountryProfile } from '@context/AdaptiveContext' */
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
import StatusPill from '@components/ui-v2/StatusPill';
import Button from '@components/ui-v2/Button';
import { useToast } from '@hooks/useToast';
import { inputClass, labelClass } from '../const';

/**
 * @typedef {object} BusinessHoursSectionProps
 * @property {CountryProfile} cp  The supplier's country profile (timezone shown here).
 * @property {boolean} bizHours  Whether the supplier is inside business hours now.
 * @property {string} localTime  The supplier's local time, for the open/closed pill.
 * @property {string} bizHoursStart  Start time input value (page state).
 * @property {(v: string) => void} setBizHoursStart
 * @property {string} bizHoursEnd  End time input value (page state).
 * @property {(v: string) => void} setBizHoursEnd
 */

/**
 * Step 5, business hours: a Save button (a toast only), the start/end time
 * inputs, the timezone and the current open/closed status. Moved out of
 * `SupplierMyStorefront.jsx` by the Phase 5 page split (no behaviour change);
 * the hours state stays in the page.
 * @type {React.FC<BusinessHoursSectionProps>}
 */
const BusinessHoursSection = ({
  cp,
  bizHours,
  localTime,
  bizHoursStart,
  setBizHoursStart,
  bizHoursEnd,
  setBizHoursEnd
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  return (
    <FormSection
      eyebrow={t('supplierMyStorefront.step', { n: 5 })}
      title={t('supplierMyStorefront.step5.title')}
      description={t('supplierMyStorefront.step5.description')}
    >
      <div className="flex justify-end mb-3">
        <Button
          variant="outline"
          onClick={() =>
            toast({
              variant: 'success',
              title: t('supplierMyStorefront.toast.hoursUpdated')
            })
          }
        >
          {t('supplierMyStorefront.action.save')}
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-5">
        <div>
          <label className={labelClass}>{t('supplierMyStorefront.field.businessHours')}</label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              aria-label={t('supplierMyStorefront.field.businessHoursStart')}
              className={inputClass}
              style={{ width: 120 }}
              value={bizHoursStart}
              onChange={(e) => setBizHoursStart(e.target.value)}
            />
            <span className="text-text-tertiary">{t('supplierMyStorefront.field.to')}</span>
            <input
              type="time"
              aria-label={t('supplierMyStorefront.field.businessHoursEnd')}
              className={inputClass}
              style={{ width: 120 }}
              value={bizHoursEnd}
              onChange={(e) => setBizHoursEnd(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>{t('supplierMyStorefront.field.timezone')}</label>
          <div className="px-3 py-2 bg-bg-hover border border-border-subtle rounded-md text-sm text-text-primary">
            {cp.timezone}
          </div>
        </div>
        <div>
          <div className={labelClass}>{t('supplierMyStorefront.field.currentStatus')}</div>
          <StatusPill variant={bizHours ? 'success' : 'neutral'}>
            {bizHours
              ? t('supplierMyStorefront.status.open', { time: localTime })
              : t('supplierMyStorefront.status.closed', { time: localTime })}
          </StatusPill>
        </div>
      </div>
    </FormSection>
  );
};

export default BusinessHoursSection;
