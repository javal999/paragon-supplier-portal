/** @import React from 'react' */
import { useTranslation } from 'react-i18next';

import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { formatDate } from '@lib/format';
/** @import { SupplierApplication } from '@services/data/types' */
import { STATUS_VARIANT } from '../const';

/**
 * @typedef {object} ApplicationsTableProps
 * @property {SupplierApplication[]} rows      the filtered rows, in render order
 * @property {(id: string) => void} onSelect   opens the review panel on a row
 */

/**
 * The application roster: number, company, request type, declared-count,
 * submitted date and toned status, one clickable row per application.
 * Moved out of `BuyerSupplierApplications` by the Phase 5 page split.
 * @type {React.FC<ApplicationsTableProps>}
 */
const ApplicationsTable = ({ rows, onSelect }) => {
  const { t } = useTranslation();

  /**
   * @param {SupplierApplication} a
   * @returns {string}
   */
  const declaredLabel = (a) =>
    a.declarations.length === 0
      ? t('applications.declared.none')
      : a.declarations.length === 1
        ? t('applications.declared.count.one', { count: 1 })
        : t('applications.declared.count.other', { count: a.declarations.length });

  return (
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('applications.col.number')}</TableHeaderCell>
        <TableHeaderCell>{t('applications.col.company')}</TableHeaderCell>
        <TableHeaderCell>{t('applications.col.type')}</TableHeaderCell>
        <TableHeaderCell>{t('applications.col.declared')}</TableHeaderCell>
        <TableHeaderCell>{t('applications.col.submitted')}</TableHeaderCell>
        <TableHeaderCell>{t('applications.col.status')}</TableHeaderCell>
      </TableHeader>
      <tbody>
        {rows.map((a) => (
          <TableRow
            key={a.id}
            onClick={() => onSelect(a.id)}
            data-testid={`application-row-${a.applicationNumber}`}
          >
            <TableCell>
              <Data>{a.applicationNumber}</Data>
            </TableCell>
            <TableCell>{a.companyName}</TableCell>
            <TableCell>{a.requestType}</TableCell>
            <TableCell>{declaredLabel(a)}</TableCell>
            <TableCell>
              <Data>{formatDate(a.submittedAt)}</Data>
            </TableCell>
            <TableCell>
              {/* Material G1 (MR-10 BR-10) — an accepted application is
                  not an Approved vendor, so the state reads as its own
                  label; the state name `Approved` is unchanged. */}
              <StatusPill variant={STATUS_VARIANT[a.status]}>
                {a.status === 'Approved' ? t('applications.status.accepted') : a.status}
              </StatusPill>
            </TableCell>
          </TableRow>
        ))}
      </tbody>
    </Table>
  );
};

export default ApplicationsTable;
