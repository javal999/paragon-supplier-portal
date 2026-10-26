/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RfpEventView, RfpResponseView } from '@services/sourcing/views' */
import Button from '@components/ui-v2/Button';
import { SendBlockedReason } from '../../rfx/ResponseFormState';
import { ReviseControls } from '../../rfx/ResponseRevise';

/**
 * @typedef {object} RfpSendControlsProps
 * @property {RfpEventView} event
 * @property {RfpResponseView | null} mine  This supplier's response, if any.
 * @property {boolean} showForm  The form is open to this supplier.
 * @property {boolean} submitted
 * @property {boolean} isRevising  A sent proposal is being revised.
 * @property {boolean} windowOpen  The response window is still open (NR-1 BR-08).
 * @property {boolean} locked  The form takes no edit.
 * @property {boolean} blocked  Something must be filled or fixed before sending.
 * @property {boolean} editable  The form takes edits, so the send reason shows.
 * @property {boolean} tcPending  The T&C is not accepted yet.
 * @property {readonly unknown[]} problems  Every field still to fill or fix.
 * @property {VerbAvailability} answerVerb  This seat's authority over the answer verb.
 * @property {{ isPending: boolean }} command  The RFx command (read for `isPending`).
 * @property {(event: RfpEventView, draftOnly: boolean) => void} send  Saves or submits the proposal.
 * @property {(event: RfpEventView, responseId: string) => void} sendRevision  Dispatches the revise verb.
 * @property {(eventId: string) => void} resetLocal  Drops the event's local edits.
 * @property {React.Dispatch<React.SetStateAction<Record<string, boolean>>>} setRevising
 * @property {TFunction} t
 */

/**
 * The proposal's actions: Save and Submit with the reason Send is off, or —
 * for a sent proposal — the revise controls (NR-1 BR-08: while revising, Save
 * and Submit give way to the revise verb; a Submitted response is never
 * saved). Moved out of `SupplierRfp.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @type {React.FC<RfpSendControlsProps>}
 */
const RfpSendControls = ({
  event,
  mine,
  showForm,
  submitted,
  isRevising,
  windowOpen,
  locked,
  blocked,
  editable,
  tcPending,
  problems,
  answerVerb,
  command,
  send,
  sendRevision,
  resetLocal,
  setRevising,
  t
}) => (
  <>
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
      <SendBlockedReason count={problems.length} testId={`supplier-rfp-send-reason-${event.id}`} />
    )}
  </>
);

export default RfpSendControls;
