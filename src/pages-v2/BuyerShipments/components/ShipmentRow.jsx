/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { Shipment } from '@data/mockShipments' */
/** @import { ASN, CallOffWarning, Supplier } from '@services/data/types' */
/** @import { ShipmentDisplayState } from '@services/data/shipmentDisplayState' */
/** @import { useModeLabel } from '@hooks/useModeLabel' */
import { ChevronRight } from 'lucide-react';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { daysLate } from '@services/data/shipmentDisplayState';
import { AsnPlannerMarkers } from '../../shipments/CallOffWarnings';
import { COUNTRY_FLAG, MODE_ICON, STATUS_VARIANT, TODAY } from '../const';
import { formatDate, formatNumber } from '../utils';

/**
 * @typedef {object} ShipmentRowProps
 * @property {Shipment} s
 * @property {Supplier | undefined} sup  The shipment's supplier, for the country cell.
 * @property {{ asn: ASN; warnings: CallOffWarning[] } | undefined} asnEntry
 *   The shipment's ASN with its CURRENT call-off warnings, when there is one.
 * @property {(s: Shipment) => ShipmentDisplayState} displayOf  The page's one classification.
 * @property {(id: string) => void} onSelect  Opens the side panel on this row.
 * @property {ReturnType<typeof useModeLabel>} ml  The mode-label translator.
 * @property {TFunction} t
 */

/**
 * One shipment row: ASN / PO with planner markers, supplier, mode, route,
 * dates (ETA in danger when late), packages, dock, status pill. Moved out of
 * `BuyerShipments.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<ShipmentRowProps>}
 */
const ShipmentRow = ({ s, sup, asnEntry, displayOf, onSelect, ml, t }) => {
  const Icon = MODE_ICON[s.mode];
  // ⚠️ THE PAGE'S SECOND `is it late?` PREDICATE IS GONE. This read
  // `(s.delayDays ?? 0) > 0` — a stored field answering the same
  // question the pill answers from the classifier. It agreed only
  // because ONE row of eighteen carried the field; every other row
  // was acquitted by `?? 0` rather than by a measurement.
  const late = displayOf(s) === 'Delayed';
  const lateBy = daysLate(s, TODAY);
  return (
    <TableRow className="cursor-pointer" onClick={() => onSelect(s.id)}>
      <TableCell>
        <Data as="div" className="font-semibold text-text-primary">
          {s.asnNumber}
        </Data>
        <Data as="div" className="text-xs text-text-tertiary">
          {s.poNumber}
        </Data>
        {asnEntry ? (
          <div className="mt-1">
            <AsnPlannerMarkers asn={asnEntry.asn} warnings={asnEntry.warnings} />
          </div>
        ) : null}
      </TableCell>
      <TableCell>
        {/* i18n-defer: mock/sample data — supplier proper nouns */}
        <div className="text-sm text-text-primary">{s.supplierName}</div>
        <div className="text-xs text-text-tertiary">
          {sup ? (COUNTRY_FLAG[sup.country] ?? sup.country) : '—'}
        </div>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
          <Icon size={14} />
          {ml(s.mode)}
        </span>
      </TableCell>
      <TableCell>
        <div className="text-xs text-text-secondary">{s.origin}</div>
        <div className="text-xs text-text-tertiary">→ {s.destination}</div>
      </TableCell>
      <TableCell>
        <Data as="span" className="text-sm text-text-secondary">
          {formatDate(s.shipDate)}
        </Data>
      </TableCell>
      <TableCell>
        <Data
          as="div"
          className={`text-sm ${late ? 'text-danger font-semibold' : 'text-text-primary'}`}
        >
          {formatDate(s.estimatedArrival)}
        </Data>
        {late && lateBy !== null && (
          <div className="text-xs text-danger">
            {t('shipments.table.daysLate', { days: lateBy })}
          </div>
        )}
      </TableCell>
      <TableCell>
        <Data as="div" className="text-sm text-text-primary">
          {formatNumber(s.packageCount)}
        </Data>
        <Data as="div" className="text-xs text-text-tertiary">
          {formatNumber(s.totalWeight)} kg
        </Data>
      </TableCell>
      <TableCell>
        <span className="text-sm text-text-secondary">{s.dockAssignment ?? '—'}</span>
      </TableCell>
      <TableCell>
        <StatusPill variant={STATUS_VARIANT[displayOf(s)]}>{displayOf(s)}</StatusPill>
      </TableCell>
      <TableCell className="text-right">
        <ChevronRight size={16} className="text-text-tertiary inline" />
      </TableCell>
    </TableRow>
  );
};

export default ShipmentRow;
