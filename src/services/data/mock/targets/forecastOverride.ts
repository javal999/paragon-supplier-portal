// ────────────────────────────────────────────────────────────────────────────
// REQ-E14-11 X-06 / BR-03 · THE FORECAST OVERRIDE TARGET (BL-114).
//
// Creation-only; `entityId` is the override's own id. Owner-less: an override
// is the Material Planning team's (ENG-D11), so every supplier is denied at
// SCOPE (§86), and a buyer seat without the `planning` lane is refused at the
// ROLE gate. The SKU, the week, the engine's value and the old value are read
// from the demand forecast run the page shows (`currentDemandForecast`) and
// the ledger — the form supplies only the new value, the reason and the note.
// `recordedAt` is the hub clock and `recordedBy` the session's actor; neither
// is read from the payload.
// ────────────────────────────────────────────────────────────────────────────

import { bindPolicyHook, POLICY_HOOKS, type CommandTarget } from '../../../transitions';
import { NOTE_REQUIRED_CODE, isActiveReasonCode } from '../../../transitions/reasonCodes';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '../../../../context/noPerson';
import { OVERRIDE_REASON_LIST, overrideRefusal, type OverridePayload } from '../../../engine/forecastOverrides';
import { forecastOverrideStore } from '../stores/forecastOverrideStore';
import { currentDemandForecast } from '../demandForecastRun';

const check = (payload: Record<string, unknown>) =>
  overrideRefusal(
    currentDemandForecast(),
    forecastOverrideStore.all(),
    payload as unknown as OverridePayload,
    (code) => isActiveReasonCode(OVERRIDE_REASON_LIST, code),
    NOTE_REQUIRED_CODE,
  );

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

export const forecastOverrideTarget: CommandTarget = {
  readState: (id) => (forecastOverrideStore.get(id) ? 'Recorded' : null),
  readScopeOwner: () => null,
  readEntity: (id) => forecastOverrideStore.get(id) ?? null,
  applyTransition: () => {
    /* no-op — an override is recorded once; a later one is a new record */
  },
  creationOwner: () => null,
  create: (payload, _toState, scope) => {
    // The policy hook has already refused every payload this could reject.
    const res = check(payload);
    if ('refusal' in res) throw new Error(res.refusal);
    const run = currentDemandForecast();
    const made = forecastOverrideStore.add({
      skuCode: res.cell.skuCode,
      weekStart: res.cell.weekStart,
      engineValue: res.cell.engineValue,
      oldValue: res.cell.oldValue,
      newValue: payload.newValue as number,
      reasonCode: text(payload.reasonCode),
      note: text(payload.note),
      runWeek: run.weeks[0],
      recordedAt: sdcClock.now(),
      recordedBy: scope.actor ?? NO_PERSON,
    });
    return { entityId: made.id };
  },
};

bindPolicyHook(POLICY_HOOKS.FORECAST_OVERRIDE_VALID, ({ payload }) => {
  const res = check(payload);
  return 'refusal' in res ? { ok: false, reason: res.refusal } : { ok: true };
});
