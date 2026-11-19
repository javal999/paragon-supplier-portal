// ────────────────────────────────────────────────────────────────────────────
// PSC-4 BR-07 (BL-339) · THE EVENT CALENDAR TARGET (CNY and Typhoon).
//
// `entityId` IS the event key (`<kind>|<startsOn>`, `eventKey`).
//   · `readState` answers `Maintained` for a well-formed key; any other key is
//     NOT_FOUND (the `workingCalendar` shape).
//   · `readScopeOwner` is null: the calendar is PTI's, so a supplier seat is
//     denied at SCOPE on every key, real or not (§86).
//   · `applyTransition` APPENDS a row; `setAt` (hub clock) and `setBy` (the
//     session's actor) are assigned here, never read from the payload.
//   · BR-10 / DRC-D16 — the change is recorded with the ROP Order figure's
//     stored inputs and rules version, and writes no DA version (Q2).
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import { eventKey, eventRefusal, parseEventKey } from '../../../transitions/eventCalendarRules';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { eventCalendarStore } from '../../../transitions/eventCalendarStore';
import { recordRopOnlyChange } from '../ropOrderAudit';

/** @param {string} id */
const resolved = (id) => (parseEventKey(id) !== null ? id : null);

/** @type {CommandTarget} */
export const eventCalendarTarget = {
  readState: (id) => (resolved(id) ? 'Maintained' : null),
  readScopeOwner: () => null,
  readEntity: (id) => {
    if (!resolved(id)) return null;
    const rows = eventCalendarStore.inForce().filter((r) => r.id === id);
    return rows.length > 0 ? rows[rows.length - 1] : { id };
  },
  applyTransition: (id, _toState, payload, scope) => {
    const key = parseEventKey(id);
    // The policy hook has already refused every payload this could reject.
    if (!key || eventRefusal(payload) !== null) return;
    const kind =
      /** @type {import('../../../transitions/eventCalendarRules').MaterialBufferEventKind} */ (
        payload.kind
      );
    const startsOn = String(payload.startsOn);
    const endsOn = String(payload.endsOn);
    const reason = String(payload.reason).trim();
    eventCalendarStore.append({
      id: eventKey(kind, startsOn),
      kind,
      startsOn,
      endsOn,
      reason,
      setAt: sdcClock.now(),
      setBy: scope.actor ?? NO_PERSON
    });
    // PSC-4 BR-10 — ROP Order only: the audit record, no DA version.
    recordRopOnlyChange({
      key: eventKey(kind, startsOn),
      field: 'eventWindow',
      value: null,
      reason,
      materialCode: null,
      scope,
      extraInputs: { eventId: eventKey(kind, startsOn), kind, startsOn, endsOn }
    });
  }
};

// The same predicate the admin page's form calls (`eventRefusal`).
bindPolicyHook(POLICY_HOOKS.EVENT_CALENDAR_VALID, ({ entityId, payload }) => {
  const key = parseEventKey(entityId);
  if (!key) return { ok: false, reason: 'EVENT_KEY_INVALID' };
  if (payload.kind !== key.kind || payload.startsOn !== key.startsOn)
    return { ok: false, reason: 'EVENT_KEY_MISMATCH: the key names another window' };
  const refusal = eventRefusal(payload);
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});
