/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { QtyRefusalReason } from '@lib/localeNumber' */
/** @import { ContractNumericField, readContractValue, readNoticeRequiredDays } from '../../contracts/contractCreateModel' */
/** @import { DraftContract } from '../const' */
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '@components/ui-v2/GlossaryTermChip';

const PAYMENT_TERMS_OPTIONS = ['Net 30', 'Net 45', 'Net 60', 'Letter of Credit', 'Advance Payment'];

const INCOTERMS_OPTIONS = ['FOB', 'CIF', 'EXW', 'DDP', 'FCA'];

// CP-0 · W1 · 2f-b — each refusal names what to type instead. "Invalid input"
// would leave an Indonesian buyer staring at a number that reads correctly to
// them, which is exactly how "1.500" became Rp 1.5 in the first place.
/** @type {Record<QtyRefusalReason, string>} */
const CONTRACT_VALUE_REFUSAL_KEY = {
  EMPTY_QTY: 'contracts.wizard.value.refused.empty',
  NOT_NUMERIC: 'contracts.wizard.value.refused.notNumeric',
  AMBIGUOUS_QTY: 'contracts.wizard.value.refused.ambiguous'
};

/** @type {Record<QtyRefusalReason, string>} */
const CONTRACT_NOTICE_REFUSAL_KEY = {
  EMPTY_QTY: 'contracts.wizard.noticeDays.refused.empty',
  NOT_NUMERIC: 'contracts.wizard.noticeDays.refused.notNumeric',
  AMBIGUOUS_QTY: 'contracts.wizard.noticeDays.refused.ambiguous'
};

/**
 * The i18n key of one numeric field's refusal — the submit guard's toast reads
 * it. It lives beside the two maps it reads because GL-1's chip-coverage guard
 * pairs a map's uses with its declaration in one file.
 * @param {ContractNumericField} field
 * @param {QtyRefusalReason} reason
 * @returns {string}
 */
export const contractRefusalKey = (field, reason) =>
  field === 'value' ? CONTRACT_VALUE_REFUSAL_KEY[reason] : CONTRACT_NOTICE_REFUSAL_KEY[reason];

/**
 * @typedef {object} WizardTermsStepProps
 * @property {DraftContract} draft The draft being collected.
 * @property {<K extends keyof DraftContract>(key: K, value: DraftContract[K]) => void} updateDraft
 *   Sets one draft field.
 * @property {ReturnType<typeof readNoticeRequiredDays>} noticeRead The ONE parse of the notice
 *   period, so the inline refusal and the step gate cannot disagree.
 * @property {ReturnType<typeof readContractValue>} valueRead The ONE parse of the contract value.
 * @property {TFunction} t
 */

/**
 * Wizard step 2, "Terms": the period, auto-renewal and its notice period, the
 * contract value, payment terms and incoterms. Each numeric field reports its
 * own refusal inline with a glossary chip. Moved out of `BuyerContracts.jsx`
 * by the Phase 5 page split (no behaviour change).
 * @type {React.FC<WizardTermsStepProps>}
 */
const WizardTermsStep = ({ draft, updateDraft, noticeRead, valueRead, t }) => (
  <div className="space-y-5">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="text-label text-text-tertiary uppercase block mb-1.5">
          {t('contracts.wizard.field.startDate')} <span className="text-danger">*</span>
        </label>
        <input
          type="date"
          value={draft.startDate}
          onChange={(e) => updateDraft('startDate', e.target.value)}
          aria-label={t('contracts.wizard.field.startDate')}
          className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
        />
      </div>
      <div>
        <label className="text-label text-text-tertiary uppercase block mb-1.5">
          {t('contracts.wizard.field.endDate')} <span className="text-danger">*</span>
        </label>
        <input
          type="date"
          value={draft.endDate}
          onChange={(e) => updateDraft('endDate', e.target.value)}
          aria-label={t('contracts.wizard.field.endDate')}
          className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
        />
        {draft.startDate &&
          draft.endDate &&
          new Date(draft.endDate) <= new Date(draft.startDate) && (
            <p className="text-xs text-danger mt-1">{t('contracts.wizard.endBeforeStart')}</p>
          )}
      </div>
    </div>
    <div>
      <label className="inline-flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={draft.autoRenewal}
          onChange={(e) => updateDraft('autoRenewal', e.target.checked)}
          aria-label={t('contracts.wizard.field.autoRenewal')}
          className="accent-teal w-4 h-4"
        />
        <span className="text-sm text-text-primary font-medium">
          {t('contracts.wizard.field.autoRenewal')}
        </span>
        <span className="text-xs text-text-tertiary">{t('contracts.wizard.autoRenewalHint')}</span>
      </label>
      {/* A REFUSAL MUST NEVER BE INVISIBLE. The input belongs to
          auto-renewal, but the draft keeps its value when the box is
          unchecked — so an operator who clears the field and then unchecks
          the box would otherwise be held on this step by a field they
          cannot see. Rendering it while it refuses keeps the gate
          actionable without weakening it. */}
      {(draft.autoRenewal || !noticeRead.ok) && (
        <div className="mt-3 max-w-xs">
          <label className="text-label text-text-tertiary uppercase block mb-1.5">
            {t('contracts.wizard.field.noticeDays')} <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={draft.noticeRequiredDays}
            onChange={(e) => updateDraft('noticeRequiredDays', e.target.value)}
            placeholder={t('contracts.wizard.placeholder.noticeDays')}
            aria-label={t('contracts.wizard.field.noticeDays')}
            aria-invalid={!noticeRead.ok}
            className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
          />
          {!noticeRead.ok && (
            <div
              role="alert"
              data-testid="contract-notice-refusal"
              className="mt-1 text-[length:var(--fs-label-3)] text-danger"
            >
              {t(CONTRACT_NOTICE_REFUSAL_KEY[noticeRead.reason])}{' '}
              <GlossaryTermChip
                refTo={{ sourceType: 'QtyRefusalReason', term: noticeRead.reason }}
              />
            </div>
          )}
        </div>
      )}
    </div>
    <div>
      <label className="text-label text-text-tertiary uppercase block mb-1.5">
        {t('contracts.wizard.field.value')} <span className="text-danger">*</span>
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={draft.value}
        onChange={(e) => updateDraft('value', e.target.value)}
        placeholder={t('contracts.wizard.placeholder.value')}
        aria-label={t('contracts.wizard.field.value')}
        aria-invalid={draft.value.trim() !== '' && !valueRead.ok}
        className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
      />
      {/* An untouched blank does not nag on sight — it refuses at the gate
          (Next stays disabled) and says so on the field once the buyer has
          typed something (the 2e-a price precedent). */}
      {draft.value.trim() !== '' && !valueRead.ok && (
        <div
          role="alert"
          data-testid="contract-value-refusal"
          className="mt-1 text-[length:var(--fs-label-3)] text-danger"
        >
          {t(CONTRACT_VALUE_REFUSAL_KEY[valueRead.reason])}{' '}
          <GlossaryTermChip refTo={{ sourceType: 'QtyRefusalReason', term: valueRead.reason }} />
        </div>
      )}
      {/* The pre-existing `> 0` gate, finally SAYING SO. It has always
          disabled Next on a typed zero; it did it in silence, which is the
          same family of defect as a misread number. No rule changes. */}
      {valueRead.ok && valueRead.value === 0 && (
        <div
          role="alert"
          data-testid="contract-value-zero"
          className="mt-1 text-[length:var(--fs-label-3)] text-danger"
        >
          {t('contracts.wizard.value.mustExceedZero')}
        </div>
      )}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block">
          <span className="text-label text-text-tertiary uppercase block mb-1.5">
            {t('contracts.wizard.field.paymentTerms')}
          </span>
          <select
            value={draft.paymentTerms}
            onChange={(e) => updateDraft('paymentTerms', e.target.value)}
            className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
          >
            {PAYMENT_TERMS_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label className="block">
          <span className="text-label text-text-tertiary uppercase block mb-1.5">
            {t('contracts.wizard.field.incoterms')}
          </span>
          <select
            value={draft.incoterms}
            onChange={(e) => updateDraft('incoterms', e.target.value)}
            className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
          >
            {INCOTERMS_OPTIONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  </div>
);

export default WizardTermsStep;
