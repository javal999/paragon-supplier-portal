/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import { formatDate, formatIDR, formatNumber } from '@lib/format';
/** @import { WarehousePlanView } from '@services/data/types' */
import { STANDARD } from '../const';
import { pct, weekLabel } from '../utils';

/**
 * The weekly fill table under the chart: per week the fill and pallets under
 * this plan, the interim and lowest fills, a status against capacity and the
 * 80% standard, the rented pallets (and any beyond the administrator's cap)
 * and the rent they cost.
 * @type {React.FC<{ w: WarehousePlanView }>}
 */
const FillTable = ({ w }) => {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('op.fill.col.week')}</TableHeaderCell>
          <TableHeaderCell>{t('op.fill.col.plan')}</TableHeaderCell>
          <TableHeaderCell>{t('op.fill.col.interim')}</TableHeaderCell>
          <TableHeaderCell>{t('op.fill.col.lowest')}</TableHeaderCell>
          <TableHeaderCell>{t('op.fill.col.status')}</TableHeaderCell>
          <TableHeaderCell>{t('op.fill.col.rented')}</TableHeaderCell>
          <TableHeaderCell>{t('op.fill.col.rentCost')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {w.weeks.map((wk) => {
            const status =
              wk.fill === null
                ? null
                : wk.fill > 1
                  ? 'over'
                  : wk.fill > STANDARD
                    ? 'above'
                    : 'within';
            return (
              <TableRow key={wk.weekStart} data-testid={`op-fill-${wk.weekStart}`}>
                <TableCell className="whitespace-nowrap">
                  <Data>{weekLabel(wk.weekStart)}</Data>
                  <div className="text-xs text-text-tertiary">
                    <Data>{formatDate(wk.weekStart)}</Data>
                  </div>
                </TableCell>
                <TableCell>
                  <Data data-testid={`op-fill-plan-${wk.weekStart}`}>{pct(wk.fill)}</Data>
                  <div className="text-xs text-text-tertiary">
                    <Data>
                      {t('op.warehouse.pallets', { value: formatNumber(Math.round(wk.pallets)) })}
                    </Data>
                  </div>
                </TableCell>
                <TableCell>
                  <Data className="text-text-secondary">{pct(wk.interimFill)}</Data>
                </TableCell>
                <TableCell>
                  <Data className="text-text-secondary">{pct(wk.lowestFill)}</Data>
                </TableCell>
                <TableCell>
                  {status && (
                    <StatusPill
                      variant={
                        status === 'over' ? 'danger' : status === 'above' ? 'warning' : 'success'
                      }
                    >
                      {t(`op.fill.status.${status}`)}
                    </StatusPill>
                  )}
                </TableCell>
                <TableCell>
                  <Data data-testid={`op-rented-${wk.weekStart}`}>
                    {formatNumber(Math.round(wk.rentedPallets))}
                  </Data>
                  {wk.beyondCapPallets > 0 && (
                    <div className="text-xs text-danger" data-testid={`op-beyond-${wk.weekStart}`}>
                      {t('op.fill.beyondCap', {
                        value: formatNumber(Math.round(wk.beyondCapPallets))
                      })}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Data data-testid={`op-rent-${wk.weekStart}`}>
                    {formatIDR(Math.round(wk.rentIdr))}
                  </Data>
                </TableCell>
              </TableRow>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default FillTable;
