/** @import { PurchaseOrder } from '@services/data/types' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { formatDate } from '@lib/format';
import { usePoEscalationCommand } from '@services/query/commandHooks';
import { usePoEscalationRecords } from '@services/query/hooks';
import {
  PO_ESCALATION_DECISIONS,
  PO_ESCALATION_VERB,
  isPoEscalationDecision
} from '@services/transitions/poEscalationRules';
/** @import { PoEscalationDecision } from '@services/transitions/poEscalationRules' */

// The field grammar the buyer pages share (same strings as BuyerRequisitions'
// `inputClass` / `labelClass`).
const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

// ─────────────────────────────────────────────────────────────────────────────
// UCX-P7 (BL-368) · UCX-D22, UCX-D29 — THE ESCALATED PO'S ACTS.
//
// `Escalated` is a clock projection over the awaiting states, never a stored
// status (`poResponseProjection.isEscalated`, law 0.5). The panel used to show
// two footer buttons that did nothing (UCX-F1, a Blocker). Here are the acts
// the ruling names: ask the supplier to confirm, and record the decision PTI
// took — one of the four UCX-D22 rules. Every record carries the session's
// actor (the placeholder: no person is in session) and the hub clock.
//
// ⚠️ **THE RECORD IS THE ACT, AND THE CASCADE IS THE MOVE.** The three ending
// decisions take the order to Confirmed / Rejected / Closed through
// `cascades.js`; "still waiting" records and leaves the order awaiting the
// supplier. A record already made stays visible beside the acts.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   readonly po: PurchaseOrder;
 *   readonly nowIso: string;
 *   readonly dueLabel: string;
 * }} props  `dueLabel` is the response deadline, already formatted.
 */
const EscalatedActions = ({ po, dueLabel }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const availability = useVerbAvailability('po:escalation');
  const records = usePoEscalationRecords(po.id);
  const command = usePoEscalationCommand();
  const [decision, setDecision] = useState('');

  const latest = records.data?.items.slice(-1)[0] ?? null;
  const asked = latest?.kind === 'ask' ? latest : null;
  const recorded = latest?.kind === 'decision' ? latest : null;

  if (availability.kind !== 'held')
    return <HandoffNotice availability={availability} testId="handoff-po-escalation" />;

  /** @param {{ transitionId: string; decision?: PoEscalationDecision }} vars */
  const run = async (vars) => {
    const result = await command.mutateAsync({
      poId: po.id,
      transitionId: vars.transitionId,
      ...(vars.decision ? { decision: vars.decision } : {})
    });
    if (result.status === 'failed') {
      toast({
        variant: 'error',
        title:
          refusalText(result.reason) ??
          t('buyerOrders.escalation.refused', {
            reason: result.reason ?? ''
          })
      });
      return;
    }
    toast({
      variant: 'success',
      title: vars.decision
        ? t('buyerOrders.escalation.recordedToast', { po: po.poNumber })
        : t('buyerOrders.escalation.askedToast', { po: po.poNumber })
    });
    setDecision('');
  };

  return (
    <section data-testid="po-escalation">
      <h3 className="text-label text-text-tertiary uppercase mb-3">
        {t('buyerOrders.escalation.title')}
      </h3>
      <p className="text-sm text-text-secondary mb-2" data-testid="po-escalation-intro">
        {t('buyerOrders.escalation.intro', { date: dueLabel })}
      </p>
      {asked ? (
        <p className="text-xs text-text-tertiary mb-2" data-testid="po-escalation-asked">
          {t('buyerOrders.escalation.asked', { date: formatDate(asked.at) })}
        </p>
      ) : null}
      {recorded ? (
        <p className="text-sm text-text-primary mb-2" data-testid="po-escalation-recorded">
          {t('buyerOrders.escalation.recorded', {
            decision: t(`buyerOrders.escalation.decision.${recorded.decision}`),
            date: formatDate(recorded.at)
          })}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 items-end">
        <Button
          variant="secondary"
          disabled={command.isPending}
          onClick={() => void run({ transitionId: 't_po_ask_confirm' })}
          data-testid="po-escalation-ask"
        >
          {t('buyerOrders.escalation.ask')}
        </Button>
        <label className="block">
          <span className={labelClass}>{t('buyerOrders.escalation.decisionLabel')}</span>
          <select
            className={inputClass}
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            data-testid="po-escalation-decision"
          >
            <option value="">{t('buyerOrders.escalation.choose')}</option>
            {PO_ESCALATION_DECISIONS.map((d) => (
              <option key={d} value={d}>
                {t(`buyerOrders.escalation.decision.${d}`)}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          disabled={command.isPending || !isPoEscalationDecision(decision)}
          onClick={() =>
            void run({
              transitionId: PO_ESCALATION_VERB[/** @type {PoEscalationDecision} */ (decision)],
              decision: /** @type {PoEscalationDecision} */ (decision)
            })
          }
          data-testid="po-escalation-record"
        >
          {t('buyerOrders.escalation.record')}
        </Button>
      </div>
    </section>
  );
};

export default EscalatedActions;
