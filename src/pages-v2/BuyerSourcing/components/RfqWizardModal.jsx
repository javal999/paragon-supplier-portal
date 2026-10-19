// ────────────────────────────────────────────────────────────────────────────
// The RFQ wizard: its eight steps, in a modal. Raises a new RFQ or edits a
// Draft (BL-93). Moved out of `BuyerSourcing.jsx` by the Phase 5 page split
// (no behaviour change): the step list is built here exactly as the workspace
// built it, and each long step's content is its own component.
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { WizardStep } from '@components/ui-v2/Wizard' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { PurchaseRequisition } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { useRfqWizard } from '../hooks/useRfqWizard' */
/** @import { useInviteeSearch } from '../hooks/useInviteeSearch' */
import Wizard from '@components/ui-v2/Wizard';
import ModalOverlay from '@components/ui-v2/ModalOverlay';
import {
  ItemsStep,
  QuestionsOptionsStep,
  StepRefusal,
  TierEditor,
  authoringReviewRows
} from '../../sourcing/RfqAuthoring';
import DocumentRequestsEditor, {
  remapRequestsOnItemsChanged
} from '../../rfx/DocumentRequestsEditor';
import WizardScopeStep from './WizardScopeStep';
import WizardSuppliersStep from './WizardSuppliersStep';
import WizardTermsStep from './WizardTermsStep';
import WizardReviewStep from './WizardReviewStep';

/**
 * @typedef {object} RfqWizardModalProps
 * @property {ReturnType<typeof useRfqWizard>} wizard The wizard's state and acts.
 * @property {ReturnType<typeof useInviteeSearch>} invitees The Suppliers step's search.
 * @property {readonly RFQ[]} rfqs The board's RFQs (the prefill banner reads them).
 * @property {readonly PurchaseRequisition[]} sourceablePrs The requisitions the Scope step offers.
 * @property {Map<string, string>} supplierNameById
 * @property {VerbAvailability} publishAvailability The seat's `rfq:publish` (save-and-send).
 * @property {TFunction} t
 */

/**
 * The wizard in its modal. Rendered only while it is open and the seat holds
 * `rfq:create` — the workspace decides that.
 * @type {React.FC<RfqWizardModalProps>}
 */
const RfqWizardModal = ({
  wizard,
  invitees,
  rfqs,
  sourceablePrs,
  supplierNameById,
  publishAvailability,
  t
}) => {
  const { draft, setDraft, updateAuthoring } = wizard;
  const authoringRows = authoringReviewRows(t, draft, draft.origin);

  /** @type {WizardStep[]} */
  const wizardSteps = [
    {
      id: 'scope',
      title: t('sourcing.wizard.step.scope.title'),
      shortTitle: t('sourcing.wizard.step.scope.short'),
      description: t('sourcing.wizard.step.scope.desc'),
      content: (
        <WizardScopeStep
          draft={draft}
          editingRfq={wizard.editingRfq}
          editingRfqId={wizard.editingRfqId}
          rfqs={rfqs}
          sourceablePrs={sourceablePrs}
          applySource={wizard.applySource}
          updateDraft={wizard.updateDraft}
          changeCategory={wizard.changeCategory}
          toggleMaterial={wizard.toggleMaterial}
          qtyRead={wizard.qtyRead}
          budgetRead={wizard.budgetRead}
          t={t}
        />
      )
    },
    {
      id: 'items',
      title: t('rfqAuthoring.step.items.title'),
      shortTitle: t('rfqAuthoring.step.items.short'),
      description: t('rfqAuthoring.step.items.desc'),
      content: (
        <ItemsStep
          items={draft.items}
          // NR-1 BR-02 — a request names its item by position, so removing an
          // item remaps the requests in the SAME update, never after it.
          onChange={(items) =>
            setDraft((d) => {
              if (!d.documentRequests) return { ...d, items };
              const remap = remapRequestsOnItemsChanged(
                d.documentRequests,
                d.items.map((i) => i.uid),
                items.map((i) => i.uid)
              );
              return {
                ...d,
                items,
                documentRequests: [...remap.requests],
                unlinkedDocRequestIds: [...(d.unlinkedDocRequestIds ?? []), ...remap.unlinked]
              };
            })
          }
          refusal={wizard.itemsRefusal}
        />
      )
    },
    {
      id: 'tiers',
      title: t('rfqAuthoring.step.tiers.title'),
      shortTitle: t('rfqAuthoring.step.tiers.short'),
      description: t('rfqAuthoring.step.tiers.desc'),
      content: (
        <div className="space-y-4">
          <TierEditor
            tiers={draft.tiers}
            onChange={(tiers) => updateAuthoring({ tiers })}
            testId="rfq-tiers"
          />
          <StepRefusal reason={wizard.tiersRefusal} testId="rfq-tiers-step-refusal" />
        </div>
      )
    },
    {
      id: 'options',
      title: t('rfqAuthoring.step.questions.title'),
      shortTitle: t('rfqAuthoring.step.questions.short'),
      description: t('rfqAuthoring.step.questions.desc'),
      content: (
        <QuestionsOptionsStep
          draft={draft}
          update={updateAuthoring}
          refusal={wizard.optionsRefusal}
        />
      )
    },
    {
      id: 'suppliers',
      title: t('sourcing.wizard.step.suppliers.title'),
      shortTitle: t('sourcing.wizard.step.suppliers.short'),
      description: t('sourcing.wizard.step.suppliers.desc'),
      content: (
        <WizardSuppliersStep
          draft={draft}
          invitees={invitees}
          supplierSearch={wizard.supplierSearch}
          setSupplierSearch={wizard.setSupplierSearch}
          toggleSupplier={wizard.toggleSupplier}
          t={t}
        />
      )
    },
    {
      id: 'terms',
      title: t('sourcing.wizard.step.terms.title'),
      shortTitle: t('sourcing.wizard.step.terms.short'),
      description: t('sourcing.wizard.step.terms.desc'),
      content: <WizardTermsStep draft={draft} updateDraft={wizard.updateDraft} t={t} />
    },
    {
      id: 'documents',
      title: t('rfxa.step.documents'),
      shortTitle: t('rfxa.step.documents.short'),
      description: t('rfxa.step.documents.desc'),
      content: (
        <DocumentRequestsEditor
          value={draft.documentRequests ?? []}
          onChange={(next) => updateAuthoring({ documentRequests: [...next] })}
          items={wizard.docItems}
          unlinked={draft.unlinkedDocRequestIds ?? []}
          onUnlinkedChange={(next) => setDraft((d) => ({ ...d, unlinkedDocRequestIds: [...next] }))}
          testIdPrefix="rfq-new"
        />
      )
    },
    {
      id: 'review',
      title: t('sourcing.wizard.step.review.title'),
      shortTitle: t('sourcing.wizard.step.review.short'),
      description: t('sourcing.wizard.step.review.desc'),
      content: (
        <WizardReviewStep
          draft={draft}
          rfqNumbers={wizard.rfqNumbers}
          sourcePrefill={wizard.sourcePrefill}
          authoringRows={authoringRows}
          docItems={wizard.docItems}
          supplierNameById={supplierNameById}
          editingRfqId={wizard.editingRfqId}
          publishAvailability={publishAvailability}
          sendPending={
            wizard.reviseMutation.isPending ||
            wizard.createMutation.isPending ||
            wizard.publishMutation.isPending
          }
          isStepValid={wizard.isStepValid}
          saveAndSend={() => wizard.submitWizard(true)}
          setWizardStep={wizard.setWizardStep}
          setTemplateToSave={wizard.setTemplateToSave}
          t={t}
        />
      )
    }
  ];

  return (
    <ModalOverlay onClose={wizard.closeWizard}>
      <Wizard
        steps={wizardSteps}
        currentStep={wizard.wizardStep}
        onStepChange={wizard.setWizardStep}
        onCancel={wizard.closeWizard}
        onComplete={() => wizard.submitWizard(false)}
        isStepValid={wizard.isStepValid}
        completeLabel={t(wizard.editingRfqId ? 'rfxEdit.saveChanges' : 'sourcing.wizard.complete')}
      />
    </ModalOverlay>
  );
};

export default RfqWizardModal;
