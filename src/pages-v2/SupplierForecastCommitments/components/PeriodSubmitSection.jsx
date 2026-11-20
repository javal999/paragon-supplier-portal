/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Button from '@components/ui-v2/Button';
import TermLabel from '@components/ui-v2/TermLabel';
import WeekGrid from '@components/ui-v2/WeekGrid';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { PeriodRow, ReasonLabel, WeekReason } from '../const' */
import { LtpCheckPill, inputClass, ltpSeverity } from '../../inventory/inventoryDisplay';
import { shortfallReasonNeedsNote } from '@services/transitions/reasonCodes';
import { periodKindOf } from '@services/transitions/forecastRules';
import { forecastNow } from '../../forecasts/forecastDisplay';
import SubmitAllConfirm from './SubmitAllConfirm';

/**
 * BL-133 (ENG-D19) — capacity before the LTP: the periods through the shared
 * `WeekGrid` (CAP-1 wave 3, Table 9, AC-05): one COLUMN per period (PEX-2
 * BR-05) with the row labels pinned on the left, one Submit all per period.
 *
 * The grid's four rows are the period's measures — the lines Submit all sends,
 * each capacity group's LTP check, the period's reason and Submit all — so the
 * per-period controls sit in that period's own column, as they did. Each
 * row's period reason is patched into `weekReasons` under the row's bucket.
 * BL-240 (U-02): a row's Submit all opens the confirmation summary first; only
 * its confirm sends the period. In the grid's Monthly view the weeks combine
 * into months and the view is read only (CAP-2 BR-05): a period is submitted
 * from its own week.
 * @type {React.FC<{
 *   periodRows: PeriodRow[];
 *   periodLabel: (bucket: string) => string;
 *   canCommit: boolean;
 *   pending: boolean;
 *   submitAvail: VerbAvailability;
 *   commitmentReasons: string[];
 *   reasonLabel: ReasonLabel;
 *   groupLabel: (id: string) => string;
 *   setWeekReasons: React.Dispatch<React.SetStateAction<Record<string, WeekReason>>>;
 *   onSubmitAll: (row: PeriodRow) => Promise<void>;
 * }>}
 */
const PeriodSubmitSection = ({
  periodRows,
  periodLabel,
  canCommit,
  pending,
  submitAvail,
  commitmentReasons,
  reasonLabel,
  groupLabel,
  setWeekReasons,
  onSubmitAll
}) => {
  const { t } = useTranslation();
  // BL-240 — the period whose confirmation is open, by bucket, so the summary
  // reads the row as it stands now (a refusal that appears meanwhile disables confirm).
  const [confirming, setConfirming] = useState(/** @type {string | null} */ (null));
  const confirmRow = periodRows.find((r) => r.bucket === confirming) ?? null;
  /**
   * The period at a column index; the grid's columns are `periodRows`, in order.
   * @param {number} i
   * @returns {PeriodRow}
   */
  const rowAt = (i) => periodRows[i];
  /**
   * The worst capacity check a period holds, for the Monthly cell (CAP-2
   * BR-03): red above amber above "not stated" above green.
   * @param {PeriodRow} row
   * @returns {string | null}
   */
  const worstLevel = (row) =>
    row.checks.reduce(
      /** @param {string | null} worst @param {{ check: { level: string | null } }} c */
      (worst, c) =>
        c.check.level !== null &&
        (worst === null || ltpSeverity(c.check.level) > ltpSeverity(worst))
          ? c.check.level
          : worst,
      null
    );
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-4"
      data-testid="fc-sup-weeks"
    >
      <div className="px-4 py-3 border-b border-border-subtle">
        <h2 className="text-section text-text-primary">{t('fc.sup.week.title')}</h2>
        <p className="text-xs text-text-tertiary mt-1">{t('fc.sup.week.help')}</p>
        <p className="text-xs text-text-tertiary">{t('fc.sup.grid.scrollHint')}</p>
      </div>
      <WeekGrid
        label={t('fc.sup.week.title')}
        corner={t('fc.sup.week.col.period')}
        currentWeek={forecastNow()}
        testId="fc-sup-weeks-grid"
        viewKey="supplierForecastCommitments"
        weeks={periodRows.map((row) => ({
          week: row.bucket,
          month: periodKindOf(row.bucket) === 'month',
          danger: row.red,
          testId: `fc-week-${row.bucket}`
        }))}
        rows={[
          {
            id: 'lines',
            label: t('fc.sup.week.col.lines'),
            align: 'start',
            combine: 'sum',
            value: (_bucket, i) => rowAt(i).pending.length,
            monthCell: (v) =>
              typeof v === 'number' && v > 0 ? (
                <span className="text-sm text-text-secondary">
                  {t('fc.sup.week.lines', { count: v })}
                </span>
              ) : (
                <span className="text-xs text-text-tertiary">{t('fc.sup.week.nothing')}</span>
              ),
            cell: (_bucket, i) => {
              const row = rowAt(i);
              return row.pending.length > 0 ? (
                <span className="text-sm text-text-secondary">
                  {t('fc.sup.week.lines', { count: row.pending.length })}
                </span>
              ) : (
                <span className="text-xs text-text-tertiary">{t('fc.sup.week.nothing')}</span>
              );
            }
          },
          {
            id: 'checks',
            label: <TermLabel term="ltpAgainstCapacity" />,
            align: 'start',
            combine: 'status',
            severity: ltpSeverity,
            value: (_bucket, i) => worstLevel(rowAt(i)),
            monthCell: (worst) => <LtpCheckPill level={worst} />,
            cell: (_bucket, i) => {
              const row = rowAt(i);
              return (
                <div className="space-y-1">
                  {row.checks.map(({ group, check }) => (
                    <div key={group} className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-text-secondary">{groupLabel(group)}</span>
                      {check.level === null ? (
                        <span className="text-text-tertiary">
                          {t('fc.sup.week.outsideHorizon')}
                        </span>
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
              );
            }
          },
          {
            id: 'reason',
            label: t('fc.sup.week.col.reason'),
            align: 'start',
            combine: 'distinct',
            value: (_bucket, i) => {
              const row = rowAt(i);
              return row.red && row.wr.reason
                ? reasonLabel('commitmentShortfall', row.wr.reason)
                : null;
            },
            cell: (_bucket, i) => {
              const row = rowAt(i);
              if (!row.red) return <span className="text-xs text-text-tertiary">—</span>;
              const label = periodLabel(row.bucket);
              /** @param {Partial<WeekReason>} patch */
              const setWr = (patch) =>
                setWeekReasons((prev) => ({ ...prev, [row.bucket]: { ...row.wr, ...patch } }));
              return (
                <div className="space-y-1">
                  <select
                    aria-label={t('fc.sup.week.reasonFor', { period: label })}
                    className={inputClass}
                    disabled={!canCommit}
                    value={row.wr.reason}
                    onChange={(e) =>
                      setWr({
                        reason: /** @type {import('@services/data/types').CapacityReason | ''} */ (
                          e.target.value
                        )
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
              );
            }
          },
          {
            id: 'actions',
            label: t('fc.col.actions'),
            align: 'start',
            cell: (_bucket, i) => {
              const row = rowAt(i);
              const label = periodLabel(row.bucket);
              return canCommit ? (
                <div className="flex flex-col gap-1">
                  <Button
                    variant="outline"
                    disabled={pending || row.refusal !== null}
                    onClick={() => setConfirming(row.bucket)}
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
              );
            }
          }
        ]}
      />
      {confirmRow && (
        <SubmitAllConfirm
          row={confirmRow}
          label={periodLabel(confirmRow.bucket)}
          pending={pending}
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            setConfirming(null);
            void onSubmitAll(confirmRow);
          }}
        />
      )}
    </section>
  );
};

export default PeriodSubmitSection;
