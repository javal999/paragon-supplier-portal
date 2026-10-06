// ────────────────────────────────────────────────────────────────────────────
// FUX-D3 · THE WAREHOUSE-WEEK DECISION TARGET (MAT-R13).
//
// `entityId` IS `<stream>|<weekStart>` — the stream and week are never read
// from the payload.
//
//   · `readState` answers `Maintained` for any well-formed id: recording the
//     first decision of a week adds it; a malformed id is NOT_FOUND (the
//     `mrpController` shape).
//   · `readScopeOwner` is null: the decision is PTI's Material Planning team's,
//     so a supplier seat is denied at SCOPE on every id, real or not (§86).
//   · `applyTransition` APPENDS a record (MAT-R3). The plan version is the
//     stream's current published version, read here; `recordedAt` is the hub
//     clock and `recordedBy` the session's actor. None is read from the payload.
//
// It writes nothing else: no order, no call-off, no engine input.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
/** @import { WarehouseDecisionChoice } from '../../../transitions/warehouseDecisionRules' */
import {
  parseWarehouseDecisionId,
  warehouseDecisionRefusal
} from '../../../transitions/warehouseDecisionRules';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '../../../../context/noPerson';
import { warehouseDecisionStore } from '../stores/warehouseDecisionStore';
import { currentPlanVersion } from '../forecastReadModel';

/**
 * @param {unknown} v
 * @returns {string | null}
 */
const text = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

/** @type {CommandTarget} */
export const warehouseDecisionTarget = {
  readState: (id) => (parseWarehouseDecisionId(id) ? 'Maintained' : null),
  readScopeOwner: () => null,
  readEntity: (id) => {
    const key = parseWarehouseDecisionId(id);
    if (!key) return null;
    return warehouseDecisionStore
      .all()
      .filter((r) => r.stream === key.stream && r.weekStart === key.weekStart);
  },
  applyTransition: (id, _toState, payload, scope) => {
    const key = parseWarehouseDecisionId(id);
    // The policy hook has already refused every payload this could reject.
    if (!key || warehouseDecisionRefusal(payload.choice, payload.note) !== null) return;
    warehouseDecisionStore.add({
      stream: key.stream,
      weekStart: key.weekStart,
      choice: /** @type {WarehouseDecisionChoice} */ (payload.choice),
      note: text(payload.note),
      planVersion: currentPlanVersion(key.stream),
      recordedAt: sdcClock.now(),
      recordedBy: scope.actor ?? NO_PERSON
    });
  }
};

bindPolicyHook(POLICY_HOOKS.WAREHOUSE_DECISION_VALID, ({ payload }) => {
  const refusal = warehouseDecisionRefusal(payload.choice, payload.note);
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});
