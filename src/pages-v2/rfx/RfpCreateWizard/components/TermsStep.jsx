import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
/** @import React from 'react' */
import { RFP_STANDARD_TERMS, RFP_TERM_GROUP_ORDER, rfpTerm } from '@services/sourcing/rfxConfig';
/** @import { RfpTermRow } from '@services/sourcing/types' */
import { CustomTermEditor, TermValueInput } from '../../RfpTermControls';
/** @import { Draft, DraftForm } from '../const' */

/**
 * @typedef {object} TermsStepProps
 * @property {Draft} draft  the draft as the wizard watches it (`useWatch`)
 * @property {string[]} picked  the picked standard term ids
 * @property {string[]} missingValues  REQ-E03-04 — picked terms still missing PTI's value (or holding one of the wrong kind), NAMED under the list
 * @property {(termId: string) => void} onTogglePick
 * @property {(termId: string, value: string) => void} onSetValue
 */

/**
 * Step 2, "the terms PTI asks for": the standard term list by group (pick a term,
 * then give PTI's requested value), the buyer's own custom terms, and the
 * refusals naming what still blocks the step. The custom-term editor writes
 * `customTerms` with `setValue` through `useFormContext()`.
 * @type {React.FC<TermsStepProps>}
 */
export const TermsStep = ({ draft, picked, missingValues, onTogglePick, onSetValue }) => {
  const { t } = useTranslation();
  const { setValue } = /** @type {DraftForm} */ (useFormContext());
  return (
    <div className="space-y-5">
      <p className="text-xs text-text-tertiary">{t('rfx.create.library.note')}</p>

      {RFP_TERM_GROUP_ORDER.map((group) => {
        const rows = RFP_STANDARD_TERMS.filter((term) => term.group === group);
        if (rows.length === 0) return null;
        return (
          <div key={group}>
            <h4 className="text-xs uppercase tracking-wide text-text-tertiary mb-2">
              {t(`rfx.group.${group}`)}
            </h4>
            <ul className="space-y-2">
              {rows.map((term) => {
                const chosen = term.id in draft.terms;
                /** @type {RfpTermRow} */
                const row = { termId: term.id, requestedValue: '' };
                return (
                  <li
                    key={term.id}
                    data-testid={`rfp-new-term-${term.id}`}
                    className="flex flex-wrap items-center gap-3 border border-border-subtle rounded-md px-3 py-2"
                  >
                    <label className="flex items-center gap-2 text-sm text-text-primary min-w-[14rem]">
                      <input
                        type="checkbox"
                        className="accent-teal"
                        checked={chosen}
                        aria-label={`${t(term.labelKey)} — ${t('rfx.rfp.term.pick')}`}
                        onChange={() => onTogglePick(term.id)}
                      />
                      {t(term.labelKey)}
                    </label>
                    {chosen && (
                      <div className="flex-1 min-w-[12rem]">
                        <TermValueInput
                          row={row}
                          value={draft.terms[term.id]}
                          onChange={(v) => onSetValue(term.id, v)}
                          ariaLabel={`${t(term.labelKey)} — ${t('rfx.rfp.term.requested')}`}
                          invalid={
                            missingValues.includes(term.id) &&
                            draft.terms[term.id].trim().length > 0
                          }
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <CustomTermEditor
        terms={draft.customTerms}
        onChange={(next) => setValue('customTerms', next)}
      />

      {picked.length + draft.customTerms.length === 0 && (
        <p className="text-sm text-danger" data-testid="rfp-new-no-terms">
          {t('rfx.create.atLeastOneTerm')}
        </p>
      )}
      {missingValues.length > 0 && (
        <p className="text-sm text-danger" data-testid="rfp-new-missing-values">
          {t('rfx.rfp.term.requestedMissing')}{' '}
          {missingValues
            .map((id) =>
              t(
                /** @type {import('@services/sourcing/types').RfpTermDefinition} */ (rfpTerm(id))
                  .labelKey
              )
            )
            .join(', ')}
        </p>
      )}
    </div>
  );
};
