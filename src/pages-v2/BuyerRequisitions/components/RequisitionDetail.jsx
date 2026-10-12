/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseRequisition } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { NextAct } from '@services/transitions/nextAct' */
/** @import { PanelMode } from '../const' */
import DecisionCaptures from './DecisionCaptures';
import StatusNotes from './StatusNotes';
import KeyFacts from './KeyFacts';
import SourceAndJustification from './SourceAndJustification';

/**
 * @typedef {object} RequisitionDetailProps
 * @property {PurchaseRequisition} selectedPR The live row the detail panel shows.
 * @property {PanelMode} panelMode Which capture (if any) is open.
 * @property {string} rejectReason
 * @property {(value: string) => void} setRejectReason
 * @property {string} reviseNote
 * @property {(value: string) => void} setReviseNote
 * @property {{ approve: VerbAvailability; reject: VerbAvailability; sourcing: VerbAvailability }} availability
 *   The verbs the body's notes and the raise-sourcing door depend on.
 * @property {(pr: PurchaseRequisition) => void} raiseSourcingEvent
 * @property {NextAct | null} nextAct
 * @property {TFunction} t
 */

/**
 * The body of the requisition detail panel, top to bottom: the open capture
 * (rejection reason / revision note), the status notes, the key facts, then
 * source of supply and justification. Moved out of `BuyerRequisitions.jsx` by
 * the Phase 5 page split (no behaviour change).
 * @type {React.FC<RequisitionDetailProps>}
 */
const RequisitionDetail = ({
  selectedPR,
  panelMode,
  rejectReason,
  setRejectReason,
  reviseNote,
  setReviseNote,
  availability,
  raiseSourcingEvent,
  nextAct,
  t
}) => (
  <div className="space-y-6">
    <DecisionCaptures
      selectedPR={selectedPR}
      panelMode={panelMode}
      rejectReason={rejectReason}
      setRejectReason={setRejectReason}
      reviseNote={reviseNote}
      setReviseNote={setReviseNote}
      t={t}
    />
    <StatusNotes
      selectedPR={selectedPR}
      availability={availability}
      raiseSourcingEvent={raiseSourcingEvent}
      t={t}
    />
    <KeyFacts selectedPR={selectedPR} nextAct={nextAct} t={t} />
    <SourceAndJustification selectedPR={selectedPR} t={t} />
  </div>
);

export default RequisitionDetail;
