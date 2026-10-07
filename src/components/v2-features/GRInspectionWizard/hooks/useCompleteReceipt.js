import { useState } from 'react';
import { useToast } from '@hooks/useToast';
import { useTranslation } from 'react-i18next';
/** @import { InspectionResult } from '@data/mockGoodsReceipts' */
import {
  useGoodsReceiptCreate,
  useGoodsReceiptFinalize,
  useGoodsReceiptPost,
  useGoodsReceiptSettle
} from '@services/query/commandHooks';
/** @import { GrHeaderDisposition } from '@services/transitions' */
import { headerVerbFor } from '@services/transitions';
import { classifySettleFault } from '@services/transitions/settleFaults';
import { useRefusalText } from '@hooks/useRefusalText';
import { refusedByPolicy } from '@services/transitions/refusalMessage';
import { POLICY_HOOKS } from '@services/transitions/policyHooks';
/** @import { FailedSettle } from '..' */
/** @import { GrSource } from '../utils' */

/**
 * @typedef {object} UseCompleteReceiptArgs
 * @property {GrSource | undefined} activeSource
 * @property {string} manualASN -  The typed ASN number, used as the reference when no source resolved.
 * @property {InspectionResult[]} inspectionResults
 * @property {GrHeaderDisposition} derivedDisposition
 * @property {string} receivedDate
 * @property {string} receivedBy
 * @property {string} notes
 * @property {string} finalNotes
 * @property {string} dispositionReason
 * @property {boolean} autoPostSap
 * @property {(d: string) => string} dispositionLabel -  Localized label for a disposition token, for the success toast.
 * @property {(failed?: FailedSettle) => void} onComplete -  The wizard's `onComplete` prop.
 */

/**
 * The wizard's completion: create the GR, dispatch the rolled-up header verb,
 * post to SAP and await the settle when opted in, and toast each outcome.
 * Owns the `submitting` latch that stops a double submit.
 *
 * Moved verbatim out of `GRInspectionWizard` (frontend-standard Phase 5); the
 * settle-site guards (`wizardSettleSpeaks`, `settleNullIsNotSuccess`) read this
 * file through the wizard folder.
 * @param {UseCompleteReceiptArgs} args
 * @returns {() => Promise<void>} The wizard's `onComplete` handler.
 */
const useCompleteReceipt = ({
  activeSource,
  manualASN,
  inspectionResults,
  derivedDisposition,
  receivedDate,
  receivedBy,
  notes,
  finalNotes,
  dispositionReason,
  autoPostSap,
  dispositionLabel,
  onComplete
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const createGR = useGoodsReceiptCreate();
  const finalizeGR = useGoodsReceiptFinalize();
  const postGR = useGoodsReceiptPost();
  const settleGR = useGoodsReceiptSettle();
  const [submitting, setSubmitting] = useState(false);

  // Replaces the old client-side fabrication (GR-FABRICATION-01): the GR is
  // created, disposed, and posted through the dispatcher. The store assigns the
  // GR number; the header disposition is the ROLLUP the dispatcher re-derives
  // from the recorded lines; the SAP material document is assigned by SAP on
  // settlement — nothing is minted here.
  const handleComplete = async () => {
    if (submitting) return;
    setSubmitting(true);

    const asnReference = activeSource?.asnNumber ?? manualASN.trim();

    try {
      // 1) Create — the store assigns the number; lines are recorded at receipt.
      const createRes = await createGR.mutateAsync({
        asnReference,
        inspectionResults,
        receivedDate,
        receivedBy,
        notes: finalNotes || notes || undefined
      });
      if (createRes.status === 'failed' || !createRes.entityId) {
        toast({
          variant: 'error',
          title: t('gr.create.failed.title'),
          // CP-2 · B1 — the UNDECLARED_MATERIAL refusal gets its own sentence
          // (the `MISSING_FIELDS` precedent below): "could not be created
          // (UNDECLARED_MATERIAL: …)" names the code but not what to DO.
          //
          // ⚠️ **THIS CONDITION WAS UNSATISFIABLE AND THE SENTENCE HAD NEVER
          // RENDERED.** `UNDECLARED_MATERIAL` is what the POLICY HOOK says, so the
          // wire value is `POLICY_REJECTED:gr_inspection_materials_declared:UNDEC…`
          // and a head test is false on every real refusal. `MISSING_FIELDS` below
          // IS genuinely a head, which is why the "precedent" read as though it
          // transferred. The hook id is the checkable half; the code inside the
          // hook's reason is free text, and this hook has exactly one refusal.
          description: refusedByPolicy(
            createRes.reason,
            POLICY_HOOKS.GR_INSPECTION_MATERIALS_DECLARED
          )
            ? t('gr.create.failed.undeclared', { reason: createRes.reason ?? '' })
            : (refusalText(createRes.reason) ??
              t('gr.create.failed.desc', { reason: createRes.reason ?? '' }))
        });
        return;
      }
      const grNumber = createRes.entityId;

      // 2) Finalize — dispatch the ROLLED-UP header verb (approve / partial /
      //    reject). The dispatcher re-derives the disposition from the stored
      //    lines, so the header is provably derived, not asserted.
      const dispo = derivedDisposition;
      const headerVerb = headerVerbFor(dispo);
      if (headerVerb) {
        const finalizeRes = await finalizeGR.mutateAsync({
          grId: grNumber,
          headerVerb,
          dispositionReason: dispositionReason || finalNotes || undefined
        });
        if (finalizeRes.status === 'failed') {
          const missing = (finalizeRes.reason ?? '').startsWith('MISSING_FIELDS');
          toast({
            variant: 'warning',
            title: t('gr.dispose.failed.title', { grNumber }),
            description: missing
              ? t('gr.dispose.missingReason')
              : (refusalText(finalizeRes.reason) ??
                t('gr.dispose.failed.desc', { reason: finalizeRes.reason ?? '' }))
          });
          onComplete();
          return;
        }
      }

      // 3) Post to SAP (Option B) — only for an accepting rollup, when opted in.
      if (autoPostSap && (dispo === 'Approved' || dispo === 'Partially Approved')) {
        const postRes = await postGR.mutateAsync({ grId: grNumber });
        if (postRes.status === 'submitted') {
          // The async SAP callback settles: Posting to SAP → Posted to SAP +
          // the real material document (assigned on settle).
          // §43 — the settle's OWN failure is surfaced (classified, with its
          // remedy) by the mutation's onError. It is caught HERE so it cannot
          // reach the outer catch, which would relabel a settlement fault as
          // 'Not authorized' — a confidently WRONG cause, and the only thing
          // worse than no message. On a failed settle the command stays
          // `submitted` and the GR stays 'Posting to SAP'.
          //
          // ⚠️ **§91 FILED THIS AS A REMEDY WITH NO HANDLER, AND §91e MEASURED
          // THE REMEDY TO BE THE OTHER ONE.** The sentence that stood here read
          // *"so the post action genuinely re-attempts it"*, was corrected to
          // *"a remedy named in copy with nothing behind it … the honest remedy
          // is a re-settle affordance"*, and BOTH readings of the mechanism were
          // wrong in the same place:
          //
          //   · `t_gr_post.from` really does exclude the interim state — but
          //     widening it was never the fix. A re-post mints a SECOND
          //     correlationId and orphans the first, whose `pending` entry then
          //     never clears. The interim's only exit is `settlesTo`, so the
          //     re-attempt is the SETTLE, on the SAME correlationId, and it
          //     needs no machine change at all.
          //   · *"TRANSPORT has no producer in this tree today"* is FALSE.
          //     `withChaos` proxies `commands` — `settle` included — and throws
          //     `DataError('CHAOS')`, which classifies TRANSPORT. It is
          //     DEV-gated (`import.meta.env.DEV && VITE_CHAOS === 'on'`), so it
          //     is tree-shaken from the production bundle, but a producer that
          //     runs only in dev is a producer.
          //
          // So the copy's promise is TRUE about the machine and was unkept only
          // by the surface. The catch below no longer swallows: it classifies
          // and hands the fault UP, and `BuyerGoodsReceipt`'s interim footer
          // offers the re-settle. The catch is still required, and for the
          // reason it always was — a settle fault reaching the outer handler
          // would be relabelled 'Not authorized', a confidently WRONG cause.
          /** @type {FailedSettle | undefined} */
          let failed;
          try {
            await settleGR.mutateAsync({ correlationId: postRes.correlationId });
          } catch (err) {
            failed = {
              grId: grNumber,
              correlationId: postRes.correlationId,
              fault: classifySettleFault(err)
            };
          }
          if (failed) {
            // The hook's `onError` already toasted the classified fault and its
            // remedy; this hands the correlationId up so the remedy EXISTS.
            onComplete(failed);
            return;
          }
          toast({
            variant: 'success',
            title: t('gr.post.posted.title', { grNumber }),
            description: t('gr.post.posted.desc')
          });
        } else {
          toast({
            variant: 'warning',
            title: t('gr.post.failed.title', { grNumber }),
            description:
              refusalText(postRes.reason) ??
              t('gr.post.failed.desc', { reason: postRes.reason ?? '' })
          });
        }
      } else {
        toast({
          variant: 'success',
          title: t('gr.dispose.success.title', { grNumber, disposition: dispositionLabel(dispo) }),
          description: t('gr.dispose.success.desc', { correlationId: createRes.correlationId })
        });
      }
      onComplete();
    } catch {
      toast({ variant: 'error', title: t('gr.denied.title'), description: t('gr.denied.desc') });
    } finally {
      setSubmitting(false);
    }
  };

  return handleComplete;
};

export default useCompleteReceipt;
