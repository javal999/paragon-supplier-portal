import React from 'react';
import { useTranslation } from 'react-i18next';
/** @import { TFunction } from 'i18next' */
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import SessionAttachments from '@components/ui-v2/SessionAttachments';
import { formatDate } from '@lib/format';
/** @import { ScoringOptions, QuoteScore } from '@lib/quoteScore' */
import { compositeText, scoreStanding } from '@lib/quoteScore';
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
/** @import { GateResult } from '@services/sourcing/complianceGate' */
import { rfqItemType } from '@services/sourcing/rfqItemTypes';
/** @import { RfqItem, RfqQuantityTier, RfqSpecField } from '@services/sourcing/rfqModel' */
import { tierPieces, tiersForItem } from '@services/sourcing/rfqModel';
import {
  bestPriceByBreak,
  defaultEvaluationTierQty,
  evaluationBreaks,
  itemCostAt,
  itemTierAt,
  scoreItemAt
} from '@services/sourcing/rfqComparison';
import { EmptyRow, GateMarker, money, qty } from './rfxDisplay';
import { FirmPill } from './rfxAuthoringDisplay';
import { DocumentsStatus } from './SupplierDocumentsPanel';
import { documentsOf } from '@services/transitions/rfxDocumentRules';

// ────────────────────────────────────────────────────────────────────────────
// THE TIERED RFQ ON ITS EVENT PAGE (RFx spec 2026-09-21, "Evaluation and
// award"). Two sections the rebuilt RFQ needs and a single-price RFQ never
// had: what is being quoted, and the comparison ITEM BY ITEM at an evaluation
// break. The award, item by item, is the one award panel every RFQ shares
// (`AwardPanel/index.jsx`, RFx C3).
// ────────────────────────────────────────────────────────────────────────────

/**
 * @param {TFunction} t
 * @param {RfqSpecField} f
 * @returns {string}
 */
const fieldLabel = (t, f) => (f.labelKey ? t(f.labelKey) : (f.label ?? f.key));

/**
 * A spec value as a reader reads it: a choice by its label, a number with its unit.
 * @param {TFunction} t
 * @param {RfqSpecField | undefined} f
 * @param {string} v
 * @returns {string}
 */
const fieldValue = (t, f, v) => {
  if (f?.kind === 'choice') return t(`rfqAuthoring.opt.${v}`, { defaultValue: v });
  if (f?.unitKey) return `${v} ${t(f.unitKey)}`;
  return v;
};

/**
 * @param {TFunction} t
 * @param {RfqQuantityTier} tier
 * @returns {string}
 */
const breakLabel = (t, tier) =>
  t('rfqCompare.cmp.breakOption', {
    qty: qty(tier.qty),
    basis: t(`rfqAuthoring.basis.${tier.basis}`)
  });

const card = 'bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-6';

// ── What is being quoted ────────────────────────────────────────────────────

/** @type {React.FC<{ rfq: RFQ }>} */
export const RfqContentSection = ({ rfq }) => {
  const { t } = useTranslation();
  const items = rfq.items ?? [];
  return (
    <section className={card} data-testid="rfq-content">
      <div className="px-4 py-3 border-b border-border-subtle">
        <h2 className="text-sm font-semibold text-text-primary">{t('rfqCompare.content.title')}</h2>
      </div>
      <div className="p-4 space-y-5">
        <div>
          <h3 className="text-label text-text-tertiary uppercase mb-1.5">
            {t('rfqCompare.content.breaks')}
          </h3>
          <ul className="flex flex-wrap gap-2" data-testid="rfq-content-breaks">
            {(rfq.tiers ?? []).map((tier) => (
              <li
                key={tier.qty}
                className="border border-border-subtle rounded-sm px-2 py-0.5 text-sm"
              >
                <Data>{qty(tier.qty)}</Data>{' '}
                <span className="text-text-secondary">{t(`rfqAuthoring.basis.${tier.basis}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        {items.map((item) => (
          <RfqItemContent key={item.lineNo} item={item} />
        ))}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <h3 className="text-label text-text-tertiary uppercase mb-1.5">
              {t('rfqCompare.content.questions')}
            </h3>
            {(rfq.questions ?? []).length === 0 ? (
              <p className="text-sm text-text-tertiary">{t('rfqCompare.content.noQuestions')}</p>
            ) : (
              <ul className="space-y-1 text-sm" data-testid="rfq-content-questions">
                {(rfq.questions ?? []).map((q) => (
                  <li key={q.id}>
                    <span className="text-text-primary">{t(q.promptKey)}</span>{' '}
                    <span className="text-xs text-text-tertiary">
                      · {t(`rfx.qtype.${q.type}`)}
                      {q.required ? ` · ${t('rfqCompare.content.required')}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-label text-text-tertiary uppercase mb-1.5">
              {t('rfqCompare.content.options')}
            </h3>
            <ul className="space-y-1 text-sm text-text-secondary" data-testid="rfq-content-flags">
              <li>
                {t(
                  rfq.allowAlternatives
                    ? 'rfqCompare.flag.alternatives.on'
                    : 'rfqCompare.flag.alternatives.off'
                )}
              </li>
              <li>
                {rfq.samplesRequested
                  ? t('rfqCompare.flag.samples', {
                      qty: qty(rfq.samplesRequested.qty),
                      date: formatDate(rfq.samplesRequested.neededBy)
                    })
                  : t('rfqCompare.flag.noSamples')}
              </li>
              <li>
                {t(
                  rfq.confidential
                    ? 'rfqCompare.flag.confidential.on'
                    : 'rfqCompare.flag.confidential.off'
                )}
              </li>
            </ul>
          </div>
        </div>

        {(rfq.attachments ?? []).length > 0 && (
          <SessionAttachments
            value={rfq.attachments ?? []}
            onChange={() => undefined}
            label={t('rfqCompare.content.eventFiles')}
            testId="rfq-content-files"
            readOnly
          />
        )}
      </div>
    </section>
  );
};

/** @type {React.FC<{ item: RfqItem }>} */
const RfqItemContent = ({ item }) => {
  const { t } = useTranslation();
  const buyerFields = item.specFields.filter((f) => f.filledBy === 'buyer');
  const supplierFields = item.specFields.filter((f) => f.filledBy === 'supplier');
  return (
    <div
      className="border border-border-subtle rounded-md p-4 space-y-3"
      data-testid={`rfq-content-item-${item.lineNo}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold text-text-primary">
          {t('rfqCompare.content.item', { n: item.lineNo })} · {item.description}
        </h3>
        <span className="text-xs text-text-tertiary">
          {t(rfqItemType(item.itemType).labelKey)} ·{' '}
          {t('rfqCompare.content.variants', { count: item.variantCount })} · <Data>{item.uom}</Data>
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h4 className="text-label text-text-tertiary uppercase mb-1">
            {t('rfqCompare.content.buyerSpec')}
          </h4>
          <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-3 gap-y-1 text-sm">
            {buyerFields.map((f) => (
              <React.Fragment key={f.key}>
                <dt className="text-text-secondary">{fieldLabel(t, f)}</dt>
                <dd className="text-text-primary" data-testid={`spec-${item.lineNo}-${f.key}`}>
                  {f.value ? fieldValue(t, f, f.value) : '—'}
                </dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
        <div className="space-y-3">
          <div>
            <h4 className="text-label text-text-tertiary uppercase mb-1">
              {t('rfqCompare.content.supplierSpec')}
            </h4>
            <p className="text-sm text-text-secondary">
              {supplierFields.length === 0
                ? '—'
                : supplierFields
                    .map(
                      (f) =>
                        `${fieldLabel(t, f)}${f.required ? ` (${t('rfqCompare.content.required')})` : ''}`
                    )
                    .join(' · ')}
            </p>
          </div>
          <div>
            <h4 className="text-label text-text-tertiary uppercase mb-1">
              {t('rfqCompare.content.costs')}
            </h4>
            <p
              className="text-sm text-text-secondary"
              data-testid={`rfq-content-costs-${item.lineNo}`}
            >
              {(item.oneTimeCosts ?? []).length === 0
                ? t('rfqCompare.content.noCosts')
                : (item.oneTimeCosts ?? []).map((c) => t(`rfqAuthoring.cost.${c}`)).join(' · ')}
            </p>
          </div>
          {item.tiers && item.tiers.length > 0 && (
            <p className="text-sm text-text-secondary">
              {t('rfqCompare.content.itemBreaks', {
                breaks: item.tiers.map((tier) => breakLabel(t, tier)).join(', ')
              })}
            </p>
          )}
          {item.note && (
            <p className="text-sm text-text-secondary">
              <span className="text-text-tertiary">{t('rfqCompare.content.note')}:</span>{' '}
              {item.note}
            </p>
          )}
        </div>
      </div>
      <SessionAttachments
        value={item.attachments ?? []}
        onChange={() => undefined}
        label={t('rfqCompare.content.attachments')}
        testId={`rfq-content-attachments-${item.lineNo}`}
        readOnly
      />
    </div>
  );
};

// ── The evaluation break ────────────────────────────────────────────────────

/** @type {React.FC<{ rfq: RFQ; value: number; onChange: (qty: number) => void; }>} */
export const EvaluationBreakSelect = ({ rfq, value, onChange }) => {
  const { t } = useTranslation();
  const def = defaultEvaluationTierQty(rfq);
  const tiers = rfq.tiers ?? [];
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label
          className="block text-xs font-semibold text-text-secondary mb-1"
          htmlFor="eval-break"
        >
          {t('rfqCompare.cmp.evalBreak')}
        </label>
        <select
          id="eval-break"
          data-testid="eval-break"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
        >
          {evaluationBreaks(rfq).map((b) => {
            const tier = tiers.find((x) => x.qty === b) ?? {
              qty: b,
              basis: /** @type {const} */ ('total')
            };
            return (
              <option key={b} value={b}>
                {breakLabel(t, tier)}
                {b === def ? ` (${t('rfqCompare.cmp.evalBreak.default')})` : ''}
              </option>
            );
          })}
        </select>
      </div>
      <p className="text-xs text-text-tertiary flex-1 min-w-[16rem]">
        {t('rfqCompare.cmp.evalBreak.help')}
      </p>
    </div>
  );
};

// ── The comparison, item by item ────────────────────────────────────────────

/**
 * @typedef {object} ComparisonProps
 * @property {RFQ} rfq
 * @property {readonly Quotation[]} quotes -  The CURRENT version of each bid.
 * @property {number} evalQty
 * @property {(supplierId: string) => boolean} qualifies
 * @property {(supplierId: string) => GateResult | undefined} gateOf
 * @property {(supplierId: string) => string} supplierName
 * @property {(supplierId: string) => number} reliabilityOf
 * @property {ScoringOptions} scoringOpts
 */

/** @type {React.FC<ComparisonProps>} */
export const TieredComparison = (props) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6" data-testid="tiered-comparison">
      <h3 className="text-sm font-semibold text-text-primary">{t('rfqCompare.cmp.title')}</h3>
      {(props.rfq.items ?? []).map((item) => (
        <ItemComparison key={item.lineNo} item={item} {...props} />
      ))}
      <DocumentsComparison {...props} />
    </div>
  );
};

/**
 * RFx B5 — NR-1 buyer step 6: a "Documents" row per supplier, against the required requests.
 * @type {React.FC<ComparisonProps>}
 */
const DocumentsComparison = ({ rfq, quotes, supplierName }) => {
  const { t } = useTranslation();
  if (quotes.length === 0) return null;
  return (
    <div
      className="border border-border-subtle rounded-md overflow-x-auto"
      data-testid="tiered-documents"
    >
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rfqCompare.cmp.col.supplier')}</TableHeaderCell>
          <TableHeaderCell>{t('rfxFiles.docs.row')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {quotes.map((q) => (
            <TableRow key={q.id} data-testid={`tiered-documents-${q.supplierId}`}>
              <TableCell className="text-sm text-text-primary">
                {supplierName(q.supplierId)}
              </TableCell>
              <TableCell>
                <DocumentsStatus
                  requests={rfq.documentRequests ?? []}
                  documents={documentsOf(q)}
                  testId={`tiered-documents-status-${q.supplierId}`}
                />
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

/** @type {React.FC<ComparisonProps & { item: RfqItem }>} */
const ItemComparison = ({
  rfq,
  item,
  quotes,
  evalQty,
  qualifies,
  gateOf,
  supplierName,
  reliabilityOf,
  scoringOpts
}) => {
  const { t } = useTranslation();
  const tiers = tiersForItem(rfq, item);
  const evalTier = itemTierAt(rfq, item, evalQty);
  const quoting = quotes.filter((q) =>
    (q.itemQuotes ?? []).some((iq) => iq.itemLineNo === item.lineNo)
  );
  const ranked = quoting.filter((q) => qualifies(q.supplierId));
  const failing = quoting.filter((q) => !qualifies(q.supplierId));
  const scoring = scoreItemAt(rfq, item, ranked, evalQty, reliabilityOf, scoringOpts);
  const scoreById = /** @type {Map<string, QuoteScore>} */ (
    new Map(scoring.kind === 'scored' ? scoring.scores.map((s) => [s.quoteId, s]) : [])
  );
  const ordered = [...ranked].sort(
    (a, b) =>
      (scoreById.get(b.id)?.compositeExact ?? -1) - (scoreById.get(a.id)?.compositeExact ?? -1)
  );
  // Tie honesty, the event page's rule (`scoreStanding`): one decimal when two
  // scores round alike, "Tied for best" on a genuine tie.
  const standing = scoreStanding(scoring.kind === 'scored' ? scoring.scores : []);
  const tied = standing.tiedIds.length > 1;
  // The best price per break is marked among the RANKED suppliers only: a
  // supplier that cannot be awarded does not set the bar a buyer compares to.
  const bestPrice = bestPriceByBreak(rfq, item, ranked);
  // `key` is the quote id plus the alternative's position in that quote's
  // stored `alternatives` list: a submitted quote is a fixed record, so the
  // position never shifts, and the rule does not refuse two alternatives on one
  // item, so the quote id alone could repeat.
  const alternatives = quoting.flatMap((q) =>
    (q.alternatives ?? [])
      .map((a, n) => ({ q, a, key: `${q.id}-alt-${n}` }))
      .filter(({ a }) => a.itemLineNo === item.lineNo)
  );
  /** @param {Quotation} q */
  const specOf = (q) => {
    const iq = (q.itemQuotes ?? []).find((x) => x.itemLineNo === item.lineNo);
    return (iq?.specValues ?? [])
      .filter((v) => v.value.trim())
      .map((v) => {
        const f = item.specFields.find((x) => x.key === v.key);
        return `${f ? fieldLabel(t, f) : v.key}: ${fieldValue(t, f, v.value)}`;
      })
      .join(' · ');
  };

  /**
   * @param {Quotation} q
   * @param {boolean} isRanked
   */
  const row = (q, isRanked) => {
    const iq = (q.itemQuotes ?? []).find((x) => x.itemLineNo === item.lineNo);
    const cost = itemCostAt(rfq, item, q, evalQty);
    const score = scoreById.get(q.id);
    const cur = q.currency ?? rfq.currency;
    return (
      <TableRow key={q.id} data-testid={`item-cmp-${item.lineNo}-${q.supplierId}`}>
        <TableCell className="min-w-[12rem]">
          <div className="text-sm text-text-primary">
            {supplierName(q.supplierId)}
            {!tied && score?.topRanked && (
              <span
                className="ml-2"
                title={t('rfx.cmp.best.tip')}
                data-testid={`item-best-${item.lineNo}-${q.supplierId}`}
              >
                <StatusPill variant="success">{t('rfqCompare.cmp.bestScored')}</StatusPill>
              </span>
            )}
            {tied && standing.tiedIds.includes(q.id) && (
              <span
                className="ml-2"
                title={t('rfx.cmp.tied.tip')}
                data-testid={`item-tied-${item.lineNo}-${q.supplierId}`}
              >
                <StatusPill variant="success">{t('rfx.cmp.tied')}</StatusPill>
              </span>
            )}
          </div>
          {specOf(q) && (
            <div
              className="text-xs text-text-tertiary mt-1"
              data-testid={`item-spec-${item.lineNo}-${q.supplierId}`}
            >
              {specOf(q)}
            </div>
          )}
          {!isRanked && (
            <div className="mt-1">
              <GateMarker
                gate={gateOf(q.supplierId)}
                testId={`item-gate-${item.lineNo}-${q.supplierId}`}
              />
            </div>
          )}
        </TableCell>
        {tiers.map((tier) => {
          const price = iq?.tierPrices.find((p) => p.tierQty === tier.qty)?.unitPrice;
          const best = isRanked && (bestPrice.get(tier.qty) ?? []).includes(q.id);
          return (
            <TableCell
              key={tier.qty}
              className={`whitespace-nowrap ${best ? 'bg-success-soft' : ''} ${tier.qty === evalTier?.qty ? 'border-x border-border-subtle' : ''}`}
              data-testid={`item-price-${item.lineNo}-${q.supplierId}-${tier.qty}`}
              data-best={best ? 'true' : undefined}
            >
              {price === undefined ? (
                <span className="text-xs text-text-tertiary">{t('rfqCompare.cmp.notPriced')}</span>
              ) : (
                <Data>{money(price, cur)}</Data>
              )}
              {/* A compact marker, explained once by the legend under the
                  table. The short word is hidden from assistive technology and
                  the full phrase is read instead, so a screen reader still
                  hears what "Lowest" means in every cell. */}
              {best && (
                <>
                  <span
                    aria-hidden="true"
                    className="ml-1 inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[length:var(--fs-caption-1)] font-medium bg-success-soft text-success border-success/30"
                  >
                    {t('rfqCompare.cmp.lowest')}
                  </span>
                  <span className="sr-only"> {t('rfqCompare.cmp.bestPrice')}</span>
                </>
              )}
            </TableCell>
          );
        })}
        <TableCell className="text-xs text-text-secondary min-w-[10rem]">
          {(iq?.oneTimeCosts ?? []).length === 0
            ? '—'
            : (iq?.oneTimeCosts ?? []).map((c) => (
                <div key={c.name}>
                  {c.name} <Data>{money(c.amount, cur)}</Data>
                </div>
              ))}
        </TableCell>
        <TableCell className="whitespace-nowrap">
          <Data>
            {iq?.leadTimeDays ?? q.leadTimeDays} {t('rfx.unit.days')}
          </Data>
        </TableCell>
        <TableCell>
          <Data>{iq?.moq === undefined ? '—' : qty(iq.moq)}</Data>
        </TableCell>
        <TableCell
          className="whitespace-nowrap"
          data-testid={`item-total-${item.lineNo}-${q.supplierId}`}
        >
          {cost ? (
            <Data>{money(cost.total, cur)}</Data>
          ) : (
            <span className="text-xs text-text-tertiary">{t('rfqCompare.cmp.notPriced')}</span>
          )}
        </TableCell>
        <TableCell>
          {isRanked ? (
            <Data className="font-semibold">{score ? compositeText(score, standing) : '—'}</Data>
          ) : (
            <span className="text-xs text-text-tertiary">{t('rfx.gate.notScored')}</span>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div
      className="border border-border-subtle rounded-md overflow-hidden"
      data-testid={`item-cmp-${item.lineNo}`}
    >
      <div className="px-4 py-2 border-b border-border-subtle flex flex-wrap items-baseline gap-x-3">
        <span className="text-sm font-semibold text-text-primary">
          {t('rfqCompare.content.item', { n: item.lineNo })} · {item.description}
        </span>
        {evalTier && (
          <span className="text-xs text-text-tertiary">
            {t('rfqCompare.cmp.pieces', { pieces: qty(tierPieces(evalTier, item)) })}
          </span>
        )}
        <FirmPill testId={`item-cmp-firm-${item.lineNo}`} />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rfqCompare.cmp.col.supplier')}</TableHeaderCell>
            {tiers.map((tier) => (
              <TableHeaderCell
                key={tier.qty}
                className={tier.qty === evalTier?.qty ? 'text-text-primary' : ''}
              >
                {breakLabel(t, tier)}
              </TableHeaderCell>
            ))}
            <TableHeaderCell>{t('rfqCompare.cmp.col.oneTime')}</TableHeaderCell>
            <TableHeaderCell>{t('rfqCompare.cmp.col.leadTime')}</TableHeaderCell>
            <TableHeaderCell>{t('rfqCompare.cmp.col.moq')}</TableHeaderCell>
            <TableHeaderCell>
              {t('rfqCompare.cmp.col.totalAtBreak', { qty: evalTier ? qty(evalTier.qty) : '—' })}
            </TableHeaderCell>
            <TableHeaderCell>{t('rfqCompare.cmp.col.score')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {ordered.map((q) => row(q, true))}
            {failing.map((q) => row(q, false))}
            {quoting.length === 0 && (
              <EmptyRow colSpan={tiers.length + 6} testId={`item-cmp-empty-${item.lineNo}`}>
                {t('rfqCompare.cmp.noQuotes')}
              </EmptyRow>
            )}
          </tbody>
        </Table>
      </div>
      {bestPrice.size > 0 && (
        <p
          className="px-4 py-2 text-xs text-text-tertiary border-t border-border-subtle"
          data-testid={`item-legend-${item.lineNo}`}
        >
          {t('rfqCompare.cmp.lowestLegend')}
        </p>
      )}
      {(standing.oneDecimal || tied) && (
        <p
          className="px-4 py-2 text-xs text-text-tertiary border-t border-border-subtle"
          data-testid={`item-score-note-${item.lineNo}`}
        >
          {t(tied ? 'rfx.cmp.tieNote' : 'rfx.cmp.decimalNote')}
        </p>
      )}
      {failing.length > 0 && (
        <p className="px-4 py-2 text-xs text-text-tertiary border-t border-border-subtle">
          {t('rfqCompare.cmp.failing')}
        </p>
      )}
      {alternatives.length > 0 && (
        <div
          className="border-t border-border-subtle"
          data-testid={`item-alternatives-${item.lineNo}`}
        >
          <p className="px-4 pt-3 text-xs font-semibold text-text-secondary">
            {t('rfqCompare.cmp.alternatives')}
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('rfqCompare.cmp.col.supplier')}</TableHeaderCell>
                {tiers.map((tier) => (
                  <TableHeaderCell key={tier.qty}>{breakLabel(t, tier)}</TableHeaderCell>
                ))}
              </TableHeader>
              <tbody>
                {alternatives.map(({ q, a, key }) => (
                  <TableRow key={key} data-testid={`item-alt-${item.lineNo}-${q.supplierId}`}>
                    <TableCell>
                      <div className="text-sm text-text-primary">{supplierName(q.supplierId)}</div>
                      <div className="text-xs text-text-tertiary">{a.description}</div>
                    </TableCell>
                    {tiers.map((tier) => {
                      const p = a.tierPrices.find((x) => x.tierQty === tier.qty)?.unitPrice;
                      return (
                        <TableCell key={tier.qty} className="whitespace-nowrap">
                          {p === undefined ? (
                            '—'
                          ) : (
                            <Data>{money(p, q.currency ?? rfq.currency)}</Data>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

// The award, item by item, is `AwardPanel/index.jsx` (RFx C3): one panel for every
// RFQ, grown from the tiered per-item form that stood here.
