/** @import React from 'react' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { formatDate } from '@lib/format';
import { money } from '../../rfx/rfxDisplay';

/**
 * REQ-E03-05 AC-03 — every quote version, kept and viewable: one row per
 * quotation (superseded ones included), by supplier then round. The page
 * renders it only when some version has been superseded. Moved out of
 * `BuyerSourcingEvent.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{
 *   allQuotes: Quotation[];
 *   currency: RFQ['currency'];
 *   supplierName: (id: string) => string;
 * }>}
 */
const QuoteVersionsSection = ({ allQuotes, currency, supplierName }) => {
  const { t } = useTranslation();
  return (
    <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
      <div className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary">
        {t('rfx.cmp.versions')}
      </div>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rfx.supplier')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.cmp.roundColumn')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.cmp.row.unitPrice')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.cmp.row.leadTime')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.deadline')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {[...allQuotes]
            .sort(
              (a, b) =>
                a.supplierId.localeCompare(b.supplierId) ||
                (a.roundNumber ?? 0) - (b.roundNumber ?? 0)
            )
            .map((q) => (
              <TableRow key={q.id} data-testid={`quote-version-${q.id}`}>
                <TableCell>{supplierName(q.supplierId)}</TableCell>
                <TableCell>
                  {(q.roundNumber ?? 0) === 0
                    ? t('rfx.cmp.originalQuote')
                    : t('rfx.cmp.round', { round: q.roundNumber })}
                </TableCell>
                <TableCell>
                  <Data>{money(q.unitPrice, q.currency ?? currency)}</Data>
                </TableCell>
                <TableCell>
                  <Data>
                    {q.leadTimeDays} {t('rfx.unit.days')}
                  </Data>
                </TableCell>
                <TableCell>
                  <Data>{formatDate(q.submittedAt)}</Data>
                </TableCell>
              </TableRow>
            ))}
        </tbody>
      </Table>
    </section>
  );
};

export default QuoteVersionsSection;
