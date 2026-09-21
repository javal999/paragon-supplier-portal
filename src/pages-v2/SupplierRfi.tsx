import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import Button from '../components/ui-v2/Button';
import Data from '../components/ui-v2/Data';
import StatusPill from '../components/ui-v2/StatusPill';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/format';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { useRfiEvents } from '../services/query/hooks';
import { useRfxCommand } from '../services/query/commandHooks';
import { RFI_SECTION_ORDER } from '../services/sourcing/rfxConfig';
import { missingRequiredAnswers } from '../services/transitions/rfxRules';
import type { RfiAnswer, RfiQuestion } from '../services/sourcing/types';
import type { RfiEventView } from '../services/sourcing/views';
import { DeadlinePill, rfxNow } from './rfx/rfxDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER INFORMATION REQUESTS — REQ-E03-02 (SUP).
//
// The invitation, the questions, and the box the answers go in. Two rules are
// visible on the screen and enforced at the verb, which is the only arrangement
// that survives a hand-made dispatch:
//
//   · A PARTIAL ANSWER IS A DRAFT AND PTI CANNOT SEE IT. "Save draft" is a
//     first-class button, not a lesser one, and the page says out loud that the
//     draft is invisible.
//   · A REQUIRED QUESTION BLOCKS SENDING. The page names the ones still
//     missing; the submit verb refuses the act with the same list.
//
// COMPANY IDENTITY IS NEVER ASKED. Legal name, tax number, address and bank
// come from the company profile, and the page says so rather than leaving the
// supplier to wonder why the form starts at "what can you make".
// ─────────────────────────────────────────────────────────────────────────────

const answerValue = (answers: readonly RfiAnswer[], id: string): RfiAnswer | undefined =>
  answers.find((a) => a.questionId === id);

const SupplierRfi: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const events = useRfiEvents();
  const answer = useVerbAvailability('rfiresponse:answer');
  const command = useRfxCommand();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, RfiAnswer[]>>({});

  const crumb = [t('hub.nav.section.sourcing'), t('rfx.rfi.supplier.title')];
  const items = useMemo(() => events.data?.items ?? [], [events.data]);

  if (events.isPending) return <LoadingState breadcrumb={crumb} />;
  if (events.isError)
    return <ErrorState breadcrumb={crumb} error={events.error} onRetry={() => events.refetch()} />;

  const supplierId = identity.supplierId ?? '';

  /** The answers in hand: the local edits, else the stored response. */
  const answersFor = (event: RfiEventView): RfiAnswer[] =>
    draft[event.id] ?? [...(event.responses[0]?.answers ?? [])];

  const setAnswer = (event: RfiEventView, questionId: string, patch: Partial<RfiAnswer>) => {
    const current = answersFor(event);
    const next = current.some((a) => a.questionId === questionId)
      ? current.map((a) => (a.questionId === questionId ? { ...a, ...patch } : a))
      : [...current, { questionId, ...patch }];
    setDraft((prev) => ({ ...prev, [event.id]: next }));
  };

  const send = (event: RfiEventView, draftOnly: boolean) =>
    command.mutate(
      {
        verb: 'answerRfi',
        rfiId: event.id,
        supplierId,
        answers: answersFor(event),
        ...(draftOnly ? { draftOnly: true } : {}),
      },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({ variant: 'error', title: t('rfx.toast.refused', { reason: res.reason ?? '' }) });
            return;
          }
          toast({ variant: 'success', title: t(draftOnly ? 'rfx.toast.saved' : 'rfx.toast.sent') });
        },
        onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) }),
      },
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('rfx.rfi.supplier.title')}
        count={items.length}
        subtitle={t('rfx.rfi.supplier.subtitle')}
      />
      <PageMetaLine className="-mt-6 mb-4">
        {t('rfx.asOf')} <Data>{formatDate(rfxNow())}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {answer.kind !== 'held' && (
        <div className="mb-4">
          <HandoffNotice availability={answer} testId="handoff-rfi-answer" />
        </div>
      )}

      {items.length === 0 && (
        <p className="py-10 text-center text-sm text-text-tertiary" data-testid="supplier-rfi-empty">
          {t('rfx.rfi.supplier.empty')}
        </p>
      )}

      <div className="space-y-4">
        {items.map((event) => {
          const mine = event.responses[0] ?? null;
          const answers = answersFor(event);
          const missing = missingRequiredAnswers(event.questions, answers);
          const opened = openId === event.id;
          return (
            <section
              key={event.id}
              className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
              data-testid={`supplier-rfi-${event.id}`}
            >
              <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border-subtle">
                <div>
                  <Data className="font-semibold">{event.eventNumber}</Data>
                  <div className="text-sm text-text-primary">{event.title}</div>
                </div>
                <div className="flex items-center gap-3">
                  <DeadlinePill
                    deadline={event.invitedSuppliers.find((i) => i.supplierId === supplierId)?.deadline ?? event.responseDeadline}
                    done={mine?.status === 'Submitted'}
                    testId={`supplier-rfi-deadline-${event.id}`}
                  />
                  <StatusPill variant={mine?.status === 'Submitted' ? 'success' : mine ? 'info' : 'neutral'}>
                    {t(`rfx.response.${mine?.status === 'Submitted' ? 'submitted' : mine ? 'draft' : 'notStarted'}`)}
                  </StatusPill>
                  <Button
                    variant="secondary"
                    onClick={() => setOpenId(opened ? null : event.id)}
                    data-testid={`supplier-rfi-open-${event.id}`}
                  >
                    {opened ? t('rfx.close') : t('rfx.rfi.answer')}
                  </Button>
                </div>
              </header>

              {opened && (
                <div className="px-4 py-4 space-y-5">
                  <p className="text-xs text-text-tertiary">{t('rfx.rfi.identityFromMaster')}</p>
                  {mine?.status === 'Draft' && (
                    <p className="text-sm text-action-hover bg-action-soft rounded px-3 py-2" data-testid={`supplier-rfi-draft-${event.id}`}>
                      {t('rfx.draftHidden')}
                    </p>
                  )}

                  {RFI_SECTION_ORDER.map((section) => {
                    const questions = event.questions.filter((q) => q.sectionId === section);
                    if (questions.length === 0) return null;
                    return (
                      <fieldset key={section} className="space-y-4">
                        <legend className="text-sm font-semibold text-text-primary">
                          {t(`rfx.section.${section}`)}
                        </legend>
                        {questions.map((q) => (
                          <QuestionField
                            key={q.id}
                            question={q}
                            answer={answerValue(answers, q.id)}
                            disabled={mine?.status === 'Submitted' || answer.kind !== 'held'}
                            onChange={(patch) => setAnswer(event, q.id, patch)}
                          />
                        ))}
                      </fieldset>
                    );
                  })}

                  {missing.length > 0 && !event.closed && (
                    <p className="text-sm text-danger" data-testid={`supplier-rfi-missing-${event.id}`}>
                      {t('rfx.rfi.missing')}
                    </p>
                  )}

                  {/* REQ-E03-02 — PTI closed the window. The verb refuses an answer
                      to a non-Open event (`EVENT_NOT_OPEN`), so offering the box
                      would be offering a gesture the act cannot accept. */}
                  {event.closed && (
                    <p
                      className="text-sm text-text-secondary bg-bg-hover rounded px-3 py-2"
                      data-testid={`supplier-rfi-closed-${event.id}`}
                    >
                      {t('rfx.rfi.closedNoAnswers')}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      disabled={answer.kind !== 'held' || event.closed || mine?.status === 'Submitted'}
                      onClick={() => send(event, true)}
                      data-testid={`supplier-rfi-save-${event.id}`}
                    >
                      {t('rfx.save')}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={
                        answer.kind !== 'held' ||
                        event.closed ||
                        missing.length > 0 ||
                        mine?.status === 'Submitted'
                      }
                      onClick={() => send(event, false)}
                      data-testid={`supplier-rfi-submit-${event.id}`}
                    >
                      {t('rfx.rfi.submit')}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </AppShellV2>
  );
};

/** One question, drawn according to its kind. */
const QuestionField: React.FC<{
  question: RfiQuestion;
  answer: RfiAnswer | undefined;
  disabled: boolean;
  onChange: (patch: Partial<RfiAnswer>) => void;
}> = ({ question, answer, disabled, onChange }) => {
  const { t } = useTranslation();
  const id = `q-${question.id}`;
  const value = answer?.value;
  const inputClass =
    'w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover';

  const options = question.type === 'yesNo' ? ['yes', 'no'] : (question.options ?? []);

  return (
    <div data-testid={`rfi-field-${question.id}`}>
      <label className="block text-sm text-text-primary mb-1" htmlFor={id}>
        {t(question.promptKey)}
        {question.required && <span className="text-danger ml-1">*</span>}
        {question.unitKey && <span className="text-text-tertiary ml-1">({t(question.unitKey)})</span>}
      </label>

      {(question.type === 'yesNo' || question.type === 'singleChoice') && (
        <select
          id={id}
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange({ value: e.target.value })}
          className={inputClass}
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {t(`rfx.opt.${o}`, { defaultValue: o })}
            </option>
          ))}
        </select>
      )}

      {question.type === 'multipleChoice' && (
        <div className="flex flex-wrap gap-3">
          {options.map((o) => {
            const chosen = Array.isArray(value) && value.includes(o);
            return (
              <label key={o} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-teal"
                  disabled={disabled}
                  checked={chosen}
                  onChange={() =>
                    onChange({
                      value: chosen
                        ? (value as string[]).filter((v) => v !== o)
                        : [...(Array.isArray(value) ? (value as string[]) : []), o],
                    })
                  }
                />
                {t(`rfx.opt.${o}`, { defaultValue: o })}
              </label>
            );
          })}
        </div>
      )}

      {(question.type === 'numberWithUnit' || question.type === 'date') && (
        <input
          id={id}
          type={question.type === 'date' ? 'date' : 'number'}
          disabled={disabled}
          value={value === undefined ? '' : String(value)}
          onChange={(e) =>
            onChange({ value: question.type === 'date' ? e.target.value : Number(e.target.value) })
          }
          className={inputClass}
        />
      )}

      {(question.type === 'text' || question.type === 'attachment') && (
        <textarea
          id={id}
          rows={2}
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange({ value: e.target.value })}
          className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover"
        />
      )}

      {/* REQ-E03-02 BR-02 — every structured entry carries a description. */}
      <input
        type="text"
        disabled={disabled}
        placeholder={t('rfx.rfi.description')}
        aria-label={`${t(question.promptKey)} — ${t('rfx.rfi.description')}`}
        value={answer?.description ?? ''}
        onChange={(e) => onChange({ description: e.target.value })}
        className="mt-2 w-full bg-white border border-border-input rounded-md px-3 h-9 text-xs focus:outline-none focus:border-action disabled:bg-bg-hover"
      />
    </div>
  );
};

export default SupplierRfi;
