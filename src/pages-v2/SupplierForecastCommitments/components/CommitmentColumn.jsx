/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
/** @import { CapacityReason, ForecastCommitmentLine } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { ReadRow, ReasonLabel, RowDraft } from '../const' */
import {
  CommitmentDeadline,
  CommitmentStatePill,
  GapCell,
  ZonePill
} from '../../forecasts/forecastDisplay';
import { inputClass } from '../../inventory/inventoryDisplay';
import { shortfallReasonNeedsNote } from '@services/transitions/reasonCodes';
import { CELL, DemandCell, FulfilByCell, HEAD } from './gridCells';

/**
 * PEX-2 (BL-265) — one committed period as a COLUMN of the grid (it was a
 * row): the period, zone, ordered quantity (with "was" when it changed, and
 * the PEX-3 hover) and due date; the fulfilment window (PEX-10); the
 * commitment quantity and upside inputs (pre-filled, BR-09; no date since
 * CAP-6); the starter reason when the quantity is below forecast (BR-04); the
 * state, the draft marker (only while awaited, BL-241) and gap; and Save draft
 * with the row's refusal — or the handoff notice when the seat may not commit.
 * The wrapper is `display: contents`, so its cells sit in the grid's rows and
 * the column stays one element (its test id is unchanged).
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
const CommitmentColumn = ({
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
  const tint = below ? 'bg-warning-soft' : '';
  return (
    <div
      role="group"
      aria-label={label}
      className="contents"
      data-testid={`fc-sup-row-${l.materialCode}-${l.periodBucket}`}
    >
      <div className={HEAD}>{label}</div>
      <div className={`${CELL} ${tint}`}>
        <ZonePill zone={l.zone} />
      </div>
      <DemandCell l={l} label={label} className={tint} />
      <div className={`${CELL} ${tint}`}>
        <CommitmentDeadline
          line={l}
          nowIso={nowIso}
          testId={`fc-due-${l.materialCode}-${l.periodBucket}`}
        />
      </div>
      <FulfilByCell l={l} className={tint} />
      <div className={`${CELL} ${tint}`}>
        <input
          aria-label={t('fc.sup.qtyFor', { period: label })}
          inputMode="decimal"
          className={`${inputClass} min-w-[110px]`}
          disabled={!canCommit}
          value={d.qty}
          onChange={(e) => setRow(l, { qty: e.target.value })}
        />
      </div>
      <div className={`${CELL} ${tint}`}>
        <input
          aria-label={t('fc.sup.upsideFor', { period: label })}
          inputMode="decimal"
          className={`${inputClass} min-w-[90px]`}
          disabled={!canCommit}
          value={d.upside}
          onChange={(e) => setRow(l, { upside: e.target.value })}
        />
      </div>
      <div className={`${CELL} ${tint}`}>
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
      </div>
      <div className={`${CELL} ${tint}`}>
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
      </div>
      <div className={`${CELL} ${tint}`}>
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
      </div>
    </div>
  );
};

export default CommitmentColumn;
