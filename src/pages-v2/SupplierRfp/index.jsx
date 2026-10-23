/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { formatDate } from '@lib/format';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { useRfpAwards, useRfpEvents, useRfpOfferRounds } from '@services/query/hooks';
import { useRfxCommand } from '@services/query/commandHooks';
/** @import { RfiAnswer, RfpPricingAnswer, RfpTermAnswer } from '@services/sourcing/types' */
/** @import { RfpEventView } from '@services/sourcing/views' */
import { rfxNow } from '../rfx/rfxDisplay';
import { EMPTY_PRICING_ANSWER } from '../rfx/RfpPricing';
import { authored } from '../rfx/rfxAuthoringDisplay';
import { draftKey } from '../rfx/responseDraft';
import { builtInDuplicates, builtInLabels, copyAnsweredFields } from '../rfx/builtInDuplicates';
/** @import { DocumentDraft } from '../rfx/ResponseDocumentsSection' */
import { useRfpDrafts } from './hooks/useRfpDrafts';
import RfpEventCard from './components/RfpEventCard';

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
  const [tcTicked, setTcTicked] = useState(/** @type {Record<string, boolean>} */ ({}));

  // The eyebrow is the menu section alone (the `PageHeader` rule).
  const crumb = [t('hub.nav.section.sourcing')];
  const items = useMemo(() => events.data?.items ?? [], [events.data]);

  // S-01 — the edits this browser kept from the last visit, read once.
  const storeKey = draftKey('rfp', identity.supplierId ?? '');
  const {
    draft,
    other,
    qDraft,
    pDraft,
    docDraft,
    revising,
    kept,
    setDraft,
    setOther,
    setQDraft,
    setPDraft,
    setDocDraft,
    setRevising,
    hasLocalFor,
    saveFailed,
    resetLocal,
    touch
  } = useRfpDrafts(storeKey, items, t);

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
        {items.map((event) => (
          <RfpEventCard
            key={event.id}
            event={event}
            supplierId={supplierId}
            openId={openId}
            setOpenId={setOpenId}
            answerVerb={answerVerb}
            command={command}
            rfpAwards={rfpAwards}
            offerRounds={offerRounds}
            revising={revising}
            setRevising={setRevising}
            tcTicked={tcTicked}
            setTcTicked={setTcTicked}
            other={other}
            setOther={setOther}
            setPDraft={setPDraft}
            setDocDraft={setDocDraft}
            kept={kept}
            hasLocalFor={hasLocalFor}
            saveFailed={saveFailed}
            touch={touch}
            resetLocal={resetLocal}
            answersFor={answersFor}
            questionAnswersFor={questionAnswersFor}
            pricingFor={pricingFor}
            pricingToSend={pricingToSend}
            duplicatesFor={duplicatesFor}
            documentsFor={documentsFor}
            setAnswer={setAnswer}
            setQuestionAnswer={setQuestionAnswer}
            send={send}
            sendRevision={sendRevision}
            accept={accept}
            report={report}
            t={t}
          />
        ))}
      </div>
    </AppShellV2>
  );
};

export default SupplierRfp;
