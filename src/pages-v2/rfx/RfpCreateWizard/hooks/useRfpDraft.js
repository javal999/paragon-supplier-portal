import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
/** @import { RfpPrefill } from '@services/sourcing/rfxPrefill' */
/** @import { RfpEvent } from '@services/sourcing/types' */
import { authored } from '../../rfxAuthoringDisplay';
import { EMPTY } from '../const';
/** @import { Draft, DraftForm } from '../const' */
import { draftOf } from '../utils';

/**
 * Write each key of `patch` into the draft with `setValue`, so a registered
 * input shows the new value and every `useWatch` reader re-renders.
 * @param {DraftForm} methods
 * @param {Partial<Draft>} patch
 */
export const patchDraft = (methods, patch) => {
  for (const [key, value] of Object.entries(patch)) {
    methods.setValue(/** @type {keyof Draft} */ (key), value);
  }
};

/**
 * Replace the WHOLE draft with `next`: every key the draft holds now and every
 * key `next` holds is written, so a key `next` lacks is cleared, as replacing
 * the `useState` draft did.
 * @param {DraftForm} methods
 * @param {Draft} next
 */
export const replaceDraft = (methods, next) => {
  const keys = new Set([...Object.keys(methods.getValues()), ...Object.keys(next)]);
  /** @type {Record<string, unknown>} */
  const all = {};
  for (const key of keys) all[key] = /** @type {Record<string, unknown>} */ (next)[key];
  patchDraft(methods, /** @type {Partial<Draft>} */ (all));
};

/**
 * The RFP wizard's draft: a react-hook-form `useForm` whose starting values are
 * the Draft RFP being edited (BL-93), the RFI pre-fill (D3), or blank, plus the
 * three clicked edits (pick a term, give a term its value, tick a supplier).
 *
 * ⚠️ **THE GATES ARE NOT REACT-HOOK-FORM'S** (the `GRInspectionWizard` and
 * `SupplierRegistration` pattern): no field is registered with rules and
 * `handleSubmit` is never called. Every value is re-read with `useWatch` on
 * every change and the wizard derives its step gates from it, exactly as it did
 * over the `useState` draft, so each refusal shows at the same moment it always
 * did. `methods` is returned for the wizard to hand down through `FormProvider`.
 * @param {RfpEvent | undefined} editing  BL-93 — the Draft RFP being edited
 * @param {(RfpPrefill & { readonly sourceRfiNumber: string }) | undefined} prefill  D3 — the RFI it is raised from
 */
export const useRfpDraft = (editing, prefill) => {
  const { t } = useTranslation();
  // Built ONCE (the `useState` initializer), as the draft's starting values were.
  const [initialDraft] = useState(
    /** @type {() => Draft} */ (
      () => {
        if (editing) return draftOf(editing);
        if (!prefill) return EMPTY;
        // D3 — the RFI's questions become the RFP's scope notes, resolved here
        // because only a component can translate.
        const notes = prefill.scopeNoteKeys.map((k) => `- ${authored(t, k)}`).join('\n');
        const scope = [prefill.scope, notes ? `${t('rfxa.fromRfi.notes')}\n${notes}` : '']
          .filter((s) => s.trim().length > 0)
          .join('\n\n');
        return {
          ...EMPTY,
          title: prefill.title,
          family: prefill.familyId,
          scope,
          invitedSupplierIds: [...prefill.invitedSupplierIds],
          attachments: prefill.attachments,
          confidential: prefill.confidential,
          confidentialityTerms: prefill.confidentialityTerms ?? '',
          sourceRfiId: prefill.sourceRfiId,
          // NR-1 BR-11 — the RFI's requests carry; its responses' documents do not.
          documentRequests: prefill.documentRequests
        };
      }
    )
  );
  const methods = /** @type {DraftForm} */ (useForm({ defaultValues: initialDraft }));
  const { control, getValues, setValue } = methods;
  // Every value, re-read on every change: the step gates derive from them.
  const draft = /** @type {Draft} */ (useWatch({ control }));

  /** @param {string} termId */
  const togglePick = (termId) => {
    const terms = getValues('terms');
    if (termId in terms) {
      const { [termId]: _dropped, ...rest } = terms;
      setValue('terms', rest);
    } else {
      setValue('terms', { ...terms, [termId]: '' });
    }
  };

  /**
   * @param {string} termId
   * @param {string} value
   */
  const setTermValue = (termId, value) =>
    setValue('terms', { ...getValues('terms'), [termId]: value });

  /** @param {string} supplierId */
  const toggleSupplier = (supplierId) => {
    const ids = getValues('invitedSupplierIds');
    setValue(
      'invitedSupplierIds',
      ids.includes(supplierId) ? ids.filter((s) => s !== supplierId) : [...ids, supplierId]
    );
  };

  return { methods, draft, togglePick, setTermValue, toggleSupplier };
};
