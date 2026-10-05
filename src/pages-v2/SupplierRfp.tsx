import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import SessionAttachments from '@components/ui-v2/SessionAttachments';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { formatDate } from '@lib/format';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { useRfpAwards, useRfpEvents, useRfpOfferRounds } from '@services/query/hooks';
import { SupplierFirmOffers } from './rfx/SupplierFirmOffers';
import { useRfxCommand } from '@services/query/commandHooks';
import { RFP_TERM_GROUP_ORDER, rfpTermGroupOf } from '@services/sourcing/rfxConfig';
import {
  deviationsWithoutComment,
  invalidAnswers,
  invalidTermAnswers,
  missingRequiredAnswers,
  responseWindowRefusal,
  rfpPricingAnswerRefusal,
  unansweredTerms,
} from '@services/transitions/rfxRules';
import { responseDocumentsRefusal } from '@services/transitions/rfxDocumentRules';
import type { RfiAnswer, RfpPricingAnswer, RfpTermAnswer } from '@services/sourcing/types';
import type { RfpEventView } from '@services/sourcing/views';
import { DeadlinePill, rfxNow } from './rfx/rfxDisplay';
import RfxQuestionForm from './rfx/RfxQuestionForm';
import RfxConfidentialityGate from './rfx/RfxConfidentialityGate';
import { TermValueInput } from './rfx/RfpTermControls';
import { EMPTY_PRICING_ANSWER, RfpPricingForm } from './rfx/RfpPricing';
import { refusalCode } from './rfx/RfxQuestionEditor';
import { termLabel, termValueText } from './rfx/rfxAuthoringDisplay';
import ResponseDocumentsSection, { type DocumentDraft } from './rfx/ResponseDocumentsSection';
import { ResponseVersionLine, ReviseControls } from './rfx/ResponseRevise';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER PROPOSAL REQUESTS — REQ-E03-04 (SUP).
//
// One row per term the buyer asked for: PTI's requested value, the supplier's
// proposed value (typed in the term's own kind), Comply or Deviate, and — ON
// DEVIATE — a comment that is REQUIRED. The page marks it required and the
// submit verb refuses without it, because a deviation nobody explained changes
// the deal and says nothing about how.
//
// "Other terms" is the free-text box for terms the supplier wants to add that
// PTI did not ask for (the requirement's edge case).
//
// RFx authoring, in the order the supplier meets them:
//   1. a CONFIDENTIAL RFP shows only its gate — the read withheld the rest;
//   2. an RFP with a T&C document shows it with an acceptance tick, and the
//      answer boxes stay shut until it is accepted (refused at the verb too);
//   3. then the terms, the questions section, and INDICATIVE PRICING — every
//      price there labelled Indicative, the supplier's own options included;
//   4. then the DOCUMENTS section (NR-1, B4): one slot per document PTI asked
//      for, and "Other documents", judged by the rule the verbs call.
//
// A SUBMITTED proposal is never saved again: before the deadline "Revise
// response" re-opens the form on the latest version and dispatches the REVISE
// verb, which appends a version (NR-1 BR-08); after it the proposal and its
// files are read-only and the action is absent.
// ─────────────────────────────────────────────────────────────────────────────

const SupplierRfp: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const events = useRfpEvents();
  // RFx D3 — the firm-offer rounds this supplier was asked to, and its own
  // award outcome (both narrowed to this supplier by the read, RFX-R4).
  const offerRounds = useRfpOfferRounds();
  const rfpAwards = useRfpAwards();
  const answerVerb = useVerbAvailability('rfpresponse:answer');
  const command = useRfxCommand();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, RfpTermAnswer[]>>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const [qDraft, setQDraft] = useState<Record<string, RfiAnswer[]>>({});
  const [pDraft, setPDraft] = useState<Record<string, RfpPricingAnswer>>({});
  const [tcTicked, setTcTicked] = useState<Record<string, boolean>>({});
  const [docDraft, setDocDraft] = useState<Record<string, readonly DocumentDraft[]>>({});
  const [revising, setRevising] = useState<Record<string, boolean>>({});

  // The eyebrow is the menu section alone (the `PageHeader` rule).
  const crumb = [t('hub.nav.section.sourcing')];
  const items = useMemo(() => events.data?.items ?? [], [events.data]);

  if (events.isPending) return <LoadingState breadcrumb={crumb} />;
  if (events.isError)
    return <ErrorState breadcrumb={crumb} error={events.error} onRetry={() => events.refetch()} />;

  const supplierId = identity.supplierId ?? '';

  const answersFor = (event: RfpEventView): RfpTermAnswer[] =>
    draft[event.id] ?? [...(event.responses[0]?.answers ?? [])];
  const questionAnswersFor = (event: RfpEventView): RfiAnswer[] =>
    qDraft[event.id] ?? [...(event.responses[0]?.questionAnswers ?? [])];
  const pricingFor = (event: RfpEventView): RfpPricingAnswer =>
    pDraft[event.id] ?? event.responses[0]?.pricing ?? EMPTY_PRICING_ANSWER;

  const documentsFor = (event: RfpEventView): readonly DocumentDraft[] =>
    docDraft[event.id] ?? event.responses[0]?.documents ?? [];

  /** Drop the local edits, so the form reads the stored (latest) version. */
  const resetLocal = (eventId: string) => {
    setDraft(({ [eventId]: _a, ...rest }) => rest);
    setOther(({ [eventId]: _o, ...rest }) => rest);
    setQDraft(({ [eventId]: _q, ...rest }) => rest);
    setPDraft(({ [eventId]: _p, ...rest }) => rest);
    setDocDraft(({ [eventId]: _d, ...rest }) => rest);
  };

  const setAnswer = (event: RfpEventView, termId: string, patch: Partial<RfpTermAnswer>) => {
    const current = answersFor(event);
    const next = current.some((a) => a.termId === termId)
      ? current.map((a) => (a.termId === termId ? { ...a, ...patch } : a))
      : [...current, { termId, proposedValue: '', stance: 'comply' as const, ...patch }];
    setDraft((prev) => ({ ...prev, [event.id]: next }));
  };

  const setQuestionAnswer = (event: RfpEventView, questionId: string, patch: Partial<RfiAnswer>) => {
    const current = questionAnswersFor(event);
    const next = current.some((a) => a.questionId === questionId)
      ? current.map((a) => (a.questionId === questionId ? { ...a, ...patch } : a))
      : [...current, { questionId, ...patch }];
    setQDraft((prev) => ({ ...prev, [event.id]: next }));
  };

  const report = (successKey: string) => ({
    onSuccess: (res: { status: string; reason?: string }) =>
      toast(
        res.status === 'failed'
          ? { variant: 'error' as const, title: t('rfx.toast.refused', { reason: res.reason ?? '' }) }
          : { variant: 'success' as const, title: t(successKey) },
      ),
    onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) }),
  });

  /** The proposal in hand, as both the answer and the revise verb carry it. */
  const contentFor = (event: RfpEventView) => ({
    answers: answersFor(event),
    otherTerms: other[event.id] ?? event.responses[0]?.otherTerms ?? '',
    ...((event.questions ?? []).length > 0 ? { questionAnswers: questionAnswersFor(event) } : {}),
    ...(event.pricing ? { pricing: pricingFor(event) } : {}),
    documents: documentsFor(event),
  });

  const send = (event: RfpEventView, draftOnly: boolean) =>
    command.mutate(
      {
        verb: 'answerRfp',
        rfpId: event.id,
        supplierId,
        ...contentFor(event),
        ...(draftOnly ? { draftOnly: true } : {}),
      },
      report(draftOnly ? 'rfx.toast.saved' : 'rfx.toast.sent'),
    );

  // NR-1 BR-08 — the revise verb, never a save: the proposal stays Submitted
  // and the revision is appended as the next version.
  const sendRevision = (event: RfpEventView, responseId: string) =>
    command.mutate(
      { verb: 'reviseRfpResponse', responseId, ...contentFor(event) },
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

  const accept = (event: RfpEventView, what: { confidentiality?: boolean; terms?: boolean }) =>
    command.mutate({ verb: 'acceptRfp', rfpId: event.id, supplierId, ...what }, report('rfxa.toast.accepted'));

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('rfx.rfp.supplier.title')}
        count={items.length}
        subtitle={t('rfx.rfp.supplier.subtitle')}
      />
      <PageMetaLine className="-mt-6 mb-4">
        {t('rfx.asOf')} <Data>{formatDate(rfxNow())}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {answerVerb.kind !== 'held' && (
        <div className="mb-4">
          <HandoffNotice availability={answerVerb} testId="handoff-rfp-answer" />
        </div>
      )}

      {items.length === 0 && (
        <p className="py-10 text-center text-sm text-text-tertiary" data-testid="supplier-rfp-empty">
          {t('rfx.rfp.supplier.empty')}
        </p>
      )}

      <div className="space-y-4">
        {items.map((event) => {
          const mine = event.responses[0] ?? null;
          const answers = answersFor(event);
          const qAnswers = questionAnswersFor(event);
          const pricing = pricingFor(event);
          const missing = unansweredTerms(event.terms, answers);
          const badValues = invalidTermAnswers(event.terms, answers);
          const uncommented = deviationsWithoutComment(answers);
          const questions = event.questions ?? [];
          const qMissing = missingRequiredAnswers(questions, qAnswers);
          const qInvalid = invalidAnswers(questions, qAnswers);
          const pricingRefusal = event.pricing ? rfpPricingAnswerRefusal(event.pricing, pricing) : null;
          const opened = openId === event.id;
          const tcPending = !!event.termsDocument && !mine?.termsAcceptedAt;
          const submitted = mine?.status === 'Submitted';
          // NR-1 BR-08 — the window the revise verb judges, read by the same rule.
          const windowOpen = responseWindowRefusal(event, supplierId, rfxNow()) === null;
          const isRevising = submitted && windowOpen && answerVerb.kind === 'held' && !!revising[event.id];
          const documents = documentsFor(event);
          const answerFiles = qAnswers.reduce((n, a) => n + (a.attachments?.length ?? 0), 0);
          const docRefusal = responseDocumentsRefusal(event.documentRequests ?? [], documents, answerFiles);
          const started =
            !!mine &&
            (submitted ||
              mine.answers.length > 0 ||
              (mine.questionAnswers ?? []).length > 0 ||
              !!mine.pricing ||
              (mine.documents ?? []).length > 0);
          // A CLOSED event locks the form for the same reason a submitted one
          // does: the verb refuses an answer to a non-Open event
          // (`EVENT_NOT_OPEN`), so offering the boxes would offer a gesture the
          // act cannot accept. An unaccepted T&C locks it for the verb's
          // `TC_NOT_ACCEPTED`, for the same reason.
          const locked =
            (submitted && !isRevising) || event.closed || answerVerb.kind !== 'held' || tcPending;
          const blockers = [
            ...(missing.length > 0 ? ['terms'] : []),
            ...(badValues.length > 0 ? ['termValues'] : []),
            ...(uncommented.length > 0 ? ['comments'] : []),
            ...(qMissing.length > 0 ? ['questions'] : []),
            ...(qInvalid.length > 0 ? ['answers'] : []),
          ];
          const blocked = blockers.length > 0 || pricingRefusal !== null || docRefusal !== null;
          return (
            <section
              key={event.id}
              className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
              data-testid={`supplier-rfp-${event.id}`}
            >
              <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border-subtle">
                <div>
                  <Data className="font-semibold">{event.eventNumber}</Data>
                  <div className="text-sm text-text-primary">{event.title}</div>
                </div>
                <div className="flex items-center gap-3">
                  {event.confidentiality && <StatusPill variant="neutral">{t('rfxa.conf.pill')}</StatusPill>}
                  <DeadlinePill
                    deadline={
                      event.invitedSuppliers.find((i) => i.supplierId === supplierId)?.deadline ??
                      event.responseDeadline
                    }
                    done={mine?.status === 'Submitted'}
                  />
                  <StatusPill variant={mine?.status === 'Submitted' ? 'success' : started ? 'info' : 'neutral'}>
                    {t(`rfx.response.${mine?.status === 'Submitted' ? 'submitted' : started ? 'draft' : 'notStarted'}`)}
                  </StatusPill>
                  <Button
                    variant="secondary"
                    onClick={() => setOpenId(opened ? null : event.id)}
                    data-testid={`supplier-rfp-open-${event.id}`}
                  >
                    {opened ? t('rfx.close') : t('rfx.rfp.answer')}
                  </Button>
                </div>
              </header>

              {opened && event.confidentialityLocked && (
                <div className="px-4 py-4">
                  <RfxConfidentialityGate
                    terms={event.confidentiality?.terms}
                    disabled={answerVerb.kind !== 'held' || event.closed || command.isPending}
                    onAccept={() => accept(event, { confidentiality: true })}
                    testId={`supplier-rfp-gate-${event.id}`}
                  />
                </div>
              )}

              {opened && !event.confidentialityLocked && (
                <div className="px-4 py-4 space-y-4">
                  {mine?.confidentialityAcceptedAt && (
                    <p className="text-xs text-text-tertiary" data-testid={`supplier-rfp-accepted-${event.id}`}>
                      {t('rfxa.conf.acceptedOn')} <Data>{formatDate(mine.confidentialityAcceptedAt)}</Data>
                    </p>
                  )}
                  {submitted && (
                    <ResponseVersionLine versions={mine.versions} testId={`supplier-rfp-version-${event.id}`} />
                  )}
                  <p className="text-sm text-text-secondary whitespace-pre-line">{event.scope}</p>
                  {(event.attachments ?? []).length > 0 && (
                    <div>
                      <SessionAttachments
                        value={event.attachments ?? []}
                        label={t('rfxa.att.title')}
                        testId={`supplier-rfp-attachments-${event.id}`}
                      />
                    </div>
                  )}

                  {event.termsDocument && (
                    <div className="border border-border-subtle rounded-md px-3 py-3 space-y-2" data-testid={`supplier-rfp-tc-${event.id}`}>
                      <h4 className="text-sm font-semibold text-text-primary">{t('rfxa.tc.title')}</h4>
                      {event.termsDocument.text && (
                        <p className="text-sm text-text-secondary whitespace-pre-line">{event.termsDocument.text}</p>
                      )}
                      {event.termsDocument.attachment && (
                        <SessionAttachments
                          value={[event.termsDocument.attachment]}
                          label={t('rfxa.tc.file')}
                          testId={`supplier-rfp-tc-file-${event.id}`}
                        />
                      )}
                      {tcPending ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-sm text-text-primary">
                            <input
                              type="checkbox"
                              className="accent-teal"
                              data-testid={`supplier-rfp-tc-tick-${event.id}`}
                              checked={tcTicked[event.id] ?? false}
                              disabled={answerVerb.kind !== 'held' || event.closed}
                              onChange={(e) => setTcTicked((prev) => ({ ...prev, [event.id]: e.target.checked }))}
                            />
                            {t('rfxa.tc.tick')}
                          </label>
                          <Button
                            variant="outline"
                            disabled={!tcTicked[event.id] || answerVerb.kind !== 'held' || event.closed || command.isPending}
                            onClick={() => accept(event, { terms: true })}
                            data-testid={`supplier-rfp-tc-accept-${event.id}`}
                          >
                            {t('rfxa.tc.accept')}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-text-tertiary" data-testid={`supplier-rfp-tc-accepted-${event.id}`}>
                          {t('rfxa.tc.acceptedOn')} <Data>{formatDate(mine!.termsAcceptedAt!)}</Data>
                        </p>
                      )}
                    </div>
                  )}

                  {mine?.status === 'Draft' && started && (
                    <p
                      className="text-sm text-action-hover bg-action-soft rounded px-3 py-2"
                      data-testid={`supplier-rfp-draft-${event.id}`}
                    >
                      {t('rfx.draftHidden')}
                    </p>
                  )}
                  {event.closed && (
                    <p
                      className="text-sm text-text-secondary bg-bg-hover rounded px-3 py-2"
                      data-testid={`supplier-rfp-closed-${event.id}`}
                    >
                      {t('rfx.rfi.closedNoAnswers')}
                    </p>
                  )}

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableHeaderCell>{t('rfx.rfp.col.term')}</TableHeaderCell>
                        <TableHeaderCell>{t('rfx.rfp.col.requested')}</TableHeaderCell>
                        <TableHeaderCell>{t('rfx.rfp.col.proposed')}</TableHeaderCell>
                        <TableHeaderCell>{t('rfx.stance.comply')}</TableHeaderCell>
                        <TableHeaderCell>{t('rfx.rfp.comment')}</TableHeaderCell>
                      </TableHeader>
                      <tbody>
                        {RFP_TERM_GROUP_ORDER.flatMap((group) =>
                          event.terms
                            .filter((row) => rfpTermGroupOf(row) === group)
                            .map((row) => {
                              const a = answers.find((x) => x.termId === row.termId);
                              const deviates = a?.stance === 'deviate';
                              const needsComment = deviates && uncommented.includes(row.termId);
                              const label = termLabel(t, row);
                              return (
                                <TableRow key={row.termId} data-testid={`supplier-rfp-term-${row.termId}`}>
                                  <TableCell className="align-top">
                                    <div className="text-xs uppercase tracking-wide text-text-tertiary">
                                      {t(`rfx.group.${group}`)}
                                    </div>
                                    <div className="text-sm text-text-primary">{label}</div>
                                  </TableCell>
                                  <TableCell className="align-top text-sm text-text-secondary">
                                    <Data>{termValueText(t, row, row.requestedValue)}</Data>
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <TermValueInput
                                      row={row}
                                      value={a?.proposedValue ?? ''}
                                      onChange={(v) => setAnswer(event, row.termId, { proposedValue: v })}
                                      ariaLabel={label}
                                      disabled={locked}
                                      invalid={badValues.includes(row.termId)}
                                    />
                                    {badValues.includes(row.termId) && (
                                      <div className="text-xs text-danger mt-1" data-testid={`supplier-rfp-value-invalid-${row.termId}`}>
                                        {t('rfxa.term.valueInvalid')}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <select
                                      disabled={locked}
                                      aria-label={`${label} — ${t('rfx.stance.comply')}`}
                                      value={a?.stance ?? 'comply'}
                                      onChange={(e) =>
                                        setAnswer(event, row.termId, {
                                          stance: e.target.value as RfpTermAnswer['stance'],
                                        })
                                      }
                                      className="bg-white border border-border-input rounded-md px-2 h-9 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover"
                                    >
                                      <option value="comply">{t('rfx.stance.comply')}</option>
                                      <option value="deviate">{t('rfx.stance.deviate')}</option>
                                    </select>
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <input
                                      type="text"
                                      disabled={locked || !deviates}
                                      aria-label={`${label} — ${t('rfx.rfp.comment')}`}
                                      value={a?.comment ?? ''}
                                      onChange={(e) => setAnswer(event, row.termId, { comment: e.target.value })}
                                      className={`w-full bg-white border rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover ${
                                        needsComment ? 'border-danger' : 'border-border-input'
                                      }`}
                                    />
                                    {needsComment && (
                                      <div
                                        className="text-xs text-danger mt-1"
                                        data-testid={`supplier-rfp-comment-required-${row.termId}`}
                                      >
                                        {t('rfx.rfp.commentRequired')}
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            }),
                        )}
                      </tbody>
                    </Table>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-semibold text-text-primary mb-1"
                      htmlFor={`other-${event.id}`}
                    >
                      {t('rfx.rfp.otherTerms')}
                    </label>
                    <p className="text-xs text-text-tertiary mb-1">{t('rfx.rfp.otherTermsHint')}</p>
                    <textarea
                      id={`other-${event.id}`}
                      rows={2}
                      disabled={locked}
                      value={other[event.id] ?? mine?.otherTerms ?? ''}
                      onChange={(e) => setOther((prev) => ({ ...prev, [event.id]: e.target.value }))}
                      className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover"
                    />
                  </div>

                  {questions.length > 0 && (
                    <div className="space-y-4" data-testid={`supplier-rfp-questions-${event.id}`}>
                      <RfxQuestionForm
                        questions={questions}
                        customSections={event.customSections}
                        answers={qAnswers}
                        disabled={locked}
                        onChange={(questionId, patch) => setQuestionAnswer(event, questionId, patch)}
                      />
                    </div>
                  )}

                  {event.pricing && (
                    <RfpPricingForm
                      request={event.pricing}
                      currency={event.currency}
                      value={pricing}
                      onChange={(next) => setPDraft((prev) => ({ ...prev, [event.id]: next }))}
                      disabled={locked}
                      testIdPrefix={`supplier-rfp-${event.id}`}
                    />
                  )}

                  <ResponseDocumentsSection
                    key={`${event.id}-${isRevising ? 'revising' : 'stored'}-${mine?.versions.length ?? 0}`}
                    requests={event.documentRequests ?? []}
                    value={documents}
                    onChange={locked ? undefined : (next) => setDocDraft((prev) => ({ ...prev, [event.id]: next }))}
                    filesAlready={answerFiles}
                    testId={`supplier-rfp-docs-${event.id}`}
                  />

                  {!event.closed && !tcPending && (blockers.length > 0 || pricingRefusal) && (
                    <ul className="text-sm text-danger list-disc pl-5" data-testid={`supplier-rfp-blockers-${event.id}`}>
                      {blockers.map((b) => (
                        <li key={b}>{t(`rfxa.blocker.${b}`)}</li>
                      ))}
                      {pricingRefusal && (
                        <li data-testid={`supplier-rfp-pricing-refusal-${event.id}`}>
                          {t(`rfxa.refusal.${refusalCode(pricingRefusal)}`, { defaultValue: pricingRefusal })}
                        </li>
                      )}
                    </ul>
                  )}

                  {/* NR-1 BR-08 — while revising, Save and Submit give way to the
                      revise verb's controls: a Submitted response is never saved. */}
                  {!isRevising && (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        disabled={locked}
                        onClick={() => send(event, true)}
                        data-testid={`supplier-rfp-save-${event.id}`}
                      >
                        {t('rfx.save')}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={locked || blocked}
                        onClick={() => send(event, false)}
                        data-testid={`supplier-rfp-submit-${event.id}`}
                      >
                        {t('rfx.rfp.submit')}
                      </Button>
                    </div>
                  )}
                  {submitted && mine && (
                    <ReviseControls
                      windowOpen={windowOpen}
                      held={answerVerb.kind === 'held'}
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
                      testIdPrefix={`supplier-rfp-${event.id}`}
                    />
                  )}
                </div>
              )}

              <SupplierFirmOffers
                event={event}
                rounds={(offerRounds.data?.items ?? []).filter((r) => r.rfpId === event.id)}
                awards={(rfpAwards.data?.items ?? []).filter((a) => a.eventId === event.id)}
                supplierId={supplierId}
                pending={command.isPending}
                send={(vars, successKey) => command.mutate(vars, report(successKey))}
              />
            </section>
          );
        })}
      </div>
    </AppShellV2>
  );
};

export default SupplierRfp;
