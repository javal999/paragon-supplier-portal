/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { formatDateTime } from '@lib/format';
import { useRfqClarifications, useRfqEngagement } from '@services/query/hooks';
import { useRfqEngagementCommand } from '@services/query/commandHooks';
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { RfqClarificationView } from '@services/sourcing/rfqResponse' */
import { rfqResponseRefusal } from '../rfqs/rfqResponseText';

// ─────────────────────────────────────────────────────────────────────────────
// THE BUYER'S VIEW OF THE SUPPLIER RESPONSE on the RFQ side panel (RFx working
// spec, 2026-09-21): one READ-ONLY row per invitee with its intent — and a
// decline's reason and words — and, on a confidential RFQ, when it accepted the
// terms; then the clarification questions, each answerable privately or
// published to every invitee with the asker's name removed.
//
// Kept in its own file and mounted with one line, because the side panel is
// another batch's workspace.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC<{ clarification: RfqClarificationView }>} */
const AnswerForm = ({ clarification }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const command = useRfqEngagementCommand();
  const [answer, setAnswer] = useState('');
  const [visibility, setVisibility] = useState(
    /** @type {'private' | 'published'} */ ('published')
  );

  const send = async () => {
    try {
      const res = await command.mutateAsync({
        verb: 'answer',
        clarificationId: clarification.id,
        answer,
        visibility
      });
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('rfqResponse.toast.refused'),
          description: rfqResponseRefusal(t, res.reason ?? '')
        });
        return;
      }
      toast({ variant: 'success', title: t('rfqResponse.toast.answered') });
    } catch {
      toast({ variant: 'error', title: t('rfqResponse.toast.refused') });
    }
  };

  return (
    <div className="mt-2 space-y-2" data-testid={`answer-form-${clarification.id}`}>
      <textarea
        rows={2}
        aria-label={t('rfqResponse.buyer.answer')}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-white border border-border-input rounded-md focus:outline-none focus:border-action"
      />
      <fieldset className="flex flex-wrap gap-4 text-xs text-text-secondary">
        <legend className="sr-only">{t('rfqResponse.buyer.visibility')}</legend>
        {
          /** @type {const} */ (['published', 'private']).map((v) => (
            <label key={v} className="inline-flex items-center gap-1">
              <input
                type="radio"
                name={`vis-${clarification.id}`}
                className="accent-action"
                checked={visibility === v}
                onChange={() => setVisibility(v)}
              />
              {t(v === 'published' ? 'rfqResponse.buyer.publish' : 'rfqResponse.buyer.private')}
            </label>
          ))
        }
      </fieldset>
      <Button
        variant="outline"
        disabled={command.isPending || !answer.trim()}
        data-testid={`answer-send-${clarification.id}`}
        onClick={send}
      >
        {t('rfqResponse.buyer.send')}
      </Button>
    </div>
  );
};

/** @type {React.FC<{ rfq: RFQ; nameOf: (supplierId: string) => string }>} */
const RfqEngagementSection = ({ rfq, nameOf }) => {
  const { t } = useTranslation();
  const engagement = useRfqEngagement();
  const clarifications = useRfqClarifications();
  const answerAvailability = useVerbAvailability('rfqclarification:answer');
  const rows = (engagement.data?.items ?? []).filter((r) => r.rfqId === rfq.id);
  const questions = (clarifications.data?.items ?? []).filter((c) => c.rfqId === rfq.id);

  return (
    <section data-testid="rfq-engagement">
      <h3 className="text-label text-text-tertiary uppercase mb-3">
        {t('rfqResponse.buyer.title')}
      </h3>
      <ul className="space-y-1 text-sm mb-4">
        {rfq.invitedSupplierIds.map((sid) => {
          const row = rows.find((r) => r.supplierId === sid);
          const intent = row?.intent;
          return (
            <li
              key={sid}
              className="flex flex-wrap items-center gap-2"
              data-testid={`engagement-row-${sid}`}
            >
              <span className="text-text-primary font-medium">{nameOf(sid)}</span>
              <StatusPill
                variant={intent?.intent === 'decline' ? 'neutral' : intent ? 'info' : 'neutral'}
              >
                {intent?.intent === 'decline'
                  ? t('rfqResponse.intent.declined')
                  : intent
                    ? t('rfqResponse.buyer.responding')
                    : t('rfqResponse.buyer.noAnswer')}
              </StatusPill>
              {intent?.intent === 'decline' && (
                <span className="text-xs text-text-secondary">
                  {t(`rfqResponse.decline.reasonLabel.${intent.reason}`)} — {intent.text}
                </span>
              )}
              {rfq.confidential && (
                <span className="text-xs text-text-tertiary">
                  {row?.confidentialityAcceptedAt ? (
                    <>
                      {t('rfqResponse.confidential.accepted')}{' '}
                      <Data>{formatDateTime(row.confidentialityAcceptedAt)}</Data>
                    </>
                  ) : (
                    t('rfqResponse.buyer.termsNotAccepted')
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <h4 className="text-xs font-semibold text-text-secondary mb-2">
        {t('rfqResponse.buyer.clarifications')}
      </h4>
      {questions.length === 0 ? (
        <p className="text-xs text-text-tertiary">{t('rfqResponse.buyer.noQuestions')}</p>
      ) : (
        <ul className="space-y-3">
          {questions.map((c) => (
            <li
              key={c.id}
              className="border border-border-subtle rounded-md px-3 py-2 text-sm"
              data-testid={`buyer-clarification-${c.id}`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-tertiary mb-1">
                <span>{t('rfqResponse.buyer.askedBy', { name: c.askedByName ?? '' })}</span>
                <Data>{formatDateTime(c.askedAt)}</Data>
                {c.state === 'Answered' && (
                  <StatusPill variant="neutral">
                    {t(
                      c.visibility === 'published'
                        ? 'rfqResponse.clar.published'
                        : 'rfqResponse.clar.private'
                    )}
                  </StatusPill>
                )}
              </div>
              <p className="text-text-primary">{c.question}</p>
              {c.answer && <p className="text-text-secondary mt-1">↳ {c.answer}</p>}
              {c.state === 'Asked' &&
                (answerAvailability.kind === 'held' ? (
                  <AnswerForm clarification={c} />
                ) : (
                  <HandoffNotice
                    availability={answerAvailability}
                    testId="handoff-rfqclarification-answer"
                  />
                ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default RfqEngagementSection;
