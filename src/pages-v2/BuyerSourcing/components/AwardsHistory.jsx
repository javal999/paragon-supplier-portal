/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { AwardView } from '@services/sourcing/views' */
import { useState } from 'react';
import { ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import { isTieredRfq } from '@services/sourcing/rfqComparison';
import { formatDate, formatIDR } from '@lib/format';

/**
 * The awarded supplier cell. BL-37 — a split names EVERY awarded supplier,
 * read from the award record; the principal alone would hide the rest of the
 * split.
 * @param {{ r: RFQ; rec: AwardView | undefined; supplierNameById: Map<string, string>; t: TFunction }} args
 * @returns {React.ReactNode}
 */
const awardedSuppliers = ({ r, rec, supplierNameById, t }) => {
  const names = rec
    ? [...new Set(rec.lines.map((l) => l.supplierId))].map((id) => supplierNameById.get(id) ?? id)
    : [];
  if (names.length > 1) {
    return (
      <>
        {names.join(', ')}
        <div className="text-xs text-text-tertiary">
          {
            /** @type {AwardView} */ (rec).lines.some((l) => l.itemLineNo !== undefined) &&
            isTieredRfq(r)
              ? t('rfqCompare.history.split')
              : null
          }
        </div>
      </>
    );
  }
  return r.awardedSupplierId ? (supplierNameById.get(r.awardedSupplierId) ?? '—') : '—';
};

/**
 * Awards history: the awarded RFQs in a collapsible section (open by
 * default), each row opening the side panel. Owns its open/closed state —
 * nothing else reads it. Moved out of `BuyerSourcing.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<{
 *   awarded: readonly RFQ[];
 *   awardByRfq: Map<string, AwardView>;
 *   supplierNameById: Map<string, string>;
 *   onOpen: (r: RFQ) => void;
 *   t: TFunction;
 * }>}
 */
const AwardsHistory = ({ awarded, awardByRfq, supplierNameById, onOpen, t }) => {
  const [awardsOpen, setAwardsOpen] = useState(true);
  return (
    <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setAwardsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-bg-hover transition-colors"
      >
        <div className="text-left">
          <h2 className="text-section text-text-primary">{t('sourcing.awards.title')}</h2>
          <p className="text-meta text-text-tertiary">
            {t(awarded.length === 1 ? 'sourcing.awards.count.one' : 'sourcing.awards.count.other', {
              count: awarded.length
            })}
          </p>
        </div>
        {awardsOpen ? (
          <ChevronUp size={16} className="text-text-tertiary" />
        ) : (
          <ChevronDown size={16} className="text-text-tertiary" />
        )}
      </button>
      {awardsOpen && (
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('sourcing.awards.col.rfq')}</TableHeaderCell>
            <TableHeaderCell>{t('sourcing.awards.col.title')}</TableHeaderCell>
            <TableHeaderCell>{t('sourcing.awards.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('sourcing.awards.col.date')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('sourcing.awards.col.value')}
            </TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('sourcing.awards.col.actions')}
            </TableHeaderCell>
          </TableHeader>
          <tbody>
            {awarded.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => onOpen(r)}>
                <TableCell className="font-semibold text-text-primary">
                  <Data>{r.rfqNumber}</Data>
                </TableCell>
                <TableCell className="text-sm text-text-secondary">{r.title}</TableCell>
                <TableCell
                  className="text-sm text-text-primary"
                  data-testid={`award-history-supplier-${r.id}`}
                >
                  {awardedSuppliers({ r, rec: awardByRfq.get(r.id), supplierNameById, t })}
                </TableCell>
                <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                  <Data>{formatDate(r.awardDeadline)}</Data>
                </TableCell>
                <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                  <Data>{formatIDR(r.estimatedValue)}</Data>
                </TableCell>
                <TableCell className="text-right">
                  <ChevronRight size={16} className="text-text-tertiary inline-block" />
                </TableCell>
              </TableRow>
            ))}
            {awarded.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-sm text-text-tertiary py-10">
                  {t('sourcing.awards.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}
    </section>
  );
};

export default AwardsHistory;
