/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import TableCell from '@components/ui-v2/TableCell';
import TableRow from '@components/ui-v2/TableRow';
/** @import { CapacityReason } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { PeriodRow, ReasonLabel, WeekReason } from '../const' */
import { LtpCheckPill, inputClass } from '../../inventory/inventoryDisplay';

/**
 * One period of the BL-133 Submit all table: the period, how many lines Submit
 * all sends, each capacity group's LTP check (with the way to confirm
 * capacity), the period's reason when it is above BE, and Submit all with the
 * reason it is refused — or the handoff notice when the seat may not submit.
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
 *   onSubmitAll: (row: PeriodRow) => Promise<void>;
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
  return (
    <TableRow data-testid={`fc-week-${row.bucket}`} className={row.red ? 'bg-danger-soft' : ''}>
      <TableCell className="whitespace-nowrap">{label}</TableCell>
      <TableCell>
        {row.pending.length > 0 ? (
          <span className="text-sm text-text-secondary">
            {t('fc.sup.week.lines', { count: row.pending.length })}
          </span>
        ) : (
          <span className="text-xs text-text-tertiary">{t('fc.sup.week.nothing')}</span>
        )}
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          {row.checks.map(({ group, check }) => (
            <div key={group} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-text-secondary">{groupLabel(group)}</span>
              {check.level === null ? (
                <span className="text-text-tertiary">{t('fc.sup.week.outsideHorizon')}</span>
              ) : (
                <LtpCheckPill level={check.level} testId={`fc-week-check-${row.bucket}-${group}`} />
              )}
              {check.level === 'unconfirmed' && (
                <Link to="/supplier/capacity" className="text-action-hover hover:underline">
                  {t('fc.sup.week.confirmCapacity')}
                </Link>
              )}
            </div>
          ))}
        </div>
      </TableCell>
      <TableCell>
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
            {row.wr.reason === 'other' && (
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
      </TableCell>
      <TableCell>
        {canCommit ? (
          <div className="flex flex-col gap-1 min-w-[140px]">
            <Button
              variant="outline"
              disabled={pending || row.refusal !== null}
              onClick={() => void onSubmitAll(row)}
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
      </TableCell>
    </TableRow>
  );
};

export default PeriodSubmitRow;
