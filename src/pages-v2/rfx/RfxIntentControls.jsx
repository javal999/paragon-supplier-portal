/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { formatDate } from '@lib/format';
import { useRfxCommand } from '@services/query/commandHooks';
/** @import { RfxCommandVars } from '@services/query/commandHooks' */
import { refusalCode } from '@services/sourcing/rfqModel';
/** @import { RfqDeclineReason } from '@services/sourcing/rfqModel' */
/** @import { RfxIntentView } from '@services/sourcing/rfxIntent' */
import { RFX_DECLINE_REASONS } from '@services/sourcing/rfxIntent';
import { DeclineForm } from '../rfqs/RfqEngagementControls';
import RfqStepStrip from '../SupplierRFQs/components/RfqStepStrip';

// ─────────────────────────────────────────────────────────────────────────────
// BL-132 (RFx UX S-13) — the RFQ card's first answer, on an RFI or RFP row:
// the step strip ("Step 1: Say if you will respond · Step 2: Answer", with the
// confidentiality terms as step 0 where they apply) and the intent controls
// ("I will respond", or "Decline" with a reason from the event type's list and
// words of the supplier's own). Every control dispatches a real verb through
// `useRfxCommand` and toasts what the verb decided. A seat without the atom
// reads the wait in the controls' own slot.
//
// The RFQ's rules, mirrored: a decline is final; "I will respond" can become a
// decline ("Decline after all") until the response is sent.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'rfi' | 'rfp'} RfxKind */

/**
 * The words for an intent refusal (`CODE: detail`), in the reader's language.
 * An unknown code falls back to the machine reason, never to nothing.
 * @param {TFunction} t
 * @param {string} reason
 * @returns {string}
 */
export const rfxIntentRefusalText = (t, reason) => {
  const key = `rfx.intent.refusal.${refusalCode(reason)}`;
  const text = t(key);
  return text === key ? reason : text;
};

/**
 * The verbs of one event type.
 * @param {RfxKind} kind
 * @param {string} eventId
 * @param {string} supplierId
 */
const verbsFor = (kind, eventId, supplierId) => ({
  /** @returns {RfxCommandVars} */
  respond: () =>
    kind === 'rfi'
      ? { verb: 'respondRfi', rfiId: eventId, supplierId }
      : { verb: 'respondRfp', rfpId: eventId, supplierId },
  /**
   * @param {RfqDeclineReason} reason
   * @param {string} text
   * @returns {RfxCommandVars}
   */
  decline: (reason, text) =>
    kind === 'rfi'
      ? { verb: 'declineRfi', rfiId: eventId, supplierId, reason, text }
      : { verb: 'declineRfp', rfpId: eventId, supplierId, reason, text },
  /**
   * @param {string} intentId
   * @param {RfqDeclineReason} reason
   * @param {string} text
   * @returns {RfxCommandVars}
   */
  withdraw: (intentId, reason, text) =>
    kind === 'rfi'
      ? { verb: 'withdrawRfiIntent', intentId, reason, text }
      : { verb: 'withdrawRfpIntent', intentId, reason, text }
});

/**
 * The strip and the intent controls of one supplier RFI or RFP row.
 *
 * `confidential`:   The event has confidentiality terms (step 0).
 * `termsAccepted`:  This supplier accepted them.
 * `submitted`:      This supplier's response is sent: "Decline after all" is gone.
 * `closed`:         The event is closed: nothing is offered, only what was said.
 *
 * @type {React.FC<{
 *   kind: RfxKind;
 *   eventId: string;
 *   supplierId: string;
 *   intent: RfxIntentView | null;
 *   confidential: boolean;
 *   termsAccepted: boolean;
 *   submitted: boolean;
 *   closed: boolean;
 *   testIdPrefix: string;
 * }>}
 */
const RfxIntentControls = ({
  kind,
  eventId,
  supplierId,
  intent,
  confidential,
  termsAccepted,
  submitted,
  closed,
  testIdPrefix
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const availability = useVerbAvailability(
    kind === 'rfi' ? 'rfiintent:declare' : 'rfpintent:declare'
  );
  const command = useRfxCommand();
  const [declining, setDeclining] = useState(false);
  const verbs = verbsFor(kind, eventId, supplierId);

  /**
   * @param {RfxCommandVars} vars
   * @param {string} successKey
   * @returns {Promise<boolean>}
   */
  const act = async (vars, successKey) => {
    try {
      const res = await command.mutateAsync(vars);
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('rfqResponse.toast.refused'),
          description: rfxIntentRefusalText(t, res.reason ?? '')
        });
        return false;
      }
      toast({ variant: 'success', title: t(successKey) });
      return true;
    } catch {
      toast({ variant: 'error', title: t('rfqResponse.toast.refused') });
      return false;
    }
  };

  if (intent?.intent === 'decline') {
    return (
      <div data-testid={`${testIdPrefix}-intent-declined`} className="text-xs text-text-secondary">
        <StatusPill variant="neutral">{t('rfx.intent.declined')}</StatusPill>{' '}
        {t(`rfqResponse.decline.reasonLabel.${intent.reason}`)} — {intent.text}{' '}
        <Data>{formatDate(intent.at)}</Data>
      </div>
    );
  }

  const responding = intent?.intent === 'respond';
  const steps = [
    ...(confidential ? [{ id: 'terms', label: t('rfx.steps.terms'), done: termsAccepted }] : []),
    { id: 'respond', label: t('rfx.steps.respond'), done: responding },
    {
      id: 'answer',
      label: t(kind === 'rfi' ? 'rfx.steps.answerRfi' : 'rfx.steps.answerRfp'),
      done: submitted
    }
  ];

  /** @type {React.ReactNode} */
  let controls = null;
  if (responding) {
    controls = (
      <div
        className="flex items-center gap-3 text-xs text-text-secondary"
        data-testid={`${testIdPrefix}-intent-responding`}
      >
        <StatusPill variant="info">{t('rfx.intent.responding')}</StatusPill>
        <Data>{formatDate(intent.at)}</Data>
        {!submitted && !closed && availability.kind === 'held' && !declining && (
          <button
            type="button"
            onClick={() => setDeclining(true)}
            className="text-xs text-danger hover:underline font-semibold"
            data-testid={`${testIdPrefix}-intent-withdraw`}
          >
            {t('rfx.intent.withdraw')}
          </button>
        )}
      </div>
    );
  } else if (closed || submitted) {
    controls = null;
  } else if (availability.kind !== 'held') {
    controls = (
      <HandoffNotice availability={availability} testId={`handoff-${kind}intent-declare`} />
    );
  } else if (!declining) {
    controls = (
      <div className="flex items-center gap-2" data-testid={`${testIdPrefix}-intent-controls`}>
        <Button
          variant="outline"
          disabled={command.isPending}
          data-testid={`${testIdPrefix}-intent-respond`}
          onClick={() => act(verbs.respond(), 'rfqResponse.toast.responding')}
        >
          {t('rfx.intent.respond')}
        </Button>
        <Button
          variant="secondary"
          data-testid={`${testIdPrefix}-intent-decline`}
          onClick={() => setDeclining(true)}
        >
          {t('rfx.intent.decline')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid={`${testIdPrefix}-intent`}>
      {closed || submitted ? null : <RfqStepStrip steps={steps} testId={`${testIdPrefix}-steps`} />}
      {controls}
      {declining ? (
        <DeclineForm
          testId={`${testIdPrefix}-decline-form`}
          pending={command.isPending}
          confirmLabel={t(kind === 'rfi' ? 'rfx.intent.confirmRfi' : 'rfx.intent.confirmRfp')}
          reasons={RFX_DECLINE_REASONS[kind]}
          onCancel={() => setDeclining(false)}
          onConfirm={async (reason, text) => {
            const ok = await act(
              intent?.intent === 'respond'
                ? verbs.withdraw(intent.intentId, reason, text)
                : verbs.decline(reason, text),
              'rfqResponse.toast.declined'
            );
            if (ok) setDeclining(false);
          }}
        />
      ) : null}
    </div>
  );
};

export default RfxIntentControls;
