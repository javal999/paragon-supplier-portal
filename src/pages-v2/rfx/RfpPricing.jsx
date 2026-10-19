// ────────────────────────────────────────────────────────────────────────────
// RFP INDICATIVE PRICING — open-spec requests (Tundra, ICY), spec D4.
//
// The buyer lists OPTIONS and indicative QUANTITY POINTS; the supplier gives an
// indicative price per option per point, may PROPOSE ITS OWN options, and
// states a sample offer, a timeline and how long the prices hold. The buyer
// compares options × suppliers.
//
// ⚠️ **EVERY PRICE HERE IS INDICATIVE, AND EVERY SURFACE SAYS SO BESIDE THE
// NUMBER** (`IndicativePill`), for buyer and supplier alike. A firm price by
// tier is the RFQ's job; a number from this section that read as a quote would
// be the one mistake D4 exists to prevent.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { formatDate } from '@lib/format';
import { MAX_QUANTITY_POINTS, rfpPricingRequestRefusal } from '@services/transitions/rfxRules';
/** @import { RfpIndicativePrice, RfpPricingAnswer, RfpPricingOption, RfpPricingRequest } from '@services/sourcing/types' */
/** @import { RfpFirmPriceView, RfpResponseView } from '@services/sourcing/views' */
import { rfpOptionRef } from '@services/sourcing/rfpFirmOffer';
import StatusPill from '@components/ui-v2/StatusPill';
import { FirmPill, IndicativePill, moneyIn } from './rfxAuthoringDisplay';
import { refusalCode } from './RfxQuestionEditor';

const inputClass =
  'w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover';
const labelClass = 'block text-xs font-semibold text-text-secondary mb-1';

/** @param {number} n */
const qtyText = (n) => n.toLocaleString('en-US');

// ── The buyer's request (wizard) ────────────────────────────────────────────

/** @type {RfpPricingRequest} */
export const EMPTY_PRICING = {
  options: [],
  quantityPoints: [],
  quantityBasis: 'total',
  samplesRequested: false
};

/** @type {React.FC<{ value: RfpPricingRequest | undefined; onChange: (next: RfpPricingRequest | undefined) => void; }>} */
export const RfpPricingEditor = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [option, setOption] = useState({ title: '', description: '' });
  const [qty, setQty] = useState('');
  const on = value !== undefined;
  const p = value ?? EMPTY_PRICING;
  const refusal = on ? rfpPricingRequestRefusal(p) : null;

  const addOption = () => {
    const title = option.title.trim();
    if (!title) return;
    let n = p.options.length + 1;
    while (p.options.some((o) => o.id === `opt-${n}`)) n += 1;
    /** @type {RfpPricingOption} */
    const next = {
      id: `opt-${n}`,
      title,
      ...(option.description.trim() ? { description: option.description.trim() } : {})
    };
    onChange({ ...p, options: [...p.options, next] });
    setOption({ title: '', description: '' });
  };

  const addQty = () => {
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0 || p.quantityPoints.includes(n)) return;
    onChange({ ...p, quantityPoints: [...p.quantityPoints, n].sort((a, b) => a - b) });
    setQty('');
  };

  return (
    <div className="space-y-4" data-testid="rfp-new-pricing">
      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          className="accent-teal"
          checked={on}
          data-testid="rfp-new-pricing-toggle"
          onChange={(e) => onChange(e.target.checked ? EMPTY_PRICING : undefined)}
        />
        {t('rfxa.pricing.toggle')}
      </label>
      <p className="text-xs text-text-tertiary">
        <IndicativePill className="mr-2" />
        {t('rfxa.pricing.hint')}
      </p>

      {on && (
        <>
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-2">
              {t('rfxa.pricing.options')}
            </h4>
            {p.options.length === 0 && (
              <p className="text-xs text-text-tertiary">{t('rfxa.pricing.noOptions')}</p>
            )}
            <ul className="space-y-1 mb-3">
              {p.options.map((o) => (
                <li
                  key={o.id}
                  data-testid={`rfp-new-pricing-option-${o.id}`}
                  className="flex items-start justify-between gap-3 border border-border-subtle rounded-md px-3 py-2"
                >
                  <div>
                    <div className="text-sm text-text-primary">{o.title}</div>
                    {o.description && (
                      <div className="text-xs text-text-tertiary">{o.description}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`${t('rfx.rfi.removeQuestion')} — ${o.title}`}
                    onClick={() =>
                      onChange({ ...p, options: p.options.filter((x) => x.id !== o.id) })
                    }
                    className="text-text-tertiary hover:text-danger"
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="rfp-new-pricing-option-title">
                  {t('rfxa.pricing.option.title')}
                </label>
                <input
                  id="rfp-new-pricing-option-title"
                  value={option.title}
                  placeholder={t('rfxa.pricing.option.title.ph')}
                  onChange={(e) => setOption((o) => ({ ...o, title: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="rfp-new-pricing-option-desc">
                  {t('rfxa.pricing.option.desc')}
                </label>
                <input
                  id="rfp-new-pricing-option-desc"
                  value={option.description}
                  onChange={(e) => setOption((o) => ({ ...o, description: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
            <Button
              variant="outline"
              className="mt-2"
              disabled={option.title.trim().length === 0}
              onClick={addOption}
              data-testid="rfp-new-pricing-option-add"
            >
              {t('rfxa.pricing.option.add')}
            </Button>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-2">
              {t('rfxa.pricing.points')}
            </h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {p.quantityPoints.map((q) => (
                <span
                  key={q}
                  className="inline-flex items-center gap-1 border border-border-subtle rounded-sm px-2 py-0.5 text-xs"
                  data-testid={`rfp-new-pricing-qty-${q}`}
                >
                  <Data>{qtyText(q)}</Data>
                  <button
                    type="button"
                    aria-label={`${t('rfxa.pricing.qty.remove')} ${qtyText(q)}`}
                    onClick={() =>
                      onChange({ ...p, quantityPoints: p.quantityPoints.filter((x) => x !== q) })
                    }
                    className="text-text-tertiary hover:text-danger"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-40">
                <label className={labelClass} htmlFor="rfp-new-pricing-qty">
                  {t('rfxa.pricing.qty')}
                </label>
                <input
                  id="rfp-new-pricing-qty"
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className={inputClass}
                />
              </div>
              <Button
                variant="outline"
                disabled={qty === '' || p.quantityPoints.length >= MAX_QUANTITY_POINTS}
                onClick={addQty}
                data-testid="rfp-new-pricing-qty-add"
              >
                {t('rfxa.pricing.qty.add')}
              </Button>
              <div className="w-48">
                <label className={labelClass} htmlFor="rfp-new-pricing-basis">
                  {t('rfxa.pricing.basis')}
                </label>
                <select
                  id="rfp-new-pricing-basis"
                  value={p.quantityBasis}
                  onChange={(e) =>
                    onChange({
                      ...p,
                      quantityBasis: /** @type {RfpPricingRequest['quantityBasis']} */ (
                        e.target.value
                      )
                    })
                  }
                  className={inputClass}
                >
                  <option value="total">{t('rfxa.pricing.basis.total')}</option>
                  <option value="perVariant">{t('rfxa.pricing.basis.perVariant')}</option>
                </select>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              className="accent-teal"
              checked={p.samplesRequested}
              onChange={(e) => onChange({ ...p, samplesRequested: e.target.checked })}
            />
            {t('rfxa.pricing.samples')}
          </label>

          {refusal && (
            <p className="text-sm text-danger" data-testid="rfp-new-pricing-refusal">
              {t(`rfxa.refusal.${refusalCode(refusal)}`, { defaultValue: refusal })}
            </p>
          )}
        </>
      )}
    </div>
  );
};

// ── The supplier's answer ───────────────────────────────────────────────────

/** @type {RfpPricingAnswer} */
export const EMPTY_PRICING_ANSWER = { prices: [], proposedOptions: [] };

/**
 * The supplier's indicative pricing. S-02: `sampleMissing` marks the sample
 * question unanswered and `pricingError` says, under the grid, the pricing
 * refusal the verb would give. S-06: the sample is a Yes/No control, and a
 * built-in field a buyer question already asks (`answeredIn`, the question's
 * prompt) is not asked again — the page copies the answer into it.
 * @type {React.FC<{ request: RfpPricingRequest; currency: string; value: RfpPricingAnswer; onChange: (next: RfpPricingAnswer) => void; disabled: boolean; testIdPrefix: string; sampleMissing?: boolean; pricingError?: string | null; answeredIn?: { sampleReadyDate?: string; timeline?: string }; }>}
 */
export const RfpPricingForm = ({
  request,
  currency,
  value,
  onChange,
  disabled,
  testIdPrefix: p,
  sampleMissing = false,
  pricingError = null,
  answeredIn = {}
}) => {
  const { t } = useTranslation();
  const [own, setOwn] = useState({ title: '', description: '' });
  const rows = [...request.options, ...value.proposedOptions];

  /**
   * @param {string} optionId
   * @param {number} qty
   */
  const priceOf = (optionId, qty) =>
    value.prices.find((x) => x.optionId === optionId && x.qty === qty)?.unitPrice;

  /**
   * @param {string} optionId
   * @param {number} qty
   * @param {string} raw
   */
  const setPrice = (optionId, qty, raw) => {
    const rest = value.prices.filter((x) => !(x.optionId === optionId && x.qty === qty));
    const n = Number(raw);
    /** @type {RfpIndicativePrice[]} */
    const next = raw.trim() === '' ? rest : [...rest, { optionId, qty, unitPrice: n }];
    onChange({ ...value, prices: next });
  };

  const addOwn = () => {
    const title = own.title.trim();
    if (!title) return;
    let n = value.proposedOptions.length + 1;
    while (value.proposedOptions.some((o) => o.id === `sup-opt-${n}`)) n += 1;
    onChange({
      ...value,
      proposedOptions: [
        ...value.proposedOptions,
        {
          id: `sup-opt-${n}`,
          title,
          ...(own.description.trim() ? { description: own.description.trim() } : {})
        }
      ]
    });
    setOwn({ title: '', description: '' });
  };

  /** @param {string} id */
  const removeOwn = (id) =>
    onChange({
      ...value,
      proposedOptions: value.proposedOptions.filter((o) => o.id !== id),
      prices: value.prices.filter((x) => x.optionId !== id)
    });

  return (
    <div className="space-y-4" id={`${p}-pricing`} data-testid={`${p}-pricing`}>
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-text-primary">{t('rfxa.pricing.title')}</h4>
        <IndicativePill testId={`${p}-pricing-indicative`} />
      </div>
      <p className="text-xs text-text-tertiary">
        {t('rfxa.pricing.supplierHint', { currency })}{' '}
        {t(
          request.quantityBasis === 'perVariant'
            ? 'rfxa.pricing.basis.perVariant'
            : 'rfxa.pricing.basis.total'
        )}
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rfxa.pricing.col.option')}</TableHeaderCell>
            {request.quantityPoints.map((q) => (
              <TableHeaderCell key={q}>
                <Data>{qtyText(q)}</Data>
              </TableHeaderCell>
            ))}
          </TableHeader>
          <tbody>
            {rows.map((o) => {
              const mine = o.id.startsWith('sup-opt-');
              return (
                <TableRow key={o.id} data-testid={`${p}-pricing-row-${o.id}`}>
                  <TableCell className="align-top">
                    <div className="text-sm text-text-primary">{o.title}</div>
                    {o.description && (
                      <div className="text-xs text-text-tertiary">{o.description}</div>
                    )}
                    {mine && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-tertiary">
                          {t('rfxa.pricing.yourOption')}
                        </span>
                        {!disabled && (
                          <button
                            type="button"
                            className="text-xs text-text-tertiary hover:text-danger"
                            data-testid={`${p}-pricing-remove-${o.id}`}
                            onClick={() => removeOwn(o.id)}
                          >
                            {t('rfxa.pricing.removeOwn')}
                          </button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  {request.quantityPoints.map((q) => (
                    <TableCell key={q} className="align-top">
                      <input
                        type="number"
                        disabled={disabled}
                        aria-label={`${o.title} — ${qtyText(q)} — ${t('rfxa.pricing.unitPrice')}`}
                        data-testid={`${p}-price-${o.id}-${q}`}
                        value={priceOf(o.id, q) ?? ''}
                        onChange={(e) => setPrice(o.id, q, e.target.value)}
                        className="w-32 bg-white border border-border-input rounded-md px-2 h-9 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </div>
      {!!pricingError && (
        <div className="text-xs text-danger" data-testid={`${p}-pricing-error`}>
          {pricingError}
        </div>
      )}

      {!disabled && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className={labelClass} htmlFor={`${p}-own-title`}>
              {t('rfxa.pricing.own.title')}
            </label>
            <input
              id={`${p}-own-title`}
              value={own.title}
              placeholder={t('rfxa.pricing.own.title.ph')}
              onChange={(e) => setOwn((o) => ({ ...o, title: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${p}-own-desc`}>
              {t('rfxa.pricing.option.desc')}
            </label>
            <input
              id={`${p}-own-desc`}
              value={own.description}
              onChange={(e) => setOwn((o) => ({ ...o, description: e.target.value }))}
              className={inputClass}
            />
          </div>
          <Button
            variant="outline"
            disabled={own.title.trim().length === 0}
            onClick={addOwn}
            data-testid={`${p}-own-add`}
          >
            {t('rfxa.pricing.own.add')}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {request.samplesRequested && (
          <div className="space-y-2" id={`${p}-sample`}>
            <span className={labelClass}>
              {t('rfxa.pricing.canSample')}
              <span className="text-danger ml-1">*</span>
            </span>
            <div className="flex gap-2" role="group" aria-label={t('rfxa.pricing.canSample')}>
              {
                /** @type {const} */ ([true, false]).map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    disabled={disabled}
                    aria-pressed={value.sample?.canSample === v}
                    data-testid={`${p}-can-sample-${v ? 'yes' : 'no'}`}
                    onClick={() =>
                      onChange({
                        ...value,
                        sample:
                          v && value.sample?.readyDate
                            ? { canSample: true, readyDate: value.sample.readyDate }
                            : { canSample: v }
                      })
                    }
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold border transition-colors disabled:opacity-60 ${
                      value.sample?.canSample === v
                        ? 'bg-action-soft border-action text-action-hover'
                        : `bg-bg-surface text-text-tertiary hover:text-text-secondary ${
                            sampleMissing ? 'border-danger' : 'border-border-input'
                          }`
                    }`}
                  >
                    {v ? t('rfx.opt.yes') : t('rfx.opt.no')}
                  </button>
                ))
              }
            </div>
            {!!sampleMissing && (
              <div className="text-xs text-danger" data-testid={`${p}-sample-missing`}>
                {t('rfx.form.sample.choose')}
              </div>
            )}
            {value.sample?.canSample === true &&
              (answeredIn.sampleReadyDate ? (
                <p className="text-xs text-text-tertiary" data-testid={`${p}-sample-date-copied`}>
                  {t('rfx.form.copiedFrom', { question: answeredIn.sampleReadyDate })}
                </p>
              ) : (
                <div>
                  <label className={labelClass} htmlFor={`${p}-sample-date`}>
                    {t('rfxa.pricing.sampleDate')}
                  </label>
                  <input
                    id={`${p}-sample-date`}
                    type="date"
                    disabled={disabled}
                    value={value.sample?.readyDate ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        sample: {
                          canSample: true,
                          ...(e.target.value ? { readyDate: e.target.value } : {})
                        }
                      })
                    }
                    className={inputClass}
                  />
                </div>
              ))}
          </div>
        )}
        {answeredIn.timeline ? (
          <div data-testid={`${p}-timeline-copied`}>
            <span className={labelClass}>{t('rfxa.pricing.timeline')}</span>
            <p className="text-xs text-text-tertiary">
              {t('rfx.form.copiedFrom', { question: answeredIn.timeline })}
            </p>
          </div>
        ) : (
          <div>
            <label className={labelClass} htmlFor={`${p}-timeline`}>
              {t('rfxa.pricing.timeline')}
            </label>
            <textarea
              id={`${p}-timeline`}
              rows={3}
              disabled={disabled}
              value={value.timelineNote ?? ''}
              onChange={(e) => onChange({ ...value, timelineNote: e.target.value })}
              className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover"
            />
          </div>
        )}
        <div>
          <label className={labelClass} htmlFor={`${p}-valid-until`}>
            {t('rfxa.pricing.validUntil')}
          </label>
          <input
            id={`${p}-valid-until`}
            type="date"
            disabled={disabled}
            value={value.validUntil ?? ''}
            onChange={(e) => {
              const { validUntil: _dropped, ...rest } = value;
              onChange(e.target.value ? { ...rest, validUntil: e.target.value } : rest);
            }}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
};

// ── The buyer's comparison: options × suppliers ─────────────────────────────

/**
 * One supplier's indicative prices on one option, by quantity point.
 * @type {React.FC<{ prices: readonly RfpIndicativePrice[]; currency: string }>}
 */
const IndicativePriceList = ({ prices, currency }) => (
  <ul className="space-y-0.5">
    {prices.map((x) => (
      <li key={x.qty} className="text-sm">
        <Data className="text-text-tertiary">{qtyText(x.qty)}</Data>
        {' · '}
        <Data>{moneyIn(x.unitPrice, currency)}</Data>
      </li>
    ))}
  </ul>
);

/**
 * RFx D3 (NR-2 BR-03, AC-02, edge case 1) — the firm prices one supplier holds
 * on one option, from a firm-offer round: labelled **Firm** with their
 * validity, beside the indicative prices of the same cell, which keep their
 * own label. Every other RFP price on the page stays Indicative.
 * @type {React.FC<{ prices: readonly RfpFirmPriceView[]; currency: string; testId: string }>}
 */
const FirmPricesInCell = ({ prices, currency, testId }) => {
  const { t } = useTranslation();
  const sorted = [...prices].sort((a, b) => a.qty - b.qty);
  return (
    <div className="mt-2 pt-2 border-t border-border-subtle space-y-0.5" data-testid={testId}>
      <FirmPill />
      <ul className="space-y-0.5">
        {sorted.map((p) => (
          <li key={p.qty} className="text-sm">
            <Data className="text-text-tertiary">{qtyText(p.qty)}</Data>
            {' · '}
            <Data>{moneyIn(p.unitPrice, currency)}</Data>
          </li>
        ))}
      </ul>
      <div className="text-xs text-text-tertiary">
        {t('rfx.firm.validUntil', {
          date: formatDate(/** @type {RfpFirmPriceView} */ (sorted[0]).validUntil)
        })}
      </div>
    </div>
  );
};

/**
 * `firmPrices`:  RFx D3 — the firm prices in force from the RFP's firm-offer rounds (the buyer's read).
 * @type {React.FC<{ request: RfpPricingRequest; currency: string; responses: readonly RfpResponseView[]; testId: string; firmPrices?: readonly RfpFirmPriceView[]; }>}
 */
export const RfpPricingComparison = ({ request, currency, responses, testId, firmPrices = [] }) => {
  const { t } = useTranslation();
  const proposed = responses.flatMap((r) =>
    (r.pricing?.proposedOptions ?? []).map((o) => ({ option: o, by: r }))
  );
  /** @type {{ option: RfpPricingOption; by?: RfpResponseView }[]} */
  const rows = [...request.options.map((option) => ({ option })), ...proposed];
  /**
   * @param {string} ref
   * @param {string} [supplierId]
   */
  const firmOn = (ref, supplierId) =>
    firmPrices.filter(
      (p) => p.optionRef === ref && (supplierId === undefined || p.supplierId === supplierId)
    );

  return (
    <div
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto"
      data-testid={testId}
    >
      <div className="px-4 py-3 border-b border-border-subtle flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-text-primary">{t('rfxa.pricing.compare')}</span>
        <IndicativePill testId={`${testId}-indicative`} />
        <span className="text-xs text-text-tertiary">
          {t('rfxa.pricing.compareHint', { currency })}{' '}
          {t(
            request.quantityBasis === 'perVariant'
              ? 'rfxa.pricing.basis.perVariant'
              : 'rfxa.pricing.basis.total'
          )}
        </span>
      </div>
      {responses.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-text-tertiary">
          {t('rfx.rfp.noProposals')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rfxa.pricing.col.option')}</TableHeaderCell>
            {responses.map((r) => (
              <TableHeaderCell key={r.id}>{r.supplierName}</TableHeaderCell>
            ))}
          </TableHeader>
          <tbody>
            {rows.map(({ option, by }) => {
              const ref = rfpOptionRef(option.id, by?.supplierId);
              const firmBy = new Set(firmOn(ref).map((p) => p.supplierId));
              return (
                <TableRow
                  key={`${by?.id ?? 'pti'}-${option.id}`}
                  data-testid={`${testId}-row-${option.id}`}
                >
                  <TableCell className="align-top">
                    <div className="text-sm text-text-primary">{option.title}</div>
                    {option.description && (
                      <div className="text-xs text-text-tertiary">{option.description}</div>
                    )}
                    {by && (
                      <div className="text-xs text-text-tertiary mt-1">
                        {t('rfxa.pricing.proposedBy', { supplier: by.supplierName })}
                      </div>
                    )}
                    {firmBy.size === 1 && (
                      <StatusPill variant="neutral" className="mt-1">
                        <span data-testid={`${testId}-single-${ref}`}>{t('rfx.firm.single')}</span>
                      </StatusPill>
                    )}
                  </TableCell>
                  {responses.map((r) => {
                    const prices = (r.pricing?.prices ?? [])
                      .filter((x) => x.optionId === option.id && (!by || by.id === r.id))
                      .sort((a, b) => a.qty - b.qty);
                    const firm = firmOn(ref, r.supplierId);
                    return (
                      <TableCell
                        key={r.id}
                        className="align-top"
                        data-testid={`${testId}-cell-${option.id}-${r.supplierId}`}
                      >
                        {firm.length > 0 && prices.length > 0 && <IndicativePill />}
                        {prices.length === 0 ? (
                          <span className="text-xs text-text-tertiary">
                            {t('rfxa.pricing.notPriced')}
                          </span>
                        ) : (
                          <IndicativePriceList prices={prices} currency={currency} />
                        )}
                        {firm.length > 0 && (
                          <FirmPricesInCell
                            prices={firm}
                            currency={currency}
                            testId={`${testId}-firm-${ref}-${r.supplierId}`}
                          />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
            <TableRow data-testid={`${testId}-sample`}>
              <TableCell className="align-top text-sm text-text-primary">
                {t('rfxa.pricing.sampleOffer')}
              </TableCell>
              {responses.map((r) => (
                <TableCell key={r.id} className="align-top text-sm">
                  {!r.pricing?.sample ? (
                    '—'
                  ) : r.pricing.sample.canSample ? (
                    <>
                      {t('rfx.opt.yes')}
                      {r.pricing.sample.readyDate && (
                        <>
                          {' · '}
                          <Data>{formatDate(r.pricing.sample.readyDate)}</Data>
                        </>
                      )}
                    </>
                  ) : (
                    t('rfx.opt.no')
                  )}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="align-top text-sm text-text-primary">
                {t('rfxa.pricing.timeline')}
              </TableCell>
              {responses.map((r) => (
                <TableCell key={r.id} className="align-top text-sm text-text-secondary">
                  {r.pricing?.timelineNote || '—'}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="align-top text-sm text-text-primary">
                {t('rfxa.pricing.validUntil')}
              </TableCell>
              {responses.map((r) => (
                <TableCell key={r.id} className="align-top text-sm">
                  {r.pricing?.validUntil ? <Data>{formatDate(r.pricing.validUntil)}</Data> : '—'}
                </TableCell>
              ))}
            </TableRow>
          </tbody>
        </Table>
      )}
    </div>
  );
};
