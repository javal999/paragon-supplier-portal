/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
/** @import { ASN } from '@services/data/types' */
import { callOffWarningText } from '../../shipments/CallOffWarnings';
import { fmtDate } from '../utils';
import { qty } from '../../callOffs/callOffDisplay';

/**
 * The expanded ASN's shipment-details card: origin, warehouse, cartons,
 * weight, temperature, ship date, packing list, any over-ship reason, and the
 * call-off warnings recorded at submit.
 * @type {React.FC<{ asn: ASN }>}
 */
const AsnDetailFacts = ({ asn }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md p-4">
      <div className="text-label text-text-tertiary uppercase mb-3">
        {t('supplierShipments.detail.heading')}
      </div>
      <dl className="grid grid-cols-[160px_1fr] gap-y-1.5 text-xs">
        <dt className="text-text-tertiary">{t('supplierShipments.detail.origin')}</dt>
        {/* i18n-defer: mock/sample data (origin city) */}
        <dd className="text-text-primary">{asn.details.originCity}</dd>
        <dt className="text-text-tertiary">{t('supplierShipments.detail.destinationWarehouse')}</dt>
        {/* i18n-defer: mock/sample data (warehouse name) */}
        <dd className="text-text-primary">{asn.details.destinationWarehouse}</dd>
        <dt className="text-text-tertiary">{t('supplierShipments.detail.totalCartons')}</dt>
        <dd className="text-text-primary">
          <Data>{asn.details.totalCartons ? qty(asn.details.totalCartons) : '—'}</Data>
        </dd>
        <dt className="text-text-tertiary">{t('supplierShipments.detail.grossWeight')}</dt>
        <dd className="text-text-primary">
          <Data>{asn.details.grossWeightKg ? `${qty(asn.details.grossWeightKg)} kg` : '—'}</Data>
        </dd>
        <dt className="text-text-tertiary">{t('supplierShipments.detail.temperature')}</dt>
        {/* i18n-defer: mock/sample data (temperature requirement) */}
        <dd className="text-text-primary">{asn.details.temperatureRequirement}</dd>
        <dt className="text-text-tertiary">{t('fc.asn.detail.shipDate')}</dt>
        <dd className="text-text-primary">
          <Data>{asn.shipDate ? fmtDate(asn.shipDate) : t('fc.asn.detail.none')}</Data>
        </dd>
        <dt className="text-text-tertiary">{t('fc.asn.detail.packingList')}</dt>
        <dd className="text-text-primary">{asn.packingListFile ?? t('fc.asn.detail.none')}</dd>
        {asn.overShipReason && (
          <>
            <dt className="text-text-tertiary">{t('fc.asn.detail.overShipReason')}</dt>
            <dd className="text-text-primary">{asn.overShipReason}</dd>
          </>
        )}
        {/* MR-6 BR-12 — the warnings shown at submit, as recorded. */}
        {asn.callOffWarnings && asn.callOffWarnings.length > 0 ? (
          <>
            <dt className="text-text-tertiary">{t('co.asn.warn.recorded')}</dt>
            <dd
              className="text-warning-hover"
              data-testid={`asn-recorded-warnings-${asn.asnNumber}`}
            >
              {asn.callOffWarnings.map((w) => callOffWarningText(t, w)).join(' · ')}
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  );
};

export default AsnDetailFacts;
