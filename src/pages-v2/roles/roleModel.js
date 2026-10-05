/** @import { BusinessRoleId, SystemRoleId } from '@services/transitions/businessRoles' */
import {
  SYSTEM_ROLES,
  PERSONA_SYSTEM_ROLES,
  isSystemRole
} from '@services/transitions/businessRoles';
import {
  atomsOfCustomRole,
  customRoleStore,
  retainedFromParent,
  sideOfSystemRole
} from '@services/transitions/customRoles';
import { getKnownFlows } from '@services/transitions';
import { WIRED_COMMAND_TARGETS } from '@services/data/mock/MockCommandService';

// ────────────────────────────────────────────────────────────────────────────
// THE ROLE VIEW MODEL — one derivation, read by both the list and the detail.
//
// ⚠️ **EVERY FIELD COMES FROM THE CODE THAT ENFORCES IT.** The roster is
// `SYSTEM_ROLES` (what `resolveRoles` resolves against) and the verbs are
// `getKnownFlows()` (what the dispatcher resolves against), so neither surface
// can drift from the machine. A page that re-states either would be the second
// vocabulary C10 §3.3 refuses — and it would drift silently, because nothing
// checks a permissions page against a flow catalog.
//
// ⚠️ **THE COLUMNS WE DO NOT HAVE ARE ABSENT, NOT EMPTY.** The reference
// (Paragon TMS) lists USERS ASSIGNED, LAST MODIFIED and STATUS. We hold no
// people (staff identity is the corporate directory's, unconnected), no
// modification record (`SYSTEM_ROLES` is a frozen module constant, not a row),
// and no activation state (a role is either compiled in or it does not exist).
// **Rendering those columns would invent three facts to fill a layout** — the
// class this project spends its time removing. What transfers is the SHAPE:
// code, name, description, kind, and a view action.
// ────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *     readonly id: string;
 *     readonly entity: string;
 *     readonly surfaced: boolean;
 *     readonly wired: boolean;
 *   }} RoleVerb
 */

/**
 * `side`:  `both` is `admin` — it spans the tenancies rather than sitting on a side.
 * `parent`:  The system role a CUSTOM role copies. Absent on a system role.
 * `retained`: D1's exception, derived: atoms the parent held at grant time and holds no longer, RETAINED rather than silently dropped. Always empty while grants are session-scoped and bundles are compile-time — see `customRoles.js`.
 * `nameKey`: What the surface passes to `t()`.  ⚠️ **A SYSTEM ROLE'S IS AN i18n KEY; A CUSTOM ROLE'S IS THE LITERAL TEXT, AND THE PAGE CANNOT TELL — DELIBERATELY.** A custom role's name is USER TEXT: nobody has translated it and nobody can, so it must render identically in EN and ID. i18next returns a missing key verbatim, so passing the literal through `t()` renders exactly the text that was typed, in both locales, with no branch on the page. **This is why `role_grant_governed` forbids `:` and `.` in the name** — i18next reads them as namespace and key separators, and a name carrying one would render TRUNCATED rather than wrong-looking.  The alternative was a discriminated `name` field, which would have meant editing both surfaces to render a custom role — the thing D4 calls a finding.
 *
 * @typedef {{
 *     readonly id: BusinessRoleId;
 *     readonly side: 'buyer' | 'supplier' | 'both';
 *     readonly isSystem: boolean;
 *     readonly parent?: SystemRoleId;
 *     readonly retained: readonly string[];
 *     readonly atoms: readonly string[];
 *     readonly modules: readonly string[];
 *     readonly verbs: readonly RoleVerb[];
 *     readonly surfacedCount: number;
 *     readonly nameKey: string;
 *     readonly descriptionKey: string;
 *   }} RoleView
 */

/** @returns {readonly RoleView[]} */
export function deriveRoleViews() {
  const wired = new Set(/** @type {readonly string[]} */ (WIRED_COMMAND_TARGETS));
  const all = getKnownFlows().flatMap((f) =>
    f.transitions.map((t) => ({
      id: t.id,
      entity: f.entity,
      requiredRole: t.requiredRole,
      surfaced: t.surfaceable.surfaced,
      wired: wired.has(f.entity)
    }))
  );
  const buyerSide = /** @type {Set<string>} */ (new Set(PERSONA_SYSTEM_ROLES.buyer));

  // ⚠️ EVERY FIELD BELOW IS COMPUTED FROM `atoms`, WHICHEVER KIND OF ROLE IT IS.
  // That is the property D4 requires and the reason no surface changed to show a
  // custom role: `verbs`, `modules` and `surfacedCount` never learn that custom
  // roles exist, because they only ever asked what atoms a role holds.
  /**
   * @param {BusinessRoleId} id
   * @param {RoleView['side']} side
   * @param {readonly string[]} atoms
   * @param {string} nameKey
   * @param {string} descriptionKey
   * @param {{ parent?: SystemRoleId; retained?: readonly string[] }} [extra]
   * @returns {RoleView}
   */
  const view = (id, side, atoms, nameKey, descriptionKey, extra = {}) => {
    const verbs = all.filter((t) => atoms.includes(t.requiredRole));
    return {
      id,
      side,
      isSystem: isSystemRole(id),
      parent: extra.parent,
      retained: extra.retained ?? [],
      atoms,
      modules: [...new Set(verbs.map((v) => v.entity))].sort(),
      verbs,
      surfacedCount: verbs.filter((v) => v.surfaced).length,
      nameKey,
      descriptionKey
    };
  };

  const system = /** @type {SystemRoleId[]} */ (Object.keys(SYSTEM_ROLES)).map((id) =>
    view(
      id,
      id === 'admin' ? 'both' : buyerSide.has(id) ? 'buyer' : 'supplier',
      SYSTEM_ROLES[id],
      `roles.owner.${id}`,
      `roles.desc.${id}`
    )
  );

  // ⚠️ **A CUSTOM ROLE'S SIDE COMES FROM ITS PARENT, NEVER FROM MEMBERSHIP.**
  // The system arm asks `buyerSide.has(id)`, and a custom id is in NEITHER
  // persona list — so the same ternary would have fallen through to its else
  // arm and labelled every custom buyer role **Supplier side**. Not a crash and
  // not a red test: one wrong word about tenancy, on the page whose whole
  // subject is tenancy. `sideOfSystemRole(parent)` cannot return null here
  // because `role_grant_governed` refuses `admin` as a parent.
  const custom = customRoleStore
    .all()
    .map((def) =>
      view(
        def.id,
        sideOfSystemRole(def.parent) ?? 'both',
        atomsOfCustomRole(def),
        def.displayName,
        def.description,
        { parent: def.parent, retained: retainedFromParent(def) }
      )
    );

  return [...system, ...custom];
}

/**
 * @param {string} id
 * @returns {RoleView | undefined}
 */
export function findRoleView(id) {
  return deriveRoleViews().find((r) => r.id === id);
}

/**
 * The catalogue-level totals. DERIVED, so a role added tomorrow moves them
 * without anybody editing a tile — the property that makes a KPI worth showing.
 * @param {readonly RoleView[]} views
 */
export function roleTotals(views) {
  const permissions = new Set(views.flatMap((v) => v.atoms));
  const actions = new Set(views.flatMap((v) => v.verbs.map((x) => x.id)));
  // ⚠️ THE SPLIT IS DERIVED FROM THE SAME VIEWS AS THE TOTAL, so the parts
  // ALWAYS sum to the whole. The first version of this tile added `buyer` and
  // `supplier` from `PERSONA_SYSTEM_ROLES` — two figures from a DIFFERENT
  // population than the total — and it stopped adding up the moment `admin`
  // landed on neither side. A split that cannot account for its own total is
  // the subset-as-population error wearing a breakdown's clothes.
  const bySide = { buyer: 0, supplier: 0, both: 0 };
  for (const v of views) bySide[v.side] += 1;
  return {
    roles: views.length,
    permissions: permissions.size,
    actions: actions.size,
    bySide
  };
}
