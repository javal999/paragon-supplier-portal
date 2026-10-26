/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RfiAnswer, RfpPricingAnswer, RfpTermAnswer } from '@services/sourcing/types' */
/** @import { RfpEventView } from '@services/sourcing/views' */
/** @import { DocumentDraft } from '../../rfx/ResponseDocumentsSection' */
/** @import { useRfxCommand } from '@services/query/commandHooks' */
/** @import { useRfpAwards, useRfpOfferRounds } from '@services/query/hooks' */
import Data from '@components/ui-v2/Data';
import SessionAttachments from '@components/ui-v2/SessionAttachments';
import { formatDate } from '@lib/format';
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
import { rfxDeclinedRefusal } from '@services/sourcing/rfxIntent';
import { SupplierFirmOffers } from '../../rfx/SupplierFirmOffers';
import { rfxNow } from '../../rfx/rfxDisplay';
import RfxQuestionForm, { questionAnchor } from '../../rfx/RfxQuestionForm';
import RfxConfidentialityGate from '../../rfx/RfxConfidentialityGate';
import { RfpPricingForm } from '../../rfx/RfpPricing';
import { refusalCode } from '../../rfx/RfxQuestionEditor';
import { authored, termLabel } from '../../rfx/rfxAuthoringDisplay';
import { ResponseProblemsBanner, uniqueProblems } from '../../rfx/ResponseFormState';
import ResponseDocumentsSection from '../../rfx/ResponseDocumentsSection';
import { ResponseVersionLine } from '../../rfx/ResponseRevise';
import { rfpAwardedTo, supplierRowAction } from '../../rfx/supplierRowState';
import RfxIntentControls from '../../rfx/RfxIntentControls';
import RfpEventHeader from './RfpEventHeader';
import RfpTermsAcceptance from './RfpTermsAcceptance';
import RfpTermsTable from './RfpTermsTable';
import RfpSendControls from './RfpSendControls';

/**
 * @typedef {object} RfpEventCardProps
 * @property {RfpEventView} event
 * @property {string} supplierId  The seat's supplier.
 * @property {string | null} openId  The expanded event, if any.
 * @property {(id: string | null) => void} setOpenId
 * @property {VerbAvailability} answerVerb  This seat's authority over the answer verb.
 * @property {ReturnType<typeof useRfxCommand>} command  The RFx command.
 * @property {ReturnType<typeof useRfpAwards>} rfpAwards  This supplier's award outcomes.
 * @property {ReturnType<typeof useRfpOfferRounds>} offerRounds  The firm-offer rounds this supplier was asked to.
 * @property {Record<string, boolean>} revising  The sent proposals being revised.
 * @property {React.Dispatch<React.SetStateAction<Record<string, boolean>>>} setRevising
 * @property {Record<string, boolean>} tcTicked  The T&C acceptance tick, per event.
 * @property {React.Dispatch<React.SetStateAction<Record<string, boolean>>>} setTcTicked
 * @property {Record<string, string>} other  The local "Other terms" edits.
 * @property {React.Dispatch<React.SetStateAction<Record<string, string>>>} setOther
 * @property {React.Dispatch<React.SetStateAction<Record<string, RfpPricingAnswer>>>} setPDraft
 * @property {React.Dispatch<React.SetStateAction<Record<string, readonly DocumentDraft[]>>>} setDocDraft
 * @property {{ savedAt: Record<string, string> }} kept  What this browser keeps (read for the save stamp).
 * @property {(eventId: string) => boolean} hasLocalFor
 * @property {boolean} saveFailed  The last browser write was refused.
 * @property {(eventId: string) => void} touch  Stamps the event's save time.
 * @property {(eventId: string) => void} resetLocal  Drops the event's local edits.
 * @property {(event: RfpEventView) => RfpTermAnswer[]} answersFor
 * @property {(event: RfpEventView) => RfiAnswer[]} questionAnswersFor
 * @property {(event: RfpEventView) => RfpPricingAnswer} pricingFor
 * @property {(event: RfpEventView) => RfpPricingAnswer} pricingToSend  The pricing as it is sent (S-06).
 * @property {(event: RfpEventView) => ReturnType<typeof import('../../rfx/builtInDuplicates').builtInDuplicates>} duplicatesFor
 * @property {(event: RfpEventView) => readonly DocumentDraft[]} documentsFor
 * @property {(event: RfpEventView, termId: string, patch: Partial<RfpTermAnswer>) => void} setAnswer
 * @property {(event: RfpEventView, questionId: string, patch: Partial<RfiAnswer>) => void} setQuestionAnswer
 * @property {(event: RfpEventView, draftOnly: boolean) => void} send
 * @property {(event: RfpEventView, responseId: string) => void} sendRevision
 * @property {(event: RfpEventView, what: { confidentiality?: boolean; terms?: boolean }) => void} accept
 * @property {(successKey: string) => NonNullable<Parameters<ReturnType<typeof useRfxCommand>['mutate']>[1]>} report  The toast that reports a dispatch.
 * @property {TFunction} t
 */

/**
 * One RFP invitation: works out from the event and the local edits what the
 * supplier may do (locked, blocked, every gap in form order), then renders the
 * row header, the intent controls, the confidentiality gate, and — once the
 * gate is passed — the scope, T&C, terms table, other terms, questions,
 * indicative pricing, documents and the send or revise controls, and the
 * firm-offer rounds. Moved out of `SupplierRfp.jsx` by the Phase 5 page split
 * (no behaviour change).
 * @type {React.FC<RfpEventCardProps>}
 */
const RfpEventCard = ({
  event,
  supplierId,
  openId,
  setOpenId,
  answerVerb,
  command,
  rfpAwards,
  offerRounds,
  revising,
  setRevising,
  tcTicked,
  setTcTicked,
  other,
  setOther,
  setPDraft,
  setDocDraft,
  kept,
  hasLocalFor,
  saveFailed,
  touch,
  resetLocal,
  answersFor,
  questionAnswersFor,
  pricingFor,
  pricingToSend,
  duplicatesFor,
  documentsFor,
  setAnswer,
  setQuestionAnswer,
  send,
  sendRevision,
  accept,
  report,
  t
}) => {
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
  const intent = event.invitedSuppliers.find((i) => i.supplierId === supplierId)?.intent ?? null;
  const declined = rfxDeclinedRefusal(intent ?? undefined, supplierId, event.eventNumber) !== null;
  // The form opens once the supplier said it will respond (the RFQ rule);
  // a proposal already sent stays readable and revisable, and a closed
  // event stays readable (read-only) unless it was declined.
  const showForm = submitted || intent?.intent === 'respond' || (event.closed && !declined);
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
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
      data-testid={`supplier-rfp-${event.id}`}
    >
      <RfpEventHeader
        event={event}
        mine={mine}
        hasLocalFor={hasLocalFor}
        savedAt={kept.savedAt}
        saveFailed={saveFailed}
        deadline={deadline}
        submitted={submitted}
        declined={declined}
        started={started}
        awarded={awarded}
        opened={opened}
        rowAction={rowAction}
        setOpenId={setOpenId}
        t={t}
      />

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
              {t('rfxa.conf.acceptedOn')} <Data>{formatDate(mine.confidentialityAcceptedAt)}</Data>
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
            <RfpTermsAcceptance
              event={event}
              termsDocument={event.termsDocument}
              mine={mine}
              tcPending={tcPending}
              tcTicked={tcTicked}
              setTcTicked={setTcTicked}
              answerVerb={answerVerb}
              command={command}
              accept={accept}
              t={t}
            />
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

          <RfpTermsTable
            event={event}
            showForm={showForm}
            answers={answers}
            missing={missing}
            badValues={badValues}
            uncommented={uncommented}
            editable={editable}
            locked={locked}
            setAnswer={setAnswer}
            t={t}
          />

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
                onChange={(questionId, patch) => setQuestionAnswer(event, questionId, patch)}
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

          <RfpSendControls
            event={event}
            mine={mine}
            showForm={showForm}
            submitted={submitted}
            isRevising={isRevising}
            windowOpen={windowOpen}
            locked={locked}
            blocked={blocked}
            editable={editable}
            tcPending={tcPending}
            problems={problems}
            answerVerb={answerVerb}
            command={command}
            send={send}
            sendRevision={sendRevision}
            resetLocal={resetLocal}
            setRevising={setRevising}
            t={t}
          />
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
};

export default RfpEventCard;
