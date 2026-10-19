/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RFQ } from '@data/mockRfqs' */
import { ChevronRight } from 'lucide-react';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import { daysUntil } from '@services/data/dayProjection';
import { formatDate, formatIDR, formatNumber } from '@lib/format';
import { STATUS_VARIANT } from '../const';
import { categoryLabel } from '../utils';

/**
 * One board row: number, project tag and title, category, responses with a
 * bar, quantity, estimated value, the response deadline with its day-count
 * tone, and status. Clicking opens the side panel.
 * @type {React.FC<{ r: RFQ; nowIso: string; onOpen: (r: RFQ) => void; t: TFunction }>}
 */
const RfqBoardRow = ({ r, nowIso, onOpen, t }) => {
  const responded = r.respondedSupplierIds.length;
  const invited = r.invitedSupplierIds.length;
  const pct = invited === 0 ? 0 : (responded / invited) * 100;
  const days = daysUntil(r.responseDeadline, nowIso);
  const deadlineTone =
    r.status !== 'Open' || days === null
      ? 'text-text-secondary'
      : days < 3
        ? 'text-danger font-semibold'
        : days < 7
          ? 'text-warning-hover font-semibold'
          : 'text-text-secondary';
  return (
    <TableRow className="cursor-pointer" onClick={() => onOpen(r)}>
      <TableCell>
        <Data as="div" className="font-semibold text-text-primary">
          {r.rfqNumber}
        </Data>
        <div className="text-xs text-text-tertiary mt-0.5">
          {r.projectName && (
            <span
              className="inline-block mr-1.5 px-1.5 py-px rounded border border-border-subtle bg-bg-hover text-[length:var(--fs-label-3)] text-text-secondary"
              data-testid={`rfq-project-tag-${r.id}`}
            >
              {r.projectName}
            </span>
          )}
          {r.title}
        </div>
      </TableCell>
      <TableCell className="text-sm text-text-secondary">
        {categoryLabel(t, r.materialCategory)}
      </TableCell>
      <TableCell>
        <div className="text-sm text-text-primary font-medium">
          {responded} / {invited}
        </div>
        <div className="mt-1 h-1.5 w-24 rounded-full bg-bg-hover overflow-hidden">
          <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
        </div>
      </TableCell>
      <TableCell className="text-right text-sm text-text-secondary whitespace-nowrap">
        <Data>
          {formatNumber(r.totalQty)} {r.uom}
        </Data>
      </TableCell>
      <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
        <Data>{formatIDR(r.estimatedValue)}</Data>
      </TableCell>
      <TableCell>
        <Data as="div" className={`text-sm whitespace-nowrap ${deadlineTone}`}>
          {formatDate(r.responseDeadline)}
        </Data>
        {r.status === 'Open' && days !== null && (
          <div
            className={`text-xs mt-0.5 ${
              days < 0
                ? 'text-danger'
                : days < 3
                  ? 'text-danger'
                  : days < 7
                    ? 'text-warning-hover'
                    : 'text-text-tertiary'
            }`}
          >
            {days < 0
              ? t('sourcing.deadline.overdue', {
                  count: Math.abs(days)
                })
              : days === 0
                ? t('sourcing.deadline.dueToday')
                : t('sourcing.deadline.remaining', { count: days })}
          </div>
        )}
      </TableCell>
      <TableCell>
        <StatusPill variant={STATUS_VARIANT[r.status]}>{r.status}</StatusPill>
      </TableCell>
      <TableCell className="text-right">
        <ChevronRight size={16} className="text-text-tertiary inline-block" />
      </TableCell>
    </TableRow>
  );
};

/**
 * The board: every non-awarded RFQ the filters let through, or the empty row.
 * `nowIso` is the board's one clock read (`TODAY`). Moved out of
 * `BuyerSourcing.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{ rows: readonly RFQ[]; nowIso: string; onOpen: (r: RFQ) => void; t: TFunction }>}
 */
const RfqBoardTable = ({ rows, nowIso, onOpen, t }) => (
  <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-8">
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('sourcing.table.col.rfq')}</TableHeaderCell>
        <TableHeaderCell>{t('sourcing.table.col.category')}</TableHeaderCell>
        <TableHeaderCell>{t('sourcing.table.col.responses')}</TableHeaderCell>
        <TableHeaderCell className="text-right">{t('sourcing.table.col.qty')}</TableHeaderCell>
        <TableHeaderCell className="text-right">{t('sourcing.table.col.estValue')}</TableHeaderCell>
        <TableHeaderCell>{t('sourcing.table.col.responseDeadline')}</TableHeaderCell>
        <TableHeaderCell>{t('sourcing.table.col.status')}</TableHeaderCell>
        <TableHeaderCell className="text-right">{t('sourcing.table.col.actions')}</TableHeaderCell>
      </TableHeader>
      <tbody>
        {rows.map((r) => (
          <RfqBoardRow key={r.id} r={r} nowIso={nowIso} onOpen={onOpen} t={t} />
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={8} className="text-center text-sm text-text-tertiary py-10">
              {t('sourcing.table.empty')}
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  </div>
);

export default RfqBoardTable;
