/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { useState } from 'react';
import { Send, Ban, RotateCcw, Pencil } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { ConfirmSheet, cancelRfqEffects } from '../../rfx/ConfirmSheet';

/**
 * @typedef {object} RfqLifecycleActionsProps
 * @property {RFQ} selectedRfq Any status; the verbs below render only in their own from-states.
 * @property {VerbAvailability} rfqCreateAvailability `rfq:create`, which also edits a Draft (BL-93).
 * @property {Readonly<Record<'publish' | 'reopen' | 'cancel' | 'award', VerbAvailability>>} rfqVerbs The seat's per-verb availability (§76).
 * @property {(rfq: RFQ) => void} openWizardForEdit
 * @property {() => void} handlePublish
 * @property {() => void} handleReopen
 * @property {() => void} handleCancel
 * @property {boolean} publishPending
 * @property {boolean} reopenPending
 * @property {boolean} cancelPending
 * @property {number} quotedCount BL-222 — how many invited suppliers sent a quote, for the cancel sheet.
 * @property {() => void} onSaveTemplate D2 — "Save as template", a secondary act on any status.
 * @property {TFunction} t
 */

/**
 * Lifecycle actions (F0.3): the non-award sourcing verbs on the selected RFQ —
 * edit draft, publish, reopen, cancel — each in its own slot, or the handoff
 * notice naming whose act it is. Moved out of `BuyerSourcing.jsx` by the
 * Phase 5 page split (no behaviour change).
 *
 * RFx UX B-02 (owner ruling 2026-10-19) — the row now renders on every status:
 * cancel keeps its own from-states (Draft, Open, Closed — never the terminal
 * Awarded or Cancelled), and "Save as template" sits last as a secondary act.
 *
 * BL-222 — "Cancel RFQ" opens a confirmation sheet (who is affected, what
 * closes, that it cannot be undone); nothing dispatches until it is confirmed.
 * @type {React.FC<RfqLifecycleActionsProps>}
 */
const RfqLifecycleActions = ({
  selectedRfq,
  rfqCreateAvailability,
  rfqVerbs,
  openWizardForEdit,
  handlePublish,
  handleReopen,
  handleCancel,
  publishPending,
  reopenPending,
  cancelPending,
  quotedCount,
  onSaveTemplate,
  t
}) => {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  return (
    <section>
      <h3 className="text-label text-text-tertiary uppercase mb-3">
        {t('sourcing.lifecycle.actions')}
      </h3>
      <div className="flex flex-wrap gap-2">
        {/* PF-1a — PUBLISH. Wired here and not deferred to the surface
          batch because D-1 made `Draft` the state EVERY newly-raised
          RFQ lands in: without this button the buyer creates events
          only suppliers cannot see, and the draft lane would be a
          trap whose only exit is cancel.
          ⚠️ OUTLINE, NOT SOLID (DP2-BUTTON-01, operator-corrected).
          PF-1a shipped this solid, reasoning that publish "exposes
          the event to the invited list" and therefore qualifies as
          the irreversible commit. The reserved list is NAMED —
          Award, Release payment, Post-to-SAP, Reject/Dispute,
          Override-hold — and publish is not on it. Award already
          holds the one solid on this surface. */}
        {/* PUBLISH — Draft only. The notice takes the button's OWN
          slot, inside the same state condition: a seat withheld
          from publishing reads that on a Draft, where the act
          exists, and reads nothing on an Open RFQ, where it does
          not. A notice outside the from-state would advertise a
          wait for an act the machine would refuse anyway. */}
        {/* BL-93 — EDIT DRAFT, Draft only. It is `rfq:create` (the seat
          that may draft may finish its draft), so a seat without
          it reads the owner here, in the button's own slot. */}
        {selectedRfq.status === 'Draft' &&
          (rfqCreateAvailability.kind === 'held' ? (
            <Button
              variant="secondary"
              icon={Pencil}
              onClick={() => openWizardForEdit(selectedRfq)}
              data-testid="rfq-edit-draft"
            >
              {t('rfxEdit.edit')}
            </Button>
          ) : (
            <HandoffNotice availability={rfqCreateAvailability} testId="handoff-rfq-edit" />
          ))}
        {selectedRfq.status === 'Draft' &&
          (rfqVerbs.publish.kind === 'held' ? (
            <Button variant="outline" icon={Send} disabled={publishPending} onClick={handlePublish}>
              {publishPending ? t('sourcing.publish.submitting') : t('sourcing.publish.submit')}
            </Button>
          ) : (
            <HandoffNotice availability={rfqVerbs.publish} testId="handoff-rfq-publish" />
          ))}
        {/* REOPEN — Closed only, state-exclusive with publish. Two
          acts, two notices, and never both on one RFQ. */}
        {selectedRfq.status === 'Closed' &&
          (rfqVerbs.reopen.kind === 'held' ? (
            <Button
              variant="outline"
              icon={RotateCcw}
              disabled={reopenPending}
              onClick={handleReopen}
            >
              {reopenPending ? t('sourcing.reopen.submitting') : t('sourcing.reopen.submit')}
            </Button>
          ) : (
            <HandoffNotice availability={rfqVerbs.reopen} testId="handoff-rfq-reopen" />
          ))}
        {/* CANCEL — legal from all three of this section's states,
          so its notice is the one a withheld seat always reads
          here, beside whichever of publish/reopen applies. */}
        {(selectedRfq.status === 'Draft' ||
          selectedRfq.status === 'Open' ||
          selectedRfq.status === 'Closed') &&
          (rfqVerbs.cancel.kind === 'held' ? (
            <Button
              variant="secondary"
              icon={Ban}
              className="text-danger"
              disabled={cancelPending || confirmingCancel}
              onClick={() => setConfirmingCancel(true)}
              data-testid="rfq-cancel"
            >
              {cancelPending ? t('sourcing.cancel.submitting') : t('sourcing.cancel.submit')}
            </Button>
          ) : (
            <HandoffNotice availability={rfqVerbs.cancel} testId="handoff-rfq-cancel" />
          ))}
        {/* D2 — keep this RFQ's content as a template. Holds no atom: a
          template is the buyer's own authoring aid in this browser, and
          starting an RFQ from it is what the create gate guards. */}
        <Button variant="secondary" data-testid="panel-save-template" onClick={onSaveTemplate}>
          {t('rfqAuthoring.template.saveAs')}
        </Button>
      </div>
      {confirmingCancel && rfqVerbs.cancel.kind === 'held' ? (
        <div className="mt-3">
          <ConfirmSheet
            title={t('rfx.confirm.cancelRfq.title')}
            effects={cancelRfqEffects(t, {
              invited: selectedRfq.invitedSupplierIds.length,
              quoted: quotedCount
            })}
            confirmLabel={t('rfx.confirm.cancelRfq.confirm')}
            pending={cancelPending}
            onConfirm={() => {
              setConfirmingCancel(false);
              handleCancel();
            }}
            onBack={() => setConfirmingCancel(false)}
            testId="rfq-cancel-sheet"
          />
        </div>
      ) : null}
    </section>
  );
};

export default RfqLifecycleActions;
