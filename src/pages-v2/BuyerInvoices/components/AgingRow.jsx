/** @import React from 'react' */
import StatusPill from '@components/ui-v2/StatusPill';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';

/**
 * @typedef {object} AgingRowProps
 * @property {{ bucket: string; amount: number; count: number; risk: 'success' | 'warning' | 'danger'; riskLabel: string }} row
 *   One aging bucket (`AGING_DATA` in `AgingTab`).
 * @property {string} pct  The bucket's share of total AP, formatted by `AgingTab`.
 * @property {(bucket: string) => string} agingBucketLabel  The bucket's display label.
 */

/**
 * One row of the aging table: bucket, count, amount, share of AP and risk
 * pill (amount, share and pill only when the bucket holds money). Moved out of
 * `BuyerInvoices.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<AgingRowProps>}
 */
const AgingRow = ({ row, pct, agingBucketLabel }) => (
  <TableRow>
    <TableCell>
      <span className="font-semibold text-text-primary">{agingBucketLabel(row.bucket)}</span>
    </TableCell>
    <TableCell className="text-right text-text-secondary">{row.count}</TableCell>
    <TableCell className="text-right">
      <Data
        className={`font-semibold ${row.amount > 0 ? 'text-text-primary' : 'text-text-tertiary'}`}
      >
        {row.amount > 0 ? `Rp ${row.amount}jT` : '—'}
      </Data>
    </TableCell>
    <TableCell className="text-right text-text-secondary">
      <Data>{row.amount > 0 ? `${pct}%` : '—'}</Data>
    </TableCell>
    <TableCell>
      {row.amount > 0 && <StatusPill variant={row.risk}>{row.riskLabel}</StatusPill>}
    </TableCell>
  </TableRow>
);

export default AgingRow;
