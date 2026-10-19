/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, MessageSquare } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { formatDate, formatDateTime } from '@lib/format';
/** @import { RfqEngagementVars } from '@services/query/commandHooks' */
import { useRfqEngagementCommand } from '@services/query/commandHooks';
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { RfqDeclineReason } from '@services/sourcing/rfqModel' */
import { RFQ_DECLINE_REASONS } from '@services/sourcing/rfqModel';
/** @import { RfqClarificationView, RfqEngagementView } from '@services/sourcing/rfqResponse' */
import { rfqResponseRefusal } from './rfqResponseText';

// ─────────────────────────────────────────────────────────────────────────────
// THE SUPPLIER'S FIRST ANSWERS ON AN RFQ CARD (RFx working spec, 2026-09-21,
// "Supplier response"): intent ("I will respond" or a reasoned decline), the
// confidentiality terms on a confidential RFQ, and clarification Q&A.
//
// Every control dispatches a real verb (`useRfqEngagementCommand`) and says
// what the verb decided. A seat that does not hold the atom reads the wait in
// the control's own slot (one notice per verb).
// ─────────────────────────────────────────────────────────────────────────────

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';

/** Dispatch and toast the verb's own answer. Returns whether it went through. */
function useEngagementAct() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const command = useRfqEngagementCommand();
  /**
   * @param {RfqEngagementVars} vars
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
          description: rfqResponseRefusal(t, res.reason ?? '')
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
  return { act, pending: command.isPending };
}

/**
 * The decline form: a reason from the list and the supplier's own words.
 * Exported for the RFI and RFP intent (BL-132), which name their own confirm
 * button through `confirmLabel`.
 * @type {React.FC<{ onCancel: () => void; onConfirm: (reason: RfqDeclineReason, text: string) => void; pending: boolean; testId: string; confirmLabel?: string; }>}
 */
export const DeclineForm = ({ onCancel, onConfirm, pending, testId, confirmLabel }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState(/** @type {RfqDeclineReason | ''} */ (''));
  const [text, setText] = useState('');
  return (
    <div
      data-testid={testId}
      className="w-full border border-border-subtle rounded-md p-3 space-y-2 bg-bg-hover"
    >
      <label className="block">
        <span className="block text-label text-text-tertiary uppercase mb-1">
          {t('rfqResponse.decline.reason')}
        </span>
        <select
          aria-label={t('rfqResponse.decline.reason')}
          value={reason}
          onChange={(e) => setReason(/** @type {RfqDeclineReason | ''} */ (e.target.value))}
          className={inputClass}
        >
          <option value="">{t('rfqResponse.decline.choose')}</option>
          {RFQ_DECLINE_REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`rfqResponse.decline.reasonLabel.${r}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="block text-label text-text-tertiary uppercase mb-1">
          {t('rfqResponse.decline.text')}
        </span>
        <textarea
          rows={2}
          aria-label={t('rfqResponse.decline.text')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={inputClass}
        />
      </label>
      <p className="text-xs text-text-tertiary">{t('rfqResponse.decline.buyerSees')}</p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel}>
          {t('rfqs.panel.cancel')}
        </Button>
        <Button
          variant="outline"
          disabled={pending || !reason || !text.trim()}
          onClick={() => reason && onConfirm(reason, text)}
          data-testid={`${testId}-confirm`}
        >
          {confirmLabel ?? t('rfqResponse.decline.confirm')}
        </Button>
      </div>
    </div>
  );
};

/**
 * Intent: respond, decline, or withdraw a "respond".
 * @type {React.FC<{ rfq: RFQ; supplierId: string; engagement: RfqEngagementView | undefined; hasQuote: boolean; }>}
 */
export const RfqIntentControls = ({ rfq, supplierId, engagement, hasQuote }) => {
  const { t } = useTranslation();
  const availability = useVerbAvailability('rfqintent:declare');
  const { act, pending } = useEngagementAct();
  const [declining, setDeclining] = useState(false);
  const intent = engagement?.intent;

  if (intent?.intent === 'decline') {
    return (
      <div data-testid={`intent-declined-${rfq.id}`} className="text-xs text-text-secondary">
        <StatusPill variant="neutral">{t('rfqResponse.intent.declined')}</StatusPill>{' '}
        {t(`rfqResponse.decline.reasonLabel.${intent.reason}`)} — {intent.text}
      </div>
    );
  }
  if (availability.kind !== 'held') {
    return <HandoffNotice availability={availability} testId="handoff-rfqintent-declare" />;
  }
  if (declining) {
    return (
      <DeclineForm
        testId={`decline-form-${rfq.id}`}
        pending={pending}
        onCancel={() => setDeclining(false)}
        onConfirm={async (reason, text) => {
          const ok = await act(
            intent
              ? { verb: 'withdraw', intentId: intentIdOf(engagement), reason, text }
              : { verb: 'decline', rfqId: rfq.id, supplierId, reason, text },
            'rfqResponse.toast.declined'
          );
          if (ok) setDeclining(false);
        }}
      />
    );
  }
  if (intent?.intent === 'respond') {
    return (
      <div
        className="flex items-center gap-3 text-xs text-text-secondary"
        data-testid={`intent-responding-${rfq.id}`}
      >
        <StatusPill variant="info">{t('rfqResponse.intent.responding')}</StatusPill>
        <Data>{formatDate(intent.at)}</Data>
        {!hasQuote && (
          <button
            type="button"
            onClick={() => setDeclining(true)}
            className="text-xs text-danger hover:underline font-semibold"
            data-testid={`intent-withdraw-${rfq.id}`}
          >
            {t('rfqResponse.intent.withdraw')}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2" data-testid={`intent-controls-${rfq.id}`}>
      <Button
        variant="outline"
        disabled={pending}
        data-testid={`intent-respond-${rfq.id}`}
        onClick={() =>
          act({ verb: 'respond', rfqId: rfq.id, supplierId }, 'rfqResponse.toast.responding')
        }
      >
        {t('rfqResponse.intent.respond')}
      </Button>
      <Button
        variant="secondary"
        data-testid={`intent-decline-${rfq.id}`}
        onClick={() => setDeclining(true)}
      >
        {t('rfqs.card.decline')}
      </Button>
    </div>
  );
};

/**
 * The store key of this supplier's intent. The view carries the model's
 * `RfqIntent`, which has no key, so the key travels as the view's `intentId`.
 * @param {RfqEngagementView | undefined} engagement
 * @returns {string}
 */
function intentIdOf(engagement) {
  return engagement?.intentId ?? '';
}

/**
 * The confidentiality gate: the notice, and the one act that lifts it.
 * @type {React.FC<{ rfq: RFQ; supplierId: string; engagement: RfqEngagementView | undefined; }>}
 */
export const RfqConfidentialityGate = ({ rfq, supplierId, engagement }) => {
  const { t } = useTranslation();
  const availability = useVerbAvailability('rfqconfidentiality:accept');
  const { act, pending } = useEngagementAct();
  if (!rfq.confidential) return null;
  const acceptedAt = engagement?.confidentialityAcceptedAt;
  if (acceptedAt) {
    return (
      <p
        className="text-xs text-text-secondary inline-flex items-center gap-1"
        data-testid={`terms-accepted-${rfq.id}`}
      >
        <Lock size={12} /> {t('rfqResponse.confidential.accepted')}{' '}
        <Data>{formatDateTime(acceptedAt)}</Data>
      </p>
    );
  }
  return (
    <div
      className="border border-warning bg-warning-soft rounded-md px-3 py-2 space-y-2"
      data-testid={`terms-gate-${rfq.id}`}
    >
      <p className="text-xs text-warning-hover inline-flex items-center gap-1">
        <Lock size={12} /> {t('rfqResponse.confidential.notice')}
      </p>
      <p className="text-xs text-text-secondary">{t('rfqResponse.confidential.terms')}</p>
      {availability.kind === 'held' ? (
        <Button
          variant="outline"
          disabled={pending}
          data-testid={`terms-accept-${rfq.id}`}
          onClick={() =>
            act({ verb: 'acceptTerms', rfqId: rfq.id, supplierId }, 'rfqResponse.toast.accepted')
          }
        >
          {t('rfqResponse.confidential.accept')}
        </Button>
      ) : (
        <HandoffNotice availability={availability} testId="handoff-rfqconfidentiality-accept" />
      )}
    </div>
  );
};

/**
 * Clarification Q&A on one RFQ, as this supplier may read it, and the ask box.
 * @type {React.FC<{ rfq: RFQ; supplierId: string; clarifications: readonly RfqClarificationView[]; open: boolean; onToggle: () => void; }>}
 */
export const RfqClarifications = ({ rfq, supplierId, clarifications, open, onToggle }) => {
  const { t } = useTranslation();
  const availability = useVerbAvailability('rfqclarification:ask');
  const { act, pending } = useEngagementAct();
  const [question, setQuestion] = useState('');
  const mine = clarifications.filter((c) => c.rfqId === rfq.id);

  return (
    <div className="space-y-2" data-testid={`clarifications-${rfq.id}`}>
      {mine.length > 0 && (
        <ul className="space-y-2">
          {mine.map((c) => (
            <li
              key={c.id}
              className="text-xs border border-border-subtle rounded-md px-3 py-2"
              data-testid={`clarification-${c.id}`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <StatusPill variant="neutral">
                  {c.state === 'Asked'
                    ? t('rfqResponse.clar.waiting')
                    : c.visibility === 'published'
                      ? t('rfqResponse.clar.published')
                      : t('rfqResponse.clar.private')}
                </StatusPill>
                <span className="text-text-tertiary">
                  {c.mine ? t('rfqResponse.clar.askedByYou') : t('rfqResponse.clar.askedByInvitee')}
                </span>
              </div>
              <p className="text-text-primary">{c.question}</p>
              {c.answer && <p className="text-text-secondary mt-1">↳ {c.answer}</p>}
            </li>
          ))}
        </ul>
      )}
      {open &&
        (availability.kind === 'held' ? (
          <div className="space-y-2">
            <textarea
              rows={2}
              aria-label={t('rfqResponse.clar.ask')}
              placeholder={t('rfqResponse.clar.placeholder')}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className={inputClass}
              data-testid={`clarification-input-${rfq.id}`}
            />
            <p className="text-xs text-text-tertiary">{t('rfqResponse.clar.howAnswered')}</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onToggle}>
                {t('rfqs.panel.cancel')}
              </Button>
              <Button
                variant="outline"
                icon={MessageSquare}
                disabled={pending || !question.trim()}
                data-testid={`clarification-send-${rfq.id}`}
                onClick={async () => {
                  const ok = await act(
                    { verb: 'ask', rfqId: rfq.id, supplierId, question },
                    'rfqResponse.toast.asked'
                  );
                  if (ok) {
                    setQuestion('');
                    onToggle();
                  }
                }}
              >
                {t('rfqResponse.clar.send')}
              </Button>
            </div>
          </div>
        ) : (
          <HandoffNotice availability={availability} testId="handoff-rfqclarification-ask" />
        ))}
    </div>
  );
};
