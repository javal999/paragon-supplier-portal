// ────────────────────────────────────────────────────────────────────────────
// The RFQ wizard's "Terms" step: the two deadlines, Incoterms, payment terms
// and the bid currency. Moved out of `BuyerSourcing.jsx` by the Phase 5 page
// split (no behaviour change). The two option lists live HERE because this
// step `.map()`s them (the module-scope-literal gate keys them `file::CONST`).
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { DraftRfq } from '../const' */
/** @import { useRfqWizard } from '../hooks/useRfqWizard' */
import { BID_CURRENCIES } from '@lib/currencyPolicy';

const INCOTERMS_OPTIONS = ['FOB', 'CIF', 'EXW', 'DDP', 'FCA'];
const PAYMENT_TERMS_OPTIONS = ['Net 30', 'Net 45', 'Net 60', 'Letter of Credit', 'Advance Payment'];

/**
 * The Terms step's content. `updateDraft` writes each field back to the draft.
 * @type {React.FC<{ draft: DraftRfq; updateDraft: ReturnType<typeof useRfqWizard>['updateDraft']; t: TFunction }>}
 */
const WizardTermsStep = ({ draft, updateDraft, t }) => (
  <div className="space-y-5">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block">
          <span className="text-label text-text-tertiary uppercase block mb-1.5">
            {t('sourcing.wizard.field.responseDeadline')} <span className="text-danger">*</span>
          </span>
          <input
            type="date"
            value={draft.responseDeadline}
            onChange={(e) => updateDraft('responseDeadline', e.target.value)}
            className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
          />
        </label>
      </div>
      <div>
        <label className="block">
          <span className="text-label text-text-tertiary uppercase block mb-1.5">
            {t('sourcing.wizard.field.awardDeadline')} <span className="text-danger">*</span>
          </span>
          <input
            type="date"
            value={draft.awardDeadline}
            onChange={(e) => updateDraft('awardDeadline', e.target.value)}
            className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
          />
        </label>
        {draft.responseDeadline &&
          draft.awardDeadline &&
          new Date(draft.awardDeadline) <= new Date(draft.responseDeadline) && (
            <p className="text-xs text-danger mt-1">{t('sourcing.wizard.awardAfterResponse')}</p>
          )}
      </div>
      <div>
        <label className="block">
          <span className="text-label text-text-tertiary uppercase block mb-1.5">
            {t('sourcing.wizard.field.incoterms')}
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
      <div>
        <label className="block">
          <span className="text-label text-text-tertiary uppercase block mb-1.5">
            {t('sourcing.wizard.field.paymentTerms')}
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
    </div>
    <div>
      <label className="text-label text-text-tertiary uppercase block mb-1.5">
        {t('sourcing.wizard.field.currency')}
      </label>
      <div className="flex gap-4">
        {/* Every currency the bid policy permits, and the one chosen is
            now STORED — the create handler used to write 'IDR'. */}
        {BID_CURRENCIES.map((cur) => (
          <label key={cur} className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="currency"
              value={cur}
              checked={draft.currency === cur}
              onChange={() => updateDraft('currency', cur)}
              className="accent-teal"
            />
            <span className="text-sm text-text-secondary">{cur}</span>
          </label>
        ))}
      </div>
    </div>
  </div>
);

export default WizardTermsStep;
