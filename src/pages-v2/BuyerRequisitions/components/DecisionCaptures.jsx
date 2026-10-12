/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseRequisition } from '@services/data/types' */
/** @import { PanelMode } from '../const' */

/**
 * @typedef {object} DecisionCapturesProps
 * @property {PurchaseRequisition} selectedPR The live row the detail panel shows.
 * @property {PanelMode} panelMode Which capture (if any) is open.
 * @property {string} rejectReason
 * @property {(value: string) => void} setRejectReason
 * @property {string} reviseNote
 * @property {(value: string) => void} setReviseNote
 * @property {TFunction} t
 */

/**
 * The two text captures at the top of the detail panel: the rejection reason
 * (`rejecting` on a Pending Approval) and the revision note (`revising` on a
 * Rejected). Each commit button in the footer stays disabled until its box is
 * non-empty. Moved out of `BuyerRequisitions.jsx` by the Phase 5 page split
 * (no behaviour change).
 * @type {React.FC<DecisionCapturesProps>}
 */
const DecisionCaptures = ({
  selectedPR,
  panelMode,
  rejectReason,
  setRejectReason,
  reviseNote,
  setReviseNote,
  t
}) => (
  <>
    {/* ⚠️ THE REASON CAPTURE, AND IT IS NOT DISMISSIBLE-BESIDE-REQUIRED.
        The commit button is disabled until this is non-empty, so there
        is no path from here to a blank rejection — and no path around
        it either: `PR_REJECT_REASON_AUTHORED` refuses a blank string at
        the verb for any caller that never renders this box. */}
    {panelMode === 'rejecting' && selectedPR.status === 'Pending Approval' && (
      <section>
        <h3 className="text-label text-text-tertiary uppercase mb-3">
          {t('requisitions.panel.rejectSection')}
        </h3>
        <label htmlFor="pr-reject-reason" className="sr-only">
          {t('requisitions.panel.rejectSrLabel', { number: selectedPR.prNumber })}
        </label>
        <textarea
          id="pr-reject-reason"
          data-testid="pr-reject-reason"
          className="w-full text-sm border border-border-subtle rounded-md px-3 py-2 bg-bg-surface text-text-primary"
          rows={3}
          placeholder={t('requisitions.panel.rejectPlaceholder')}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
        <div className="mt-2 text-xs text-text-tertiary">{t('requisitions.panel.rejectNote')}</div>
      </section>
    )}

    {/* The revision note capture. Same shape and same rule as the
        rejection reason above — and this one closes the sharper of the
        two defects: `revisionNote` had been REQUIRED by the verb since
        PF-1a with no field on the document, no capture anywhere, and no
        caller. The dispatcher refused without it and the text was
        dropped before the document was written. */}
    {panelMode === 'revising' && selectedPR.status === 'Rejected' && (
      <section>
        <h3 className="text-label text-text-tertiary uppercase mb-3">
          {t('requisitions.panel.reviseSection')}
        </h3>
        <label htmlFor="pr-revise-note" className="sr-only">
          {t('requisitions.panel.reviseSrLabel', { number: selectedPR.prNumber })}
        </label>
        <textarea
          id="pr-revise-note"
          data-testid="pr-revise-note"
          className="w-full text-sm border border-border-subtle rounded-md px-3 py-2 bg-bg-surface text-text-primary"
          rows={3}
          placeholder={t('requisitions.panel.revisePlaceholder')}
          value={reviseNote}
          onChange={(e) => setReviseNote(e.target.value)}
        />
        <div className="mt-2 text-xs text-text-tertiary">{t('requisitions.panel.reviseNote')}</div>
      </section>
    )}
  </>
);

export default DecisionCaptures;
