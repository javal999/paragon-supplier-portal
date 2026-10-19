/** @import React from 'react' */
import { useMemo, useState } from 'react';
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
  unansweredTerms
} from '@services/transitions/rfxRules';
import { responseDocumentsRefusal } from '@services/transitions/rfxDocumentRules';
/** @import { RfiAnswer, RfpPricingAnswer, RfpTermAnswer } from '@services/sourcing/types' */
/** @import { RfpEventView } from '@services/sourcing/views' */
import { DeadlinePill, rfxNow } from './rfx/rfxDisplay';
import RfxQuestionForm, { questionAnchor } from './rfx/RfxQuestionForm';
import RfxConfidentialityGate from './rfx/RfxConfidentialityGate';
import { TermValueInput } from './rfx/RfpTermControls';
import { EMPTY_PRICING_ANSWER, RfpPricingForm } from './rfx/RfpPricing';
import { refusalCode } from './rfx/RfxQuestionEditor';
import { authored, termLabel, termValueText } from './rfx/rfxAuthoringDisplay';
import {
  draftKey,
  draftSavedNow,
  readDraft,
  restoredIds,
  staleDraftIds,
  useAutosave,
  useLeaveGuard,
  withoutIds
} from './rfx/responseDraft';
import {
  DraftSaveState,
  ResponseProblemsBanner,
  SendBlockedReason,
  StillMissing,
  uniqueProblems
} from './rfx/ResponseFormState';
import { builtInDuplicates, builtInLabels, copyAnsweredFields } from './rfx/builtInDuplicates';
/** @import { DocumentDraft } from './rfx/ResponseDocumentsSection' */
import ResponseDocumentsSection from './rfx/ResponseDocumentsSection';
import { ResponseVersionLine, ReviseControls } from './rfx/ResponseRevise';
import { DaysLeftPill, rfpAwardedTo, supplierRowAction } from './rfx/supplierRowState';
import RfxIntentControls from './rfx/RfxIntentControls';
import { rfxDeclinedRefusal } from '@services/sourcing/rfxIntent';

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
// RFx UX 2026-10. S-01: the local edits are written to this browser as they
// are typed and read back when the page opens ("Draft saved HH:MM on this
// device" by the title). S-02: every missing or unfit answer is marked where it
// sits, a banner lists them all with jump links, and Send says why it is off.
// S-06: the sample is a Yes/No control, and a buyer question that asks what a
// pricing field asks (the sample ready date, the timeline) is answered once —
// the answer is copied into the pricing field when the proposal is sent.
//
// A SUBMITTED proposal is never saved again: before the deadline "Revise
// response" re-opens the form on the latest version and dispatches the REVISE
// verb, which appends a version (NR-1 BR-08); after it the proposal and its
// files are read-only and the action is absent.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const SupplierRfp = () => {
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
  const [openId, setOpenId] = useState(/** @type {string | null} */ (null));
  // S-01 — the edits this browser kept from the last visit, read once.
  const storeKey = draftKey('rfp', identity.supplierId ?? '');
  const [stored] = useState(() => readDraft(storeKey) ?? {});
  const [keptDraft, setDraft] = useState(
    /** @type {Record<string, RfpTermAnswer[]>} */ (stored.draft ?? {})
  );
  const [keptOther, setOther] = useState(
    /** @type {Record<string, string>} */ (stored.other ?? {})
  );
  const [keptQ, setQDraft] = useState(
    /** @type {Record<string, RfiAnswer[]>} */ (stored.qDraft ?? {})
  );
  const [keptP, setPDraft] = useState(
    /** @type {Record<string, RfpPricingAnswer>} */ (stored.pDraft ?? {})
  );
  const [tcTicked, setTcTicked] = useState(/** @type {Record<string, boolean>} */ ({}));
  const [keptDocs, setDocDraft] = useState(
    /** @type {Record<string, readonly DocumentDraft[]>} */ (stored.docDraft ?? {})
  );
  const [revising, setRevising] = useState(
    /** @type {Record<string, boolean>} */ (stored.revising ?? {})
  );
  // When each event's local edits were last written, for the header stamp.
  const [keptSavedAt, setSavedAt] = useState(
    /** @type {Record<string, string>} */ (stored.savedAt ?? {})
  );

  // The eyebrow is the menu section alone (the `PageHeader` rule).
  const crumb = [t('hub.nav.section.sourcing')];
  const items = useMemo(() => events.data?.items ?? [], [events.data]);

  // A proposal that can no longer take an edit — sent (and not being revised)
  // or closed — keeps nothing in this browser, and an edit kept from an
  // earlier visit is not shown on it, so a locked form shows the stored proposal.
  const stale = staleDraftIds(items, revising);
  const [restored] = useState(() => restoredIds(stored));
  const hidden = new Set([...stale].filter((id) => restored.has(id)));
  const draft = withoutIds(keptDraft, hidden);
  const other = withoutIds(keptOther, hidden);
  const qDraft = withoutIds(keptQ, hidden);
  const pDraft = withoutIds(keptP, hidden);
  const docDraft = withoutIds(keptDocs, hidden);
  const kept = {
    draft: withoutIds(keptDraft, stale),
    other: withoutIds(keptOther, stale),
    qDraft: withoutIds(keptQ, stale),
    pDraft: withoutIds(keptP, stale),
    docDraft: withoutIds(keptDocs, stale),
    revising,
    savedAt: withoutIds(keptSavedAt, stale)
  };
  const keptMaps = [kept.draft, kept.other, kept.qDraft, kept.pDraft, kept.docDraft];
  /** @param {string} eventId */
  const hasLocalFor = (eventId) => keptMaps.some((m) => m[eventId] !== undefined);
  const hasLocal = keptMaps.some((m) => Object.keys(m).length > 0);
  const saveFailed = useAutosave(storeKey, kept, hasLocal);
  useLeaveGuard(saveFailed && hasLocal, t('rfx.form.leave'));

  if (events.isPending) return <LoadingState breadcrumb={crumb} />;
  if (events.isError)
    return <ErrorState breadcrumb={crumb} error={events.error} onRetry={() => events.refetch()} />;

  const supplierId = identity.supplierId ?? '';

  /**
   * @param {RfpEventView} event
   * @returns {RfpTermAnswer[]}
   */
  const answersFor = (event) => draft[event.id] ?? [...(event.responses[0]?.answers ?? [])];
  /**
   * @param {RfpEventView} event
   * @returns {RfiAnswer[]}
   */
  const questionAnswersFor = (event) =>
    qDraft[event.id] ?? [...(event.responses[0]?.questionAnswers ?? [])];
  /**
   * @param {RfpEventView} event
   * @returns {RfpPricingAnswer}
   */
  const pricingFor = (event) =>
    pDraft[event.id] ?? event.responses[0]?.pricing ?? EMPTY_PRICING_ANSWER;

  /**
   * @param {RfpEventView} event
   * @returns {readonly DocumentDraft[]}
   */
  const documentsFor = (event) => docDraft[event.id] ?? event.responses[0]?.documents ?? [];

  /**
   * Drop the local edits, so the form reads the stored (latest) version.
   * @param {string} eventId
   */
  const resetLocal = (eventId) => {
    setDraft(({ [eventId]: _a, ...rest }) => rest);
    setOther(({ [eventId]: _o, ...rest }) => rest);
    setQDraft(({ [eventId]: _q, ...rest }) => rest);
    setPDraft(({ [eventId]: _p, ...rest }) => rest);
    setDocDraft(({ [eventId]: _d, ...rest }) => rest);
    setSavedAt(({ [eventId]: _s, ...rest }) => rest);
  };

  /** @param {string} eventId */
  const touch = (eventId) => setSavedAt((prev) => ({ ...prev, [eventId]: draftSavedNow() }));

  /**
   * S-06 — the buyer questions that ask what a pricing field asks.
   * @param {RfpEventView} event
   */
  const duplicatesFor = (event) =>
    event.pricing
      ? builtInDuplicates(
          event.questions ?? [],
          (q) => authored(t, q.promptKey),
          builtInLabels(t, 'rfxa.pricing.sampleDate', 'rfxa.pricing.timeline')
        )
      : {};

  /**
   * The pricing as it is sent: a duplicated field carries the question's
   * answer (S-06), so the buyer's question and the pricing field agree.
   * @param {RfpEventView} event
   * @returns {RfpPricingAnswer}
   */
  const pricingToSend = (event) =>
    copyAnsweredFields(pricingFor(event), duplicatesFor(event), questionAnswersFor(event));

  /**
   * @param {RfpEventView} event
   * @param {string} termId
   * @param {Partial<RfpTermAnswer>} patch
   */
  const setAnswer = (event, termId, patch) => {
    const current = answersFor(event);
    const next = current.some((a) => a.termId === termId)
      ? current.map((a) => (a.termId === termId ? { ...a, ...patch } : a))
      : [
          ...current,
          { termId, proposedValue: '', stance: /** @type {const} */ ('comply'), ...patch }
        ];
    setDraft((prev) => ({ ...prev, [event.id]: next }));
    touch(event.id);
  };

  /**
   * @param {RfpEventView} event
   * @param {string} questionId
   * @param {Partial<RfiAnswer>} patch
   */
  const setQuestionAnswer = (event, questionId, patch) => {
    const current = questionAnswersFor(event);
    const next = current.some((a) => a.questionId === questionId)
      ? current.map((a) => (a.questionId === questionId ? { ...a, ...patch } : a))
      : [...current, { questionId, ...patch }];
    setQDraft((prev) => ({ ...prev, [event.id]: next }));
    touch(event.id);
  };

  /** @param {string} successKey */
  const report = (successKey) => ({
    /** @param {{ status: string; reason?: string }} res */
    onSuccess: (res) =>
      toast(
        res.status === 'failed'
          ? {
              variant: /** @type {const} */ ('error'),
              title: t('rfx.toast.refused', { reason: res.reason ?? '' })
            }
          : { variant: /** @type {const} */ ('success'), title: t(successKey) }
      ),
    onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) })
  });

  /**
   * The proposal in hand, as both the answer and the revise verb carry it.
   * @param {RfpEventView} event
   */
  const contentFor = (event) => ({
    answers: answersFor(event),
    otherTerms: other[event.id] ?? event.responses[0]?.otherTerms ?? '',
    ...((event.questions ?? []).length > 0 ? { questionAnswers: questionAnswersFor(event) } : {}),
    ...(event.pricing ? { pricing: pricingToSend(event) } : {}),
    documents: documentsFor(event)
  });

  /**
   * @param {RfpEventView} event
   * @param {boolean} draftOnly
   */
  const send = (event, draftOnly) =>
    command.mutate(
      {
        verb: 'answerRfp',
        rfpId: event.id,
        supplierId,
        ...contentFor(event),
        ...(draftOnly ? { draftOnly: true } : {})
      },
      report(draftOnly ? 'rfx.toast.saved' : 'rfx.toast.sent')
    );

  // NR-1 BR-08 — the revise verb, never a save: the proposal stays Submitted
  // and the revision is appended as the next version.
  /**
   * @param {RfpEventView} event
   * @param {string} responseId
   */
  const sendRevision = (event, responseId) =>
    command.mutate(
      { verb: 'reviseRfpResponse', responseId, ...contentFor(event) },
      {
        onSuccess: (res) => {
          report('rfx.toast.revised').onSuccess(res);
          if (res.status === 'failed') return;
          setRevising(({ [event.id]: _r, ...rest }) => rest);
          resetLocal(event.id);
        },
        onError: report('rfx.toast.revised').onError
      }
    );

  /**
   * @param {RfpEventView} event
   * @param {{ confidentiality?: boolean; terms?: boolean }} what
   */
  const accept = (event, what) =>
    command.mutate(
      { verb: 'acceptRfp', rfpId: event.id, supplierId, ...what },
      report('rfxa.toast.accepted')
    );

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
        <p
          className="py-10 text-center text-sm text-text-tertiary"
          data-testid="supplier-rfp-empty"
        >
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
          const sent = pricingToSend(event);
          // S-02 — the sample question is judged on its own, so it is named with
          // every other gap rather than hiding the next pricing refusal.
          const sampleMissing =
            !!event.pricing?.samplesRequested && typeof sent.sample?.canSample !== 'boolean';
          const pricingRefusal = event.pricing
            ? rfpPricingAnswerRefusal(
                event.pricing,
                sampleMissing ? { ...sent, sample: { canSample: false } } : sent
              )
            : null;
          const dups = duplicatesFor(event);
          const opened = openId === event.id;
          const tcPending = !!event.termsDocument && !mine?.termsAcceptedAt;
          const submitted = mine?.status === 'Submitted';
          // NR-1 BR-08 — the window the revise verb judges, read by the same rule.
          const windowOpen = responseWindowRefusal(event, supplierId, rfxNow()) === null;
          // BL-132 — this supplier's own intent (the read narrows the roster to it).
          const intent =
            event.invitedSuppliers.find((i) => i.supplierId === supplierId)?.intent ?? null;
          const declined =
            rfxDeclinedRefusal(intent ?? undefined, supplierId, event.eventNumber) !== null;
          // The form opens once the supplier said it will respond (the RFQ rule);
          // a proposal already sent stays readable and revisable, and a closed
          // event stays readable (read-only) unless it was declined.
          const showForm = submitted || intent?.intent === 'respond' || (event.closed && !declined);
          const isRevising =
            submitted && windowOpen && answerVerb.kind === 'held' && !!revising[event.id];
          const documents = documentsFor(event);
          const answerFiles = qAnswers.reduce((n, a) => n + (a.attachments?.length ?? 0), 0);
          const docRefusal = responseDocumentsRefusal(
            event.documentRequests ?? [],
            documents,
            answerFiles
          );
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
            (submitted && !isRevising) ||
            event.closed ||
            answerVerb.kind !== 'held' ||
            tcPending ||
            !showForm;
          const blockers = [
            ...(missing.length > 0 ? ['terms'] : []),
            ...(badValues.length > 0 ? ['termValues'] : []),
            ...(uncommented.length > 0 ? ['comments'] : []),
            ...(qMissing.length > 0 ? ['questions'] : []),
            ...(qInvalid.length > 0 ? ['answers'] : [])
          ];
          const blocked =
            blockers.length > 0 || sampleMissing || pricingRefusal !== null || docRefusal !== null;
          const editable = !locked && !event.closed;
          const pricingPrefix = `supplier-rfp-${event.id}`;
          const pricingText = pricingRefusal
            ? t(`rfxa.refusal.${refusalCode(pricingRefusal)}`, { defaultValue: pricingRefusal })
            : null;
          // S-02 — every field still to fill or fix, at once, in form order.
          const problems = uniqueProblems([
            ...event.terms
              .filter(
                (row) =>
                  missing.includes(row.termId) ||
                  badValues.includes(row.termId) ||
                  uncommented.includes(row.termId)
              )
              .map((row) => ({
                anchor: `supplier-rfp-term-${row.termId}`,
                label: termLabel(t, row)
              })),
            ...questions
              .filter((q) => qMissing.includes(q.id) || qInvalid.includes(q.id))
              .map((q) => ({ anchor: questionAnchor(q.id), label: authored(t, q.promptKey) })),
            ...(sampleMissing
              ? [{ anchor: `${pricingPrefix}-sample`, label: t('rfxa.pricing.canSample') }]
              : []),
            ...(pricingRefusal
              ? [{ anchor: `${pricingPrefix}-pricing`, label: t('rfx.form.anchor.pricing') }]
              : []),
            ...(docRefusal
              ? [{ anchor: `supplier-rfp-docs-${event.id}`, label: t('rfx.form.anchor.documents') }]
              : [])
          ]);
          const deadline =
            event.invitedSuppliers.find((i) => i.supplierId === supplierId)?.deadline ??
            event.responseDeadline;
          const eventAwards = (rfpAwards.data?.items ?? []).filter((a) => a.eventId === event.id);
          // S-10 — the button says what the supplier can do on this row, and an
          // award in force for this supplier shows on the row, not only inside.
          const rowAction = declined
            ? 'view'
            : supplierRowAction({
                submitted,
                windowOpen,
                closed: event.closed,
                held: answerVerb.kind === 'held'
              });
          const awarded = rfpAwardedTo(eventAwards, supplierId);
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
                  {!!hasLocalFor(event.id) && (
                    <DraftSaveState
                      savedAt={kept.savedAt[event.id]}
                      failed={saveFailed}
                      testId={`supplier-rfp-saved-${event.id}`}
                    />
                  )}
                  {event.confidentiality && (
                    <StatusPill variant="neutral">{t('rfxa.conf.pill')}</StatusPill>
                  )}
                  <DeadlinePill deadline={deadline} done={mine?.status === 'Submitted'} />
                  <DaysLeftPill
                    deadline={deadline}
                    nowIso={rfxNow()}
                    done={submitted || event.closed || declined}
                    testId={`supplier-rfp-days-left-${event.id}`}
                  />
                  {awarded ? (
                    <span data-testid={`supplier-rfp-awarded-${event.id}`}>
                      <StatusPill variant="success">{t('rfxa.row.awarded')}</StatusPill>
                    </span>
                  ) : null}
                  <StatusPill
                    variant={
                      mine?.status === 'Submitted' ? 'success' : started ? 'info' : 'neutral'
                    }
                  >
                    {t(
                      `rfx.response.${mine?.status === 'Submitted' ? 'submitted' : declined ? 'declined' : started ? 'draft' : 'notStarted'}`
                    )}
                  </StatusPill>
                  <Button
                    variant="secondary"
                    onClick={() => setOpenId(opened ? null : event.id)}
                    data-testid={`supplier-rfp-open-${event.id}`}
                  >
                    {opened
                      ? t('rfx.close')
                      : rowAction === 'answer'
                        ? t('rfx.rfp.answer')
                        : t(`rfxa.row.${rowAction}`)}
                  </Button>
                </div>
              </header>

              {opened ? (
                <div className="px-4 pt-4">
                  <RfxIntentControls
                    kind="rfp"
                    eventId={event.id}
                    supplierId={supplierId}
                    intent={intent}
                    confidential={!!event.confidentiality}
                    termsAccepted={!event.confidentialityLocked}
                    submitted={submitted}
                    closed={event.closed}
                    testIdPrefix={`supplier-rfp-${event.id}`}
                  />
                </div>
              ) : null}

              {opened && event.confidentialityLocked && !declined && (
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
                    <p
                      className="text-xs text-text-tertiary"
                      data-testid={`supplier-rfp-accepted-${event.id}`}
                    >
                      {t('rfxa.conf.acceptedOn')}{' '}
                      <Data>{formatDate(mine.confidentialityAcceptedAt)}</Data>
                    </p>
                  )}
                  {submitted && (
                    <ResponseVersionLine
                      versions={mine.versions}
                      testId={`supplier-rfp-version-${event.id}`}
                    />
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

                  {!showForm && (
                    <p
                      className="text-sm text-text-secondary bg-bg-hover rounded px-3 py-2"
                      data-testid={`supplier-rfp-intent-first-${event.id}`}
                    >
                      {t(declined ? 'rfx.intent.declinedNote' : 'rfx.intent.respondFirst')}
                    </p>
                  )}

                  {!!event.termsDocument && !!showForm && (
                    <div
                      className="border border-border-subtle rounded-md px-3 py-3 space-y-2"
                      data-testid={`supplier-rfp-tc-${event.id}`}
                    >
                      <h4 className="text-sm font-semibold text-text-primary">
                        {t('rfxa.tc.title')}
                      </h4>
                      {event.termsDocument.text && (
                        <p className="text-sm text-text-secondary whitespace-pre-line">
                          {event.termsDocument.text}
                        </p>
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
                              onChange={(e) =>
                                setTcTicked((prev) => ({ ...prev, [event.id]: e.target.checked }))
                              }
                            />
                            {t('rfxa.tc.tick')}
                          </label>
                          <Button
                            variant="outline"
                            disabled={
                              !tcTicked[event.id] ||
                              answerVerb.kind !== 'held' ||
                              event.closed ||
                              command.isPending
                            }
                            onClick={() => accept(event, { terms: true })}
                            data-testid={`supplier-rfp-tc-accept-${event.id}`}
                          >
                            {t('rfxa.tc.accept')}
                          </Button>
                        </div>
                      ) : (
                        <p
                          className="text-xs text-text-tertiary"
                          data-testid={`supplier-rfp-tc-accepted-${event.id}`}
                        >
                          {t('rfxa.tc.acceptedOn')}{' '}
                          <Data>
                            {formatDate(
                              /** @type {NonNullable<(NonNullable<typeof mine>)['termsAcceptedAt']>} */ (
                                /** @type {import('@services/sourcing/views').RfpResponseView} */ (
                                  mine
                                ).termsAcceptedAt
                              )
                            )}
                          </Data>
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

                  {!!editable && !tcPending && (
                    <ResponseProblemsBanner
                      problems={problems}
                      testId={`supplier-rfp-problems-${event.id}`}
                    />
                  )}

                  <div className="overflow-x-auto" hidden={!showForm}>
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
                              const termMissing = editable && missing.includes(row.termId);
                              const label = termLabel(t, row);
                              return (
                                <TableRow
                                  key={row.termId}
                                  id={`supplier-rfp-term-${row.termId}`}
                                  data-testid={`supplier-rfp-term-${row.termId}`}
                                >
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
                                      onChange={(v) =>
                                        setAnswer(event, row.termId, { proposedValue: v })
                                      }
                                      ariaLabel={label}
                                      disabled={locked}
                                      invalid={badValues.includes(row.termId) || termMissing}
                                    />
                                    {!!termMissing && (
                                      <StillMissing
                                        testId={`supplier-rfp-term-missing-${row.termId}`}
                                      />
                                    )}
                                    {badValues.includes(row.termId) && (
                                      <div
                                        className="text-xs text-danger mt-1"
                                        data-testid={`supplier-rfp-value-invalid-${row.termId}`}
                                      >
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
                                          stance: /** @type {RfpTermAnswer['stance']} */ (
                                            e.target.value
                                          )
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
                                      onChange={(e) =>
                                        setAnswer(event, row.termId, { comment: e.target.value })
                                      }
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
                            })
                        )}
                      </tbody>
                    </Table>
                  </div>

                  <div hidden={!showForm}>
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
                      onChange={(e) => {
                        setOther((prev) => ({ ...prev, [event.id]: e.target.value }));
                        touch(event.id);
                      }}
                      className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover"
                    />
                  </div>

                  {questions.length > 0 && !!showForm && (
                    <div className="space-y-4" data-testid={`supplier-rfp-questions-${event.id}`}>
                      <RfxQuestionForm
                        questions={questions}
                        customSections={event.customSections}
                        answers={qAnswers}
                        disabled={locked}
                        missing={editable ? qMissing : []}
                        onChange={(questionId, patch) =>
                          setQuestionAnswer(event, questionId, patch)
                        }
                      />
                    </div>
                  )}

                  {!!event.pricing && !!showForm && (
                    <RfpPricingForm
                      request={event.pricing}
                      currency={event.currency}
                      value={pricing}
                      onChange={(next) => {
                        setPDraft((prev) => ({ ...prev, [event.id]: next }));
                        touch(event.id);
                      }}
                      disabled={locked}
                      testIdPrefix={pricingPrefix}
                      sampleMissing={editable && sampleMissing}
                      pricingError={editable ? pricingText : null}
                      answeredIn={{
                        ...(dups.sampleReadyDate
                          ? { sampleReadyDate: authored(t, dups.sampleReadyDate.promptKey) }
                          : {}),
                        ...(dups.timeline ? { timeline: authored(t, dups.timeline.promptKey) } : {})
                      }}
                    />
                  )}

                  <div id={`supplier-rfp-docs-${event.id}`} hidden={!showForm}>
                    <ResponseDocumentsSection
                      key={`${event.id}-${isRevising ? 'revising' : 'stored'}-${mine?.versions.length ?? 0}`}
                      requests={event.documentRequests ?? []}
                      value={documents}
                      onChange={
                        locked
                          ? undefined
                          : (next) => {
                              setDocDraft((prev) => ({ ...prev, [event.id]: next }));
                              touch(event.id);
                            }
                      }
                      filesAlready={answerFiles}
                      testId={`supplier-rfp-docs-${event.id}`}
                    />
                  </div>

                  {/* NR-1 BR-08 — while revising, Save and Submit give way to the
                      revise verb's controls: a Submitted response is never saved. */}
                  {!isRevising && !!showForm && (
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
                      {!!editable && !tcPending && (
                        <SendBlockedReason
                          count={problems.length}
                          testId={`supplier-rfp-send-reason-${event.id}`}
                        />
                      )}
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
                  {!!isRevising && (
                    <SendBlockedReason
                      count={problems.length}
                      testId={`supplier-rfp-send-reason-${event.id}`}
                    />
                  )}
                </div>
              )}

              <SupplierFirmOffers
                event={event}
                rounds={(offerRounds.data?.items ?? []).filter((r) => r.rfpId === event.id)}
                awards={eventAwards}
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
