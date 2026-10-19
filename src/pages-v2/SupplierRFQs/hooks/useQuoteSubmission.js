import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useQuotationSubmit } from '@services/query/commandHooks';
import { daysUntil } from '@services/data/dayProjection';
import { documentsOf, responseDocumentsRefusal } from '@services/transitions/rfxDocumentRules';
import { BASE_CURRENCY, BID_CURRENCIES } from '@lib/currencyPolicy';
import { formatMoney, formatNumber } from '@lib/format';
import {
  draftFromQuote,
  emptyTieredDraft,
  newExtraCost,
  readTieredDraft,
  tieredDraftProblems
} from '../../rfqs/tieredQuoteModel';
/** @import { GridProblem, TieredDraft } from '../../rfqs/tieredQuoteModel' */
import { specLabel } from '../../rfqs/TieredQuoteForm';
import { builtInDuplicates } from '../../rfx/builtInDuplicates';
import {
  clearDraft,
  draftKey,
  draftSavedNow,
  readDraft,
  useAutosave,
  useLeaveGuard
} from '../../rfx/responseDraft';
/** @import { ResponseProblem } from '../../rfx/ResponseFormState' */
import { rfqResponseRefusal } from '../../rfqs/rfqResponseText';
import { buildQuotationSubmitPayload, isCurrencyRefusal } from '../../rfqs/quotationSubmitModel';
import { readBidPrice } from '../../rfqs/quotationPrice';
import { readLeadTimeDays } from '../../rfqs/quotationLeadTime';
import { readMoq } from '../../rfqs/quotationMoq';
import {
  LEAD_TIME_REFUSAL_KEY,
  MOQ_REFUSAL_KEY,
  PRICE_REFUSAL_KEY,
  emptyQuoteForm
} from '../const';
/** @import { QuoteForm } from '../const' */
import { toOpenRfq } from '../utils';
/** @import { OpenRFQ, SubmittedQuote } from '../utils' */
/** @import { RFQ } from '@services/data/types' */

/**
 * @typedef {object} QuoteSubmissionArgs
 * @property {string} supplierId -  The seat's supplier: the tiered read and the payload name it.
 * @property {Map<string, RFQ>} rfqById -  Every RFQ this supplier can see, for a revision's RFQ.
 * @property {string} nowIso -  The hub's reference clock (`rfxNow()`), for deadlines.
 * @property {() => void} onSubmitted -  Called after a submit the verb accepted (the page shows "My quotes").
 */

/**
 * The quote panel's state and handlers, lifted out of `RfqWorkspace`: which RFQ
 * the panel is open on (derived to `null` for a seat without
 * `quotation:submit`), the legacy form and the tiered draft, the revision being
 * superseded, the ONE read of each typed field (price, lead time, minimum order
 * quantity), and the submit that dispatches `t_quotation_submit`. Opening the
 * panel from a card (`handleSubmitQuote`) or from a quote version
 * (`handleRevise`) seeds the form; a submit the verb accepts closes the panel
 * and calls `onSubmitted`.
 *
 * RFx UX 2026-10. S-01: what the supplier types is kept in this browser per
 * RFQ (and per version revised) and read back when the panel opens on it
 * again; a submit the verb accepts drops it. S-02: `problems` lists every gap
 * at once (the grid's from `tieredDraftProblems`, the single-price form's from
 * the same reads its gates use), and Submit is off while any stands. S-06: a
 * buyer question asking the sample ready date is answered once — its answer
 * is copied into the sample offer.
 * @param {QuoteSubmissionArgs} args
 */
export const useQuoteSubmission = ({ supplierId, rfqById, nowIso, onSubmitted }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const submitMutation = useQuotationSubmit();
  const quoteAvailability = useVerbAvailability('quotation:submit');
  const [quotePanelRFQ, setQuotePanelRFQ] = useState(/** @type {OpenRFQ | null} */ (null));
  // ⚠️ **THE PANEL IS DERIVED, NOT READ — `SupplierOrders.effectivePanelMode`'s
  // CONSTRUCTION, NOT A SECOND ONE.** `quotation:submit` is COMMERCIAL's, and
  // the entrance is correctly guarded: `RFQCard` renders the handoff notice in
  // the button's own slot for a seat that does not hold it. But the OPEN panel
  // is component state in THIS component, and component state outlives the
  // seat — a seat narrowed WHILE the panel stands open kept a live `submitQuote`
  // behind a door that was already shut. Reachable, not a dead branch, and
  // `SupplierShipments` states the same reason for gating its wizard TAB rather
  // than the button that opens it.
  //
  // Collapsing to `null` answers every entrance in ONE statement and keeps §76
  // intact: the seat lands back on the card, where the notice for this verb
  // ALREADY IS, rather than meeting a second one inside the panel. `open=`, the
  // title, the body and `submitQuote`'s own early return all read the derived
  // value, so there is no door left that reads the raw one. The raw state is
  // left alone rather than cleared: a seat that is widened again finds its
  // panel where it left it, which is `effectivePanelMode`'s behaviour too.
  const effectiveQuotePanelRFQ = quoteAvailability.kind === 'held' ? quotePanelRFQ : null;
  const [form, setForm] = useState(/** @type {QuoteForm} */ (emptyQuoteForm));
  // RFx spec 2026-09-21 — the tiered grid's own state, and the version a
  // revision supersedes (absent on a first quote).
  const [tieredDraft, setTieredDraft] = useState(/** @type {TieredDraft | null} */ (null));
  const [supersedes, setSupersedes] = useState(/** @type {string | null} */ (null));
  const [gridRefusal, setGridRefusal] = useState(/** @type {string | null} */ (null));
  const panelTiered = (effectiveQuotePanelRFQ?.rfq.items ?? []).length > 0;
  // S-01 — has the supplier typed in this panel, and when was it last kept.
  const [edited, setEdited] = useState(false);
  const [savedAt, setSavedAt] = useState(/** @type {string | undefined} */ (undefined));

  /**
   * The key one RFQ's draft (and the version it revises) is kept under.
   * @param {string} rfqId
   * @param {string | null} revises
   */
  const keyFor = (rfqId, revises) =>
    draftKey('rfq', supplierId, revises ? `${rfqId}.${revises}` : rfqId);
  const storeKey = effectiveQuotePanelRFQ ? keyFor(effectiveQuotePanelRFQ.id, supersedes) : null;
  const saveFailed = useAutosave(storeKey, { form, tieredDraft, savedAt }, edited);
  useLeaveGuard(storeKey !== null && edited && saveFailed, t('rfx.form.leave'));

  /**
   * Open the panel on what this browser kept for it, if anything.
   * @param {string} key
   * @returns {boolean}
   */
  const restore = (key) => {
    const kept = readDraft(key);
    if (!kept?.form) {
      setEdited(false);
      setSavedAt(undefined);
      return false;
    }
    setForm({ ...emptyQuoteForm, ...kept.form });
    /** @type {TieredDraft | null} */
    const grid = kept.tieredDraft ?? null;
    // Row ids are minted per session; a kept row gets a fresh one so it cannot
    // collide with a row added after the reload.
    setTieredDraft(
      grid && {
        ...grid,
        items: grid.items.map((d) => ({
          ...d,
          extraCosts: d.extraCosts.map((c) => newExtraCost(c.name, c.amount))
        }))
      }
    );
    setEdited(true);
    setSavedAt(kept.savedAt);
    return true;
  };

  // S-06 — the buyer question that asks the sample ready date, if any.
  const sampleDateQuestion = effectiveQuotePanelRFQ
    ? builtInDuplicates(
        effectiveQuotePanelRFQ.rfq.questions ?? [],
        (q) => t(q.promptKey, { defaultValue: q.promptKey }),
        {
          sampleReadyDate: ['en', 'id'].map((lng) => t('rfqResponse.sample.readyDate', { lng })),
          timeline: []
        }
      ).sampleReadyDate
    : undefined;

  /**
   * S-06 — the sample offer carries the question's date while the supplier
   * says Yes; with No it carries none (the rule refuses a date without one).
   * @param {TieredDraft} next
   * @returns {TieredDraft}
   */
  const withSampleDate = (next) => {
    if (!sampleDateQuestion) return next;
    const v = next.answers[sampleDateQuestion.id]?.value;
    return {
      ...next,
      sampleReadyDate: next.canSample === true && typeof v === 'string' ? v : ''
    };
  };

  /** @param {QuoteForm} next */
  const editForm = (next) => {
    setForm(next);
    setEdited(true);
    setSavedAt(draftSavedNow());
  };
  /** @param {TieredDraft} next */
  const editTiered = (next) => {
    setTieredDraft(withSampleDate(next));
    setEdited(true);
    setSavedAt(draftSavedNow());
  };

  /** @param {OpenRFQ} rfq */
  const handleSubmitQuote = (rfq) => {
    setQuotePanelRFQ(rfq);
    setSupersedes(null);
    setGridRefusal(null);
    if (restore(keyFor(rfq.id, null))) return;
    setForm({ ...emptyQuoteForm, paymentTermsOffered: rfq.rfq.paymentTerms });
    setTieredDraft((rfq.rfq.items ?? []).length > 0 ? emptyTieredDraft(rfq.rfq) : null);
  };

  // RFx spec — revising before the deadline: the panel opens on the supplier's
  // own last version, and the new one names it (`supersedesQuotationId`).
  /**
   * @param {SubmittedQuote} q
   * @returns {boolean}
   */
  const canRevise = (q) => {
    const rfq = rfqById.get(q.quote.rfqId);
    return (
      q.current &&
      (q.status === 'Submitted' || q.status === 'Under Review') &&
      rfq?.status === 'Open' &&
      (daysUntil(rfq.responseDeadline, nowIso) ?? -1) >= 0
    );
  };
  /** @param {SubmittedQuote} q */
  const handleRevise = (q) => {
    const rfq = rfqById.get(q.quote.rfqId);
    if (!rfq) return;
    setQuotePanelRFQ(toOpenRfq(rfq, nowIso, t));
    setSupersedes(q.quote.id);
    setGridRefusal(null);
    if (restore(keyFor(rfq.id, q.quote.id))) return;
    setForm({
      ...emptyQuoteForm,
      unitPrice: String(q.quote.unitPrice),
      currency: q.quote.currency ?? BASE_CURRENCY,
      leadTimeNum: String(q.quote.leadTimeDays),
      validUntil: q.quote.validUntil,
      moq: q.quote.moq === undefined ? '' : String(q.quote.moq),
      notes: q.quote.notes ?? '',
      paymentTermsOffered: q.quote.paymentTermsOffered,
      canSample: q.quote.sampleOffer ? q.quote.sampleOffer.canSample : null,
      sampleReadyDate: q.quote.sampleOffer?.readyDate ?? '',
      // A quote from before NR-1 carries `attachments`: read as documents.
      documents: documentsOf(q.quote)
    });
    setTieredDraft((rfq.items ?? []).length > 0 ? draftFromQuote(rfq, q.quote) : null);
  };

  // ── CP-0 · W1 · 2e-a — the ONE read of the bid price ──────────────────────
  // The total preview, the submit gate, and the dispatched payload ALL read this
  // one result. Before, each re-read `form.unitPrice` with its own recipe, so the
  // number the supplier was shown, the number the gate approved, and the number
  // the award engine ranked could be three different numbers.
  const bidPrice = readBidPrice(form.unitPrice);

  // CP-0 · W1 · 2e-b-1 — the ONE read of the lead time. Four states, and the
  // hard gate: a stated 0 is legal and BEST on the axis, so it may not reach the
  // payload until the supplier affirms they meant same-day. Blank owes nothing.
  const leadTime = readLeadTimeDays(form.leadTimeNum, form.leadTimeUnit);
  const sameDayAckOwed = leadTime.ok && leadTime.requiresSameDayAck && !form.sameDayAck;

  // CP-0 · W1 · 2e-b-2 — the ONE read of the minimum order quantity. Blank is
  // LEGAL and resolves to an absence; only a stated-but-unreadable minimum
  // blocks, because a constraint nobody can read is worse than the default it
  // would otherwise fall back to.
  const moq = readMoq(form.moq);

  const submitBlocked = !leadTime.ok || sameDayAckOwed || !moq.ok;

  // ── S-02 — every gap at once, named in the reader's language ─────────────
  /** @type {readonly GridProblem[]} */
  const gridProblems =
    effectiveQuotePanelRFQ && panelTiered && tieredDraft
      ? tieredDraftProblems(effectiveQuotePanelRFQ.rfq, tieredDraft, sampleDateQuestion?.id)
      : [];
  /**
   * @param {GridProblem['field']} f
   * @returns {string}
   */
  const gridLabel = (f) => {
    /** @param {string} field */
    const onItem = (field) => t('rfx.form.rfq.item', { n: 'n' in f ? f.n : '', field });
    switch (f.kind) {
      case 'price':
        return t('rfx.form.rfq.price', { n: f.n, qty: formatNumber(f.qty) });
      case 'altPrice':
        return t('rfx.form.rfq.altPrice', { n: f.n, qty: formatNumber(f.qty) });
      case 'altDescription':
        return t('rfx.form.rfq.altDescription', { n: f.n });
      case 'spec':
        return onItem(specLabel(t, f.spec));
      case 'moq':
        return onItem(t('rfx.form.rfq.moq'));
      case 'lead':
        return onItem(t('rfx.form.rfq.lead'));
      case 'cost':
        return onItem(t(`rfqAuthoring.cost.${f.costId}`));
      case 'extraCost':
        return onItem(t('rfx.form.rfq.extraCost', { n: f.index + 1 }));
      case 'question': {
        const q = effectiveQuotePanelRFQ?.rfq.questions?.find((x) => x.id === f.questionId);
        return q ? t(q.promptKey, { defaultValue: q.promptKey }) : f.questionId;
      }
      case 'validUntil':
        return t('rfqs.field.validUntil');
      case 'sample':
        return t('rfqs.panel.canSample');
      case 'sampleDate':
        return t('rfqResponse.sample.readyDate');
      default:
        return t('rfx.form.anchor.documents');
    }
  };
  /** @type {ResponseProblem[]} */
  const problems = !effectiveQuotePanelRFQ
    ? []
    : panelTiered
      ? gridProblems.map((p) => ({ anchor: p.anchor, label: gridLabel(p.field) }))
      : [
          ...(!bidPrice.ok
            ? [{ anchor: 'quote-unit-price', label: t('rfqs.field.unitPrice') }]
            : []),
          ...(!leadTime.ok ? [{ anchor: 'quote-lead-time', label: t('rfqs.field.leadTime') }] : []),
          ...(sameDayAckOwed
            ? [{ anchor: 'quote-leadtime-sameday', label: t('rfx.form.rfq.sameDay') }]
            : []),
          ...(!form.validUntil.trim()
            ? [{ anchor: 'quote-valid-until', label: t('rfqs.field.validUntil') }]
            : []),
          ...(!moq.ok ? [{ anchor: 'quote-moq', label: t('rfqs.field.moq') }] : []),
          ...(responseDocumentsRefusal(
            effectiveQuotePanelRFQ.rfq.documentRequests ?? [],
            form.documents,
            0
          )
            ? [{ anchor: 'quote-documents', label: t('rfx.form.anchor.documents') }]
            : [])
        ];

  // A price nobody can read has no total. The preview is only ASKABLE of a price
  // that exists — it never renders a product of a guessed value. The RFQ quantity
  // is the NUMBER it already is; it used to be re-parsed out of the formatted
  // display string ("200,000 PCS" → strip → 200000), a fact round-tripping
  // through its own presentation.
  //
  // 2e-b-3 (COS-01) — the DISPLAY half of the :686 residue. The parse half
  // closed at 2e-a; this `.toLocaleString()` is the retired expression's last
  // surviving fragment, and its grouping followed the RUNTIME locale rather than
  // the app's. `formatNumber` pins id-ID, as every other quantity on the page does.
  //
  // COS-01 (label half), CLOSED (2e-c-2). 2e-b-3 fixed the GROUPING half and
  // deliberately stopped short of `formatIDR`, because the value was labelled
  // with `form.currency` — a label the payload then discarded, so hardcoding
  // "Rp" would have made the platform contradict itself. The register entry said
  // it plainly: "the label cannot be made honest until the field it names
  // survives the submit." It survives now, so the preview renders through the
  // same currency-aware formatter as the stored quote and the buyer's
  // comparison — one rendering of a bid, from preview to award.
  const totalPrice =
    effectiveQuotePanelRFQ && bidPrice.ok
      ? formatMoney(bidPrice.value * effectiveQuotePanelRFQ.totalQty, form.currency)
      : '—';

  // REAL submit — dispatches t_quotation_submit through the command spine (the
  // ONE supplier-owned creation verb). Persists RAW FACTS only; the engine scores
  // at read (#78). On a non-failed outcome the hook invalidates → the supplier's
  // quotations re-read, the quote lands in My-Quotes, and its RFQ leaves the open
  // list. Replaces the retired local-state masquerade.
  /**
   * Dispatch a built payload and say what the verb decided.
   * @param {Record<string, unknown>} payload
   * @param {string} rfqNumber
   * @param {string} deadline
   */
  const dispatchQuote = async (payload, rfqNumber, deadline) => {
    try {
      const res = await submitMutation.mutateAsync({ payload });
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('rfqs.toast.submitFailed.title'),
          description: isCurrencyRefusal(res.reason)
            ? t('rfqs.toast.currencyRefused.body', {
                currency: String(payload.currency),
                permitted: BID_CURRENCIES.join(', ')
              })
            : (refusalText(res.reason) ??
              rfqResponseRefusal(t, res.reason ?? '') ??
              t('rfqs.toast.submitFailed.body'))
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('rfqs.toast.submitted.title', { rfq: rfqNumber }),
        description: t('rfqs.toast.submitted.body', { date: deadline })
      });
      // S-01 — sent: the kept draft has done its job.
      if (storeKey) clearDraft(storeKey);
      setEdited(false);
      setSavedAt(undefined);
      setQuotePanelRFQ(null);
      setForm(emptyQuoteForm);
      setTieredDraft(null);
      setSupersedes(null);
      onSubmitted();
    } catch {
      toast({
        variant: 'error',
        title: t('rfqs.toast.submitFailed.title'),
        description: t('rfqs.toast.submitFailed.body')
      });
    }
  };

  // RFx spec 2026-09-21 — THE TIERED SUBMIT. One read of the grid
  // (`readTieredDraft`), judged by the verb's own rule; a refusal is said on the
  // panel, naming the item, and nothing is sent.
  const submitTiered = async () => {
    if (!effectiveQuotePanelRFQ || !tieredDraft) return;
    const read = readTieredDraft(effectiveQuotePanelRFQ.rfq, supplierId, tieredDraft, (id) =>
      t(`rfqAuthoring.cost.${id}`)
    );
    if (!read.ok) {
      setGridRefusal(read.reason);
      return;
    }
    setGridRefusal(null);
    await dispatchQuote(
      { ...read.payload, ...(supersedes ? { supersedesQuotationId: supersedes } : {}) },
      effectiveQuotePanelRFQ.rfqNumber,
      effectiveQuotePanelRFQ.deadline
    );
  };

  const submitQuote = async () => {
    if (!effectiveQuotePanelRFQ) return;
    if (panelTiered) return submitTiered();
    // The price gate fires FIRST and alone, and it BLOCKS: a price that cannot be
    // read — or a zero, which reads fine but is not a bid — must never become a
    // submitted quotation, because a submitted quotation is immediately a
    // scoreable fact that re-anchors every rival's price score. The refusal is
    // named rather than folded into the generic "required fields missing" list:
    // "we cannot tell which number you mean" and "zero is not a price" ask the
    // supplier for different things, and neither is "you left this blank".
    if (!bidPrice.ok) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.priceRefused.title'),
        description: t(PRICE_REFUSAL_KEY[bidPrice.reason])
      });
      return;
    }
    // The lead-time gate. It used to be a `parseFloat(...) > 0` presence check
    // that only ever said "you left this blank" — so an unreadable lead time
    // fell through to `Number(...) || 0` and became a 0-day promise, the best
    // score on the axis. Blank is deliberately NOT gated here: it is legal.
    if (!leadTime.ok) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.leadTimeRefused.title'),
        description: t(LEAD_TIME_REFUSAL_KEY[leadTime.reason])
      });
      return;
    }
    // The hard gate on a stated 0. The submit control is disabled while the ack
    // is owed; this is the second lock, so a programmatic or race-y submit
    // cannot slip a same-day commitment through unaffirmed.
    if (sameDayAckOwed) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.sameDayAck.title'),
        description: t('rfqs.toast.sameDayAck.body')
      });
      return;
    }
    // The minimum-order-quantity gate (2e-b-2). It fires ONLY on a stated value
    // that cannot be read — a blank falls through, because blank is the field's
    // answer, not its absence. Refusing rather than dropping is the whole point:
    // the retired path discarded every value here, readable or not.
    if (!moq.ok) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.moqRefused.title'),
        description: t(MOQ_REFUSAL_KEY[moq.reason])
      });
      return;
    }
    // NR-1 BR-03 to BR-05 — the rule `quotation_documents_complete` binds,
    // said before anything is sent; the section names the slot too.
    const documentRefusal = responseDocumentsRefusal(
      effectiveQuotePanelRFQ.rfq.documentRequests ?? [],
      form.documents,
      0
    );
    if (documentRefusal) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.submitFailed.title'),
        description: rfqResponseRefusal(t, documentRefusal)
      });
      return;
    }
    /** @type {string[]} */
    const missing = [];
    if (!form.validUntil.trim()) missing.push(t('rfqs.field.validUntil'));
    if (missing.length > 0) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.missing.title'),
        description: t('rfqs.toast.missing.body', { fields: missing.join(', ') })
      });
      return;
    }
    const payload = buildQuotationSubmitPayload({
      rfqId: effectiveQuotePanelRFQ.id,
      supplierId,
      // The SAME parsed value the gate above judged — the builder can no longer
      // re-read the string and reach a different number (CP-0 §4).
      unitPrice: bidPrice.value,
      // 2e-c-2 — the argument that makes the price a price (see the draft type).
      currency: form.currency,
      // The days/weeks conversion already happened inside the ONE parse above.
      leadTimeDays: leadTime.days,
      // The SAME parsed value the gate above judged (2e-b-2).
      moq: moq.moq,
      validUntil: form.validUntil,
      // RFx spec 2026-09-21 — payment terms offered are a real field now. They
      // were always sent as `''`.
      paymentTermsOffered: form.paymentTermsOffered.trim(),
      notes: form.notes
    });
    await dispatchQuote(
      {
        ...payload,
        // RFx spec 2026-09-21 — the sample offer is SAVED now (it was collected
        // and dropped). NR-1 — the files travel as `documents` (B4).
        ...(form.canSample !== null
          ? {
              sampleOffer: form.canSample
                ? {
                    canSample: true,
                    ...(form.sampleReadyDate ? { readyDate: form.sampleReadyDate } : {})
                  }
                : { canSample: false }
            }
          : {}),
        ...(form.documents.length > 0 ? { documents: form.documents.map((d) => ({ ...d })) } : {}),
        ...(supersedes ? { supersedesQuotationId: supersedes } : {})
      },
      effectiveQuotePanelRFQ.rfqNumber,
      effectiveQuotePanelRFQ.deadline
    );
  };

  return {
    effectiveQuotePanelRFQ,
    closeQuotePanel: () => setQuotePanelRFQ(null),
    form,
    setForm: editForm,
    tieredDraft,
    setTieredDraft: editTiered,
    supersedes,
    gridRefusal,
    setGridRefusal,
    panelTiered,
    bidPrice,
    leadTime,
    moq,
    submitBlocked,
    problems,
    gridProblems,
    showMissing: edited,
    savedAt: edited ? savedAt : undefined,
    saveFailed,
    sampleDateQuestion,
    totalPrice,
    isSubmitting: submitMutation.isPending,
    handleSubmitQuote,
    canRevise,
    handleRevise,
    submitQuote
  };
};

/** @typedef {ReturnType<typeof useQuoteSubmission>} QuoteSubmission */
