/** @import { TFunction } from 'i18next' */
/** @import { RfiAnswer, RfpPricingAnswer, RfpTermAnswer } from '@services/sourcing/types' */
/** @import { RfpEventView } from '@services/sourcing/views' */
/** @import { DocumentDraft } from '../../rfx/ResponseDocumentsSection' */
import { useState } from 'react';
import {
  draftSavedNow,
  readDraft,
  restoredIds,
  staleDraftIds,
  useAutosave,
  useLeaveGuard,
  withoutIds
} from '../../rfx/responseDraft';

/**
 * The supplier's local proposal edits, per RFP event (S-01): the term
 * answers, "Other terms", the question answers, the pricing, the documents
 * and which proposals are being revised. They are read once from this browser
 * when the page opens and written back as they change; a leave guard asks
 * before the supplier navigates away while a write was refused.
 *
 * Returns the visible edits (`draft`, `other`, `qDraft`, `pDraft`,
 * `docDraft`, with a restored edit on a locked proposal hidden), the setters,
 * `kept` (what is stored), `hasLocalFor`, `saveFailed`, and the two helpers
 * every edit handler calls: `touch` (stamp the save time) and `resetLocal`
 * (drop an event's edits). Moved out of `SupplierRfp.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @param {string} storeKey  The browser key this supplier's edits live under.
 * @param {readonly RfpEventView[]} items  The RFP events on the page.
 * @param {TFunction} t
 */
export function useRfpDrafts(storeKey, items, t) {
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

  return {
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
  };
}
