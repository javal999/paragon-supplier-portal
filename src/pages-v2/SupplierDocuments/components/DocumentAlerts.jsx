/** @import React from 'react' */
/** @import { SupplierDocument } from '@services/data/types' */
import { AlertTriangle, Clock, UploadCloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * @typedef {object} DocumentAlertsProps
 * @property {SupplierDocument[]} refused  Documents whose STORED status is `Rejected`.
 * @property {SupplierDocument[]} expired  Documents the expiry projection reads as expired.
 * @property {SupplierDocument[]} expiringSoon  Documents the projection reads as expiring.
 * @property {SupplierDocument[]} awaitingUpload  Documents whose STORED status is `Awaiting Upload`.
 */

/**
 * The four alert banners above the KPI tiles, in order: refused, expired,
 * expiring and awaiting upload. Each renders only when its list is non-empty
 * and names the documents it counts. Moved out of `SupplierDocuments.jsx` by
 * the Phase 5 page split (no behaviour change).
 * @type {React.FC<DocumentAlertsProps>}
 */
const DocumentAlerts = ({ refused, expired, expiringSoon, awaitingUpload }) => {
  const { t } = useTranslation();
  return (
    <>
      {refused.length > 0 && (
        <div
          className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 mb-3 text-sm text-danger flex items-start gap-2"
          data-testid="doc-refused-banner"
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>
              {refused.length === 1
                ? t('supplierDocuments.alert.refused.one', { count: refused.length })
                : t('supplierDocuments.alert.refused.other', { count: refused.length })}{' '}
            </strong>
            {/* i18n-defer: mock/sample data (fixture document names) */}
            {refused.map((d) => d.name.split('—')[0].trim()).join(' · ')}
          </div>
        </div>
      )}
      {expired.length > 0 && (
        <div className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 mb-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>
              {expired.length === 1
                ? t('supplierDocuments.alert.expired.one', { count: expired.length })
                : t('supplierDocuments.alert.expired.other', { count: expired.length })}{' '}
            </strong>
            {/* i18n-defer: mock/sample data (fixture document names) */}
            {expired.map((d) => d.name.split('—')[0].trim()).join(' · ')}
          </div>
        </div>
      )}
      {expiringSoon.length > 0 && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-3 text-sm text-warning-hover flex items-start gap-2">
          <Clock size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>
              {expiringSoon.length === 1
                ? t('supplierDocuments.alert.expiring.one', { count: expiringSoon.length })
                : t('supplierDocuments.alert.expiring.other', { count: expiringSoon.length })}{' '}
            </strong>
            {/* i18n-defer: mock/sample data (fixture document names) */}
            {expiringSoon.map((d) => d.name.split('—')[0].trim()).join(' · ')}
          </div>
        </div>
      )}
      {awaitingUpload.length > 0 && (
        <div className="bg-bg-hover border-l-2 border-border-input rounded px-4 py-3 mb-6 text-sm text-text-secondary flex items-start gap-2">
          <UploadCloud size={14} className="shrink-0 mt-0.5 text-text-tertiary" />
          <div>
            <strong className="text-text-primary">
              {awaitingUpload.length === 1
                ? t('supplierDocuments.alert.awaiting.one', { count: awaitingUpload.length })
                : t('supplierDocuments.alert.awaiting.other', {
                    count: awaitingUpload.length
                  })}{' '}
            </strong>
            {/* i18n-defer: mock/sample data (fixture linked-to refs) */}
            {awaitingUpload.map((d) => d.linkedTo).join(' · ')}
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentAlerts;
