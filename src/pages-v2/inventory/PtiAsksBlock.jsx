/** @import React from 'react' */
/** @import { SupplierAsk } from '@services/data/types' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { formatDate } from '@lib/format';
import { useSupplierAsks } from '@services/query/hooks';
import { useSupplierAskCommand } from '@services/query/commandHooks';
import {
  supplierAskAnswerRefusal,
  supplierAskRefusalOf
} from '@services/transitions/supplierAskRules';
import { RiskPill, inputClass, labelClass } from './inventoryDisplay';
import { AskSubject, askOrder, askRefusalText } from './supplierAskDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// Inventory UX S-04 (INV-D9) — "PTI is asking about N of your materials".
//
// On the supplier To do (above the lanes, RFX-D20 keeps the lanes and their
// order) and on the Stock page (between the weekly status and the tabs). One
// line per ask still waiting on the supplier, High first: class and topic, the
// material or planning group and week, PTI's question, the due date, and
// "Answer", which opens the reply form on that line. Empty: "Nothing PTI is
// waiting on".
//
// The read is the supplier's own (the service narrows it to the asks that
// name it). The reply form is the only entrance to `t_supplierask_answer`
// and is gated on the MODE (§84): a seat without the atom reads the asks and
// is told whose act it is.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC<{ supplierId: string }>} */
const PtiAsksBlock = ({ supplierId }) => {
  const { t } = useTranslation();
  const asks = useSupplierAsks();
  const availability = useVerbAvailability('supplierask:answer');
  const [replying, setReplying] = useState(/** @type {string | null} */ (null));
  const open = (asks.data?.items ?? [])
    .filter((a) => a.supplierId === supplierId && a.state === 'Open')
    .sort(askOrder);
  const held = availability.kind === 'held';

  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
      data-testid="pti-asks"
    >
      {open.length === 0 ? (
        <p className="text-sm text-text-secondary" data-testid="pti-asks-empty">
          {t('supplierAsk.block.empty')}
        </p>
      ) : (
        <>
          <h2 className="text-section text-text-primary mb-2" data-testid="pti-asks-title">
            {t('supplierAsk.block.title', { count: open.length })}
          </h2>
          {held ? null : (
            <HandoffNotice availability={availability} testId="handoff-supplierask-answer" />
          )}
          <ul className="divide-y divide-border-subtle">
            {open.map((a) => (
              <AskLine
                key={a.id}
                ask={a}
                held={held}
                replying={replying === a.id}
                onReply={() => setReplying(a.id)}
                onDone={() => setReplying(null)}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
};

/**
 * @typedef {object} AskLineProps
 * @property {SupplierAsk} ask
 * @property {boolean} held The seat holds `supplierask:answer`.
 * @property {boolean} replying The reply form is open on this line.
 * @property {() => void} onReply
 * @property {() => void} onDone
 */

/** @type {React.FC<AskLineProps>} */
const AskLine = ({ ask, held, replying, onReply, onDone }) => {
  const { t } = useTranslation();
  return (
    <li className="py-3 flex flex-col gap-2" data-testid={`pti-ask-${ask.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        {ask.riskClass ? <RiskPill riskClass={ask.riskClass} /> : null}
        <span className="text-sm font-medium text-text-primary">
          {t(`supplierAsk.topic.${ask.topic}`)}
        </span>
        <span className="text-sm text-text-secondary">
          <AskSubject subject={ask} />
        </span>
        {ask.dueDate ? (
          <span className="text-xs text-text-secondary">
            {t('supplierAsk.dueLabel')} <Data>{formatDate(ask.dueDate)}</Data>
          </span>
        ) : null}
        {held && !replying ? (
          <Button
            variant="outline"
            className="ml-auto"
            onClick={onReply}
            data-testid={`pti-ask-answer-${ask.id}`}
          >
            {t('supplierAsk.answer')}
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-text-primary">{ask.question}</p>
      {held && replying ? <ReplyForm ask={ask} onDone={onDone} /> : null}
    </li>
  );
};

/** @type {React.FC<{ ask: SupplierAsk; onDone: () => void }>} */
const ReplyForm = ({ ask, onDone }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const command = useSupplierAskCommand();
  const [answer, setAnswer] = useState('');
  const [answerDate, setAnswerDate] = useState('');
  const refusal = supplierAskAnswerRefusal({ answer, answerDate });
  // An untouched empty form does not nag; it blocks at the button.
  const shown = answer === '' && answerDate === '' ? null : refusal;

  /** @param {React.FormEvent} e */
  const send = async (e) => {
    e.preventDefault();
    if (refusal) return;
    const result = await command.mutateAsync({
      verb: 'answer',
      askId: ask.id,
      answer,
      ...(answerDate ? { answerDate } : {})
    });
    if (result.status === 'failed') {
      const code = supplierAskRefusalOf(result.reason);
      toast({
        variant: 'error',
        title: code
          ? askRefusalText(t, code)
          : t('supplierAsk.toast.refused', { reason: result.reason ?? '' })
      });
      return;
    }
    toast({ variant: 'success', title: t('supplierAsk.toast.answered') });
    onDone();
  };

  return (
    <form
      onSubmit={send}
      className="rounded-md border border-border-subtle bg-white p-3 flex flex-col gap-2"
      data-testid={`pti-ask-form-${ask.id}`}
    >
      <label className="block">
        <span className={labelClass}>{t('supplierAsk.reply.text')}</span>
        <textarea
          className={inputClass}
          rows={3}
          value={answer}
          data-testid={`pti-ask-reply-${ask.id}`}
          onChange={(e) => setAnswer(e.target.value)}
        />
      </label>
      <label className="block">
        <span className={labelClass}>{t('supplierAsk.reply.date')}</span>
        <input
          type="date"
          className={`${inputClass} font-mono`}
          value={answerDate}
          data-testid={`pti-ask-reply-date-${ask.id}`}
          onChange={(e) => setAnswerDate(e.target.value)}
        />
      </label>
      {shown ? (
        <p className="text-xs text-danger" role="alert">
          {askRefusalText(t, shown)}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="outline"
          disabled={refusal !== null || command.isPending}
          data-testid={`pti-ask-send-${ask.id}`}
        >
          {t('supplierAsk.reply.submit')}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          {t('supplierAsk.cancel')}
        </Button>
      </div>
    </form>
  );
};

export default PtiAsksBlock;
