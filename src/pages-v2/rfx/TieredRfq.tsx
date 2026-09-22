import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import SessionAttachments from '../../components/ui-v2/SessionAttachments';
import { formatDate } from '../../lib/format';
import { compositeText, scoreStanding, type ScoringOptions, type QuoteScore } from '../../lib/quoteScore';
import type { RFQ } from '../../data/mockRfqs';
import type { Quotation } from '../../data/mockQuotations';
import type { GateResult } from '../../services/sourcing/complianceGate';
import type { AwardLine } from '../../services/sourcing/types';
import { rfqItemType } from '../../services/sourcing/rfqItemTypes';
import {
  tierPieces,
  tiersForItem,
  type RfqItem,
  type RfqQuantityTier,
  type RfqSpecField,
} from '../../services/sourcing/rfqModel';
import {
  awardQuantity,
  bestPriceByBreak,
  buildTieredAwardLines,
  defaultEvaluationTierQty,
  evaluationBreaks,
  itemCostAt,
  itemName,
  itemTierAt,
  itemsDepartingBestScore,
  scoreItemAt,
  tieredAwardShapeRefusal,
  type TieredAwardRefusal,
} from '../../services/sourcing/rfqComparison';
import { EmptyRow, GateMarker, money, qty } from './rfxDisplay';
import { FirmPill } from './rfxAuthoringDisplay';

// ────────────────────────────────────────────────────────────────────────────
// THE TIERED RFQ ON ITS EVENT PAGE (RFx spec 2026-09-21, "Evaluation and
// award"). Three sections the rebuilt RFQ needs and a single-price RFQ never
// had: what is being quoted, the comparison ITEM BY ITEM at an evaluation
// break, and the award ITEM BY ITEM split by % across suppliers.
//
// ⚠️ **THE PAGE JUDGES WITH THE VERB'S OWN RULES.** The lines the award form
// sends are built by `buildTieredAwardLines` and checked by
// `tieredAwardShapeRefusal` — the same functions `rfq_award_governed` calls —
// so a form the page lets through is one the verb accepts, and a refusal reads
// the same on both sides. The page is the message; the verb is the lock.
// ────────────────────────────────────────────────────────────────────────────

const fieldLabel = (t: TFunction, f: RfqSpecField): string => (f.labelKey ? t(f.labelKey) : (f.label ?? f.key));

/** A spec value as a reader reads it: a choice by its label, a number with its unit. */
const fieldValue = (t: TFunction, f: RfqSpecField | undefined, v: string): string => {
  if (f?.kind === 'choice') return t(`rfqAuthoring.opt.${v}`, { defaultValue: v });
  if (f?.unitKey) return `${v} ${t(f.unitKey)}`;
  return v;
};

const breakLabel = (t: TFunction, tier: RfqQuantityTier): string =>
  t('rfqCompare.cmp.breakOption', { qty: qty(tier.qty), basis: t(`rfqAuthoring.basis.${tier.basis}`) });

const card = 'bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-6';

// ── What is being quoted ────────────────────────────────────────────────────

export const RfqContentSection: React.FC<{ rfq: RFQ }> = ({ rfq }) => {
  const { t } = useTranslation();
  const items = rfq.items ?? [];
  return (
    <section className={card} data-testid="rfq-content">
      <div className="px-4 py-3 border-b border-border-subtle">
        <h2 className="text-sm font-semibold text-text-primary">{t('rfqCompare.content.title')}</h2>
      </div>
      <div className="p-4 space-y-5">
        <div>
          <h3 className="text-label text-text-tertiary uppercase mb-1.5">{t('rfqCompare.content.breaks')}</h3>
          <ul className="flex flex-wrap gap-2" data-testid="rfq-content-breaks">
            {(rfq.tiers ?? []).map((tier) => (
              <li key={tier.qty} className="border border-border-subtle rounded-sm px-2 py-0.5 text-sm">
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
            <h3 className="text-label text-text-tertiary uppercase mb-1.5">{t('rfqCompare.content.questions')}</h3>
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
            <h3 className="text-label text-text-tertiary uppercase mb-1.5">{t('rfqCompare.content.options')}</h3>
            <ul className="space-y-1 text-sm text-text-secondary" data-testid="rfq-content-flags">
              <li>{t(rfq.allowAlternatives ? 'rfqCompare.flag.alternatives.on' : 'rfqCompare.flag.alternatives.off')}</li>
              <li>
                {rfq.samplesRequested
                  ? t('rfqCompare.flag.samples', {
                      qty: qty(rfq.samplesRequested.qty),
                      date: formatDate(rfq.samplesRequested.neededBy),
                    })
                  : t('rfqCompare.flag.noSamples')}
              </li>
              <li>{t(rfq.confidential ? 'rfqCompare.flag.confidential.on' : 'rfqCompare.flag.confidential.off')}</li>
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

const RfqItemContent: React.FC<{ item: RfqItem }> = ({ item }) => {
  const { t } = useTranslation();
  const buyerFields = item.specFields.filter((f) => f.filledBy === 'buyer');
  const supplierFields = item.specFields.filter((f) => f.filledBy === 'supplier');
  return (
    <div className="border border-border-subtle rounded-md p-4 space-y-3" data-testid={`rfq-content-item-${item.lineNo}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold text-text-primary">
          {t('rfqCompare.content.item', { n: item.lineNo })} · {item.description}
        </h3>
        <span className="text-xs text-text-tertiary">
          {t(rfqItemType(item.itemType).labelKey)} · {t('rfqCompare.content.variants', { count: item.variantCount })} ·{' '}
          <Data>{item.uom}</Data>
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h4 className="text-label text-text-tertiary uppercase mb-1">{t('rfqCompare.content.buyerSpec')}</h4>
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
            <h4 className="text-label text-text-tertiary uppercase mb-1">{t('rfqCompare.content.supplierSpec')}</h4>
            <p className="text-sm text-text-secondary">
              {supplierFields.length === 0
                ? '—'
                : supplierFields
                    .map((f) => `${fieldLabel(t, f)}${f.required ? ` (${t('rfqCompare.content.required')})` : ''}`)
                    .join(' · ')}
            </p>
          </div>
          <div>
            <h4 className="text-label text-text-tertiary uppercase mb-1">{t('rfqCompare.content.costs')}</h4>
            <p className="text-sm text-text-secondary" data-testid={`rfq-content-costs-${item.lineNo}`}>
              {(item.oneTimeCosts ?? []).length === 0
                ? t('rfqCompare.content.noCosts')
                : (item.oneTimeCosts ?? []).map((c) => t(`rfqAuthoring.cost.${c}`)).join(' · ')}
            </p>
          </div>
          {item.tiers && item.tiers.length > 0 && (
            <p className="text-sm text-text-secondary">
              {t('rfqCompare.content.itemBreaks', { breaks: item.tiers.map((tier) => breakLabel(t, tier)).join(', ') })}
            </p>
          )}
          {item.note && (
            <p className="text-sm text-text-secondary">
              <span className="text-text-tertiary">{t('rfqCompare.content.note')}:</span> {item.note}
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

export const EvaluationBreakSelect: React.FC<{
  rfq: RFQ;
  value: number;
  onChange: (qty: number) => void;
}> = ({ rfq, value, onChange }) => {
  const { t } = useTranslation();
  const def = defaultEvaluationTierQty(rfq);
  const tiers = rfq.tiers ?? [];
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="eval-break">
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
            const tier = tiers.find((x) => x.qty === b) ?? { qty: b, basis: 'total' as const };
            return (
              <option key={b} value={b}>
                {breakLabel(t, tier)}
                {b === def ? ` (${t('rfqCompare.cmp.evalBreak.default')})` : ''}
              </option>
            );
          })}
        </select>
      </div>
      <p className="text-xs text-text-tertiary flex-1 min-w-[16rem]">{t('rfqCompare.cmp.evalBreak.help')}</p>
    </div>
  );
};

// ── The comparison, item by item ────────────────────────────────────────────

interface ComparisonProps {
  rfq: RFQ;
  /** The CURRENT version of each bid. */
  quotes: readonly Quotation[];
  evalQty: number;
  qualifies: (supplierId: string) => boolean;
  gateOf: (supplierId: string) => GateResult | undefined;
  supplierName: (supplierId: string) => string;
  reliabilityOf: (supplierId: string) => number;
  scoringOpts: ScoringOptions;
}

export const TieredComparison: React.FC<ComparisonProps> = (props) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6" data-testid="tiered-comparison">
      <h3 className="text-sm font-semibold text-text-primary">{t('rfqCompare.cmp.title')}</h3>
      {(props.rfq.items ?? []).map((item) => (
        <ItemComparison key={item.lineNo} item={item} {...props} />
      ))}
    </div>
  );
};

const ItemComparison: React.FC<ComparisonProps & { item: RfqItem }> = ({
  rfq,
  item,
  quotes,
  evalQty,
  qualifies,
  gateOf,
  supplierName,
  reliabilityOf,
  scoringOpts,
}) => {
  const { t } = useTranslation();
  const tiers = tiersForItem(rfq, item);
  const evalTier = itemTierAt(rfq, item, evalQty);
  const quoting = quotes.filter((q) => (q.itemQuotes ?? []).some((iq) => iq.itemLineNo === item.lineNo));
  const ranked = quoting.filter((q) => qualifies(q.supplierId));
  const failing = quoting.filter((q) => !qualifies(q.supplierId));
  const scoring = scoreItemAt(rfq, item, ranked, evalQty, reliabilityOf, scoringOpts);
  const scoreById = new Map<string, QuoteScore>(scoring.kind === 'scored' ? scoring.scores.map((s) => [s.quoteId, s]) : []);
  const ordered = [...ranked].sort(
    (a, b) => (scoreById.get(b.id)?.compositeExact ?? -1) - (scoreById.get(a.id)?.compositeExact ?? -1),
  );
  // Tie honesty, the event page's rule (`scoreStanding`): one decimal when two
  // scores round alike, "Tied for best" on a genuine tie.
  const standing = scoreStanding(scoring.kind === 'scored' ? scoring.scores : []);
  const tied = standing.tiedIds.length > 1;
  // The best price per break is marked among the RANKED suppliers only: a
  // supplier that cannot be awarded does not set the bar a buyer compares to.
  const bestPrice = bestPriceByBreak(rfq, item, ranked);
  const alternatives = quoting.flatMap((q) =>
    (q.alternatives ?? []).filter((a) => a.itemLineNo === item.lineNo).map((a) => ({ q, a })),
  );
  const specOf = (q: Quotation) => {
    const iq = (q.itemQuotes ?? []).find((x) => x.itemLineNo === item.lineNo);
    return (iq?.specValues ?? [])
      .filter((v) => v.value.trim())
      .map((v) => {
        const f = item.specFields.find((x) => x.key === v.key);
        return `${f ? fieldLabel(t, f) : v.key}: ${fieldValue(t, f, v.value)}`;
      })
      .join(' · ');
  };

  const row = (q: Quotation, isRanked: boolean) => {
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
              <span className="ml-2" data-testid={`item-best-${item.lineNo}-${q.supplierId}`}>
                <StatusPill variant="success">{t('rfqCompare.cmp.bestScored')}</StatusPill>
              </span>
            )}
            {tied && standing.tiedIds.includes(q.id) && (
              <span className="ml-2" data-testid={`item-tied-${item.lineNo}-${q.supplierId}`}>
                <StatusPill variant="success">{t('rfx.cmp.tied')}</StatusPill>
              </span>
            )}
          </div>
          {specOf(q) && (
            <div className="text-xs text-text-tertiary mt-1" data-testid={`item-spec-${item.lineNo}-${q.supplierId}`}>
              {specOf(q)}
            </div>
          )}
          {!isRanked && (
            <div className="mt-1">
              <GateMarker gate={gateOf(q.supplierId)} testId={`item-gate-${item.lineNo}-${q.supplierId}`} />
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
                    className="ml-1 inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium bg-success-soft text-success border-success/30"
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
        <TableCell className="whitespace-nowrap" data-testid={`item-total-${item.lineNo}-${q.supplierId}`}>
          {cost ? <Data>{money(cost.total, cur)}</Data> : <span className="text-xs text-text-tertiary">{t('rfqCompare.cmp.notPriced')}</span>}
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
    <div className="border border-border-subtle rounded-md overflow-hidden" data-testid={`item-cmp-${item.lineNo}`}>
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
              <TableHeaderCell key={tier.qty} className={tier.qty === evalTier?.qty ? 'text-text-primary' : ''}>
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
        <p className="px-4 py-2 text-xs text-text-tertiary border-t border-border-subtle" data-testid={`item-legend-${item.lineNo}`}>
          {t('rfqCompare.cmp.lowestLegend')}
        </p>
      )}
      {(standing.oneDecimal || tied) && (
        <p className="px-4 py-2 text-xs text-text-tertiary border-t border-border-subtle" data-testid={`item-score-note-${item.lineNo}`}>
          {t(tied ? 'rfx.cmp.tieNote' : 'rfx.cmp.decimalNote')}
        </p>
      )}
      {failing.length > 0 && (
        <p className="px-4 py-2 text-xs text-text-tertiary border-t border-border-subtle">{t('rfqCompare.cmp.failing')}</p>
      )}
      {alternatives.length > 0 && (
        <div className="border-t border-border-subtle" data-testid={`item-alternatives-${item.lineNo}`}>
          <p className="px-4 pt-3 text-xs font-semibold text-text-secondary">{t('rfqCompare.cmp.alternatives')}</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('rfqCompare.cmp.col.supplier')}</TableHeaderCell>
                {tiers.map((tier) => (
                  <TableHeaderCell key={tier.qty}>{breakLabel(t, tier)}</TableHeaderCell>
                ))}
              </TableHeader>
              <tbody>
                {alternatives.map(({ q, a }, i) => (
                  <TableRow key={`${q.id}-${i}`} data-testid={`item-alt-${item.lineNo}-${q.supplierId}`}>
                    <TableCell>
                      <div className="text-sm text-text-primary">{supplierName(q.supplierId)}</div>
                      <div className="text-xs text-text-tertiary">{a.description}</div>
                    </TableCell>
                    {tiers.map((tier) => {
                      const p = a.tierPrices.find((x) => x.tierQty === tier.qty)?.unitPrice;
                      return (
                        <TableCell key={tier.qty} className="whitespace-nowrap">
                          {p === undefined ? '—' : <Data>{money(p, q.currency ?? rfq.currency)}</Data>}
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

// ── The award, item by item ─────────────────────────────────────────────────

/** A shape refusal in the reader's language. */
export const tieredRefusalMessage = (
  t: TFunction,
  r: TieredAwardRefusal,
  supplierName: (id: string) => string,
): string =>
  t(`rfqCompare.refusal.${r.code}`, {
    item: r.item ?? '',
    pct: r.pct ?? 0,
    detail: r.detail ? supplierName(r.detail) : '',
  });

interface AwardFormProps {
  rfq: RFQ;
  quotes: readonly Quotation[];
  evalQty: number;
  bestByItem: ReadonlyMap<number, string | null>;
  qualifies: (supplierId: string) => boolean;
  gateOf: (supplierId: string) => GateResult | undefined;
  supplierName: (supplierId: string) => string;
  pending: boolean;
  onConfirm: (lines: AwardLine[], reason: string) => void;
}

export const TieredAwardForm: React.FC<AwardFormProps> = ({
  rfq,
  quotes,
  evalQty,
  bestByItem,
  qualifies,
  gateOf,
  supplierName,
  pending,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [shares, setShares] = useState<Record<string, Record<string, string>>>({});
  const [reason, setReason] = useState('');
  const qualified = useMemo(() => quotes.filter((q) => qualifies(q.supplierId)), [quotes, qualifies]);
  const lines = buildTieredAwardLines(rfq, evalQty, shares, qualified);
  const shape = lines.length > 0 ? tieredAwardShapeRefusal(rfq, lines, quotes) : null;
  const departing = lines.length > 0 && !shape ? itemsDepartingBestScore(rfq, lines, bestByItem) : [];
  const setShare = (code: string, quoteId: string, value: string) =>
    setShares((prev) => ({ ...prev, [code]: { ...(prev[code] ?? {}), [quoteId]: value } }));

  return (
    <div className="space-y-4" data-testid="tiered-award-form">
      <p className="text-xs text-text-tertiary">{t('rfqCompare.award.hint')}</p>
      <p className="text-xs text-text-secondary" data-testid="tiered-award-break">
        {t('rfqCompare.award.atBreak', { qty: qty(evalQty) })}
      </p>
      {(rfq.items ?? []).map((item) => {
        const code = String(item.lineNo);
        const quoting = quotes.filter((q) => (q.itemQuotes ?? []).some((iq) => iq.itemLineNo === item.lineNo));
        const total =
          Math.round(
            lines.filter((l) => l.itemLineNo === item.lineNo).reduce((s, l) => s + l.sharePct, 0) * 100,
          ) / 100;
        return (
          <div key={code} className="border border-border-subtle rounded-md overflow-hidden" data-testid={`award-item-${item.lineNo}`}>
            <div className="px-4 py-2 border-b border-border-subtle flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-text-primary">
                {t('rfqCompare.content.item', { n: item.lineNo })} · {item.description}
              </span>
              <Data
                className={`text-xs ${Math.abs(total - 100) <= 0.01 ? 'text-success' : 'text-text-tertiary'}`}
                data-testid={`award-item-total-${item.lineNo}`}
              >
                {t('rfqCompare.award.itemTotal', { pct: total })}
              </Data>
            </div>
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('rfx.award.col.supplier')}</TableHeaderCell>
                <TableHeaderCell>
                  {t('rfqCompare.cmp.col.totalAtBreak', { qty: qty(evalQty) })}
                  <FirmPill className="ml-2 normal-case" testId={`award-firm-${item.lineNo}`} />
                </TableHeaderCell>
                <TableHeaderCell>{t('rfx.award.col.share')}</TableHeaderCell>
                <TableHeaderCell>{t('rfqCompare.award.qty')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {quoting.map((q) => {
                  const cost = itemCostAt(rfq, item, q, evalQty);
                  const value = shares[code]?.[q.id] ?? '';
                  const pct = Number(value);
                  return (
                    <TableRow key={q.id} data-testid={`award-input-${item.lineNo}-${q.supplierId}`}>
                      <TableCell>
                        {supplierName(q.supplierId)}
                        {bestByItem.get(item.lineNo) === q.id && (
                          <StatusPill variant="success" className="ml-2">
                            {t('rfqCompare.cmp.bestScored')}
                          </StatusPill>
                        )}
                      </TableCell>
                      <TableCell>
                        {cost ? (
                          <Data>{money(cost.total, q.currency ?? rfq.currency)}</Data>
                        ) : (
                          <span className="text-xs text-text-tertiary">{t('rfqCompare.cmp.notPriced')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {/* BR-01a — no share field for a supplier failing the
                            gate, and the reason instead. The verb refuses it
                            too, so this is the message, not the lock. */}
                        {!qualifies(q.supplierId) ? (
                          <GateMarker gate={gateOf(q.supplierId)} testId={`award-gate-${item.lineNo}-${q.supplierId}`} />
                        ) : (
                          <input
                            type="number"
                            min={0}
                            max={100}
                            aria-label={`${item.description} — ${supplierName(q.supplierId)} — ${t('rfx.award.col.share')}`}
                            value={value}
                            onChange={(e) => setShare(code, q.id, e.target.value)}
                            className="w-24 bg-white border border-border-input rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action"
                          />
                        )}
                      </TableCell>
                      <TableCell data-testid={`award-qty-${item.lineNo}-${q.supplierId}`}>
                        {Number.isFinite(pct) && pct > 0 ? (
                          <Data>
                            {qty(awardQuantity(rfq, item, evalQty, pct))} {item.uom}
                          </Data>
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {quoting.length === 0 && (
                  <EmptyRow colSpan={4} testId={`award-item-empty-${item.lineNo}`}>
                    {t('rfqCompare.cmp.noQuotes')}
                  </EmptyRow>
                )}
              </tbody>
            </Table>
          </div>
        );
      })}

      {shape && (
        <p className="text-sm text-danger" role="alert" data-testid="award-item-refusal">
          {tieredRefusalMessage(t, shape, supplierName)}
        </p>
      )}
      {departing.length > 0 && (
        <div data-testid="award-reason-required">
          <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="tiered-award-reason">
            {t('rfx.award.reason')}
          </label>
          <p className="text-xs text-warning-hover mb-1">
            {t('rfqCompare.award.reasonItems', { items: departing.map(itemName).join(', ') })}
          </p>
          <input
            id="tiered-award-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
          />
        </div>
      )}
      <Button
        variant="outline"
        disabled={pending || lines.length === 0 || shape !== null || (departing.length > 0 && !reason.trim())}
        data-testid="award-confirm"
        onClick={() => onConfirm(lines, reason.trim())}
      >
        {t('rfx.award.confirm')}
      </Button>
    </div>
  );
};

/** A recorded per-item award: item, supplier, share, quantity and the break. */
export const TieredAwardLines: React.FC<{
  rfq: RFQ;
  lines: readonly AwardLine[];
  supplierName: (supplierId: string) => string;
}> = ({ rfq, lines, supplierName }) => {
  const { t } = useTranslation();
  const itemOf = (lineNo: number | undefined) => (rfq.items ?? []).find((i) => i.lineNo === lineNo);
  return (
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('rfqCompare.award.col.item')}</TableHeaderCell>
        <TableHeaderCell>{t('rfx.award.col.supplier')}</TableHeaderCell>
        <TableHeaderCell>{t('rfx.award.col.share')}</TableHeaderCell>
        <TableHeaderCell>{t('rfx.award.col.qty')}</TableHeaderCell>
        <TableHeaderCell>{t('rfqCompare.award.col.break')}</TableHeaderCell>
      </TableHeader>
      <tbody>
        {lines.map((line) => {
          const item = itemOf(line.itemLineNo);
          return (
            <TableRow
              key={`${line.itemLineNo}-${line.supplierId}`}
              data-testid={`award-line-${line.itemLineNo}-${line.supplierId}`}
            >
              <TableCell className="text-sm">
                {item ? `${t('rfqCompare.content.item', { n: item.lineNo })} · ${item.description}` : line.itemCode || '—'}
              </TableCell>
              <TableCell>{supplierName(line.supplierId)}</TableCell>
              <TableCell>
                <Data>{line.sharePct}%</Data>
              </TableCell>
              <TableCell>
                <Data>
                  {qty(line.quantity)} {item?.uom ?? rfq.uom}
                </Data>
              </TableCell>
              <TableCell>
                <Data>{line.awardTierQty === undefined ? '—' : qty(line.awardTierQty)}</Data>
              </TableCell>
            </TableRow>
          );
        })}
      </tbody>
    </Table>
  );
};
