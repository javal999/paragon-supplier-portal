/** @import { RFQ } from '@data/mockRfqs' */
/** @import { PurchaseRequisition } from '@services/data/types' */
/** @import { RfqTemplateContent } from '@services/sourcing/rfqTemplates' */
/** @import { RequisitionPrefill } from '../../sourcing/requisitionPrefill' */
/** @import { RfqAuthoringDraft, RfqDraftSeed } from '../../sourcing/rfqDraft' */
/** @import { DraftRfq } from '../const' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useRfqCreate, useRfqReviseDraft } from '@services/query/commandHooks';
import { documentRequestsRefusal } from '@services/transitions/rfxDocumentRules';
import { prefillFromRequisition } from '../../sourcing/requisitionPrefill';
import { refusalMessage } from '../../sourcing/RfqAuthoring';
import {
  buildRfqAuthoringPayload,
  itemsStepRefusal,
  optionsStepRefusal,
  seedForEdit,
  tiersStepRefusal
} from '../../sourcing/rfqDraft';
import {
  buildRfqCreatePayload,
  normalizeRfqCreateDraft,
  readRfqBudget,
  readRfqTotalQty
} from '../../sourcing/rfqCreateModel';
import { draftEditRefusal } from '../../rfx/draftEdit';
import { applyPrefill, applySeed, emptyDraft } from '../utils';
// The refusal-key helper lives beside the qty/budget message maps it reads, in
// the scope step that renders them (GL-1's chip guard reads map and use in ONE file).
import { rfqRefusalKey } from '../components/WizardScopeStep';

/**
 * The RFQ wizard's state and acts: whether it is open, which Draft it edits
 * (BL-93), the step, the draft, the template picker and save dialog, the
 * invitee search text; the three entrances (new, from a seed, for edit); the
 * draft edits; the ONE parse of the two wizard numbers and each step's gate;
 * and the two dispatches (`t_rfq_create`, `t_rfq_revise_draft`). Moved out of
 * `SourcingWorkspace` by the Phase 5 page split (no behaviour change).
 * @param {{ baseRfqs: readonly RFQ[]; sourceablePrs: readonly PurchaseRequisition[] }} args
 */
export const useRfqWizard = ({ baseRfqs, sourceablePrs }) => {
  const [wizardOpen, setWizardOpen] = useState(false);
  // BL-93 — the Draft RFQ the open wizard is EDITING, by id. Null = the wizard
  // raises a new RFQ. Held as an id and re-derived from the live list, so a
  // draft that leaves Draft underneath the wizard (a colleague sent it) is
  // seen as no longer editable rather than edited from a snapshot.
  const [editingRfqId, setEditingRfqId] = useState(/** @type {string | null} */ (null));
  const editingRfq = useMemo(
    () => (editingRfqId ? (baseRfqs.find((r) => r.id === editingRfqId) ?? null) : null),
    [baseRfqs, editingRfqId]
  );
  const [wizardStep, setWizardStep] = useState(0);
  const [draft, setDraft] = useState(/** @type {() => DraftRfq} */ (emptyDraft));
  // Templates and copying (D2): the picker, and the "Save as template" dialog
  // with the content it would save.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [templateToSave, setTemplateToSave] = useState(
    /** @type {{ content: RfqTemplateContent; name: string } | null} */ (null)
  );
  const [supplierSearch, setSupplierSearch] = useState('');
  const { toast } = useToast();
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const createMutation = useRfqCreate();
  const reviseMutation = useRfqReviseDraft();

  // ⚠️ **THE ONE ENTRY POINT, AND IT TAKES THE PREFILL AS AN ARGUMENT.** The
  // page's own "New RFQ" button calls it with nothing; the in-wizard requisition
  // picker calls it with a prefill; C.3's deep link from the requisition surface
  // will call THIS SAME function with a prefill built by the same
  // `prefillFromRequisition`. One entry shape, three callers — a second opener
  // taking a different shape is how C.3 would end up rewriting C.2.
  /** @param {RequisitionPrefill} [prefill] */
  const openWizard = (prefill) => {
    setEditingRfqId(null);
    setDraft(prefill ? applyPrefill(emptyDraft(), prefill) : emptyDraft());
    setWizardStep(0);
    setSupplierSearch('');
    setWizardOpen(true);
  };

  // ⚠️ **THE GENERIC ENTRANCE — ONE SEED SHAPE FOR EVERY OTHER SOURCE.** An RFI,
  // a template and a past RFQ each become an `RfqDraftSeed` (`rfqDraft.js`) and
  // open the wizard through here. An RFP source is one more `seedFrom…` feeding
  // this same function; nothing in the wizard changes for it.
  /** @param {RfqDraftSeed} seed */
  const openWizardFromSeed = (seed) => {
    setEditingRfqId(null);
    setDraft(applySeed(emptyDraft(), seed));
    setWizardStep(0);
    setSupplierSearch('');
    setPickerOpen(false);
    setWizardOpen(true);
  };

  // Re-point the OPEN wizard at a requisition, without closing it. The picker
  // sits in step 0, so it must not reset the step the way `openWizard` does.
  /** @param {RequisitionPrefill | null} prefill */
  const applySource = (prefill) => {
    setDraft((d) =>
      prefill
        ? applyPrefill(d, prefill)
        : // Clearing the source clears ONLY what the prefill owns. Anything the
          // buyer typed themselves stays — dropping their edits because they
          // changed their mind about the origin would be the surface deciding
          // their work was the requisition's rather than theirs.
          { ...d, sourceRequisitionId: undefined }
    );
  };

  // BL-93 — THE EDIT ENTRANCE. The same wizard, opened on every stored field
  // of a Draft RFQ (`seedForEdit`), saving through `t_rfq_revise_draft`.
  /** @param {RFQ} rfq */
  const openWizardForEdit = (rfq) => {
    setEditingRfqId(rfq.id);
    setDraft(applySeed(emptyDraft(), seedForEdit(rfq)));
    setWizardStep(0);
    setSupplierSearch('');
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setEditingRfqId(null);
  };

  /**
   * @template {keyof DraftRfq} K
   * @param {K} key
   * @param {DraftRfq[K]} value
   */
  const updateDraft = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  /** @param {string} m */
  const toggleMaterial = (m) => {
    setDraft((d) => ({
      ...d,
      materials: d.materials.includes(m) ? d.materials.filter((x) => x !== m) : [...d.materials, m]
    }));
  };

  /** @param {string} id */
  const toggleSupplier = (id) => {
    setDraft((d) => ({
      ...d,
      invitedSupplierIds: d.invitedSupplierIds.includes(id)
        ? d.invitedSupplierIds.filter((x) => x !== id)
        : [...d.invitedSupplierIds, id]
    }));
  };

  // ── CP-0 · W1 · 2e-b-4a — the ONE read of the wizard's two numbers ─────────
  // The step gate, the review summary, and the dispatched payload ALL read this
  // one result. Before, each re-read `draft.totalQty` with its own recipe, so
  // the number that unlocked the wizard, the number the buyer confirmed on the
  // review step, and the number the RFQ was minted with could be three different
  // numbers — and "2,400" could be all three at once as NaN.
  const rfqNumbers = useMemo(() => normalizeRfqCreateDraft(draft), [draft]);

  // The two FIELD-LEVEL reads (2e-b-4b). Same parser, same strings — these
  // cannot disagree with the composite above; they exist because the composite
  // is sequential and so can only ever name one field at a time. On a fresh
  // wizard the quantity is blank, so without these the budget input could never
  // report its own refusal.
  // The chosen requisition, re-derived from the draft's key rather than held in
  // a second state. One source of truth: if `sourceRequisitionId` is set, the
  // row it names is what the review reports — there is no way for a stale copy
  // to describe a requisition the payload no longer points at.
  const sourcePrefill = useMemo(() => {
    if (!draft.sourceRequisitionId) return null;
    const pr = sourceablePrs.find((r) => r.id === draft.sourceRequisitionId);
    if (!pr) return null;
    return { ...prefillFromRequisition(pr), label: `${pr.prNumber} · ${pr.material}` };
  }, [draft.sourceRequisitionId, sourceablePrs]);

  const qtyRead = useMemo(() => readRfqTotalQty(draft.totalQty), [draft.totalQty]);
  const budgetRead = useMemo(() => readRfqBudget(draft.budget), [draft.budget]);

  const itemsRefusal = useMemo(() => itemsStepRefusal(draft.items), [draft.items]);
  const tiersRefusal = useMemo(() => tiersStepRefusal(draft.tiers), [draft.tiers]);
  const optionsRefusal = optionsStepRefusal(draft);
  // NR-1 BR-02 — the items a document request may name, as the payload numbers
  // them (`toRfqItem`: line = position + 1), so the level select and the verb's
  // `itemLineNo` check read the same numbers.
  const docItems = draft.items.map((item, i) => ({ lineNo: i + 1, description: item.description }));
  const docsRefusal = documentRequestsRefusal(
    draft.documentRequests ?? [],
    docItems.map((i) => i.lineNo)
  );
  /** @param {Partial<RfqAuthoringDraft>} patch */
  const updateAuthoring = (patch) => setDraft((d) => ({ ...d, ...patch }));

  /**
   * @param {number} step
   * @returns {boolean}
   */
  const isStepValid = (step) => {
    if (step === 0) {
      return (
        draft.title.trim().length > 0 &&
        draft.category !== '' &&
        // B1 review fix (a) — "Specific material(s)" is OPTIONAL. Every RFQ
        // this wizard raises has an Items step (one item at least, refused by
        // name otherwise), and the items describe what is sourced; the
        // hard-coded catalogue has no sticker, mold or box entry to pick.
        // A requisition pre-fill never carried materials, so it is unchanged.

        // The quantity must be READABLE and positive. The positivity half is the
        // pre-existing `Number(draft.totalQty) > 0` guard, preserved verbatim in
        // meaning: this batch makes the reading honest, it does not relax what
        // the wizard already refused. Whether a zero-quantity RFQ deserves a
        // NAMED refusal (the ZERO_PRICE / ZERO_MOQ precedent) instead of an
        // anonymous disabled button is 4a-FIND-02 — a commercial ruling, not a
        // parsing one, and not taken here.
        rfqNumbers.ok &&
        rfqNumbers.value.totalQty > 0
      );
    }
    // The three authoring steps are judged by the SAME rules the create verb
    // binds (`rfq_create_valid`), so a step that lets the buyer through is one
    // the dispatch will accept — and each says why when it does not.
    if (step === 1) return itemsRefusal === null;
    if (step === 2) return tiersRefusal === null;
    if (step === 3) return optionsRefusal === null;
    if (step === 4) return draft.invitedSupplierIds.length > 0;
    if (step === 5) {
      if (!draft.responseDeadline || !draft.awardDeadline) return false;
      return new Date(draft.awardDeadline) > new Date(draft.responseDeadline);
    }
    // NR-1 BR-02 — the create verb's own rule (`rfqCreateRefusal` calls it).
    if (step === 6) return docsRefusal === null;
    return true;
  };

  // Raise the RFQ through the dispatcher (t_rfq_create) — the SAME governed path
  // the award/cancel/reopen verbs use, NOT a client-fabricated peer. The number is
  // store-assigned (honest); a non-failed outcome invalidates the reads so the new
  // Open RFQ arrives on the board via getRFQs. Both failure channels leave the
  // board unchanged and surface an honest toast.
  // BL-93 — save the edited draft (`t_rfq_revise_draft`, compare-and-set on
  // Draft), and with `send` publish it in the same act. The payload is the one
  // create builds, from the same parsed numbers, so an edit cannot store a
  // shape the create verb would have refused.
  /** @param {boolean} send */
  const saveEdit = (send) => {
    if (!editingRfqId) return;
    if (!rfqNumbers.ok) {
      toast({
        variant: 'error',
        title: t('sourcing.toast.numberRefused.title'),
        description: t(rfqRefusalKey(rfqNumbers))
      });
      return;
    }
    reviseMutation.mutate(
      {
        rfqId: editingRfqId,
        publish: send,
        payload: {
          ...buildRfqCreatePayload(draft, rfqNumbers.value),
          ...buildRfqAuthoringPayload(draft)
        }
      },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.createFailed.title'),
              description:
                draftEditRefusal(t, result.reason) ??
                refusalText(result.reason) ??
                (result.reason
                  ? refusalMessage(t, result.reason)
                  : t('sourcing.toast.createFailed.default'))
            });
            return;
          }
          closeWizard();
          toast({
            variant: 'success',
            title: t(send ? 'rfxEdit.toast.sent' : 'rfxEdit.toast.saved')
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.createFailed.title'),
            description: t('sourcing.toast.createFailed.dispatch')
          })
      }
    );
  };

  const submitWizard = () => {
    // The parse gate fires FIRST and it BLOCKS. `isStepValid(0)` already keeps
    // the wizard from reaching this step, so this is the SECOND lock: a
    // programmatic or race-y submit cannot slip an unreadable quantity into a
    // store-minted RFQ, where it would become the multiplicand of every
    // quotation's total price. The refusal is NAMED rather than folded into the
    // generic create-failed toast — "we cannot tell which number you mean" and
    // "you left this blank" ask the buyer for different things.
    if (!rfqNumbers.ok) {
      toast({
        variant: 'error',
        title: t('sourcing.toast.numberRefused.title'),
        description: t(rfqRefusalKey(rfqNumbers))
      });
      return;
    }
    if (editingRfqId) {
      saveEdit(false);
      return;
    }
    const invitedCount = draft.invitedSupplierIds.length;
    createMutation.mutate(
      // The SAME parsed values the gate above judged — the builder can no longer
      // re-read the strings and reach a different number (CP-0 §4).
      {
        payload: {
          ...buildRfqCreatePayload(draft, rfqNumbers.value),
          // The authoring half — items, breaks, questions, options, files,
          // provenance, and the CURRENCY the buyer chose (the store used to
          // write 'IDR' whatever it was).
          ...buildRfqAuthoringPayload(draft)
        }
      },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.createFailed.title'),
              // A `rfq_create_valid` refusal is named, so it is said in the
              // buyer's language; anything else keeps the prior fallback chain.
              description:
                refusalText(result.reason) ??
                (result.reason
                  ? refusalMessage(t, result.reason)
                  : t('sourcing.toast.createFailed.default'))
            });
            return;
          }
          setWizardOpen(false);
          toast({
            variant: 'success',
            title: t('sourcing.toast.created.title', { rfqNumber: result.entityId }),
            description: t(
              invitedCount === 1
                ? 'sourcing.toast.created.desc.one'
                : 'sourcing.toast.created.desc.other',
              { count: invitedCount }
            )
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.createFailed.title'),
            description: t('sourcing.toast.createFailed.dispatch')
          })
      }
    );
  };

  return {
    wizardOpen,
    editingRfqId,
    editingRfq,
    wizardStep,
    setWizardStep,
    draft,
    setDraft,
    pickerOpen,
    setPickerOpen,
    templateToSave,
    setTemplateToSave,
    supplierSearch,
    setSupplierSearch,
    reviseMutation,
    openWizard,
    openWizardFromSeed,
    applySource,
    openWizardForEdit,
    closeWizard,
    updateDraft,
    toggleMaterial,
    toggleSupplier,
    updateAuthoring,
    rfqNumbers,
    sourcePrefill,
    qtyRead,
    budgetRead,
    itemsRefusal,
    tiersRefusal,
    optionsRefusal,
    docItems,
    isStepValid,
    saveEdit,
    submitWizard
  };
};
