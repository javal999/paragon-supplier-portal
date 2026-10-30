/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { PeriodRow, ReasonLabel, WeekReason } from '../const' */
import PeriodSubmitRow from './PeriodSubmitRow';

/**
 * BL-133 (ENG-D19) — capacity before the LTP: the table of periods, one
 * Submit all per period. Each row's period reason is patched into
 * `weekReasons` under the row's bucket.
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
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-4"
      data-testid="fc-sup-weeks"
    >
      <div className="px-4 py-3 border-b border-border-subtle">
        <h2 className="text-section text-text-primary">{t('fc.sup.week.title')}</h2>
        <p className="text-xs text-text-tertiary mt-1">{t('fc.sup.week.help')}</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('fc.sup.week.col.period')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.sup.week.col.lines')}</TableHeaderCell>
            <TableHeaderCell term="ltpAgainstCapacity" />
            <TableHeaderCell>{t('fc.sup.week.col.reason')}</TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">{t('fc.col.actions')}</span>
            </TableHeaderCell>
          </TableHeader>
          <tbody>
            {periodRows.map((row) => {
              const label = periodLabel(row.bucket);
              /** @param {Partial<WeekReason>} patch */
              const setWr = (patch) =>
                setWeekReasons((prev) => ({ ...prev, [row.bucket]: { ...row.wr, ...patch } }));
              return (
                <PeriodSubmitRow
                  key={row.bucket}
                  row={row}
                  label={label}
                  canCommit={canCommit}
                  pending={pending}
                  submitAvail={submitAvail}
                  commitmentReasons={commitmentReasons}
                  reasonLabel={reasonLabel}
                  groupLabel={groupLabel}
                  setWr={setWr}
                  onSubmitAll={onSubmitAll}
                />
              );
            })}
          </tbody>
        </Table>
      </div>
    </section>
  );
};

export default PeriodSubmitSection;
