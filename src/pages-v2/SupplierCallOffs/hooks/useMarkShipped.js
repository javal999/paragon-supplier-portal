import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { DECLARED_PRESENT } from '@services/data/fixturePresent';
/** @import { ASN, CallOff } from '@services/data/types' */
/** @import { CallOffView } from '@services/transitions/callOffRules' */
/** @import { useAdvanceShipNoticeCreate } from '@services/query/commandHooks' */
import { useCallOffCommand } from '@services/query/commandHooks';
import { markShippedDraft, nextFreeSequence } from '@services/transitions/shipmentNotice';
import { numberOf } from '../../callOffs/callOffDisplay';
/** @import { EMPTY } from '../const' */

// ─────────────────────────────────────────────────────────────────────────────
// UCX-P3 (BL-364) — "Mark as shipped": ONE act, two verbs.
//
//   1. `t_calloff_dispatch` records the heads-up PTI reads ("on its way");
//   2. `t_asn_create` opens a draft ASN with the same values, so the supplier
//      reports the same shipment once (UCX-F10) and the warehouse's details
//      (tracking, Surat Jalan, batch) land on the same record (step 2).
//
// Each verb keeps its own atom and its own policy hooks. When the notice lands
// and the draft does not, the outcome is said honestly: the notice stands and
// the refusal is named.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The mark-as-shipped act and whether either of its two commands is in flight.
 * @param {object} args
 * @param {readonly ASN[]} args.asns  The supplier's ASNs, for the next free sequence.
 * @param {ReturnType<typeof useAdvanceShipNoticeCreate>} args.createAsnMutation  The page's own create mutation.
 */
export function useMarkShipped({ asns, createAsnMutation }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const callOffCommand = useCallOffCommand();

  /**
   * Send the notice and open the draft. The drawer has already checked that
   * the quantity is a positive number and the dates are dates; the verbs
   * check them again (`CALLOFF_DISPATCH_VALID`, the ASN policies).
   * @param {CallOffView} view
   * @param {typeof EMPTY} form
   */
  const markShipped = async (view, form) => {
    const c = /** @type {CallOff} */ (view.callOff);
    const shippedDate = form.shippedDate === '' ? DECLARED_PRESENT : form.shippedDate;
    // An overdue call-off's need date is before the shipped date; the dispatch
    // policy refuses that, so the default clamps to the shipped day (browser pass).
    const expectedArrival =
      form.expectedArrival === ''
        ? c.needDate < shippedDate
          ? shippedDate
          : c.needDate
        : form.expectedArrival;
    const quantity = numberOf(form.dispatchQty);
    try {
      const notice = await callOffCommand.mutateAsync({
        verb: 'dispatch',
        id: c.id,
        shippedDate,
        expectedArrival,
        quantity
      });
      if (notice.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('co.toast.refused'),
          description: refusalText(notice.reason) ?? notice.reason ?? ''
        });
        return;
      }
      const draft = await createAsnMutation.mutateAsync(
        markShippedDraft({
          callOff: c,
          sequence: nextFreeSequence(asns),
          shippedDate,
          expectedArrival,
          quantity
        })
      );
      if (draft.status === 'failed' || !draft.entityId) {
        toast({
          variant: 'warning',
          title: t('co.toast.refused'),
          description: t('co.markShipped.draftFailed', {
            reason: refusalText(draft.reason) ?? draft.reason ?? ''
          })
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('co.markShipped.done', { asn: draft.entityId, number: c.callOffNumber })
      });
    } catch {
      toast({ variant: 'error', title: t('co.toast.refused') });
    }
  };

  return {
    markShipped,
    pending: callOffCommand.isPending || createAsnMutation.isPending
  };
}
