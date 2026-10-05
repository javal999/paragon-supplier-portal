import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import SessionAttachments from '@components/ui-v2/SessionAttachments';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { formatDate } from '@lib/format';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { useRfiEvents } from '@services/query/hooks';
import { useRfxCommand } from '@services/query/commandHooks';
import { invalidAnswers, missingRequiredAnswers, responseWindowRefusal } from '@services/transitions/rfxRules';
import { responseDocumentsRefusal } from '@services/transitions/rfxDocumentRules';
import type { RfiAnswer } from '@services/sourcing/types';
import type { RfiEventView } from '@services/sourcing/views';
import { DeadlinePill, rfxNow } from './rfx/rfxDisplay';
import RfxQuestionForm from './rfx/RfxQuestionForm';
import RfxConfidentialityGate from './rfx/RfxConfidentialityGate';
import ResponseDocumentsSection, { type DocumentDraft } from './rfx/ResponseDocumentsSection';
import { ResponseVersionLine, ReviseControls } from './rfx/ResponseRevise';

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
//   · A REQUIRED QUESTION BLOCKS SENDING, AND SO DOES AN ANSWER THAT DOES NOT
//     FIT ITS QUESTION. The page names what is missing or wrong; the submit
//     verb refuses the act with the same predicates.
//
// ⚠️ **A CONFIDENTIAL REQUEST SHOWS ONLY ITS GATE UNTIL THE SUPPLIER ACCEPTS
// (RFx authoring).** The read withholds the description, attachments and
// questions, so this page has nothing to render but the terms and the accept
// button — and accepting is a dispatched act, recorded with its time.
//
// NR-1 · THE DOCUMENTS SECTION AND "REVISE RESPONSE" (B4). The form carries
// the supplier's files (`ResponseDocumentsSection`), judged with the rule the
// submit and revise verbs call. A SUBMITTED response is never saved again (the
// save verb refuses `RESPONSE_ALREADY_SUBMITTED`): before the deadline "Revise
// response" re-opens the form on the latest version and dispatches the REVISE
// verb, which appends a version; after it, the response and its files are
// read-only and the action is absent, not disabled (the verb refuses anyway).
//
// COMPANY IDENTITY IS NEVER ASKED. Legal name, tax number, address and bank
// come from the company profile, and the page says so rather than leaving the
// supplier to wonder why the form starts at "what can you make".
// ─────────────────────────────────────────────────────────────────────────────

const SupplierRfi: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const events = useRfiEvents();
  const answer = useVerbAvailability('rfiresponse:answer');
  const command = useRfxCommand();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, RfiAnswer[]>>({});
  const [docDraft, setDocDraft] = useState<Record<string, readonly DocumentDraft[]>>({});
  const [revising, setRevising] = useState<Record<string, boolean>>({});

  // The eyebrow is the menu section alone (the `PageHeader` rule).
  const crumb = [t('hub.nav.section.sourcing')];
  const items = useMemo(() => events.data?.items ?? [], [events.data]);

  if (events.isPending) return <LoadingState breadcrumb={crumb} />;
  if (events.isError)
    return <ErrorState breadcrumb={crumb} error={events.error} onRetry={() => events.refetch()} />;

  const supplierId = identity.supplierId ?? '';

  /** The answers in hand: the local edits, else the stored response. */
  const answersFor = (event: RfiEventView): RfiAnswer[] =>
    draft[event.id] ?? [...(event.responses[0]?.answers ?? [])];

  /** The documents in hand: the local edits, else the stored ones. */
  const documentsFor = (event: RfiEventView): readonly DocumentDraft[] =>
    docDraft[event.id] ?? event.responses[0]?.documents ?? [];

  /** Drop the local edits, so the form reads the stored (latest) version. */
  const resetLocal = (eventId: string) => {
    setDraft(({ [eventId]: _a, ...rest }) => rest);
    setDocDraft(({ [eventId]: _d, ...rest }) => rest);
  };

  const setAnswer = (event: RfiEventView, questionId: string, patch: Partial<RfiAnswer>) => {
    const current = answersFor(event);
    const next = current.some((a) => a.questionId === questionId)
      ? current.map((a) => (a.questionId === questionId ? { ...a, ...patch } : a))
      : [...current, { questionId, ...patch }];
    setDraft((prev) => ({ ...prev, [event.id]: next }));
  };

  const report = (successKey: string) => ({
    onSuccess: (res: { status: string; reason?: string }) => {
      if (res.status === 'failed') {
        toast({ variant: 'error', title: t('rfx.toast.refused', { reason: res.reason ?? '' }) });
        return;
      }
      toast({ variant: 'success', title: t(successKey) });
    },
    onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) }),
  });

  const send = (event: RfiEventView, draftOnly: boolean) =>
    command.mutate(
      {
        verb: 'answerRfi',
        rfiId: event.id,
        supplierId,
        answers: answersFor(event),
        documents: documentsFor(event),
        ...(draftOnly ? { draftOnly: true } : {}),
      },
      report(draftOnly ? 'rfx.toast.saved' : 'rfx.toast.sent'),
    );

  // NR-1 BR-08 — the revise verb, never a save: the response stays Submitted
  // and the revision is appended as the next version.
  const sendRevision = (event: RfiEventView, responseId: string) =>
    command.mutate(
      { verb: 'reviseRfiResponse', responseId, answers: answersFor(event), documents: documentsFor(event) },
      {
        onSuccess: (res) => {
          report('rfx.toast.revised').onSuccess(res);
          if (res.status === 'failed') return;
          setRevising(({ [event.id]: _r, ...rest }) => rest);
          resetLocal(event.id);
        },
        onError: report('rfx.toast.revised').onError,
      },
    );

  const accept = (event: RfiEventView) =>
    command.mutate({ verb: 'acceptRfi', rfiId: event.id, supplierId }, report('rfxa.toast.accepted'));

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
          const invalid = invalidAnswers(event.questions, answers);
          const opened = openId === event.id;
          const submitted = mine?.status === 'Submitted';
          // NR-1 BR-08 — the window the revise verb judges, read by the same rule.
          const windowOpen = responseWindowRefusal(event, supplierId, rfxNow()) === null;
          const canRevise = submitted && windowOpen && answer.kind === 'held';
          const isRevising = canRevise && !!revising[event.id];
          const locked = (submitted && !isRevising) || answer.kind !== 'held' || event.closed;
          const documents = documentsFor(event);
          const answerFiles = answers.reduce((n, a) => n + (a.attachments?.length ?? 0), 0);
          const docRefusal = responseDocumentsRefusal(event.documentRequests ?? [], documents, answerFiles);
          const blocked = missing.length > 0 || invalid.length > 0 || docRefusal !== null;
          // An acceptance-only row is not a started answer (the read says the same).
          const started =
            !!mine && (submitted || mine.answers.length > 0 || (mine.documents ?? []).length > 0);
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
                  {event.confidentiality && (
                    <StatusPill variant="neutral">{t('rfxa.conf.pill')}</StatusPill>
                  )}
                  <DeadlinePill
                    deadline={event.invitedSuppliers.find((i) => i.supplierId === supplierId)?.deadline ?? event.responseDeadline}
                    done={mine?.status === 'Submitted'}
                    testId={`supplier-rfi-deadline-${event.id}`}
                  />
                  <StatusPill variant={mine?.status === 'Submitted' ? 'success' : started ? 'info' : 'neutral'}>
                    {t(`rfx.response.${mine?.status === 'Submitted' ? 'submitted' : started ? 'draft' : 'notStarted'}`)}
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

              {opened && event.confidentialityLocked && (
                <div className="px-4 py-4">
                  <RfxConfidentialityGate
                    terms={event.confidentiality?.terms}
                    disabled={answer.kind !== 'held' || event.closed || command.isPending}
                    onAccept={() => accept(event)}
                    testId={`supplier-rfi-gate-${event.id}`}
                  />
                </div>
              )}

              {opened && !event.confidentialityLocked && (
                <div className="px-4 py-4 space-y-5">
                  {mine?.confidentialityAcceptedAt && (
                    <p className="text-xs text-text-tertiary" data-testid={`supplier-rfi-accepted-${event.id}`}>
                      {t('rfxa.conf.acceptedOn')} <Data>{formatDate(mine.confidentialityAcceptedAt)}</Data>
                    </p>
                  )}
                  {event.description && (
                    <div>
                      <h4 className="text-xs uppercase tracking-wide text-text-tertiary">{t('rfx.rfi.about')}</h4>
                      <p className="text-sm text-text-secondary">{event.description}</p>
                    </div>
                  )}
                  {(event.attachments ?? []).length > 0 && (
                    <div>
                      <SessionAttachments
                        value={event.attachments ?? []}
                        label={t('rfxa.att.title')}
                        testId={`supplier-rfi-attachments-${event.id}`}
                      />
                    </div>
                  )}
                  <p className="text-xs text-text-tertiary">{t('rfx.rfi.identityFromMaster')}</p>
                  {submitted && (
                    <ResponseVersionLine versions={mine.versions} testId={`supplier-rfi-version-${event.id}`} />
                  )}
                  {mine?.status === 'Draft' && started && (
                    <p className="text-sm text-action-hover bg-action-soft rounded px-3 py-2" data-testid={`supplier-rfi-draft-${event.id}`}>
                      {t('rfx.draftHidden')}
                    </p>
                  )}

                  <RfxQuestionForm
                    questions={event.questions}
                    customSections={event.customSections}
                    answers={answers}
                    disabled={locked}
                    withDescription
                    onChange={(questionId, patch) => setAnswer(event, questionId, patch)}
                  />

                  <ResponseDocumentsSection
                    key={`${event.id}-${isRevising ? 'revising' : 'stored'}-${mine?.versions.length ?? 0}`}
                    requests={event.documentRequests ?? []}
                    value={documents}
                    onChange={locked ? undefined : (next) => setDocDraft((prev) => ({ ...prev, [event.id]: next }))}
                    filesAlready={answerFiles}
                    testId={`supplier-rfi-docs-${event.id}`}
                  />

                  {missing.length > 0 && !event.closed && (
                    <p className="text-sm text-danger" data-testid={`supplier-rfi-missing-${event.id}`}>
                      {t('rfx.rfi.missing')}
                    </p>
                  )}
                  {invalid.length > 0 && !event.closed && (
                    <p className="text-sm text-danger" data-testid={`supplier-rfi-invalid-${event.id}`}>
                      {t('rfxa.answer.fixInvalid')}
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

                  {/* NR-1 BR-08 — while revising, Save and Submit give way to the
                      revise verb's controls: a Submitted response is never saved. */}
                  {!isRevising && (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        disabled={locked}
                        onClick={() => send(event, true)}
                        data-testid={`supplier-rfi-save-${event.id}`}
                      >
                        {t('rfx.save')}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={locked || blocked}
                        onClick={() => send(event, false)}
                        data-testid={`supplier-rfi-submit-${event.id}`}
                      >
                        {t('rfx.rfi.submit')}
                      </Button>
                    </div>
                  )}
                  {submitted && mine && (
                    <ReviseControls
                      windowOpen={windowOpen}
                      held={answer.kind === 'held'}
                      revising={isRevising}
                      closed={event.closed}
                      nextVersion={mine.versions.length + 1}
                      blocked={blocked || command.isPending}
                      onStart={() => {
                        resetLocal(event.id);
                        setRevising((prev) => ({ ...prev, [event.id]: true }));
                      }}
                      onCancel={() => {
                        resetLocal(event.id);
                        setRevising(({ [event.id]: _r, ...rest }) => rest);
                      }}
                      onSend={() => sendRevision(event, mine.id)}
                      testIdPrefix={`supplier-rfi-${event.id}`}
                    />
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </AppShellV2>
  );
};

export default SupplierRfi;
