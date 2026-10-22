/** @import React from 'react' */
/** @import { CallOffCommandVars } from '@services/query/commandHooks' */
/** @import { useVerbAvailability } from '@hooks/useVerbAvailability' */
/** @import { CallOffView, ReleaseCheck } from '@services/transitions/callOffRules' */
/** @import { CallOffForm, LinkedAsn } from '../utils' */
import { useState } from 'react';
import {
  LTP_DROPPED_CODE,
  delayProposalRefusal,
  isConfirmedAndAccepted
} from '@services/transitions/callOffRules';
import { useActiveReasonCodes, useReasonLabel } from '../../admin/reasonCodeDisplay';
import { RopFisikFigures } from '../../callOffs/ropFisikTrigger';
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
 * The body of one call-off's side panel: its markers and facts, its history
 * (confirmation, rejection, delays, heads-ups, notes), and the one action
 * section its state allows — review (awaiting approval), draft actions, or a
 * change. Owns the change's reason code, so it survives the change section
 * unmounting while the panel stays open. Moved out of `BuyerCallOffs.jsx` by
 * the Phase 5 page split (no behaviour change).
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
  // BL-32 / DRC-5 (BL-191) — the coded reason of a change; "LTP dropped" makes
  // a later need date a delay the supplier must approve.
  const changeCodes = useActiveReasonCodes('callOffChange');
  const reasonLabel = useReasonLabel();
  const [reasonCode, setReasonCode] = useState('');
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
  // DRC-5 — the verb's own rule, read as a courtesy before sending.
  const delay = reasonCode === LTP_DROPPED_CODE;
  const delayRefused = delay ? delayProposalRefusal(c, edits) : null;

  return (
    <div className="space-y-6">
      {withheld && <EngineOriginMarker testId="calloff-panel-origin-engine" />}
      {/* BL-199 (DRC-13) — the figures behind a draft the hub made at ROP Fisik. */}
      <RopFisikFigures callOff={c} />
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
          changeCodes={changeCodes}
          reasonLabel={reasonLabel}
          reasonCode={reasonCode}
          setReasonCode={setReasonCode}
          delay={delay}
          delayRefused={delayRefused}
        />
      )}
    </div>
  );
};

export default CallOffPanelBody;
