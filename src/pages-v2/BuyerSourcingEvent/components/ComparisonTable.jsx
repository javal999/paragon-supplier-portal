/** @import React from 'react' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
/** @import { QuoteScore, ScoreStanding } from '@lib/quoteScore' */
/** @import { RfqSupplierGateView } from '@services/sourcing/views' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { compositeText } from '@lib/quoteScore';
import { eventPiecesAt, quoteTotalAt } from '@services/sourcing/rfqComparison';
import { documentsOf } from '@services/transitions/rfxDocumentRules';
import { DocumentsStatus } from '../../rfx/SupplierDocumentsPanel';
import { GateMarker, OtifOrNoHistory, money, qty } from '../../rfx/rfxDisplay';
import { byId } from '../utils';

/**
 * REQ-E03-05 AC-01 — the comparison table: one column per CURRENT bid (best
 * scored or tied marked in the header), the price / lead-time / MOQ / payment /
 * score rows, then the gate, reliability, weighted-score and (legacy RFQ only)
 * documents rows. On a tiered RFQ the price rows are read at the evaluation
 * break. Moved out of `BuyerSourcingEvent.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @type {React.FC<{
 *   rfq: RFQ;
 *   tiered: boolean;
 *   evalQty: number | null;
 *   current: Quotation[];
 *   currency: RFQ['currency'];
 *   supplierName: (id: string) => string;
 *   supplierOtif: (id: string) => number | null;
 *   gateOf: (supplierId: string) => RfqSupplierGateView | undefined;
 *   qualifies: (supplierId: string) => boolean;
 *   scoreById: Map<string, QuoteScore>;
 *   bestId: string | null;
 *   standing: ScoreStanding;
 *   tied: boolean;
 * }>}
 */
const ComparisonTable = ({
  rfq,
  tiered,
  evalQty,
  current,
  currency,
  supplierName,
  supplierOtif,
  gateOf,
  qualifies,
  scoreById,
  bestId,
  standing,
  tied
}) => {
  const { t } = useTranslation();

  /**
   * A tiered quote's figures AT THE EVALUATION BREAK — its total cost there and
   * that total per piece. `undefined` for a legacy RFQ, whose header figures
   * are the comparison, and for a quote with no price at the break.
   * @param {string} id
   * @returns {{ total: number; perPiece: number } | undefined}
   */
  const atBreak = (id) => {
    if (!tiered || evalQty === null) return undefined;
    const total = quoteTotalAt(rfq, byId(current, id), evalQty);
    const pieces = eventPiecesAt(rfq, evalQty);
    return total === null || pieces <= 0 ? undefined : { total, perPiece: total / pieces };
  };
  /**
   * The price rows say which break they are read at, on a tiered RFQ.
   * @param {string} labelKey
   * @returns {string}
   */
  const rowLabel = (labelKey) => {
    if (tiered && evalQty !== null && labelKey === 'rfx.cmp.row.unitPrice') {
      return t('rfqCompare.cmp.unitAtBreak', { qty: qty(evalQty) });
    }
    if (tiered && evalQty !== null && labelKey === 'rfx.cmp.row.totalPrice') {
      return t('rfqCompare.cmp.eventTotal', { qty: qty(evalQty) });
    }
    return t(labelKey);
  };

  return (
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('rfx.cmp.col.criterion')}</TableHeaderCell>
        {current.map((q) => (
          <TableHeaderCell key={q.id}>
            {supplierName(q.supplierId)}
            {!tied && q.id === bestId && (
              <StatusPill variant="success" className="ml-2">
                {t('rfx.cmp.best')}
              </StatusPill>
            )}
            {tied && standing.tiedIds.includes(q.id) && (
              <span className="ml-2" data-testid={`cmp-tied-${q.supplierId}`}>
                <StatusPill variant="success">{t('rfx.cmp.tied')}</StatusPill>
              </span>
            )}
            {(q.roundNumber ?? 0) > 0 && (
              <div className="text-xs font-normal normal-case text-text-tertiary">
                {t('rfx.cmp.round', { round: q.roundNumber })}
              </div>
            )}
          </TableHeaderCell>
        ))}
      </TableHeader>
      <tbody>
        {
          /** @type {const} */ ([
            [
              'rfx.cmp.row.unitPrice',
              /** @param {string} id */ (id) =>
                money(
                  atBreak(id)?.perPiece ?? byId(current, id).unitPrice,
                  byId(current, id).currency ?? currency
                )
            ],
            [
              'rfx.cmp.row.totalPrice',
              /** @param {string} id */ (id) =>
                money(
                  atBreak(id)?.total ?? byId(current, id).totalPrice,
                  byId(current, id).currency ?? currency
                )
            ],
            [
              'rfx.cmp.row.leadTime',
              /** @param {string} id */ (id) =>
                `${byId(current, id).leadTimeDays} ${t('rfx.unit.days')}`
            ],
            [
              'rfx.cmp.row.moq',
              /** @param {string} id */ (id) => {
                // Read once into a local so the `undefined` check narrows it — the
                // TS original used `!`; a cast through `ReturnType<typeof byId>`
                // loses `byId`'s generic and resolves to `{ id }`.
                const moq = byId(current, id).moq;
                return moq === undefined ? '—' : qty(moq);
              }
            ],
            [
              'rfx.cmp.row.payment',
              /** @param {string} id */ (id) => byId(current, id).paymentTermsOffered
            ],
            [
              'rfx.cmp.row.priceScore',
              /** @param {string} id */ (id) => String(scoreById.get(id)?.priceScore ?? '—')
            ],
            [
              'rfx.cmp.row.leadTimeScore',
              /** @param {string} id */ (id) => String(scoreById.get(id)?.leadTimeScore ?? '—')
            ]
          ]).map(([labelKey, render]) => (
            <TableRow key={labelKey} data-testid={`cmp-row-${labelKey}`}>
              <TableCell className="text-sm text-text-secondary">{rowLabel(labelKey)}</TableCell>
              {current.map((q) => (
                <TableCell key={q.id}>
                  <Data>{render(q.id)}</Data>
                </TableCell>
              ))}
            </TableRow>
          ))
        }
        {/* CR-23 — compliance is a GATE, not a weighted axis: this row
            says who is scored and names why a supplier is not. */}
        <TableRow data-testid="cmp-row-gate">
          <TableCell className="text-sm text-text-secondary">{t('rfx.cmp.row.gate')}</TableCell>
          {current.map((q) => (
            <TableCell key={q.id}>
              <GateMarker
                gate={gateOf(q.supplierId)}
                showPass
                testId={`cmp-gate-${q.supplierId}`}
              />
            </TableCell>
          ))}
        </TableRow>
        {/* The reliability axis names its source, because "50" with no
            explanation reads as a measurement rather than a default. */}
        <TableRow data-testid="cmp-row-reliability">
          <TableCell className="text-sm text-text-secondary">
            {t('rfx.cmp.row.reliabilityScore')}
          </TableCell>
          {current.map((q) => (
            <TableCell key={q.id}>
              <Data>{scoreById.get(q.id)?.reliabilityScore ?? '—'}</Data>
              <div className="text-xs text-text-tertiary">
                <OtifOrNoHistory
                  otif={supplierOtif(q.supplierId)}
                  testId={`cmp-otif-${q.supplierId}`}
                />
              </div>
            </TableCell>
          ))}
        </TableRow>
        <TableRow data-testid="cmp-row-weighted">
          <TableCell className="text-sm font-semibold text-text-primary">
            {t('rfx.cmp.row.weighted')}
          </TableCell>
          {current.map((q) => (
            <TableCell
              key={q.id}
              className={
                (tied ? standing.tiedIds.includes(q.id) : q.id === bestId) ? 'bg-success-soft' : ''
              }
            >
              {qualifies(q.supplierId) ? (
                <Data className="font-semibold">
                  {scoreById.has(q.id)
                    ? compositeText(
                        /** @type {import('@lib/quoteScore').QuoteScore} */ (scoreById.get(q.id)),
                        standing
                      )
                    : '—'}
                </Data>
              ) : (
                // BR-01a — the quote stays visible; it is not scored.
                <span
                  className="text-xs text-text-tertiary"
                  data-testid={`cmp-not-scored-${q.supplierId}`}
                >
                  {t('rfx.gate.notScored')}
                </span>
              )}
            </TableCell>
          ))}
        </TableRow>
        {/* BL-126 (CE-11l) — NR-1 buyer step 6 on a LEGACY RFQ: the
            required documents, per supplier. A tiered RFQ carries this
            row in its own comparison below, so it is not repeated here. */}
        {!tiered && (
          <TableRow data-testid="cmp-row-documents">
            <TableCell className="text-sm text-text-secondary">{t('rfxFiles.docs.row')}</TableCell>
            {current.map((q) => (
              <TableCell key={q.id}>
                <DocumentsStatus
                  requests={rfq.documentRequests ?? []}
                  documents={documentsOf(q)}
                  testId={`cmp-documents-${q.supplierId}`}
                />
              </TableCell>
            ))}
          </TableRow>
        )}
      </tbody>
    </Table>
  );
};

export default ComparisonTable;
