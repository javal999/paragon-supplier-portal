/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseRequisition } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { PanelMode } from '../const' */
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';

/**
 * @typedef {object} RequisitionPanelFooterProps
 * @property {PurchaseRequisition} selectedPR The live row the detail panel shows.
 * @property {PanelMode} panelMode `rejecting` / `revising` swap the footer for that capture's commit.
 * @property {(mode: PanelMode) => void} setPanelMode
 * @property {(value: string) => void} setRejectReason Cleared when the rejection is cancelled.
 * @property {(value: string) => void} setReviseNote Cleared when the revision is cancelled.
 * @property {{ submit: VerbAvailability; revise: VerbAvailability; approve: VerbAvailability; reject: VerbAvailability }} availability
 *   The seat's authority per verb: a held verb renders its button, any other its handoff notice.
 * @property {{ submit: boolean; revise: boolean; approve: boolean; reject: boolean }} pending
 *   Whether each verb's dispatch is in flight (disables the button, swaps its label).
 * @property {boolean} canReject The rejection reason is non-empty.
 * @property {boolean} canRevise The revision note is non-empty.
 * @property {() => void} closePanel
 * @property {() => void} submitSelected Dispatches `pr:submit`.
 * @property {() => void} reviseSelected Dispatches `pr:revise` with the note.
 * @property {() => void} approveSelected Dispatches `pr:approve`.
 * @property {() => void} rejectSelected Dispatches `pr:reject` with the reason.
 * @property {TFunction} t
 */

/**
 * The detail panel's footer: Close, then the ONE verb the document's status and
 * the panel mode allow — submit on a Draft, revise on a Rejected, reject and
 * approve on a Pending Approval — each gated on the seat holding the verb, with
 * the handoff notice naming the owner otherwise. All of it stays in this one
 * footer (`SEGREGATION-CROSSED-IN-ONE-DRAWER-01`, §76d — unchanged here). Moved
 * out of `BuyerRequisitions.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<RequisitionPanelFooterProps>}
 */
const RequisitionPanelFooter = ({
  selectedPR,
  panelMode,
  setPanelMode,
  setRejectReason,
  setReviseNote,
  availability,
  pending,
  canReject,
  canRevise,
  closePanel,
  submitSelected,
  reviseSelected,
  approveSelected,
  rejectSelected,
  t
}) => (
  <>
    {/* ⚠️ §67 — THREE AFFORDANCES RETIRED HERE, AND THE DEFECT IS
        PRECISELY LOCATED. "Submit for approval" on a Draft, and
        "Create PO directly" / "Create Sourcing Event" on an Approved,
        dispatched NOTHING — no store write, no event, no state
        change.

        **Their COPY was already honest** ("PO creation not available
        yet — nothing was created"), which is why this is worth
        stating carefully rather than as a flat accusation. What lied
        was the SHAPE: a live button in the commit slot, labelled with
        the verb, firing a GREEN SUCCESS toast to report that nothing
        happened. A reader decides from the affordance, not from the
        notification they get after pressing it — and an honest
        sentence delivered in a success variant reads as confirmation.

        Nothing in the suite covered any of the three, which is how
        they survived. What stands in their place is either a REAL
        dispatch or a stated reason there is no act — never a button
        for neither. */}
    <Button variant="secondary" onClick={closePanel}>
      {t('requisitions.panel.close')}
    </Button>

    {/* ⚠️ §68 — THE REQUESTER'S EDGE OUT OF DRAFT, AND IT CLOSES A
        DEAD END THIS SURFACE CREATED. §67 stated here that a Draft
        had one edge out and this surface did not offer it, on the
        ground that a submit affordance would be a second creation
        path beside the ratified C7 seam. THAT REASON WAS WRONG:
        `t_pr_submit` does not create anything — it acts on a document
        `t_pr_create` has already minted — so it adds no producer at
        all. The consequence of the old reading was that the approval
        queue emptied and nothing filled it. */}
    {selectedPR.status === 'Draft' && panelMode === 'view' && (
      <>
        {availability.submit.kind === 'held' ? (
          <Button
            variant="outline"
            onClick={submitSelected}
            disabled={pending.submit}
            data-testid="pr-submit"
          >
            {pending.submit ? t('requisitions.panel.submitting') : t('requisitions.panel.submit')}
          </Button>
        ) : (
          <HandoffNotice availability={availability.submit} testId="handoff-pr-submit" />
        )}
      </>
    )}

    {/* The recourse edge. A rejected requisition returns to the
        REQUESTER (Rejected → Draft), never straight back to the
        queue: an approver seeing the same document they already
        declined learns nothing, and the two-step IS the revision. */}
    {selectedPR.status === 'Rejected' && panelMode === 'view' && (
      <>
        {availability.revise.kind === 'held' ? (
          <Button
            variant="outline"
            onClick={() => setPanelMode('revising')}
            data-testid="pr-revise-open"
          >
            {t('requisitions.panel.revise')}
          </Button>
        ) : (
          <HandoffNotice availability={availability.revise} testId="handoff-pr-revise" />
        )}
      </>
    )}

    {selectedPR.status === 'Rejected' && panelMode === 'revising' && (
      <>
        <Button
          variant="secondary"
          onClick={() => {
            setPanelMode('view');
            setReviseNote('');
          }}
        >
          {t('requisitions.panel.reviseCancel')}
        </Button>
        {/* DP2-BUTTON-01 — OUTLINE, and the contrast with the reject
            commit below is the rule working. Solid is reserved for
            the irreversible commit; a revision returns a declined
            document to its own author's hands and is undone by
            declining it again. Reject is named in the reserved list;
            revise is not, and neither is submit. */}
        <Button
          variant="outline"
          onClick={reviseSelected}
          disabled={!canRevise || pending.revise}
          data-testid="pr-revise-confirm"
        >
          {pending.revise
            ? t('requisitions.panel.revising')
            : t('requisitions.panel.reviseConfirm')}
        </Button>
      </>
    )}

    {selectedPR.status === 'Pending Approval' && panelMode === 'view' && (
      <>
        {/* The wait, not a gap: a seat without the atom reads the
            OWNER of the act rather than an empty footer. Derived per
            verb from `rolesHolding`, so moving `pr:approve` to another
            bundle tomorrow changes this line with it. */}
        {availability.reject.kind === 'held' ? (
          <Button
            variant="outline"
            onClick={() => setPanelMode('rejecting')}
            data-testid="pr-reject-open"
          >
            {t('requisitions.panel.reject')}
          </Button>
        ) : (
          <HandoffNotice availability={availability.reject} testId="handoff-pr-reject" />
        )}
        {availability.approve.kind === 'held' ? (
          <Button
            variant="outline"
            onClick={approveSelected}
            disabled={pending.approve}
            data-testid="pr-approve"
          >
            {pending.approve ? t('requisitions.panel.approving') : t('requisitions.panel.approve')}
          </Button>
        ) : (
          <HandoffNotice availability={availability.approve} testId="handoff-pr-approve" />
        )}
      </>
    )}

    {selectedPR.status === 'Pending Approval' && panelMode === 'rejecting' && (
      <>
        <Button
          variant="secondary"
          onClick={() => {
            setPanelMode('view');
            setRejectReason('');
          }}
        >
          {t('requisitions.panel.rejectCancel')}
        </Button>
        {/* DP2-BUTTON-01 — SOLID, and Reject is named in the reserved
            list. The opener above stays outline because it only
            switches panel mode; THIS is the irreversible commit, and
            it is the only solid on the surface (the approve button is
            not rendered in `rejecting` mode). */}
        <Button
          variant="outline"
          onClick={rejectSelected}
          disabled={!canReject || pending.reject}
          data-testid="pr-reject-confirm"
        >
          {pending.reject
            ? t('requisitions.panel.rejecting')
            : t('requisitions.panel.rejectConfirm')}
        </Button>
      </>
    )}
  </>
);

export default RequisitionPanelFooter;
