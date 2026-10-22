/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseOrder } from '@services/data/types' */
import { ChevronRight } from 'lucide-react';
import StatusPill from '@components/ui-v2/StatusPill';
import { statusTone } from '@lib/statusTone';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import { completionMovedLater, poDisplayStatus } from '@services/data/poResponseProjection';
import { formatIDR, formatDate } from '@lib/format';
import { CHANNEL_ICON, COUNTRY_FLAG } from '../const';
import { isOverdue } from '../utils';

/**
 * @typedef {object} OrderRowProps
 * @property {PurchaseOrder} po  The row's PO.
 * @property {Map<string, string>} supplierCountryById  Supplier id → country code, for the flag.
 * @property {string} nowIso  The orders clock, for the display status.
 * @property {(po: PurchaseOrder) => void} setSelectedPO  Opens the panel on this PO.
 * @property {TFunction} t
 */

/**
 * One PO row of the worklist table: PO and PR numbers, supplier and country,
 * first material (+ more lines), order and delivery dates (overdue in red),
 * value, channel, display status and the chevron. Moved out of
 * `BuyerOrders.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<OrderRowProps>}
 */
const OrderRow = ({ po, supplierCountryById, nowIso, setSelectedPO, t }) => {
  const Channel = CHANNEL_ICON[po.channel];
  const overdue = isOverdue(po);
  const country = supplierCountryById.get(po.supplierId) ?? '';
  const firstLine = po.lineItems[0];
  const moreLines = po.lineItems.length - 1;
  return (
    <TableRow className="cursor-pointer" onClick={() => setSelectedPO(po)}>
      <TableCell>
        <Data as="div" className="font-semibold text-text-primary">
          {po.poNumber}
        </Data>
        {po.prReference && (
          <Data as="div" className="text-xs text-text-tertiary mt-0.5">
            {po.prReference}
          </Data>
        )}
      </TableCell>
      <TableCell>
        <div className="text-sm text-text-primary">{po.supplierName}</div>
        {country && (
          <div className="text-xs text-text-tertiary mt-0.5">
            {COUNTRY_FLAG[country] ?? country}
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="text-sm text-text-secondary">{firstLine?.description ?? '—'}</div>
        {moreLines > 0 && (
          <div className="text-xs text-text-tertiary mt-0.5">
            {t(
              moreLines === 1
                ? 'buyerOrders.table.moreLines.one'
                : 'buyerOrders.table.moreLines.other',
              { count: moreLines }
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="text-sm text-text-secondary whitespace-nowrap">
        <Data>{formatDate(po.orderDate)}</Data>
      </TableCell>
      <TableCell>
        <div
          className={`text-sm whitespace-nowrap ${
            overdue ? 'text-danger font-semibold' : 'text-text-secondary'
          }`}
        >
          <Data>{formatDate(po.requestedDeliveryDate)}</Data>
        </div>
        {overdue && (
          <div className="text-xs text-danger mt-0.5">
            {t('buyerOrders.table.overdue', { count: po.daysOverdue })}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
        <Data>{formatIDR(po.totalValue)}</Data>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
          <Channel size={14} className="text-text-tertiary" />
          {po.channel}
        </span>
      </TableCell>
      <TableCell>
        <StatusPill variant={statusTone(poDisplayStatus(po, nowIso))}>
          {poDisplayStatus(po, nowIso)}
        </StatusPill>
        {completionMovedLater(po) && (
          <div className="text-xs text-warning-hover mt-0.5">
            {t('oc.shipping.movedLaterShort')}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right">
        <ChevronRight size={16} className="text-text-tertiary inline-block" />
      </TableCell>
    </TableRow>
  );
};

export default OrderRow;
