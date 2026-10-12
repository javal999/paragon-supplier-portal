/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { Shipment } from '@data/mockShipments' */
/** @import { ASN, CallOffWarning, Supplier } from '@services/data/types' */
/** @import { ShipmentDisplayState } from '@services/data/shipmentDisplayState' */
/** @import { useModeLabel } from '@hooks/useModeLabel' */
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import ShipmentRow from './ShipmentRow';

/**
 * @typedef {object} ShipmentsTableProps
 * @property {Shipment[]} filtered  The rows left after the PO drill, tab, mode and search filters.
 * @property {Map<string, Supplier>} supplierById
 * @property {Map<string, { asn: ASN; warnings: CallOffWarning[] }>} asnByNumber
 *   Each ASN with its CURRENT call-off warnings (MR-6 BR-12).
 * @property {(s: Shipment) => ShipmentDisplayState} displayOf  The page's one classification.
 * @property {(id: string) => void} onSelect  Opens the side panel on a row.
 * @property {ReturnType<typeof useModeLabel>} ml  The mode-label translator.
 * @property {TFunction} t
 */

/**
 * The shipments table: header, one row per filtered shipment, and the empty
 * row when the filters leave none. Moved out of `BuyerShipments.jsx` by the
 * Phase 5 page split (no behaviour change).
 * @type {React.FC<ShipmentsTableProps>}
 */
const ShipmentsTable = ({ filtered, supplierById, asnByNumber, displayOf, onSelect, ml, t }) => (
  <div className="border border-border-subtle rounded-lg bg-white overflow-hidden mb-6">
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('shipments.table.col.asnPo')}</TableHeaderCell>
        <TableHeaderCell>{t('shipments.table.col.supplier')}</TableHeaderCell>
        <TableHeaderCell>{t('shipments.table.col.mode')}</TableHeaderCell>
        <TableHeaderCell>{t('shipments.table.col.route')}</TableHeaderCell>
        <TableHeaderCell>{t('shipments.table.col.shipDate')}</TableHeaderCell>
        <TableHeaderCell>{t('shipments.table.col.eta')}</TableHeaderCell>
        <TableHeaderCell>{t('shipments.table.col.packages')}</TableHeaderCell>
        <TableHeaderCell>{t('shipments.table.col.dock')}</TableHeaderCell>
        <TableHeaderCell>{t('shipments.table.col.status')}</TableHeaderCell>
        <TableHeaderCell> </TableHeaderCell>
      </TableHeader>
      <tbody>
        {filtered.map((s) => (
          <ShipmentRow
            key={s.id}
            s={s}
            sup={supplierById.get(s.supplierId)}
            asnEntry={asnByNumber.get(s.asnNumber)}
            displayOf={displayOf}
            onSelect={onSelect}
            ml={ml}
            t={t}
          />
        ))}
        {filtered.length === 0 && (
          <tr>
            <td colSpan={10} className="py-10 text-center text-sm text-text-tertiary">
              {t('shipments.table.empty')}
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  </div>
);

export default ShipmentsTable;
