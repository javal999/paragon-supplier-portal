/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
import { LEAD_TIME_REFUSAL_KEY, MOQ_REFUSAL_KEY, inputClass, labelClass } from '../const';
import { StillMissing } from '../../rfx/ResponseFormState';
/** @import { QuoteForm } from '../const' */
/** @import { LeadTimeOutcome, LeadTimeUnit } from '../../rfqs/quotationLeadTime' */
/** @import { MoqOutcome } from '../../rfqs/quotationMoq' */

/**
 * @typedef {object} QuoteTermsSectionProps
 * @property {QuoteForm} form
 * @property {(form: QuoteForm) => void} setForm
 * @property {LeadTimeOutcome} leadTime -  The ONE read of the lead time (number + unit).
 * @property {MoqOutcome} moq -  The ONE read of the minimum order quantity.
 * @property {boolean} [showMissing] -  S-02 — say "Still missing" under an empty validity date (once the supplier has started).
 */

/**
 * Step 2 of the single-price quote form: the lead time (number, unit, refusal,
 * and the same-day acknowledgement a stated 0 owes), the validity date, and the
 * minimum order quantity with its refusal. The reads come from
 * `useQuoteSubmission`, the same values the submit gate judges.
 * @type {React.FC<QuoteTermsSectionProps>}
 */
const QuoteTermsSection = ({ form, setForm, leadTime, moq, showMissing = false }) => {
  const { t } = useTranslation();
  return (
    <FormSection
      eyebrow={t('rfqs.panel.step2.eyebrow')}
      title={t('rfqs.panel.step2.title')}
      description={t('rfqs.panel.step2.desc')}
    >
      <div>
        <label className={labelClass}>{t('rfqs.panel.leadTime')}</label>
        <div className="flex gap-2">
          {/* Ruling 6.2, carried into 2e-b-1 because the refusal DEPENDS
          on it: `type="number"` erases "abc" to "" before React sees
          it, and blank is now legal — so the browser would silently
          convert an unreadable lead time into an honest-looking
          absence, and the supplier would never be told. The
          placeholder was "0" — a field modelling the one value that
          now scores best and needs an explicit acknowledgement. */}
          <input
            type="text"
            inputMode="numeric"
            placeholder="14"
            id="quote-lead-time"
            aria-label={t('rfqs.field.leadTime')}
            aria-invalid={!leadTime.ok}
            value={form.leadTimeNum}
            onChange={(e) =>
              setForm({
                ...form,
                leadTimeNum: e.target.value,
                // Editing the number retracts any same-day affirmation —
                // an ack belongs to the value it was given for.
                sameDayAck: false
              })
            }
            className={inputClass}
          />
          <select
            aria-label={t('rfqs.field.leadTimeUnit')}
            value={form.leadTimeUnit}
            onChange={(e) =>
              setForm({
                ...form,
                leadTimeUnit: /** @type {LeadTimeUnit} */ (e.target.value),
                sameDayAck: false
              })
            }
            className={inputClass}
            style={{ width: 100 }}
          >
            <option value="days">{t('rfqs.unit.days')}</option>
            <option value="weeks">{t('rfqs.unit.weeks')}</option>
          </select>
        </div>
        {/* The estimate framing, stated once on the field itself
        (2e-b-1a): required so the bid is comparable, indicative
        because a firm date cannot honestly be given before final
        quantity, PO date and capacity are known. */}
        <div className="mt-1 text-[11px] text-text-tertiary">{t('rfqs.panel.leadTime.hint')}</div>
        {/* An untouched blank does not nag on sight — it refuses at the
        gate, and says so on the field once the supplier has engaged
        with the form (the price precedent, 2e-a). */}
        {!leadTime.ok && form.unitPrice.trim() !== '' && (
          <div
            role="alert"
            data-testid="quote-leadtime-refusal"
            className="mt-1 text-[11px] text-danger"
          >
            {t(LEAD_TIME_REFUSAL_KEY[leadTime.reason])}
          </div>
        )}
        {/* THE HARD GATE — inline, in the flow of the form (no modal:
        every other guard on this surface is inline). Submit stays
        disabled until this is ticked. */}
        {leadTime.ok && leadTime.requiresSameDayAck && (
          <div
            id="quote-leadtime-sameday"
            data-testid="quote-leadtime-sameday"
            className="mt-2 rounded border border-warning bg-warning-soft px-3 py-2"
          >
            <div className="text-[11px] text-warning-hover">
              {t('rfqs.panel.leadTime.sameDay.note')}
            </div>
            <label className="mt-2 flex items-center gap-2 text-[11px] text-text-secondary">
              <input
                type="checkbox"
                checked={form.sameDayAck}
                aria-label={t('rfqs.panel.leadTime.sameDay.ack')}
                onChange={(e) => setForm({ ...form, sameDayAck: e.target.checked })}
              />
              {t('rfqs.panel.leadTime.sameDay.ack')}
            </label>
          </div>
        )}
      </div>
      <div>
        <label className={labelClass}>{t('rfqs.panel.validUntil')}</label>
        <input
          type="date"
          id="quote-valid-until"
          aria-label={t('rfqs.field.validUntil')}
          value={form.validUntil}
          onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
          className={inputClass}
        />
        {/* S-02 — said where it sits once the supplier has started. */}
        {!!showMissing && !form.validUntil.trim() && (
          <StillMissing testId="quote-valid-until-missing" />
        )}
      </div>
      <div>
        <label className={labelClass}>{t('rfqs.panel.moq')}</label>
        {/* Ruling 6.2, and load-bearing here for the same reason as the
        lead time: `type="number"` erases an unreadable token to ""
        before React sees it, and "" is LEGAL on this field — so the
        browser would quietly convert a minimum the supplier typed
        into the "no minimum" default, and nobody would be told. */}
        <input
          type="text"
          inputMode="numeric"
          placeholder={t('rfqs.panel.moqPlaceholder')}
          id="quote-moq"
          aria-label={t('rfqs.field.moq')}
          aria-invalid={!moq.ok}
          value={form.moq}
          onChange={(e) => setForm({ ...form, moq: e.target.value })}
          className={inputClass}
        />
        {/* The default, stated on the field rather than hidden in the
        placeholder — a placeholder disappears the moment anyone
        types, which is exactly when "blank means X" stops being
        readable. */}
        <div className="mt-1 text-[11px] text-text-tertiary">{t('rfqs.panel.moq.hint')}</div>
        {!moq.ok && (
          <div
            role="alert"
            data-testid="quote-moq-refusal"
            className="mt-1 text-[11px] text-danger"
          >
            {t(MOQ_REFUSAL_KEY[moq.reason])}
          </div>
        )}
      </div>
    </FormSection>
  );
};

export default QuoteTermsSection;
