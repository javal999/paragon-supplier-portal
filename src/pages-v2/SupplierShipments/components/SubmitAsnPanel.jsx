/** @import React from 'react' */
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import { asnCallOffWarnings } from '@services/transitions/callOffRules';
/** @import { ASN } from '@services/data/types' */
/** @import { AvailableBatch } from '@services/transitions/fulfilmentRules' */
/** @import { CallOffView } from '@services/transitions/callOffRules' */
/** @import { AsnLinesRead, OpenLine } from '../../shipments/asnLines' */
/** @import { AsnSubmitForm } from '../const' */
import { EMPTY_LINE } from '../../shipments/asnLines';
import { AsnSubmitWarnings } from '../../shipments/CallOffWarnings';
import CarrierPicker from '../../shipments/CarrierPicker';
import { ShelfLifeExceptionDetail, ShelfLifeRequestBox } from '../../shipments/ShelfLifeParts';
import { inputClass, labelClass } from '../const';
import { asnForCheck } from '../utils';
import AsnLinesEditor from './AsnLinesEditor';
import CallOffFinalToggle from './CallOffFinalToggle';

/**
 * @typedef {object} SubmitAsnPanelProps
 * @property {ASN | null} submitTarget  The Draft being submitted; null keeps the drawer closed.
 * @property {AsnSubmitForm} submitForm
 * @property {React.Dispatch<React.SetStateAction<AsnSubmitForm>>} setSubmitForm
 * @property {() => void} onClose
 * @property {() => void} onSubmit  Submits, or asks Quality when shelf life is the one thing wrong.
 * @property {(asn: ASN) => OpenLine[]} submitLinesFor
 * @property {(asn: ASN) => AsnLinesRead} readSubmitLines
 * @property {Readonly<Record<string, readonly AvailableBatch[]>>} declaredBatches
 * @property {readonly Pick<CallOffView, 'callOff' | 'delivery'>[]} callOffViewList
 * @property {readonly ASN[]} asns
 * @property {boolean} submitPending  `t_asn_submit` in flight.
 * @property {boolean} requestPending  The shelf-life exception request in flight.
 */

/**
 * The Submit drawer for a Draft ASN — the second submit path. It collects
 * carrier, tracking, ship date, ETA and the lines, and shows the same warnings
 * as the wizard (FU-5). When shelf life is the one thing wrong the footer asks
 * Quality for an exception instead of submitting (MR-6 BR-08).
 * @type {React.FC<SubmitAsnPanelProps>}
 */
const SubmitAsnPanel = ({
  submitTarget,
  submitForm,
  setSubmitForm,
  onClose,
  onSubmit,
  submitLinesFor,
  readSubmitLines,
  declaredBatches,
  callOffViewList,
  asns,
  submitPending,
  requestPending
}) => {
  const { t } = useTranslation();
  // FU-5 — the drawer's lines and warnings, from the same rules as the wizard.
  const submitRead = submitTarget ? readSubmitLines(submitTarget) : null;
  const submitWarnings =
    submitTarget && submitRead
      ? asnCallOffWarnings(
          asnForCheck(
            {
              asnNumber: submitTarget.asnNumber,
              poReference: submitTarget.poReference,
              ...(submitTarget.callOffId
                ? { callOffId: submitTarget.callOffId, callOffFinal: submitForm.callOffFinal }
                : {})
            },
            submitRead,
            submitForm.eta,
            submitForm.shipDate
          ),
          callOffViewList,
          asns
        )
      : [];
  return (
    <SidePanel
      open={submitTarget !== null}
      onClose={onClose}
      title={
        submitTarget
          ? t('supplierShipments.submitPanel.title', {
              asnNumber: submitTarget.asnNumber
            })
          : ''
      }
      footerActions={
        submitTarget && (
          <>
            <Button variant="secondary" onClick={onClose}>
              {t('supplierShipments.action.cancel')}
            </Button>
            {readSubmitLines(submitTarget).onlyShelfLife ? (
              <Button
                variant="outline"
                icon={Send}
                onClick={onSubmit}
                disabled={requestPending || submitForm.exceptionReason.trim() === ''}
              >
                {t('fc.asn.shelfLife.request.action')}
              </Button>
            ) : (
              <Button variant="outline" icon={Send} onClick={onSubmit} disabled={submitPending}>
                {t('asn.submit.confirm')}
              </Button>
            )}
          </>
        )
      }
    >
      {submitTarget && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            {t('asn.submit.form.intro', { poNumber: submitTarget.poReference })}
          </p>
          {/* BL-51 — the 3PL from the administrator's list, or a carrier by name. */}
          <CarrierPicker
            idPrefix="asn-submit"
            label={t('asn.submit.form.carrier')}
            labelClass={labelClass}
            inputClass={inputClass}
            value={{ threePlId: submitForm.threePlId, carrier: submitForm.carrier }}
            onChange={(v) => setSubmitForm((f) => ({ ...f, ...v }))}
          />
          <label className="block">
            <span className={labelClass}>{t('fc.asn.trackingOrVehicle')}</span>
            <input
              type="text"
              value={submitForm.trackingNumber}
              onChange={(e) => setSubmitForm((f) => ({ ...f, trackingNumber: e.target.value }))}
              className={inputClass}
              placeholder={t('supplierShipments.placeholder.tracking')}
            />
          </label>
          <label className="block">
            <span className={labelClass}>{t('fc.asn.shipDate')}</span>
            <input
              type="date"
              value={submitForm.shipDate}
              onChange={(e) => setSubmitForm((f) => ({ ...f, shipDate: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>{t('asn.submit.form.eta')}</span>
            <input
              type="date"
              value={submitForm.eta}
              onChange={(e) => setSubmitForm((f) => ({ ...f, eta: e.target.value }))}
              className={inputClass}
            />
          </label>
          {/* AIB-1 BR-03 / BR-04 (BL-348) — the sequence and the Surat Jalan
              (External ID) the inbound upload carries. */}
          <label className="block">
            <span className={`${labelClass} after:content-['_*']`}>{t('fc.asn.sequence')}</span>
            <input
              type="text"
              inputMode="numeric"
              aria-required="true"
              value={submitForm.sequence}
              onChange={(e) => setSubmitForm((f) => ({ ...f, sequence: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={`${labelClass} after:content-['_*']`}>{t('fc.asn.externalId')}</span>
            <input
              type="text"
              aria-required="true"
              value={submitForm.externalId}
              onChange={(e) => setSubmitForm((f) => ({ ...f, externalId: e.target.value }))}
              className={inputClass}
            />
          </label>
          {submitRead?.sequenceRead?.alreadyUsedBy ? (
            <p className="text-xs text-danger" role="alert" data-testid="asn-submit-sequence-used">
              {t('fc.asn.sequence.used', {
                sequence: String(submitForm.sequence ?? '').trim(),
                asnNumber: submitRead.sequenceRead.alreadyUsedBy
              })}
            </p>
          ) : null}
          <div>
            <div className={labelClass}>{t('fc.asn.lines.title')}</div>
            <AsnLinesEditor
              open={submitLinesFor(submitTarget)}
              entries={submitForm.lines}
              read={submitRead ?? readSubmitLines(submitTarget)}
              batches={declaredBatches}
              onChange={(code, patch) =>
                setSubmitForm((f) => ({
                  ...f,
                  lines: {
                    ...f.lines,
                    [code]: { ...(f.lines[code] ?? EMPTY_LINE), ...patch }
                  }
                }))
              }
              overShipReason={submitForm.overShipReason}
              onReasonChange={(v) => setSubmitForm((f) => ({ ...f, overShipReason: v }))}
            />
            <p className="mt-2 text-xs text-text-tertiary">{t('fc.asn.submit.required')}</p>
          </div>
          {readSubmitLines(submitTarget).onlyShelfLife ? (
            <ShelfLifeRequestBox
              reason={submitForm.exceptionReason}
              onReasonChange={(v) => setSubmitForm((f) => ({ ...f, exceptionReason: v }))}
            />
          ) : null}
          {/* A draft Quality sent back: the rejection and its reason (MR-6 BR-08). */}
          <ShelfLifeExceptionDetail asn={submitTarget} />
          {submitTarget.callOffId ? (
            <CallOffFinalToggle
              id="asn-submit-calloff-final"
              checked={submitForm.callOffFinal}
              onChange={(v) => setSubmitForm((f) => ({ ...f, callOffFinal: v }))}
            />
          ) : null}
          {/* FU-5 — the Submit drawer is the second submit path: the same warnings. */}
          <AsnSubmitWarnings
            aboveAvailable={submitRead?.aboveAvailable ?? []}
            callOffWarnings={submitWarnings}
            testId="asn-submit-warnings"
          />
        </div>
      )}
    </SidePanel>
  );
};

export default SubmitAsnPanel;
