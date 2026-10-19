// ────────────────────────────────────────────────────────────────────────────
// BL-132 (RFx UX S-13, finding F-13) — intent to respond, and a decline with
// a reason, on the RFI and the RFP, as the RFQ has (`rfqResponse.js`
// `intentRefusal`).
//
// The supplier's first answer to an RFI or RFP invitation: "I will respond",
// or a decline with a reason from the RFQ's list and words of its own. The
// buyer reads both on the invitee table, so a silent invitee and a supplier
// that said no are no longer the same row.
//
// The rules mirror the RFQ's one for one:
//   · one intent per invitee per event; a second respond or decline is refused
//   · "I will respond" may become a decline (`withdraw`) until the response is
//     submitted; a decline is final, as on the RFQ
//   · a declined supplier cannot save, submit or revise a response
//     (`rfxDeclinedRefusal`, read by the response verbs and by the page)
//
// Pure functions only: the command module gathers the facts and the page
// calls the same functions (RFX-R2).
// ────────────────────────────────────────────────────────────────────────────

/** @import { RfqDeclineReason } from './rfqModel' */
/** @import { RfxInvitee } from './types' */
import { RFQ_DECLINE_REASONS } from './rfqModel';
import { effectiveDeadline, isPastDeadline } from '../transitions/rfxRules';

/**
 * The decline reasons. The RFQ's list, so the buyer reads one vocabulary
 * across the three event types.
 * @type {readonly RfqDeclineReason[]}
 */
export const RFX_DECLINE_REASONS = RFQ_DECLINE_REASONS;

/**
 * An intent on an RFI or RFP as the store keeps it. `eventId` names the RFI or
 * the RFP (the store says which). A withdrawn "respond" keeps the time it was
 * first stated as `respondedAt`.
 *
 * @typedef {| {
 *       readonly id: string;
 *       readonly eventId: string;
 *       readonly supplierId: string;
 *       readonly intent: 'respond';
 *       readonly at: string;
 *     }
 *   | {
 *       readonly id: string;
 *       readonly eventId: string;
 *       readonly supplierId: string;
 *       readonly intent: 'decline';
 *       readonly reason: RfqDeclineReason;
 *       readonly text: string;
 *       readonly at: string;
 *       readonly respondedAt?: string;
 *     }} RfxIntentRecord
 */

/**
 * One invitee's intent as a reader sees it: the record without its event key.
 * `intentId` is what a withdraw names.
 *
 * @typedef {| { readonly intentId: string; readonly intent: 'respond'; readonly at: string }
 *   | {
 *       readonly intentId: string;
 *       readonly intent: 'decline';
 *       readonly reason: RfqDeclineReason;
 *       readonly text: string;
 *       readonly at: string;
 *       readonly respondedAt?: string;
 *     }} RfxIntentView
 */

/**
 * The state of an intent, DERIVED from the record's `intent` field.
 * @param {Pick<RfxIntentRecord, 'intent'>} r
 * @returns {'Responding' | 'Declined'}
 */
export const rfxIntentState = (r) => (r.intent === 'respond' ? 'Responding' : 'Declined');

/**
 * @param {RfxIntentRecord} r
 * @returns {RfxIntentView}
 */
export const rfxIntentView = (r) => {
  const { id, eventId: _e, supplierId: _s, ...rest } = r;
  return { intentId: id, ...rest };
};

/**
 * What the intent rule reads of an RFI or RFP event.
 * @typedef {{
 *   readonly eventNumber: string;
 *   readonly status: string;
 *   readonly responseDeadline: string;
 *   readonly invitees: readonly RfxInvitee[];
 * }} RfxIntentEvent
 */

/**
 * `act`:        respond, decline, or withdraw (a decline after "I will respond").
 * `existing`:   The intent this supplier already stated on this event, if any.
 * `submitted`:  True when this supplier's response to the event is Submitted.
 *
 * @typedef {{
 *   readonly event: RfxIntentEvent | undefined;
 *   readonly supplierId: string;
 *   readonly act: 'respond' | 'decline' | 'withdraw';
 *   readonly reason?: unknown;
 *   readonly text?: unknown;
 *   readonly existing?: Pick<RfxIntentRecord, 'intent'>;
 *   readonly submitted: boolean;
 *   readonly nowIso: string;
 * }} RfxIntentInput
 */

/**
 * @param {unknown} v
 * @returns {v is string}
 */
const hasText = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * Why an intent on an RFI or RFP is refused, or `null`. The RFQ's
 * `intentRefusal`, over an RFx event: invited, the event Open and inside the
 * deadline in force for this supplier, one intent per invitee, a decline with a
 * listed reason and words, and no decline once the response is submitted (a
 * sent response from a supplier that says it is not answering).
 * @param {RfxIntentInput} input
 * @returns {string | null}
 */
export function rfxIntentRefusal(input) {
  const { event, supplierId } = input;
  if (!event) return 'EVENT_NOT_FOUND: the event could not be found';
  if (!event.invitees.some((i) => i.supplierId === supplierId)) {
    return `NOT_INVITED: ${supplierId} is not invited to ${event.eventNumber}`;
  }
  if (event.status !== 'Open') return `EVENT_NOT_OPEN: ${event.eventNumber} is ${event.status}`;
  const deadline = effectiveDeadline(event.responseDeadline, event.invitees, supplierId);
  if (isPastDeadline(deadline, input.nowIso)) {
    return `PAST_DEADLINE: responses closed on ${deadline}`;
  }
  if (input.act === 'withdraw') {
    if (input.existing?.intent !== 'respond') {
      return 'NOT_RESPONDING: only a stated "I will respond" can be withdrawn';
    }
  } else if (input.existing) {
    return `INTENT_ALREADY_STATED: ${supplierId} already answered ${event.eventNumber}`;
  }
  if (input.act === 'respond') return null;
  if (!RFX_DECLINE_REASONS.includes(/** @type {RfqDeclineReason} */ (input.reason))) {
    return `DECLINE_REASON_UNKNOWN: ${String(input.reason)} is not a decline reason on the list`;
  }
  if (!hasText(input.text)) return 'DECLINE_TEXT_MISSING: a decline says why in words as well';
  if (input.submitted) {
    return 'RESPONSE_ALREADY_SENT: a supplier with a submitted response cannot decline the event';
  }
  return null;
}

/**
 * Why a response verb (save, submit, revise) is refused because this supplier
 * declined the event, or `null`. The RFQ's `INTENT_DECLINED` on the quote.
 * @param {Pick<RfxIntentRecord, 'intent'> | undefined} intent
 * @param {string} supplierId
 * @param {string} eventNumber
 * @returns {string | null}
 */
export const rfxDeclinedRefusal = (intent, supplierId, eventNumber) =>
  intent?.intent === 'decline' ? `INTENT_DECLINED: ${supplierId} declined ${eventNumber}` : null;
