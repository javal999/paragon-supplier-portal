/** @import React from 'react' */
/** @import { RFQ } from '@data/mockRfqs' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { qty } from '../../rfx/rfxDisplay';

/**
 * REQ-E03-03 — the items being sourced, each answerable with its own price:
 * code, description, quantity and specification per line item. The page
 * renders it only when the RFQ has line items. Moved out of
 * `BuyerSourcingEvent.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{ lineItems: NonNullable<RFQ['lineItems']> }>}
 */
const EventItemsSection = ({ lineItems }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
      <div className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary">
        {t('rfx.event.items')}
      </div>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rfx.event.col.item')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.event.col.qty')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.event.col.spec')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {lineItems.map((li) => (
            <TableRow key={li.materialCode} data-testid={`event-item-${li.materialCode}`}>
              <TableCell>
                <Data>{li.materialCode}</Data>
                <div className="text-sm text-text-primary">{li.description}</div>
              </TableCell>
              <TableCell>
                <Data>
                  {qty(li.quantity)} {li.uom}
                </Data>
              </TableCell>
              <TableCell className="text-sm text-text-secondary">
                {li.specification ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default EventItemsSection;
