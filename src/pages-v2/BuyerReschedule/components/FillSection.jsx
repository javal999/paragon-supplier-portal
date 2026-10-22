/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import { CollapsedSection } from '@components/forecast/AboutThisPage';
import { formatDate } from '@lib/format';
/** @import { WarehouseRescheduleView } from '@services/data/types' */
/** @import { SelectionEffect } from '@services/engine/reschedule' */
import { STANDARD } from '../const';
import { pct, weekLabel } from '../utils';
import FillChart from './FillChart';

/**
 * The fill section, the whole of the "Warehouse fill" tab (P-12), so it opens shown: the chart, then a week-by-week table of the fill
 * now, after the selection, after every relief proposal, and of stock on hand,
 * with each week's status against capacity and the standard.
 * @type {React.FC<{ w: WarehouseRescheduleView; effect: SelectionEffect }>}
 */
const FillSection = ({ w, effect }) => {
  const { t } = useTranslation();
  return (
    <CollapsedSection
      title={t('rs.fill.title')}
      testId="rs-fill"
      defaultOpen
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
    >
      <p className="text-xs text-text-secondary mt-3 mb-1" data-testid="rs-fill-basis">
        {t('rs.fill.basis')}
      </p>
      <p className="text-xs text-text-tertiary mb-3">{t('rs.fill.intro')}</p>
      <FillChart w={w} selected={effect.fill} />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rs.fill.col.week')}</TableHeaderCell>
            <TableHeaderCell>{t('rs.fill.col.now')}</TableHeaderCell>
            <TableHeaderCell>{t('rs.fill.col.selected')}</TableHeaderCell>
            <TableHeaderCell>{t('rs.fill.col.allRelief')}</TableHeaderCell>
            <TableHeaderCell>{t('rs.fill.col.onHand')}</TableHeaderCell>
            <TableHeaderCell>{t('rs.fill.col.status')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {w.weeks.map((wk, i) => (
              <TableRow key={wk.weekStart} data-testid={`rs-week-${wk.weekStart}`}>
                <TableCell className="whitespace-nowrap">
                  <Data>{weekLabel(wk.weekStart)}</Data>
                  <div className="text-xs text-text-tertiary">
                    <Data>{formatDate(wk.weekStart)}</Data>
                  </div>
                </TableCell>
                <TableCell>
                  <Data data-testid={`rs-fill-now-${wk.weekStart}`}>{pct(wk.fill)}</Data>
                </TableCell>
                <TableCell>
                  <Data data-testid={`rs-fill-selected-${wk.weekStart}`}>
                    {pct(effect.fill[i])}
                  </Data>
                </TableCell>
                <TableCell>
                  <Data
                    className="text-text-secondary"
                    data-testid={`rs-fill-relief-${wk.weekStart}`}
                  >
                    {pct(wk.fillAfterRelief)}
                  </Data>
                </TableCell>
                <TableCell>
                  <Data className="text-text-secondary">{pct(wk.onHandFill)}</Data>
                </TableCell>
                <TableCell>
                  {wk.onHandOverPallets > 0 ? (
                    <StatusPill variant="danger">{t('rs.fill.status.onHand')}</StatusPill>
                  ) : effect.fill[i] > 1 ? (
                    <StatusPill variant="danger">{t('rs.fill.status.over')}</StatusPill>
                  ) : effect.fill[i] > STANDARD ? (
                    <StatusPill variant="warning">{t('rs.fill.status.above')}</StatusPill>
                  ) : (
                    <StatusPill variant="success">{t('rs.fill.status.within')}</StatusPill>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>
    </CollapsedSection>
  );
};

export default FillSection;
