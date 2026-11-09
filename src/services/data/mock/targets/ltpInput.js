// ────────────────────────────────────────────────────────────────────────────
// BL-267 (PEX-5) · THE LTP INPUT TARGET.
//
// `entityId` IS the ledger key (`ltpUploadKey` / `ltpChoiceKey`).
//   · `readState` answers `Maintained` for a well-formed key whose material the
//     masters resolve; any other key is NOT_FOUND (the `osipParam` shape).
//   · `readScopeOwner` is null: the inputs are PTI's, so a supplier seat is
//     denied at SCOPE on every key, real or not (§86).
//   · `applyTransition` APPENDS a row; `setAt` (hub clock) and `setBy` (the
//     session's actor) are assigned here, never read from the payload.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import {
  choiceInForce,
  ltpInputRefusal,
  parseLtpInputKey
} from '../../../transitions/ltpInputRules';
import { isKnownMaterial, sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { ltpInputStore } from '../stores/ltpInputStore';

/** @param {string} id */
function resolved(id) {
  const k = parseLtpInputKey(id);
  return k && isKnownMaterial(k.materialCode) ? k : null;
}

/** @type {CommandTarget} */
export const ltpInputTarget = {
  readState: (id) => (resolved(id) ? 'Maintained' : null),
  readScopeOwner: () => null,
  readEntity: (id) => (resolved(id) ? { key: id } : null),
  applyTransition: (id, _toState, payload, scope) => {
    const k = resolved(id);
    // The policy hook has already refused every payload this could reject.
    if (!k || ltpInputRefusal(k, payload) !== null) return;
    const base = {
      key: id,
      materialCode: k.materialCode,
      setAt: sdcClock.now(),
      setBy: scope.actor ?? NO_PERSON
    };
    if (k.kind === 'choice') {
      ltpInputStore.append({
        ...base,
        kind: 'choice',
        series: null,
        weeks: null,
        sourceFile: null,
        choice: /** @type {import('../../../transitions/ltpInputRules').LtpSeries} */ (
          payload.ltpChoice
        ),
        previousChoice: choiceInForce(ltpInputStore.all(), k.materialCode)
      });
      return;
    }
    ltpInputStore.append({
      ...base,
      kind: 'upload',
      series: k.series,
      weeks: /** @type {Record<string, number>} */ (payload.weeks),
      sourceFile: /** @type {string} */ (payload.sourceFile).trim(),
      choice: null,
      previousChoice: null
    });
  }
};

bindPolicyHook(POLICY_HOOKS.LTP_INPUT_VALID, ({ entityId, payload }) => {
  const k = parseLtpInputKey(entityId);
  if (!k) return { ok: false, reason: 'LTP_INPUT_UNKNOWN' };
  const refusal = ltpInputRefusal(k, payload);
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});
