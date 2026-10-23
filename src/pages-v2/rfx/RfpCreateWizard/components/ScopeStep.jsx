import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
/** @import React from 'react' */
import SessionAttachments from '@components/ui-v2/SessionAttachments';
import { BID_CURRENCIES } from '@lib/currencyPolicy';
import { RFX_CATEGORY_FAMILIES } from '@services/sourcing/rfxConfig';
/** @import { RfpPrefill } from '@services/sourcing/rfxPrefill' */
/** @import { RfpEvent } from '@services/sourcing/types' */
/** @import { StartOption } from '../../RfxStartFrom' */
import RfxStartFrom from '../../RfxStartFrom';
import { ConfidentialityFields } from '../../RfiCreateWizard';
import { PrefillBanner } from '../../rfqSources';
/** @import { Draft, DraftForm } from '../const' */

/**
 * @typedef {object} ScopeStepProps
 * @property {Draft} draft  the draft as the wizard watches it (`useWatch`)
 * @property {RfpPrefill & { readonly sourceRfiNumber: string }} [prefill]  D3 — set: the "pre-filled from RFI" banner shows
 * @property {RfpEvent} [editing]  BL-93 — set: the edit banner replaces the start-from picker
 * @property {StartOption[]} startOptions  saved templates and past events the picker offers
 * @property {(key: string) => void} onApplyStart
 * @property {(key: string) => void} onDeleteSaved
 * @property {boolean} unreadable  the template store could not be read
 * @property {React.ComponentProps<typeof RfxStartFrom>['rejected']} rejected  stored templates refused on read
 * @property {boolean} deadlineInFuture  CE-07 — false while a date is entered: the deadline refusal shows
 *   under it. An empty date keeps the step shut (index.jsx) but shows no refusal yet.
 */

/**
 * Step 1, "what it is about": the RFI pre-fill banner or the edit banner, the
 * start-from picker (new RFP only), title, family, scope, currency, response
 * deadline (refused unless in the future), buyer attachments, confidentiality,
 * and the T&C text and file. The typed fields are `register`ed on the draft
 * through `useFormContext()`; the attachments and confidentiality write it with
 * `setValue`.
 * @type {React.FC<ScopeStepProps>}
 */
export const ScopeStep = ({
  draft,
  prefill,
  editing,
  startOptions,
  onApplyStart,
  onDeleteSaved,
  unreadable,
  rejected,
  deadlineInFuture
}) => {
  const { t } = useTranslation();
  const { register, setValue } = /** @type {DraftForm} */ (useFormContext());
  const inputClass =
    'w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action';
  const labelClass = 'block text-xs font-semibold text-text-secondary mb-1';

  return (
    <div className="space-y-5">
      {/* B6 — the one-line source note, the same banner the RFQ wizard
          shows, naming the RFI by its number (the view's resolver). */}
      {prefill && !editing && (
        <PrefillBanner source={prefill.sourceRfiNumber} testId="rfp-new-from-rfi" />
      )}
      {editing ? (
        <div
          className="text-sm text-text-secondary bg-bg-hover border border-border-subtle rounded-md px-3 py-2"
          data-testid="rfp-edit-banner"
        >
          <span className="font-semibold text-text-primary">
            {t('rfxEdit.editing', { number: editing.eventNumber })}
          </span>{' '}
          {t('rfxEdit.editing.hint')}
        </div>
      ) : (
        <RfxStartFrom
          options={startOptions}
          onApply={onApplyStart}
          onDeleteSaved={onDeleteSaved}
          unreadable={unreadable}
          rejected={rejected}
          testIdPrefix="rfp-new"
        />
      )}
      <div>
        <label className={labelClass} htmlFor="rfp-new-title">
          {t('rfx.create.field.title')}
        </label>
        <input
          id="rfp-new-title"
          {...register('title')}
          placeholder={t('rfx.create.field.title.ph')}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="rfp-new-family">
          {t('rfx.create.field.family')}
        </label>
        <select
          id="rfp-new-family"
          data-testid="rfp-new-family"
          {...register('family')}
          className={inputClass}
        >
          <option value="">{t('rfx.create.field.family.pick')}</option>
          {RFX_CATEGORY_FAMILIES.map((f) => (
            <option key={f.id} value={f.id}>
              {t(f.labelKey)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor="rfp-new-scope">
          {t('rfx.rfp.field.scope')}
        </label>
        <textarea
          id="rfp-new-scope"
          rows={4}
          {...register('scope')}
          placeholder={t('rfx.rfp.field.scope.ph')}
          className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action"
        />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[10rem]">
          <label className={labelClass} htmlFor="rfp-new-currency">
            {t('rfx.rfp.field.currency')}
          </label>
          <select
            id="rfp-new-currency"
            data-testid="rfp-new-currency"
            {...register('currency')}
            className={inputClass}
          >
            {BID_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="rfp-new-deadline">
            {t('rfx.create.field.deadline')}
          </label>
          <input
            id="rfp-new-deadline"
            type="date"
            {...register('responseDeadline')}
            className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
          />
          {draft.responseDeadline !== '' && !deadlineInFuture && (
            <p className="text-xs text-danger mt-1" data-testid="rfp-new-deadline-refusal">
              {t('rfx.create.field.deadline.future')}
            </p>
          )}
        </div>
      </div>
      <div>
        <SessionAttachments
          value={draft.attachments}
          onChange={(next) => setValue('attachments', next)}
          label={t('rfxa.att.buyer')}
          testId="rfp-new-attachments"
        />
      </div>
      <ConfidentialityFields
        confidential={draft.confidential}
        terms={draft.confidentialityTerms}
        onChange={(confidential, terms) => {
          setValue('confidential', confidential);
          setValue('confidentialityTerms', terms);
        }}
        testIdPrefix="rfp-new"
      />
      <div className="space-y-2" data-testid="rfp-new-tc">
        <label className={labelClass} htmlFor="rfp-new-tc-text">
          {t('rfxa.tc.title')}
        </label>
        <p className="text-xs text-text-tertiary">{t('rfxa.tc.hint')}</p>
        <textarea
          id="rfp-new-tc-text"
          rows={3}
          {...register('termsText')}
          className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action"
        />
        <SessionAttachments
          value={draft.termsFile}
          single
          onChange={(next) => setValue('termsFile', next)}
          label={t('rfxa.tc.file')}
          testId="rfp-new-tc-file"
        />
      </div>
    </div>
  );
};
