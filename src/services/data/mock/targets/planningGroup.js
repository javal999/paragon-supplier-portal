// ────────────────────────────────────────────────────────────────────────────
// Material C5 · THE PLANNING GROUP TARGET (MR-8 BR-01 to BR-05; plan AD-5, AR-15).
//
//   · `readState` answers from the resolved groups, so a default group
//     (`pg-<materialGroup>`) is `Active` with no creation behind it.
//   · `readScopeOwner` is null: planning groups are PTI master data, and no
//     supplier may act on them (§86 — null denies every supplier scope).
//   · `create` mints `pg-NNNN` and appends a `created` row; `applyTransition`
//     branches on the transition id (RFx AR-01) and appends a row. The move
//     also writes each material's `planningGroupId` into the material overlay
//     (A2), which is what makes a material's group single-valued (AC-04).
//     Times are the hub clock; the actor is the session's, never the payload.
//   · The hook reads every field the payload carries, so a stray field is
//     checked, never skipped.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import { planningGroupRefusal } from '../../../transitions/planningGroupRules';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
/** @import { ActorAttribution } from '@lib/enforcement' */
import { planningGroupStore } from '../stores/planningGroupStore';
import { materialOverlayStore } from '../stores/materialOverlayStore';
import {
  planningGroupById,
  planningGroupMaterial,
  planningGroupWorld
} from '../planningGroupReadModel';

const STATE = /** @type {const} */ ({ active: 'Active', retired: 'Retired' });

/**
 * @param {unknown} v
 * @returns {string}
 */
const trimmed = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * The overlay row's `setBy` is a string: the actor, as recorded.
 * @param {ActorAttribution} a
 * @returns {string}
 */
const actorText = (a) => (a.kind === 'RESOLVED' ? a.person.personId : `UNATTRIBUTED:${a.reason}`);

/**
 * @param {unknown} v
 * @returns {string[]}
 */
const codesOf = (v) => (Array.isArray(v) ? v.map(String) : []);

/** @type {CommandTarget} */
export const planningGroupTarget = {
  readState: (id) => {
    const g = planningGroupById(id);
    return g ? STATE[g.state] : null;
  },
  readScopeOwner: () => null,
  readEntity: (id) => planningGroupById(id),
  creationOwner: () => null,
  create: (payload, _toState, scope) => {
    const groupId = planningGroupStore.nextId();
    planningGroupStore.append({
      kind: 'created',
      groupId,
      name: trimmed(payload.name),
      sapMaterialGroup: String(payload.sapMaterialGroup),
      at: sdcClock.now(),
      by: scope.actor ?? NO_PERSON
    });
    return { entityId: groupId };
  },
  applyTransition: (id, _toState, payload, scope, transitionId) => {
    const at = sdcClock.now();
    const by = scope.actor ?? NO_PERSON;
    if (transitionId === 't_planninggroup_rename') {
      planningGroupStore.append({
        kind: 'renamed',
        groupId: id,
        name: trimmed(payload.name),
        at,
        by
      });
    } else if (transitionId === 't_planninggroup_retire') {
      planningGroupStore.append({ kind: 'retired', groupId: id, at, by });
    } else if (transitionId === 't_planninggroup_move_materials') {
      const codes = codesOf(payload.materialCodes);
      const fromGroupIds = [
        ...new Set(
          codes
            .map((c) => planningGroupMaterial(c)?.planningGroupId)
            .filter(/** @returns {g is string} */ (g) => !!g)
        )
      ].sort();
      for (const materialCode of codes) {
        materialOverlayStore.append({
          materialCode,
          planningGroupId: id,
          setAt: at,
          setBy: actorText(by)
        });
      }
      planningGroupStore.append({
        kind: 'moved',
        groupId: id,
        fromGroupIds,
        materialCodes: codes,
        at,
        by
      });
    }
  }
};

bindPolicyHook(
  POLICY_HOOKS.PLANNING_GROUP_VALID,
  ({ entityId, currentState, toState, payload }) => {
    const world = planningGroupWorld();
    /** @param {ReturnType<typeof planningGroupRefusal>} r */
    const refuse = (r) =>
      r ? { ok: /** @type {const} */ (false), reason: `${r.code}: ${r.detail}` } : null;
    // A creation has no current state.
    if (currentState === '') {
      return (
        refuse(
          planningGroupRefusal(
            { kind: 'create', name: payload.name, sapMaterialGroup: payload.sapMaterialGroup },
            world
          )
        ) ?? { ok: true }
      );
    }
    const group = planningGroupById(entityId);
    if (!group) return { ok: false, reason: `UNKNOWN_GROUP: ${entityId}` };
    if (toState === STATE.retired) {
      return refuse(planningGroupRefusal({ kind: 'retire', group }, world)) ?? { ok: true };
    }
    if ('name' in payload) {
      const r = refuse(planningGroupRefusal({ kind: 'rename', name: payload.name }, world));
      if (r) return r;
    }
    if ('materialCodes' in payload) {
      const r = refuse(
        planningGroupRefusal({ kind: 'move', group, materialCodes: payload.materialCodes }, world)
      );
      if (r) return r;
    }
    return { ok: true };
  }
);
