import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useCallOffCommand, useSapChangeMarkCommand } from '@services/query/commandHooks';
/** @import { RescheduleProposalView } from '@services/data/types' */
import { POLICY_HOOKS } from '@services/transitions/policyHooks';
import { refusedByPolicy } from '@services/transitions/refusalMessage';
import { qtyOf } from '../../materialPlan/planDisplay';
import { weekLabel } from '../utils';

/**
 * A call-off whose change this page sent (IA-B13): the page links to it,
 * because the proposal itself leaves the relief list once the change is pending.
 * @typedef {object} SentCallOff
 * @property {string} callOffId
 * @property {string} reference the call-off number a person reads
 */

/**
 * @typedef {object} ProposalActions
 * @property {ReadonlySet<string>} sent the proposals whose call-off change was sent this session
 * @property {readonly SentCallOff[]} sentCallOffs the call-offs those changes were sent for, in order
 * @property {(p: RescheduleProposalView) => Promise<void>} sendChange send a call-off change (BR-07)
 * @property {(p: RescheduleProposalView) => Promise<void>} markSap record a PO-line change as taken to SAP (ENG-D16)
 * @property {boolean} sendPending a call-off change is in flight
 * @property {boolean} markPending a "taken to SAP" mark is in flight
 */

/**
 * The two acts a proposal row offers (BR-07): a call-off change through the
 * existing change verb (`t_calloff_change`, the engine named as its origin, a
 * reason required) and a PO-line change recorded as "taken to SAP"
 * (`t_sapchange_mark`). Each toasts what the command answered; a refusal by the
 * engine-data liveness hook (BR-08 / X-03) reads as "sample data". It also
 * holds which call-offs were sent, so their row shows "awaiting confirmation".
 * @returns {ProposalActions}
 */
export const useProposalActions = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const callOffCommand = useCallOffCommand();
  const sapCommand = useSapChangeMarkCommand();
  const [sent, setSent] = useState(/** @type {ReadonlySet<string>} */ (new Set()));
  const [sentCallOffs, setSentCallOffs] = useState(/** @type {readonly SentCallOff[]} */ ([]));

  /** @param {RescheduleProposalView} p */
  const reasonFor = (p) =>
    p.type === 'reduce'
      ? t('rs.reason.reduce', { quantity: `${qtyOf(p.proposedQuantity, p.uom)} ${p.uom}` })
      : t('rs.reason.later', { week: p.needWeek ? weekLabel(p.needWeek) : '—' });

  /** @param {RescheduleProposalView} p */
  const sendChange = async (p) => {
    try {
      const res = await callOffCommand.mutateAsync({
        verb: 'change',
        id: /** @type {NonNullable<typeof p.line.callOffId>} */ (p.line.callOffId),
        reason: reasonFor(p),
        needDate: /** @type {NonNullable<typeof p.proposedDate>} */ (p.proposedDate),
        ...(p.proposedQuantity !== p.line.quantity
          ? { quantity: p.proposedQuantity + p.line.receivedQuantity }
          : {}),
        origin: 'engine'
      });
      if (res.status === 'failed') {
        const description = refusedByPolicy(res.reason, POLICY_HOOKS.CALLOFF_ENGINE_DATA_LIVE)
          ? t('rs.refusal.simulated')
          : (refusalText(res.reason) ?? res.reason ?? '');
        toast({ variant: 'warning', title: t('rs.toast.refused'), description });
        return;
      }
      setSent((prev) => new Set(prev).add(p.id));
      const callOffId = p.line.callOffId;
      if (callOffId)
        setSentCallOffs((prev) => [
          ...prev.filter((c) => c.callOffId !== callOffId),
          { callOffId, reference: p.line.reference }
        ]);
      toast({ variant: 'success', title: t('rs.toast.sent'), description: t('rs.toast.sentDesc') });
    } catch {
      toast({ variant: 'error', title: t('rs.toast.refused') });
    }
  };

  /** @param {RescheduleProposalView} p */
  const markSap = async (p) => {
    try {
      const res = await sapCommand.mutateAsync({
        poNumber: p.line.poNumber,
        line: /** @type {NonNullable<typeof p.line.poLine>} */ (p.line.poLine),
        proposalType: p.type,
        proposedDate: p.proposedDate,
        proposedQuantity: p.proposedQuantity + (p.type === 'cancel' ? 0 : p.line.receivedQuantity)
      });
      if (res.status === 'failed') {
        const description = refusedByPolicy(res.reason, POLICY_HOOKS.SAP_CHANGE_ENGINE_DATA_LIVE)
          ? t('rs.refusal.simulated')
          : (refusalText(res.reason) ?? res.reason ?? '');
        toast({ variant: 'warning', title: t('rs.toast.refused'), description });
        return;
      }
      toast({ variant: 'success', title: t('rs.toast.marked') });
    } catch {
      toast({ variant: 'error', title: t('rs.toast.refused') });
    }
  };

  return {
    sent,
    sentCallOffs,
    sendChange,
    markSap,
    sendPending: callOffCommand.isPending,
    markPending: sapCommand.isPending
  };
};
