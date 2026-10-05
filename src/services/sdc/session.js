// ────────────────────────────────────────────────────────────────────────────
// SubmissionSession envelope helper (SDC-2a — addendum §5).
//
// The session is an ENVELOPE: a single visit's grouping id + shared audit
// correlation. Each object dispatches its OWN command with INDEPENDENT
// validation; partial success is per-object; the session has NO lifecycle
// (structurally status-less — integrity invariant #9).
//
// SDC-2 dispatches ONE object (the forecast confirmation), so the envelope is
// degenerate but SHAPE-CORRECT: the recorder collects each attempted object +
// its dispatch correlationId, and `envelope()` folds them into the SDC-0
// SubmissionSession. SDC-3's additional objects (InventoryDeclaration,
// IncomingShipment) join by calling `attempt` more times — nothing re-couples.
//
// SDC-3a — THE SEAM, BUILT (adjudication ③, ANCHOR-CORRELATIONID mechanic):
// a multi-object visit dispatches N commands, each with its OWN minted
// correlationId. The FIRST command's correlationId is the session's audit
// ANCHOR; commands 2..n pass it as their `causationId` (via the now-public
// ICommandService.dispatch third arg) so their DR-10 events group with the
// first WITHOUT collapsing their own correlationId — the exact DR-10 meaning
// cascades already use. `causationAnchor()` hands the page that id after the
// first attempt; `auditCorrelationId` on the envelope is the SAME id, so the
// envelope's anchor and the event-stream grouping are one id by construction.
// A sessionId NEVER enters the event stream (it lives on the SubmissionSession
// object) — that would overload DR-10's causation semantics.
// ────────────────────────────────────────────────────────────────────────────

/** @import { SdcObjectKind, SubmissionObjectRef, SubmissionSession } from './types' */

/**
 * @typedef {object} SubmissionSessionRecorder
 * @property {string} sessionId
 * @property {(kind: SdcObjectKind, objectId: string, correlationId: string) => void} attempt -  Record one attempted object dispatch (kind + minted id + correlationId).
 * @property {() => string | null} causationAnchor The session's audit anchor — the FIRST attempted command's correlationId,
 *   or null before any attempt. Commands 2..n pass this as their `causationId`
 *   so the whole visit shares one DR-10 event group. Equals the envelope's
 *   `auditCorrelationId` by construction.
 * @property {() => SubmissionSession} envelope -  The immutable SDC-0 envelope for what was attempted together.
 */

/**
 * Open a submission-session recorder for one supplier visit. `openedAt` is
 * injected (the SDC selector convention — no ambient clock), as is the
 * sessionId (store/page-assigned).
 * @param {string} sessionId
 * @param {string} supplierId
 * @param {string} openedAt
 * @returns {SubmissionSessionRecorder}
 */
export function openSubmissionSession(sessionId, supplierId, openedAt) {
  /** @type {SubmissionObjectRef[]} */
  const attempted = [];
  let auditCorrelationId = '';

  return {
    sessionId,
    attempt(kind, objectId, correlationId) {
      attempted.push({ kind, objectId });
      // The first command's correlationId anchors the whole visit: it is the
      // envelope's audit id AND the causationId every later command passes
      // (SDC-3a seam — one id by construction).
      if (!auditCorrelationId) auditCorrelationId = correlationId;
    },
    causationAnchor() {
      return auditCorrelationId || null;
    },
    /** @returns {SubmissionSession} */
    envelope() {
      return Object.freeze({
        sessionId,
        supplierId,
        openedAt,
        auditCorrelationId,
        attempted: Object.freeze([...attempted])
      });
    }
  };
}
