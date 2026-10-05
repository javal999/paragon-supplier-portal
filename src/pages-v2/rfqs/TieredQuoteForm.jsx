/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import FormSection from '@components/ui-v2/FormSection';
import StatusPill from '@components/ui-v2/StatusPill';
import { BID_CURRENCIES, isBidCurrency } from '@lib/currencyPolicy';
import { formatDate, formatNumber } from '@lib/format';
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { RfqItem, RfqSpecField } from '@services/sourcing/rfqModel' */
import { tiersForItem } from '@services/sourcing/rfqModel';
import RfqQuestionField from './RfqQuestionField';
import { FirmPill } from '../rfx/rfxAuthoringDisplay';
import ResponseDocumentsSection from '../rfx/ResponseDocumentsSection';
/** @import { ItemDraft, TieredDraft } from './tieredQuoteModel' */
import { newExtraCost } from './tieredQuoteModel';

// ─────────────────────────────────────────────────────────────────────────────
// THE QUOTE GRID (RFx working spec, 2026-09-21, "Supplier response · Quote
// grid"). One block per item: the buyer's spec (read-only), the supplier's own
// spec fields, a unit price per quantity break with the break's basis shown,
// MOQ and lead time, the requested one-time costs plus any the supplier adds,
// and an alternative offer where the buyer allows one. Then the RFQ-level
// fields: currency, validity, payment terms, the buyer's questions, the sample
// offer, notes, and the Documents section (NR-1: one slot per document the
// buyer asked for, then "Other documents").
//
// It only COLLECTS. What is complete is decided by `readTieredDraft`, which
// runs the verb's own rule; the panel says the refusal before Submit is sent.
// ─────────────────────────────────────────────────────────────────────────────

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

/**
 * A spec field's label: the library key, or the buyer's own words.
 * @param {(k: string) => string} t
 * @param {RfqSpecField} f
 * @returns {string}
 */
export const specLabel = (t, f) => (f.labelKey ? t(f.labelKey) : (f.label ?? f.key));

/** @type {React.FC<{ field: RfqSpecField; value: string; onChange: (v: string) => void; testId: string; }>} */
const SpecInput = ({ field, value, onChange, testId }) => {
  const { t } = useTranslation();
  const label = specLabel(t, field);
  return (
    <label className="block">
      <span className={labelClass}>
        {label}
        {field.unitKey ? ` (${t(field.unitKey)})` : ''}
        {field.required ? <span className="text-danger ml-1">*</span> : null}
      </span>
      {field.kind === 'choice' ? (
        <select
          aria-label={label}
          data-testid={testId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {t(`rfqAuthoring.opt.${o}`)}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          inputMode={field.kind === 'number' ? 'decimal' : 'text'}
          aria-label={label}
          data-testid={testId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </label>
  );
};

/**
 * The prices at every break in force, one input each, basis shown.
 * @type {React.FC<{ rfq: RFQ; item: RfqItem; prices: Readonly<Record<number, string>>; onChange: (qty: number, v: string) => void; testIdPrefix: string; labelPrefix: string; }>}
 */
const BreakPrices = ({ rfq, item, prices, onChange, testIdPrefix, labelPrefix }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {tiersForItem(rfq, item).map((tier) => (
        <label key={tier.qty} className="block">
          <span className={labelClass}>
            <Data>{formatNumber(tier.qty)}</Data>{' '}
            {t(
              tier.basis === 'perVariant'
                ? 'rfqResponse.basis.perVariant'
                : 'rfqResponse.basis.total'
            )}
          </span>
          <input
            type="text"
            inputMode="decimal"
            aria-label={t('rfqResponse.grid.priceAt', {
              prefix: labelPrefix,
              qty: formatNumber(tier.qty)
            })}
            data-testid={`${testIdPrefix}-${tier.qty}`}
            value={prices[tier.qty] ?? ''}
            onChange={(e) => onChange(tier.qty, e.target.value)}
            className={inputClass}
          />
        </label>
      ))}
    </div>
  );
};

/** @type {React.FC<{ rfq: RFQ; item: RfqItem; draft: ItemDraft; onChange: (next: ItemDraft) => void; flagged: boolean; }>} */
const ItemBlock = ({ rfq, item, draft, onChange, flagged }) => {
  const { t } = useTranslation();
  const buyerFields = item.specFields.filter((f) => f.filledBy === 'buyer');
  const supplierFields = item.specFields.filter((f) => f.filledBy === 'supplier');
  const itemLabel = t('rfqResponse.grid.itemLabel', {
    n: item.lineNo,
    description: item.description
  });
  const tid = `grid-item-${item.lineNo}`;

  return (
    <section
      data-testid={tid}
      className={`border rounded-md p-4 space-y-4 ${flagged ? 'border-danger' : 'border-border-subtle'}`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <Data className="text-xs font-semibold">
          {t('rfqResponse.grid.itemNo', { n: item.lineNo })}
        </Data>
        <span className="text-sm font-semibold text-text-primary">{item.description}</span>
        <StatusPill variant="neutral">
          {t('rfqResponse.grid.variants', { count: item.variantCount, uom: item.uom })}
        </StatusPill>
      </header>

      {/* The buyer's half of the sheet — read-only. A confidential RFQ arrives
          without these values until the terms are accepted (the READ masks
          them), so an absent value says so rather than showing a blank. */}
      {buyerFields.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {buyerFields.map((f) => (
            <div key={f.key} className="flex gap-2">
              <dt className="text-text-tertiary">{specLabel(t, f)}</dt>
              <dd className="text-text-primary">
                {f.value ? (f.kind === 'choice' ? t(`rfqAuthoring.opt.${f.value}`) : f.value) : '—'}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {item.note ? <p className="text-xs text-text-secondary italic">{item.note}</p> : null}

      {supplierFields.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-text-secondary mb-2">
            {t('rfqResponse.grid.yourSpec')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {supplierFields.map((f) => (
              <SpecInput
                key={f.key}
                field={f}
                testId={`${tid}-spec-${f.key}`}
                value={draft.specValues[f.key] ?? ''}
                onChange={(v) =>
                  onChange({ ...draft, specValues: { ...draft.specValues, [f.key]: v } })
                }
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-2">
          {t('rfqResponse.grid.unitPrices')}
          <FirmPill testId={`${tid}-firm`} />
        </div>
        <BreakPrices
          rfq={rfq}
          item={item}
          prices={draft.prices}
          labelPrefix={itemLabel}
          testIdPrefix={`${tid}-price`}
          onChange={(qty, v) => onChange({ ...draft, prices: { ...draft.prices, [qty]: v } })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={labelClass}>{t('rfqResponse.grid.moq')}</span>
          <input
            type="text"
            inputMode="numeric"
            aria-label={t('rfqResponse.grid.moqFor', { item: itemLabel })}
            data-testid={`${tid}-moq`}
            value={draft.moq}
            onChange={(e) => onChange({ ...draft, moq: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>
            {t('rfqResponse.grid.leadTime')}
            <span className="text-danger ml-1">*</span>
          </span>
          <input
            type="text"
            inputMode="numeric"
            aria-label={t('rfqResponse.grid.leadTimeFor', { item: itemLabel })}
            data-testid={`${tid}-lead`}
            value={draft.leadTimeDays}
            onChange={(e) => onChange({ ...draft, leadTimeDays: e.target.value })}
            className={inputClass}
          />
        </label>
      </div>

      <div>
        <div className="text-xs font-semibold text-text-secondary mb-2">
          {t('rfqResponse.grid.oneTimeCosts')}
        </div>
        <div className="space-y-2">
          {(item.oneTimeCosts ?? []).map((id) => (
            <label key={id} className="flex items-center gap-3">
              <span className="text-sm text-text-primary w-40 shrink-0">
                {t(`rfqAuthoring.cost.${id}`)}
                <span className="text-danger ml-1">*</span>
              </span>
              <input
                type="text"
                inputMode="decimal"
                aria-label={t('rfqResponse.grid.costFor', {
                  cost: t(`rfqAuthoring.cost.${id}`),
                  item: itemLabel
                })}
                data-testid={`${tid}-cost-${id}`}
                value={draft.requestedCosts[id] ?? ''}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    requestedCosts: { ...draft.requestedCosts, [id]: e.target.value }
                  })
                }
                className={inputClass}
              />
            </label>
          ))}
          {draft.extraCosts.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2">
              <input
                type="text"
                aria-label={t('rfqResponse.grid.extraCostName', { n: i + 1 })}
                placeholder={t('rfqResponse.grid.extraCostNamePlaceholder')}
                value={c.name}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    extraCosts: draft.extraCosts.map((x, j) =>
                      j === i ? { ...x, name: e.target.value } : x
                    )
                  })
                }
                className={inputClass}
              />
              <input
                type="text"
                inputMode="decimal"
                aria-label={t('rfqResponse.grid.extraCostAmount', { n: i + 1 })}
                value={c.amount}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    extraCosts: draft.extraCosts.map((x, j) =>
                      j === i ? { ...x, amount: e.target.value } : x
                    )
                  })
                }
                className={inputClass}
              />
              <button
                type="button"
                aria-label={t('rfqResponse.grid.extraCostRemove', { n: i + 1 })}
                onClick={() =>
                  onChange({ ...draft, extraCosts: draft.extraCosts.filter((_, j) => j !== i) })
                }
                className="text-text-tertiary hover:text-danger"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <Button
            variant="secondary"
            icon={Plus}
            data-testid={`${tid}-add-cost`}
            onClick={() =>
              onChange({ ...draft, extraCosts: [...draft.extraCosts, newExtraCost()] })
            }
          >
            {t('rfqResponse.grid.addCost')}
          </Button>
        </div>
      </div>

      {rfq.allowAlternatives ? (
        <div className="border-t border-border-subtle pt-3">
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              className="accent-action"
              data-testid={`${tid}-alt-toggle`}
              checked={draft.alternative.enabled}
              onChange={(e) =>
                onChange({
                  ...draft,
                  alternative: { ...draft.alternative, enabled: e.target.checked }
                })
              }
            />
            {t('rfqResponse.grid.altToggle')}
          </label>
          {draft.alternative.enabled ? (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-text-tertiary">{t('rfqResponse.grid.altHint')}</p>
              <label className="block">
                <span className={labelClass}>{t('rfqResponse.grid.altDescription')}</span>
                <input
                  type="text"
                  aria-label={t('rfqResponse.grid.altDescriptionFor', { item: itemLabel })}
                  data-testid={`${tid}-alt-description`}
                  value={draft.alternative.description}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      alternative: { ...draft.alternative, description: e.target.value }
                    })
                  }
                  className={inputClass}
                />
              </label>
              <BreakPrices
                rfq={rfq}
                item={item}
                prices={draft.alternative.prices}
                labelPrefix={t('rfqResponse.grid.altLabel', { item: itemLabel })}
                testIdPrefix={`${tid}-alt-price`}
                onChange={(qty, v) =>
                  onChange({
                    ...draft,
                    alternative: {
                      ...draft.alternative,
                      prices: { ...draft.alternative.prices, [qty]: v }
                    }
                  })
                }
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

/**
 * `flaggedItem`:  The item a refusal names, outlined so the supplier finds it.
 * @type {React.FC<{ rfq: RFQ; draft: TieredDraft; onChange: (next: TieredDraft) => void; flaggedItem: number | null; }>}
 */
const TieredQuoteForm = ({ rfq, draft, onChange, flaggedItem }) => {
  const { t } = useTranslation();
  const questions = rfq.questions ?? [];

  return (
    <div className="space-y-5" data-testid="tiered-quote-form">
      <FormSection
        eyebrow={t('rfqResponse.grid.step1.eyebrow')}
        title={t('rfqResponse.grid.step1.title')}
        description={t('rfqResponse.grid.step1.desc')}
      >
        <label className="block">
          <span className={labelClass}>{t('rfqs.field.currency')}</span>
          <select
            aria-label={t('rfqs.field.currency')}
            value={draft.currency}
            onChange={(e) => {
              if (isBidCurrency(e.target.value)) onChange({ ...draft, currency: e.target.value });
            }}
            className={inputClass}
          >
            {BID_CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        {(rfq.items ?? []).map((item) => (
          <ItemBlock
            key={item.lineNo}
            rfq={rfq}
            item={item}
            flagged={flaggedItem === item.lineNo}
            draft={/** @type {ItemDraft} */ (draft.items.find((d) => d.lineNo === item.lineNo))}
            onChange={(next) =>
              onChange({
                ...draft,
                items: draft.items.map((d) => (d.lineNo === next.lineNo ? next : d))
              })
            }
          />
        ))}
      </FormSection>

      <FormSection
        eyebrow={t('rfqResponse.grid.step2.eyebrow')}
        title={t('rfqResponse.grid.step2.title')}
        description={t('rfqResponse.grid.step2.desc')}
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelClass}>
              {t('rfqs.field.validUntil')}
              <span className="text-danger ml-1">*</span>
            </span>
            <input
              type="date"
              aria-label={t('rfqs.field.validUntil')}
              value={draft.validUntil}
              onChange={(e) => onChange({ ...draft, validUntil: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>{t('rfqResponse.paymentTerms')}</span>
            <input
              type="text"
              aria-label={t('rfqResponse.paymentTerms')}
              value={draft.paymentTermsOffered}
              onChange={(e) => onChange({ ...draft, paymentTermsOffered: e.target.value })}
              className={inputClass}
            />
          </label>
        </div>
        {questions.length > 0 && (
          <div className="space-y-3" data-testid="grid-questions">
            <div className="text-xs font-semibold text-text-secondary">
              {t('rfqResponse.grid.questions')}
            </div>
            {questions.map((q) => (
              <RfqQuestionField
                key={q.id}
                question={q}
                answer={draft.answers[q.id]}
                onChange={(a) => onChange({ ...draft, answers: { ...draft.answers, [q.id]: a } })}
              />
            ))}
          </div>
        )}
        <SampleOfferFields
          requested={rfq.samplesRequested}
          canSample={draft.canSample}
          readyDate={draft.sampleReadyDate}
          onChange={(canSample, sampleReadyDate) =>
            onChange({ ...draft, canSample, sampleReadyDate })
          }
        />
        <label className="block">
          <span className={labelClass}>{t('rfqs.panel.notes')}</span>
          <textarea
            rows={3}
            value={draft.notes}
            onChange={(e) => onChange({ ...draft, notes: e.target.value })}
            placeholder={t('rfqs.panel.notesPlaceholder')}
            className={`${inputClass} resize-y`}
          />
        </label>
        <ResponseDocumentsSection
          requests={rfq.documentRequests ?? []}
          value={draft.documents}
          onChange={(documents) => onChange({ ...draft, documents })}
          filesAlready={Object.values(draft.answers).reduce(
            (n, a) => n + (a.attachments?.length ?? 0),
            0
          )}
          testId="grid-documents"
        />
      </FormSection>
    </div>
  );
};

/**
 * The sample offer: can you sample, and by when. Shared by the grid and the
 * single-price form, because the offer is saved on both now.
 * @type {React.FC<{ requested?: { qty: number; neededBy: string }; canSample: boolean | null; readyDate: string; onChange: (canSample: boolean | null, readyDate: string) => void; }>}
 */
export const SampleOfferFields = ({ requested, canSample, readyDate, onChange }) => {
  const { t } = useTranslation();
  return (
    <div data-testid="sample-offer">
      <span className={labelClass}>
        {t('rfqs.panel.canSample')}
        {requested ? <span className="text-danger ml-1">*</span> : null}
      </span>
      {requested ? (
        <p className="text-xs text-text-tertiary mb-2">
          {t('rfqResponse.sample.requested', {
            count: requested.qty,
            qty: formatNumber(requested.qty),
            date: formatDate(requested.neededBy)
          })}
        </p>
      ) : null}
      <div className="flex gap-2">
        {
          /** @type {const} */ ([true, false]).map((v) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={canSample === v}
              onClick={() => onChange(v, v ? readyDate : '')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold border transition-colors ${
                canSample === v
                  ? 'bg-action-soft border-action text-action-hover'
                  : 'bg-bg-surface border-border-input text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {v ? t('rfqs.panel.yes') : t('rfqs.panel.no')}
            </button>
          ))
        }
      </div>
      {canSample === true && (
        <label className="block mt-2">
          <span className={labelClass}>{t('rfqResponse.sample.readyDate')}</span>
          <input
            type="date"
            aria-label={t('rfqResponse.sample.readyDate')}
            value={readyDate}
            onChange={(e) => onChange(true, e.target.value)}
            className={inputClass}
            style={{ width: 200 }}
          />
        </label>
      )}
    </div>
  );
};

export default TieredQuoteForm;
