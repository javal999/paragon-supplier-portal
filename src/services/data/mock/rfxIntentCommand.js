// ────────────────────────────────────────────────────────────────────────────
// BL-132 (RFx UX S-13) — the write side of intent on an RFI and an RFP: the
// two command targets and the two policy bindings, as `rfqEngagementCommand`
// does it for the RFQ.
//
// Imported by `MockCommandService`, which registers the targets in `TARGETS`;
// importing this module binds the policies (side effect).
//
// Every judgement is a pure function in `sourcing/rfxIntent.js`. This module
// only gathers the facts from the stores, so the page and the verb cannot
// disagree (RFX-R2).
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../transitions';
import {
  rfiEventStore,
  rfiIntentStore,
  rfiResponseStore,
  rfpEventStore,
  rfpIntentStore,
  rfpResponseStore,
  rfxIntentOf
} from './stores/rfxStores';
import { rfxNow } from './rfxReadModel';
/** @import { RfxIntentRecord } from '../../sourcing/rfxIntent' */
import { rfxDeclinedRefusal, rfxIntentRefusal, rfxIntentState } from '../../sourcing/rfxIntent';
/** @import { RfqDeclineReason } from '../../sourcing/rfqModel' */
/** @import { RfiResponse, RfpResponse } from '../../sourcing/types' */

/**
 * @param {Record<string, unknown>} payload
 * @param {string} k
 * @returns {string}
 */
const str = (payload, k) =>
  typeof payload[k] === 'string' ? /** @type {string} */ (payload[k]) : '';

/**
 * The facts one event type brings: its stores and the payload key that names it.
 * @typedef {{
 *   readonly kind: 'rfi' | 'rfp';
 *   readonly eventKey: 'rfiId' | 'rfpId';
 *   readonly intents: typeof rfiIntentStore;
 *   readonly event: (id: string) => import('../../sourcing/rfxIntent').RfxIntentEvent | undefined;
 *   readonly submitted: (eventId: string, supplierId: string) => boolean;
 * }} IntentKind
 */

/** @type {IntentKind} */
const RFI = {
  kind: 'rfi',
  eventKey: 'rfiId',
  intents: rfiIntentStore,
  event: (id) => rfiEventStore.get(id),
  submitted: (eventId, supplierId) =>
    rfiResponseStore
      .all()
      .some((r) => r.rfiId === eventId && r.supplierId === supplierId && r.status === 'Submitted')
};

/** @type {IntentKind} */
const RFP = {
  kind: 'rfp',
  eventKey: 'rfpId',
  intents: rfpIntentStore,
  event: (id) => rfpEventStore.get(id),
  submitted: (eventId, supplierId) =>
    rfpResponseStore
      .all()
      .some((r) => r.rfpId === eventId && r.supplierId === supplierId && r.status === 'Submitted')
};

/**
 * One intent target per event type, identical in shape to `rfqIntentTarget`.
 * @param {IntentKind} kind
 * @returns {CommandTarget}
 */
const intentTarget = (kind) => ({
  readState: (id) => {
    const r = kind.intents.get(id);
    return r ? rfxIntentState(r) : null;
  },
  readScopeOwner: (id) => kind.intents.get(id)?.supplierId ?? null,
  readEntity: (id) => kind.intents.get(id) ?? null,
  // The one update is the withdraw: "I will respond" becomes a decline, with
  // the reason and words the policy has already judged. The time it first
  // said yes is kept as `respondedAt`.
  applyTransition: (id, _toState, payload) => {
    kind.intents.update(id, (r) => ({
      id: r.id,
      eventId: r.eventId,
      supplierId: r.supplierId,
      intent: 'decline',
      reason: /** @type {RfqDeclineReason} */ (payload.reason),
      text: String(payload.text).trim(),
      at: rfxNow(),
      respondedAt: r.at
    }));
  },
  // The owner is the supplier the payload names, and ONLY when it is invited
  // to the event named beside it: an uninvited supplier, or one naming another
  // supplier's id, is refused at scope.
  requireCreationOwner: true,
  creationOwner: (payload) => {
    const event = kind.event(str(payload, kind.eventKey));
    const sid = str(payload, 'supplierId');
    return event && event.invitees.some((i) => i.supplierId === sid) ? sid : null;
  },
  create: (payload, toState) => {
    const id = kind.intents.nextId();
    const base = {
      id,
      eventId: str(payload, kind.eventKey),
      supplierId: str(payload, 'supplierId'),
      at: rfxNow()
    };
    /** @type {RfxIntentRecord} */
    const row =
      toState === 'Responding'
        ? { ...base, intent: 'respond' }
        : {
            ...base,
            intent: 'decline',
            reason: /** @type {RfqDeclineReason} */ (payload.reason),
            text: str(payload, 'text').trim()
          };
    kind.intents.add(row);
    return { entityId: id };
  }
});

export const rfiIntentTarget = intentTarget(RFI);
export const rfpIntentTarget = intentTarget(RFP);

// BL-132 — `rfx_intent_valid`, bound once for both targets: the target tells
// the binding which event type it is judging.
bindPolicyHook(
  POLICY_HOOKS.RFX_INTENT_VALID,
  ({ payload, entityId, toState, currentState, target }) => {
    const kind = target === rfpIntentTarget ? RFP : RFI;
    // A withdraw names the record; a creation names the event and the supplier.
    const existingRow = entityId ? kind.intents.get(entityId) : undefined;
    const eventId = existingRow?.eventId ?? str(payload, kind.eventKey);
    const supplierId = existingRow?.supplierId ?? str(payload, 'supplierId');
    const act =
      currentState === 'Responding' ? 'withdraw' : toState === 'Responding' ? 'respond' : 'decline';
    const reason = rfxIntentRefusal({
      kind: kind.kind,
      event: kind.event(eventId),
      supplierId,
      act,
      reason: payload.reason,
      text: payload.text,
      existing: rfxIntentOf(kind.intents, eventId, supplierId),
      submitted: kind.submitted(eventId, supplierId),
      nowIso: rfxNow()
    });
    return reason ? { ok: false, reason } : { ok: true };
  }
);

// BL-132 — `rfx_response_not_declined`, on the RFI and RFP response save,
// submit and revise. The save names the event in its payload; submit and
// revise name the stored response, which names it.
bindPolicyHook(POLICY_HOOKS.RFX_RESPONSE_NOT_DECLINED, ({ payload, target, entityId }) => {
  const stored = entityId
    ? /** @type {RfiResponse | RfpResponse | null} */ (target.readEntity(entityId))
    : null;
  if (entityId && !stored) return { ok: false, reason: 'response not found' };
  const supplierId = stored ? stored.supplierId : str(payload, 'supplierId');
  const isRfi = stored ? 'rfiId' in stored : payload.rfiId !== undefined;
  const kind = isRfi ? RFI : RFP;
  const eventId = stored
    ? 'rfiId' in stored
      ? stored.rfiId
      : stored.rfpId
    : str(payload, kind.eventKey);
  const reason = rfxDeclinedRefusal(
    rfxIntentOf(kind.intents, eventId, supplierId),
    supplierId,
    kind.event(eventId)?.eventNumber ?? eventId
  );
  return reason ? { ok: false, reason } : { ok: true };
});
