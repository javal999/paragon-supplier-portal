/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
/** @import { CapacityReason } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { PeriodRow, ReasonLabel, WeekReason } from '../const' */
import { LtpCheckPill, inputClass } from '../../inventory/inventoryDisplay';
import { shortfallReasonNeedsNote } from '@services/transitions/reasonCodes';
import { CELL, HEAD } from './gridCells';

/**
 * One period of the BL-133 Submit all grid, as a COLUMN (PEX-2 BR-05; it was a
 * row): the period, how many lines Submit all sends, each capacity group's LTP check (with the way to confirm
 * capacity), the period's reason when it is above BE, and Submit all with the
 * reason it is refused — or the handoff notice when the seat may not submit.
 * The wrapper is `display: contents`, so its five cells sit in the grid's rows
 * and the column stays one element (its test id is unchanged).
 * @type {React.FC<{
 *   row: PeriodRow;
 *   label: string;
 *   canCommit: boolean;
 *   pending: boolean;
 *   submitAvail: VerbAvailability;
 *   commitmentReasons: string[];
 *   reasonLabel: ReasonLabel;
 *   groupLabel: (id: string) => string;
 *   setWr: (patch: Partial<WeekReason>) => void;
 *   onSubmitAll: (row: PeriodRow) => void;
 * }>}
 */
const PeriodSubmitRow = ({
  row,
  label,
  canCommit,
  pending,
  submitAvail,
  commitmentReasons,
  reasonLabel,
  groupLabel,
  setWr,
  onSubmitAll
}) => {
  const { t } = useTranslation();
  const tint = row.red ? 'bg-danger-soft' : '';
  return (
    <div role="group" aria-label={label} className="contents" data-testid={`fc-week-${row.bucket}`}>
      <div className={HEAD}>{label}</div>
      <div className={`${CELL} ${tint}`}>
        {row.pending.length > 0 ? (
          <span className="text-sm text-text-secondary">
            {t('fc.sup.week.lines', { count: row.pending.length })}
          </span>
        ) : (
          <span className="text-xs text-text-tertiary">{t('fc.sup.week.nothing')}</span>
        )}
      </div>
      <div className={`${CELL} ${tint}`}>
        <div className="space-y-1">
          {row.checks.map(({ group, check }) => (
            <div key={group} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-text-secondary">{groupLabel(group)}</span>
              {check.level === null ? (
                <span className="text-text-tertiary">{t('fc.sup.week.outsideHorizon')}</span>
              ) : (
                // CAP-3 BR-01 / BR-03 — the shared pill; an amber period is
                // confirmed when every amber week in it is.
                <LtpCheckPill
                  level={check.level}
                  confirmed={check.upsideUnconfirmedWeek === null}
                  testId={`fc-week-check-${row.bucket}-${group}`}
                />
              )}
              {check.level === 'unconfirmed' && (
                <Link to="/supplier/capacity" className="text-action-hover hover:underline">
                  {t('fc.sup.week.confirmCapacity')}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className={`${CELL} ${tint}`}>
        {row.red ? (
          <div className="space-y-1 min-w-[160px]">
            <select
              aria-label={t('fc.sup.week.reasonFor', { period: label })}
              className={inputClass}
              disabled={!canCommit}
              value={row.wr.reason}
              onChange={(e) =>
                setWr({
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
            {shortfallReasonNeedsNote(row.wr.reason) && (
              <input
                aria-label={t('fc.sup.week.noteFor', { period: label })}
                className={inputClass}
                placeholder={t('fc.reason.notePlaceholder')}
                disabled={!canCommit}
                value={row.wr.note}
                onChange={(e) => setWr({ note: e.target.value })}
              />
            )}
          </div>
        ) : (
          <span className="text-xs text-text-tertiary">—</span>
        )}
      </div>
      <div className={`${CELL} ${tint}`}>
        {canCommit ? (
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Button
              variant="outline"
              disabled={pending || row.refusal !== null}
              onClick={() => onSubmitAll(row)}
              aria-label={t('fc.sup.week.submitAllFor', { period: label })}
              data-testid={`fc-week-submit-${row.bucket}`}
            >
              {t('fc.sup.week.submitAll')}
            </Button>
            {row.refusal && row.refusal.kind !== 'nothing' && (
              <span
                role="status"
                className="text-xs text-warning-hover"
                data-testid={`fc-week-refusal-${row.bucket}`}
              >
                {row.refusal.kind === 'row'
                  ? t('fc.sup.week.refusal.row')
                  : t(`fc.sup.week.refusal.${row.refusal.kind}`, {
                      group: groupLabel(row.refusal.group)
                    })}
              </span>
            )}
          </div>
        ) : (
          <HandoffNotice availability={submitAvail} testId="handoff-forecast-commit-week" />
        )}
      </div>
    </div>
  );
};

export default PeriodSubmitRow;
