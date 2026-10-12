import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@hooks/useToast';
import { useRefusalText, useDataErrorText } from '@hooks/useRefusalText';
import {
  usePurchaseRequisitionCreate,
  useRequisitionApprove,
  useRequisitionReject,
  useRequisitionSubmit,
  useRequisitionRevise
} from '@services/query/commandHooks';
import { DataError } from '@services/data/types';
/** @import { PurchaseRequisition } from '@services/data/types' */
/** @import { QtyOutcome } from '@lib/localeNumber' */
/** @import { NewPRForm } from '../const' */
import { emptyForm } from '../const';

/**
 * @typedef {object} RequisitionActionArgs
 * @property {PurchaseRequisition | null} selectedPR The live row the detail panel shows, or `null`.
 * @property {NewPRForm} form The New-PR form state.
 * @property {QtyOutcome} parsedQty The page's ONE parse of `form.qty`.
 * @property {boolean} canSubmit Whether the New-PR form is submittable.
 * @property {string} rejectReason
 * @property {string} reviseNote
 * @property {() => void} closePanel Closes the detail panel and resets its mode and captures.
 * @property {(form: NewPRForm) => void} setForm
 * @property {(open: boolean) => void} setNewOpen
 */

/**
 * @typedef {object} RequisitionActions
 * @property {{ submit: boolean; revise: boolean; approve: boolean; reject: boolean }} pending
 *   Whether each detail-panel verb's dispatch is in flight.
 * @property {boolean} canReject The rejection reason is non-empty.
 * @property {boolean} canRevise The revision note is non-empty.
 * @property {() => Promise<void>} submitNewPR Dispatches `pr:create` from the New-PR form.
 * @property {() => Promise<void>} approveSelected Dispatches `pr:approve` on the selected requisition.
 * @property {() => Promise<void>} submitSelected Dispatches `pr:submit` on the selected requisition.
 * @property {() => Promise<void>} reviseSelected Dispatches `pr:revise` with the revision note.
 * @property {() => Promise<void>} rejectSelected Dispatches `pr:reject` with the rejection reason.
 * @property {(pr: PurchaseRequisition) => void} raiseSourcingEvent Navigates to the RFQ wizard; dispatches nothing.
 */

/**
 * Every act the page dispatches, with its honest toasts: create (the New-PR
 * form), and submit / revise / approve / reject on the selected requisition,
 * plus the raise-sourcing door, which only navigates. Each reads the returned
 * refusal channel and the thrown one, and none absorbs a refusal. Moved out of
 * `BuyerRequisitions.jsx` by the Phase 5 page split (no behaviour change: the
 * same five mutation hooks, the same payloads, the same toasts).
 * @param {RequisitionActionArgs} args
 * @returns {RequisitionActions}
 */
const useRequisitionActions = ({
  selectedPR,
  form,
  parsedQty,
  canSubmit,
  rejectReason,
  reviseNote,
  closePanel,
  setForm,
  setNewOpen
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const dataErrorText = useDataErrorText();
  const navigate = useNavigate();

  /**
   * A refusal the dispatcher THREW, in the reader's language.
   *
   * ⚠️ **THE TWO VOCABULARIES ARE NOT INTERCHANGEABLE, AND THAT IS WHY THIS
   * EXISTS BESIDE `refusalText` RATHER THAN INSIDE IT.** A RETURNED refusal is
   * `CommandResult.reason`, shaped `KIND:detail`, which `refusalKindOf` splits
   * — `useRefusalText`'s job. A THROWN one is a `DataError` whose message is
   * PROSE, so that split matches nothing and the caller fell through to the raw
   * string: an Indonesian buyer read *"purchaseRequisition 'pr-014' denied for
   * scope"* in English. The CODE is what the glossary is keyed on.
   *
   * ⚠️ **`fallback` IS THE EXPRESSION THIS SITE ALREADY EVALUATED**, passed in
   * rather than chosen here, so the `??` reproduces today's behaviour exactly:
   * a `DataError` whose code the glossary does not own still renders its
   * `message`, and a non-`DataError` still renders the site's own copy.
   * `dataErrorText` returns `null` for anything it does not own — that is the
   * whole reason this could be applied to five sites at once.
   * @param {unknown} e
   * @param {string} fallback
   * @returns {string}
   */
  const describeThrown = (e, fallback) =>
    dataErrorText(e instanceof DataError ? e.code : undefined) ??
    (e instanceof DataError ? e.message : fallback);

  const createPr = usePurchaseRequisitionCreate();
  const approvePr = useRequisitionApprove();
  const rejectPr = useRequisitionReject();
  const submitPr = useRequisitionSubmit();
  const revisePr = useRequisitionRevise();

  // G1.2b — the fabricated `PR-2026-00${random}` toast is retired onto the real
  // t_pr_create push (usePurchaseRequisitionCreate). The number now comes from
  // the store (store-assigned PR-2026-9xx), invalidation makes the real Draft
  // list-visible, and both failure channels surface honestly. Fresh authoring —
  // not a quantity override, so no C6-LOCK reason-gate here.
  const submitNewPR = async () => {
    // Re-checked at the click (belt-and-suspenders beside the disabled button):
    // an unreadable quantity short-circuits here, so nothing reaches the spine.
    if (!parsedQty.ok || !canSubmit || createPr.isPending) return;
    try {
      const result = await createPr.mutateAsync({
        payload: {
          material: form.material,
          quantity: parsedQty.value,
          uom: form.uom,
          requiredDate: form.date,
          costCenter: form.costCenter,
          priority: form.priority,
          justification: form.justification
        }
      });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('requisitions.toast.createFailed.title'),
          description:
            refusalText(result.reason) ?? result.reason ?? t('requisitions.toast.createFailed.desc')
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('requisitions.toast.created.title', { prNumber: result.entityId }),
        description: t('requisitions.toast.created.desc')
      });
      setForm(emptyForm);
      setNewOpen(false);
    } catch (e) {
      toast({
        variant: 'error',
        title: t('requisitions.toast.createFailed.title'),
        description: describeThrown(e, t('requisitions.toast.createFailed.desc'))
      });
    }
  };

  // ── §67 · THE APPROVAL ACTS ────────────────────────────────────────────────
  // Both mirror `submitNewPR` above: dispatch, read the refusal channel, toast
  // honestly, and let the invalidation re-derive the panel. Neither absorbs a
  // refusal — what the dispatcher said still reaches the buyer.
  //
  // ⚠️ **THIS USED TO SAY "RENDERED VERBATIM", AND THE WORD IS RETIRED RATHER
  // THAN KEPT.** The pin's load-bearing claim was NON-ABSORPTION — that a
  // refusal is never swallowed into a generic "action failed" — and verbatim
  // was the MEANS, not the end. `refusalText` replaces the wire HEAD with the
  // glossary's definition of that head and keeps the detail beside it, so the
  // refusal is neither absorbed nor invented; and when the head is one this
  // vocabulary does not own it returns `null`, so `result.reason` still lands
  // here unchanged. Leaving "verbatim" standing would have made the comment
  // describe a format the line no longer has.
  const approveSelected = async () => {
    if (!selectedPR || approvePr.isPending) return;
    try {
      const result = await approvePr.mutateAsync({ prId: selectedPR.id });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('requisitions.toast.approveFailed.title', { prNumber: selectedPR.prNumber }),
          description:
            refusalText(result.reason) ?? result.reason ?? t('requisitions.toast.actionFailed.desc')
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('requisitions.toast.approved.title', { prNumber: selectedPR.prNumber }),
        description: t('requisitions.toast.approved.desc')
      });
      closePanel();
    } catch (e) {
      toast({
        variant: 'error',
        title: t('requisitions.toast.approveFailed.title', { prNumber: selectedPR.prNumber }),
        description: describeThrown(e, t('requisitions.toast.actionFailed.desc'))
      });
    }
  };

  // ⚠️ THE REASON IS NOT OPTIONAL AND THE BUTTON IS WHAT SAYS SO. A DISMISSIBLE
  // capture beside a required field is how a required thing becomes a
  // suggestion (operator ruling, §67), so the commit stays DISABLED until the
  // box is non-empty rather than firing and surfacing a refusal afterwards.
  // `PR_REJECT_REASON_AUTHORED` stands behind it for anything that never sees
  // this surface — the disable is the courtesy, the hook is the guarantee.
  const canReject = rejectReason.trim().length > 0;

  const submitSelected = async () => {
    if (!selectedPR || submitPr.isPending) return;
    try {
      const result = await submitPr.mutateAsync({ prId: selectedPR.id });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('requisitions.toast.submitFailed.title', { prNumber: selectedPR.prNumber }),
          description:
            refusalText(result.reason) ?? result.reason ?? t('requisitions.toast.actionFailed.desc')
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('requisitions.toast.submitted.title', { prNumber: selectedPR.prNumber }),
        description: t('requisitions.toast.submitted.desc')
      });
      closePanel();
    } catch (e) {
      toast({
        variant: 'error',
        title: t('requisitions.toast.submitFailed.title', { prNumber: selectedPR.prNumber }),
        description: describeThrown(e, t('requisitions.toast.actionFailed.desc'))
      });
    }
  };

  // The same disable-until-non-empty rule the rejection reason carries, for the
  // same stated reason: a dismissible capture beside a required field is how a
  // required thing becomes a suggestion. `PR_REVISION_NOTE_AUTHORED` stands
  // behind it for any caller that never renders this box.
  const canRevise = reviseNote.trim().length > 0;

  const reviseSelected = async () => {
    if (!selectedPR || !canRevise || revisePr.isPending) return;
    try {
      const result = await revisePr.mutateAsync({
        prId: selectedPR.id,
        revisionNote: reviseNote.trim()
      });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('requisitions.toast.reviseFailed.title', { prNumber: selectedPR.prNumber }),
          description:
            refusalText(result.reason) ?? result.reason ?? t('requisitions.toast.actionFailed.desc')
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('requisitions.toast.revised.title', { prNumber: selectedPR.prNumber }),
        description: t('requisitions.toast.revised.desc')
      });
      closePanel();
    } catch (e) {
      toast({
        variant: 'error',
        title: t('requisitions.toast.reviseFailed.title', { prNumber: selectedPR.prNumber }),
        description: describeThrown(e, t('requisitions.toast.actionFailed.desc'))
      });
    }
  };

  /**
   * ⚠️ **THE DOOR. IT NAVIGATES; IT DOES NOT DISPATCH.**
   *
   * The act this control starts is `t_rfq_create`, and that verb belongs to the
   * sourcing wizard — it needs a title, a category, materials, a quantity, an
   * invited supplier list and two deadlines, none of which this panel has or
   * should collect. Dispatching from here would mean a second RFQ-creation path
   * beside the ratified one, which is the `extraRfqs` anti-pattern (C6 §1) with
   * a different entry point.
   *
   * So it carries the requisition's IDENTITY to the wizard and lets the wizard
   * do what it already does. The requisition advances afterwards as a CASCADE of
   * the RFQ actually being raised — so a buyer who opens the wizard and closes
   * it again has changed nothing, which is the correct outcome and is what
   * dispatching from here would have got wrong.
   * @param {PurchaseRequisition} pr
   */
  const raiseSourcingEvent = (pr) => {
    navigate('/buyer/rfq', { state: { sourceRequisitionId: pr.id } });
  };

  const rejectSelected = async () => {
    if (!selectedPR || !canReject || rejectPr.isPending) return;
    try {
      const result = await rejectPr.mutateAsync({
        prId: selectedPR.id,
        rejectionReason: rejectReason.trim()
      });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('requisitions.toast.rejectFailed.title', { prNumber: selectedPR.prNumber }),
          description:
            refusalText(result.reason) ?? result.reason ?? t('requisitions.toast.actionFailed.desc')
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('requisitions.toast.rejected.title', { prNumber: selectedPR.prNumber }),
        description: t('requisitions.toast.rejected.desc')
      });
      closePanel();
    } catch (e) {
      toast({
        variant: 'error',
        title: t('requisitions.toast.rejectFailed.title', { prNumber: selectedPR.prNumber }),
        description: describeThrown(e, t('requisitions.toast.actionFailed.desc'))
      });
    }
  };

  return {
    pending: {
      submit: submitPr.isPending,
      revise: revisePr.isPending,
      approve: approvePr.isPending,
      reject: rejectPr.isPending
    },
    canReject,
    canRevise,
    submitNewPR,
    approveSelected,
    submitSelected,
    reviseSelected,
    rejectSelected,
    raiseSourcingEvent
  };
};

export default useRequisitionActions;
