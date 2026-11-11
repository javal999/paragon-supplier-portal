// ────────────────────────────────────────────────────────────────────────────
// REQ-E14-11 X-06 / BR-03 · THE FORECAST OVERRIDE TARGET (BL-114).
//
// Creation-only; `entityId` is the override's own id. Owner-less: an override
// is the Material Planning team's (ENG-D11), so every supplier is denied at
// SCOPE (§86), and a buyer seat without the `planning` lane is refused at the
// ROLE gate. The SKU, the week, the engine's value and the old value are read
// from the demand forecast run the page shows (`currentPromotedForecast`) and
// the ledger — the form supplies only the new value, the reason and the note.
// `recordedAt` is the hub clock and `recordedBy` the session's actor; neither
// is read from the payload.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import { NOTE_REQUIRED_CODE, isActiveReasonCode } from '../../../transitions/reasonCodes';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
/** @import { OverridePayload } from '../../../engine/forecastOverrides' */
import { OVERRIDE_REASON_LIST, overrideRefusal } from '../../../engine/forecastOverrides';
import { forecastOverrideStore } from '../stores/forecastOverrideStore';
import { currentPromotedForecast } from '../demandForecastRun';

/** @param {Record<string, unknown>} payload */
const check = (payload) =>
  overrideRefusal(
    currentPromotedForecast(),
    forecastOverrideStore.all(),
    /** @type {OverridePayload} */ (/** @type {unknown} */ (payload)),
    (code) => isActiveReasonCode(OVERRIDE_REASON_LIST, code),
    NOTE_REQUIRED_CODE
  );

/**
 * @param {unknown} v
 * @returns {string | null}
 */
const text = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

/** @type {CommandTarget} */
export const forecastOverrideTarget = {
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
    const run = currentPromotedForecast();
    const made = forecastOverrideStore.add({
      skuCode: res.cell.skuCode,
      weekStart: res.cell.weekStart,
      engineValue: res.cell.engineValue,
      oldValue: res.cell.oldValue,
      newValue: /** @type {number} */ (payload.newValue),
      reasonCode: text(payload.reasonCode),
      note: text(payload.note),
      runWeek: run.weeks[0],
      recordedAt: sdcClock.now(),
      recordedBy: scope.actor ?? NO_PERSON
    });
    return { entityId: made.id };
  }
};

bindPolicyHook(POLICY_HOOKS.FORECAST_OVERRIDE_VALID, ({ payload }) => {
  const res = check(payload);
  return 'refusal' in res ? { ok: false, reason: res.refusal } : { ok: true };
});
