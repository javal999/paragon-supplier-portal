/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
/** @import { ForecastCommitmentLine } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { ReadRow, ReasonLabel, RowDraft } from '../const' */
import CommitmentRow from './CommitmentRow';
import ForecastZoneRow from './ForecastZoneRow';

/**
 * One material's commitment table: its code and name, the column headers in
 * its unit, and a row per period — acknowledge-only for the Forecast zone,
 * the commitment inputs for Firm and Trade-off.
 * @type {React.FC<{
 *   code: string;
 *   mine: ForecastCommitmentLine[];
 *   periodLabel: (bucket: string) => string;
 *   nowIso: string;
 *   canCommit: boolean;
 *   canAck: boolean;
 *   pending: boolean;
 *   submitAvail: VerbAvailability;
 *   ackAvail: VerbAvailability;
 *   commitmentReasons: string[];
 *   reasonLabel: ReasonLabel;
 *   readRow: (l: ForecastCommitmentLine) => ReadRow;
 *   setRow: (l: ForecastCommitmentLine, patch: Partial<RowDraft>) => void;
 *   onCommitRow: (l: ForecastCommitmentLine, draftOnly: boolean) => Promise<void>;
 *   onAcknowledge: (l: ForecastCommitmentLine) => void;
 * }>}
 */
const MaterialSection = ({
  code,
  mine,
  periodLabel,
  nowIso,
  canCommit,
  canAck,
  pending,
  submitAvail,
  ackAvail,
  commitmentReasons,
  reasonLabel,
  readRow,
  setRow,
  onCommitRow,
  onAcknowledge
}) => {
  const { t } = useTranslation();
  const first = mine[0];
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
      data-testid={`fc-sup-material-${code}`}
    >
      <div className="px-4 py-3 border-b border-border-subtle">
        <Data className="font-semibold">{code}</Data>{' '}
        <span className="text-sm text-text-primary">· {first.materialLabel}</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('fc.col.period')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.col.zone')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('fc.col.forecast', { uom: first.uom })}
            </TableHeaderCell>
            <TableHeaderCell>{t('fc.col.due')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.col.commitment', { uom: first.uom })}</TableHeaderCell>
            <TableHeaderCell>{t('fc.col.upside', { uom: first.uom })}</TableHeaderCell>
            <TableHeaderCell>{t('fc.col.reason')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.col.status')}</TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">{t('fc.col.actions')}</span>
            </TableHeaderCell>
          </TableHeader>
          <tbody>
            {mine.map((l) => {
              const label = periodLabel(l.periodBucket);
              if (l.zone === 'forecast') {
                return (
                  <ForecastZoneRow
                    key={l.key}
                    l={l}
                    label={label}
                    nowIso={nowIso}
                    canAck={canAck}
                    pending={pending}
                    ackAvail={ackAvail}
                    onAcknowledge={onAcknowledge}
                  />
                );
              }
              return (
                <CommitmentRow
                  key={l.key}
                  l={l}
                  label={label}
                  nowIso={nowIso}
                  canCommit={canCommit}
                  pending={pending}
                  submitAvail={submitAvail}
                  commitmentReasons={commitmentReasons}
                  reasonLabel={reasonLabel}
                  readRow={readRow}
                  setRow={setRow}
                  onCommitRow={onCommitRow}
                />
              );
            })}
          </tbody>
        </Table>
      </div>
    </section>
  );
};

export default MaterialSection;
