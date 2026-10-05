// ────────────────────────────────────────────────────────────────────────────
// PLANNING GROUPS — THE RULES (Material C5 · MR-8 BR-01 to BR-05; plan AR-15).
//
// A planning group is a set of materials that share capacity at a supplier,
// under exactly 1 SAP material group. Until Material Planning splits an SAP
// group it has 1 default planning group, `pg-<materialGroup>`, holding the same
// materials, so capacity reads exactly as it did per SAP group (BR-02).
//
// Membership is NOT stored here: a material's group is its `planningGroupId`,
// resolved by `materialEntry` from the material overlay (A2). A move writes
// that overlay, so a material cannot be in 2 groups (AC-04). What the planning
// group store holds is the governed log of changes (created, renamed, moved,
// retired), append-only (MAT-R3); the groups themselves are derived from it.
//
// These are the pure halves (MAT-R2): the refusal the `PLANNING_GROUP_VALID`
// hook and the admin page's pre-check both call, the resolver, and the
// "Needs re-entry" derivation capacity reads.
// ────────────────────────────────────────────────────────────────────────────

/** @import { PlanningGroupEvent, PlanningGroupView } from '../data/types' */
import { addDays, dayOf } from './inventoryRules';

/** A material as the resolver needs it: its SAP group and its planning group now. */
/**
 * @typedef {object} PlanningGroupMaterial
 * @property {string} materialCode
 * @property {string} sapMaterialGroup
 * @property {string} planningGroupId
 */

/**
 * Every planning group: 1 default per SAP group that has materials, plus every
 * group Material Planning created, with renames and retirements applied and the
 * materials each holds now. Sorted by SAP group, default first, then name.
 * @param {readonly PlanningGroupEvent[]} events
 * @param {readonly PlanningGroupMaterial[]} materials
 * @param {(sapMaterialGroup: string) => string} defaultIdOf
 * @returns {PlanningGroupView[]}
 */
export function resolvePlanningGroups(events, materials, defaultIdOf) {
  const groups =
    /** @type {Map<string, { base: Omit<PlanningGroupView, 'materials' | 'history'>; history: PlanningGroupEvent[] }>} */ (
      new Map()
    );
  for (const sap of [...new Set(materials.map((m) => m.sapMaterialGroup))].sort()) {
    const id = defaultIdOf(sap);
    groups.set(id, {
      base: {
        id,
        name: sap,
        sapMaterialGroup: sap,
        state: 'active',
        createdBy: null,
        createdAt: null,
        isDefault: true,
        named: false
      },
      history: []
    });
  }
  for (const e of events) {
    if (e.kind === 'created') {
      if (groups.has(e.groupId)) continue;
      groups.set(e.groupId, {
        base: {
          id: e.groupId,
          name: e.name,
          sapMaterialGroup: e.sapMaterialGroup,
          state: 'active',
          createdBy: e.by,
          createdAt: e.at,
          isDefault: false,
          named: true
        },
        history: [e]
      });
      continue;
    }
    const g = groups.get(e.groupId);
    if (!g) continue;
    g.history.push(e);
    if (e.kind === 'renamed') g.base = { ...g.base, name: e.name, named: true };
    if (e.kind === 'retired') g.base = { ...g.base, state: 'retired' };
    if (e.kind === 'moved') {
      // The groups the materials left carry the move in their history too.
      for (const from of e.fromGroupIds) {
        const src = groups.get(from);
        if (src && from !== e.groupId) src.history.push(e);
      }
    }
  }
  return [...groups.values()]
    .map(({ base, history }) => ({
      ...base,
      materials: materials
        .filter((m) => m.planningGroupId === base.id)
        .map((m) => m.materialCode)
        .sort(),
      history
    }))
    .sort(
      (a, b) =>
        a.sapMaterialGroup.localeCompare(b.sapMaterialGroup) ||
        Number(b.isDefault) - Number(a.isDefault) ||
        a.name.localeCompare(b.name)
    );
}

/** The named refusals of `PLANNING_GROUP_VALID`. */
/**
 * @typedef {| 'NAME_REQUIRED'
 *   | 'UNKNOWN_SAP_GROUP'
 *   | 'NO_MATERIALS'
 *   | 'UNKNOWN_MATERIAL'
 *   | 'MIXED_SAP_GROUP'
 *   | 'ALREADY_IN_GROUP'
 *   | 'RETIRE_NOT_EMPTY'} PlanningGroupRefusalCode
 */

/** What one planning-group verb asks for. */
/**
 * @typedef {| { readonly kind: 'create'; readonly name: unknown; readonly sapMaterialGroup: unknown }
 *   | { readonly kind: 'rename'; readonly name: unknown }
 *   | { readonly kind: 'move'; readonly group: Pick<PlanningGroupView, 'id' | 'sapMaterialGroup'>; readonly materialCodes: unknown }
 *   | { readonly kind: 'retire'; readonly group: Pick<PlanningGroupView, 'id' | 'materials'> }} PlanningGroupRequest
 */

/** What the rule reads about the world, injected so page and hook share it. */
/**
 * @typedef {object} PlanningGroupWorld
 * @property {readonly string[]} sapGroups
 * @property {(materialCode: string) => PlanningGroupMaterial | null} material
 */

/**
 * @param {unknown} v
 * @returns {boolean}
 */
const isBlank = (v) => typeof v !== 'string' || v.trim() === '';

/**
 * Why a planning-group verb would be refused, or null (MR-8 BR-01, BR-03, AC-04).
 *   NAME_REQUIRED     — create or rename with a blank name.
 *   UNKNOWN_SAP_GROUP — create under an SAP group that has no materials.
 *   NO_MATERIALS      — a move naming no material.
 *   UNKNOWN_MATERIAL  — a move naming a code the material master does not hold.
 *   MIXED_SAP_GROUP   — a move that would put a material of another SAP group in the group.
 *   ALREADY_IN_GROUP  — a move of a material that is already in the group.
 *   RETIRE_NOT_EMPTY  — retiring a group that still holds materials.
 * @param {PlanningGroupRequest} request
 * @param {PlanningGroupWorld} world
 * @returns {{ code: PlanningGroupRefusalCode; detail: string } | null}
 */
export function planningGroupRefusal(request, world) {
  switch (request.kind) {
    case 'create':
      if (isBlank(request.name))
        return { code: 'NAME_REQUIRED', detail: 'a planning group needs a name' };
      if (
        typeof request.sapMaterialGroup !== 'string' ||
        !world.sapGroups.includes(request.sapMaterialGroup)
      ) {
        return {
          code: 'UNKNOWN_SAP_GROUP',
          detail: `${String(request.sapMaterialGroup)} is not an SAP material group with materials`
        };
      }
      return null;
    case 'rename':
      return isBlank(request.name)
        ? { code: 'NAME_REQUIRED', detail: 'a planning group needs a name' }
        : null;
    case 'move': {
      const codes = request.materialCodes;
      if (!Array.isArray(codes) || codes.length === 0)
        return { code: 'NO_MATERIALS', detail: 'choose at least 1 material to move' };
      for (const raw of codes) {
        const code = String(raw);
        const m = world.material(code);
        if (!m)
          return { code: 'UNKNOWN_MATERIAL', detail: `${code} is not in the material master` };
        if (m.sapMaterialGroup !== request.group.sapMaterialGroup) {
          return {
            code: 'MIXED_SAP_GROUP',
            detail: `${code} is in SAP group ${m.sapMaterialGroup}, and ${request.group.id} is under ${request.group.sapMaterialGroup}`
          };
        }
        if (m.planningGroupId === request.group.id)
          return { code: 'ALREADY_IN_GROUP', detail: `${code} is already in ${request.group.id}` };
      }
      return null;
    }
    case 'retire':
      return request.group.materials.length > 0
        ? {
            code: 'RETIRE_NOT_EMPTY',
            detail: `${request.group.id} still holds ${request.group.materials.length} material(s); move them out first`
          }
        : null;
  }
}

/**
 * The moves in the planning-group log, oldest first.
 * @param {readonly PlanningGroupEvent[]} events
 * @returns {Extract<PlanningGroupEvent, { kind: 'moved' }>[]}
 */
export const movesOf = (events) =>
  events.filter(
    /** @returns {e is Extract<PlanningGroupEvent, { kind: 'moved' }>} */ (e) => e.kind === 'moved'
  );

/**
 * MR-8 BR-05 — does the capacity a supplier entered for a group in `week` need
 * entering again? Yes when, after that submission, a move touched the group
 * (materials moved in or out) and the supplier supplies a moved material, and
 * the week is not past at the move: it ends after the move. Past weeks keep the
 * group they had. A submission at or after the move is the re-entry.
 * @param {readonly Extract<PlanningGroupEvent, { kind: 'moved' }>[]} moves
 * @param {(materialCode: string) => boolean} supplies
 * @param {string} planningGroupId
 * @param {string} submittedAt
 * @param {string} week
 * @returns {boolean}
 */
export function needsReEntry(moves, supplies, planningGroupId, submittedAt, week) {
  return moves.some(
    (m) =>
      (m.groupId === planningGroupId || m.fromGroupIds.includes(planningGroupId)) &&
      m.materialCodes.some(supplies) &&
      submittedAt < m.at &&
      addDays(week, 7) > dayOf(m.at)
  );
}
