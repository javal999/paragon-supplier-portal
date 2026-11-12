// ────────────────────────────────────────────────────────────────────────────
// REQ-E14-08 BR-05 (BL-235) · THE PROMOTION TARGET.
//
// `entityId` IS the ledger key (`promotionKey`).
//   · `readState` answers `Maintained` for a key whose SKU and week the demand
//     forecast run resolves; any other key is NOT_FOUND (the `ltpInput` shape).
//   · `readScopeOwner` is null: promotions are PTI's, so a supplier seat is
//     denied at SCOPE on every key (§86).
//   · `applyTransition` APPENDS a row; `setAt` (hub clock) and `setBy` (the
//     session's actor) are assigned here, never read from the payload.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import { parsePromotionKey, promotionRefusal, promotionsInForce } from '../../../engine/promotions';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { promotionStore } from '../stores/promotionStore';
import { currentDemandForecast } from '../demandForecastRun';

/** @param {string} id */
function resolved(id) {
  const k = parsePromotionKey(id);
  if (!k) return null;
  const run = currentDemandForecast();
  return run.skus.some((s) => s.skuCode === k.skuCode) && run.weeks.includes(k.weekStart)
    ? k
    : null;
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} payload
 */
const check = (id, payload) =>
  promotionRefusal(currentDemandForecast(), promotionStore.all(), id, payload);

/** @type {CommandTarget} */
export const promotionTarget = {
  readState: (id) => (resolved(id) ? 'Maintained' : null),
  readScopeOwner: () => null,
  readEntity: (id) => (resolved(id) ? { key: id } : null),
  applyTransition: (id, _toState, payload, scope) => {
    const k = resolved(id);
    // The policy hook has already refused every payload this could reject.
    if (!k || check(id, payload) !== null) return;
    const before = promotionsInForce(promotionStore.all()).get(id);
    const withdraw = payload.withdraw === true;
    promotionStore.append({
      key: id,
      skuCode: k.skuCode,
      weekStart: k.weekStart,
      status: withdraw ? 'Withdrawn' : 'Active',
      kind: withdraw
        ? null
        : /** @type {import('../../../engine/promotions').PromotionKind} */ (payload.kind),
      value: withdraw ? null : /** @type {number} */ (payload.value),
      previous:
        before && before.kind && before.value !== null
          ? { kind: before.kind, value: before.value }
          : null,
      setAt: sdcClock.now(),
      setBy: scope.actor ?? NO_PERSON
    });
  }
};

bindPolicyHook(POLICY_HOOKS.PROMOTION_VALID, ({ entityId, payload }) => {
  const refusal = check(entityId, payload);
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});
