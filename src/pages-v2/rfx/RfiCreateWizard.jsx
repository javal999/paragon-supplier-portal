// ────────────────────────────────────────────────────────────────────────────
// RAISING AN INFORMATION REQUEST — section 3.6a (CE-01 to CE-08), REQ-E03-02,
// and the RFx authoring batch (2026-09-21).
//
// Five steps, in the order the act actually happens: what the request is about,
// what it asks, who is asked, which documents each supplier sends back (NR-1
// BR-02), and a last look before it leaves the building.
//
// ⚠️ **"SAVE DRAFT" AND "SEND TO SUPPLIERS" ARE TWO ACTS, NOT ONE BUTTON WITH A
// CONFIRMATION (CE-06).** Creating and sending are separate permissions — a
// buyer may hold `rfi:create` and not `rfi:publish`, and then this wizard can
// raise a draft somebody else sends. One "Create" button that also published
// would collapse that pair and make the second permission unenforceable from
// the only screen that could respect it.
//
// ⚠️ **THE LIBRARY IS NEVER EDITED HERE (CE-03 / CE-05).** The template opens
// the question list and the buyer adds and removes FOR THIS EVENT; the event
// carries its own list from birth (the create verb stores `questions`), so a
// later change to `rfxConfig` never rewrites an event suppliers have answered.
//
// ⚠️ **CE-04 IS REVERSED (D2).** The buyer may start from a system template,
// from a template of their own, or from a copy of a past RFI, and may save this
// one as a template. A copy carries content and invitees; its dates are blank.
// Templates live in this browser (`rfxTemplates.js`) and the page says so.
//
// ⚠️ **A ONE-OFF QUESTION'S PROMPT IS THE BUYER'S OWN WORDS, NOT AN i18n KEY.**
// Every library prompt is a key resolved through `t()`; a question typed here
// cannot be, because nobody translated it. It renders as the buyer's sentence
// in both locales (`authored`), which is the honest outcome.
//
// ⚠️ **BL-93 — THE SAME WIZARD EDITS A DRAFT.** With `editing`, it opens on
// every stored field of that Draft RFI (dates included — it is the same event,
// not a copy) and saves through `t_rfi_revise_draft` instead of creating a
// second event. "Save changes" keeps it a draft; "Save and send" also sends it,
// which still needs `rfi:publish`. Start-from is hidden: replacing a draft's
// content from a template is a new event, not an edit.
//
// ⚠️ **THE DRAFT IS A REACT-HOOK-FORM `useForm`; THE GATES ARE NOT ITS** (the
// `GRInspectionWizard` and `SupplierRegistration` pattern). No field is
// registered with rules and `handleSubmit` is never called: every value is
// re-read with `useWatch` and the step gates derive from it, exactly as they
// did over the `useState` draft. The typed fields are `register`ed; the
// clicked and composite ones (questions, invitees, files, documents,
// confidentiality) are written with `setValue`.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import SessionAttachments from '@components/ui-v2/SessionAttachments';
/** @import { WizardStep } from '@components/ui-v2/Wizard' */
import Wizard from '@components/ui-v2/Wizard';
import ModalOverlay from '@components/ui-v2/ModalOverlay';
import { useToast } from '@hooks/useToast';
import { BASE_CURRENCY } from '@lib/currencyPolicy';
import { formatDate } from '@lib/format';
/** @import { AttachmentMeta } from '@services/attachments/sessionAttachments' */
import { useRfxCommand } from '@services/query/commandHooks';
import {
  RFI_QUESTION_LIBRARY,
  RFI_TEMPLATES,
  RFX_CATEGORY_FAMILIES,
  rfiTemplate,
  rfxCategoryFamily,
  rfxFamilyForCategory
} from '@services/sourcing/rfxConfig';
/** @import { RfiTemplateContent } from '@services/sourcing/rfxTemplates' */
import { rfiTemplateStore } from '@services/sourcing/rfxTemplates';
import { isPastDeadline } from '@services/transitions/rfxRules';
import { documentRequestsRefusal } from '@services/transitions/rfxDocumentRules';
/** @import { DocumentRequest, RfiEvent, RfiQuestion, RfxCustomSection } from '@services/sourcing/types' */
import DocumentRequestsEditor, { DocumentRequestsSummary } from './DocumentRequestsEditor';
import RfxInviteeStep from './RfxInviteeStep';
import InviteeNames from './InviteeNames';
import { useSourcingTypeMap } from './eligibilityDisplay';
import { mappedSourcingType } from '@services/sourcing/sourcingType';
import RfxQuestionEditor from './RfxQuestionEditor';
import RfxSaveTemplate from './RfxSaveTemplate';
/** @import { StartOption } from './RfxStartFrom' */
import RfxStartFrom from './RfxStartFrom';
import { rfxNow } from './rfxDisplay';
import { draftEditRefusal } from './draftEdit';

/**
 * @typedef {object} Draft
 * @property {string} title
 * @property {string} family
 * @property {string} description
 * @property {string} responseDeadline
 * @property {readonly RfiQuestion[]} questions
 * @property {readonly RfxCustomSection[]} customSections
 * @property {string[]} invitedSupplierIds
 * @property {readonly AttachmentMeta[]} attachments
 * @property {boolean} confidential
 * @property {string} confidentialityTerms
 * @property {string} [purchasingGroup] -  Not authored here: carried so an edit keeps the event's purchasing group.
 * @property {readonly DocumentRequest[]} documentRequests -  NR-1 BR-02 — edited on the "Documents from suppliers" step (B3).
 */

/** @type {Draft} */
const EMPTY = {
  title: '',
  family: '',
  description: '',
  responseDeadline: '',
  questions: [],
  customSections: [],
  invitedSupplierIds: [],
  attachments: [],
  confidential: false,
  confidentialityTerms: '',
  documentRequests: []
};

/**
 * @typedef {object} RfiCreateWizardProps
 * @property {() => void} onCancel -  Close without creating anything.
 * @property {(rfiId: string) => void} onCreated -  The new event's id — the board lands the buyer on it (CE-08's trail).
 * @property {boolean} canPublish -  Does this seat hold `rfi:publish`? A seat that does not may still draft.
 * @property {readonly RfiEvent[]} [pastEvents] -  Past events the buyer may copy (D2).
 * @property {RfiEvent} [editing] -  BL-93 — the Draft RFI being edited. Absent = a new RFI.
 */

/**
 * BL-93 — a stored Draft RFI as the wizard edits it: every field, dates kept.
 * @param {RfiEvent} e
 * @returns {Draft}
 */
const draftOf = (e) => ({
  title: e.title,
  family: rfxFamilyForCategory(e.materialCategory)?.id ?? '',
  description: e.description ?? '',
  responseDeadline: e.responseDeadline,
  questions: e.questions,
  customSections: e.customSections ?? [],
  invitedSupplierIds: e.invitees.map((i) => i.supplierId),
  attachments: e.attachments ?? [],
  confidential: !!e.confidentiality,
  confidentialityTerms: e.confidentiality?.terms ?? '',
  ...(e.purchasingGroup ? { purchasingGroup: e.purchasingGroup } : {}),
  documentRequests: e.documentRequests ?? []
});

/**
 * The template content this draft would save (D2): content only, never who or when.
 * @param {Draft} d
 * @returns {RfiTemplateContent}
 */
const contentOf = (d) => ({
  familyId: d.family,
  ...(d.description.trim() ? { description: d.description.trim() } : {}),
  questions: d.questions,
  customSections: d.customSections,
  confidential: d.confidential,
  ...(d.confidential && d.confidentialityTerms.trim()
    ? { confidentialityTerms: d.confidentialityTerms.trim() }
    : {}),
  ...(d.documentRequests.length > 0 ? { documentRequests: d.documentRequests } : {})
});

/**
 * The react-hook-form handle over the RFI draft.
 * @typedef {import('react-hook-form').UseFormReturn<Draft>} DraftForm
 */

/**
 * Write each key of `patch` into the draft with `setValue`, so a registered
 * input shows the new value and the `useWatch` reader re-renders.
 * @param {DraftForm} methods
 * @param {Partial<Draft>} patch
 */
const patchDraft = (methods, patch) => {
  for (const [key, value] of Object.entries(patch)) {
    methods.setValue(/** @type {keyof Draft} */ (key), value);
  }
};

/**
 * Replace the WHOLE draft with `next`: a key the draft holds and `next` lacks is
 * cleared, as replacing the `useState` draft did.
 * @param {DraftForm} methods
 * @param {Draft} next
 */
const replaceDraft = (methods, next) => {
  const keys = new Set([...Object.keys(methods.getValues()), ...Object.keys(next)]);
  /** @type {Record<string, unknown>} */
  const all = {};
  for (const key of keys) all[key] = /** @type {Record<string, unknown>} */ (next)[key];
  patchDraft(methods, /** @type {Partial<Draft>} */ (all));
};

/** @type {React.FC<RfiCreateWizardProps>} */
const RfiCreateWizard = ({ onCancel, onCreated, canPublish, pastEvents = [], editing }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const command = useRfxCommand();
  const [step, setStep] = useState(0);
  // The draft's starting values, built once (the `useState` initializer).
  const [initialDraft] = useState(
    /** @type {() => Draft} */ (() => (editing ? draftOf(editing) : EMPTY))
  );
  const methods = /** @type {DraftForm} */ (useForm({ defaultValues: initialDraft }));
  const { control, register, setValue, getValues } = methods;
  // Every value, re-read on every change: the step gates derive from them.
  const draft = /** @type {Draft} */ (useWatch({ control }));
  // Bumped after a save or delete so the picker re-reads the store.
  const [storeVersion, setStoreVersion] = useState(0);
  // RFx UX 2A (B-11) — the deadline refusal waits until the buyer has left the
  // field once; it read as an error before anything was typed. "Left once" is
  // react-hook-form's touched state, set on the registered input's blur. Then a
  // blank date says it is required, a past one that it must be in the future
  // (RFX-D32; the RFP wizard reads the same way).
  const deadlineTouched = !!methods.formState.touchedFields.responseDeadline;

  const family = rfxCategoryFamily(draft.family);
  // Material G2 (MR-10 BR-06) — the type comes from the category (and the
  // purchasing group when one is set); the buyer never types it.
  const sourcingMap = useSourcingTypeMap();
  const sourcingType = family
    ? mappedSourcingType(
        {
          kind: 'rfi',
          materialCategory: family.supplierCategory,
          ...(draft.purchasingGroup ? { purchasingGroup: draft.purchasingGroup } : {})
        },
        sourcingMap
      )
    : undefined;
  const template = family?.templateId ? rfiTemplate(family.templateId) : undefined;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `storeVersion` is bumped after a store write, so the memo re-reads the store
  const saved = useMemo(() => rfiTemplateStore.readState(), [storeVersion]);

  /** @type {StartOption[]} */
  const startOptions = [
    ...RFI_TEMPLATES.map((tpl) => ({
      key: `system:${tpl.id}`,
      label: t(tpl.nameKey),
      group: /** @type {const} */ ('system')
    })),
    ...saved.templates.map((tpl) => ({
      key: `saved:${tpl.id}`,
      label: tpl.name,
      group: /** @type {const} */ ('saved')
    })),
    ...pastEvents.map((e) => ({
      key: `past:${e.id}`,
      label: `${e.eventNumber} · ${e.title}`,
      group: /** @type {const} */ ('past')
    }))
  ];

  /** @param {RfiTemplateContent} c */
  const applyContent = (c) =>
    patchDraft(methods, {
      family: c.familyId,
      description: c.description ?? getValues('description'),
      questions: c.questions,
      customSections: c.customSections,
      confidential: c.confidential,
      confidentialityTerms: c.confidentialityTerms ?? '',
      documentRequests: c.documentRequests ?? []
    });

  /** @param {string} key */
  const applyStart = (key) => {
    const [kind, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    if (kind === 'system') {
      const fam = RFX_CATEGORY_FAMILIES.find((f) => f.templateId === id);
      patchDraft(methods, {
        family: fam?.id ?? getValues('family'),
        questions: rfiTemplate(id)?.questions ?? [],
        customSections: []
      });
    } else if (kind === 'saved') {
      const tpl = saved.templates.find((x) => x.id === id);
      if (tpl) applyContent(tpl.content);
    } else if (kind === 'past') {
      const e = pastEvents.find((x) => x.id === id);
      if (!e) return;
      // A COPY carries content and invitees; its dates are cleared (D2).
      replaceDraft(methods, {
        ...EMPTY,
        title: e.title,
        family: rfxFamilyForCategory(e.materialCategory)?.id ?? '',
        description: e.description ?? '',
        questions: e.questions,
        customSections: e.customSections ?? [],
        invitedSupplierIds: e.invitees.map((i) => i.supplierId),
        attachments: e.attachments ?? [],
        confidential: !!e.confidentiality,
        confidentialityTerms: e.confidentiality?.terms ?? '',
        // NR-1 BR-11 — the buyer's requests copy; supplier documents never do.
        documentRequests: e.documentRequests ?? []
      });
    }
  };

  /**
   * Choosing the family RE-OPENS the question list from its template. The
   * family itself is already written by its registered select.
   * @param {string} id
   */
  const chooseFamily = (id) => {
    const tpl = rfxCategoryFamily(id)?.templateId;
    const questions = tpl ? [...(rfiTemplate(tpl)?.questions ?? [])] : [];
    patchDraft(methods, { questions, customSections: [] });
  };

  /** @param {string} supplierId */
  const toggleSupplier = (supplierId) => {
    const ids = getValues('invitedSupplierIds');
    setValue(
      'invitedSupplierIds',
      ids.includes(supplierId) ? ids.filter((s) => s !== supplierId) : [...ids, supplierId]
    );
  };

  // CE-07 — a deadline already past is not a response window. The reading is
  // the VERB's own (`isPastDeadline`, end of the deadline day), not a second
  // recipe: a wizard that accepted a date the submit gate treats as closed would
  // publish an event no supplier could answer.
  const deadlineInFuture =
    draft.responseDeadline !== '' && !isPastDeadline(draft.responseDeadline, rfxNow());

  /**
   * @param {number} n
   * @returns {boolean}
   */
  const stepValid = (n) => {
    if (n === 0) return draft.title.trim().length > 0 && draft.family !== '' && deadlineInFuture;
    if (n === 1) return draft.questions.length > 0;
    if (n === 2) return draft.invitedSupplierIds.length > 0;
    // NR-1 BR-02 — the create verb's own rule; an RFI has no items.
    if (n === 3) return documentRequestsRefusal(draft.documentRequests) === null;
    return true;
  };

  const sendable = stepValid(0) && stepValid(1) && stepValid(2) && stepValid(3);

  /** @param {boolean} publish */
  const create = (publish) =>
    command.mutate(
      {
        ...(editing
          ? { verb: /** @type {const} */ ('reviseRfi'), rfiId: editing.id }
          : { verb: /** @type {const} */ ('createRfi') }),
        title: draft.title.trim(),
        ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
        templateId: template?.id ?? '',
        materialCategory: family?.supplierCategory ?? '',
        ...(draft.purchasingGroup ? { purchasingGroup: draft.purchasingGroup } : {}),
        responseDeadline: draft.responseDeadline,
        invitedSupplierIds: draft.invitedSupplierIds,
        questions: draft.questions,
        ...(draft.customSections.length > 0 ? { customSections: draft.customSections } : {}),
        ...(draft.attachments.length > 0 ? { attachments: draft.attachments } : {}),
        ...(draft.documentRequests.length > 0 ? { documentRequests: draft.documentRequests } : {}),
        ...(draft.confidential
          ? {
              confidentiality: draft.confidentialityTerms.trim()
                ? { terms: draft.confidentialityTerms.trim() }
                : {}
            }
          : {}),
        ...(publish ? { publish: true } : {})
      },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'error',
              title:
                draftEditRefusal(t, res.reason) ??
                t('rfx.toast.refused', { reason: res.reason ?? '' })
            });
            return;
          }
          toast({
            variant: 'success',
            title: t(
              editing
                ? publish
                  ? 'rfxEdit.toast.sent'
                  : 'rfxEdit.toast.saved'
                : publish
                  ? 'rfx.toast.published'
                  : 'rfx.toast.draftCreated'
            )
          });
          // ⚠️ THE ID COMES FROM THE STORE, NOT FROM HERE. A client-minted id
          // would land the buyer on an event that does not exist.
          if (res.entityId) onCreated(res.entityId);
          else onCancel();
        },
        onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) })
      }
    );

  /** @param {string} name */
  const saveTemplate = (name) => {
    const res = rfiTemplateStore.save(name, contentOf(getValues()), rfxNow());
    setStoreVersion((v) => v + 1);
    return res;
  };

  const inputClass =
    'w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action';
  const labelClass = 'block text-xs font-semibold text-text-secondary mb-1';

  /** @type {WizardStep[]} */
  const steps = [
    {
      id: 'scope',
      title: t('rfx.create.step.scope'),
      shortTitle: t('rfx.create.step.scope.short'),
      description: t('rfx.create.step.scope.desc'),
      content: (
        <div className="space-y-5">
          {editing ? (
            <div
              className="text-sm text-text-secondary bg-bg-hover border border-border-subtle rounded-md px-3 py-2"
              data-testid="rfi-edit-banner"
            >
              <span className="font-semibold text-text-primary">
                {t('rfxEdit.editing', { number: editing.eventNumber })}
              </span>{' '}
              {t('rfxEdit.editing.hint')}
            </div>
          ) : (
            <RfxStartFrom
              options={startOptions}
              onApply={applyStart}
              onDeleteSaved={(key) => {
                rfiTemplateStore.remove(key.slice('saved:'.length));
                setStoreVersion((v) => v + 1);
              }}
              unreadable={saved.unreadable}
              rejected={saved.rejected}
              testIdPrefix="rfi-new"
            />
          )}
          <div>
            <label className={labelClass} htmlFor="rfi-new-title">
              {t('rfx.create.field.title')}
            </label>
            <input
              id="rfi-new-title"
              {...register('title')}
              placeholder={t('rfx.create.field.title.ph')}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="rfi-new-family">
              {t('rfx.create.field.family')}
            </label>
            <select
              id="rfi-new-family"
              data-testid="rfi-new-family"
              {...register('family', { onChange: (e) => chooseFamily(e.target.value) })}
              className={inputClass}
            >
              <option value="">{t('rfx.create.field.family.pick')}</option>
              {RFX_CATEGORY_FAMILIES.filter((f) => f.templateId).map((f) => (
                <option key={f.id} value={f.id}>
                  {t(f.labelKey)}
                </option>
              ))}
            </select>
            {!!template && (
              <p className="text-xs text-text-tertiary mt-1" data-testid="rfi-new-template">
                {t('rfx.rfi.template')}: {t(template.nameKey)}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass} htmlFor="rfi-new-description">
              {t('rfx.create.field.description')}
            </label>
            <textarea
              id="rfi-new-description"
              rows={3}
              {...register('description')}
              placeholder={t('rfx.create.field.description.ph')}
              className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="rfi-new-deadline">
              {t('rfx.create.field.deadline')}
            </label>
            <input
              id="rfi-new-deadline"
              type="date"
              {...register('responseDeadline')}
              // BL-84 — the deadline refusal is tied to the deadline field.
              aria-invalid={!!deadlineTouched && !deadlineInFuture}
              aria-describedby={
                !!deadlineTouched && !deadlineInFuture ? 'rfi-new-deadline-refusal' : undefined
              }
              className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
            />
            {!!deadlineTouched && !deadlineInFuture && (
              <p
                id="rfi-new-deadline-refusal"
                className="text-xs text-danger mt-1"
                data-testid="rfi-new-deadline-refusal"
              >
                {t(
                  draft.responseDeadline === ''
                    ? 'rfx.create.field.deadline.required'
                    : 'rfx.create.field.deadline.future'
                )}
              </p>
            )}
          </div>
          <div>
            <SessionAttachments
              value={draft.attachments}
              onChange={(next) => setValue('attachments', next)}
              label={t('rfxa.att.buyer')}
              testId="rfi-new-attachments"
            />
          </div>
          <ConfidentialityFields
            confidential={draft.confidential}
            terms={draft.confidentialityTerms}
            onChange={(confidential, terms) => {
              setValue('confidential', confidential);
              setValue('confidentialityTerms', terms);
            }}
            testIdPrefix="rfi-new"
          />
        </div>
      )
    },
    {
      id: 'questions',
      title: t('rfx.create.step.questions'),
      shortTitle: t('rfx.create.step.questions.short'),
      description: t('rfx.create.step.questions.desc'),
      content: (
        <div className="space-y-5">
          <RfxQuestionEditor
            value={{ questions: draft.questions, customSections: draft.customSections }}
            onChange={(next) => {
              setValue('questions', next.questions);
              setValue('customSections', next.customSections);
            }}
            library={RFI_QUESTION_LIBRARY}
            defaultCurrency={BASE_CURRENCY}
            testIdPrefix="rfi-new"
          />
          {draft.questions.length === 0 && (
            <p className="text-sm text-danger" data-testid="rfi-new-no-questions">
              {t('rfx.create.atLeastOneQuestion')}
            </p>
          )}
        </div>
      )
    },
    {
      id: 'invitees',
      title: t('rfx.create.step.invitees'),
      shortTitle: t('rfx.create.step.invitees.short'),
      description: t('rfx.create.step.invitees.desc'),
      content: (
        <RfxInviteeStep
          supplierCategory={family?.supplierCategory ?? ''}
          selected={draft.invitedSupplierIds}
          onToggle={toggleSupplier}
          testIdPrefix="rfi-new"
          {...(sourcingType ? { sourcingType } : {})}
        />
      )
    },
    {
      id: 'documents',
      title: t('rfxa.step.documents'),
      shortTitle: t('rfxa.step.documents.short'),
      description: t('rfxa.step.documents.desc'),
      content: (
        <DocumentRequestsEditor
          value={draft.documentRequests}
          onChange={(next) => setValue('documentRequests', next)}
          testIdPrefix="rfi-new"
        />
      )
    },
    {
      id: 'review',
      title: t('rfx.create.step.review'),
      shortTitle: t('rfx.create.step.review.short'),
      description: t('rfx.create.step.review.desc'),
      content: (
        <div className="space-y-5" data-testid="rfi-new-review">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs uppercase text-text-tertiary">
                {t('rfx.create.field.title')}
              </dt>
              <dd className="text-text-primary">{draft.title}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">
                {t('rfx.create.field.family')}
              </dt>
              <dd className="text-text-primary">{family ? t(family.labelKey) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">
                {t('rfx.create.field.deadline')}
              </dt>
              <dd className="text-text-primary">
                <Data>{draft.responseDeadline ? formatDate(draft.responseDeadline) : '—'}</Data>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">
                {t('rfx.create.review.questions')}
              </dt>
              <dd className="text-text-primary">
                {t('rfx.rfi.questions', { count: draft.questions.length })}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-text-tertiary">
                {t('rfx.create.field.description')}
              </dt>
              <dd className="text-text-secondary">{draft.description || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">{t('rfxa.att.buyer')}</dt>
              <dd className="text-text-primary" data-testid="rfi-new-review-attachments">
                {t('rfxa.att.count', { count: draft.attachments.length })}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">{t('rfxa.conf.pill')}</dt>
              <dd className="text-text-primary" data-testid="rfi-new-review-confidential">
                {draft.confidential ? t('rfxa.conf.on') : t('rfxa.conf.off')}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-text-tertiary">
                {t('rfx.create.review.invitees')}
              </dt>
              <dd className="text-text-primary">
                <InviteeNames
                  supplierIds={draft.invitedSupplierIds}
                  testId="rfi-new-review-invitees"
                />
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-text-tertiary">{t('rfxa.doc.review')}</dt>
              <dd className="text-text-primary">
                <DocumentRequestsSummary value={draft.documentRequests} testIdPrefix="rfi-new" />
              </dd>
            </div>
          </dl>

          <p className="text-xs text-text-tertiary">{t('rfx.create.sendRule')}</p>

          {/* CE-06 — two acts. The draft is savable by a seat that cannot send. */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              disabled={command.isPending}
              onClick={() => create(false)}
              data-testid="rfi-new-save-draft"
            >
              {t(editing ? 'rfxEdit.saveChanges' : 'rfx.create.saveDraft')}
            </Button>
          </div>
          {!canPublish && (
            <p className="text-xs text-text-tertiary" data-testid="rfi-new-cannot-send">
              {t('rfx.status.draftHiddenFromSuppliers')}
            </p>
          )}

          <RfxSaveTemplate onSave={saveTemplate} defaultName={draft.title} testIdPrefix="rfi-new" />
        </div>
      )
    }
  ];

  return (
    <ModalOverlay onClose={onCancel}>
      <Wizard
        steps={steps}
        currentStep={step}
        onStepChange={setStep}
        onCancel={onCancel}
        onComplete={() => create(true)}
        isStepValid={(n) => (n === steps.length - 1 ? canPublish && sendable : stepValid(n))}
        completeLabel={t(editing ? 'rfxEdit.saveAndSend' : 'rfx.create.send')}
        // RFx UX 2A (B-11) — one height for every step, so Next stays put.
        className="h-[90vh]"
      />
    </ModalOverlay>
  );
};

/**
 * The optional confidentiality gate, as the buyer sets it on an event.
 * @type {React.FC<{ confidential: boolean; terms: string; onChange: (confidential: boolean, terms: string) => void; testIdPrefix: string; }>}
 */
export const ConfidentialityFields = ({ confidential, terms, onChange, testIdPrefix: p }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          className="accent-teal"
          checked={confidential}
          data-testid={`${p}-confidential`}
          onChange={(e) => onChange(e.target.checked, terms)}
        />
        {t('rfxa.conf.toggle')}
      </label>
      <p className="text-xs text-text-tertiary">{t('rfxa.conf.toggle.hint')}</p>
      {!!confidential && (
        <div>
          <label
            className="block text-xs font-semibold text-text-secondary mb-1"
            htmlFor={`${p}-confidential-terms`}
          >
            {t('rfxa.conf.terms')}
          </label>
          <textarea
            id={`${p}-confidential-terms`}
            rows={3}
            value={terms}
            placeholder={t('rfxa.conf.standardTerms')}
            onChange={(e) => onChange(true, e.target.value)}
            className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action"
          />
        </div>
      )}
    </div>
  );
};

export default RfiCreateWizard;
