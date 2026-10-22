// ────────────────────────────────────────────────────────────────────────────
// GRInspectionWizard — the goods-receipt inspection wizard BuyerGoodsReceipt
// opens: source → receipt details → quality → disposition, then create /
// finalize / post / settle through the dispatcher.
//
// Split into a folder by frontend-standard Phase 5 (PAGE-SPLIT-GUIDE):
//   hooks/useInspectionDraft.js  the draft (a react-hook-form `useForm`) and
//                                every gate over it
//   hooks/useGrSource.js         the source step 1's values resolve to
//   hooks/useCompleteReceipt.js  the create → finalize → post → settle sequence
//   components/*Step.jsx         one file per wizard step
//   components/RegulatoryCheck.jsx, CertificateNotice.jsx, fieldParts.jsx
//   utils.js / const.js          line-draft builders and receivable statuses
// ────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { FormProvider } from 'react-hook-form';
/** @import * as React from 'react' */
/** @import { WizardStep } from '../../ui-v2/Wizard' */
import Wizard from '../../ui-v2/Wizard';
import ModalOverlay from '../../ui-v2/ModalOverlay';
import { useTranslation } from 'react-i18next';
import { useEnumLabel } from '@hooks/useEnumLabel';
import { statusLabelKey } from '@lib/statusLabel';
import { enumLabelKey } from '@lib/priorityLabel';
/** @import { Shipment, ASN } from '@services/data/types' */
/** @import { SettleFault } from '@services/transitions/settleFaults' */
/** @import { EnforcementSetting } from '@lib/enforcement' */
/** @import { ComplianceRegistryEntry } from '@services/data/types' */
import useInspectionDraft from './hooks/useInspectionDraft';
import useCompleteReceipt from './hooks/useCompleteReceipt';
import SourceStep from './components/SourceStep';
import ReceiptStep from './components/ReceiptStep';
import QualityStep from './components/QualityStep';
import DispositionStep from './components/DispositionStep';

/**
 * §91e — what the wizard hands up when a settle it AWAITED came back a fault.
 * The correlationId is the whole point: the dispatcher leaves a failed settle
 * `submitted`, so this id is genuinely re-settleable, and it exists nowhere but
 * in this component's closure. Without handing it up, the GR lands on the page
 * parked in the interim with the remedy unreachable.
 */
/**
 * @typedef {object} FailedSettle
 * @property {string} grId -  The GR's store id — `createRes.entityId`, which IS the store key.
 * @property {string} correlationId
 * @property {SettleFault} fault
 */

/**
 * @typedef {object} GRInspectionWizardProps
 * @property {() => void} onClose
 * @property {(failed?: FailedSettle) => void} onComplete -  Called after the create/dispose/post commands resolve — the list re-derives
 *    from the invalidated query, so no GR object is handed back. §91e: it now
 *    carries the ONE thing the list cannot re-derive — a failed settle's
 *    correlationId — and only when there was one.
 * @property {string} [initialAsnId]
 * @property {Shipment[]} shipments -  Shipments resolved through the service seam (GR-LEGACY-READ-01) — the
 *    wizard no longer reads the raw fixture.
 * @property {ASN[]} asns -  ASNs resolved through the service seam (asnStore-backed) — a live
 *    supplier-submitted ASN is a receivable GR source, not just fixture docks.
 * @property {readonly EnforcementSetting[]} enforcementSettings The append-only enforcement-setting LEDGER (CP-3 · E4), resolved through
 *   `useEnforcementSettings()` by the page and passed down.
 *
 *   ⚠️ **THE LEDGER, NOT A MODE.** The mode in force is clock-derived, so it is
 *   computed HERE from an instant this component captures (law 0.5) — a prop
 *   carrying an already-derived mode would have had the page read a clock on
 *   this component's behalf and freeze the answer at page load.
 *
 *   ⚠️ REQUIRED, not optional. The page gates on the read's four honest states,
 *   so the wizard only ever mounts with a resolved ledger; an optional prop
 *   would silently mean "no ledger" and "unavailable ledger" at once. An EMPTY
 *   ledger is a legitimate value and derives full rigour.
 * @property {readonly ComplianceRegistryEntry[]} complianceRegistry The compliance registry (I3.1) — fact 3 of the halal split, resolved by the
 *   page through `useComplianceRegistry()` and passed down like the ledger.
 *
 *   ⚠️ **AN ARGUMENT, NEVER AN IMPORT**, for `verifyHalalAtReceipt`'s own
 *   reason: the caller supplies the rows it is entitled to read, so no
 *   derivation below can widen a `QueryScope`.
 */

/**
 * The GR inspection wizard: a four-step modal that drafts a goods receipt from
 * a dock shipment or a live ASN and commits it through the dispatcher.
 * @type {React.FC<GRInspectionWizardProps>}
 */
const GRInspectionWizard = ({
  onClose,
  onComplete,
  initialAsnId,
  shipments,
  asns,
  enforcementSettings,
  complianceRegistry
}) => {
  const { t } = useTranslation();
  // Display resolver for the shared inspection tokens (Pass/Fail/N/A). The radio
  // state value stays canonical EN (checked/onChange use `v`); only the visible
  // label localizes — the recorded visualCheck/packagingCheck are never touched.
  const el = useEnumLabel();
  // The header disposition is DERIVED (never a submitted literal — headerVerbFor
  // maps it to a verb), so its badge/toast text localizes freely. Its tokens are
  // status-rollup vocab (Approved / Partially Approved), so try statusLabel first.
  /** @param {string} d */
  const dispositionLabel = (d) => {
    const k = statusLabelKey(d) ?? enumLabelKey(d);
    return k ? t(k) : d;
  };
  const [step, setStep] = useState(0);

  const draft = useInspectionDraft({
    initialAsnId,
    shipments,
    asns,
    enforcementSettings,
    complianceRegistry
  });

  const handleComplete = useCompleteReceipt({
    activeSource: draft.activeSource,
    manualASN: draft.manualASN,
    inspectionResults: draft.inspectionResults,
    derivedDisposition: draft.derivedDisposition,
    receivedDate: draft.receivedDate,
    receivedBy: draft.receivedBy,
    notes: draft.notes,
    finalNotes: draft.finalNotes,
    dispositionReason: draft.dispositionReason,
    autoPostSap: draft.autoPostSap,
    dispositionLabel,
    onComplete
  });

  /** @type {WizardStep[]} */
  const steps = [
    {
      id: 'source',
      title: t('goodsReceipt.wizard.step.source.title'),
      shortTitle: t('goodsReceipt.wizard.step.source.short'),
      description: t('goodsReceipt.wizard.step.source.desc'),
      content: (
        <SourceStep
          sources={draft.sources}
          manualNotFound={draft.manualNotFound}
          manualAsnMatch={draft.manualAsnMatch}
        />
      )
    },
    {
      id: 'details',
      title: t('goodsReceipt.wizard.step.details.title'),
      shortTitle: t('goodsReceipt.wizard.step.details.short'),
      description: t('goodsReceipt.wizard.step.details.desc'),
      content: (
        <ReceiptStep
          lines={draft.lines}
          lineQtys={draft.lineQtys}
          blockedCodes={draft.blockedCodes}
        />
      )
    },
    {
      id: 'quality',
      title: t('goodsReceipt.wizard.step.quality.title'),
      shortTitle: t('goodsReceipt.wizard.step.quality.short'),
      description: t('goodsReceipt.wizard.step.quality.desc'),
      content: (
        <QualityStep
          lines={draft.lines}
          lineQtys={draft.lineQtys}
          certVerdicts={draft.certVerdicts}
          supplierName={draft.activeSource?.supplierName ?? ''}
          updateLine={draft.updateLine}
          el={el}
        />
      )
    },
    {
      id: 'disposition',
      title: t('goodsReceipt.wizard.step.disposition.title'),
      shortTitle: t('goodsReceipt.wizard.step.disposition.short'),
      description: t('goodsReceipt.wizard.step.disposition.desc'),
      content: (
        <DispositionStep
          derivedDisposition={draft.derivedDisposition}
          dispositionLabel={dispositionLabel}
          totals={draft.totals}
          autoPostSap={draft.autoPostSap}
        />
      )
    }
  ];

  // The steps read and write the draft through the context (`useFormContext`);
  // FormProvider renders no element, so the modal's markup is unchanged.
  return (
    <ModalOverlay onClose={onClose} scrim="dark">
      <FormProvider {...draft.methods}>
        <Wizard
          steps={steps}
          currentStep={step}
          onStepChange={setStep}
          onCancel={onClose}
          onComplete={handleComplete}
          isStepValid={draft.isStepValid}
          completeLabel={t('goodsReceipt.wizard.complete')}
        />
      </FormProvider>
    </ModalOverlay>
  );
};

export default GRInspectionWizard;
