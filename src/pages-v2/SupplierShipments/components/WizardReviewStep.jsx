/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
/** @import { CallOffWarning, PurchaseOrder } from '@services/data/types' */
/** @import { AsnLinesRead } from '../../shipments/asnLines' */
/** @import { AsnForm } from '../const' */
import { AsnSubmitWarnings } from '../../shipments/CallOffWarnings';
import { ShelfLifeRequestBox } from '../../shipments/ShelfLifeParts';
import { fmtDate } from '../utils';
import { qty } from '../../callOffs/callOffDisplay';

/**
 * Wizard step 3 — the summary of what will be sent, the warnings (never a
 * block), the shelf-life exception request when shelf life is the one thing
 * wrong, and the confirmation tick.
 * @type {React.FC<{ form: AsnForm; updateForm: (patch: Partial<AsnForm>) => void; selectedPO: PurchaseOrder | undefined; wizardRead: AsnLinesRead; wizardWarnings: CallOffWarning[] }>}
 */
const WizardReviewStep = ({ form, updateForm, selectedPO, wizardRead, wizardWarnings }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-5">
      <FormSection
        eyebrow={t('supplierShipments.wizard.review.summary.eyebrow')}
        title={t('supplierShipments.wizard.review.summary.title')}
        description={t('supplierShipments.wizard.review.summary.desc')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            [t('supplierShipments.wizard.review.field.poNumber'), selectedPO?.poNumber ?? '—'],
            ...wizardRead.lines.map((l) => [
              `${t('supplierShipments.wizard.review.field.material')} · ${l.line.materialCode}`,
              `${l.line.description} · ${
                Number.isFinite(l.input.shippedQty) ? qty(l.input.shippedQty) : '—'
              } ${l.line.uom} · ${t('fc.asn.col.batch')} ${l.input.batchNumber || '—'}${
                l.input.batchSource === 'typed' ? ` (${t('fc.asn.batch.notDeclared')})` : ''
              }${
                l.input.expiryDate
                  ? ` · ${t('fc.asn.col.expiryShort')} ${fmtDate(l.input.expiryDate)}`
                  : ''
              }`
            ]),
            [t('supplierShipments.wizard.review.field.carrier'), form.carrier],
            [t('fc.asn.trackingOrVehicle'), form.trackingNumber || '—'],
            [t('supplierShipments.wizard.review.field.shipDate'), fmtDate(form.shipDate)],
            [t('supplierShipments.wizard.review.field.eta'), form.eta ? fmtDate(form.eta) : '—'],
            // AIB-1 BR-03 / BR-04 (BL-348) — the inbound-upload identity.
            [t('fc.asn.sequence'), form.sequence.trim() || '—'],
            [t('fc.asn.externalId'), form.externalId.trim() || '—'],
            [t('supplierShipments.wizard.review.field.packages'), form.packages || '—'],
            [t('fc.asn.packingList'), form.packingList || '—'],
            ...(form.overShipReason.trim()
              ? [[t('fc.asn.detail.overShipReason'), form.overShipReason.trim()]]
              : [])
          ].map(([k, v]) => (
            <div key={k} className="bg-bg-hover rounded-md px-3 py-2">
              <div className="text-label text-text-tertiary uppercase mb-0.5">{k}</div>
              <div className="text-sm font-semibold text-text-primary">{v}</div>
            </div>
          ))}
        </div>
      </FormSection>

      {/* MR-6 BR-03, BR-10, BR-11 — warnings, never a block. */}
      <AsnSubmitWarnings
        aboveAvailable={wizardRead.aboveAvailable}
        callOffWarnings={wizardWarnings}
        testId="asn-wizard-warnings"
      />

      {wizardRead.onlyShelfLife ? (
        <ShelfLifeRequestBox
          reason={form.exceptionReason}
          onReasonChange={(v) => updateForm({ exceptionReason: v })}
        />
      ) : null}

      <label className="flex items-start gap-3 px-4 py-3 bg-teal-soft border border-teal/30 rounded-md cursor-pointer text-sm text-text-primary">
        <input
          type="checkbox"
          checked={form.confirmed}
          onChange={(e) => updateForm({ confirmed: e.target.checked })}
          className="mt-0.5 accent-teal"
        />
        {t('supplierShipments.wizard.review.confirm')}
      </label>
    </div>
  );
};

export default WizardReviewStep;
