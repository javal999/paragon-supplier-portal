/** @import * as React from 'react' */
import { useTranslation } from 'react-i18next';
import FormSection from '../../../ui-v2/FormSection';
import Data from '../../../ui-v2/Data';
import { labelFor, inputCls } from './fieldParts';
import { formatNumber } from '../utils';
/** @import { GrHeaderDisposition } from '@services/transitions' */

/**
 * @typedef {object} DispositionStepProps
 * @property {GrHeaderDisposition} derivedDisposition -  The header disposition ROLLED UP from the lines — shown, never chosen.
 * @property {(d: string) => string} dispositionLabel -  Localized label for a disposition token.
 * @property {{ items: number; accepted: number; rejected: number }} totals -  Summed from the parsed quantity pairs.
 * @property {string} dispositionReason
 * @property {(value: string) => void} setDispositionReason
 * @property {boolean} autoPostSap
 * @property {(value: boolean) => void} setAutoPostSap
 * @property {string} finalNotes
 * @property {(value: string) => void} setFinalNotes
 */

/**
 * Step 4 — the derived header disposition with its roll-up, the full-lot
 * rejection reason when the roll-up is Rejected, the post-to-SAP opt-in, final
 * notes, and the summary tiles.
 * @type {React.FC<DispositionStepProps>}
 */
const DispositionStep = ({
  derivedDisposition,
  dispositionLabel,
  totals,
  dispositionReason,
  setDispositionReason,
  autoPostSap,
  setAutoPostSap,
  finalNotes,
  setFinalNotes
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-5">
      <FormSection title={t('goodsReceipt.wizard.section.finalDisposition')}>
        <div>
          {labelFor(t('goodsReceipt.wizard.field.headerDisposition'))}
          <div
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
              derivedDisposition === 'Approved'
                ? 'border-success/40 bg-success-soft text-success'
                : derivedDisposition === 'Partially Approved'
                  ? 'border-warning/40 bg-warning-soft text-warning-hover'
                  : derivedDisposition === 'Rejected'
                    ? 'border-danger/40 bg-danger-soft text-danger'
                    : 'border-border-input bg-bg-hover text-text-secondary'
            }`}
          >
            {dispositionLabel(derivedDisposition)}
          </div>
          <p className="mt-1.5 text-xs text-text-tertiary">
            {totals.items === 1
              ? t('goodsReceipt.wizard.rollup.prefix.one', { count: totals.items })
              : t('goodsReceipt.wizard.rollup.prefix.other', { count: totals.items })}{' '}
            <Data>{formatNumber(totals.accepted)}</Data>{' '}
            {t('goodsReceipt.wizard.rollup.acceptedWord')}{' '}
            <Data>{formatNumber(totals.rejected)}</Data>{' '}
            {t('goodsReceipt.wizard.rollup.rejectedWord')}{' '}
            {t('goodsReceipt.wizard.rollup.notEditable')}
          </p>
        </div>

        {derivedDisposition === 'Rejected' && (
          <label className="block">
            {labelFor(t('goodsReceipt.wizard.field.rejectionReasonRequired'))}
            <textarea
              rows={2}
              aria-label={t('goodsReceipt.wizard.aria.headerRejectionReason')}
              value={dispositionReason}
              onChange={(e) => setDispositionReason(e.target.value)}
              className={inputCls}
              placeholder={t('goodsReceipt.wizard.placeholder.fullLotRejection')}
            />
          </label>
        )}

        {(derivedDisposition === 'Approved' || derivedDisposition === 'Partially Approved') && (
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={autoPostSap}
              onChange={(e) => setAutoPostSap(e.target.checked)}
            />
            {t('goodsReceipt.wizard.autoPostSap')}
          </label>
        )}

        <label className="block">
          {labelFor(t('goodsReceipt.wizard.field.finalNotes'))}
          <textarea
            rows={2}
            value={finalNotes}
            onChange={(e) => setFinalNotes(e.target.value)}
            className={inputCls}
            placeholder={t('goodsReceipt.wizard.placeholder.optional')}
          />
        </label>
      </FormSection>

      <div className="border border-border-subtle rounded-lg p-4 bg-bg-hover grid grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-xs text-text-tertiary">
            {t('goodsReceipt.wizard.summary.totalItems')}
          </div>
          <div className="font-semibold text-text-primary">
            <Data>{totals.items}</Data>
          </div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary">
            {t('goodsReceipt.wizard.summary.totalAccepted')}
          </div>
          <div className="font-semibold text-success">
            <Data>{formatNumber(totals.accepted)}</Data>
          </div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary">
            {t('goodsReceipt.wizard.summary.totalRejected')}
          </div>
          <div className="font-semibold text-danger">
            <Data>{formatNumber(totals.rejected)}</Data>
          </div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary">
            {t('goodsReceipt.wizard.summary.sapDoc')}
          </div>
          <div className="text-xs text-text-secondary">
            {autoPostSap
              ? t('goodsReceipt.wizard.summary.assignedBySap')
              : t('goodsReceipt.wizard.summary.notPosted')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispositionStep;
