// ────────────────────────────────────────────────────────────────────────────
// RAISING A PROPOSAL REQUEST — section 3.6a (CE-01 to CE-08), REQ-E03-04, and
// the RFx authoring batch (2026-09-21).
//
// Seven steps: what it is about, the terms PTI asks for, indicative pricing
// (optional), questions (optional), who is asked, the documents each supplier
// sends back (optional, NR-1 BR-02), and a last look.
//
// ⚠️ **A PICKED TERM WITHOUT PTI'S REQUESTED VALUE IS NOT A TERM (REQ-E03-04).**
// The comparison renders "PTI asks for" beside every supplier's answer, and a
// blank there would put an empty column header above a table of deviations from
// nothing. The verb refuses it by name (`TERM_VALUE_REQUIRED`); this step refuses
// it before the buyer gets that far, and NAMES THE TERMS still missing a value
// rather than disabling a button silently.
//
// ⚠️ **THE STANDARD TERM LIST IS STILL PROCUREMENT'S (CE-03 / CE-05)** — the
// buyer picks from it and never edits it. What is new (spec, RFP terms) is the
// CUSTOM term: a term of the buyer's own for this RFP, carrying its label, group,
// value kind and options, so a supplier can answer it and the comparison can
// label it. An off-list id without the `custom-` prefix is still refused.
//
// ⚠️ **INDICATIVE PRICING IS OPTIONAL AND ALWAYS LABELLED INDICATIVE (D4).**
// Open-spec requests (Tundra, ICY) ask for options × quantity points; firm
// prices by tier belong to the RFQ.
//
// ⚠️ **CREATED FROM AN RFI (D3).** With a `prefill`, the wizard opens on the
// RFI's title, family, scope (its description, and its questions as scope
// notes) and responders, and the created RFP stores `sourceRfiId`. Every field
// stays editable, and step 1 says where it came from ("Pre-filled from RFI-…").
//
// ⚠️ **BL-93 — THE SAME WIZARD EDITS A DRAFT.** With `editing`, it opens on
// every stored field of that Draft RFP (dates, terms, pricing options, T&C,
// files, invitees) and saves through `t_rfp_revise_draft`. The RFI it came from
// is not editable content: the verb keeps the stored `sourceRfiId`.
//
// SPLIT (frontend-standard Phase 5, wave 7): this file keeps the draft's
// validity and the step list; the large steps live in `components/`, the
// draft itself (a react-hook-form `useForm`) in `hooks/useRfpDraft.js`, the
// start-from / template half in `hooks/useRfpStartFrom.js`, the create/revise
// command in `hooks/useRfpSubmit.js`, the draft shape in `const.js` and the
// pure draft mappings in `utils.js`. The form is created HERE, in the component
// that renders the Wizard, so it survives every step change; the steps read and
// write it through `FormProvider`.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
/** @import { WizardStep } from '@components/ui-v2/Wizard' */
import Wizard from '@components/ui-v2/Wizard';
import ModalOverlay from '@components/ui-v2/ModalOverlay';
/** @import { BidCurrency } from '@lib/currencyPolicy' */
import { rfxCategoryFamily } from '@services/sourcing/rfxConfig';
/** @import { RfpPrefill } from '@services/sourcing/rfxPrefill' */
import {
  isPastDeadline,
  rfiQuestionsRefusal,
  rfpPricingRequestRefusal,
  termValueFits
} from '@services/transitions/rfxRules';
import { documentRequestsRefusal } from '@services/transitions/rfxDocumentRules';
/** @import { RfpEvent } from '@services/sourcing/types' */
import DocumentRequestsEditor from '../DocumentRequestsEditor';
import RfxInviteeStep from '../RfxInviteeStep';
import { useSourcingTypeMap } from '../eligibilityDisplay';
import { mappedSourcingType } from '@services/sourcing/sourcingType';
import RfxQuestionEditor from '../RfxQuestionEditor';
import { RFX_BUILT_IN_FIELDS } from '@services/sourcing/rfxBuiltIn';
import { RfpPricingEditor } from '../RfpPricing';
import { rfxNow } from '../rfxDisplay';
import { termRowsOf } from './utils';
import { useRfpDraft } from './hooks/useRfpDraft';
import { useRfpStartFrom } from './hooks/useRfpStartFrom';
import { useRfpSubmit } from './hooks/useRfpSubmit';
import { ScopeStep } from './components/ScopeStep';
import { TermsStep } from './components/TermsStep';
import { ReviewStep } from './components/ReviewStep';

/**
 * @typedef {object} RfpCreateWizardProps
 * @property {() => void} onCancel
 * @property {(rfpId: string) => void} onCreated
 * @property {boolean} canPublish -  Does this seat hold `rfp:publish`? A seat that does not may still draft.
 * @property {readonly RfpEvent[]} [pastEvents] -  Past events the buyer may copy (D2).
 * @property {RfpPrefill & { readonly sourceRfiNumber: string }} [prefill] -  Open pre-filled from an RFI (D3).
 * @property {RfpEvent} [editing] -  BL-93 — the Draft RFP being edited. Absent = a new RFP.
 */

/** @type {React.FC<RfpCreateWizardProps>} */
const RfpCreateWizard = ({
  onCancel,
  onCreated,
  canPublish,
  pastEvents = [],
  prefill,
  editing
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const { methods, draft, togglePick, setTermValue, toggleSupplier } = useRfpDraft(
    editing,
    prefill
  );
  const { setValue } = methods;
  const { saved, startOptions, applyStart, deleteSaved, saveTemplate } = useRfpStartFrom(
    pastEvents,
    methods
  );

  const family = rfxCategoryFamily(draft.family);
  // Material G2 (MR-10 BR-06) — the type comes from the category (and the
  // purchasing group when one is set); the buyer never types it.
  const sourcingMap = useSourcingTypeMap();
  const sourcingType = family
    ? mappedSourcingType(
        {
          kind: 'rfp',
          materialCategory: family.supplierCategory,
          ...(draft.purchasingGroup ? { purchasingGroup: draft.purchasingGroup } : {})
        },
        sourcingMap
      )
    : undefined;

  const picked = Object.keys(draft.terms);
  /** The picked terms still missing PTI's value, or holding one not of the term's kind. */
  const missingValues = picked.filter(
    (id) =>
      draft.terms[id].trim().length === 0 ||
      !termValueFits({ termId: id, requestedValue: '' }, draft.terms[id])
  );

  // CE-07 — the same reading the submit verb uses, so the wizard cannot admit a
  // window the answer gate treats as closed.
  const deadlineInFuture =
    draft.responseDeadline !== '' && !isPastDeadline(draft.responseDeadline, rfxNow());

  const pricingRefusal = rfpPricingRequestRefusal(draft.pricing);
  const questionsRefusal = rfiQuestionsRefusal(draft.questions, draft.customSections);

  /**
   * @param {number} n
   * @returns {boolean}
   */
  const stepValid = (n) => {
    if (n === 0) return draft.title.trim().length > 0 && draft.family !== '' && deadlineInFuture;
    if (n === 1) return picked.length + draft.customTerms.length > 0 && missingValues.length === 0;
    if (n === 2) return pricingRefusal === null;
    if (n === 3) return questionsRefusal === null;
    if (n === 4) return draft.invitedSupplierIds.length > 0;
    // NR-1 BR-02 — the create verb's own rule; an RFP has no items.
    if (n === 5) return documentRequestsRefusal(draft.documentRequests) === null;
    return true;
  };

  const sendable = [0, 1, 2, 3, 4, 5].every(stepValid);

  const hasTc = draft.termsText.trim().length > 0 || draft.termsFile.length > 0;

  const { create, isPending } = useRfpSubmit({
    draft,
    family,
    editing,
    hasTc,
    onCreated,
    onCancel
  });

  /** @type {WizardStep[]} */
  const steps = [
    {
      id: 'scope',
      title: t('rfx.create.step.scope'),
      shortTitle: t('rfx.create.step.scope.short'),
      description: t('rfx.create.step.scope.desc'),
      content: (
        <ScopeStep
          draft={draft}
          prefill={prefill}
          editing={editing}
          startOptions={startOptions}
          onApplyStart={applyStart}
          onDeleteSaved={deleteSaved}
          unreadable={saved.unreadable}
          rejected={saved.rejected}
          deadlineInFuture={deadlineInFuture}
        />
      )
    },
    {
      id: 'terms',
      title: t('rfx.create.step.terms'),
      shortTitle: t('rfx.create.step.terms.short'),
      description: t('rfx.create.step.terms.desc'),
      content: (
        <TermsStep
          draft={draft}
          picked={picked}
          missingValues={missingValues}
          onTogglePick={togglePick}
          onSetValue={setTermValue}
        />
      )
    },
    {
      id: 'pricing',
      title: t('rfxa.step.pricing'),
      shortTitle: t('rfxa.step.pricing.short'),
      description: t('rfxa.step.pricing.desc'),
      content: (
        <RfpPricingEditor value={draft.pricing} onChange={(next) => setValue('pricing', next)} />
      )
    },
    {
      id: 'questions',
      title: t('rfxa.step.rfpQuestions'),
      shortTitle: t('rfx.create.step.questions.short'),
      description: t('rfxa.step.rfpQuestions.desc'),
      content: (
        <RfxQuestionEditor
          value={{ questions: draft.questions, customSections: draft.customSections }}
          onChange={(next) => {
            setValue('questions', next.questions);
            setValue('customSections', next.customSections);
          }}
          defaultCurrency={/** @type {BidCurrency} */ (draft.currency)}
          testIdPrefix="rfp-new"
          builtIns={RFX_BUILT_IN_FIELDS}
        />
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
          testIdPrefix="rfp-new"
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
          testIdPrefix="rfp-new"
        />
      )
    },
    {
      id: 'review',
      title: t('rfx.create.step.review'),
      shortTitle: t('rfx.create.step.review.short'),
      description: t('rfx.create.step.review.desc'),
      content: (
        <ReviewStep
          draft={draft}
          family={family}
          termRows={termRowsOf(draft)}
          hasTc={hasTc}
          editing={editing}
          canPublish={canPublish}
          isPending={isPending}
          onCreate={create}
          onSaveTemplate={saveTemplate}
        />
      )
    }
  ];

  return (
    <ModalOverlay onClose={onCancel}>
      {/* FormProvider renders no element, so the modal's markup is unchanged. */}
      <FormProvider {...methods}>
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
      </FormProvider>
    </ModalOverlay>
  );
};

export default RfpCreateWizard;
