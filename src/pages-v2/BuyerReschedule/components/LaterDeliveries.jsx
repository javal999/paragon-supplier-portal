/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
/** @import { WarehousePlanView } from '@services/data/types' */
/** @import { ShortfallWeek } from '@services/engine/orderSizing' */
import { qtyOf } from '../../materialPlan/planDisplay';
import { pal, weekLabel } from '../utils';

/**
 * What arrives by the week and whether moving it keeps safety stock — the "push out" option's detail.
 * @type {React.FC<{ sw: ShortfallWeek; plan: WarehousePlanView }>}
 */
const LaterDeliveries = ({ sw, plan }) => {
  const { t } = useTranslation();
  const nameOf = new Map(plan.materials.map((m) => /** @type {const} */ ([m.materialCode, m])));
  return (
    <div className="overflow-x-auto mt-3" data-testid={`rs-decide-later-${sw.weekStart}`}>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rs.decide.col.material')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.decide.col.delivery')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.decide.col.week')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.decide.col.quantity')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.decide.col.safety')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {sw.later.deliveries.map((d) => {
            const m = nameOf.get(d.materialCode);
            return (
              <TableRow
                key={`${d.materialCode}-${d.source}-${d.weekStart}`}
                data-testid={`rs-decide-delivery-${d.materialCode}-${d.source}-${d.weekStart}`}
              >
                <TableCell>
                  <div className="text-sm text-text-primary">
                    {m?.materialLabel ?? d.materialCode}
                  </div>
                  <Data className="text-xs text-text-tertiary">{d.materialCode}</Data>
                </TableCell>
                <TableCell>{t(`rs.decide.source.${d.source}`)}</TableCell>
                <TableCell>
                  <Data>{weekLabel(d.weekStart)}</Data>
                </TableCell>
                <TableCell>
                  <Data>{`${qtyOf(d.quantity, m?.uom ?? 'PCS')} ${m?.uom ?? ''}`.trim()}</Data>
                  <div className="text-xs text-text-tertiary">
                    <Data>{t('rs.decide.palletsUnit', { value: pal(d.pallets) })}</Data>
                  </div>
                </TableCell>
                <TableCell>
                  {d.keepsSafetyStock ? (
                    <StatusPill variant="success">{t('rs.decide.keeps')}</StatusPill>
                  ) : (
                    <StatusPill variant="warning">{t('rs.decide.breaks')}</StatusPill>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default LaterDeliveries;
