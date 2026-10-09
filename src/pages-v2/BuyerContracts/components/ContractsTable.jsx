/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { Contract } from '@data/mockContracts' */
/** @import { Supplier } from '@services/data/types' */
/** @import { ContractDisplayStatus } from '@services/data/contractExpiry' */
import { ChevronRight, RefreshCw } from 'lucide-react';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import ScoreBadge from '@components/ui-v2/ScoreBadge';
import Data from '@components/ui-v2/Data';
import { daysUntil } from '@services/data/dayProjection';
import ExpiryCell from './ExpiryCell';
import { COUNTRY_FLAG, STATUS_VARIANT } from '../const';
import { formatDate, formatIDR, typeLabel } from '../utils';

/**
 * @typedef {object} ContractsTableProps
 * @property {Contract[]} filtered The rows that pass the tab, type and search filters.
 * @property {Map<string, Supplier>} supplierById Supplier lookup for the name and country.
 * @property {(c: Contract) => ContractDisplayStatus} displayOf The row's computed display status.
 * @property {string} nowIso The one clock read the expiry figures are answered against.
 * @property {(c: Contract) => void} openContract Opens the contract's detail page.
 * @property {TFunction} t
 */

/**
 * The contract list: one clickable row per filtered contract (number, supplier,
 * type, period, expiry, value, performance, status), or the empty row. Moved
 * out of `BuyerContracts.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<ContractsTableProps>}
 */
const ContractsTable = ({ filtered, supplierById, displayOf, nowIso, openContract, t }) => (
  <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-8">
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('contracts.table.col.number')}</TableHeaderCell>
        <TableHeaderCell>{t('contracts.table.col.supplier')}</TableHeaderCell>
        <TableHeaderCell>{t('contracts.table.col.type')}</TableHeaderCell>
        <TableHeaderCell>{t('contracts.table.col.period')}</TableHeaderCell>
        <TableHeaderCell>{t('contracts.table.col.expiry')}</TableHeaderCell>
        <TableHeaderCell className="text-right">{t('contracts.table.col.value')}</TableHeaderCell>
        <TableHeaderCell>{t('contracts.table.col.performance')}</TableHeaderCell>
        <TableHeaderCell>{t('contracts.table.col.status')}</TableHeaderCell>
        <TableHeaderCell className="text-right">{t('contracts.table.col.actions')}</TableHeaderCell>
      </TableHeader>
      <tbody>
        {filtered.map((c) => {
          const supplier = supplierById.get(c.supplierId);
          return (
            <TableRow key={c.id} className="cursor-pointer" onClick={() => openContract(c)}>
              <TableCell>
                <Data as="div" className="font-semibold text-text-primary">
                  {c.contractNumber}
                </Data>
                <div className="text-xs text-text-tertiary mt-0.5">{c.title}</div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-text-primary">{supplier?.name ?? c.supplierId}</div>
                {supplier && (
                  <div className="text-xs text-text-tertiary mt-0.5">
                    {COUNTRY_FLAG[supplier.country] ?? supplier.country}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <StatusPill variant="neutral">{typeLabel(t, c.type)}</StatusPill>
              </TableCell>
              <TableCell>
                <div className="text-sm text-text-secondary whitespace-nowrap">
                  <Data>{formatDate(c.startDate)}</Data> → <Data>{formatDate(c.endDate)}</Data>
                </div>
                {c.autoRenewal && (
                  <div className="text-xs text-info mt-0.5 inline-flex items-center gap-1">
                    <RefreshCw size={10} /> {t('contracts.table.autoRenew')}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <ExpiryCell days={daysUntil(c.endDate, nowIso)} display={displayOf(c)} />
              </TableCell>
              <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                <Data>{c.value > 0 ? formatIDR(c.value) : '—'}</Data>
              </TableCell>
              <TableCell>
                {c.performanceScore > 0 ? (
                  <div className="w-32">
                    <ScoreBadge score={c.performanceScore} size="sm" variant="bar" />
                  </div>
                ) : (
                  <span className="text-xs text-text-tertiary">—</span>
                )}
              </TableCell>
              <TableCell>
                <StatusPill variant={STATUS_VARIANT[displayOf(c)]}>{displayOf(c)}</StatusPill>
              </TableCell>
              <TableCell className="text-right">
                <ChevronRight size={16} className="text-text-tertiary inline-block" />
              </TableCell>
            </TableRow>
          );
        })}
        {filtered.length === 0 && (
          <tr>
            <td colSpan={9} className="text-center text-sm text-text-tertiary py-10">
              {t('contracts.table.empty')}
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  </div>
);

export default ContractsTable;
