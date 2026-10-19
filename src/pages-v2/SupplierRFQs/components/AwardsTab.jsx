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

/** @type {Record<AwardRow['result'], 'success' | 'neutral' | 'warning'>} */
const RESULT_PILL = { awarded: 'success', notAwarded: 'neutral', withdrawn: 'warning' };

/**
 * RFx UX 2F — the one placeholder for an empty value cell: the same dash, at
 * the same weight and colour, whichever column it stands in.
 * @type {React.FC<{ testId: string }>}
 */
const NoValue = ({ testId }) => (
  <span className="text-sm font-normal text-text-tertiary" data-testid={testId}>
    —
  </span>
);

/**
 * The "Award history" tab: one row per event the supplier reads an award on,
 * from the award record (RFx UX S-03); the empty state when nothing has been
 * decided. `rows` is `buildAwardRows`' output. The win-rate tile is gone (owner
 * ruling Q7, 2026-10-19): it counted quotation versions, not events.
 * @type {React.FC<{ rows: AwardRow[] }>}
 */
const AwardsTab = ({ rows }) => {
  const { t } = useTranslation();

  if (rows.length === 0) {
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
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rfqs.awards.col.rfq')}</TableHeaderCell>
          <TableHeaderCell>{t('rfqs.awards.col.material')}</TableHeaderCell>
          <TableHeaderCell>{t('rfqs.awards.col.result')}</TableHeaderCell>
          <TableHeaderCell>{t('rfqs.awards.col.awardDate')}</TableHeaderCell>
          <TableHeaderCell className="text-right">
            {t('rfqs.awards.col.awardedValue')}
          </TableHeaderCell>
          <TableHeaderCell>{t('rfqs.awards.col.poIssued')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {rows.map((row) => (
            <TableRow key={row.eventId} data-testid={`award-row-${row.eventId}`}>
              <TableCell>
                <Data className="text-xs font-bold text-text-primary">{row.rfqNumber}</Data>
              </TableCell>
              <TableCell className="text-text-primary">{row.material}</TableCell>
              <TableCell>
                <StatusPill variant={RESULT_PILL[row.result]}>{row.resultText}</StatusPill>
              </TableCell>
              <TableCell className="text-text-tertiary text-sm whitespace-nowrap">
                <Data>{row.awardDate}</Data>
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {row.awardedValue === null ? (
                  <NoValue testId={`award-none-value-${row.eventId}`} />
                ) : (
                  <Data className="font-semibold">{row.awardedValue}</Data>
                )}
              </TableCell>
              <TableCell className="text-xs text-text-secondary">
                {row.poIssued === null ? (
                  <NoValue testId={`award-none-po-${row.eventId}`} />
                ) : (
                  row.poIssued
                )}
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default AwardsTab;
