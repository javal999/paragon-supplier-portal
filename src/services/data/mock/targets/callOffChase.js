// ────────────────────────────────────────────────────────────────────────────
// AIB-3 (BL-351) · THE MISSING-ASN CHASE TARGET.
//
// `entityId` IS the call-off id — one chase per call-off.
//
//   · `readState` answers `Open` only while the chase is DUE and unresolved: a
//     call-off sent one working day ago with no covering ASN, not closed. A
//     chase that has not fired yet, is covered by ASNs, was received or was
//     missed has NO entity (`null`), so closing it is NOT_FOUND rather than a
//     record about nothing.
//   · `readScopeOwner` is the call-off's supplier — the truth of who owns the
//     chase. Closing one is still the planner's act (AIB-3 BR-01): the
//     `calloffchase:close` atom lives in the planning lane only, so a supplier
//     seat is refused at the ROLE gate.
//   · `readEntity` is the derived row, for the policy hooks to inspect.
//   · `applyTransition` APPENDS the closure: the reason from the payload; the
//     time (hub clock) and the actor (the session's) assigned here. The chase
//     itself is never stored — it is derived at read.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import { callOffChaseRow } from '../../../transitions/callOffChase';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { callOffStore } from '../stores/callOffStore';
import { asnStore } from '../stores/asnStore';
import { goodsReceiptStore } from '../stores/goodsReceiptStore';
import { callOffChaseStore } from '../stores/callOffChaseStore';

/**
 * The chase row as the stores hold it now, or null when the call-off has none.
 * @param {string} callOffId
 */
const rowFor = (callOffId) =>
  callOffChaseRow(
    callOffId,
    callOffStore.all(),
    asnStore.all(),
    goodsReceiptStore.all(),
    callOffChaseStore.all(),
    sdcClock.now()
  );

/** @type {CommandTarget} */
export const callOffChaseTarget = {
  readState: (callOffId) => {
    const row = rowFor(callOffId);
    if (!row) return null;
    if (row.state === 'closed') return 'Closed';
    // A chase that has not fired, or is covered, is not an entity yet: a close
    // is refused rather than recorded against a chase nobody was given.
    return row.state === 'open' ? 'Open' : null;
  },
  readScopeOwner: (callOffId) => callOffStore.get(callOffId)?.supplierId ?? null,
  readEntity: (callOffId) => rowFor(callOffId),
  applyTransition: (callOffId, _toState, payload, scope) => {
    // The policy hook has already refused a blank reason.
    callOffChaseStore.append({
      callOffId,
      reason: String(payload.closeReason).trim(),
      closedAt: sdcClock.now(),
      closedBy: scope.actor ?? NO_PERSON
    });
  }
};

// AIB-3 BR-01 — the reason is SUBSTANCE, not presence: `requiredFields` proves
// the key is there, `isEmpty('   ')` is false, so this is what refuses the
// space bar. The same guard `PR_REJECT_REASON_AUTHORED` applies, one entity over.
bindPolicyHook(POLICY_HOOKS.CHASE_CLOSE_REASON_AUTHORED, ({ payload }) => {
  const value = payload.closeReason;
  if (typeof value !== 'string') {
    return { ok: false, reason: `closeReason must be text, got ${typeof value}` };
  }
  if (value.trim() === '') {
    return {
      ok: false,
      reason:
        'closeReason is blank — closing the missing-ASN chase must say why, or the ' +
        'record the planner acts on is erased with nothing in its place'
    };
  }
  return { ok: true };
});
