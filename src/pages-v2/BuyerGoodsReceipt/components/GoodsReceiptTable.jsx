/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { useEnumLabel } from '@hooks/useEnumLabel' */
/** @import { GoodsReceipt, Supplier } from '@services/data/types' */
import { ChevronRight } from 'lucide-react';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import { COUNTRY_FLAG, STATUS_VARIANT } from '../const';
import { formatDate } from '../utils';

/**
 * @typedef {object} GoodsReceiptTableProps
 * @property {GoodsReceipt[]} filtered The rows after tab, date and search filters.
 * @property {Map<string, Supplier>} supplierById Supplier lookup, for the country line.
 * @property {(id: string) => void} onSelect Opens a GR in the side panel.
 * @property {TFunction} t
 * @property {ReturnType<typeof useEnumLabel>} el Localizes the disposition token.
 */

/**
 * The goods-receipt list: one row per GR with its references, supplier,
 * received date and receiver, item count, status, disposition and SAP
 * document; a click opens the side panel. Moved out of
 * `BuyerGoodsReceipt.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<GoodsReceiptTableProps>}
 */
const GoodsReceiptTable = ({ filtered, supplierById, onSelect, t, el }) => (
  <div className="border border-border-subtle rounded-lg bg-white overflow-hidden">
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('goodsReceipt.table.col.grRefs')}</TableHeaderCell>
        <TableHeaderCell>{t('goodsReceipt.table.col.supplier')}</TableHeaderCell>
        <TableHeaderCell>{t('goodsReceipt.table.col.received')}</TableHeaderCell>
        <TableHeaderCell>{t('goodsReceipt.table.col.receivedBy')}</TableHeaderCell>
        <TableHeaderCell>{t('goodsReceipt.table.col.items')}</TableHeaderCell>
        <TableHeaderCell>{t('goodsReceipt.table.col.status')}</TableHeaderCell>
        <TableHeaderCell>{t('goodsReceipt.table.col.disposition')}</TableHeaderCell>
        <TableHeaderCell>{t('goodsReceipt.table.col.sapDoc')}</TableHeaderCell>
        <TableHeaderCell> </TableHeaderCell>
      </TableHeader>
      <tbody>
        {filtered.map((g) => {
          const sup = supplierById.get(g.supplierId);
          return (
            <TableRow key={g.id} className="cursor-pointer" onClick={() => onSelect(g.id)}>
              <TableCell>
                <div className="font-semibold text-text-primary">
                  <Data>{g.grNumber}</Data>
                </div>
                <Data as="div" className="text-xs text-text-tertiary">
                  {g.asnNumber} · {g.poNumber}
                </Data>
                {/* REQ-E07-06 — goods received with no ASN, said plainly. */}
                {!g.asnNumber && (
                  <span
                    className="text-xs text-warning-hover"
                    data-testid={`gr-without-asn-${g.id}`}
                  >
                    {t('oc.drill.receipt.withoutAsn')}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm text-text-primary">{g.supplierName}</div>
                <div className="text-xs text-text-tertiary">
                  {sup ? (COUNTRY_FLAG[sup.country] ?? sup.country) : '—'}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-text-secondary">
                  <Data>{formatDate(g.receivedDate)}</Data>
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-text-secondary">{g.receivedBy}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-text-primary">
                  {g.inspectionResults.length === 1
                    ? t('goodsReceipt.items.count.one', { count: g.inspectionResults.length })
                    : t('goodsReceipt.items.count.other', {
                        count: g.inspectionResults.length
                      })}
                </span>
              </TableCell>
              <TableCell>
                <StatusPill variant={STATUS_VARIANT[g.status]}>{g.status}</StatusPill>
              </TableCell>
              <TableCell>
                <span className="text-sm text-text-secondary">{el(g.disposition)}</span>
              </TableCell>
              <TableCell>
                <Data className="text-xs text-text-secondary">{g.sapMaterialDoc ?? '—'}</Data>
              </TableCell>
              <TableCell className="text-right">
                <ChevronRight size={16} className="text-text-tertiary inline" />
              </TableCell>
            </TableRow>
          );
        })}
        {filtered.length === 0 && (
          <tr>
            <td colSpan={9} className="py-10 text-center text-sm text-text-tertiary">
              {t('goodsReceipt.table.empty')}
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  </div>
);

export default GoodsReceiptTable;
