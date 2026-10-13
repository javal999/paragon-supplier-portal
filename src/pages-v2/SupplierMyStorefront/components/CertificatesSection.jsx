/** @import React from 'react' */
/** @import { ProfileCert } from '@services/data/types' */
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Upload } from 'lucide-react';
import FormSection from '@components/ui-v2/FormSection';
import StatusPill from '@components/ui-v2/StatusPill';
import Button from '@components/ui-v2/Button';
import Switch from '@components/ui-v2/Switch';
import Data from '@components/ui-v2/Data';
import { useToast } from '@hooks/useToast';
import { CERT_LABEL, CERT_VARIANT } from '../const';

/**
 * @typedef {object} CertificatesSectionProps
 * @property {ProfileCert[]} certs  The session's certificates (page state).
 * @property {(idx: number) => void} toggleCertVisibility  Page handler for a cert's switch.
 */

/**
 * Step 3, certificates: the "Upload new" button (a toast only) and one card
 * per certificate with its status, expiry, shown/hidden label and visibility
 * switch. Moved out of `SupplierMyStorefront.jsx` by the Phase 5 page split
 * (no behaviour change); the certs state stays in the page.
 * @type {React.FC<CertificatesSectionProps>}
 */
const CertificatesSection = ({ certs, toggleCertVisibility }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  return (
    <FormSection
      eyebrow={t('supplierMyStorefront.step', { n: 3 })}
      title={t('supplierMyStorefront.step3.title')}
      description={t('supplierMyStorefront.step3.description')}
    >
      <div className="flex justify-end mb-3">
        <Button
          variant="outline"
          icon={Upload}
          onClick={() => toast({ title: t('supplierMyStorefront.toast.fileBrowser') })}
        >
          {t('supplierMyStorefront.action.uploadNew')}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {certs.map((cert, i) => (
          <div
            key={cert.name}
            className="flex items-center gap-3 px-4 py-3 bg-bg-hover border border-border-subtle rounded-md"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-text-primary mb-1">{cert.name}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusPill variant={CERT_VARIANT[cert.status]}>
                  {CERT_LABEL[cert.status]}
                </StatusPill>
                {cert.expiry && (
                  <span className="text-xs text-text-tertiary">
                    {t('supplierMyStorefront.cert.expPrefix')} <Data>{cert.expiry}</Data>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  cert.visible ? 'text-teal-hover' : 'text-text-tertiary'
                }`}
              >
                {cert.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                {cert.visible
                  ? t('supplierMyStorefront.cert.shown')
                  : t('supplierMyStorefront.cert.hidden')}
              </span>
              <Switch
                checked={cert.visible}
                onChange={() => toggleCertVisibility(i)}
                ariaLabel={t('supplierMyStorefront.aria.toggleVisibility', {
                  name: cert.name
                })}
              />
            </div>
          </div>
        ))}
      </div>
    </FormSection>
  );
};

export default CertificatesSection;
