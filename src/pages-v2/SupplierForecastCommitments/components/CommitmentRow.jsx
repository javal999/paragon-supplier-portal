/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import TableCell from '@components/ui-v2/TableCell';
import TableRow from '@components/ui-v2/TableRow';
/** @import { CapacityReason, ForecastCommitmentLine } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { ReadRow, ReasonLabel, RowDraft } from '../const' */
import {
  CommitmentDeadline,
  CommitmentStatePill,
  GapCell,
  ZonePill,
  qtyText
} from '../../forecasts/forecastDisplay';
import { inputClass } from '../../inventory/inventoryDisplay';
import CommitmentLogRow from './CommitmentLogRow';
import { shortfallReasonNeedsNote } from '@services/transitions/reasonCodes';

/**
 * A Firm or Trade-off line's row: the period, zone, forecast (with "was" when
 * it changed) and due date; the commitment quantity and upside inputs
 * (pre-filled, BR-09; no date since CAP-6, the record carries the period
 * start); the starter reason when the quantity is below forecast
 * (BR-04); the state, the draft marker (only while awaited, BL-241) and gap; and Save draft with the row's
 * refusal — or the handoff notice when the seat may not commit. Followed by
 * the line's revision log, when it has one.
 * @type {React.FC<{
 *   l: ForecastCommitmentLine;
 *   label: string;
 *   nowIso: string;
 *   canCommit: boolean;
 *   pending: boolean;
 *   submitAvail: VerbAvailability;
 *   commitmentReasons: string[];
 *   reasonLabel: ReasonLabel;
 *   readRow: (l: ForecastCommitmentLine) => ReadRow;
 *   setRow: (l: ForecastCommitmentLine, patch: Partial<RowDraft>) => void;
 *   onCommitRow: (l: ForecastCommitmentLine, draftOnly: boolean) => Promise<void>;
 * }>}
 */
const CommitmentRow = ({
  l,
  label,
  nowIso,
  canCommit,
  pending,
  submitAvail,
  commitmentReasons,
  reasonLabel,
  readRow,
  setRow,
  onCommitRow
}) => {
  const { t } = useTranslation();
  const { d, qtyValue, refusal } = readRow(l);
  const below = qtyValue !== null && qtyValue < l.forecastQty;
  return (
    <>
      <TableRow
        data-testid={`fc-sup-row-${l.materialCode}-${l.periodBucket}`}
        className={below ? 'bg-warning-soft' : ''}
      >
        <TableCell className="whitespace-nowrap">{label}</TableCell>
        <TableCell>
          <ZonePill zone={l.zone} />
        </TableCell>
        <TableCell className="text-right">
          <Data>{qtyText(l.forecastQty)}</Data>
          {l.previousQty !== null && l.previousQty !== l.forecastQty && (
            <div className="text-xs text-text-tertiary">
              {t('fc.was')} <Data>{qtyText(l.previousQty)}</Data>
            </div>
          )}
        </TableCell>
        <TableCell>
          <CommitmentDeadline
            line={l}
            nowIso={nowIso}
            testId={`fc-due-${l.materialCode}-${l.periodBucket}`}
          />
        </TableCell>
        <TableCell>
          <input
            aria-label={t('fc.sup.qtyFor', { period: label })}
            inputMode="decimal"
            className={`${inputClass} min-w-[110px]`}
            disabled={!canCommit}
            value={d.qty}
            onChange={(e) => setRow(l, { qty: e.target.value })}
          />
        </TableCell>
        <TableCell>
          <input
            aria-label={t('fc.sup.upsideFor', { period: label })}
            inputMode="decimal"
            className={`${inputClass} min-w-[90px]`}
            disabled={!canCommit}
            value={d.upside}
            onChange={(e) => setRow(l, { upside: e.target.value })}
          />
        </TableCell>
        <TableCell>
          {below ? (
            <div className="space-y-1 min-w-[160px]">
              <select
                aria-label={t('fc.sup.reasonFor', { period: label })}
                className={inputClass}
                disabled={!canCommit}
                value={d.reason}
                onChange={(e) =>
                  setRow(l, {
                    reason: /** @type {CapacityReason | ''} */ (e.target.value)
                  })
                }
              >
                <option value="">{t('fc.reason.select')}</option>
                {commitmentReasons.map((r) => (
                  <option key={r} value={r}>
                    {reasonLabel('commitmentShortfall', r)}
                  </option>
                ))}
              </select>
              {shortfallReasonNeedsNote(d.reason) && (
                <input
                  aria-label={t('fc.sup.noteFor', { period: label })}
                  className={inputClass}
                  placeholder={t('fc.reason.notePlaceholder')}
                  disabled={!canCommit}
                  value={d.note}
                  onChange={(e) => setRow(l, { note: e.target.value })}
                />
              )}
            </div>
          ) : (
            <span className="text-xs text-text-tertiary">—</span>
          )}
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            <CommitmentStatePill line={l} nowIso={nowIso} />
            {/* BL-241 (U-05) — the draft marker only while the period is still awaited: once it is submitted PTI sees it, so "not visible to PTI" would be false. */}
            {l.state === 'awaiting' && l.draft && (
              <div className="text-xs text-text-tertiary" data-testid={`fc-draft-${l.key}`}>
                {t('fc.sup.draftSaved')}
              </div>
            )}
            <GapCell line={l} />
          </div>
        </TableCell>
        <TableCell>
          {canCommit ? (
            <div className="flex flex-col gap-1 min-w-[120px]">
              <Button
                variant="secondary"
                disabled={pending || qtyValue === null}
                onClick={() => void onCommitRow(l, true)}
                aria-label={t('fc.sup.draftFor', { period: label })}
              >
                {t('fc.sup.saveDraft')}
              </Button>
              {refusal && (
                <span role="status" className="text-xs text-warning-hover">
                  {t(`fc.sup.refusal.${refusal}`)}
                </span>
              )}
            </div>
          ) : (
            <HandoffNotice availability={submitAvail} testId="handoff-forecast-commit" />
          )}
        </TableCell>
      </TableRow>
      {l.log.length > 0 && <CommitmentLogRow l={l} />}
    </>
  );
};

export default CommitmentRow;
