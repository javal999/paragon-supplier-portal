/** @import React from 'react' */
/** @import { RiskClass, SupplierAsk } from '@services/data/types' */
/** @import { SupplierAskTopic } from '@services/transitions/supplierAskRules' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import ModalOverlay from '@components/ui-v2/ModalOverlay';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { formatDate } from '@lib/format';
import { whatsAppShareHref } from '@lib/whatsAppShare';
import { useSupplierAsks } from '@services/query/hooks';
import { useSupplierAskCommand } from '@services/query/commandHooks';
import { sdcClock } from '@services/sdc/clock';
import { dayOf } from '@services/transitions/inventoryRules';
import {
  SUPPLIER_ASK_TOPICS,
  supplierAskRaiseRefusal,
  supplierAskRefusalOf,
  supplierAskSubjectKey
} from '@services/transitions/supplierAskRules';
import { inputClass, labelClass } from './inventoryDisplay';
import {
  AskStatePill,
  AskSubject,
  askQuestionText,
  askRefusalText,
  latestAnswer
} from './supplierAskDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// INV-D9 — PTI's "Ask supplier" control, built once for every PTI surface
// (lanes 2B–2D place it: alerts, the material drawer, stock simulation,
// capacity gap weeks).
//
//   · No ask on the subject yet → the button, named for its topic ("Ask for
//     a production date", BL-227), opens a dialog: topic, the
//     question (prefilled per topic, editable) and an optional due date.
//   · A live ask on the same supplier × subject (Open or Answered) → the
//     control shows that ask instead of offering a duplicate: its state, the
//     question, the answer, and "Close ask" (Answered) or "Withdraw ask"
//     (Open), plus an optional WhatsApp share of the hub link. No email.
//
// Each act is gated on its own atom (§84 — the MODE is gated, not the door):
// a seat without `supplierask:raise` sees whose act it is instead of the
// button; a seat without `supplierask:close` sees the ask without its actions.
// The dialog's pre-check is `supplierAskRaiseRefusal`, the verb's own rule.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} AskSupplierButtonProps
 * @property {string} supplierId
 * @property {string} [materialCode] The subject when it is a material.
 * @property {string} [planningGroupId] The subject when it is a capacity planning group, with `week`.
 * @property {string} [week] The planning group's week (its Monday, `YYYY-MM-DD`).
 * @property {SupplierAskTopic} topic The topic the dialog opens on.
 * @property {string} [defaultQuestion] Replaces the topic's prefilled question.
 * @property {RiskClass} [riskClass] The class of the alert the ask comes from.
 * @property {string} [testId] Prefix for the test ids (default `ask-supplier`).
 */

/**
 * The hub link a WhatsApp share carries: the supplier's To do.
 * @returns {string}
 */
const hubLink = () =>
  typeof window === 'undefined'
    ? '#/supplier/home'
    : `${window.location.origin}${window.location.pathname}#/supplier/home`;

/** @type {React.FC<AskSupplierButtonProps>} */
const AskSupplierButton = ({
  supplierId,
  materialCode,
  planningGroupId,
  week,
  topic,
  defaultQuestion,
  riskClass,
  testId: testIdProp
}) => {
  const { t } = useTranslation();
  // A test id, not copy.
  const testId = testIdProp ?? 'ask-supplier';
  const raiseAvailability = useVerbAvailability('supplierask:raise');
  const asks = useSupplierAsks();
  const [open, setOpen] = useState(false);
  const subject = useMemo(
    () => (materialCode ? { materialCode } : { planningGroupId, week }),
    [materialCode, planningGroupId, week]
  );
  const key = supplierAskSubjectKey(supplierId, subject);
  /** @type {SupplierAsk | undefined} */
  const live = (asks.data?.items ?? []).find(
    (a) =>
      (a.state === 'Open' || a.state === 'Answered') &&
      supplierAskSubjectKey(a.supplierId, a) === key
  );

  if (live) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2" data-testid={`${testId}-existing`}>
        <span className="text-xs text-text-secondary">
          {t(`supplierAsk.existing.${live.state}`)}
        </span>
        <Button variant="secondary" onClick={() => setOpen(true)} data-testid={`${testId}-view`}>
          {t('supplierAsk.view')}
        </Button>
        {open ? <AskViewDialog ask={live} onClose={() => setOpen(false)} testId={testId} /> : null}
      </span>
    );
  }

  if (raiseAvailability.kind !== 'held')
    return <HandoffNotice availability={raiseAvailability} testId="handoff-supplierask-raise" />;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} data-testid={`${testId}-open`}>
        {t(`supplierAsk.buttonFor.${topic}`)}
      </Button>
      {open ? (
        <AskRaiseDialog
          supplierId={supplierId}
          subject={subject}
          topic={topic}
          defaultQuestion={defaultQuestion}
          riskClass={riskClass}
          onClose={() => setOpen(false)}
          testId={testId}
        />
      ) : null}
    </>
  );
};

/**
 * @typedef {object} AskRaiseDialogProps
 * @property {string} supplierId
 * @property {{ materialCode?: string; planningGroupId?: string; week?: string }} subject
 * @property {SupplierAskTopic} topic
 * @property {string} [defaultQuestion]
 * @property {RiskClass} [riskClass]
 * @property {() => void} onClose
 * @property {string} testId
 */

/** @type {React.FC<AskRaiseDialogProps>} */
const AskRaiseDialog = ({
  supplierId,
  subject,
  topic: initialTopic,
  defaultQuestion,
  riskClass,
  onClose,
  testId
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const command = useSupplierAskCommand();
  const [topic, setTopic] = useState(initialTopic);
  const [question, setQuestion] = useState(
    defaultQuestion ?? t(`supplierAsk.default.${initialTopic}`)
  );
  const [edited, setEdited] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const today = dayOf(sdcClock.now());
  // The verb's own rule. The subject was chosen by the page that placed the
  // control, so "supplied" is the page's to answer; the live-ask check is the
  // control's (it shows the live ask instead of this dialog).
  const refusal = supplierAskRaiseRefusal({
    topic,
    subject,
    question,
    dueDate,
    today,
    supplied: true,
    openOnSubject: false
  });

  /** @param {SupplierAskTopic} next */
  const changeTopic = (next) => {
    setTopic(next);
    // A question the planner has not edited follows the topic.
    if (!edited && defaultQuestion === undefined) setQuestion(t(`supplierAsk.default.${next}`));
  };

  /** @param {React.FormEvent} e */
  const send = async (e) => {
    e.preventDefault();
    if (refusal) return;
    const result = await command.mutateAsync({
      verb: 'raise',
      supplierId,
      ...subject,
      topic,
      question,
      ...(dueDate ? { dueDate } : {}),
      ...(riskClass ? { riskClass } : {})
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
    toast({ variant: 'success', title: t('supplierAsk.toast.raised') });
    onClose();
  };

  return (
    <ModalOverlay
      onClose={onClose}
      label={t('supplierAsk.dialog.title')}
      testId={`${testId}-dialog`}
    >
      <form
        onSubmit={send}
        className="bg-white rounded-lg border border-border-subtle w-full max-w-lg p-5 flex flex-col gap-3"
      >
        <h2 className="text-section text-text-primary">{t('supplierAsk.dialog.title')}</h2>
        <p className="text-sm text-text-secondary">
          {t('supplierAsk.field.subject')}: <AskSubject subject={subject} />
        </p>
        <label className="block">
          <span className={labelClass}>{t('supplierAsk.field.topic')}</span>
          <select
            className={inputClass}
            value={topic}
            data-testid={`${testId}-topic`}
            onChange={(e) => changeTopic(/** @type {SupplierAskTopic} */ (e.target.value))}
          >
            {SUPPLIER_ASK_TOPICS.map((tp) => (
              <option key={tp} value={tp}>
                {t(`supplierAsk.topic.${tp}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>{t('supplierAsk.field.question')}</span>
          <textarea
            className={inputClass}
            rows={4}
            value={question}
            data-testid={`${testId}-question`}
            onChange={(e) => {
              setEdited(true);
              setQuestion(e.target.value);
            }}
          />
        </label>
        <label className="block">
          <span className={labelClass}>{t('supplierAsk.field.dueDate')}</span>
          <input
            type="date"
            min={today}
            className={`${inputClass} font-mono`}
            value={dueDate}
            data-testid={`${testId}-due`}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>
        {refusal ? (
          <p className="text-xs text-danger" role="alert" data-testid={`${testId}-refusal`}>
            {askRefusalText(t, refusal)}
          </p>
        ) : null}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('supplierAsk.cancel')}
          </Button>
          <Button
            type="submit"
            variant="outline"
            disabled={refusal !== null || command.isPending}
            data-testid={`${testId}-submit`}
          >
            {t('supplierAsk.submit')}
          </Button>
        </div>
      </form>
    </ModalOverlay>
  );
};

/** @type {React.FC<{ ask: SupplierAsk; onClose: () => void; testId: string }>} */
const AskViewDialog = ({ ask, onClose, testId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const command = useSupplierAskCommand();
  const closeAvailability = useVerbAvailability('supplierask:close');
  const answer = latestAnswer(ask);
  const asked = ask.history[0];

  /** @param {'close' | 'withdraw'} verb */
  const act = async (verb) => {
    const result = await command.mutateAsync({ verb, askId: ask.id });
    if (result.status === 'failed') {
      toast({
        variant: 'error',
        title: t('supplierAsk.toast.refused', { reason: result.reason ?? '' })
      });
      return;
    }
    toast({
      variant: 'success',
      title: t(verb === 'close' ? 'supplierAsk.toast.closed' : 'supplierAsk.toast.withdrawn')
    });
    onClose();
  };

  return (
    <ModalOverlay
      onClose={onClose}
      label={t('supplierAsk.dialog.viewTitle')}
      testId={`${testId}-view-dialog`}
    >
      <div className="bg-white rounded-lg border border-border-subtle w-full max-w-lg p-5 flex flex-col gap-3">
        <h2 className="text-section text-text-primary">{t('supplierAsk.dialog.viewTitle')}</h2>
        <p className="text-sm text-text-secondary flex flex-wrap items-center gap-2">
          <AskStatePill state={ask.state} />
          <span>{t(`supplierAsk.topic.${ask.topic}`)}</span>·<AskSubject subject={ask} />
        </p>
        <p className="text-sm text-text-primary" data-testid={`${testId}-view-question`}>
          {askQuestionText(t, ask)}
        </p>
        <p className="text-xs text-text-tertiary">
          {t('supplierAsk.askedLabel')} <Data>{formatDate(asked?.at)}</Data>
          {ask.dueDate ? (
            <>
              {' '}
              · {t('supplierAsk.dueLabel')} <Data>{formatDate(ask.dueDate)}</Data>
            </>
          ) : null}
        </p>
        {answer ? (
          <div
            className="rounded-md border border-border-subtle bg-bg-hover p-3"
            data-testid={`${testId}-view-answer`}
          >
            <p className={labelClass}>{t('supplierAsk.answerLabel')}</p>
            <p className="text-sm text-text-primary">{answer.text}</p>
            {answer.date ? (
              <p className="text-xs text-text-secondary mt-1">
                {t('supplierAsk.answerDateLabel')} <Data>{formatDate(answer.date)}</Data>
              </p>
            ) : null}
          </div>
        ) : null}
        {closeAvailability.kind === 'held' ? null : (
          <HandoffNotice availability={closeAvailability} testId="handoff-supplierask-close" />
        )}
        <div className="flex flex-wrap gap-2 justify-end">
          <a
            href={whatsAppShareHref(t('supplierAsk.share.text', { link: hubLink() }))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-action-hover hover:underline px-2 py-2.5"
            data-testid={`${testId}-whatsapp`}
          >
            <MessageCircle size={16} aria-hidden="true" />
            {t('supplierAsk.shareWhatsApp')}
          </a>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('supplierAsk.closeDialog')}
          </Button>
          {closeAvailability.kind === 'held' && ask.state === 'Answered' ? (
            <Button
              variant="outline"
              disabled={command.isPending}
              onClick={() => void act('close')}
              data-testid={`${testId}-close`}
            >
              {t('supplierAsk.close')}
            </Button>
          ) : null}
          {closeAvailability.kind === 'held' && ask.state === 'Open' ? (
            <Button
              variant="outline"
              disabled={command.isPending}
              onClick={() => void act('withdraw')}
              data-testid={`${testId}-withdraw`}
            >
              {t('supplierAsk.withdraw')}
            </Button>
          ) : null}
        </div>
      </div>
    </ModalOverlay>
  );
};

export default AskSupplierButton;
