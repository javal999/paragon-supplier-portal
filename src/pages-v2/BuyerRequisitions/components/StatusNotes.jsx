/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseRequisition } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';

/**
 * @typedef {object} StatusNotesProps
 * @property {PurchaseRequisition} selectedPR The live row the detail panel shows.
 * @property {{ approve: VerbAvailability; reject: VerbAvailability; sourcing: VerbAvailability }} availability
 *   Approve / reject decide whether the attribution note shows; sourcing gates the raise-sourcing button.
 * @property {(pr: PurchaseRequisition) => void} raiseSourcingEvent Navigates to the RFQ wizard with the requisition's id.
 * @property {TFunction} t
 */

/**
 * The status-dependent notes of the detail panel, in render order: the
 * attribution notice before an approval act, the recorded rejection reason,
 * the recorded revision note, the Approved section with the raise-sourcing door
 * (or its handoff notice), and the Draft note. Moved out of
 * `BuyerRequisitions.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<StatusNotesProps>}
 */
const StatusNotes = ({ selectedPR, availability, raiseSourcingEvent, t }) => (
  <>
    {/* ⚠️ **THE SEAT SAYS WHAT IT CANNOT RECORD, BEFORE THE ACT** — the
        §66 precedent, verbatim: a grant is recorded against
        `UNATTRIBUTED: NO_PERSON_IN_SESSION` and the surface says so
        first. The ceiling here is UNIFORM, not specific to approval:
        `overrideCompletes` is literally `isAttributed(overriddenBy)`,
        so the enforcement override STRUCTURALLY cannot complete without
        a resolved actor. Approval carries no such predicate — C10's
        ledger-plus-policy ruling is precisely what keeps the person out
        of the machine — so it records UNATTRIBUTED like every other
        governed act and proceeds. That is why this is a NOTICE and not
        a refusal. */}
    {selectedPR.status === 'Pending Approval' &&
      (availability.approve.kind === 'held' || availability.reject.kind === 'held') && (
        <section
          data-testid="pr-attribution-note"
          className="rounded-md border border-border-subtle bg-bg-muted px-3 py-2"
        >
          <p className="text-xs text-text-secondary">{t('requisitions.panel.attributionNote')}</p>
        </section>
      )}

    {/* The recorded rejection, read back on the document it belongs to.
        This is the half the invoice lane never built — there the
        required text reaches the store seam and is discarded. */}
    {selectedPR.rejectionReason && (
      <section
        data-testid="pr-rejection-reason"
        className="rounded-md border border-danger/30 bg-danger-soft/40 px-3 py-2"
      >
        <h3 className="text-label text-text-tertiary uppercase mb-1">
          {t('requisitions.panel.rejectedBecause')}
        </h3>
        <p className="text-sm text-text-primary">{selectedPR.rejectionReason}</p>
      </section>
    )}

    {/* What changed, read back on the document it belongs to — the
        other half of the same conversation. Both survive the edges
        deliberately: the reason says why it came back, the note says
        what was done about it, and an approver looking at a
        re-submitted requisition needs to read them together. */}
    {selectedPR.revisionNote && (
      <section
        data-testid="pr-revision-note"
        className="rounded-md border border-border-subtle bg-bg-muted px-3 py-2"
      >
        <h3 className="text-label text-text-tertiary uppercase mb-1">
          {t('requisitions.panel.revisedBecause')}
        </h3>
        <p className="text-sm text-text-primary">{selectedPR.revisionNote}</p>
      </section>
    )}

    {/* ⚠️ APPROVED IS A DEAD END TODAY AND THE SURFACE SAYS SO.
        `t_pr_source` and `t_pr_convert` are `trigger: 'cascade'` and
        NO SOURCE NAMES EITHER in `cascades.js` — both are
        `unauthored-cascade` rows in the loose-end census. The two
        buttons that used to sit here implied a next step the platform
        cannot produce, which is the false-affordance class exactly. An
        approved requisition that LOOKS like it is going somewhere is
        worse than one that plainly is not. */}
    {/* ⚠️ **C.3 — THIS SECTION USED TO SAY THE LANE STOPPED HERE, AND IT
        HAD ALREADY STOPPED BEING TRUE.** Its body read *"no producer is
        wired for either yet. Nothing on this screen advances an approved
        requisition further."* C.2 wired a producer — an RFQ raised from
        a requisition moves it to `Sourcing Event` — so the first clause
        became false at that merge, WITH NOBODY EDITING THIS FILE. That
        is the shape worth naming: a sentence that is true when written
        and is falsified by a capability shipping NEXT DOOR, on a surface
        its author never touched. Nothing in the suite could fail for it,
        because a stale prose claim is not a broken behaviour.

        The section survives rather than being deleted, on §68's
        precedent one state over: a state WITH an affordance still owes
        the reader an account of where the document is, and retiring the
        account would leave a lone button and no context. What changed is
        that the account is now true, and it says what remains undone
        (PO conversion) instead of claiming everything is. */}
    {selectedPR.status === 'Approved' && (
      <section
        data-testid="pr-approved-terminal"
        className="rounded-md border border-border-subtle bg-bg-muted px-3 py-2"
      >
        <h3 className="text-label text-text-tertiary uppercase mb-1">
          {t('requisitions.panel.sourcing.title')}
        </h3>
        <p className="text-sm text-text-secondary mb-2">{t('requisitions.panel.sourcing.body')}</p>
        {availability.sourcing.kind === 'held' ? (
          <Button
            variant="outline"
            data-testid="pr-raise-sourcing"
            onClick={() => raiseSourcingEvent(selectedPR)}
          >
            {t('requisitions.panel.sourcing.cta')}
          </Button>
        ) : (
          /* Pending-with-an-owner, in the standing grammar — never an
             absent affordance, never a disabled control. A requisitioner
             holds `pr:create` and `pr:submit` and no `rfq:create`, so
             this is the seat that actually meets this notice: their own
             approved requisition, and procurement is who takes it on. */
          <HandoffNotice availability={availability.sourcing} testId="handoff-pr-sourcing" />
        )}
      </section>
    )}

    {/* ⚠️ §68 — THIS NOTE USED TO EXPLAIN WHY NOTHING HERE SUBMITTED
        THE REQUISITION. Something does now, so what it explains has
        changed: a Draft is not yet in front of an approver, and the
        requester is the one who decides when it should be. The section
        stays because a state with an affordance still owes the reader
        an account of where the document IS — retiring it would leave a
        lone button and no context. */}
    {selectedPR.status === 'Draft' && (
      <section
        data-testid="pr-draft-note"
        className="rounded-md border border-border-subtle bg-bg-muted px-3 py-2"
      >
        <h3 className="text-label text-text-tertiary uppercase mb-1">
          {t('requisitions.panel.draftNote.title')}
        </h3>
        <p className="text-sm text-text-secondary">{t('requisitions.panel.draftNote.body')}</p>
      </section>
    )}
  </>
);

export default StatusNotes;
