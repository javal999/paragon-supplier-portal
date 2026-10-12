/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseRequisition } from '@services/data/types' */
import { ChevronRight } from 'lucide-react';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { formatNumber, formatIDR, formatDate } from '@lib/format';
import { STATUS_VARIANT } from '../const';

/**
 * @typedef {object} RequisitionTableProps
 * @property {PurchaseRequisition[]} filtered The rows that pass the status tab and the search.
 * @property {(pr: PurchaseRequisition) => void} onSelect Opens the row's detail panel.
 * @property {TFunction} t
 */

/**
 * The requisition list: one clickable row per filtered requisition (number,
 * material, category, quantity, required date, value, requestor, status,
 * source of supply, linked document), or the empty row. Moved out of
 * `BuyerRequisitions.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<RequisitionTableProps>}
 */
const RequisitionTable = ({ filtered, onSelect, t }) => (
  <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('requisitions.table.col.pr')}</TableHeaderCell>
        <TableHeaderCell>{t('requisitions.table.col.material')}</TableHeaderCell>
        <TableHeaderCell>{t('requisitions.table.col.category')}</TableHeaderCell>
        <TableHeaderCell className="text-right">{t('requisitions.table.col.qty')}</TableHeaderCell>
        <TableHeaderCell>{t('requisitions.table.col.required')}</TableHeaderCell>
        <TableHeaderCell className="text-right">
          {t('requisitions.table.col.estValue')}
        </TableHeaderCell>
        <TableHeaderCell>{t('requisitions.table.col.requestor')}</TableHeaderCell>
        <TableHeaderCell>{t('requisitions.table.col.status')}</TableHeaderCell>
        <TableHeaderCell>{t('requisitions.table.col.source')}</TableHeaderCell>
        <TableHeaderCell>{t('requisitions.table.col.linkedDoc')}</TableHeaderCell>
        <TableHeaderCell className="text-right">
          {t('requisitions.table.col.actions')}
        </TableHeaderCell>
      </TableHeader>
      <tbody>
        {filtered.map((pr) => {
          const hasPIR = pr.sourceOfSupply === 'PIR exists';
          return (
            <TableRow key={pr.id} className="cursor-pointer" onClick={() => onSelect(pr)}>
              <TableCell>
                <Data as="div" className="text-xs font-semibold text-text-primary">
                  {pr.prNumber}
                </Data>
              </TableCell>
              <TableCell>
                <div className="font-semibold text-text-primary">{pr.material}</div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-text-secondary">{pr.category}</span>
              </TableCell>
              <TableCell className="text-right whitespace-nowrap text-sm text-text-primary">
                <Data>
                  {formatNumber(pr.quantity)} {pr.uom}
                </Data>
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-text-secondary">
                <Data>{formatDate(pr.requiredDate)}</Data>
              </TableCell>
              <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                <Data>{formatIDR(pr.estimatedValue, { compact: true })}</Data>
              </TableCell>
              <TableCell>
                <span className="text-sm text-text-secondary">{pr.requestor}</span>
              </TableCell>
              <TableCell>
                <StatusPill variant={STATUS_VARIANT[pr.status]}>{pr.status}</StatusPill>
              </TableCell>
              <TableCell>
                <StatusPill variant={hasPIR ? 'success' : 'warning'}>
                  {hasPIR ? 'PIR' : t('requisitions.source.none')}
                </StatusPill>
              </TableCell>
              <TableCell>
                <Data
                  className={`text-xs ${pr.linkedDoc ? 'text-text-primary' : 'text-text-tertiary'}`}
                >
                  {pr.linkedDoc || '—'}
                </Data>
              </TableCell>
              <TableCell className="text-right">
                <ChevronRight size={16} className="text-text-tertiary inline-block" />
              </TableCell>
            </TableRow>
          );
        })}
        {filtered.length === 0 && (
          <tr>
            <td colSpan={11} className="text-center text-sm text-text-tertiary py-10">
              {t('requisitions.table.empty')}
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  </div>
);

export default RequisitionTable;
