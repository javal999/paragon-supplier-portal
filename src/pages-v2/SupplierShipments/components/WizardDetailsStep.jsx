/** @import React from 'react' */
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
/** @import { AvailableBatch } from '@services/transitions/fulfilmentRules' */
/** @import { AsnLinesRead, LineEntry, OpenLine } from '../../shipments/asnLines' */
/** @import { CallOff } from '@services/data/types' */
/** @import { AsnForm } from '../const' */
import CarrierPicker from '../../shipments/CarrierPicker';
import { inputClass, labelClass } from '../const';
import { missingInboundRefs, missingLogistics } from '../utils';
import AsnLinesEditor from './AsnLinesEditor';

/**
 * Wizard step 2 — logistics (carrier, tracking, ship date, ETA), the shipped
 * lines through the shared line editor, packaging, and documents and notes.
 * @type {React.FC<{ form: AsnForm; updateForm: (patch: Partial<AsnForm>) => void; onLineChange: (materialCode: string, patch: Partial<LineEntry>) => void; wizardOpenLines: readonly OpenLine[]; wizardRead: AsnLinesRead; declaredBatches: Readonly<Record<string, readonly AvailableBatch[]>>; callOff?: Pick<CallOff, 'materialCode' | 'quantity'> }>}
 */
const WizardDetailsStep = ({
  form,
  updateForm,
  onLineChange,
  wizardOpenLines,
  wizardRead,
  declaredBatches,
  callOff
}) => {
  const { t } = useTranslation();
  const missing = missingLogistics(form);
  const missingRefs = missingInboundRefs(form);
  /** A field's own label, without the required marker. @type {Record<string, () => string>} */
  const FIELD_LABEL = {
    carrier: () => t('supplierShipments.wizard.details.field.carrier').replace(/\s*\*$/, ''),
    tracking: () => t('fc.asn.trackingOrVehicle'),
    shipDate: () => t('supplierShipments.wizard.details.field.shipDate').replace(/\s*\*$/, ''),
    eta: () => t('supplierShipments.wizard.details.field.eta').replace(/\s*\*$/, '')
  };
  return (
    <div className="flex flex-col gap-5">
      <FormSection
        eyebrow={t('supplierShipments.wizard.details.logistics.eyebrow')}
        title={t('supplierShipments.wizard.details.logistics.title')}
        description={t('supplierShipments.wizard.details.logistics.desc')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* BL-51 — the 3PL from the administrator's list, or a carrier by name. */}
          <CarrierPicker
            idPrefix="asn-wizard"
            label={t('supplierShipments.wizard.details.field.carrier')}
            labelClass={labelClass}
            inputClass={inputClass}
            value={{ threePlId: form.threePlId, carrier: form.carrier }}
            onChange={(v) => updateForm(v)}
          />
          <div>
            {/* BL-303 (UL-05) — required by the step rule, so marked like Carrier. */}
            <label className={`${labelClass} after:content-['_*']`} htmlFor="asn-wizard-tracking">
              {t('fc.asn.trackingOrVehicle')}
            </label>
            <input
              id="asn-wizard-tracking"
              aria-required="true"
              type="text"
              placeholder={t('supplierShipments.placeholder.tracking')}
              value={form.trackingNumber}
              onChange={(e) => updateForm({ trackingNumber: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block">
              <span className={labelClass}>
                {t('supplierShipments.wizard.details.field.shipDate')}
              </span>
              <input
                type="date"
                value={form.shipDate}
                onChange={(e) => updateForm({ shipDate: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className={labelClass}>{t('supplierShipments.wizard.details.field.eta')}</span>
              <input
                type="date"
                value={form.eta}
                onChange={(e) => updateForm({ eta: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>
          {/* AIB-1 BR-03 / BR-04 (BL-348) — the ZWME021 sequence and the Surat
              Jalan (the External ID). Both are required before submit; the
              sequence rules are checked over the entered lines below. */}
          <div>
            <label className={`${labelClass} after:content-['_*']`} htmlFor="asn-wizard-sequence">
              {t('fc.asn.sequence')}
            </label>
            <input
              id="asn-wizard-sequence"
              aria-required="true"
              type="text"
              inputMode="numeric"
              value={form.sequence}
              onChange={(e) => updateForm({ sequence: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label
              className={`${labelClass} after:content-['_*']`}
              htmlFor="asn-wizard-external-id"
            >
              {t('fc.asn.externalId')}
            </label>
            <input
              id="asn-wizard-external-id"
              aria-required="true"
              type="text"
              value={form.externalId}
              onChange={(e) => updateForm({ externalId: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        {/* BL-303 (UL-05) — **Next** stays disabled until these are filled; say which. */}
        {missing.length > 0 ? (
          <p className="text-xs text-text-secondary" role="status" data-testid="asn-wizard-missing">
            {missing.includes('etaBeforeShip') && missing.length === 1
              ? t('supplierShipments.wizard.details.etaBeforeShip')
              : t('supplierShipments.wizard.details.missing', {
                  fields: missing
                    .filter((m) => m !== 'etaBeforeShip')
                    .map((m) => FIELD_LABEL[m]())
                    .join(', ')
                })}
          </p>
        ) : null}
        {/* AIB-1 BR-03 / BR-04 — the inbound-upload identity, named when absent. */}
        {missingRefs.length > 0 ? (
          <p
            className="text-xs text-text-secondary"
            role="status"
            data-testid="asn-wizard-missing-inbound"
          >
            {t('fc.asn.sequence.missing', {
              fields: missingRefs
                .map((m) => t(m === 'sequence' ? 'fc.asn.sequence' : 'fc.asn.externalId'))
                .join(', ')
            })}
          </p>
        ) : null}
        {/* A sequence another ASN already holds (AIB-D1: one sequence = one ASN). */}
        {wizardRead.sequenceRead?.alreadyUsedBy ? (
          <p className="text-xs text-danger" role="alert" data-testid="asn-wizard-sequence-used">
            {t('fc.asn.sequence.used', {
              sequence: String(form.sequence ?? '').trim(),
              asnNumber: wizardRead.sequenceRead?.alreadyUsedBy
            })}
          </p>
        ) : null}
      </FormSection>

      <FormSection
        eyebrow={t('supplierShipments.wizard.details.logistics.eyebrow')}
        title={t('fc.asn.lines.title')}
        description={t('fc.asn.lines.desc')}
      >
        <AsnLinesEditor
          open={wizardOpenLines}
          entries={form.lines}
          read={wizardRead}
          batches={declaredBatches}
          onChange={onLineChange}
          overShipReason={form.overShipReason}
          onReasonChange={(v) => updateForm({ overShipReason: v })}
          callOff={callOff}
        />
      </FormSection>

      <FormSection
        eyebrow={t('supplierShipments.wizard.details.packaging.eyebrow')}
        title={t('supplierShipments.wizard.details.packaging.title')}
        description={t('supplierShipments.wizard.details.packaging.desc')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block">
              <span className={labelClass}>
                {t('supplierShipments.wizard.details.field.packages')}
              </span>
              <input
                type="number"
                min={1}
                placeholder="0"
                value={form.packages}
                onChange={(e) => updateForm({ packages: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className={labelClass}>
                {t('supplierShipments.wizard.details.field.weight')}
              </span>
              <input
                type="number"
                min={0}
                placeholder="0.00"
                value={form.weightKg}
                onChange={(e) => updateForm({ weightKg: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>
        </div>
      </FormSection>

      <FormSection
        eyebrow={t('supplierShipments.wizard.details.docs.eyebrow')}
        title={t('supplierShipments.wizard.details.docs.title')}
        description={t('supplierShipments.wizard.details.docs.desc')}
      >
        <div>
          <label className={labelClass}>{t('fc.asn.packingList')}</label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={(e) =>
                updateForm({
                  packingList: e.target.files?.[0]?.name ?? ''
                })
              }
            />
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-border-input rounded-md text-sm text-teal-hover font-semibold bg-bg-surface">
              <Upload size={14} />
              {t('supplierShipments.wizard.details.chooseFile')}
            </span>
            <span className={`text-xs ${form.packingList ? 'text-success' : 'text-text-tertiary'}`}>
              {form.packingList || t('supplierShipments.wizard.details.noFile')}
            </span>
          </label>
        </div>
        <div>
          <label className="block">
            <span className={labelClass}>{t('supplierShipments.wizard.details.field.notes')}</span>
            <textarea
              value={form.notes}
              onChange={(e) => updateForm({ notes: e.target.value })}
              rows={3}
              placeholder={t('supplierShipments.placeholder.notes')}
              className={`${inputClass} resize-y`}
            />
          </label>
        </div>
      </FormSection>
    </div>
  );
};

export default WizardDetailsStep;
