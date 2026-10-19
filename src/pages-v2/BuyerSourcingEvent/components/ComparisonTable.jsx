/** @import React from 'react' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
/** @import { QuoteScore, ScoreStanding } from '@lib/quoteScore' */
/** @import { RfqSupplierGateView } from '@services/sourcing/views' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { AXIS_LIVENESS, COMPOSITE_LIVENESS, compositeText } from '@lib/quoteScore';
import { formatMoney, formatNumber } from '@lib/format';
import { BASE_CURRENCY } from '@lib/currencyPolicy';
import { spreadForQuote } from '@lib/shouldCostSpread';
import { eventPiecesAt, quoteTotalAt } from '@services/sourcing/rfqComparison';
import { documentsOf } from '@services/transitions/rfxDocumentRules';
import { DocumentsStatus } from '../../rfx/SupplierDocumentsPanel';
import { GateMarker, OtifOrNoHistory, qty } from '../../rfx/rfxDisplay';
import { SPREAD_DEPS } from '../../BuyerSourcing/const';
import { byId } from '../utils';
import { RowTag, SpreadCell } from './ComparisonParts';

/**
 * REQ-E03-05 AC-01 — the comparison table: one column per CURRENT bid (best
 * scored or tied marked in the header), the price / lead-time / MOQ / payment /
 * score rows, then the gate, reliability, weighted-score and (legacy RFQ only)
 * documents rows. On a tiered RFQ the price rows are read at the evaluation
 * break. Moved out of `BuyerSourcingEvent.jsx` by the Phase 5 page split (no
 * behaviour change).
 *
 * RFx UX B-02 (owner ruling 2026-10-19) — what the board's side panel carried
 * moved here: price per UOM in the bid's own currency, the should-cost spread
 * row, the "Estimated" tag on both lead-time rows, "No minimum stated", and the
 * last row — each quote's status with "Move to review" (one act PER QUOTE, so
 * one `quotation:review` notice per quote), or on an Awarded RFQ the outcome.
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
 *   reviewAvailability: VerbAvailability;
 *   onReview: (quotationId: string) => void;
 *   reviewPending: boolean;
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
  tied,
  reviewAvailability,
  onReview,
  reviewPending
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
  /** @param {string} id */
  const currencyOf = (id) => byId(current, id).currency ?? currency ?? BASE_CURRENCY;
  /** @param {string} id */
  const unitOf = (id) => atBreak(id)?.perPiece ?? byId(current, id).unitPrice;
  const estimated = (
    <RowTag tag={t('sourcing.cmp.estimated')} title={t('sourcing.cmp.estimatedTitle')} />
  );
  // B-02 — the "Simulated" honesty marker the panel carried: an axis with no
  // live source (reliability), and the composite that inherits its weakest
  // link. Rendered from the same liveness constants, so it disappears by
  // itself the day the axis goes live.
  const simulated = (
    <RowTag tag={t('sourcing.cmp.simulated')} title={t('sourcing.cmp.simulatedTitle')} />
  );

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
            <div data-testid={`cmp-head-${q.supplierId}`}>
              {supplierName(q.supplierId)}
              {/* RFx UX X-03 — each pill says what it means on hover. */}
              {!tied && q.id === bestId && (
                <span className="inline-flex ml-2" title={t('rfx.cmp.best.tip')}>
                  <StatusPill variant="success">{t('rfx.cmp.best')}</StatusPill>
                </span>
              )}
              {!tied && q.id === bestId && COMPOSITE_LIVENESS === 'simulated' && (
                <span data-testid="cmp-best-simulated">{simulated}</span>
              )}
              {tied && standing.tiedIds.includes(q.id) && (
                <span
                  className="ml-2"
                  title={t('rfx.cmp.tied.tip')}
                  data-testid={`cmp-tied-${q.supplierId}`}
                >
                  <StatusPill variant="success">{t('rfx.cmp.tied')}</StatusPill>
                </span>
              )}
              {(q.roundNumber ?? 0) > 0 && (
                <div className="text-xs font-normal normal-case text-text-tertiary">
                  {t('rfx.cmp.round', { round: q.roundNumber })}
                </div>
              )}
            </div>
          </TableHeaderCell>
        ))}
      </TableHeader>
      <tbody>
        {
          /** @type {const} */ ([
            [
              'rfx.cmp.row.unitPrice',
              // B-02 — per UOM, in the bid's own currency and precision (the
              // panel's rendering: "€2.85/KG", never rounded to the unit).
              /** @param {string} id */ (id) =>
                `${formatMoney(unitOf(id), currencyOf(id))}/${rfq.uom}`,
              null
            ],
            [
              'sourcing.cmp.row.spread',
              // CI-2 — the should-cost-vs-quote spread, read-only, right under
              // unit price: a MODELED, banded reference, or honest silence with
              // its reason. Never fed into the score; never a verdict.
              /** @param {string} id */ (id) => (
                <SpreadCell
                  result={spreadForQuote(
                    rfq.materialIds?.[0],
                    rfq.uom,
                    unitOf(id),
                    currencyOf(id),
                    SPREAD_DEPS
                  )}
                  t={t}
                />
              ),
              null
            ],
            [
              'rfx.cmp.row.totalPrice',
              /** @param {string} id */ (id) =>
                formatMoney(atBreak(id)?.total ?? byId(current, id).totalPrice, currencyOf(id)),
              null
            ],
            [
              // CP-0 2e-b-1a — the lead time is a REQUIRED ESTIMATE at quote
              // stage, not a commitment. Still scored and ranked on; the tag
              // says what it is. The firm date is confirmed at PO.
              'rfx.cmp.row.leadTime',
              /** @param {string} id */ (id) =>
                `${byId(current, id).leadTimeDays} ${t('rfx.unit.days')}`,
              estimated
            ],
            [
              'rfx.cmp.row.moq',
              // CP-0 2e-b-2 — an ABSENT minimum is a real answer ("same as the
              // RFQ quantity"), so it reads as a sentence, never a 0 or a dash.
              /** @param {string} id */ (id) => {
                const moq = byId(current, id).moq;
                return moq === undefined ? (
                  <span className="text-text-tertiary">{t('sourcing.cmp.moqNone')}</span>
                ) : (
                  `${formatNumber(moq)} ${rfq.uom}`
                );
              },
              null
            ],
            [
              'rfx.cmp.row.payment',
              /** @param {string} id */ (id) => byId(current, id).paymentTermsOffered,
              null
            ],
            [
              'rfx.cmp.row.priceScore',
              /** @param {string} id */ (id) => String(scoreById.get(id)?.priceScore ?? '—'),
              null
            ],
            [
              'rfx.cmp.row.leadTimeScore',
              /** @param {string} id */ (id) => String(scoreById.get(id)?.leadTimeScore ?? '—'),
              estimated
            ]
          ]).map(([labelKey, render, tag]) => (
            <TableRow key={labelKey} data-testid={`cmp-row-${labelKey}`}>
              <TableCell className="text-sm text-text-secondary">
                {rowLabel(labelKey)}
                {tag}
              </TableCell>
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
            {AXIS_LIVENESS.reliability === 'simulated' && simulated}
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
            {COMPOSITE_LIVENESS === 'simulated' && simulated}
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
        {/* B-02 — the last row, moved from the side panel. Awarded: the ACTUAL
            outcome per quote (winner Awarded, others Rejected). Otherwise each
            quote's status, and on a `Submitted` quote the buyer's move to
            review (t_quotation_review, Submitted → Under Review) — or, for a
            seat without `quotation:review`, the owner IN THAT QUOTE'S CELL. */}
        {rfq.status === 'Awarded' ? (
          <TableRow data-testid="cmp-row-result">
            <TableCell className="text-sm text-text-secondary">
              {t('sourcing.cmp.row.result')}
            </TableCell>
            {current.map((q) => (
              <TableCell key={q.id}>
                <StatusPill
                  variant={
                    q.status === 'Awarded'
                      ? 'success'
                      : q.status === 'Rejected'
                        ? 'danger'
                        : 'neutral'
                  }
                >
                  {q.status}
                </StatusPill>
              </TableCell>
            ))}
          </TableRow>
        ) : (
          <TableRow data-testid="cmp-row-status">
            <TableCell className="text-sm text-text-secondary">
              {t('sourcing.cmp.row.status')}
            </TableCell>
            {current.map((q) => (
              <TableCell key={q.id}>
                <div className="flex flex-col items-start gap-1.5">
                  <StatusPill variant={q.status === 'Under Review' ? 'info' : 'neutral'}>
                    {q.status}
                  </StatusPill>
                  {q.status === 'Submitted' &&
                    (reviewAvailability.kind === 'held' ? (
                      <button
                        type="button"
                        onClick={() => onReview(q.id)}
                        disabled={reviewPending}
                        className="text-xs font-semibold text-action hover:text-action-hover disabled:opacity-50"
                      >
                        {t('sourcing.cmp.moveToReview')}
                      </button>
                    ) : (
                      <HandoffNotice
                        availability={reviewAvailability}
                        testId="handoff-rfq-review"
                      />
                    ))}
                </div>
              </TableCell>
            ))}
          </TableRow>
        )}
      </tbody>
    </Table>
  );
};

export default ComparisonTable;
