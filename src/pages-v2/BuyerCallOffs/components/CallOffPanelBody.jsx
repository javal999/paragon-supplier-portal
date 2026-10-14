/** @import React from 'react' */
/** @import { CallOffCommandVars } from '@services/query/commandHooks' */
/** @import { useVerbAvailability } from '@hooks/useVerbAvailability' */
/** @import { CallOffView, ReleaseCheck } from '@services/transitions/callOffRules' */
/** @import { LinkedAsn } from '../utils' */
/** @import { CallOffForm } from './NewCallOffPanel' */
import { isConfirmedAndAccepted } from '@services/transitions/callOffRules';
import { releaseWithheld } from '../utils';
import CallOffFacts from './CallOffFacts';
import CallOffHistory from './CallOffHistory';
import ChangeSection from './ChangeSection';
import DraftSection from './DraftSection';
import EngineOriginMarker from './EngineOriginMarker';
import ReviewSection from './ReviewSection';

/**
 * @typedef {object} PanelBodyProps
 * @property {CallOffView} view
 * @property {readonly LinkedAsn[]} linkedAsns -  The call-off's ASNs, each with the current comparison (edge case 6).
 * @property {CallOffForm} form
 * @property {(f: PanelBodyProps['form']) => void} setForm
 * @property {boolean} busy
 * @property {boolean} planHeld
 * @property {boolean} reviewHeld
 * @property {ReturnType<typeof useVerbAvailability>} planAvailability
 * @property {ReturnType<typeof useVerbAvailability>} reviewAvailability
 * @property {string} today
 * @property {(vars: CallOffCommandVars, success: string, close?: boolean) => Promise<boolean>} run
 * @property {(raw: string) => number} numberOf
 * @property {(quantity: number) => ReleaseCheck | null} checkRelease -  The release check for this call-off's own PO line at a given quantity (CR-04 / BL-49).
 */

/**
 * The body of the one-call-off side panel: the engine marker (X-03), the
 * facts, the record sections, then whichever action sections apply — review
 * (awaiting approval), draft actions (a draft), or change (an answered,
 * accepted or rejected call-off with no heads-up). Derives the reason, the
 * edits and both release checks once, for the draft and change sections.
 * @type {React.FC<PanelBodyProps>}
 */
const CallOffPanelBody = ({
  view,
  form,
  setForm,
  busy,
  planHeld,
  reviewHeld,
  planAvailability,
  reviewAvailability,
  today,
  run,
  numberOf,
  checkRelease,
  linkedAsns
}) => {
  const c = view.callOff;
  const isDraft = c.status === 'Draft';
  const awaitingApproval = view.confirmation === 'Awaiting Approval';
  const changeable =
    !isDraft &&
    !awaitingApproval &&
    (isConfirmedAndAccepted(c) || c.status === 'Rejected') &&
    view.headsUps.length === 0;
  const reason = form.reason.trim();
  const changedQty = numberOf(form.quantity);
  // CR-04 / BL-49 — releasing a draft uses the draft's OWN quantity; changing a
  // released call-off uses the quantity being typed. Both run the same check.
  const draftRelease = isDraft ? checkRelease(c.quantity) : null;
  const withheld = releaseWithheld(c);
  const changeRelease = checkRelease(changedQty);
  const edits = {
    ...(Number.isFinite(changedQty) && changedQty !== c.quantity ? { quantity: changedQty } : {}),
    ...(form.needDate && form.needDate !== c.needDate ? { needDate: form.needDate } : {})
  };

  return (
    <div className="space-y-6">
      {withheld && <EngineOriginMarker testId="calloff-panel-origin-engine" />}
      <CallOffFacts view={view} />

      <CallOffHistory view={view} linkedAsns={linkedAsns} />

      {/* Planner review of a confirmation outside tolerance (BR-04). */}
      {awaitingApproval && (
        <ReviewSection
          c={c}
          form={form}
          setForm={setForm}
          busy={busy}
          reviewHeld={reviewHeld}
          reviewAvailability={reviewAvailability}
          run={run}
        />
      )}

      {/* Draft: edit (with reason), release, dismiss (with reason). */}
      {isDraft && (
        <DraftSection
          c={c}
          form={form}
          setForm={setForm}
          busy={busy}
          planHeld={planHeld}
          planAvailability={planAvailability}
          today={today}
          run={run}
          reason={reason}
          edits={edits}
          draftRelease={draftRelease}
          withheld={withheld}
        />
      )}

      {/* Change a call-off the supplier already answered: back to Awaiting Confirmation. */}
      {changeable && (
        <ChangeSection
          c={c}
          form={form}
          setForm={setForm}
          busy={busy}
          planHeld={planHeld}
          planAvailability={planAvailability}
          today={today}
          run={run}
          reason={reason}
          edits={edits}
          changeRelease={changeRelease}
        />
      )}
    </div>
  );
};

export default CallOffPanelBody;
