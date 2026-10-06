/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
/** @import { AwardRow } from '../utils' */

/**
 * The "Award history" tab: the supplier's decided quotations (awarded or not)
 * as a table, and the win rate they add up to; the empty state when nothing has
 * been decided. `rows` is `buildAwardRows`' output.
 * @type {React.FC<{ rows: AwardRow[] }>}
 */
const AwardsTab = ({ rows }) => {
  const { t } = useTranslation();
  const awarded = rows.filter((r) => r.result === 'Awarded').length;
  const total = rows.length;
  const pct = total > 0 ? Math.round((awarded / total) * 100) : 0;

  if (total === 0) {
    return (
      <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
          <Trophy size={20} className="text-text-tertiary" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          {t('rfqs.awards.emptyTitle')}
        </div>
        <div className="text-sm text-text-tertiary">{t('rfqs.awards.emptyBody')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rfqs.awards.col.rfq')}</TableHeaderCell>
            <TableHeaderCell>{t('rfqs.awards.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('rfqs.awards.col.result')}</TableHeaderCell>
            <TableHeaderCell>{t('rfqs.awards.col.awardDate')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('rfqs.awards.col.contractValue')}
            </TableHeaderCell>
            <TableHeaderCell>{t('rfqs.awards.col.poIssued')}</TableHeaderCell>
            <TableHeaderCell>{t('rfqs.awards.col.notes')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {rows.map((row) => (
              <TableRow key={row.quotationId}>
                <TableCell>
                  <Data className="text-xs font-bold text-text-primary">{row.rfqNumber}</Data>
                </TableCell>
                <TableCell className="text-text-primary">{row.material}</TableCell>
                <TableCell>
                  <StatusPill variant={row.result === 'Awarded' ? 'success' : 'neutral'}>
                    {row.result}
                  </StatusPill>
                </TableCell>
                <TableCell className="text-text-tertiary text-sm whitespace-nowrap">
                  <Data>{row.awardDate}</Data>
                </TableCell>
                <TableCell
                  className={`text-right font-semibold whitespace-nowrap ${
                    row.contractValue !== '—' ? 'text-success' : 'text-text-tertiary'
                  }`}
                >
                  <Data>{row.contractValue}</Data>
                </TableCell>
                <TableCell
                  className={`text-xs ${row.poIssued !== '—' ? 'text-info' : 'text-text-tertiary'}`}
                >
                  <Data>{row.poIssued}</Data>
                </TableCell>
                <TableCell className="text-xs text-text-secondary max-w-[16rem]">
                  {t(row.result === 'Awarded' ? 'rfqs.awards.note.won' : 'rfqs.awards.note.lost')}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm px-5 py-4 flex items-center gap-5 flex-wrap">
        <div className="flex-1 min-w-[16rem]">
          <div className="text-sm text-text-primary mb-2">
            <strong>
              {t(total === 1 ? 'rfqs.awards.winRate.one' : 'rfqs.awards.winRate.other', {
                awarded,
                total,
                pct
              })}
            </strong>
          </div>
          <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="text-center shrink-0">
          <div className="text-kpi font-mono tabular-nums text-success">{pct}%</div>
          <div className="text-xs text-text-tertiary">{t('rfqs.awards.winRateLabel')}</div>
        </div>
      </div>
    </div>
  );
};

export default AwardsTab;
