/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
import { BID_CURRENCIES, isBidCurrency } from '@lib/currencyPolicy';
import { PRICE_REFUSAL_KEY, inputClass, labelClass } from '../const';
/** @import { QuoteForm } from '../const' */
/** @import { PriceOutcome } from '../../rfqs/quotationPrice' */

/**
 * @typedef {object} QuotePriceSectionProps
 * @property {QuoteForm} form
 * @property {(form: QuoteForm) => void} setForm
 * @property {PriceOutcome} bidPrice -  The ONE read of the typed price; the refusal under the field reads it.
 * @property {string} totalPrice -  The total preview, already formatted ('—' when no price is readable).
 */

/**
 * Step 1 of the single-price quote form: the unit price with its currency, the
 * price refusal, and the total preview. Edits go through `setForm`; the parse
 * and the total come from `useQuoteSubmission`, so this section reads the same
 * value the submit gate judges.
 * @type {React.FC<QuotePriceSectionProps>}
 */
const QuotePriceSection = ({ form, setForm, bidPrice, totalPrice }) => {
  const { t } = useTranslation();
  return (
    <FormSection
      eyebrow={t('rfqs.panel.step1.eyebrow')}
      title={t('rfqs.panel.step1.title')}
      description={t('rfqs.panel.step1.desc')}
    >
      <div>
        <label className={labelClass}>{t('rfqs.panel.unitPrice')}</label>
        <div className="flex gap-2">
          {/* Ruling 6.2 — `type="number"` filtered the input space to what
          `Number` happens to accept, which is what made the parse look
          optional: the browser silently ate "15.000,50" before any of
          our code could refuse it, and let the catastrophic "1.500"
          through untouched. Text + inputmode lets the supplier type
          what they actually type, and makes the parser load-bearing. */}
          <input
            type="text"
            inputMode="decimal"
            // Not "0" / "0.00": a placeholder must never model a value the
            // field refuses, and it must not model a separator either.
            placeholder="15000"
            aria-label={t('rfqs.field.unitPrice')}
            aria-invalid={form.unitPrice.trim() !== '' && !bidPrice.ok}
            value={form.unitPrice}
            onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
            className={inputClass}
          />
          {/* 2e-c-1 — the options ARE the policy list, not a copy of it
          that drifted from it. They used to be three hand-written
          <option> tags, which is how the form came to offer a
          currency the Quotation entity could not represent. */}
          <select
            // The control had no accessible name at all: a screen reader
            // announced an unlabelled combobox next to the price.
            aria-label={t('rfqs.field.currency')}
            value={form.currency}
            onChange={(e) => {
              // The DOM types a select's value as `string`, so the
              // narrowing is stated rather than asserted. Total in
              // practice — every option came from BID_CURRENCIES — and
              // structural insurance if that ever stops being true.
              const next = e.target.value;
              if (isBidCurrency(next)) {
                setForm({ ...form, currency: next });
              }
            }}
            className={inputClass}
            style={{ width: 100 }}
          >
            {BID_CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="mt-1 text-[length:var(--fs-label-3)] text-text-tertiary">
          {t('rfqs.panel.price.hint')}
        </div>
        {/* An untouched blank does not nag; a TYPED price that cannot be
        read — or a zero, which can — says so, and says what to do. */}
        {form.unitPrice.trim() !== '' && !bidPrice.ok && (
          <div
            role="alert"
            data-testid="quote-price-refusal"
            className="mt-1 text-[length:var(--fs-label-3)] text-danger"
          >
            {t(PRICE_REFUSAL_KEY[bidPrice.reason])}
          </div>
        )}
      </div>
      <div>
        <label className={labelClass}>{t('rfqs.panel.totalPrice')}</label>
        <div
          className={`px-3 py-2 bg-bg-hover border border-border-subtle rounded-md text-sm font-semibold ${
            totalPrice === '—' ? 'text-text-tertiary' : 'text-text-primary'
          }`}
        >
          {/* The currency is IN the formatted value now — the manual
          `${form.currency} ` prefix was the half of COS-01 that
          compensated for a formatter that could not say it. */}
          {totalPrice}
        </div>
      </div>
    </FormSection>
  );
};

export default QuotePriceSection;
